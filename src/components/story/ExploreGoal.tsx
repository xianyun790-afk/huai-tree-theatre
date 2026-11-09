import {ArrowRight,Compass} from 'lucide-react';
import type {Progress,Story} from '@/game/schema';
import {houseIntent} from '@/game/house/handsOn';
import {formatText} from '@/game/story';
import {playerTask} from '@/game/playerExperience';

export function ExploreGoal({story,progress,action,locked,moving,onVisit,onGuide}:{story:Story;progress:Progress;action:string;locked:boolean;moving:boolean;onVisit:()=>void;onGuide:(open:boolean)=>void}){
 const task=playerTask(story,progress);
 return <aside className="explore-goal" aria-label="当前目标"><span className="eyebrow">今晚的小麻烦</span><h2>{houseIntent(story,progress)}</h2><details onToggle={e=>onGuide(e.currentTarget.open)} key={task.id}><summary>卡住了？看一点提示</summary><p>{formatText(task.detail,progress)}</p><button onClick={onVisit} disabled={locked}><Compass size={15}/>{moving?'正在走过去':action}<ArrowRight size={15}/></button></details></aside>;
}
