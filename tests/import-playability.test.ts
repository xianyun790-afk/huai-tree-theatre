import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILTIN_STORIES,STARTER_STORY} from '../src/game/catalog.ts';
import {analyzePlayability} from '../src/game/playability.ts';
import {parseStory,validateStory} from '../src/game/validate.ts';
import {carriedItems,playerDialogue} from '../src/game/playerExperience.ts';
import {startStory} from '../src/game/story.ts';
import type {Story} from '../src/game/schema.ts';
const starter=()=>structuredClone(STARTER_STORY);
const example=(name:string):Story=>JSON.parse(readFileSync(new URL(`../examples/${name}`,import.meta.url),'utf8'));

test('all shipped stories and import examples have recoverable paths from every state and reach all endings',async()=>{
 for(const s of [...BUILTIN_STORIES,STARTER_STORY,...['我的第一集-模板.json','找钥匙-完整示例.json','闹鬼房屋-完整示例.json'].map(example)]){
  assert.equal(validateStory(s).ok,true);const result=await analyzePlayability(s);
  assert.equal(result.status,'passed',`${s.id}: ${result.issues.join(';')}`);
  assert.deepEqual(result.reachableEndings.sort(),Object.keys(s.endings).sort());
 }
});
test('circular clue prerequisites pass syntax validation but fail playability analysis',async()=>{
 const s=starter();s.dialogues.parcel.choices[0].requires={type:'clue',id:'parcel'};
 assert.equal(validateStory(s).ok,true);const result=await analyzePlayability(s);
 assert.equal(result.status,'failed');assert.deepEqual(result.reachableEndings,[]);
 assert.ok(result.issues.some(m=>m.includes('无法到达')));
});
test('an optional irreversible trap fails even when a different branch reaches the ending',async()=>{
 const s=starter();s.state.flags.push('lost');
 s.dialogues.intro.choices.push({id:'destroy',label:'把快递烧掉',effects:[{type:'flag',key:'lost',value:true}]});
 s.dialogues.parcel.choices[0].requires={type:'not',condition:{type:'flag',key:'lost'}};
 const result=await analyzePlayability(s);assert.equal(result.status,'failed');
 assert.ok(result.reachableEndings.includes('delivered'));assert.ok(result.issues.some(m=>m.includes('无法通关的状态')));
 s.dialogues.restore={speaker:'补寄柜',portrait:'father',caption:'重新取件',lines:['可撤销这次选择。'],choices:[{id:'restore',label:'恢复取件',effects:[{type:'flag',key:'lost',value:false}]}]};
 s.interactions.lab=[{dialogue:'restore'}];assert.equal((await analyzePlayability(s)).status,'passed');
});
test('a disabled choice is safe when closing its dialogue allows the player to collect evidence',async()=>{
 const s=starter();s.interactions.father=[{dialogue:'deliver'}];s.dialogues.deliver.choices[0].requires={type:'clue',id:'parcel'};
 assert.equal((await analyzePlayability(s)).status,'passed');
});
test('premature endings and declared unreachable endings are explained separately',async()=>{
 const s=starter();s.dialogues.intro.choices.push({id:'skip',label:'跳过取件',effects:[{type:'ending',id:'delivered'}]});
 assert.ok((await analyzePlayability(s)).issues.some(m=>m.includes('完成前触发')));
 const unreachable=starter();unreachable.endings.extra={title:'未连接的结局',text:'没有选项连接到这里。',tag:'测试'};
 assert.ok((await analyzePlayability(unreachable)).issues.some(m=>m.includes('extra')));
});
test('search limits and cancellation never claim exhaustive failure or success',async()=>{
 for(const limits of [{maxStates:1},{maxTransitions:1},{maxDurationMs:-1}]){
  const result=await analyzePlayability(STARTER_STORY,limits);assert.equal(result.status,'incomplete');assert.deepEqual(result.issues,[]);assert.ok(result.warnings.length);
 }
 const c=new AbortController();c.abort();assert.equal((await analyzePlayability(STARTER_STORY,{signal:c.signal})).status,'incomplete');
});
test('custom judgments and carried item labels work without matching a built-in story id',()=>{
 const s=example('闹鬼房屋-完整示例.json');s.id='any-custom-house';const p={...startStory(s,'测试'),dialogueId:'tv'};
 assert.ok(playerDialogue(s,p)?.judgment?.evidence.includes('雪花'));
 assert.deepEqual(carriedItems(s,p),[]);assert.deepEqual(carriedItems(s,{...p,clues:['skull']}),['骷髅摆件']);
 const plain=starter();plain.dialogues.intro.judgment={question:'要调查什么？',evidence:'先听完委托。'};
 assert.equal(playerDialogue(plain,startStory(plain,'测试'))?.judgment?.label,'这一步，怎么判断');
});
test('guidance schema rejects malformed metadata and samples describe action before state changes',()=>{
 const bad=starter();bad.dialogues.intro.judgment={question:'',evidence:'有效内容'};assert.equal(validateStory(bad).ok,false);
 const badItem=starter();badItem.clues[0].itemLabel='';assert.equal(validateStory(badItem).ok,false);
 const s=example('闹鬼房屋-完整示例.json');assert.ok(s.dialogues.intro.choices[0].label.includes('回到家门口'));
 assert.ok(s.dialogues.bag.lines.join('').includes('还在袋里'));assert.ok(s.dialogues.bag.judgment);
 assert.ok(!STARTER_STORY.dialogues.parcel.lines.join('').includes('你把它取出来'));
 assert.equal(parseStory(JSON.stringify(s)).ok,true);
});
