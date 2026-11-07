import {useEffect,useRef,useState} from 'react';
import {AUDIO_KEY,GameAudio,readAudioSettings,type AudioSettings} from '../game/audio';

export function useGameAudio(){
 const [settings,setSettings]=useState<AudioSettings>(()=>{try{return readAudioSettings(localStorage.getItem(AUDIO_KEY));}catch{return readAudioSettings(null);}});
 const engine=useRef<GameAudio|null>(null);if(!engine.current)engine.current=new GameAudio();
 const audio=engine.current;
 useEffect(()=>{audio.setSettings(settings);try{localStorage.setItem(AUDIO_KEY,JSON.stringify(settings));}catch{/* Session controls still work without storage. */}},[audio,settings]);
 useEffect(()=>{
  const visibility=()=>audio.setHidden(document.hidden);visibility();
  window.addEventListener('pointerdown',audio.unlock,true);window.addEventListener('keydown',audio.unlock,true);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('pointerdown',audio.unlock,true);window.removeEventListener('keydown',audio.unlock,true);document.removeEventListener('visibilitychange',visibility);audio.dispose();};
 },[audio]);
 function update(next:AudioSettings){audio.setSettings(next);setSettings(next);audio.unlock();}
 return {settings,update,play:audio.play};
}
