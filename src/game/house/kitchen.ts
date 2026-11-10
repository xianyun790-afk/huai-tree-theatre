import type {Progress} from '../schema.ts';

export interface KitchenState {
 heat:number;
 mitt:boolean;
 holdingPot:boolean;
 potMoved:boolean;
 fanOn:boolean;
 aim:'papers'|'soup';
 ticket:'counter'|'floor'|'returned';
 method:'mitt'|'fan'|null;
}
export type KitchenAction='mitt'|'pot'|'mat'|'fan'|'aim'|'ticket'|'bag'|'tick';
export const KITCHEN_DIALOGUES=['fridge','fridge_early','fridge_ok','bag','bag_wait','bag_empty'];
export function kitchenState(p:Progress):KitchenState {
 return p.kitchen??{heat:p.flags.fridge_cooled?0:100,mitt:false,holdingPot:false,potMoved:!!p.flags.fridge_cooled,fanOn:false,aim:'papers',ticket:'counter',method:null};
}
export function validKitchen(value:unknown):value is KitchenState {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const k=value as KitchenState;
 return Object.keys(k).length===8&&Number.isFinite(k.heat)&&k.heat>=0&&k.heat<=100&&
 ['mitt','holdingPot','potMoved','fanOn'].every(key=>typeof k[key as keyof KitchenState]==='boolean')&&
 ['papers','soup'].includes(k.aim)&&['counter','floor','returned'].includes(k.ticket)&&
 (k.method===null||k.method==='mitt'||k.method==='fan')&&
 !(k.holdingPot&&k.potMoved)&&!(k.holdingPot&&k.heat>0&&!k.mitt)&&
 (k.method!=='mitt'||k.potMoved)&&(k.method!=='fan'||k.heat===0);
}
export interface KitchenResult {progress:Progress;feedback:string;cue:'pickup'|'spring'|'fan'|'fridge'|'clue'|'click'}
export function actInKitchen(p:Progress,action:KitchenAction):KitchenResult {
 const unchanged=(feedback=''):KitchenResult=>({progress:p,feedback,cue:'click'});
 if(p.storyId!=='haunted-house'||!p.started||p.endingId||p.room!=='kitchen')return unchanged();
 if(action!=='tick'&&(!p.dialogueId||!KITCHEN_DIALOGUES.includes(p.dialogueId)))return unchanged();
 const k={...kitchenState(p)};
 if(k.holdingPot&&['mitt','fan','aim','ticket'].includes(action))return unchanged('两只手都端着锅，先找个耐热的位置放下。');
 let feedback='',cue:KitchenResult['cue']='pickup';
 if(action==='mitt'){
  if(k.mitt)return unchanged('手套已经戴好了。');
  k.mitt=true;feedback='手套套好了，手指终于有了盔甲。';
 }else if(action==='pot'){
  if(k.potMoved)return unchanged('锅已经稳稳放在隔热垫上。');
  if(k.holdingPot)return unchanged('端着呢，得找个耐热的位置。');
  if(k.heat>0&&!k.mitt)return {...unchanged('嘶——锅柄烫手！'),cue:'spring'};
  k.holdingPot=true;feedback='端起来了。别把锅放在木台面上。';
 }else if(action==='mat'){
  if(k.potMoved)return unchanged('锅稳稳放在隔热垫上。');
  if(!k.holdingPot)return unchanged('空的隔热垫。耐热，也很闲。');
  k.holdingPot=false;k.potMoved=true;k.method??=k.heat===0?'fan':'mitt';
  feedback='咚。冰箱长出一口气，门不拍了。';cue='fridge';
 }else if(action==='fan'){
  k.fanOn=!k.fanOn;cue='fan';feedback=k.fanOn?'呼——风扇转起来了。':'风停了。';
 }else if(action==='aim'){
  k.aim=k.aim==='papers'?'soup':'papers';cue='click';feedback=k.fanOn?'风向转过去了。':'风扇头转过去了。';
 }else if(action==='ticket'){
  if(k.ticket==='returned')return unchanged('彩票已经被磁铁牢牢吸在冰箱上。');
  if(k.ticket==='counter')return unchanged('老爸的彩票。只压了半颗花生，纸角正对着风扇。');
  k.ticket='returned';feedback='捡回彩票，用冰箱磁铁压牢。老爸在客厅松了口气。';
 }else if(action==='bag'){
  if(p.clues.includes('skull'))return unchanged('缺牙摆件已经在你的随身物品里。');
  if(k.holdingPot)return unchanged('两只手都端着锅，先放下它。');
  if(!p.flags.fridge_cooled)return {...unchanged('啪！冰箱门又拍过来，先让它安静下来。'),cue:'spring'};
  return {progress:{...p,kitchen:k,clues:[...p.clues,'skull']},feedback:'袋底是一颗缺牙摆件，还沾着后院的湿泥。',cue:'clue'};
 }else if(action==='tick'){
  if(!k.fanOn||k.potMoved||k.holdingPot||k.aim!=='soup'||k.heat===0)return unchanged();
  k.heat=Math.max(0,k.heat-10);cue='click';
  if(k.heat===0){k.method??='fan';feedback='蒸汽散了。冰箱终于不再拍门。';cue='fridge';}
 }
 if(k.fanOn&&k.aim==='papers'&&k.ticket==='counter'){
  k.ticket='floor';feedback='呼啦！彩票飞了。客厅：“那可是我的退休计划！”';cue='spring';
 }
 const cooled=k.potMoved||k.heat===0;
 return {progress:{...p,kitchen:k,flags:cooled?{...p.flags,fridge_cooled:true}:p.flags},feedback,cue};
}
