import {ArrowUpRight,DoorOpen,MapPin,Search} from 'lucide-react';
import {HOUSE_ROOMS} from '@/game/house/layout';
import type {Room,Story,Target} from '@/game/schema';
export function RoomNavigation({room,story,locked,moving,onVisit}:{room:Room;story:Story;locked:boolean;moving:boolean;onVisit:(id:Target)=>void}){
 const definition=HOUSE_ROOMS[room];const objects=Object.entries(definition.targets).filter(([id])=>!definition.doors[id as Target]&&story.interactions[id as Target]);
 return <aside className="room-navigation" aria-label="房间与出口"><div className="room-heading"><span><MapPin size={14}/><strong>{definition.name}</strong></span><small>{moving?'走到门口或物品旁，再自动互动':definition.subtitle}</small></div><div className="room-exits">{Object.entries(definition.doors).map(([id,destination])=><button disabled={locked} key={id} onClick={()=>onVisit(id as Target)}><DoorOpen size={14}/>{destination==='street'?'回到街上':`去${HOUSE_ROOMS[destination!].name}`}<ArrowUpRight size={13}/></button>)}</div>{objects.length>0&&<details className="room-objects" key={room}><summary><Search size={13}/>本房可调查 · {objects.length} 处</summary><div>{objects.map(([id,t])=><button key={id} disabled={locked} onClick={()=>onVisit(id as Target)}>{t!.label}</button>)}</div></details>}</aside>;
}
