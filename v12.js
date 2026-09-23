/* Touchline 12: invisible touch lanes, deliberate forward flicks and rail recoil.
 * Rod intent only: no gesture assigns ball velocity, position or a shot path.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.TouchlineV12=api;api.installPhysics(root.Foos);const run=()=>api.mount(root);if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',run,{once:true});else run();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const TAU=2*Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const DEFAULTS=Object.freeze({reach:1,size:54,width:100,lift:0,emphasis:1.36,guides:false,flick:true});
 function settings(value={}){return {reach:[0,.5,1].includes(value.reach)?value.reach:1,size:clamp(Number(value.size)||54,44,84),width:clamp(Number(value.width)||100,65,100),lift:clamp(Number(value.lift)||0,0,25),emphasis:clamp(Number(value.emphasis)||1.36,1,1.65),guides:!!value.guides,flick:value.flick!==false};}
 // The last 100 ms must contain a long, consistently forward stroke. Neither
 // twitch velocity nor an old flick followed by a hold can arm a new finish.
 class FlickIntent{
  constructor(turn,slide,time){this.samples=[{turn,slide,time}];this.fired=false;}
  add(turn,slide,time){
   if(!Number.isFinite(time)||!Number.isFinite(turn)||!Number.isFinite(slide)||this.fired)return null;
   const last=this.samples[this.samples.length-1];if(time<=last.time)return null;
   if(time-last.time>120){this.samples=[{turn,slide,time}];return null;}
   this.samples.push({turn,slide,time});while(this.samples.length>2&&this.samples[1].time<time-100)this.samples.shift();
   let first=this.samples[0];const next=this.samples[1];if(first.time<time-100&&next){const t=(time-100-first.time)/(next.time-first.time);first={time:time-100,turn:first.turn+(next.turn-first.turn)*t,slide:first.slide+(next.slide-first.slide)*t};}
   let netTravel=0,previousTurn=first.turn;
   for(const sample of this.samples){if(sample.time<first.time)continue;netTravel+=Math.abs(sample.turn-previousTurn);previousTurn=sample.turn;}
   if(first.turn-turn<netTravel*.85)return null;
   const starts=[first,...this.samples.filter(p=>p.time>first.time&&p.time<time)];
   for(const begin of starts){
    const dt=time-begin.time,forward=begin.turn-turn,side=Math.abs(slide-begin.slide);
    let travel=0,previous=begin.turn;for(const sample of this.samples){if(sample.time<begin.time)continue;travel+=Math.abs(sample.turn-previous);previous=sample.turn;}
    const speed=forward/Math.max(1,dt),consistency=forward/Math.max(1,travel);
    if(dt>=16&&dt<=101&&forward>=64&&speed>=1.4&&forward>side*1.7&&consistency>=.9&&last.turn-turn>0){this.fired=true;return {speed,forward,dt};}
   }
   return null;
  }
 }
 // The kick-through phase is chosen in the FORWARD direction from the actual
 // angle. Front-pinned feet go up/over once; there is no canned reverse windup.
 function finishAngle(theta,dir){const phase=theta*dir;let finish=Math.floor(phase/TAU)*TAU+1.18;if(phase>=Math.floor(phase/TAU)*TAU+.12)finish+=TAU;return dir*finish;}
 function flickStroke(F,w,r,speed=2){
  if(w.serveRemaining>0||w.goalLock>0||w.paused||!r||!Number.isFinite(speed)||speed<1.4)return false;
  const theta=r.theta,target=finishAngle(theta,r.dir);w.setPin(r,false);
  r.pinRequested=false;r.pinStage=null;r.lastPin=-100;r.pinCooldown=w.time+.35;
  r.targetTheta=target;r.directGrip=false;r.catchHeld=false;r.spinScale=clamp(.68+(speed-1.4)*.2,.68,1);
  r.motorFeed=0;r.feedUntil=r.windUntil=r.releaseAt=-1;r.strikeTarget=null;r.drivePower=r.spinScale;
  r.driveUntil=w.time+clamp(Math.abs(target-theta)/65+.2,.26,.43);
  r.action={kind:'Manual flick',until:r.driveUntil};r.grip='forward flick';
  w.stats.manualFlicks=(w.stats.manualFlicks||0)+1;return true;
 }
 function installPhysics(F){
  if(!F?.World||F.World.prototype.__playability12)return;
  const p=F.World.prototype,contact=p.contact,move=p.moveRods,C=F.C;
  p.contact=function(c,r,restitution,friction,iteration,kind){
   const b=this.ball,side=b.y<C.radius+.002?-1:b.y>C.width-C.radius-.002?1:0;
   // Include diagonal edges of the foot, while requiring real contact, inward
   // lateral energy and no supported pin. Merely approaching a wall does nothing.
   if(r&&kind==='foot'&&side&&c.ny*side>.55&&!r.pinJoint&&!r.pinIntent&&r.vy*side>.28&&Math.abs(r.omega)<4&&Math.abs(F.wrap(r.targetTheta-r.theta))<.13&&b.z<C.radius+.004){
    const hit=this.__railImpact;if(!hit||Math.abs(r.vy)>hit.speed)this.__railImpact={rod:r,side,speed:Math.abs(r.vy),at:this.time};
   }
   const result=contact.call(this,c,r,restitution,friction,iteration,kind);
   for(const [id,yielded] of this.__railYields||[]){
    if(!yielded.v12&&!yielded.rotating){const rod=this.rods.find(x=>x.id===id);yielded.v12=true;yielded.originalUntil=yielded.until;yielded.angle=rod?.targetTheta;yielded.until=this.time+.16;if(rod)rod.__railCooldown=this.time+.24;}
   }
   return result;
  };
  p.moveRods=function(dt){
   for(const [id,yielded] of this.__railYields||[]){
    if(!yielded.v12)continue;const r=this.rods.find(x=>x.id===id);if(!r)continue;
    // Fore/aft rotating squeezes are a different move: leave their existing
    // contact and grip response intact instead of turning them into side taps.
    if(Math.abs(r.targetTheta-yielded.angle)>.0001){yielded.v12=false;yielded.rotating=true;yielded.until=yielded.originalUntil;continue;}
    // Do not let the old into-wall target close the gap after passive recoil.
    // This resets grip preload, not ball state; the next finger motion is free.
    if(this.time>=yielded.until&&(r.targetY-r.y)*yielded.side>0)r.targetY=r.y;
   }
   move.call(this,dt);
  };
  p.__playability12=true;
 }
 function laneRects(bounds,pads,reach){
  if(!reach||pads.length!==4)return [];
  const centers=pads.map(p=>p.x+p.width/2),cuts=[bounds.x];
  for(let i=1;i<4;i++)cuts.push((centers[i-1]+centers[i])/2);cuts.push(bounds.x+bounds.width);
  return pads.map((p,i)=>({id:p.id,x:cuts[i],y:bounds.y+bounds.height*(1-reach),width:Math.max(0,cuts[i+1]-cuts[i]),height:bounds.height*reach}));
 }
 function mount(root){
  const g=root.touchline,F=root.Foos,d=root.document,$=id=>d.getElementById(id);if(!g?.inputBridge||g.controls12)return false;
  const bridge=g.inputBridge,w=g.world;let prefs;
  try{prefs=settings(JSON.parse(root.localStorage.getItem('pocketfoosball.touch.v12')||'{}'));}catch{prefs=settings();}
  const style=d.createElement('style');style.id='touchLayout12';style.textContent=`
   body.in-game.overlay-controls #blueDock:not([hidden]),body.in-game.overlay-controls #redDock:not([hidden]){width:var(--touch-width,calc(100% - 16px))!important;max-width:1000px;height:calc(var(--touch-size,54px) + 6px)!important;min-height:0!important;bottom:max(calc(9px + var(--touch-lift,0px)),env(safe-area-inset-bottom,0px));grid-template-columns:minmax(44px,1fr) minmax(44px,1fr) minmax(44px,var(--touch-emphasis,1.36fr)) minmax(44px,var(--touch-emphasis,1.36fr)) 46px!important;align-items:stretch}
   body.in-game.overlay-controls #redDock:not([hidden]){bottom:auto;top:max(calc(9px + var(--touch-lift,0px)),env(safe-area-inset-top,0px))}
   body.in-game.overlay-controls .dock .dock-pad,body.in-game.overlay-controls .dock .dock-pin{height:var(--touch-size,54px)!important;min-height:44px!important;padding:4px!important}
   #touchLayoutCard{padding:16px;border:1px solid #a9c3aa38;border-radius:16px;margin:16px 0;background:#29432c35}#touchLayoutCard h3{margin:0 0 7px;font-size:16px}#touchLayoutCard p{font-size:12px;line-height:1.6;color:var(--muted);margin:0 0 12px}#touchLayoutCard summary{cursor:pointer;font-size:12px;padding:14px 0;min-height:44px;box-sizing:border-box}#touchLayoutCard select{width:100%;min-height:44px;margin:6px 0 12px;border-radius:9px;padding:8px;background:#173127;color:#e8f3e4;border:1px solid #9bb99260}#touchLayoutCard label{font-size:12px}#touchLayoutCard .sensitivity-row{margin:12px 0}#touchLayoutCard .toggle-row{padding:10px 0}#touchLayoutCard .touch-actions{display:flex;gap:8px}#touchLayoutCard .touch-actions button{flex:1;min-height:42px;font-size:12px}
   #touchPreview{height:128px;border:1px solid #9bc29155;background:linear-gradient(90deg,transparent 49.5%,#b7d1b640 49.5%,#b7d1b640 50%,transparent 50%);border-radius:10px;position:relative;margin-bottom:12px;overflow:hidden;pointer-events:none}#touchPreview .preview-zone{position:absolute;background:#a7eac610;border-right:1px dashed #aad6ac60;font:600 8px var(--font);text-align:center;color:#c4e3c1;padding-top:12px;box-sizing:border-box}#touchPreview .preview-grip{position:absolute;border:1px solid #b4d8b366;border-radius:5px;background:#c2f0c912;height:18px;bottom:7px;text-align:center;color:#daefd4;font:600 7px/18px var(--font)}
   #touchLaneGuides{position:absolute;inset:0;pointer-events:none;z-index:9;overflow:hidden}#touchLaneGuides .touch-lane{position:absolute;border:1px dashed #b6efc342;background:#96dba309;pointer-events:none;box-sizing:border-box}#touchLaneGuides .touch-lane span{position:absolute;top:45%;left:0;width:100%;text-align:center;font:600 9px var(--font);letter-spacing:.5px;color:#d7f9dc99;text-shadow:0 1px 3px #0e271b}#touchLaneGuides .touch-lane.active{background:#b6efc31a;border-color:#c2ffd479}body.menu-open #touchLaneGuides{display:none}
   #manualFlickNotice{position:absolute;z-index:13;left:50%;top:20%;transform:translateX(-50%);background:#152d22b3;border:1px solid #c1e4b857;border-radius:15px;color:#e2f5d9;padding:6px 12px;font:600 10px var(--font);pointer-events:none;white-space:nowrap}body.menu-open #manualFlickNotice{display:none}
   @media(max-width:380px){body.in-game.overlay-controls .dock .dock-pad strong{font-size:7px!important}#touchLayoutCard{padding:12px}}
  `;d.head.appendChild(style);
  const card=d.createElement('section');card.id='touchLayoutCard';card.innerHTML=`<h3>Your touch layout</h3><p>Start anywhere in a grip’s invisible lane. Your finger keeps that row until you lift it. Small buttons, full-size table.</p><div id="touchPreview" aria-label="Preview of touch lanes and grip placement"></div><label for="touchReach">Where grips respond</label><select id="touchReach"><option value="1">Full height · invisible lanes</option><option value="0.5">Bottom half · invisible lanes</option><option value="0">Buttons & table handles only</option></select><label class="sensitivity-row" for="touchSize">Button height <output id="touchSizeValue"></output><input id="touchSize" type="range" min="44" max="84" step="2"></label><details class="touch-advanced"><summary>Position & spacing</summary><label class="sensitivity-row" for="touchWidth">Button strip width <output id="touchWidthValue"></output><input id="touchWidth" type="range" min="65" max="100" step="1"></label><label class="sensitivity-row" for="touchLift">Lift buttons <output id="touchLiftValue"></output><input id="touchLift" type="range" min="0" max="25" step="1"></label><label class="sensitivity-row" for="touchEmphasis">Midfield / attack space <output id="touchEmphasisValue"></output><input id="touchEmphasis" type="range" min="1" max="1.65" step=".05"></label></details><label class="toggle-row"><span>Show touch lanes<small>Visual guide only. No extra control panel.</small></span><input type="checkbox" id="touchGuides"><span class="toggle-ui"></span></label><label class="toggle-row"><span>Fast-swipe finish<small>A long, very fast forward flick finishes the stroke. Slow moves stay manual.</small></span><input type="checkbox" id="touchFlick"><span class="toggle-ui"></span></label><p id="touchLayoutSaved" role="status">Saved on this browser. Keyboard bindings stay unchanged.</p><div class="touch-actions"><button id="touchTry" class="secondary-btn" type="button">Try layout</button><button id="touchDefaults" class="secondary-btn" type="button">Reset layout</button></div>`;
  $('panel-controls').querySelector('.panel-subtitle').after(card);
  const link=d.createElement('button');link.id='touchLayoutLink';link.className='secondary-btn';link.textContent='Customize touch layout →';link.onclick=()=>{g.setMenuTab('controls');card.scrollIntoView({block:'start'});};$('overlayOpacityRow').after(link);
  const guides=d.createElement('div');guides.id='touchLaneGuides';guides.setAttribute('aria-hidden','true');$('arena').appendChild(guides);
  const notice=d.createElement('div');notice.id='manualFlickNotice';notice.setAttribute('role','status');notice.hidden=true;$('arena').appendChild(notice);let noticeUntil=0,geometry=[],lastLayout='';
  function supported(){return g.mode==='solo'||g.mode==='practice';} // Online uses the solo view, with its bot disabled.
  function preview(){const box=$('touchPreview'),b={x:0,y:0,width:box.clientWidth||260,height:128},unit=(b.width-12)/5.72,weights=[1,1,prefs.emphasis,prefs.emphasis];let left=(b.width-(b.width-12)*prefs.width/100)/2;const sum=weights.reduce((s,v)=>s+v,0),available=b.width*prefs.width/100-46;const pads=weights.map((v,i)=>{const width=Math.max(25,available*v/sum),p={id:[0,1,3,5][i],x:left,width};left+=width;return p;});box.replaceChildren();for(const z of laneRects(b,pads,prefs.reach)){const e=d.createElement('div');e.className='preview-zone';e.style.cssText=`left:${z.x}px;top:${z.y}px;width:${z.width}px;height:${z.height}px`;e.textContent=['KEEP','DEF','MID','ATT'][[0,1,3,5].indexOf(z.id)];box.appendChild(e);}pads.forEach((p,i)=>{const e=d.createElement('div');e.className='preview-grip';e.style.cssText=`left:${p.x}px;width:${p.width-3}px;bottom:${7+prefs.lift}px;height:${prefs.size/3}px`;e.textContent=['KEEP','DEF','MID','ATT'][i];box.appendChild(e);});}
  function set(value,save=true){
   if(bridge.points.size)bridge.cancel();prefs=settings({...prefs,...value});const css=d.documentElement.style;
   css.setProperty('--touch-size',prefs.size+'px');css.setProperty('--touch-width',`max(300px,calc(${prefs.width}% - 16px))`);css.setProperty('--touch-emphasis',prefs.emphasis+'fr');
   $('touchReach').value=String(prefs.reach);$('touchSize').value=prefs.size;$('touchWidth').value=prefs.width;$('touchLift').value=prefs.lift;$('touchEmphasis').value=prefs.emphasis;
   $('touchSizeValue').textContent=prefs.size+' px';$('touchWidthValue').textContent=prefs.width+'%';$('touchLiftValue').textContent=prefs.lift?'+'+prefs.lift+'%':'Bottom';$('touchEmphasisValue').textContent=prefs.emphasis===1?'Equal':Math.round((prefs.emphasis-1)*100)+'% wider';$('touchGuides').checked=prefs.guides;$('touchFlick').checked=prefs.flick;
   if(save)try{root.localStorage.setItem('pocketfoosball.touch.v12',JSON.stringify(prefs));$('touchLayoutSaved').textContent='Saved on this browser. Keyboard bindings stay unchanged.';}catch{$('touchLayoutSaved').textContent='Storage unavailable: changes last for this tab only.';}
   lastLayout='';preview();layout();return {...prefs};
  }
  for(const [id,key] of [['touchReach','reach'],['touchSize','size'],['touchWidth','width'],['touchLift','lift'],['touchEmphasis','emphasis']])$(id).addEventListener('input',e=>set({[key]:Number(e.target.value)}));
  for(const [id,key] of [['touchGuides','guides'],['touchFlick','flick']])$(id).onchange=e=>set({[key]:e.target.checked});
  $('touchDefaults').onclick=()=>set(DEFAULTS);$('touchTry').onclick=()=>{g.setOverlayButtons(true);g.start();};
  function layout(){
   const arena=$('arena').getBoundingClientRect();d.documentElement.style.setProperty('--touch-lift',Math.min(arena.height*.25,arena.height*prefs.lift/100)+'px');
   const pads=[...$('blueDock').querySelectorAll('.dock-pad')].map(e=>{const r=e.getBoundingClientRect();return {id:Number(e.dataset.rod),x:r.x,y:r.y,width:r.width,height:r.height};});
   const visible=g.immersive&&g.showDocks&&pads[0]?.width>0&&supported();geometry=visible?laneRects(arena,pads,prefs.reach):[];
   guides.hidden=!prefs.guides||!visible||!prefs.reach;
   const key=JSON.stringify([arena.x,arena.y,arena.width,arena.height,pads,prefs.reach,prefs.guides]);
   if(key!==lastLayout){lastLayout=key;guides.replaceChildren();for(const z of geometry){const e=d.createElement('div');e.className='touch-lane';e.dataset.rod=z.id;e.style.cssText=`left:${z.x-arena.x}px;top:${z.y-arena.y}px;width:${z.width}px;height:${z.height}px`;e.innerHTML='<span>'+({0:'KEEPER',1:'DEFENSE',3:'MIDFIELD',5:'ATTACK'}[z.id])+'</span>';guides.appendChild(e);}}
   for(const e of guides.children)e.classList.toggle('active',w.rods[Number(e.dataset.rod)].controlled);
  }
  const hit=g.renderer.hit;
  g.renderer.hit=function(x,y){
   if(geometry.length&&g.state==='playing'){
    // Keep the actual small on-table handles usable. Figure sprites do NOT
    // steal presses from a lane running through the playing surface.
    for(const h of this.handles){const r=w.rods[h.id];if(r.team===0&&((x-h.x)/h.rx)**2+((y-h.y)/h.ry)**2<1.7)return h.id;}
    const a=$('arena').getBoundingClientRect(),sx=a.left+1+(this.portrait?y:x),sy=a.top+1+(this.portrait?this.w-x:y);
    const zone=geometry.find(z=>sx>=z.x&&sx<z.x+z.width&&sy>=z.y&&sy<z.y+z.height);if(zone)return zone.id;
   }
   return hit.call(this,x,y);
  };
  function newRecord(p){return {intent:new FlickIntent(p.startTurn,p.lastSlide,p.lastInputTime),fired:false,at:-Infinity,turn:p.lastTurn,reverse:0};}
  function move(e){
   const p=bridge.points.get(e.pointerId);if(!p)return false;
   const r=w.rods[p.id],a=bridge.axes(e.clientX,e.clientY,r.team),deltaSlide=a.slide-p.lastSlide,deltaTurn=a.turn-p.lastTurn;
   const record=p.v12||(p.v12=newRecord(p));const elapsed=Math.max(1,e.timeStamp-p.lastT),turn=a.turn-p.startTurn;
   p.velocityX=deltaTurn/elapsed;p.slideTravel+=Math.abs(deltaSlide);p.intent.add(a.turn,e.timeStamp);p.lastInputTime=e.timeStamp;p.lastT=e.timeStamp;p.lastSlide=a.slide;p.lastTurn=a.turn;p.x=e.clientX;p.y=e.clientY;p.maxX=Math.max(p.maxX,Math.abs(turn));
   if(Math.abs(deltaTurn)>.35)p.lastMotion=w.time;
   r.targetY=clamp(r.targetY+deltaSlide/Math.max(300,g.renderer.s)*g.inputPrefs.slide,-r.limit,r.limit);r.slideScale=r.pinJoint?.5:1;
   const candidate=record.intent.add(a.turn,a.slide,e.timeStamp);
   if(candidate&&prefs.flick&&flickStroke(F,w,r,candidate.speed)){
    record.fired=true;record.at=e.timeStamp;record.turn=a.turn;record.reverse=0;p.snake=true;p.manual=true;p.fired=true;p.pinWasHeld=false;
    notice.textContent='FORWARD FLICK · '+({GK:'KEEPER',DEF:'DEFENSE',MID:'MIDFIELD',ATT:'ATTACK'}[r.role]);notice.hidden=false;noticeUntil=performance.now()+650;
   }else if(record.fired){
    record.reverse+=deltaTurn;if(record.reverse>12){record.fired=false;p.snake=false;p.intent.lastWhip=-Infinity;r.driveUntil=r.releaseAt=-1;r.targetTheta=r.theta;r.omega=0;r.action=null;p.theta=r.theta;p.startTurn=a.turn;}
   }else if(r.pinJoint||r.pinIntent){
    if(Math.abs(turn)>14){
     const theta=r.theta;w.setPin(r,false);r.pinRequested=false;r.pinStage=null;r.lastPin=-100;r.targetTheta=theta;r.directGrip=true;r.catchHeld=false;r.spinScale=1;r.releaseAt=-1;
     p.theta=theta;p.startTurn=a.turn;p.pinWasHeld=false;p.manual=true;
    }
   }else if(Math.abs(turn)>2){
    const amount=turn-2*Math.sign(turn);r.targetTheta=p.theta+clamp(-amount*r.dir*.02*g.inputPrefs.turn,-5.9,5.9);r.directGrip=true;r.spinScale=1;r.catchHeld=false;p.manual=true;
   }
   return true;
  }
  // A capture listener replaces only movement of an ALREADY acquired handle.
  // The original acquisition/capture, team permissions, double-tap, keyboard
  // priority and release cleanup remain the common implementation in all modes.
  root.addEventListener('pointerdown',e=>{const p=bridge.points.get(e.pointerId);if(p){p.v12=newRecord(p);p.holdArmed=true;}});
  root.addEventListener('pointermove',e=>{
   if(!bridge.points.has(e.pointerId))return;
   const samples=e.getCoalescedEvents?.()||[];
   for(const sample of samples)if(sample.timeStamp>bridge.points.get(e.pointerId).lastInputTime)move(sample);
   const p=bridge.points.get(e.pointerId);if(p&&(e.timeStamp>p.lastInputTime||e.clientX!==p.x||e.clientY!==p.y))move(e);
   e.preventDefault();e.stopImmediatePropagation();
  },{capture:true,passive:false});
  root.addEventListener('pointerup',e=>{
   const p=bridge.points.get(e.pointerId);if(!p)return;
   if(e.clientX!==p.x||e.clientY!==p.y)move(e);
   // Holding after a whip deliberately keeps its final angle; autoready applies
   // only to an immediate release, not because a 'snake' flag was once set.
   if(p.v12?.fired)p.snake=e.timeStamp-p.v12.at<=150;
  },{capture:true});
  const draw=g.renderer.draw;g.renderer.draw=function(...args){
   draw.apply(this,args);layout();const now=performance.now();notice.hidden=now>noticeUntil;

  };
  root.addEventListener('resize',()=>{preview();layout();});
  g.controls12={set,get:()=>({...prefs}),lanes:()=>geometry.map(z=>({...z})),flick: (id,speed)=>flickStroke(F,w,w.rods[id],speed),layout};
  g.version='12.0.0';d.title='Pocket Foosball — Touchline 12';for(const e of d.querySelectorAll('.top-title,.menu-edition,.edition,.app-footer'))e.innerHTML=e.innerHTML.replace(/\b(?:08|09|10|11)\b/g,'12');
  set(prefs,false);return true;
 }
 return {DEFAULTS,settings,FlickIntent,finishAngle,flickStroke,installPhysics,laneRects,mount};
});
