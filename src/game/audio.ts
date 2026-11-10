import type {Progress, Room, Target} from './schema.ts';

export type SoundCue = 'click'|'talk'|'page'|'start'|'door'|'step-wood'|'step-street'|'step-grass'|'clue'|'ending'|'tv'|'fridge'|'spring'|'vacuum'|'pickup'|'fan';
export interface AudioSettings {enabled:boolean;volume:number}
export const AUDIO_KEY='town-theatre-audio-v1';
export const DEFAULT_AUDIO:AudioSettings={enabled:true,volume:.55};
export function readAudioSettings(raw:string|null):AudioSettings {
 try{const value=JSON.parse(raw??'null');return {enabled:typeof value?.enabled==='boolean'?value.enabled:DEFAULT_AUDIO.enabled,volume:typeof value?.volume==='number'&&Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):DEFAULT_AUDIO.volume};}catch{return {...DEFAULT_AUDIO};}
}
export function footstepFor(room:Room):SoundCue{return room==='yard'?'step-grass':room==='street'?'step-street':'step-wood';}
export function interactionSound(target:Target):SoundCue {
 if(target.endsWith('-door'))return 'door';
 return ({tv:'tv',fridge:'fridge',sofa:'spring',vacuum:'vacuum','shopping-bag':'pickup',desk:'page',mailbox:'page',lab:'tv',pit:'pickup'} as Partial<Record<Target,SoundCue>>)[target]??'talk';
}
// A reward has priority over an ordinary click; restoring a save never replays it.
export function choiceSound(before:Progress,after:Progress):SoundCue|null {
 if(before===after)return null;
 if(after.endingId&&!before.endingId)return 'ending';
 if(after.clues.some(id=>!before.clues.includes(id)))return 'clue';
 if(after.flags.fridge_cooled&&!before.flags.fridge_cooled)return 'fridge';
 return 'click';
}

interface Note {at:number;duration:number;frequency:number;end?:number;gain:number;wave?:OscillatorType}
interface Rustle {at:number;duration:number;frequency:number;gain:number;filter?:BiquadFilterType}
interface Sound {notes:Note[];noise?:Rustle[]}
const note=(frequency:number,at=0,duration=.12,gain=.13,end?:number,wave:OscillatorType='sine'):Note=>({frequency,at,duration,gain,end,wave});
// Original, short procedural Foley: no downloads, speech or external audio service.
export const SOUNDS:Record<SoundCue,Sound>={
 click:{notes:[note(660,0,.065,.09,530)]},
 talk:{notes:[note(340,0,.09,.09,440),note(490,.075,.08,.055)]},
 page:{notes:[],noise:[{at:0,duration:.18,frequency:1500,gain:.09,filter:'highpass'}]},
 start:{notes:[note(392,0,.16),note(494,.12,.16),note(587,.24,.22)]},
 door:{notes:[note(175,0,.18,.11,95,'triangle'),note(78,.20,.14,.18,48)],noise:[{at:0,duration:.1,frequency:1000,gain:.065},{at:.21,duration:.075,frequency:480,gain:.12}]},
 'step-wood':{notes:[note(160,0,.07,.12,72)],noise:[{at:0,duration:.055,frequency:650,gain:.065}]},
 'step-street':{notes:[note(110,0,.065,.08,65)],noise:[{at:0,duration:.07,frequency:1800,gain:.09}]},
 'step-grass':{notes:[note(100,0,.06,.035,65)],noise:[{at:0,duration:.10,frequency:2400,gain:.065,filter:'highpass'}]},
 clue:{notes:[note(659,0,.16,.12),note(831,.09,.18,.12),note(988,.18,.29,.10)]},
 ending:{notes:[note(392,0,.20),note(494,.13,.20),note(587,.26,.20),note(784,.42,.48,.12),note(392,.42,.48,.065)]},
 tv:{notes:[note(440,.10,.10,.06,650)],noise:[{at:0,duration:.28,frequency:2800,gain:.075,filter:'highpass'}]},
 fridge:{notes:[note(130,0,.2,.11,90,'triangle'),note(110,.19,.24,.075,145,'triangle')]},
 spring:{notes:[note(260,0,.16,.14,115,'triangle'),note(180,.13,.28,.1,480,'triangle')]},
 vacuum:{notes:[note(95,0,.35,.05,170,'triangle')],noise:[{at:0,duration:.42,frequency:550,gain:.09}]},
 fan:{notes:[note(90,0,.38,.04,145,'triangle')],noise:[{at:0,duration:.45,frequency:950,gain:.055}]},
 pickup:{notes:[note(420,.08,.08,.09,600)],noise:[{at:0,duration:.17,frequency:2100,gain:.075}]},
};

/** Shared by live playback and offline audio verification. All sources stop themselves. */
export function synthesize(context:BaseAudioContext,output:AudioNode,cue:SoundCue,when=context.currentTime){
 const spec=SOUNDS[cue];
 function envelope(at:number,duration:number,gain:number){
  const amp=context.createGain(),t=when+at;
  amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(gain,t+.008);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);amp.gain.linearRampToValueAtTime(0,t+duration+.012);amp.connect(output);
  return {amp,t,end:t+duration+.015};
 }
 for(const n of spec.notes){
  const {amp,t,end}=envelope(n.at,n.duration,n.gain),source=context.createOscillator();source.type=n.wave??'sine';source.frequency.setValueAtTime(n.frequency,t);if(n.end)source.frequency.exponentialRampToValueAtTime(n.end,t+n.duration);source.connect(amp);source.onended=()=>{source.disconnect();amp.disconnect();};source.start(t);source.stop(end);
 }
 for(const n of spec.noise??[]){
  const {amp,t,end}=envelope(n.at,n.duration,n.gain),source=context.createBufferSource(),filter=context.createBiquadFilter();
  const buffer=context.createBuffer(1,Math.ceil((n.duration+.02)*context.sampleRate),context.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  source.buffer=buffer;filter.type=n.filter??'lowpass';filter.frequency.value=n.frequency;filter.Q.value=.6;
  source.connect(filter).connect(amp);source.onended=()=>{source.disconnect();filter.disconnect();amp.disconnect();};source.start(t);source.stop(end);
 }
}

export class GameAudio {
 private context:AudioContext|null=null;private master:GainNode|null=null;
 private settings:AudioSettings={...DEFAULT_AUDIO};private hidden=false;private last=new Map<SoundCue,number>();
 setSettings(settings:AudioSettings){this.settings=settings;this.updateGain();}
 private updateGain(){if(this.context&&this.master){const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(!this.hidden&&this.settings.enabled?this.settings.volume:0,t,.015);}}
 unlock=()=>{
  if(!this.settings.enabled||this.settings.volume===0||this.hidden)return;
  try{
   if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.settings.volume;this.master.connect(this.context.destination);}
   if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
  }catch{/* Audio is optional; WebGL and the story remain playable. */}
 };
 play=(cue:SoundCue)=>{
  if(!this.settings.enabled||this.settings.volume===0||this.hidden)return;
  this.unlock();const context=this.context;if(!context||context.state!=='running'||!this.master)return;
  const now=context.currentTime,previous=this.last.get(cue)??-Infinity;
  if(now-previous<(cue.startsWith('step-')?.23:.07))return;
  this.last.set(cue,now);
  try{synthesize(context,this.master,cue);}catch{/* Unsupported audio must not interrupt an action. */}
 };
 setHidden(hidden:boolean){this.hidden=hidden;this.updateGain();if(hidden&&this.context?.state==='running')void this.context.suspend().catch(()=>{});}
 dispose(){const context=this.context;this.context=null;this.master=null;this.last.clear();if(context&&context.state!=='closed')void context.close().catch(()=>{});}
}
