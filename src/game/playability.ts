import type {Progress,Story,Target} from './schema.ts';
import {HOUSE_ROOMS} from './house/layout.ts';
import {choose,interact,matches,startStory} from './story.ts';

export interface PlayabilityReport {
 status:'passed'|'failed'|'incomplete';
 exploredStates:number;
 reachableEndings:string[];
 issues:string[];
 warnings:string[];
}
interface Limits {maxStates?:number;maxTransitions?:number;maxDurationMs?:number;signal?:AbortSignal}
// Only gameplay state participates in identity. Missing and false flags are equivalent to matches().
function token(p:Progress){return JSON.stringify([p.room,p.dialogueId,p.endingId,[...p.clues].sort(),Object.keys(p.flags).filter(k=>p.flags[k]).sort(),Object.entries(p.choices).sort(([a],[b])=>a.localeCompare(b))]);}
function location(s:Story,p:Progress){return p.dialogueId?`对话「${p.dialogueId} / ${s.dialogues[p.dialogueId].speaker}」`:p.room?HOUSE_ROOMS[p.room].name:'街区';}

/** Exhaustive within explicit bounds. An incomplete search never claims an ending is unreachable. */
export async function analyzePlayability(story:Story,limits:Limits={}):Promise<PlayabilityReport>{
 const maxStates=limits.maxStates??6000,maxTransitions=limits.maxTransitions??80000,maxDurationMs=limits.maxDurationMs??1800;
 const started=Date.now(),states:Progress[]=[startStory(story,'试玩玩家')],seen=new Map([[token(states[0]),0]]),parents:number[][]=[[]];
 const wins:number[]=[],reachable=new Set<string>(),issues:string[]=[];
 let transitions=0,limitReason='',processed=0;
 function connect(p:Progress,from:number){
  if(++transitions>maxTransitions){limitReason='转换次数';return;}
  const key=token(p);let to=seen.get(key);
  if(to===undefined){if(states.length>=maxStates){limitReason='状态数量';return;}to=states.length;seen.set(key,to);states.push(p);parents.push([]);}
  if(to!==from)parents[to].push(from);
 }
 for(let i=0;i<states.length;i++){
  if(i%64===0){await new Promise<void>(resolve=>setTimeout(resolve,0));if(limits.signal?.aborted){limitReason='取消';break;}if(Date.now()-started>maxDurationMs){limitReason='检查时间';break;}}
  const p=states[i];processed++;
  if(p.endingId){
   reachable.add(p.endingId);const missing=story.goals.filter(g=>!matches(g.completeWhen,p));
   if(missing.length){const issue=`结局「${p.endingId}」可以在任务「${missing[0].title}」完成前触发，请补充选项或交互门槛。`;if(!issues.includes(issue)&&issues.length<5)issues.push(issue);}
   else wins.push(i);
   continue;
  }
  if(p.dialogueId){
   for(const c of story.dialogues[p.dialogueId].choices)if(matches(c.requires,p)){connect(choose(story,p,c.id),i);if(limitReason)break;}
   // The close button is always available; a disabled dialogue can be recoverable elsewhere.
   if(!limitReason)connect({...p,dialogueId:null},i);
  }else{
   const targets=new Set<Target>(Object.keys(story.interactions) as Target[]);
   if(story.world.stage==='house')for(const t of Object.keys(HOUSE_ROOMS[p.room??'street'].doors))targets.add(t as Target);
   for(const t of targets){connect(interact(story,p,t),i);if(limitReason)break;}
  }
  if(limitReason)break;
 }
 if(limitReason){
  return {status:issues.length?'failed':'incomplete',exploredStates:processed,reachableEndings:[...reachable],issues,warnings:[limitReason==='取消'?'检查已取消。':`已达到${limitReason}上限；尚未检查所有路径，不能确认剩余结局或分支能否通关。`]};
 }
 const unreachable=Object.keys(story.endings).filter(id=>!reachable.has(id));
 if(unreachable.length)issues.push(`结局无法到达：${unreachable.join('、')}。请检查条件是否互相依赖、线索是否有取得途径。`);
 // Reverse reachability catches optional irreversible traps even when another branch can finish.
 const canWin=new Set(wins),queue=[...wins];
 for(let i=0;i<queue.length;i++)for(const parent of parents[queue[i]])if(!canWin.has(parent)){canWin.add(parent);queue.push(parent);}
 let stuck=states.findIndex((p,i)=>!p.endingId&&!canWin.has(i)&&p.dialogueId&&story.dialogues[p.dialogueId].choices.every(c=>!matches(c.requires,p)));
 if(stuck<0)stuck=states.findIndex((p,i)=>!p.endingId&&!canWin.has(i));
 if(stuck>=0)issues.push(`存在无法通关的状态：${location(story,states[stuck])}。即使关闭对白继续调查，也无法完成全部任务并到达结局。`);
 return {status:issues.length?'failed':'passed',exploredStates:processed,reachableEndings:[...reachable],issues,warnings:[]};
}
