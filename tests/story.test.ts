import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILTIN_STORIES,STARTER_STORY} from '../src/game/catalog.ts';
import {choose,definitionKey,freshProgress,interact,matches,objective,parseProgress,startStory} from '../src/game/story.ts';
import {parseStory,validateStory} from '../src/game/validate.ts';
import {migrateLegacy,saveKey} from '../src/lib/storage.ts';
import {clampGround,route} from '../src/game/navigation.ts';
import {TARGETS,type Progress,type Story} from '../src/game/schema.ts';
const [swap,key]=BUILTIN_STORIES;
function explore(s:Story){
 const queue=[startStory(s,'测试')];const seen=new Set<string>();const endings=new Set<string>();let blocked=0;
 for(let i=0;i<queue.length;i++){
  assert.ok(i<20000,'state space exceeds expected short-story bound');const p=queue[i];const token=JSON.stringify({...p,clues:[...p.clues].sort()});if(seen.has(token))continue;seen.add(token);
  if(p.endingId){endings.add(p.endingId);assert.ok(s.goals.every(g=>matches(g.completeWhen,p)),`${s.id}: ending skips a goal`);continue;}
  if(p.dialogueId){const choices=s.dialogues[p.dialogueId].choices.filter(c=>matches(c.requires,p));if(!choices.length)blocked++;for(const c of choices)queue.push(choose(s,p,c.id));queue.push({...p,dialogueId:null});}
  else for(const t of TARGETS)queue.push(interact(s,p,t));
 }
 return {endings,blocked};
}
test('all published stories validate and every declared ending is reachable with completed goals',()=>{
 for(const s of [...BUILTIN_STORIES,STARTER_STORY]){assert.equal(validateStory(s).ok,true);const result=explore(s);assert.deepEqual([...result.endings].sort(),Object.keys(s.endings).sort());assert.equal(result.blocked,0);}
});
test('key episode keeps natural identities and locks evidence choice until both clues exist',()=>{
 assert.equal(key.world.playerBody,'player');for(const t of ['inventor','father','neighbor'] as const)assert.equal(key.world.cast[t].body,t);
 let p=startStory(key,'小余');p=choose(key,p,'start');p=interact(key,p,'father');const before=p;
 assert.equal(choose(key,p,'evidence'),before);p=choose(key,p,'accuse');assert.equal(p.dialogueId,'bad_tone');assert.equal(p.flags.location_known,undefined);p=choose(key,p,'retry');assert.equal(p.dialogueId,'father');
 p={...p,flags:{briefed:true},clues:['cat_food','order']};p=choose(key,p,'evidence');assert.equal(p.flags.location_known,true);assert.equal(p.dialogueId,'confession');p=choose(key,p,'find');p=interact(key,p,'mailbox');p=choose(key,p,'take');assert.equal(p.flags.key_found,true);assert.equal(objective(key,p).target,'inventor');
});
test('swap retains only two swapped identities and cannot end before its requirements',()=>{
 assert.equal(swap.world.playerBody,'neighbor');assert.equal(swap.world.cast.neighbor.body,'player');assert.equal(swap.world.cast.inventor.body,'inventor');assert.equal(swap.world.cast.father.body,'father');
 let p=startStory(swap,'小余');p={...p,dialogueId:null};p=interact(swap,p,'lab');assert.ok(!p.dialogueId?.startsWith('finale'));assert.equal(p.endingId,null);
});
test('imports reject broken references, unsafe fields, oversized and deeply nested definitions',()=>{
 assert.equal(parseStory('{').ok,false);assert.equal(parseStory(' '.repeat(200001)).ok,false);
 for(const change of [(s:Story)=>{s.intro='missing';},(s:Story)=>{s.world.playerBody='unknown' as never;},(s:Story)=>{s.world.cast.father.body=s.world.playerBody;},(s:Story)=>{s.goals[0].target='unknown' as never;},(s:Story)=>{s.dialogues[s.intro].choices[0].effects=[{type:'clue',id:'missing'}];}]){const s=structuredClone(STARTER_STORY);change(s);assert.equal(validateStory(s).ok,false);}
 assert.equal(parseStory(JSON.stringify(STARTER_STORY).replace('"formatVersion":1','"__proto__":{},"formatVersion":1')).ok,false);
 const deep:any={};let cursor=deep;for(let i=0;i<35;i++){cursor.next={};cursor=cursor.next;}assert.equal(validateStory({...STARTER_STORY,extra:deep}).ok,false);
});
test('saves are isolated by episode and content revision; serialization keeps the active dialogue',()=>{
 const p=startStory(key,'测试');assert.deepEqual(parseProgress(JSON.stringify(p),key),p);assert.equal(parseProgress(JSON.stringify(p),swap),null);assert.notEqual(saveKey(key),saveKey(swap));
 const revised={...key,title:'另一个标题'};assert.notEqual(saveKey(revised),saveKey(key));assert.equal(parseProgress(JSON.stringify(p),revised),null);
 const reordered=Object.fromEntries(Object.entries(key).reverse()) as unknown as Story;assert.equal(definitionKey(reordered),definitionKey(key));
 for(const patch of [{clues:['unknown']},{flags:{unknown:true}},{choices:{handling:'unknown'}},{dialogueId:'unknown'},{endingId:'honest'},{started:false}])assert.equal(parseProgress(JSON.stringify({...p,...patch}),key),null);
 assert.equal(parseProgress('{',key),null);assert.deepEqual(parseProgress(JSON.stringify(freshProgress(key)),key),freshProgress(key));
});
test('legacy progress keeps useful clues, agreement and ending without changing the source',()=>{
 const old={version:1,started:true,name:'小余',metInventor:true,ending:false,clues:['record','father'],deal:'favor',attempts:0};const raw=JSON.stringify(old);const p=migrateLegacy(raw,swap)!;assert.equal(p.version,3);assert.deepEqual(p.clues,['record']);assert.equal(p.choices.approach,'favor');assert.equal(p.flags.agreed,true);assert.equal(objective(swap,p).target,'mailbox');assert.equal(JSON.stringify(old),raw);
 assert.equal(migrateLegacy(raw,key),null);assert.equal(migrateLegacy(JSON.stringify({...old,ending:true}),swap),null);assert.equal(migrateLegacy(JSON.stringify({...old,clues:['record','receipt'],ending:true}),swap)?.endingId,'favor');
});
test('navigation stays on pavement and routes long trips around buildings',()=>{assert.deepEqual(clampGround({x:-50,z:-50}),{x:-10.4,z:.45});const path=route({x:5.5,z:.8},{x:-9.4,z:2});assert.equal(path.length,3);assert.equal(path[1].z,2.25);assert.deepEqual(path.at(-1),{x:-9.4,z:2});});
