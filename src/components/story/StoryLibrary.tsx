import {useEffect,useRef,useState, type ChangeEvent} from 'react';
import {ArrowRight, BookOpen, Check, CircleAlert, Download, FileJson, FileUp, Trash2, Undo2} from 'lucide-react';
import type {Story} from '@/game/schema';
import {parseStory, MAX_STORY_BYTES} from '@/game/validate';
import {analyzePlayability,type PlayabilityReport} from '@/game/playability';
import {BUILTIN_STORIES, HOUSE_STARTER_STORY, STARTER_STORY} from '@/game/catalog';
import {downloadJson} from '@/lib/download';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
export function StoryLibrary({stories,currentId,summary,onSelect,onImport,onRemove,onClose}: {stories:Story[];currentId:string;summary:(story:Story)=>string;onSelect:(story:Story)=>void;onImport:(story:Story)=>void;onRemove:(id:string)=>void;onClose:()=>void}) {
 const [tab,setTab]=useState<'stories'|'import'>('stories');const [draft,setDraft]=useState('');const [errors,setErrors]=useState<string[]>([]);const [preview,setPreview]=useState<Story|null>(null);const [removed,setRemoved]=useState<Story|null>(null);
 const [checking,setChecking]=useState(false);const [report,setReport]=useState<PlayabilityReport|null>(null);
 const generation=useRef(0),controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>{generation.current++;controller.current?.abort();},[]);
 function begin(running=false){controller.current?.abort();controller.current=new AbortController();generation.current++;setChecking(running);setPreview(null);setReport(null);setErrors([]);return generation.current;}
 function edit(text:string){begin();setDraft(text);}
 async function check(text:string,version:number){
  const result=parseStory(text);
  const fail=(messages:string[])=>{if(version===generation.current){setErrors(messages);setChecking(false);}};
  if(!result.ok){fail(result.errors);return;}
  if(BUILTIN_STORIES.some(s=>s.id===result.story.id)){fail(['这个 id 属于内置故事。请修改 id，例如 my-new-story，再导入。']);return;}
  if(stories.filter(s=>!BUILTIN_STORIES.some(b=>b.id===s.id)).length>=10&&!stories.some(s=>s.id===result.story.id)){fail(['最多保存 10 个导入剧本。可先导出并移出暂时不玩的剧本。']);return;}
  try{
   const analysis=await analyzePlayability(result.story,{signal:controller.current!.signal});
   if(version!==generation.current)return;
   setPreview(result.story);setReport(analysis);setErrors(analysis.issues);setChecking(false);
  }catch{fail(['通关检查未能完成，请重新检查或把剧本拆成较短的故事。']);}
 }
 function validate(){const version=begin(true);void check(draft,version);}
 async function readFile(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  const version=begin(true);setDraft('');
  if(file.size>MAX_STORY_BYTES){setErrors(['文件超过 200 KB，请拆成短篇剧本。']);setChecking(false);return;}
  try{const text=await file.text();if(version!==generation.current)return;setDraft(text);await check(text,version);}
  catch{if(version===generation.current){setErrors(['没能读取文件，请重选或粘贴 JSON 内容。']);setChecking(false);}}
 }
 return <Modal title="选一集，去街上玩" onClose={onClose} className="library-modal" kicker="槐树街小剧场 / 剧本库"><p className="panel-intro">街区散步，也能进屋探险。每一集独立保存，切换后还能接着玩。</p><div className="library-tabs" role="tablist" aria-label="剧本库功能"><button role="tab" aria-selected={tab==='stories'} onClick={()=>setTab('stories')}><BookOpen size={16}/>选择故事</button><button role="tab" aria-selected={tab==='import'} onClick={()=>setTab('import')}><FileUp size={16}/>导入我的剧本</button></div>
 {tab==='stories'?<><div className="episode-grid">{stories.map((s,i)=>{const custom=!BUILTIN_STORIES.some(b=>b.id===s.id);return <article className={`episode-card ${s.id===currentId?'current-episode':''}`} key={s.id}><div className={`episode-art ${s.world.stage==='house'?'house-episode-art':''}`}>{s.world.stage==='house'&&<span className="house-tag">可进屋 · 4 个空间</span>}<span className="episode-number">{custom?'我的剧本':`EP. ${String(i+1).padStart(2,'0')}`}</span>{s.cover.slice(0,2).map((p,i)=><img key={i} src={`${import.meta.env.BASE_URL}portraits/${p.body}.png`} alt=""/>)}</div><div className="episode-copy"><div className="episode-meta"><span>{s.duration}</span>{s.id===currentId&&<span><Check size={11}/>当前</span>}</div><h3>{s.title}</h3><p>{s.description}</p><small>{summary(s)}</small><Button className="primary full-width" onClick={()=>onSelect(s)}>进入这一集<ArrowRight size={16}/></Button>{custom&&<div className="custom-actions"><button onClick={()=>downloadJson(`${s.id}.json`,s)}><Download size={13}/>导出剧本</button><button onClick={()=>{setRemoved(s);onRemove(s.id);}}><Trash2 size={13}/>移出剧本库</button></div>}</div></article>;})}</div>{removed&&<div className="library-undo" role="status">已移出《{removed.title}》，游戏进度保留。<button onClick={()=>{onImport(removed);setRemoved(null);}}><Undo2 size={14}/>重新加入</button></div>}<button className="import-shortcut" onClick={()=>setTab('import')}><FileJson size={18}/>想演自己的故事？从导入模板开始<ArrowRight size={16}/></button></>:
 <div className="import-workspace"><div className="import-explanation"><strong>先写成可交互剧本，再导入</strong><p>支持角色安排、对白、线索、任务、选项和结局。普通故事文字需要先改编成下面的 JSON 模板；角色和场景复用现有舞台；闹鬼房子支持客厅、厨房、书房与后院。</p><div className="import-tools"><Button onClick={()=>downloadJson('我的第一集-模板.json',STARTER_STORY)}><Download size={15}/>下载最小模板</Button><Button onClick={()=>edit(JSON.stringify(STARTER_STORY,null,2))}><FileJson size={15}/>填入模板</Button><Button onClick={()=>edit(JSON.stringify(HOUSE_STARTER_STORY,null,2))}><BookOpen size={15}/>填入房屋示例</Button><label className="button file-picker"><FileUp size={15}/>选择 JSON 文件<input type="file" accept=".json,application/json" aria-label="选择 JSON 剧本文件" onChange={readFile}/></label></div></div><label className="draft-label" htmlFor="story-json">剧本 JSON <span>最多 200 KB · 保存在本机浏览器</span></label><textarea id="story-json" className="story-editor" spellCheck={false} value={draft} placeholder="在这里粘贴剧本 JSON，或先点击「填入模板」" onChange={e=>edit(e.target.value)}/>
 <div className="import-validation"><Button className="primary" disabled={!draft.trim()||checking} onClick={validate}>{checking?'正在检查…':'检查剧本'}</Button><small role="status">{checking?'正在检查任务、分支和结局，编辑内容可取消检查。':'检查结构与通关路径，不执行剧本代码。'}</small></div>{errors.length>0&&<div className="import-errors" role="alert"><strong>还不能导入，请修改：</strong><ul>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}{preview&&report&&<div className={`import-preview ${report.status==='failed'?'is-invalid':report.status==='incomplete'?'is-incomplete':''}`} role="status"><span className="eyebrow">{report.status==='passed'?<Check size={14}/>:<CircleAlert size={14}/>}{report.status==='passed'?'结构与通关路径检查通过':report.status==='failed'?'结构有效，通关检查未通过':'结构有效，通关检查尚未完成'}</span><h3>{preview.title}</h3><p>{preview.description}</p><div className="preview-counts"><span>{preview.goals.length} 步任务</span><span>{preview.clues.length} 条线索</span><span>{Object.keys(preview.endings).length} 个结局</span></div><p className="playability-summary">已检查 {report.exploredStates} 个状态，找到 {report.reachableEndings.length}/{Object.keys(preview.endings).length} 个可达结局。</p>{report.warnings.map((warning,i)=><p className="playability-warning" key={i}>{warning}</p>)}<p className="import-footnote">{report.status==='failed'?'当前不会加入剧本库。':stories.some(s=>s.id===preview.id)?'将更新同 ID 剧本；内容改变后使用独立进度，旧版本进度保留。':'将加入你的剧本库。'}{report.status==='passed'?'所有已枚举状态都存在完成全部任务的路径；仍需试玩确认文案与节奏。':report.status==='failed'?'请先修复上方问题，再重新检查。':'尚未确认全部分支可通关，只建议试演，不要作为已验证的游戏分享。'}</p><Button className="primary full-width" disabled={checking||report.status==='failed'} onClick={()=>{if(!checking&&report.status!=='failed')onImport(preview);}}>{report.status==='incomplete'?'仅加入试演（未确认通关）':stories.some(s=>s.id===preview.id)?'更新并试玩':'加入并试玩'}<ArrowRight size={16}/></Button></div>}
 <details className="author-help"><summary>现有舞台可以怎么用？</summary><p>可安排四个身体模型：青衣年轻人 player、红发发明家 inventor、黄衣老爸 father、灰发邻居 neighbor。玩家与三位配角各占一个模型。</p><p>交互位置：inventor 车库右前、father 车库左前、neighbor 酒吧前、lab 实验台、mailbox 左侧信箱。名称和对白可以改，位置固定。</p><p>需要室内剧本时，设置 world.stage 为 house，可复用闹鬼房子的房间与物品交互点。对白可加 judgment（question / evidence / 可选 label）显示判断依据；线索可加 itemLabel 显示已取得的随身物品。具体字段见随包导入指南。conditions 定义门槛，effects 负责记线索、改变状态或触发结局，next 连接下一段对话。每个故事至少一个结局；最后一步以 ended 为完成条件。正文可用 {'{{playerName}}'} 代入玩家称呼。</p></details></div>}
 </Modal>;
}
