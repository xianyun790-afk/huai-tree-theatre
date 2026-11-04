import {Check, ArrowRight} from 'lucide-react';
import type {Progress, Story} from '@/game/schema';
import {formatText} from '@/game/story';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
export function CaseBook({story, progress, onClose}: {story:Story;progress:Progress;onClose:()=>void}) {
 return <Modal title="线索本" onClose={onClose} kicker={story.title}><p className="panel-intro">{formatText(story.motivation,progress)}</p><div className="clue-list">{story.clues.length===0?<p className="empty-note">这一集不需要收集线索，按照当前任务继续即可。</p>:story.clues.map((c,i)=><article key={c.id} className={progress.clues.includes(c.id)?'':'locked-clue'}><span className="clue-number">{String(i+1).padStart(2,'0')}</span><div><small>{formatText(c.source,progress)}</small><h3>{progress.clues.includes(c.id)?formatText(c.title,progress):'尚未找到'}</h3><p>{progress.clues.includes(c.id)?formatText(c.text,progress):`调查位置：${formatText(c.source,progress)}`}</p></div>{progress.clues.includes(c.id)&&<Check size={18}/>}</article>)}</div><Button className="primary full-width" onClick={onClose}>继续这一集<ArrowRight size={17}/></Button></Modal>;
}
