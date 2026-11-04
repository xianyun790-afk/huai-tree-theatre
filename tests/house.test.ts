import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILTIN_STORIES} from '../src/game/catalog.ts';
import {choose,freshProgress,interact,objective,parseProgress,startStory} from '../src/game/story.ts';
import {HOUSE_ROOMS,nextDoor,roomAction,roomRoute,targetRoom} from '../src/game/house/layout.ts';
import {ROOMS,type Progress,type Room,type Target} from '../src/game/schema.ts';
import {validateStory} from '../src/game/validate.ts';
const house=BUILTIN_STORIES.find(s=>s.id==='haunted-house')!;
function travel(p:Progress,destination:Room){let result=p;let steps=0;while(result.room!==destination){assert.ok(steps++<5,'door route must terminate');const door=nextDoor(result.room!,destination);assert.ok(door);const next=interact(house,result,door);assert.notEqual(next,result);result=next;}return result;}
test('all rooms connect through real door transitions; remote objects cannot be investigated',()=>{
 let p=choose(house,startStory(house,'测试'),'start');assert.equal(p.room,'street');assert.equal(interact(house,p,'tv'),p);
 for(const from of ROOMS)for(const to of ROOMS){const at={...p,room:from};const reached=travel(at,to);assert.equal(reached.room,to);}
 for(const room of ROOMS){const at={...p,room};for(const target of ['tv','fridge','desk','pit'] as Target[])if(targetRoom(target)!==room)assert.equal(interact(house,at,target),at);}
 assert.equal(roomAction('street','tv','听电视').target,'front-door');assert.equal(roomAction('kitchen','desk','查照片').target,'living-door');assert.equal(roomAction('study','pit','归还').target,'living-door');
});
test('haunted story preserves natural identities and requires each evidence step, with recoverable wrong choices',()=>{
 assert.equal(house.world.playerBody,'player');for(const body of ['father','inventor','neighbor'] as const)assert.equal(house.world.cast[body].body,body);
 let p=choose(house,startStory(house,'测试'),'start');p=travel(p,'yard');p=interact(house,p,'pit');assert.equal(p.dialogueId,'pit_wait');p=choose(house,p,'go');
 p=travel(p,'study');p=interact(house,p,'desk');assert.equal(p.dialogueId,'desk_early');p=choose(house,p,'go');
 p=travel(p,'living');p=interact(house,p,'tv');p=choose(house,p,'weather');assert.equal(p.dialogueId,'weather');p=choose(house,p,'retry');p=choose(house,p,'record');assert.deepEqual(p.clues,['message']);
 p=travel(p,'kitchen');p=interact(house,p,'shopping-bag');assert.equal(p.dialogueId,'bag_wait');p=choose(house,p,'go');p=interact(house,p,'fridge');p=choose(house,p,'unplug');assert.equal(p.flags.fridge_cooled,undefined);p=choose(house,p,'retry');p=choose(house,p,'kind');p=choose(house,p,'go');p=interact(house,p,'shopping-bag');p=choose(house,p,'take');assert.ok(p.clues.includes('skull'));
 p=travel(p,'study');p=interact(house,p,'desk');p=choose(house,p,'bin');assert.equal(p.dialogueId,'desk_wrong');assert.ok(!p.clues.includes('origin'));p=choose(house,p,'retry');p=choose(house,p,'yard');p=choose(house,p,'go');assert.ok(p.clues.includes('origin'));
 p=travel(p,'yard');p=interact(house,p,'pit');for(const id of ['honest','review']){const end=choose(house,p,id);assert.ok(end.endingId);assert.equal(end.clues.length,3);assert.equal(interact(house,end,'kitchen-door'),end);}
});
test('room saves restore location and active dialogue; invalid stage/location cannot leak into town saves',()=>{
 let p=choose(house,startStory(house,'测试'),'start');p=travel(p,'living');p=interact(house,p,'tv');assert.deepEqual(parseProgress(JSON.stringify(p),house),p);
 for(const room of ['unknown',null,undefined])assert.equal(parseProgress(JSON.stringify({...p,room}),house),null);
 assert.equal(parseProgress(JSON.stringify({...freshProgress(house),room:'study'}),house),null);
 const town=BUILTIN_STORIES[0];assert.equal(parseProgress(JSON.stringify({...freshProgress(town),room:'living'}),town),null);
 const invalid=structuredClone(house);invalid.world.stage='other' as never;assert.equal(validateStory(invalid).ok,false);
});
test('indoor navigation keeps the character on open walking lanes',()=>{
 for(const x of [-20,0,20]){const route=roomRoute({x:0,z:1},{x,z:-5});for(const p of route){assert.ok(p.x>=-5&&p.x<=5);assert.ok(p.z>=.4&&p.z<=3);}}
});
test('each room has its own exported geometry and the clue props exist in the model',()=>{
 const required={living:['Haunt_TVScreen','Haunt_Sofa','Door_Study_panel'],kitchen:['Skull_Collectible','Shopping_bag','Haunt_Fridge'],study:['Open_album','Construction_board'],yard:['Returned_Skull','Pit_soil','Apple_tree_trunk']};
 for(const [room,names] of Object.entries(required)){const bytes=readFileSync(new URL(`../public/models/house-${room}.glb`,import.meta.url));assert.equal(bytes.readUInt32LE(0),0x46546c67);const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.ok(json.meshes.length>20);for(const name of names)assert.ok(json.nodes.some((n:{name:string})=>n.name===name||n.name.startsWith(name+'.')),`${room} missing ${name}`);assert.ok(json.materials.every((m:{emissiveFactor?:number[]})=>m.emissiveFactor?.some(v=>v>0)));}
});
