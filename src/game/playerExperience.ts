import type {Dialogue,Progress,Room,Story,Target} from './schema.ts';
import {objective} from './story.ts';
import {HOUSE_ROOMS,nextDoor,targetRoom} from './house/layout.ts';

export interface PlayerJudgment {label:string;question:string;evidence:string}
// Presentation improvements are separate from the authored state graph: existing saves keep their revision key.
export function playerTask(story:Story,p:Progress){
 const task=objective(story,p);
 if(story.id!=='haunted-house')return task;
 if(task.id==='listen')return {...task,detail:'客厅传来断断续续的说话声。先靠近电视观察，再决定怎样听清。'};
 if(task.id==='photos')return {...task,detail:'摆件已带在身上。去书房核对旧照片，确认它以前放在哪里。'};
 return task;
}
export function routePreview(room:Room,target:Target):string[]{
 const destination=targetRoom(target),rooms=[room];if(!destination)return [HOUSE_ROOMS[room].name];
 for(let i=0;rooms.at(-1)!==destination&&i<5;i++){
  const from=rooms.at(-1)!,door=nextDoor(from,destination),next=door&&HOUSE_ROOMS[from].doors[door];
  if(!next||rooms.includes(next))break;rooms.push(next);
 }
 return rooms.map(id=>HOUSE_ROOMS[id].name);
}
export function houseStatus(room:Room,p:Progress){
 if(room==='kitchen'&&p.clues.includes('origin'))return '位置已确认，穿过厨房去后院';
 if(room==='kitchen'&&p.clues.includes('skull'))return '摆件已随身带上，下一步核对照片';
 if(room==='kitchen'&&p.flags.fridge_cooled)return '冰箱恢复制冷，购物袋可以靠近了';
 return HOUSE_ROOMS[room].subtitle;
}
export function missingHouseEvidence(p:Progress):string[]{
 return [!p.clues.includes('message')?'听清电视留言':null,!p.flags.fridge_cooled?'移开热汤，让冰箱安静下来':null,!p.clues.includes('skull')?'从厨房购物袋带走摆件':null,!p.clues.includes('origin')?'在书房核对摆件原来的位置':null].filter((s):s is string=>!!s);
}
export function playerDialogue(story:Story,p:Progress):{dialogue:Dialogue;judgment?:PlayerJudgment}|null {
 const original=p.dialogueId?story.dialogues[p.dialogueId]:null;if(!original)return null;
 if(story.id!=='haunted-house')return {dialogue:original};
 const d:Dialogue={...original,lines:[...original.lines],choices:original.choices.map(c=>({...c}))};
 const id=p.dialogueId;
 let judgment:PlayerJudgment|undefined;
 const context=(question:string,evidence:string,label='这一步，怎么判断')=>{judgment={label,question,evidence};};
 if(id==='intro'){
  d.caption='你刚回家 · 黄圈里的青衣年轻人就是你';
  d.lines[2]='关掉这段对白后，点左上角黄色按钮进客厅。你也可以点地面自由走动，点门进入房间。';
  d.choices[0].label='知道了，回到家门口';d.choices[0].hint='随后点黄色「进家门，去客厅」按钮，人物才会走过去。';
 }
 if(id==='tv')context('哪个频道值得进一步听？','切换频道时，只有雪花里传来“放……回……去”的人声。其他频道也可以看看，不会扣分。');
 if(id==='fridge'){
  context('解决它的抱怨，还是先试着让它闭嘴？','它抱怨的是刚烧开的汤。购物袋就在旁边，但晃动的冰箱门挡住了你。');
  d.choices[0].hint='处理发脾气的原因。';d.choices[1].hint='可以试试；遇到阻碍仍能重选，不会损失线索。';
 }
 if(id==='bag'){
  d.lines[1]='摆件还在袋里。底座的泥土，与电视要求归还“后院旧物”的留言对得上。';
  d.lines[2]='它值得带走核对，但现在还不能确定原来的位置。楼上的施工相册也许能补上这一点。';
  context('这件东西值得带去核对吗？','电视提到后院旧物；袋里的摆件沾着新鲜泥土。它们有关联，具体位置还需要证据。');
  d.choices[0].label='取出摆件，放进随身物品';d.choices[0].hint='取得后回到场景，再按黄色按钮去书房。';
 }
 if(id==='desk')context('哪一个位置有照片支持？','先比较摆件的缺牙特征，再比较照片里的树和土坑。按证据选；选错后可以重新核对。');
 if(id==='pit'){
  context('归还位置已经确认，你希望老爸怎样收场？','留言、摆件和原位置已经对上。下面两种做法都能解除闹鬼，区别在这家的收尾方式。','最后一步，自由选择');
  d.choices[0].hint='让老爸承认责任，认真向家人道歉。';d.choices[1].hint='留一张荒诞售后单，看看电视怎样评价老爸。';
 }
 if(id==='fridge_ok')context('原因解决了，购物袋可以检查了。','热汤已移到台面，冰箱停止晃动。','行动反馈');
 if(id==='desk_wrong')context('这个位置目前没有证据支持。','照片里有相同摆件、苹果树和土坑；另外两个地点没有出现在照片里。','重新判断');
 if(id==='desk_ok')context('物件和原位置已经对上。','缺牙特征与照片一致，照片又明确拍到了原来的位置。现在可以去归还。','判断成立');
 if(id==='bag_empty')d.lines=['摆件已经在你的随身物品里，不需要重复拿取。'+(p.clues.includes('origin')?'照片也已核对，接下来去后院归还。':'接下来去书房，核对它原来的位置。')];
 if(id==='bag_wait'){
  d.propPortrait='fridge';
  d.lines=p.clues.includes('message')?['冰箱门还在来回拍打，购物袋暂时够不到。','你已经听过电视留言，现在只需要先解决冰箱的抱怨。']:['袋子旁的冰箱门还在拍打。你暂时不知道该找哪件东西。','先去客厅听电视留言，再决定调查什么。'];
 }
 if(id==='pit_wait'){
  const missing=missingHouseEvidence(p);
  d.lines=missing.length?['你找到了土坑，但现在还不能确认归还这件事是否准备齐全。',`目前还缺：${missing.join('；')}。已取得的线索都保留着，不必重做。`]:['归还需要的线索已经齐全。回到场景，再检查土坑即可。'];
 }
 // A closing option must describe closing the dialogue, not promise movement that does not happen.
 for(const c of d.choices)if(!c.next&&!c.effects?.some(e=>e.type==='ending')&&c.id!=='start'&&!(id==='bag'&&c.id==='take')){
  if(id==='message')c.label='记下留言，回到场景';
  else if(id==='desk_ok')c.label='收好照片，回到场景';
  else if(/^(去|先回|先下楼|先处理|补齐|带好)/.test(c.label))c.label='回到场景，继续调查';
  if(!c.hint)c.hint='点左上角黄色按钮，人物会走向下一处；也可以继续自由调查。';
 }
 return {dialogue:d,judgment};
}
