/* Touchline 13: deliberate taps, finite unheld brakes, and two real hand slots.
 * Inputs set rod targets only. No shot or grip code rewrites the ball.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.TouchlineV13=api;api.install(root.Foos);const run=()=>api.mount(root);if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',run,{once:true});else run();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const TRANSFER=[.48,.34,.24,.19,.16];
 const SETTINGS=Object.freeze({tap:true,helpers:true});
 const brake=(v,d)=>Math.sign(v)*Math.max(0,Math.abs(v)-d);
 class Tap{
  constructor(x,y,t){this.x=x;this.y=y;this.t=t;this.travel=0;}
  move(x,y){this.travel=Math.max(this.travel,Math.hypot(x-this.x,y-this.y));}
  valid(x,y,t){this.move(x,y);return t>=this.t&&t-this.t<=200&&this.travel<=7;}
 }
 function isBusy(w,r){return !!(r.controlled||r.pinIntent||r.__assist13||w.time<r.driveUntil);}
 function slotAvailable(w,r){return w.rods.filter(q=>q!==r&&q.team===r.team&&isBusy(w,q)).length<2;}
 function clearStroke(r){r.releaseAt=r.driveUntil=r.feedUntil=r.windUntil=-1;r.motorFeed=0;r.strikeTarget=null;r.action=null;}
 function shot(F,w,r,power=.48){
  if(!r||w.paused||w.goalLock>0||w.serveRemaining>0||!slotAvailable(w,r))return false;
  // A supported front pin still needs a manual rollover, not a disguised macro.
  if(r.pinJoint||r.pinIntent)return false;
  const phase=F.wrap(r.theta*r.dir),ballAngle=Math.atan2((w.ball.x-r.x)*r.dir,F.C.rodHeight-w.ball.z);
  const turnBase=r.theta*r.dir-phase,near=Math.abs(w.ball.x-r.x)<.095;
  const wind=clamp(near?ballAngle-.42:-.52,-1.1,.12),target=r.dir*(turnBase+1.24);
  r.spinScale=clamp(power,.06,.7);r.directGrip=false;r.catchHeld=false;r.motorFeed=0;r.feedUntil=-1;
  r.targetTheta=r.dir*(turnBase+wind);r.strikeTarget=target;r.windUntil=w.time+.11;
  r.driveUntil=w.time+.34;r.releaseAt=-1;r.grip=power<.2?'soft pass':'tap shot';
  r.action={kind:power<.2?'Tap pass':'Tap shot',until:w.time+.34};
  r.__assist13={kind:'shot',until:w.time+.34,stage:'stroke'};
  w.stats.tapShots=(w.stats.tapShots||0)+1;return true;
 }
 function sideTouch(F,w,r,sign){
  if(!r||w.paused||w.goalLock>0||w.serveRemaining>0||!slotAvailable(w,r)||r.pinIntent)return false;
  const b=w.ball,n=w.nearestMan(r,b.y);if(Math.abs(b.x-r.x)>.088||b.z>F.C.radius+.012||Math.hypot(b.vx,b.vy)>.8)return false;
  sign=sign<0?-1:1;const y=clamp(b.y-sign*.039-r.bases[n.index],-r.limit,r.limit);
  if(Math.abs(r.bases[n.index]+y-b.y)<.032)return false;
  clearStroke(r);r.__assist13={kind:'side',stage:'lift',at:w.time,until:w.time+.85,y,ballY:b.y,index:n.index,sign,
   angle:Math.atan2(b.x-r.x,F.C.rodHeight-b.z),theta:r.theta+F.wrap(-1.48*(Math.sign(b.x-r.x)||r.dir)-r.theta)};
  r.grip=sign>0?'side touch +':'side touch −';return true;
 }
 function cancelAssist(r){if(r.__assist13){delete r.__assist13;clearStroke(r);return true;}return false;}
 function ready(F,w,r){if(!r||!slotAvailable(w,r))return false;w.setPin(r,false);clearStroke(r);r.targetY=r.y;
  r.targetTheta=r.theta+F.wrap(-.3*r.dir-r.theta);r.directGrip=false;r.catchHeld=false;r.spinScale=.14;
  r.__assist13={kind:'ready',until:w.time+.32};return true;}
 function runAssist(F,w,r){
  const p=r.__assist13;if(!p)return;
  if(w.time>=p.until||w.goalLock>0){delete r.__assist13;return;}
  r.directGrip=false;r.catchHeld=false;r.driveUntil=Math.max(r.driveUntil,p.until);
  if(p.kind==='shot'){
   if(p.stage==='stroke'&&w.time>p.until-.10){p.stage='ready';r.strikeTarget=null;r.driveUntil=-1;r.spinScale=.16;r.targetTheta=r.theta+F.wrap(-.3*r.dir-r.theta);p.until=w.time+.20;}
   return;
  }
  if(p.kind!=='side')return;
  const age=w.time-p.at;r.spinScale=.20;r.slideScale=.28;
  if(p.stage==='lift'){
   r.targetTheta=p.theta;
   if(Math.abs(F.wrap(r.theta-p.theta))<.10){r.targetY=p.y;if(Math.abs(r.y-p.y)<.004){p.stage='lower';p.at=w.time;}}
  }else if(p.stage==='lower'){
   r.targetTheta=r.theta+F.wrap(p.angle-r.theta);r.spinScale=.07;
   if(Math.abs(F.wrap(r.theta-p.angle))<.035){p.stage='sweep';p.at=w.time;r.action={kind:'Side touch',until:p.until};}
  }else{
   r.targetTheta=r.theta+F.wrap(p.angle-r.theta);r.slideScale=.20;
   r.targetY=clamp(p.ballY+p.sign*.018-r.bases[p.index],-r.limit,r.limit);
   if(age>.16){r.targetY=r.y;r.__assist13={kind:'hold',until:w.time+.26};r.targetTheta=r.theta+F.wrap(p.angle-r.theta);}
  }
 }
 function handChoice(F,brain,w){
  const own=w.rods.filter(r=>r.team===brain.team&&!r.controlled&&r.motor);if(!own.length)return [];
  const b=brain.perceived(w,F.LEVELS[brain.level]);
  const planRod=own.find(r=>brain.plans?.has(r.id));
  const emergency=own.find(r=>r.id===(brain.__escape?.rod??brain.__railPlan?.rod));
  const score=r=>{if(!b)return r.role==='DEF'?0:r.role==='GK'?1:2;const t=Math.abs(b.vx)>.1?clamp((r.x-b.x)/b.vx,0,.5):0;return (Math.abs(b.x-r.x)<.066?-1:0)+Math.abs(b.x+b.vx*t-r.x)+.17*t;};
  const primary=emergency||planRod||[...own].sort((a,b)=>score(a)-score(b))[0];
  const plan=brain.plans?.get(primary.id),receiver=own.find(r=>r.id===plan?.receiver&&r!==primary);
  const threat=b&&b.vx*primary.dir<-.2;
  const secondary=receiver||(threat?own.find(r=>r.role==='GK'&&r!==primary):null)||own.filter(r=>r!==primary).sort((a,b)=>score(a)-score(b))[0];
  return [primary?.id,secondary?.id].filter(id=>id!==undefined);
 }
 function schedule(F,brain,w){
  brain.memory=brain.memory||{};const wanted=handChoice(F,brain,w),old=brain.hands13||[],transfer=TRANSFER[brain.level]??.34;
  const next=old.filter(h=>wanted.includes(h.rod));
  for(const id of wanted)if(!next.some(h=>h.rod===id)){
   next.push({rod:id,ready:w.time+transfer});brain.memory.handTransfers13=(brain.memory.handTransfers13||0)+1;
  }
  brain.hands13=next.slice(0,2);
  for(const r of w.rods)if(r.team===brain.team){r.__botManaged13=true;const h=next.find(h=>h.rod===r.id);r.__botHeld13=!!h&&w.time>=h.ready;if(r.__botHeld13&&r.__pendingPin13){w.setPin(r,true);delete r.__pendingPin13;}if(!h)delete r.__pendingPin13;}
 }
 function install(F){
  if(!F?.World||F.World.prototype.__hands13)return false;
  const W=F.World.prototype,B=F.Brain.prototype,C=F.C;
  const oldMove=W.moveRods,oldReset=W.reset,oldAdvance=B.advance,oldUpdate=B.update,oldBegin=B.beginRally;
  W.reset=function(...args){const out=oldReset.apply(this,args);for(const r of this.rods){delete r.__assist13;delete r.__botManaged13;delete r.__botHeld13;delete r.__cmd13;delete r.__pendingPin13;r.__gripped13=false;}return out;};
  B.beginRally=function(w){this.hands13=[];return oldBegin.call(this,w);};
  B.advance=function(w,r,...args){if(!this.hands13||r.__botHeld13)return oldAdvance.call(this,w,r,...args);};
  function restrictHands(brain,w,dt){
   const self=brain;


   for(const r of w.rods)if(r.team===self.team&&!r.controlled&&!r.__botHeld13){
    r.targetY=r.y;r.targetTheta=r.theta;clearStroke(r);r.catchHeld=false;r.directGrip=false;
    if(r.pinIntent||r.pinJoint){r.__pendingPin13=true;w.setPin(r,false);}
    r.targetTheta=r.theta;
    const p=self.plans?.get(r.id);if(p){for(const k of ['at','until','scanAt'])if(Number.isFinite(p[k]))p[k]+=dt;}
    if(self.__escape?.rod===r.id){self.__escape.at+=dt;self.__escape.start+=dt;}
   }
  }
  B.update=function(w,dt){schedule(F,this,w);oldUpdate.call(this,w,dt);restrictHands(this,w,dt);};
  const T=F.TechniqueBrain.prototype,baseUpdate=T.update,baseAdvance=T.advance;
  T.advance=function(w,r,...args){if(!this.hands13||r.__botHeld13)return baseAdvance.call(this,w,r,...args);};
  T.update=function(w,dt){schedule(F,this,w);baseUpdate.call(this,w,dt);restrictHands(this,w,dt);};
  W.moveRods=function(dt){
   for(const r of this.rods){
    runAssist(F,this,r);const cmd=r.__cmd13;
    if(!isBusy(this,r)&&r.grip==='ready'&&Math.abs(r.targetTheta-r.theta)>.03&&(!cmd||Math.abs(r.targetTheta-cmd.theta)>.001)&&!r.__botManaged13&&slotAvailable(this,r))r.__assist13={kind:'ready',until:this.time+.30};
   }
   // Two occupied hands per side. Physical touches outrank queued helper strokes.
   for(const team of [0,1]){
    const ours=this.rods.filter(r=>r.team===team);
    const wanted=ours.filter(r=>r.controlled||r.__botHeld13||(!r.__botManaged13&&(r.pinIntent||r.__assist13||this.time<r.driveUntil)))
     .sort((a,b)=>Number(b.controlled)-Number(a.controlled));
    const allowed=new Set(wanted.slice(0,2).map(r=>r.id));
    for(const r of ours){r.__gripped13=allowed.has(r.id);if(!allowed.has(r.id)&&r.pinJoint){this.setPin(r,false);r.targetTheta=r.theta;}}
   }
   const passive=[];
   for(const r of this.rods){
    if(!r.motor)continue;
    if(r.__gripped13&&r.controlled&&!r.pinIntent)r.catchHeld=false;
    if(!r.__gripped13){r.motor=false;passive.push(r);}
   }
   oldMove.call(this,dt);
   for(const r of passive){
    r.motor=true;
    // Counterbalanced, not an angle spring. Dry bearing friction holds quiet
    // positions, while sufficiently energetic contact can lift the foot.
    r.omega=brake(r.omega,(.055+.003*Math.abs(r.omega))/r.inertia*dt);
    r.theta+=r.omega*dt;
    if(!this.__railYields?.has(r.id)){
     r.vy=brake(r.vy,(1.5+3*Math.abs(r.vy))/r.mass*dt);r.y=clamp(r.y+r.vy*dt,-r.limit,r.limit);
    }
    if(Math.abs(r.y)>=r.limit)r.vy=0;
    r.targetTheta=r.theta;r.targetY=r.y;
   }
   for(const r of this.rods)r.__cmd13={theta:r.targetTheta,y:r.targetY};
  };
  W.__hands13=true;return true;
 }
 function mount(root){
  const g=root.touchline,F=root.Foos,d=root.document;if(!g?.inputBridge||g.controls13)return false;
  const w=g.world,$=id=>d.getElementById(id),bridge=g.inputBridge;let prefs={...SETTINGS};
  try{const p=JSON.parse(root.localStorage.getItem('pocketfoosball.play.v13')||'{}');prefs={tap:p.tap!==false,helpers:p.helpers!==false};}catch{}
  const css=d.createElement('style');css.textContent=`
   .assist13[hidden]{display:none!important}.assist13{position:absolute;z-index:14;display:flex;gap:5px;bottom:82px;left:50%;transform:translateX(-50%);pointer-events:none;align-items:center}
   .assist13 button{pointer-events:auto;touch-action:none;min-height:44px;min-width:44px;padding:5px 10px;border:1px solid #c8edd154;border-radius:12px;color:#effff0;background:rgba(17,46,32,var(--overlay-fill,.08));text-shadow:0 1px 3px #06160f;font:600 10px var(--font)}
   .assist13 .assist-label{position:absolute;top:-15px;left:0;width:100%;text-align:center;font:600 8px var(--font);letter-spacing:1px;color:#dbefddbb;pointer-events:none}
   .assist13 button:active{background:#65ae7666}body.menu-open .assist13,body:not(.in-game) .assist13{display:none!important}
   .assist13.red{bottom:auto;top:82px;transform:translateX(-50%) rotate(180deg)}
   #tapNotice13{position:absolute;z-index:18;top:65px;left:50%;transform:translateX(-50%);font:600 10px var(--font);padding:7px 12px;background:#10291ac9;color:#e2f5de;border-radius:12px;pointer-events:none;text-align:center}
   #tapControls13{margin:12px 0;padding:12px;border:1px solid #b6deb837;border-radius:12px}#tapControls13 p{font-size:11px;line-height:1.6;color:var(--muted)}
   .dock-pad[data-held13="yes"]{outline:1px solid #d8f6b280;outline-offset:-3px}
  `;d.head.appendChild(css);
  const card=d.createElement('div');card.id='tapControls13';card.innerHTML=`<h3>Tap, pass, hold</h3><label class="toggle-row"><span>Tap to shoot<small>Tap a grip or its lane for a normal shot. Drag for manual control; hold for a firm block.</small></span><input id="tapShoot13" type="checkbox"><span class="toggle-ui"></span></label><label class="toggle-row"><span>Combination buttons<small>Side touches, soft pass and Ready for your selected row.</small></span><input id="combo13" type="checkbox"><span class="toggle-ui"></span></label><p>With tap shooting on, use Ready to reset the angle. Turn it off to keep double-tap reset. A supported pin still uses your forward flick for a rollover. Two occupied handles per player.</p>`;
  $('touchLayoutCard').appendChild(card);
  const notice=d.createElement('div');notice.id='tapNotice13';notice.hidden=true;$('arena').appendChild(notice);let until=0;
  function say(text){notice.textContent=text;notice.hidden=false;until=performance.now()+1100;}
  const bars=[];
  for(const team of [0,1]){const bar=d.createElement('div');bar.className='assist13'+(team?' red':'');bar.innerHTML=`<span class="assist-label"></span><button type="button" data-assist="left" aria-label="Side touch left">◀ TIC</button><button type="button" data-assist="pass">SOFT PASS</button><button type="button" data-assist="right" aria-label="Side touch right">TIC ▶</button><button type="button" data-assist="ready">READY</button>`;
   $('arena').appendChild(bar);bars.push(bar);
   for(const button of bar.querySelectorAll('button')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();g.makeSound('touch',.035);});
    button.addEventListener('click',e=>{e.stopPropagation();command(g.selected[team],button.dataset.assist);});
   }
  }
  function command(id,kind){
   if(g.state!=='playing'||d.body.classList.contains('menu-open'))return false;
   const r=w.rods[id];if(!r||(r.team===1&&g.mode!=='local'))return false;
   const success=kind==='ready'?ready(F,w,r):kind==='left'||kind==='right'?sideTouch(F,w,r,(kind==='left'?-1:1)*(r.team===1&&g.mode==='local'?-1:1)):shot(F,w,r,kind==='pass'?.12:.48);
   if(!success)say(r.pinIntent?'PIN held · forward flick for rollover':!slotAvailable(w,r)?'Two hands occupied · release a handle':'Bring this figure beside the ball');
   return success;
  }
  const records=new Map();
  root.addEventListener('pointerdown',e=>{const p=bridge.points.get(e.pointerId);if(!p)return;records.set(e.pointerId,{id:p.id,tap:new Tap(e.clientX,e.clientY,e.timeStamp)});if(w.rods[p.id].__assist13){delete w.rods[p.id].__assist13;clearStroke(w.rods[p.id]);}});
  root.addEventListener('pointermove',e=>{records.get(e.pointerId)?.tap.move(e.clientX,e.clientY);},{capture:true,passive:true});
  root.addEventListener('pointerup',e=>{
   const p=records.get(e.pointerId);records.delete(e.pointerId);if(!p||!prefs.tap)return;
   const live=bridge.points.get(e.pointerId);const tap=p.tap.valid(e.clientX,e.clientY,e.timeStamp)&&(!live||(live.maxX<=7&&live.slideTravel<=7)),id=p.id;
   // Microtask runs after the common pointer-up releases capture, with no
   // double-click timer delaying a first shot.
   if(tap)root.queueMicrotask(()=>{if(command(id,'shot'))say('TAP SHOT · '+w.rods[id].role);});
  },{capture:true});
  root.addEventListener('pointercancel',e=>records.delete(e.pointerId),{capture:true});
  root.addEventListener('blur',()=>records.clear());
  function set(value,save=true){prefs={...prefs,...value};$('tapShoot13').checked=prefs.tap;$('combo13').checked=prefs.helpers;
   // The legacy double-tap listener reads this flag; see the guarded upgrade.
   g.tapShotMode13=prefs.tap;
   if(save)try{root.localStorage.setItem('pocketfoosball.play.v13',JSON.stringify(prefs));}catch{}
  }
  $('tapShoot13').onchange=e=>set({tap:e.target.checked});$('combo13').onchange=e=>set({helpers:e.target.checked});
  const draw=g.renderer.draw;g.renderer.draw=function(...args){draw.apply(this,args);notice.hidden=performance.now()>until||g.state!=='playing';
   for(let team=0;team<2;team++){const bar=bars[team],r=w.rods[g.selected[team]];bar.hidden=!prefs.helpers||g.state!=='playing'||(team===1&&g.mode!=='local');
    bar.querySelector('.assist-label').textContent=(team?'CORAL':'MINT')+' · '+r.role+' · '+(r.__gripped13?'HELD':'UNHELD');
    const dock=$(team?'redDock':'blueDock'),rect=dock.getBoundingClientRect(),a=$('arena').getBoundingClientRect();
    const gap=rect.height>0?(team?rect.bottom-a.top:a.bottom-rect.top):10;
    bar.style[team?'top':'bottom']=(gap+14)+'px';
   }
   for(const pad of d.querySelectorAll('.dock-pad'))pad.dataset.held13=w.rods[Number(pad.dataset.rod)]?.__gripped13?'yes':'no';
  };
  g.controls13={set,get:()=>({...prefs}),command,hands:()=>g.brain.hands13||[]};g.neutralRod=id=>ready(F,w,w.rods[id]);g.version='13.0.0';d.title='Pocket Foosball — Touchline 13';
  for(const e of d.querySelectorAll('.top-title,.menu-edition,.edition,.app-footer'))e.innerHTML=e.innerHTML.replace(/\b12\b/g,'13');
  set(prefs,false);return true;
 }
 return {SETTINGS,TRANSFER,Tap,shot,sideTouch,ready,install,mount,slotAvailable,cancelAssist};
});
