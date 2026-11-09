import type {Progress, Story} from '../schema.ts';
import {choose, objective} from '../story.ts';

export interface Tuning {frequency:number;antenna:number}
export const DEFAULT_TUNING:Tuning={frequency:20,antenna:10};

export type HouseAction = 'hear' | 'cool' | 'take' | 'photo';
const ACTIONS:Record<HouseAction,{at:string;choices:string[]}>={
 hear:{at:'tv',choices:['static','record']},
 cool:{at:'fridge',choices:['kind','go']},
 take:{at:'bag',choices:['take']},
 photo:{at:'desk',choices:['yard','go']},
};
// Use the authored effects, including their prerequisites, so both presentations share saves.
export function performHouseAction(story:Story,p:Progress,action:HouseAction):Progress {
 const spec=ACTIONS[action];
 if(story.id!=='haunted-house'||p.dialogueId!==spec.at)return p;
 let next=p;
 for(const id of spec.choices){const candidate=choose(story,next,id);if(candidate===next)return p;next=candidate;}
 return next;
}
export function signalQuality(frequency:number,antenna:number):number {
 if(!Number.isFinite(frequency)||!Number.isFinite(antenna))return 0;
 return Math.max(0,1-Math.abs(frequency-68)/32)*Math.max(0,1-Math.abs(antenna-52)/60);
}
export const clearSignal=(frequency:number,antenna:number)=>signalQuality(frequency,antenna)>=.84;
export function houseIntent(story:Story,p:Progress):string {
 return ({listen:'弄清家里为什么闹鬼',fridge:'找出老爸带回来的东西',bag:'找出老爸带回来的东西',photos:'查清摆件的来历',return:'把摆件送回原处'} as Record<string,string>)[objective(story,p).id]??'在屋里找找线索';
}

export const HOUSE_BEATS:Record<string,{line:string;labels?:string[]}>={
 intro:{line:'你刚回家，电视就喊起了“退货”。老爸说，这是新功能。',labels:['知道了']},
 message:{line:'“把昨天从后院拿走的东西放回去！” 老爸指了指厨房。',labels:['记下这句话']},
 tv_repeat:{line:'“我在等退货，不是在播背景音乐。”',labels:['先挂着']},
 father:{line:'“我就捡了个免费摆件。放厨房了……你别告诉你妈。”',labels:['你先躲好']},
 sofa:{line:'沙发又挪了半米。老爸今天的步数，全靠它。',labels:['让它自己锻炼']},
 vacuum:{line:'吸尘器抓到了一只鬼——不，是一片放了三年的薯片。',labels:['倒掉，假装没看见']},
 fridge_early:{line:'“先听听客厅在喊什么。别一进来就盯着我的汤。”',labels:['回到房间，继续调查']},
 fridge_ok:{line:'冰箱不晃了，购物袋也终于够得到了。',labels:['继续看看']},
 fridge_no:{line:'“拔电源就不用管热汤了？你和你爸真像。”',labels:['接回去，再试试']},
 bag_wait:{line:'冰箱门拍得台面直晃。袋子暂时够不到。',labels:['回到厨房']},
 bag_empty:{line:'袋里只剩薯片。缺牙摆件已经在你身上。',labels:['走了']},
 desk_early:{line:'一整本施工相册。先找到那件旧物，才知道该对照什么。',labels:['回到书房']},
 desk_ok:{line:'照片里也是这颗缺牙脑袋，就在苹果树旁。',labels:['收好照片']},
 desk_wrong:{line:'阿岚：“你看的是照片，还是家居搭配指南？”',labels:['再看一眼']},
 inventor:{line:'“今天我没开实验台。所以这次，终于不是我的锅。”',labels:['回到书房，继续调查']},
 neighbor:{line:'“昨天你爸从坑里拿东西，今天家具追着他跑。很公平。”',labels:['这事你倒记得清楚']},
 pit_wait:{line:'土坑是找到了。先弄清带来的物件和它的来历。',labels:['再查一查']},
 pit:{line:'土坑和照片对上了。放回去之前，要不要让老爸长点记性？',labels:['叫老爸来道歉','留一张“请勿再寄”']},
 ads:{line:'“驱鬼拖把限时促销，附赠一只更小的鬼！”',labels:['继续找那个声音']},
 weather:{line:'“客厅有阵风，局部地区可能下老爸。”',labels:['继续找那个声音']},
};
