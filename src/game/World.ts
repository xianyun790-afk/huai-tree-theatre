import * as THREE from 'three';
import {OutlineEffect} from 'three/addons/effects/OutlineEffect.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {route,type Point} from './navigation';
import {BODIES,TARGETS as TARGET_IDS,type Body,type Room,type Target,type WorldSetup} from './schema';
import {HOUSE_ROOMS,roomRoute,type Hotspot} from './house/layout';
import {footstepFor,type SoundCue} from './audio';
import type {KitchenState} from './house/kitchen';
interface Actor {group:THREE.Group;mixer:THREE.AnimationMixer;actions:Record<string,THREE.AnimationAction>;current:string;heading:number}
export const TARGETS:Partial<Record<Target,Hotspot>>={
 inventor:{label:'阿岚 · 修机器',kind:'对话',point:{x:2.65,z:.9},anchor:[2.85,2.85,.75],body:'inventor'},
 father:{label:'老周 · 你爸',kind:'对话',point:{x:-3.25,z:1.05},anchor:[-3.5,2.8,.65],body:'father'},
 neighbor:{label:'老何 · 你的身体',kind:'对话',point:{x:5.55,z:1.8},anchor:[5.8,2.85,1.4],body:'player'},
 lab:{label:'实验台',kind:'调查',point:{x:0,z:.5},anchor:[0,2.9,-1.95]},
 mailbox:{label:'31 号信箱',kind:'调查',point:{x:-9.4,z:2},anchor:[-9.7,1.5,1.5]},
};
export class World {
 private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera();private renderer:THREE.WebGLRenderer;
 private ink:OutlineEffect;private toonRamp:THREE.DataTexture;
 private actors:Partial<Record<Body,Actor>>={};private clock=new THREE.Clock();private raf=0;private observer:ResizeObserver;
 private environment:THREE.Object3D|null=null;private rooms:Partial<Record<Room,THREE.Object3D>>={};private room:Room='street';
 private resolved=false;private skullTaken=false;private fridgeCooled=false;private elapsed=0;private reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private paths:Point[]=[];private pending:Target|null=null;private ray=new THREE.Raycaster();private disposed=false;private stepDistance=0;
 private labels=new Map<Target,HTMLButtonElement>();private playerLabel:HTMLDivElement;private paused=true;private active=false;
 private cameraFocus=0;private currentTarget:Target='inventor';private ring:THREE.Mesh;private dest:THREE.Mesh;
 private exploration=false;private guided=true;
 private kitchenState:KitchenState|null=null;
 private kitchenProps:{rotor:THREE.Group;ticket:THREE.Mesh;steam:THREE.Group;mitt:THREE.Group}|null=null;
 private targets:Partial<Record<Target,Hotspot>>=structuredClone(TARGETS);private enabledTargets=new Set<Target>();
 private setup:WorldSetup|null=null;private wasEnded=false;private playerBody:Body='neighbor';
 private keyHandler:(e:KeyboardEvent)=>void;private pointerHandler:(e:PointerEvent)=>void;
 constructor(private host:HTMLDivElement,private interact:(target:Target)=>void,private moveCallback:(moving:boolean)=>void,private sound:(cue:SoundCue)=>void=()=>{}){
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NoToneMapping;
  this.ink=new OutlineEffect(this.renderer,{defaultThickness:.0025,defaultColor:[.10,.13,.15],defaultAlpha:1});
  this.toonRamp=new THREE.DataTexture(new Uint8Array([135,195,255]),3,1,THREE.RedFormat);this.toonRamp.minFilter=THREE.NearestFilter;this.toonRamp.magFilter=THREE.NearestFilter;this.toonRamp.generateMipmaps=false;this.toonRamp.needsUpdate=true;
  this.scene.add(new THREE.AmbientLight(0xffffff,.9));const keyLight=new THREE.DirectionalLight(0xffffff,2.1);keyLight.position.set(-6,12,9);this.scene.add(keyLight);
  this.renderer.domElement.setAttribute('aria-label','3D 场景：点击地面行走，点击物品、人物或门互动');this.host.appendChild(this.renderer.domElement);
  this.scene.background=new THREE.Color('#a9dceb');this.camera.position.set(18,22,28);this.camera.lookAt(-.5,0,0);
  const rim=new THREE.RingGeometry(.49,.57,48);rim.rotateX(-Math.PI/2);this.ring=new THREE.Mesh(rim,new THREE.MeshBasicMaterial({color:'#ffdf51',side:THREE.DoubleSide,depthTest:false}));this.ring.renderOrder=20;this.scene.add(this.ring);
  const geometry=new THREE.RingGeometry(.11,.16,32);geometry.rotateX(-Math.PI/2);this.dest=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#fff9df',transparent:true,opacity:.85,depthTest:false}));this.dest.visible=false;this.dest.renderOrder=21;this.scene.add(this.dest);
  for(const id of TARGET_IDS){
   const button=document.createElement('button');button.className='world-label';button.dataset.target=id;button.hidden=true;
   const marker=document.createElement('span');marker.className='marker';const label=document.createElement('span');label.className='label-text';button.append(marker,label);button.onclick=()=>this.visit(id);this.labels.set(id,button);this.host.appendChild(button);
  }
  this.playerLabel=document.createElement('div');this.playerLabel.className='player-label';this.playerLabel.hidden=true;this.host.appendChild(this.playerLabel);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.host);this.resize();
  this.pointerHandler=e=>{
   if(e.target!==this.renderer.domElement||this.paused||!this.active)return;
   const rect=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);
   const actorHit=this.ray.intersectObjects(Object.values(this.actors).filter(a=>a.group.visible).map(a=>a.group),true)[0];
   if(actorHit)for(const [id,t] of Object.entries(this.targets) as [Target,Hotspot][]){const a=t.body&&this.actors[t.body];if(a&&(actorHit.object===a.group||this.isDescendant(actorHit.object,a.group))){this.visit(id);return;}}
   if(this.interior){
    const hit=this.ray.intersectObject(this.rooms[this.room]!,true)[0];
    if(hit){const p=hit.point;let nearest:Target|null=null;let distance=1.1;for(const [id,t] of Object.entries(this.targets) as [Target,Hotspot][]){if(!this.available(id))continue;const d=Math.hypot(p.x-t.anchor[0],p.z-t.anchor[2]);if(d<distance){distance=d;nearest=id;}}if(nearest){this.visit(nearest);return;}}
   }
   const point=this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.12),new THREE.Vector3());
   if(point&&(this.interior?Math.abs(point.x)<5.8&&point.z>-.2&&point.z<4:point.z>-.2&&point.z<6&&Math.abs(point.x)<12))this.walkTo(point);
  };
  this.renderer.domElement.addEventListener('pointerup',this.pointerHandler);
  this.keyHandler=e=>{
   if(this.paused||!this.active||/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName))return;
   if(e.key.toLowerCase()==='e'&&this.guided){this.visit(this.currentTarget);return;}
   const steps:Record<string,[number,number]>={ArrowLeft:[-.8,.5],ArrowRight:[.8,-.5],ArrowUp:[-.5,-.8],ArrowDown:[.5,.8],a:[-.8,.5],d:[.8,-.5],w:[-.5,-.8],s:[.5,.8]};const step=steps[e.key];const p=this.actors[this.playerBody]?.group.position;if(p&&step){e.preventDefault();this.walkTo({x:p.x+step[0],z:p.z+step[1]});}
  };window.addEventListener('keydown',this.keyHandler);this.tick();
 }
 private get house(){return this.setup?.stage==='house';}
 private get interior(){return this.house&&this.room!=='street';}
 private isDescendant(o:THREE.Object3D,root:THREE.Object3D){let p=o.parent;while(p){if(p===root)return true;p=p.parent;}return false;}
 async load(onProgress:(p:number)=>void){
  const loader=new GLTFLoader();let loaded=0;const names=['environment','father','player','inventor','neighbor','house-living','house-kitchen','house-study','house-yard'];
  const assets=await Promise.all(names.map(async name=>{const asset=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);onProgress(++loaded/names.length);return{name,asset};}));
  if(this.disposed){for(const {asset} of assets)this.disposeObject(asset.scene);return;}
  for(const {name,asset} of assets){
   // Reuse the authored palette with three hard lighting bands and animated ink contours.
   asset.scene.traverse(o=>{if(o instanceof THREE.Mesh){const old=Array.isArray(o.material)?o.material:[o.material];const next=old.map((material:THREE.MeshStandardMaterial)=>{const color=(material.emissive?.getHex()?material.emissive:material.color).clone().convertSRGBToLinear();const toon=new THREE.MeshToonMaterial({color,gradientMap:this.toonRamp,side:THREE.FrontSide});toon.userData.outlineParameters={thickness:name.startsWith('house-')?.002:.003,color:[.10,.13,.15]};material.dispose();return toon;});o.material=next.length===1?next[0]:next;}});
   if(name==='environment'||name.startsWith('house-')){
    const isRoom=name.startsWith('house-');asset.scene.traverse(o=>{if(o instanceof THREE.Mesh&&(isRoom||/Wall|Roof|door|facade|Car_lower/i.test(o.name))&&!/seam|Static|Tile|Book|Ghost|leaf|crown/i.test(o.name)){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,40),new THREE.LineBasicMaterial({color:'#27313a',transparent:true,opacity:isRoom?.38:.4}));o.add(edges);}});
    if(isRoom)this.rooms[name.replace('house-','') as Room]=asset.scene;else this.environment=asset.scene;
    asset.scene.visible=false;this.scene.add(asset.scene);continue;
   }
   const body=name as Body;const group=new THREE.Group();group.name=body;group.add(asset.scene);group.rotation.y=.55;this.scene.add(group);
   const mixer=new THREE.AnimationMixer(asset.scene);const actions:Record<string,THREE.AnimationAction>={};for(const clip of asset.animations){const key=['Idle','Walk','Talk','Point'].find(k=>clip.name.includes(k))??clip.name;actions[key]=mixer.clipAction(clip);}this.actors[body]={group,mixer,actions,current:'',heading:.55};this.animate(body,'Idle');
  }
  this.addKitchenProps();this.showRoom();this.placeActors();this.updateProps();this.refreshLabels();
 }
 private addKitchenProps(){
  const room=this.rooms.kitchen;if(!room)return;
  const material=(color:string)=>new THREE.MeshToonMaterial({color,gradientMap:this.toonRamp});
  const green=material('#85a897'),cream=material('#e1d4aa'),ink=material('#354c43');
  const fan=new THREE.Group();fan.name='Kitchen_Fan';fan.position.set(.1,1.66,-2.4);room.add(fan);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.3,.36,.09,20),cream);base.position.y=.05;fan.add(base);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.6,10),green);stem.position.y=.35;fan.add(stem);
  const cage=new THREE.Mesh(new THREE.TorusGeometry(.35,.028,6,24),ink);cage.rotation.y=Math.PI/2;cage.position.y=.86;fan.add(cage);
  const rotor=new THREE.Group();rotor.position.y=.86;fan.add(rotor);
  for(let i=0;i<3;i++){const blade=new THREE.Mesh(new THREE.SphereGeometry(.18,10,6),green);const angle=i*Math.PI*2/3;blade.scale.set(.16,1,.5);blade.position.set(0,Math.cos(angle)*.17,Math.sin(angle)*.17);blade.rotation.x=-angle;rotor.add(blade);}
  const mat=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.025,24),material('#cfac62'));mat.position.set(4.05,1.66,-2.4);room.add(mat);
  const ticket=new THREE.Mesh(new THREE.BoxGeometry(.52,.012,.25),material('#f0d78b'));ticket.name='Kitchen_Lottery';room.add(ticket);
  const mitt=new THREE.Group();mitt.position.set(4.6,2.8,-4.25);mitt.rotation.z=-.2;room.add(mitt);
  const glove=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),material('#cb955b'));glove.scale.set(.8,1.4,.35);mitt.add(glove);
  const thumb=glove.clone();thumb.scale.set(.38,.65,.35);thumb.position.set(-.14,-.02,0);thumb.rotation.z=.6;mitt.add(thumb);
  const steam=new THREE.Group();room.add(steam);
  for(let i=0;i<3;i++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.10+i*.025,8,6),new THREE.MeshBasicMaterial({color:'#fff9e5',transparent:true,opacity:.55,depthWrite:false}));puff.position.set((i%2)*.08,i*.19,0);steam.add(puff);}
  this.kitchenProps={rotor,ticket,steam,mitt};
 }
 setKitchenState(state:KitchenState|null){this.kitchenState=state;this.updateProps();}
 private animate(body:Body,clip:string){const a=this.actors[body];if(!a||a.current===clip||!a.actions[clip])return;const prev=a.actions[a.current],next=a.actions[clip];next.reset().play();if(prev)next.crossFadeFrom(prev,.18,true);a.current=clip;}
 configure(setup:WorldSetup,enabled:Target[]){this.setup=setup;this.enabledTargets=new Set(enabled);this.playerLabel.textContent=setup.playerLabel;this.room='street';this.rebuildTargets();this.reset();}
 private rebuildTargets(){
  this.targets=this.house?structuredClone(HOUSE_ROOMS[this.room].targets):structuredClone(TARGETS);
  for(const slot of ['inventor','father','neighbor'] as const){const t=this.targets[slot];if(t&&this.setup){t.body=this.setup.cast[slot].body;t.label=this.setup.cast[slot].label;}}
  if(!this.house&&this.setup){this.targets.lab!.label=this.setup.locations.lab;this.targets.mailbox!.label=this.setup.locations.mailbox;}
 }
 setSceneState(room:Room='street',resolved=false,skullTaken=false,fridgeCooled=false){
  const next=this.house?room:'street';if(next!==this.room){this.room=next;this.stepDistance=0;this.paths=[];this.pending=null;this.dest.visible=false;this.moveCallback(false);this.rebuildTargets();this.showRoom();this.placeActors();this.resize();}
  this.resolved=resolved;this.skullTaken=skullTaken;this.fridgeCooled=fridgeCooled;this.updateProps();this.refreshLabels();
 }
 private showRoom(){if(this.environment)this.environment.visible=!this.interior;for(const [id,group] of Object.entries(this.rooms))group.visible=this.interior&&id===this.room;this.scene.background=new THREE.Color(this.interior?'#aabbb0':'#a9dceb');this.resize();}
 private updateProps(){
  if(this.targets.fridge)this.targets.fridge.label=this.fridgeCooled?'恢复制冷的冰箱':'拒绝营业的冰箱';
  if(this.targets['shopping-bag'])this.targets['shopping-bag'].label=this.skullTaken?'空购物袋 · 摆件已带走':'老爸的购物袋';
  const kitchen=this.rooms.kitchen;const skull=kitchen?.getObjectByName('Skull_Collectible');if(skull)skull.visible=!this.skullTaken;
  if(this.kitchenProps&&kitchen){
   const k=this.kitchenState,moved=k?.potMoved??this.fridgeCooled,held=k?.holdingPot??false;
   for(const name of ['Soup_pot','Soup_lid','Soup_knob']){const pot=kitchen.getObjectByName(name);if(!pot)continue;pot.userData.originalPosition??=pot.position.clone();pot.position.copy(pot.userData.originalPosition);if(moved)pot.position.x+=.85;else if(held){pot.position.x-=1.1;pot.position.y+=.5;}}
   const {ticket,steam,mitt}=this.kitchenProps;
   ticket.position.set(k?.ticket==='floor'?2.1:k?.ticket==='returned'?-3.8:.9,k?.ticket==='floor'?.07:k?.ticket==='returned'?1.9:1.69,k?.ticket==='floor'?1.8:k?.ticket==='returned'?-1.76:-2.25);
   ticket.rotation.set(k?.ticket==='returned'?Math.PI/2:0,0,k?.ticket==='floor'?.2:0);
   mitt.visible=!k?.mitt;
   steam.visible=!!k&&k.heat>0&&!moved;steam.position.set(held?2.1:3.2,held?2.9:2.45,-2.4);
   steam.scale.setScalar((k?.heat??100)/100);
  }
  const returned=this.rooms.yard?.getObjectByName('Returned_Skull');if(returned)returned.visible=this.resolved;
  for(const room of Object.values(this.rooms))room.traverse(o=>{if(/Haunt_Ghost|Haunt_FridgeEye|Haunt_Static/.test(o.name))o.visible=!this.resolved;});
 }
 private available(id:Target){return !!this.targets[id]&&(this.enabledTargets.has(id)||!!(this.house&&HOUSE_ROOMS[this.room].doors[id]));}
 private refreshLabels(){
  for(const [id,b] of this.labels){const t=this.targets[id];b.hidden=!this.active||this.wasEnded||!this.available(id);b.disabled=this.paused;b.classList.toggle('is-current',this.guided&&id===this.currentTarget);b.classList.toggle('door-label',t?.kind==='前往');if(!t)continue;b.querySelector('.label-text')!.textContent=t.label;b.setAttribute('aria-label',`${t.kind}：${t.label}`);b.querySelector('.marker')!.textContent=this.guided&&id===this.currentTarget?'点我':t.kind==='前往'?'↗':t.kind==='对话'?'···':'?';}
 }
 setPresentation(exploration:boolean,guided:boolean){this.exploration=exploration;this.guided=guided;this.refreshLabels();this.resize();}
 setState(active:boolean,paused:boolean,target:Target,ending:boolean){
  this.active=active;this.paused=paused;this.currentTarget=target;
  this.playerLabel.hidden=!active||ending;this.ring.visible=active&&!ending;
  if(ending&&!this.wasEnded){this.paths=[];this.pending=null;this.dest.visible=false;this.moveCallback(false);this.animate(this.playerBody,'Idle');this.playerBody=this.setup?.endingBody??this.setup?.playerBody??'neighbor';this.animate(this.playerBody,'Point');}
  if(!ending)this.playerBody=this.setup?.playerBody??'neighbor';if(paused&&!ending)this.animate(this.playerBody,'Idle');this.wasEnded=ending;this.refreshLabels();
 }
 setTalking(target:Target|null){const talking=target?this.targets[target]?.body:null;for(const body of BODIES){if(body===talking)this.animate(body,'Talk');else if(body!==this.playerBody)this.animate(body,'Idle');}}
 private placeActors(){
  const player=this.setup?.playerBody??'neighbor';const spawn=this.house?HOUSE_ROOMS[this.room].spawn:{x:-1,z:1.2};
  for(const [body,a] of Object.entries(this.actors) as [Body,Actor][]){const slot=Object.values(this.targets).find(t=>t?.body===body);a.group.visible=body===player||!!slot;if(body===player)a.group.position.set(spawn.x,.12,spawn.z);else if(slot)a.group.position.set(slot.anchor[0],.12,slot.anchor[2]);a.heading=.55;this.animate(body,'Idle');}
 }
 reset(){this.stepDistance=0;this.paths=[];this.pending=null;this.dest.visible=false;this.wasEnded=false;this.playerBody=this.setup?.playerBody??'neighbor';this.room='street';this.resolved=false;this.skullTaken=false;this.fridgeCooled=false;this.moveCallback(false);this.rebuildTargets();this.showRoom();this.placeActors();this.updateProps();this.refreshLabels();}
 visit(id:Target){if(this.paused||!this.active||!this.available(id))return;const t=this.targets[id]!;this.pending=id;this.paths=this.path(this.playerPoint(),t.point);this.dest.position.set(t.point.x,.15,t.point.z);this.dest.visible=true;this.moveCallback(true);}
 private playerPoint():Point{return this.actors[this.playerBody]?.group.position??{x:-1,z:1.2};}
 private path(from:Point,to:Point){return this.interior?roomRoute(from,to):route(from,to);}
 private walkTo(point:Point){this.pending=null;this.paths=this.path(this.playerPoint(),point);const goal=this.paths.at(-1)!;this.dest.position.set(goal.x,.15,goal.z);this.dest.visible=true;this.moveCallback(true);}
 private resize(){
  const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);const aspect=w/h;
  // Fit a closer room view into the space beside the task and exit cards.
  const sidebar=this.interior&&w>1000&&!this.exploration?350:0;
  const scale=this.interior?(sidebar?Math.max(12.3,15.3/((w-sidebar)/h)):(aspect<.8?18:this.exploration?12.3:16)):(aspect<1.15?23:20);
  this.camera.left=-scale*aspect/2;this.camera.right=scale*aspect/2;this.camera.top=scale/2;this.camera.bottom=-scale/2;
  if(sidebar)this.camera.setViewOffset(w,h,-sidebar/2,0,w,h);else this.camera.clearViewOffset();
  this.camera.updateProjectionMatrix();
 }
 private project(element:HTMLElement,p:THREE.Vector3){const v=p.clone().project(this.camera);element.style.transform=`translate(${(v.x+1)/2*this.host.clientWidth}px,${(-v.y+1)/2*this.host.clientHeight}px) translate(-50%,-100%)`;}
 private tick=()=>{
  if(this.disposed)return;this.raf=requestAnimationFrame(this.tick);const dt=Math.min(this.clock.getDelta(),.05);if(!this.paused)this.elapsed+=dt;const player=this.actors[this.playerBody];
  if(player&&!this.paused&&this.active&&this.paths.length){const p=this.paths[0],delta=new THREE.Vector3(p.x-player.group.position.x,0,p.z-player.group.position.z),distance=delta.length();if(distance<.07){this.paths.shift();if(!this.paths.length){this.dest.visible=false;this.moveCallback(false);this.animate(this.playerBody,'Idle');if(this.pending){const target=this.pending;this.pending=null;const t=this.targets[target];if(t?.body){const actor=this.actors[t.body];if(actor){player.heading=Math.atan2(actor.group.position.x-player.group.position.x,actor.group.position.z-player.group.position.z);actor.heading=player.heading+Math.PI;}}this.interact(target);}}}else{const travelled=Math.min(distance,dt*4.2);player.group.position.addScaledVector(delta.normalize(),travelled);this.stepDistance+=travelled;if(this.stepDistance>=1.25){this.stepDistance%=1.25;this.sound(footstepFor(this.house?this.room:'street'));}player.heading=Math.atan2(delta.x,delta.z);this.animate(this.playerBody,'Walk');}}
  const aspect=this.host.clientWidth/this.host.clientHeight;
  if(this.interior){const focus=aspect<.8&&player&&this.active?Math.max(-2,Math.min(2,player.group.position.x))*.65:0;this.cameraFocus+=(focus-this.cameraFocus)*Math.min(1,dt*4);this.camera.position.set(11+this.cameraFocus,14,24);this.camera.lookAt(this.cameraFocus,this.host.clientWidth>1000?2:(aspect<.8?1.8:1),0);}
  else if(aspect<1.15){const focus=player&&this.active?player.group.position.x:0;this.cameraFocus+=(focus-this.cameraFocus)*Math.min(1,dt*4);this.camera.position.set(18+this.cameraFocus,22,28);this.camera.lookAt(this.cameraFocus,this.active?1.3:0,0);}else{this.camera.position.set(18,22,28);this.camera.lookAt(-.5,0,0);}
  this.camera.updateMatrixWorld();
  for(const a of Object.values(this.actors)){a.mixer.update(dt);let diff=a.heading-a.group.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));a.group.rotation.y+=diff*Math.min(1,dt*9);}
  if(this.kitchenProps&&this.kitchenState?.fanOn&&!this.reduceMotion)this.kitchenProps.rotor.rotation.x+=dt*18;
  if(!this.reduceMotion){for(const room of Object.values(this.rooms)){const ghost=room.children.find(o=>o.name.startsWith('Haunt_Ghost'));if(ghost)ghost.position.y=this.resolved?0:Math.sin(this.elapsed*1.7)*.16;const sofa=room.getObjectByName('Haunt_Sofa');if(sofa)sofa.position.y=this.resolved?0:.12+Math.sin(this.elapsed*3)*.08;const fridge=room.getObjectByName('Haunt_Fridge');if(fridge)fridge.rotation.y=this.resolved||this.fridgeCooled?0:Math.sin(this.elapsed*3)*.025;}}
  if(player){this.ring.position.copy(player.group.position);this.ring.position.y=.15;this.project(this.playerLabel,player.group.position.clone().add(new THREE.Vector3(0,2.7,0)));}
  for(const [id,b] of this.labels){const t=this.targets[id];if(t&&!b.hidden)this.project(b,new THREE.Vector3(...t.anchor));}
  this.ink.render(this.scene,this.camera);
 };
 private disposeObject(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();window.removeEventListener('keydown',this.keyHandler);this.renderer.domElement.removeEventListener('pointerup',this.pointerHandler);for(const a of Object.values(this.actors))a.mixer.stopAllAction();this.disposeObject(this.scene);this.toonRamp.dispose();this.renderer.dispose();this.host.replaceChildren();}
}
