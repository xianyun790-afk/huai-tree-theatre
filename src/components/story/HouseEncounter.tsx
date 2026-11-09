import {useRef,useState,type PointerEvent} from 'react';
import {ArrowRight,Hand,RotateCcw,Volume2} from 'lucide-react';
import {Modal} from '../ui/Modal';
import type {Progress,Story} from '@/game/schema';
import type {SoundCue} from '@/game/audio';
import {formatText,matches} from '@/game/story';
import {clearSignal,HOUSE_BEATS,signalQuality,type HouseAction} from '@/game/house/handsOn';

interface Props {story:Story;progress:Progress;onChoose:(id:string)=>void;onAct:(action:HouseAction)=>void;onClose:()=>void;play:(cue:SoundCue)=>void}
export function HouseEncounter({story,progress,onChoose,onAct,onClose,play}:Props){
 const id=progress.dialogueId!,d=story.dialogues[id],beat=HOUSE_BEATS[id];
 const title=({tv:'这台电视不太对劲',fridge:'冰箱正在发脾气',bag:'老爸的购物袋',desk:'昨天的施工照片'} as Record<string,string>)[id]??formatText(d.speaker,progress);
 return <Modal title={title} kicker="靠近看看" className={`hands-on-modal encounter-${id}`} onClose={onClose}>
  {id==='tv'?<Tuner onDone={()=>onAct('hear')} play={play}/>:id==='fridge'?<Soup onDone={()=>onAct('cool')} play={play}/>:id==='desk'?<Photograph onDone={()=>onAct('photo')} play={play}/>:id==='bag'?<Bag onDone={()=>onAct('take')} play={play}/>:<>
   <div className="short-beat"><img alt="" src={`${import.meta.env.BASE_URL}portraits/${d.propPortrait?`house-${d.propPortrait}`:d.portrait}.png`}/><p>{beat?.line??formatText(d.lines[0],progress)}</p></div>
   <div className="beat-actions">{d.choices.map((choice,i)=><button key={choice.id} disabled={!matches(choice.requires,progress)} onClick={()=>onChoose(choice.id)}>{beat?.labels?.[i]??formatText(choice.label,progress)}<ArrowRight size={16}/></button>)}</div>
  </>}
  <details className="original-dialogue"><summary>展开原对白</summary>{d.lines.map((line,i)=><p key={i}>{formatText(line,progress)}</p>)}</details>
 </Modal>;
}

function Tuner({onDone,play}:{onDone:()=>void;play:Props['play']}){
 const [frequency,setFrequency]=useState(20),[antenna,setAntenna]=useState(10),[heard,setHeard]=useState(false),[reaction,setReaction]=useState('');
 const quality=signalQuality(frequency,antenna),clear=clearSignal(frequency,antenna);
 function listen(){play(clear?'talk':'tv');if(clear)setHeard(true);else setReaction(quality>.45?'“放……回……滋——” 人声还断着。':frequency<38?'“限时促销！买拖把送鬼！”':'“今日天气：客厅局部下老爸。”');}
 return <div className="tuning-game">
  <div className={`crt-tv ${heard?'has-message':''}`}>
   <div className="tv-aerial" aria-hidden="true" style={{transform:`rotate(${(antenna-45)*.4}deg)`}}/>
   <div className="crt-screen" style={{'--static-opacity':1-quality} as React.CSSProperties}>
    <div className="crt-noise" aria-hidden="true"/>
    {heard?<p>“把昨天从后院拿走的东西<br/><strong>放 · 回 · 去！”</strong></p>:<><span className="screen-ghost" style={{opacity:quality}} aria-hidden="true">◉_◉</span><span className="screen-caption">{quality>.65?'放……回……去……':quality>.3?'……回……滋……':'沙沙沙——'}</span></>}
   </div><span className="tv-brand" aria-hidden="true">QUAHOG · 1986</span>
  </div>
  {heard?<><p className="encounter-feedback">老爸朝厨房一指：“就一个免费摆件……”</p><button className="encounter-primary" onClick={onDone}>听清了，去找找<ArrowRight size={17}/></button></>:<>
   <div className="tuner-controls"><label><span>调谐 <output>{frequency}</output></span><input aria-label="电视调谐" type="range" min="0" max="100" value={frequency} onChange={e=>{setFrequency(Number(e.target.value));setReaction('');play('tv');}}/></label><label><span>天线角度 <output>{antenna}°</output></span><input aria-label="天线角度" type="range" min="0" max="90" value={antenna} onChange={e=>{setAntenna(Number(e.target.value));setReaction('');play('tv');}}/></label></div>
   <div className="signal-meter"><span>人声信号</span><meter aria-label="人声信号强度" min="0" max="1" value={quality}/><span>{Math.round(quality*100)}%</span></div>
   <p className="encounter-feedback" role="status">{reaction||'转动旋钮和天线，试着接住那个声音。'}</p>
   <button className="encounter-primary" onClick={listen}><Volume2 size={17}/>听这个频道</button>
  </>}
 </div>;
}

function Soup({onDone,play}:{onDone:()=>void;play:Props['play']}){
 const [selected,setSelected]=useState(false),[unplugged,setUnplugged]=useState(false),[moved,setMoved]=useState(false),[offset,setOffset]=useState({x:0,y:0});
 const drag=useRef<{x:number;y:number}|null>(null),mat=useRef<HTMLButtonElement>(null);
 function placeSoup(){play('pickup');if(unplugged){setMoved(true);setSelected(false);}else onDone();}
 function release(e:PointerEvent<HTMLButtonElement>){
  const rect=mat.current?.getBoundingClientRect(),wasDrag=drag.current;
  drag.current=null;setOffset({x:0,y:0});
  if(wasDrag&&rect&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom)placeSoup();
 }
 return <>
  <p className="encounter-quote" role="status">{moved?'热汤移开了。冰箱：“我的插头呢？”':unplugged?'电视：“你把晚饭也一起关机了？！”':'冰箱：“烫烫烫！谁把开水汤塞进来了！”'}</p>
  <div className={`soup-station ${unplugged?'is-unplugged':''}`}>
   <div className="mini-fridge" aria-hidden="true"><span className="fridge-eyes">{unplugged?'− −':'› ‹'}</span><span className="fridge-shelf"/></div>
   <button disabled={moved} className={`soup-pot ${selected?'is-selected':''} ${moved?'on-mat':''}`} aria-label="拿起热汤" aria-pressed={selected} style={{transform:`translate(${offset.x}px,${offset.y}px)`}} onClick={()=>setSelected(true)}
    onPointerDown={e=>{if(e.button!==0)return;setSelected(true);drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);play('pickup');}}
    onPointerMove={e=>{if(drag.current)setOffset({x:e.clientX-drag.current.x,y:e.clientY-drag.current.y});}}
    onPointerUp={release} onPointerCancel={()=>{drag.current=null;setOffset({x:0,y:0});}}>
    <span className="soup-steam" aria-hidden="true">♨</span><span className="pot-lid"/><span className="pot-body"/><span className="sr-only">热汤锅</span>
   </button>
   <button ref={mat} className={`cooling-mat ${selected?'can-drop':''}`} aria-label="把热汤放到隔热垫" disabled={!selected} onClick={()=>{if(selected)placeSoup();}}><span aria-hidden="true">▧</span><strong>隔热垫</strong></button>
  </div>
  <div className="soup-tools"><span><Hand size={14}/>拖动汤锅；也可先点锅，再点位置</span><button onClick={()=>{if(unplugged&&moved)onDone();else{setUnplugged(v=>!v);play('fridge');}}}>{unplugged?'接回插头':'拔掉插头'}</button></div>
 </>;
}

function Bag({onDone,play}:{onDone:()=>void;play:Props['play']}){
 const [remark,setRemark]=useState('湿泥的气味，从袋底冒了出来。');
 return <><div className="bag-contents"><button aria-label="查看薯片" onClick={()=>{play('pickup');setRemark('老爸的薯片。它的保质期比这房子还神秘。');}}><span className="chips-pack">CHIPS<br/>▱</span></button><button aria-label="取出缺牙摆件" className="bag-skull" onClick={onDone}><Skull/><span>拿起来</span></button><button aria-label="查看手套" onClick={()=>{play('pickup');setRemark('一只沾泥手套。老爸确实去后院翻过东西。');}}><Hand size={65}/></button></div><p className="encounter-feedback" role="status">{remark}</p></>;
}

function Skull(){return <svg viewBox="0 0 100 100" role="img" aria-label="底座沾泥的缺牙摆件"><g stroke="#273038" strokeWidth="3" strokeLinejoin="round"><path fill="#ded4b1" d="M22 76L16 90H85L79 76Z"/><path fill="#f5ebcf" d="M28 66C7 55 13 18 40 15C75 6 94 36 78 61L73 70V81H31V71Z"/><path fill="#314744" d="M30 41L45 38L41 53L28 52ZM58 38L73 41L75 53L62 51ZM48 57L43 66H56Z"/><path d="M39 69V80M50 69V76M62 69V81"/><path fill="#896d4e" d="M18 89L28 85L39 90L60 85L79 90"/></g></svg>;}

function Photograph({onDone,play}:{onDone:()=>void;play:Props['play']}){
 const [back,setBack]=useState(false);
 return <><button className={`evidence-photo ${back?'is-back':''}`} aria-label={back?'翻回照片正面':'翻看照片背面'} onClick={()=>{setBack(v=>!v);play('page');}}>
  {back?<div className="photo-handwriting"><p>旧屋纪念物<br/>请勿搬走。</p><span>老周批注：<br/>“那不就是免费的吗？”</span></div>:<svg viewBox="0 0 420 240" role="img" aria-label="施工照片：缺牙摆件放在后院苹果树旁的土坑里"><rect width="420" height="240" fill="#c3d5bc"/><path d="M0 136Q190 112 420 144V240H0Z" fill="#8dab78"/><g stroke="#405443" strokeWidth="3"><path d="M5 160H417M5 180H417M30 118V194M80 116V194M130 115V194M180 113V194M230 115V194M280 120V194M330 123V194M380 126V194"/><path d="M315 170V61M315 93L277 68M315 80L352 47" stroke="#715d42" strokeWidth="12"/><path d="M258 70C230 40 260 12 285 24C297-8 344 2 348 23C385 9 404 49 377 72C383 98 340 109 324 86C301 108 269 98 258 70Z" fill="#698d57"/></g><g fill="#bd6451" stroke="#405443" strokeWidth="2"><circle cx="274" cy="53" r="7"/><circle cx="350" cy="60" r="7"/><circle cx="323" cy="31" r="7"/></g><ellipse cx="258" cy="206" rx="47" ry="17" fill="#755b42"/><g transform="translate(228 151) scale(.6)"><path fill="#f5ebcf" stroke="#273038" strokeWidth="3" d="M28 66C7 55 13 18 40 15C75 6 94 36 78 61L73 70V81H31V71Z"/><path fill="#314744" d="M30 41L45 38L41 53L28 52ZM58 38L73 41L75 53L62 51ZM48 57L43 66H56Z"/><path stroke="#273038" strokeWidth="3" d="M39 69V80M50 69V76M62 69V81"/></g><path d="M365 203L382 118" stroke="#6a533d" strokeWidth="6"/><path d="M353 210L370 184L382 191L372 219Z" fill="#a1a9a0" stroke="#405443" strokeWidth="3"/><text x="15" y="226" fill="#f7f3da" fontSize="12" fontFamily="monospace">昨日 · 后院施工</text></svg>}
  <span className="photo-flip"><RotateCcw size={13}/>{back?'翻回正面':'翻到背面'}</span>
 </button><p className="encounter-feedback">{back?'这次，“免费”似乎不是邀请。':'同样的缺牙。旁边这棵树，你在后院见过。'}</p><button className="encounter-primary" onClick={onDone}>带上照片<ArrowRight size={17}/></button></>;
}
