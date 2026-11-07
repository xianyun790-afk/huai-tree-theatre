import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILTIN_STORIES} from '../src/game/catalog.ts';
import {definitionKey,freshProgress,parseProgress,startStory} from '../src/game/story.ts';
import {houseStatus,missingHouseEvidence,playerDialogue,playerTask,routePreview} from '../src/game/playerExperience.ts';
import {HOUSE_ROOMS,targetRoom} from '../src/game/house/layout.ts';
import {ROOMS,type Progress,type Target} from '../src/game/schema.ts';
const house=BUILTIN_STORIES.find(s=>s.id==='haunted-house')!;
const at=(dialogueId:string,patch:Partial<Progress>={}):Progress=>({...startStory(house,'测试'),dialogueId,...patch});

test('player guidance does not change the authored story or invalidate existing saves',()=>{
 const before=JSON.stringify(house),key=definitionKey(house),p=at('bag',{room:'kitchen',clues:['message'],flags:{fridge_cooled:true}});
 const saved=JSON.stringify(p);const view=playerDialogue(house,p)!;view.dialogue.lines.push('外部修改');view.dialogue.choices[0].label='外部修改';
 assert.equal(JSON.stringify(house),before);assert.equal(definitionKey(house),key);assert.deepEqual(parseProgress(saved,house),p);
 const other=BUILTIN_STORIES.find(s=>s.id==='missing-key')!,old=startStory(other,'测试');assert.equal(playerDialogue(other,old)?.dialogue,other.dialogues[old.dialogueId!]);
});
test('each route preview follows adjacent doors and terminates in the actual target room',()=>{
 for(const room of ROOMS)for(const target of ['tv','fridge','shopping-bag','desk','pit'] as Target[]){
  const names=routePreview(room,target),ids=names.map(name=>ROOMS.find(id=>HOUSE_ROOMS[id].name===name)!);
  assert.equal(ids[0],room);assert.equal(ids.at(-1),targetRoom(target));assert.equal(new Set(ids).size,ids.length);
  for(let i=1;i<ids.length;i++)assert.ok(Object.values(HOUSE_ROOMS[ids[i-1]].doors).includes(ids[i]));
 }
 assert.deepEqual(routePreview('study','pit'),['楼上书房','客厅','厨房','后院']);
});
test('guidance distinguishes observed clues, an uncollected item, retry feedback, and expressive endings',()=>{
 const initial=playerTask(house,freshProgress(house));assert.ok(!initial.detail.includes('雪花'));
 const intro=playerDialogue(house,at('intro'))!.dialogue;assert.ok(intro.choices[0].label.includes('回到'));assert.ok(intro.choices[0].hint?.includes('才会走过去'));
 const bag=playerDialogue(house,at('bag'))!;assert.ok(bag.dialogue.lines.some(line=>line.includes('还在袋里')));assert.ok(!bag.dialogue.lines.some(line=>line.includes('装好带走')));assert.ok(bag.dialogue.choices[0].effects?.some(e=>e.type==='clue'));
 assert.equal(playerDialogue(house,at('desk_wrong'))?.judgment?.label,'重新判断');
 assert.equal(playerDialogue(house,at('desk_ok'))?.judgment?.label,'判断成立');
 assert.ok(playerDialogue(house,at('pit'))?.judgment?.evidence.includes('两种做法都能解除'));
 const early=playerDialogue(house,at('bag_wait',{clues:['message']}))!.dialogue;
 assert.ok(early.lines.join('').includes('已经听过'));assert.notEqual(early.propPortrait,'skull');
});
test('early investigation lists only missing requirements and acknowledges completed work',()=>{
 const p=at('pit_wait',{room:'yard',clues:['message','skull'],flags:{fridge_cooled:true}});
 assert.deepEqual(missingHouseEvidence(p),['在书房核对摆件原来的位置']);
 const view=playerDialogue(house,p)!.dialogue.lines.join('');assert.ok(view.includes('已取得的线索都保留'));assert.ok(!view.includes('目前还缺：听清电视'));
 assert.ok(houseStatus('kitchen',p).includes('已随身带上'));
});
