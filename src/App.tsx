import {useEffect,useRef,useState} from 'react';
import {ArrowRight,BookOpen,Check,Compass,FileText,HelpCircle,LoaderCircle,MapPin,RotateCcw,Volume2,VolumeX,Zap} from 'lucide-react';
import {RoomNavigation} from '@/components/story/RoomNavigation';
import {roomAction} from '@/game/house/layout';
import {World} from '@/game/World';
import {BUILTIN_STORIES,DEFAULT_STORY} from '@/game/catalog';
import {choose,definitionKey,endingText,formatText,interact,matches,objective,startStory} from '@/game/story';
import type {Story,Target} from '@/game/schema';
import {loadCustomStories,loadProgress,loadSelectedId,saveCustomStories,saveProgress,saveSelectedId} from '@/lib/storage';
import {useBeep} from '@/hooks/useBeep';
import {Button} from '@/components/ui/Button';
import {Modal} from '@/components/ui/Modal';
import {Conversation} from '@/components/story/Conversation';
import {CaseBook} from '@/components/story/CaseBook';
import {StoryLibrary} from '@/components/story/StoryLibrary';
function initialSession(){
 const custom=loadCustomStories();const story=[...BUILTIN_STORIES,...custom].find(s=>s.id===loadSelectedId())??DEFAULT_STORY;
 return {custom,story,progress:loadProgress(story)};
}
export default function App(){
 const [initial]=useState(initialSession);
 const [custom,setCustom]=useState(initial.custom);const [story,setStory]=useState(initial.story);const [progress,setProgress]=useState(initial.progress);
 const [menu,setMenu]=useState(!initial.progress.started);const [library,setLibrary]=useState(!initial.progress.started);
 const [name,setName]=useState(initial.progress.name);const [load,setLoad]=useState(0);const [error,setError]=useState('');
 const [target,setTarget]=useState<Target|null>(null);const [moving,setMoving]=useState(false);
 const [panel,setPanel]=useState<'journal'|'help'|'restart'|null>(null);const [toast,setToast]=useState('');const [sound,setSound]=useState(false);
 const [saveFailed,setSaveFailed]=useState(false);const [librarySaveFailed,setLibrarySaveFailed]=useState(false);
 const host=useRef<HTMLDivElement>(null);const world=useRef<World|null>(null);const interactRef=useRef<(id:Target)=>void>(()=>{});
 const beep=useBeep(sound);const task=objective(story,progress);const key=definitionKey(story);
 const house=story.world.stage==='house';const room=progress.room??'street';const action=house?roomAction(room,task.target,fAction(task.action)): {target:task.target,label:task.action};
 function fAction(text:string){return formatText(text,progress);}
 const ready=load===1&&!error;const result=endingText(story,progress);const dialogue=progress.dialogueId!==null;
 const f=(text:string)=>formatText(text,progress);
 useEffect(()=>{
  let alive=true;let engine:World|undefined;
  try{engine=new World(host.current!,id=>interactRef.current(id),m=>{if(alive)setMoving(m);});world.current=engine;
   void engine.load(p=>{if(alive)setLoad(p);}).catch(()=>{if(alive)setError('街区加载失败，请重新加载。若仍失败，请使用支持 WebGL 的浏览器。');});
  }catch{setError('浏览器暂时无法启动 3D 画面，请使用 Safari 或 Chrome 重试。');}
  return()=>{alive=false;world.current=null;engine?.dispose();};
 },[]);
 useEffect(()=>{world.current?.configure({...story.world,playerLabel:f(story.world.playerLabel),cast:Object.fromEntries(Object.entries(story.world.cast).map(([slot,c])=>[slot,{...c,label:f(c.label)}])) as Story['world']['cast'],locations:{lab:f(story.world.locations.lab),mailbox:f(story.world.locations.mailbox)}},Object.keys(story.interactions) as Target[]);},[key,progress.name]);
 useEffect(()=>{world.current?.setSceneState(room,!!result,progress.clues.includes('skull'),!!progress.flags.fridge_cooled);},[key,ready,room,result,progress.clues.length,progress.flags.fridge_cooled]);
 useEffect(()=>{
  world.current?.setState(ready&&progress.started&&!menu&&!library,dialogue||!!panel||menu||library||!!result,action.target,!!result);
  world.current?.setTalking(dialogue?target:null);
 },[ready,dialogue,panel,menu,library,progress.started,result,action.target,target,key,room]);
 useEffect(()=>{if(progress.started)setSaveFailed(!saveProgress(story,progress));},[progress,key]);
 useEffect(()=>{saveSelectedId(story.id);},[story.id]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(timer);},[toast]);
 interactRef.current=(id)=>{setTarget(id);beep();setProgress(p=>interact(story,p,id));};
 function closeDialogue(){setProgress(p=>({...p,dialogueId:null}));setTarget(null);}
 function onChoose(id:string){
  const next=choose(story,progress,id);if(next===progress)return;
  const added=next.clues.filter(c=>!progress.clues.includes(c));
  if(added.length)setToast(`线索已记下：${added.map(id=>story.clues.find(c=>c.id===id)!.title).join('、')}`);
  beep();setProgress(next);if(!next.dialogueId)setTarget(null);
 }
 function newGame(){world.current?.reset();setProgress(startStory(story,name));setMenu(false);setLibrary(false);setPanel(null);setTarget(null);setToast('');}
 function selectStory(next:Story,keepLibrary=false){
  if(progress.started)saveProgress(story,progress);
  const saved=loadProgress(next);if(!saved.started)saved.name=progress.name;
  setStory(next);setProgress(saved);setName(saved.name);setMenu(!saved.started);setLibrary(keepLibrary);setPanel(null);setTarget(null);setToast('');
 }
 function importStory(next:Story){
  const updated=[...custom.filter(s=>s.id!==next.id),next];setCustom(updated);setLibrarySaveFailed(!saveCustomStories(updated));selectStory(next);
 }
 function removeStory(id:string){const updated=custom.filter(s=>s.id!==id);setCustom(updated);setLibrarySaveFailed(!saveCustomStories(updated));if(story.id===id)selectStory(DEFAULT_STORY,true);}
 const stories=[...BUILTIN_STORIES,...custom];
 function summary(s:Story){const p=s.id===story.id&&definitionKey(s)===key?progress:loadProgress(s);return p.endingId?'已完成 · 可以重玩':p.started?`进行中 · ${objective(s,p).number}/${objective(s,p).total} · ${p.clues.length} 条线索`:'尚未开始';}
 return <main className={`game-shell ${house?'house-game':''}`}>
  <div className={`world ${menu?'is-menu':''}`} ref={host}/><div className="vignette"/>
  <header className="masthead theatre-header"><div className="brand"><span className="brand-icon"><Zap size={25} fill="currentColor"/></span><div><strong>槐树街小剧场</strong><small>{story.title}</small></div></div><button className="library-launch" onClick={()=>setLibrary(true)} disabled={!ready} aria-label="打开剧本库"><BookOpen size={17}/><span>换剧本</span><small>v0.6</small></button></header>
  {error?<div className="load-card"><h2>街区还没准备好</h2><p>{error}</p><Button onClick={()=>location.reload()}>重新加载</Button></div>:load<1?<div className="load-card"><LoaderCircle className="spin" size={32}/><h2>街坊们正在各就各位</h2><p>加载街区、房间、骨骼与动画</p><div className="loading-track"><span style={{width:`${load*100}%`}}/></div><small>{Math.round(load*100)}%</small></div>:null}
  {menu&&ready&&!library&&<section className="start-card" aria-label="开始这一集"><span className="eyebrow">{story.title} / {story.duration}</span><h1>{story.headline[0]}<br/><span className="title-underline">{story.headline[1]}</span></h1><p className="start-description">{f(story.description)}</p><div className="cast-strip">{story.cover.map((p,i)=><div key={i} style={{width:`${100/story.cover.length}%`}}><img src={`${import.meta.env.BASE_URL}portraits/${p.body}.png`} alt={f(p.label)}/><span>{f(p.label)}</span></div>)}</div><label className="name-input">你的称呼<input value={name} maxLength={16} onChange={e=>setName(e.target.value)} aria-label="你的称呼"/></label><Button className="primary start-button" onClick={newGame}>开始这一集<ArrowRight size={19}/></Button><button className="continue-link" onClick={()=>setLibrary(true)}>换一个故事 <BookOpen size={15}/></button><p className="start-footnote">{f(story.motivation)}</p></section>}
  {!menu&&ready&&!result&&!library&&<>
   <aside className="objective-card"><div className="objective-top"><span className="eyebrow">下一步 / {story.title}</span><span className="step-number">{task.number} / {task.total}</span></div><div className="control-reminder"><span/>{f(story.world.controlHint)}</div><h2>{f(task.title)}</h2><p>{f(task.detail)}</p><div className="objective-bottom"><span><FileText size={14}/>线索 {progress.clues.length}/{story.clues.length}</span><span>本集独立保存</span></div><button className="next-action" onClick={()=>world.current?.visit(action.target)} disabled={dialogue||!!panel||moving}><Compass size={17}/>{moving?'正在走过去，到达后自动互动':f(action.label)}<ArrowRight size={17}/></button></aside>
   {house?<RoomNavigation room={room} story={story} locked={dialogue||!!panel||moving} moving={moving} onVisit={id=>world.current?.visit(id)}/>:<div className={`movement-hint ${moving?'is-moving':''}`} role="status">{moving?<><span className="walking-dots">•••</span>正在走过去，点击地面可改道</>:<><MapPin size={15}/>点击地面行走 · 黄色按钮带路</>}</div>}
   <nav className="toolbar" aria-label="游戏工具"><button className="journal-button" onClick={()=>setPanel('journal')} disabled={dialogue}><BookOpen size={21}/><span>线索本</span><b>{progress.clues.length}</b></button><button className="tool-button" onClick={()=>setSound(s=>!s)} aria-label={sound?'关闭提示音':'开启提示音'} aria-pressed={sound}>{sound?<Volume2 size={21}/>:<VolumeX size={21}/>}</button><button className="tool-button help-button" onClick={()=>setPanel('help')} aria-label="玩法说明"><HelpCircle size={19}/><span>玩法</span></button><button className="tool-button" onClick={()=>setPanel('restart')} aria-label="重新开始这一集"><RotateCcw size={19}/></button></nav>
  </>}
  {(saveFailed||librarySaveFailed)&&<p className="save-warning" role="status">{librarySaveFailed?'此浏览器无法保存剧本，关闭页面后需重新导入。':'此浏览器无法保存进度，请保持页面打开。'}</p>}
  {toast&&!dialogue&&!panel&&!library&&<div className="toast" role="status"><Check size={17}/>{toast}</div>}
  {dialogue&&ready&&!menu&&!library&&<Conversation story={story} progress={progress} onChoose={onChoose} onClose={closeDialogue}/>}
  {panel==='journal'&&<CaseBook story={story} progress={progress} onClose={()=>setPanel(null)}/>}
  {panel==='help'&&<Modal title="看黄色按钮，一步一步玩。" onClose={()=>setPanel(null)} kicker={story.title}><div className="help-list"><p><b>你控制谁</b>{f(story.world.controlHint)}。黄圈始终跟着你。</p><p><b>这一集要做什么</b>{f(story.motivation)}</p><p><b>怎么操作</b>点左上角黄色按钮，人物自动走近并互动。点地面可自由移动，方向键或 WASD 也能走。E 键走向当前目标。</p><p><b>怎么换故事</b>右上角「换剧本」可切换内置故事，或导入自己的 JSON 剧本。各集独立存档，换回来还能接着玩。</p></div><p className="help-foot">试玩包含室外街区、客厅、厨房、书房和后院，复用四个身体模型，使用固定编写的对白。自定义模型和配音尚未接入。</p><Button className="primary full-width" onClick={()=>setPanel(null)}>继续这一集</Button></Modal>}
  {panel==='restart'&&<Modal title={`重新开始《${story.title}》？`} onClose={()=>setPanel(null)} kicker="只重置当前这一集"><p className="panel-intro">这一集的线索、选择和对话会重置。其他剧本的进度保留。</p><div className="modal-actions"><Button onClick={()=>setPanel(null)}>继续这一局</Button><Button className="primary" onClick={newGame}>重新开始<RotateCcw size={16}/></Button></div></Modal>}
  {!menu&&result&&!library&&<section className="ending-card" aria-label="本集结局"><div className="ending-stamp"><Check size={22}/>本集完</div><span className="eyebrow">{f(result.tag)}</span><h1>{f(result.title)}</h1><p>{f(result.text)}</p><div className="ending-stats"><span><b>{story.goals.filter(g=>matches(g.completeWhen,progress)).length}/{story.goals.length}</b>任务完成</span><span><b>{progress.clues.length}/{story.clues.length}</b>线索记录</span></div><Button className="primary full-width" onClick={()=>setLibrary(true)}>换一个故事继续玩<BookOpen size={17}/></Button><button className="continue-link" onClick={newGame}>重玩这一集，试试另一种选择<RotateCcw size={14}/></button></section>}
  {library&&ready&&<StoryLibrary stories={stories} currentId={story.id} summary={summary} onSelect={selectStory} onImport={importStory} onRemove={removeStory} onClose={()=>setLibrary(false)}/>}
  <footer className="world-caption"><span>槐树街 / 小剧场</span><span>{f(story.motivation)}</span></footer>
 </main>;
}
