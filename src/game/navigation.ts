// Navigation uses the town's open front pavement; buildings remain impassable.
export interface Point {x:number;z:number}
export function clampGround(p:Point):Point {return {x:Math.max(-10.4,Math.min(10.4,p.x)),z:Math.max(.45,Math.min(3.05,p.z))};}
export function route(from:Point,to:Point):Point[]{
 const goal=clampGround(to);
 // Street furniture is outside this broad pedestrian strip. Keeping a shared lane
 // prevents diagonal shortcuts through the lab façade and hedge fronts.
 if(Math.abs(from.x-goal.x)>2.5)return [{x:from.x,z:2.25},{x:goal.x,z:2.25},goal];
 return [goal];
}
