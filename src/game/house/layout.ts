import type {Body, Room, Target} from '../schema.ts';
import type {Point} from '../navigation.ts';
export interface Hotspot {label:string;kind:string;point:Point;anchor:[number,number,number];body?:Body}
export interface RoomDefinition {name:string;subtitle:string;spawn:Point;targets:Partial<Record<Target,Hotspot>>;doors:Partial<Record<Target,Room>>}
const spot=(label:string,x:number,z:number,y=2.6,kind='调查'):Hotspot=>({label,kind,point:{x,z:.8},anchor:[x,y,z]});
const door=(label:string,x:number,z:number):Hotspot=>({label,kind:'前往',point:{x,z},anchor:[x,2.5,z]});
export const HOUSE_ROOMS:Record<Room,RoomDefinition>={
 street:{name:'家门口',subtitle:'31 号 · 今晚家里不太安静',spawn:{x:-4.6,z:2.3},targets:{'front-door':{...door('进家门',-7.4,1.1),anchor:[-7.4,2.9,-.1]}},doors:{'front-door':'living'}},
 living:{name:'客厅',subtitle:'电视在说话，老爸说是新功能',spawn:{x:-2.4,z:2.7},targets:{
  tv:spot('会说话的电视',-4,-1.8,2.4),sofa:spot('抖动的沙发',-.5,-2.7,2.7),father:{...spot('老周 · 坚称没事',2.1,-1.8,3.3,'对话'),body:'father'},vacuum:{...spot('吸尘器',-3.5,2.3,1.8),point:{x:-3.1,z:2.7}},
  'street-door':door('回到街上',-5,2.8),'kitchen-door':door('去厨房',5,1.5),'study-door':{...door('上楼去书房',3.8,.45),anchor:[3.8,3.1,-3.6]}
 },doors:{'street-door':'street','kitchen-door':'kitchen','study-door':'study'}},
 kitchen:{name:'厨房',subtitle:'冰箱今天有很多意见',spawn:{x:-3,z:2.5},targets:{
  fridge:spot('拒绝营业的冰箱',-3.7,-2.5,3.8),'shopping-bag':{...spot('老爸的购物袋',1.5,-2.1,2.6),point:{x:1.5,z:.8}},
  'living-door':door('回客厅',-5,2.6),'yard-door':door('去后院',5,1.5)
 },doors:{'living-door':'living','yard-door':'yard'}},
 study:{name:'楼上书房',subtitle:'昨天的照片，比今天的解释可靠',spawn:{x:-3.8,z:2.7},targets:{
  desk:spot('施工照片与旧剪报',-2,-2.1,3),inventor:{...spot('阿岚 · 来看热闹',2.7,-1.8,3.3,'对话'),body:'inventor'},
  'living-door':door('下楼回客厅',-4.8,2.5)
 },doors:{'living-door':'living'}},
 yard:{name:'后院',subtitle:'一只土坑，几件不该带回家的东西',spawn:{x:-3.6,z:2.7},targets:{
  pit:spot('昨天挖开的土坑',-.7,-1.6,1.3),neighbor:{...spot('老何 · 隔墙吃瓜',3.8,-1.8,3.3,'对话'),body:'neighbor'},
  'kitchen-door':door('回厨房',-5,2.6)
 },doors:{'kitchen-door':'kitchen'}}
};
export const HOUSE_OBJECTS = ['tv','sofa','father','vacuum','fridge','shopping-bag','desk','inventor','pit','neighbor'] as const;
export function targetRoom(target:Target):Room|undefined {return (Object.keys(HOUSE_ROOMS) as Room[]).find(room=>HOUSE_ROOMS[room].targets[target]&&!HOUSE_ROOMS[room].doors[target]);}
export function nextDoor(from:Room,to:Room):Target|null {
 const queue:{room:Room;first:Target|null}[]=[{room:from,first:null}];const seen=new Set<Room>();
 for(const node of queue){if(node.room===to)return node.first;if(seen.has(node.room))continue;seen.add(node.room);for(const [door,room] of Object.entries(HOUSE_ROOMS[node.room].doors))queue.push({room:room as Room,first:node.first??door as Target});}return null;
}
export function roomAction(room:Room,target:Target,action:string):{target:Target;label:string}{
 const destination=targetRoom(target);const door=destination&&destination!==room?nextDoor(room,destination):null;
 return door?{target:door,label:room==='street'?'进家门，去客厅':`${HOUSE_ROOMS[room].targets[door]!.label}${HOUSE_ROOMS[room].doors[door]===destination?'，继续调查':`，再去${HOUSE_ROOMS[destination!].name}`}`}:{target,label:action};
}
export function roomRoute(from:Point,to:Point):Point[]{const goal={x:Math.max(-5,Math.min(5,to.x)),z:Math.max(.4,Math.min(3,to.z))};return Math.abs(from.x-goal.x)>2.5?[{x:from.x,z:2},{x:goal.x,z:2},goal]:[goal];}
