import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_STORY as story,BUILTIN_STORIES} from '../src/game/catalog.ts';
import {choose,definitionKey,interact,matches,parseProgress,startStory} from '../src/game/story.ts';
import {actInKitchen,kitchenState,type KitchenAction} from '../src/game/house/kitchen.ts';
import {performHouseAction} from '../src/game/house/handsOn.ts';
import type {Progress} from '../src/game/schema.ts';

function enterKitchen(){let p={...startStory(story,'试玩'),room:'living' as const,dialogueId:null};return interact(story,interact(story,p,'kitchen-door'),'fridge');}
const act=(p:Progress,a:KitchenAction)=>actInKitchen(p,a).progress;
function finish(p:Progress){
 p={...p,dialogueId:null};p=interact(story,p,'living-door');p=interact(story,p,'tv');p=performHouseAction(story,p,'hear');
 p=interact(story,p,'study-door');p=interact(story,p,'desk');p=performHouseAction(story,p,'photo');
 p=interact(story,p,'living-door');p=interact(story,p,'kitchen-door');p=interact(story,p,'yard-door');p=interact(story,p,'pit');
 for(const id of ['honest','review']){const end=choose(story,p,id);assert.ok(end.endingId);assert.ok(story.goals.every(g=>matches(g.completeWhen,end)));assert.deepEqual(parseProgress(JSON.stringify(end),story),end);}
}
test('early kitchen permits physical investigation but prevents bare-hand and blocked-bag shortcuts',()=>{
 let p=enterKitchen();assert.equal(p.dialogueId,'fridge');assert.deepEqual(p.clues,[]);
 assert.equal(act(p,'pot'),p);assert.equal(act(p,'mat'),p);assert.equal(act(p,'bag'),p);
 p=act(p,'mitt');p=act(p,'pot');assert.equal(kitchenState(p).holdingPot,true);assert.equal(act(p,'bag'),p);
 assert.deepEqual(parseProgress(JSON.stringify(p),story),p);
 p=act(p,'mat');assert.equal(p.flags.fridge_cooled,true);assert.equal(kitchenState(p).method,'mitt');assert.equal(kitchenState(p).ticket,'counter');
 p=act(p,'bag');assert.deepEqual(p.clues,['skull']);assert.equal(act(p,'bag'),p);finish(p);
});
test('fan direction changes the world; cooling, recovery and either ending survive saving and revisiting',()=>{
 let p=act(enterKitchen(),'fan');assert.equal(kitchenState(p).ticket,'floor');assert.equal(act(p,'tick'),p);
 p=act(p,'aim');for(let i=0;i<4;i++)p=act(p,'tick');const warm=kitchenState(p).heat;assert.ok(warm>0&&warm<100);assert.equal(p.flags.fridge_cooled,undefined);
 p=act(p,'fan');assert.equal(act(p,'tick'),p);p=parseProgress(JSON.stringify(p),story)!;assert.ok(p);assert.equal(kitchenState(p).heat,warm);
 const away=interact(story,{...p,dialogueId:null},'living-door');assert.equal(act(away,'tick'),away);assert.equal(act(away,'bag'),away);
 p=interact(story,interact(story,away,'kitchen-door'),'shopping-bag');p=act(p,'fan');for(let i=0;i<6;i++)p=act(p,'tick');
 assert.equal(p.flags.fridge_cooled,true);assert.equal(kitchenState(p).potMoved,false);assert.equal(kitchenState(p).method,'fan');assert.equal(act(p,'tick'),p);
 p=act(p,'ticket');assert.equal(kitchenState(p).ticket,'returned');p=act(p,'bag');assert.ok(p.clues.includes('skull'));finish(p);
});
test('legacy saves remain valid, new kitchen state rejects corruption and cannot affect other episodes',()=>{
 const p=enterKitchen(),key=definitionKey(story);assert.deepEqual(parseProgress(JSON.stringify(p),story),p);
 const legacy={...p,flags:{fridge_cooled:true}};assert.equal(kitchenState(legacy).potMoved,true);assert.equal(kitchenState(legacy).heat,0);
 const sample=act(p,'mitt');for(const patch of [{heat:NaN},{heat:-1},{fanOn:'yes'},{aim:'bedroom'},{holdingPot:true,mitt:false},{potMoved:true},{ticket:'lost'},{method:'fan'}]){
  assert.equal(parseProgress(JSON.stringify({...sample,kitchen:{...sample.kitchen,...patch}}),story),null);
 }
 for(const other of BUILTIN_STORIES.filter(s=>s.id!==story.id)){const state=startStory(other,'测试');assert.equal(act(state,'mitt'),state);assert.equal(parseProgress(JSON.stringify({...state,kitchen:sample.kitchen}),other),null);}
 assert.equal(definitionKey(story),key);
});
