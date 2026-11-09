import {ChevronRight} from 'lucide-react';
import {Modal} from '../ui/Modal';
import type {Progress, Story} from '@/game/schema';
import {formatText, matches} from '@/game/story';
import {playerDialogue} from '@/game/playerExperience';
export function Conversation({story, progress, onChoose, onClose}: {story: Story; progress: Progress; onChoose: (id:string)=>void; onClose:()=>void}) {
  const view=playerDialogue(story,progress);const d=view?.dialogue;
  if (!d) return null;
  const f = (s:string) => formatText(s, progress);
  return <Modal title={f(d.speaker)} onClose={onClose} className={d.pair ? 'calibrate-modal' : 'dialogue-modal'} kicker={story.title}>
    {d.pair ? <><p className="panel-intro">{f(d.caption)}</p><div className="swap-pair">{d.pair.map((p,i)=><article key={i}><img src={`${import.meta.env.BASE_URL}portraits/${p.body}.png`} alt={f(p.label)}/><strong>{f(p.label)}</strong>{p.caption&&<span>{f(p.caption)}</span>}</article>)}<span className="pair-arrow" aria-hidden="true">↔</span></div><div className="pair-description">{d.lines.map((line,i)=><p key={i}>{f(line)}</p>)}</div></> :
    <div className="dialogue-layout"><div className="dialogue-portrait"><img src={d.propPortrait?`${import.meta.env.BASE_URL}portraits/house-${d.propPortrait}.png`:`${import.meta.env.BASE_URL}portraits/${d.portrait}.png`} alt={f(d.speaker)}/><span>{story.title}</span></div><div className="dialogue-content"><div className="speaker-caption">{f(d.caption)}</div>{d.lines.map((line,i)=><p key={i}>{f(line)}</p>)}<Choices/></div></div>}
    {d.pair&&<Choices/>}
  </Modal>;
  function Choices(){return <>{view?.judgment&&<details className="player-judgment" aria-label={f(view.judgment.label)}><summary>需要一点提示？</summary><span>{f(view.judgment.label)}</span><strong>{f(view.judgment.question)}</strong><p>{f(view.judgment.evidence)}</p></details>}<div className="dialogue-choices">{d!.choices.map((c,i)=><button key={c.id} disabled={!matches(c.requires,progress)} onClick={()=>onChoose(c.id)}><span className="choice-index">{String(i+1).padStart(2,'0')}</span><span><strong>{f(c.label)}</strong>{c.hint&&<small>{f(c.hint)}</small>}</span><ChevronRight size={18}/></button>)}</div></>;}
}
