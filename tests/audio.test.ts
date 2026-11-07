import test from 'node:test';
import assert from 'node:assert/strict';
import {AUDIO_KEY,DEFAULT_AUDIO,GameAudio,choiceSound,footstepFor,interactionSound,readAudioSettings} from '../src/game/audio.ts';
import {BUILTIN_STORIES} from '../src/game/catalog.ts';
import {choose,interact,startStory} from '../src/game/story.ts';

test('audio preferences recover from corrupt storage and keep mute independent of volume',()=>{
 for(const raw of [null,'{','null','[]','42','{"enabled":"false","volume":"1"}'])assert.deepEqual(readAudioSettings(raw),DEFAULT_AUDIO);
 assert.deepEqual(readAudioSettings('{"enabled":false,"volume":0.8}'),{enabled:false,volume:.8});
 assert.equal(readAudioSettings('{"volume":-5}').volume,0);
 assert.equal(readAudioSettings('{"volume":8}').volume,1);
 assert.notEqual(AUDIO_KEY,'town-theatre-selected-v1');
});
test('story rewards are audible only on a new clue or ending; invalid and repeated choices do not replay rewards',()=>{
 const story=BUILTIN_STORIES.find(s=>s.id==='haunted-house')!;
 let p=choose(story,startStory(story,'声音测试'),'start');
 p=interact(story,p,'front-door');assert.equal(interactionSound('front-door'),'door');
 p=interact(story,p,'tv');let next=choose(story,p,'not-a-choice');assert.equal(choiceSound(p,next),null);
 p=choose(story,p,'static');next=choose(story,p,'record');assert.equal(choiceSound(p,next),'clue');p=next;
 p=interact(story,p,'kitchen-door');p=interact(story,p,'fridge');next=choose(story,p,'kind');assert.equal(choiceSound(p,next),'fridge');p=choose(story,next,'go');
 p=interact(story,p,'shopping-bag');next=choose(story,p,'take');assert.equal(choiceSound(p,next),'clue');
 assert.equal(choiceSound(next,choose(story,next,'take')),null);
 p={...next,room:'study',dialogueId:'desk'};next=choose(story,p,'yard');assert.equal(choiceSound(p,next),'clue');
 p={...choose(story,next,'go'),room:'yard',dialogueId:'pit'};
 for(const ending of ['honest','review']){next=choose(story,p,ending);assert.equal(choiceSound(p,next),'ending');assert.equal(choiceSound(next,choose(story,next,ending)),null);}
 assert.equal(footstepFor('living'),footstepFor('study'));assert.notEqual(footstepFor('living'),footstepFor('yard'));assert.notEqual(footstepFor('yard'),footstepFor('street'));
});
test('optional audio never blocks play when disabled, hidden, unsupported, or denied by the browser',()=>{
 const audio=new GameAudio();
 audio.setSettings({enabled:false,volume:.8});assert.doesNotThrow(()=>audio.play('clue'));
 audio.setSettings({enabled:true,volume:0});assert.doesNotThrow(()=>audio.unlock());
 audio.setSettings(DEFAULT_AUDIO);audio.setHidden(true);assert.doesNotThrow(()=>audio.play('door'));
 audio.setHidden(false);assert.doesNotThrow(()=>audio.play('clue'));assert.doesNotThrow(()=>audio.dispose());
});
