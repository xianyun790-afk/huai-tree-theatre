import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_STORY,BUILTIN_STORIES} from '../src/game/catalog.ts';
import {choose,definitionKey,interact,matches,parseProgress,startStory} from '../src/game/story.ts';
import {clearSignal,houseIntent,performHouseAction,signalQuality} from '../src/game/house/handsOn.ts';

test('hands-on actions use the story prerequisites and preserve a complete, reloadable route to both endings',()=>{
 const story=DEFAULT_STORY,key=definitionKey(story);
 let p={...startStory(story,'试玩'),dialogueId:null};
 assert.equal(performHouseAction(story,p,'take'),p);
 p=interact(story,p,'front-door');
 p=interact(story,p,'tv');assert.equal(p.clues.length,0);
 p=performHouseAction(story,p,'hear');assert.deepEqual(p.clues,['message']);assert.equal(p.dialogueId,null);
 p=interact(story,p,'kitchen-door');p=interact(story,p,'shopping-bag');
 assert.equal(performHouseAction(story,p,'take'),p);assert.equal(p.clues.length,1);
 p=interact(story,p,'fridge');p=performHouseAction(story,p,'cool');assert.equal(p.flags.fridge_cooled,true);assert.equal(p.dialogueId,null);
 p=interact(story,p,'shopping-bag');p=performHouseAction(story,p,'take');assert.ok(p.clues.includes('skull'));
 p=parseProgress(JSON.stringify(p),story)!;assert.ok(p);
 assert.equal(houseIntent(story,p),'查清摆件的来历');
 p=interact(story,p,'living-door');p=interact(story,p,'study-door');p=interact(story,p,'desk');
 p=performHouseAction(story,p,'photo');assert.ok(p.clues.includes('origin'));assert.equal(p.dialogueId,null);
 p=interact(story,p,'living-door');p=interact(story,p,'kitchen-door');p=interact(story,p,'yard-door');p=interact(story,p,'pit');
 for(const id of ['honest','review']){const end=choose(story,p,id);assert.ok(end.endingId);assert.ok(story.goals.every(g=>matches(g.completeWhen,end)));}
 assert.equal(definitionKey(story),key);
 const custom=structuredClone(story);custom.id='custom-house';assert.equal(performHouseAction(custom,p,'hear'),p);
 for(const other of BUILTIN_STORIES.filter(s=>s.id!==story.id)){const state=startStory(other,'测试');assert.equal(performHouseAction(other,state,'hear'),state);}
});

test('radio tuning gives smooth feedback, accepts a usable band and rejects weak or invalid signals',()=>{
 assert.equal(signalQuality(68,52),1);assert.ok(clearSignal(68,52));
 assert.ok(clearSignal(66,50));assert.ok(!clearSignal(20,10));assert.ok(!clearSignal(68,0));
 assert.ok(signalQuality(60,52)>signalQuality(50,52));assert.ok(signalQuality(68,45)>signalQuality(68,20));
 for(const value of [NaN,Infinity,-Infinity]){assert.equal(signalQuality(value,52),0);assert.equal(signalQuality(68,value),0);}
});
