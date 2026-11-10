import {ArrowRight,Fan,Hand,RotateCw,Skull,Wind} from 'lucide-react';
import type {Progress} from '@/game/schema';
import {kitchenState,type KitchenAction} from '@/game/house/kitchen';

export function KitchenEncounter({progress,feedback,onAct,onClose}:{progress:Progress;feedback:string;onAct:(action:KitchenAction)=>void;onClose:()=>void}){
 const k=kitchenState(progress),taken=progress.clues.includes('skull'),calm=!!progress.flags.fridge_cooled;
 const status=feedback||(taken?'摆件已经带上了。屋里其他的怪事，还等着你查。':calm?'冰箱门安静下来，购物袋就在旁边。':k.fanOn&&k.aim==='soup'?'蒸汽正在变少……':k.holdingPot?'两只手都占着。': '冰箱：“烫烫烫！谁把刚烧开的汤塞进来了！”');
 return <div className="kitchen-encounter">
  <div className="kitchen-objective"><span>{taken?'拿到了':'眼前的小麻烦'}</span><strong>{taken?'缺牙摆件 · 已随身带上':'拿到购物袋里的摆件'}</strong><span className="kitchen-hand"><Hand size={15}/>{k.holdingPot?'端着汤锅':k.mitt?'戴着隔热手套':'空手'}</span></div>
  <div className={`kitchen-stage ${calm?'is-calm':''} ${k.fanOn?'fan-running':''} aim-${k.aim} ticket-${k.ticket} ${k.potMoved?'pot-moved':''} ${k.holdingPot?'pot-held':''}`}>
   <div className="kitchen-tile" aria-hidden="true"/>
   <div className="kitchen-window" aria-hidden="true"><span/><i/></div>
   <div className="kitchen-worktop" aria-hidden="true"/>
   <div className="kitchen-fridge" aria-hidden="true"><span className="k-fridge-eyes">{calm?'◡ ◡':'› ‹'}</span><i/><span className="k-fridge-mouth">{calm?'‿':'﹏'}</span></div>
   <button className={`k-mitt ${k.mitt?'is-worn':''}`} aria-label="隔热手套" aria-pressed={k.mitt} onClick={()=>onAct('mitt')}><Hand/><span>{k.mitt?'已戴上':'隔热手套'}</span></button>
   <button className="k-mat" aria-label="隔热垫" onClick={()=>onAct('mat')}><span aria-hidden="true">▧</span><small>隔热垫</small></button>
   <button className={`k-pot ${k.heat===0?'is-cool':''}`} aria-label={k.holdingPot?'端着的汤锅':'汤锅'} aria-pressed={k.holdingPot} onClick={()=>onAct('pot')}><span className="k-steam" aria-hidden="true" style={{opacity:k.heat/100}}>〰<br/>〰</span><span className="pot-lid"/><span className="pot-body"/><small>{k.holdingPot?'端着':k.potMoved?'放稳了':k.heat===0?'温了':'热汤'}</small></button>
   <div className="k-heat"><meter aria-label="热汤温度" min="0" max="100" value={k.heat}/><span>{k.potMoved?'已移开':k.heat===0?'温了':k.heat<60?'温热':'烫'}</span></div>
   <button className={`k-bag ${taken?'is-empty':''}`} aria-label="购物袋" onClick={()=>onAct('bag')}><span className="k-bag-handle"/>{taken?<span className="k-empty-bag">空了</span>:<Skull/>}<small>购物袋</small></button>
   <div className="k-fan-controls"><button className="k-fan" aria-label={k.fanOn?'关闭风扇':'打开风扇'} aria-pressed={k.fanOn} onClick={()=>onAct('fan')}><Fan/><span>{k.fanOn?'开':'关'}</span></button><button className="k-fan-aim" aria-label="转动风扇方向" onClick={()=>onAct('aim')}><RotateCw size={15}/><span>转向</span></button></div>
   <div className="k-wind" aria-hidden="true"><Wind/><Wind/></div>
   <span className="k-direction">风向：{k.aim==='papers'?'纸片':'汤锅'} {k.aim==='papers'?'→':'←'}</span>
   <button className="k-ticket" aria-label={k.ticket==='floor'?'捡起地上的彩票':k.ticket==='returned'?'冰箱上的彩票':'台面的彩票'} onClick={()=>onAct('ticket')}><span>退休计划</span><b>⑦ ⑦ ？</b><small>{k.ticket==='floor'?'掉地上了':k.ticket==='returned'?'磁铁压牢':'彩票'}</small></button>
   {k.ticket==='returned'&&<span className="k-magnet" aria-hidden="true">★</span>}
  </div>
  <p className="kitchen-reaction" role="status" aria-live="polite">{status}</p>
  <div className="kitchen-bottom"><details><summary>需要一点提示？</summary><p>{calm?'门不再拍了，试试台面上的袋子。':'锅柄很烫，纸片又正对着风扇。看看房间里的物件，能改变什么。'}</p></details><button onClick={onClose}>{taken?'继续调查':'回到房间'}<ArrowRight size={16}/></button></div>
 </div>;
}
