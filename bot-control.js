/* Deliberate back-rail recovery: a legal keeper stroke, not a ball reset.
 * Prevents a goal-only aiming gate from repeatedly clamping a ball behind the
 * goalkeeper. Normal pin play and all user-controlled rods are left alone.
 */
(function(root,factory){const install=factory();if(typeof module==='object'&&module.exports)module.exports=install;else install(root.Foos);})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  return function install(F){
    if(!F?.Brain||F.Brain.prototype.__railRecovery)return false;
    const p=F.Brain.prototype,update=p.update,rally=p.beginRally;
    p.beginRally=function(w){this.__railPlan=null;this.__railWatch=null;return rally.call(this,w);};
    p.update=function(w,dt){
      if(this.forceTechnique)return update.call(this,w,dt);
      if(w.goalLock>0||w.serveRemaining>0){this.__railPlan=null;this.__railWatch=null;return update.call(this,w,dt);}
      let plan=this.__railPlan;
      if(plan){
        this.observed(w);const r=w.rods.find(r=>r.id===plan.rod);
        if(!r||r.controlled){this.__railPlan=null;return;}
        for(const other of w.rods)if(other.team===this.team&&other!==r&&!other.controlled){other.targetY=other.y;other.targetTheta=other.theta;}
        r.pinIntent=false;r.pinRequested=false;r.catchHeld=false;r.directGrip=false;r.slideScale=.18;
        this.intent='Free the back rail · '+(plan.stage==='lift'?'lift and align':'controlled outlet');
        const elapsed=w.time-plan.at;
        if(plan.stage==='lift'){
          r.targetY=this.aimY(r,plan.y-plan.slideSign*.04);r.targetTheta=plan.theta;r.spinScale=.12;
          if(elapsed>.16&&Math.abs(r.theta-plan.theta)<.04&&Math.abs(r.y-r.targetY)<.004){
            plan.stage='lower';plan.at=w.time;plan.theta=r.theta+F.wrap(plan.side*.75-r.theta);
            r.targetTheta=plan.theta;r.spinScale=.12;r.action={kind:'Back-wall release',until:w.time+1};
          } else if(elapsed>1.2){this.__railPlan=null;this.__railCooldown=w.time+.6;}
        }else if(plan.stage==='lower'){
          r.targetTheta=plan.theta;r.spinScale=.12;
          if(Math.abs(r.theta-plan.theta)<.03||elapsed>.7){plan.stage='stroke';plan.at=w.time;plan.from=r.y;}
        }else{
          r.targetTheta=plan.theta;r.spinScale=.12;r.slideScale=.28;
          r.targetY=F.clamp(plan.from+plan.slideSign*.085,-r.limit,r.limit);
          const escaped=(w.ball.x-plan.x)*r.dir>.035;
          if(escaped||elapsed>.7){
            if(escaped)this.memory.successfulWallReleases=(this.memory.successfulWallReleases||0)+1;
            this.__railPlan=null;this.__railWatch=null;this.__railCooldown=w.time+.45;
            r.targetTheta=r.theta+F.wrap(-r.dir*.3-r.theta);r.spinScale=.12;r.action=null;
            this.cooldowns.set(r.id,w.time+.12);
          }
        }
        return;
      }
      update.call(this,w,dt);
      if(w.time<(this.__railCooldown||0))return;
      let seen=null;for(let i=this.history.length-1;i>=0;i--)if(this.history[i].t<=w.time-F.LEVELS[this.level].delay){seen=this.history[i];break;}
      if(!seen)return;
      const r=w.rods.find(r=>r.team===this.team&&r.role==='GK'&&!r.controlled);
      const outsideMouth=Math.abs(seen.y-F.C.width/2)>F.C.goalWidth/2-F.C.radius;
      const atRail=outsideMouth&&(seen.x<F.C.radius+.004||seen.x>F.C.length-F.C.radius-.004);
      if(!r||r.pinJoint||!atRail||(seen.x-r.x)*r.dir>-.028||Math.abs(seen.x-r.x)>.075||seen.z>F.C.radius+.004){this.__railWatch=null;return;}
      const watch=this.__railWatch;
      if(!watch||Math.hypot(seen.x-watch.x,seen.y-watch.y)>.006){this.__railWatch={x:seen.x,y:seen.y,t:seen.t};return;}
      if(seen.t-watch.t<.8||!this.plans.has(r.id))return;
      const old=this.plans.get(r.id);if(old)this.finish(w,r,old);
      w.setPin(r,false);r.releaseAt=-1;r.motorFeed=0;r.strikeTarget=null;
      const side=Math.sign(seen.x-r.x)||-r.dir;
      this.__railPlan={rod:r.id,stage:'lift',at:w.time,side,slideSign:seen.y>F.C.width/2?-1:1,x:seen.x,y:seen.y,theta:r.theta+F.wrap(side*1.45-r.theta)};
      this.memory.wallReleases=(this.memory.wallReleases||0)+1;this.__railWatch=null;
    };
    p.__railRecovery=true;return true;
  };
});

/* Touchline 10: deliberate input, humane lower tiers and bounded recovery.
 * Ball state is never rewritten by the bot. Last-resort bot timeouts are
 * explicitly announced rally restarts, separate from geometric dead balls.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){const previous=module.exports;module.exports=function(F){previous(F);return api.install(F);};module.exports.playability=api;}
  else {root.TouchlinePlayability=api;api.install(root.Foos);const mount=()=>api.mount(root);if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SETTINGS=Object.freeze([
    {delay:.50,think:.18,speed:.32,kick:.36,aimError:.006,settle:.28,candidates:7,defend:.32,transfer:.48,predict:.025},
    {delay:.38,think:.13,speed:.44,kick:.51,aimError:.004,settle:.22,candidates:9,defend:.56,transfer:.32,predict:.070},
    {defend:.95,transfer:.20,predict:.14},
    {defend:1.55,transfer:.13,predict:.22},
    {defend:2.15,transfer:.10,predict:.30}
  ].map(Object.freeze));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  class DoubleTap {
    constructor(){this.active=new Map();this.last=null;}
    down(id,rod,x,y,time,type='touch'){
      if(this.active.size){for(const p of this.active.values())p.multi=true;this.last=null;}
      this.active.set(id,{rod,x,y,time,type,move:0,multi:this.active.size>0});
    }
    move(id,x,y){const p=this.active.get(id);if(p)p.move=Math.max(p.move,Math.hypot(x-p.x,y-p.y));}
    up(id,x,y,time,cancel=false){
      const p=this.active.get(id);this.move(id,x,y);this.active.delete(id);
      if(!p||cancel||p.multi||p.move>9||time-p.time>240||time<p.time){this.last=null;return null;}
      const a=this.last;
      const twice=a&&a.rod===p.rod&&a.type===p.type&&time-a.time<=330&&time-a.time>=0&&Math.hypot(x-a.x,y-a.y)<=38;
      this.last=twice?null:{rod:p.rod,type:p.type,x,y,time};return twice?p.rod:null;
    }
    clear(){this.active.clear();this.last=null;}
  }
  function neutral(F,w,r){
    if(!r)return false;
    w.setPin(r,false);r.pinRequested=false;r.pinStage=null;r.lastPin=-100;
    r.targetTheta=r.theta+F.wrap(-.3*r.dir-r.theta);
    r.targetY=r.y;r.directGrip=false;r.catchHeld=false;r.spinScale=.16;
    r.releaseAt=r.driveUntil=r.windUntil=r.feedUntil=-1;
    r.strikeTarget=null;r.motorFeed=0;r.action=null;r.grip='ready';
    return true;
  }
  function install(F){
    if(!F?.World||F.World.prototype.__playability10)return false;
    const {C,World,Brain,LEVELS}=F,W=World.prototype,B=Brain.prototype;
    for(let i=0;i<2;i++)for(const k of ['delay','think','speed','kick','aimError','settle','candidates'])LEVELS[i][k]=SETTINGS[i][k];
    const step=W.step,reset=W.reset,dead=W.isDeadBall,latch=W.latchPin,prepare=W.preparePin;
    W.reset=function(...args){this.__quiet=null;this.botStall=null;return reset.apply(this,args);};
    W.step=function(dt=C.fixedDt){
      const oldTime=this.time;step.call(this,dt);if(this.time===oldTime)return;
      const b=this.ball;
      if(this.goalLock>0||this.serveRemaining>0||this.rods.some(r=>r.pinJoint)||b.z>C.radius+.002||Math.hypot(b.vx,b.vy,b.vz)>.03){this.__quiet=null;return;}
      const q=this.__quiet;
      if(!q||Math.hypot(b.x-q.x,b.y-q.y)>.0015)this.__quiet={x:b.x,y:b.y,since:this.time};
    };
    W.isDeadBall=function(){
      if(dead.call(this))return true;
      const b=this.ball,q=this.__quiet;
      return !!q&&this.time-q.since>1.2&&this.serveRemaining<=0&&this.goalLock<=0&&
        !this.rods.some(r=>r.pinJoint)&&b.z<C.radius+.002&&Math.hypot(b.vx,b.vy,b.vz)<.03&&this.legalRods().length===0;
    };
    // A gentle backward touch is not an implicit request for a supported pin.
    // PIN / its keybinding is explicit; normal frictional catches still work.
    W.latchPin=function(r,c){if(r.pinIntent)return latch.call(this,r,c);};
    W.preparePin=function(r){
      if(r.pinIntent&&!r.pinJoint&&this.time>=r.driveUntil&&this.time>=r.pinCooldown&&Math.abs(r.omega)<1.9){
        const side=Math.sign(this.ball.x-r.x)||r.dir,target=this.pinTarget(r,side);
        // Already over the ball: lower the last few degrees, not a full lap.
        if(target!==null&&Math.abs(F.wrap(target-r.theta))<.12&&Math.hypot(this.ball.vx,this.ball.vy)<C.pinCaptureSpeed){
          r.pinSide=side;r.pinStage='lower';r.pinLiftTarget=null;r.pinSince=this.time;
        }
      }
      return prepare.call(this,r);
    };
    const perceived=B.perceived,pick=B.pick,update=B.update,begin=B.beginRally,stable=B.stableTarget;
    B.beginRally=function(w){this.__hands=null;this.__escape=null;this.__stuck=null;this.__defenseClock=0;this.__defenseBias={};w.botStall=null;return begin.call(this,w);};
    B.perceived=function(w,level){
      if(this.level>=2||this.forceTechnique||w.rods.some(r=>r.team===this.team&&r.pinJoint))return perceived.call(this,w,level);
      const recent=[...w.touchLog].reverse().find(t=>w.rods.find(r=>r.id===t.rod)?.team===this.team);
      if(recent&&w.time-recent.t<.5)return perceived.call(this,w,level);
      let seen=null;for(let i=this.history.length-1;i>=0;i--)if(this.history[i].t<=w.time-level.delay){seen=this.history[i];break;}
      if(!seen)return null;
      const p=SETTINGS[this.level].predict;
      return {...seen,x:seen.x+seen.vx*p,y:F.reflectY(seen.y+seen.vy*p),visionTime:seen.t,age:w.time-seen.t};
    };
    B.pick=function(w,r,b){
      if(this.level>=2||this.forceTechnique)return pick.call(this,w,r,b);
      if(this.level===0)return 'Straight drive';
      // Medium has basic passing, never a selected spray/brush/snake/tic-tac.
      return r.role==='MID'&&(b.x-r.x)*r.dir>0&&Math.hypot(b.vx,b.vy)<.4&&this.rng.next()<(.16+.52*this.profile.passing)?'Stick pass':'Straight drive';
    };
    B.stableTarget=function(r,y){
      if(this.level>=2||this.forceTechnique)return stable.call(this,r,y);
      const at=this.__now||0,old=this.__defenseBias?.[r.id];
      this.__defenseBias=this.__defenseBias||{};
      let slot=old;if(!slot||at-slot.t>.42)slot=this.__defenseBias[r.id]={t:at,bias:this.rng.signed()*(this.level===0?.018:.010)};
      const requested=clamp(y+slot.bias,-r.limit,r.limit);
      if(!old||at>=(r.__defendNext||0)){
        r.__defendNext=at+LEVELS[this.level].think;
        if(Math.abs(requested-r.targetY)>.005)r.targetY=requested;
      }
    };
    function clearPlan(brain,w,r){
      if(brain.plans.has(r.id))brain.finish(w,r,brain.plans.get(r.id));
      w.setPin(r,false);r.pinRequested=false;r.catchHeld=false;r.directGrip=false;
      r.releaseAt=r.driveUntil=r.feedUntil=r.windUntil=-1;r.motorFeed=0;r.strikeTarget=null;r.action=null;
    }
    function armEscape(brain,w,r,watch){
      clearPlan(brain,w,r);brain.__railPlan=null;brain.__railWatch=null;
      const b=w.ball,idx=w.nearestMan(r,b.y).index;
      let sign=b.y<C.width/2?1:-1;
      if(watch.attempts%2&&b.y>.075&&b.y<C.width-.075)sign=-sign;
      const y=brain.aimY(r,b.y-sign*.043,idx);
      if(Math.abs(r.bases[idx]+y-b.y)<.032)sign=-sign;
      const angle=Math.atan2(b.x-r.x,C.rodHeight-b.z);
      brain.__escape={rod:r.id,index:idx,side:sign,x:b.x,y:b.y,angle,at:w.time,stage:'lift',start:w.time};
      watch.attempts++;brain.memory.unstickAttempts=(brain.memory.unstickAttempts||0)+1;
    }
    function escapeStep(brain,w,dt){
      const p=brain.__escape;if(!p)return false;
      const r=w.rods.find(r=>r.id===p.rod);if(!r||r.controlled){brain.__escape=null;return false;}
      // Keep visual history current while making deliberate motor-only contacts.
      brain.observed(w);const b=w.ball,age=w.time-p.at;
      if(Math.hypot(b.x-p.x,b.y-p.y)>.035||w.time-p.start>2.2){
        const freed=Math.hypot(b.x-p.x,b.y-p.y)>.035;
        if(freed)brain.memory.unstickSuccesses=(brain.memory.unstickSuccesses||0)+1;
        neutral(F,w,r);brain.__escape=null;brain.__escapeAfter=w.time+.25;return false;
      }
      r.pinIntent=false;r.pinRequested=false;r.catchHeld=false;r.directGrip=false;
      r.slideScale=.16;r.spinScale=.12;
      brain.intent='Free the ball · '+({lift:'lift & move beside it',lower:'lower behind the ball',sweep:'squeeze and clear'}[p.stage]);
      if(p.stage==='lift'){
        r.targetTheta=r.theta+F.wrap(r.dir*1.5-r.theta);
        r.targetY=brain.aimY(r,p.y-p.side*.043,p.index);
        if(age>.17&&Math.abs(F.wrap(r.theta-r.dir*1.5))<.06&&Math.abs(r.y-r.targetY)<.005){p.stage='lower';p.at=w.time;}
      }else if(p.stage==='lower'){
        r.targetTheta=r.theta+F.wrap(p.angle-r.dir*.24-r.theta);
        if(age>.12&&Math.abs(F.wrap(r.theta-(p.angle-r.dir*.24)))<.07){p.stage='sweep';p.at=w.time;}
      }else{
        r.slideScale=.22;
        r.targetY=brain.aimY(r,p.y+p.side*.027,p.index);
        r.targetTheta=r.theta+F.wrap(p.angle+r.dir*(age>.18?.42:.03)-r.theta);
      }
      return true;
    }
    function watchBall(brain,w){
      const b=w.ball,own=w.legalRods().filter(r=>r.team===brain.team&&!r.controlled&&r.motor);
      const humanPin=w.rods.some(r=>r.team!==brain.team&&r.pinJoint);
      if(w.goalLock>0||w.serveRemaining>0||!own.length||humanPin||b.z>C.radius+.004||Math.hypot(b.vx,b.vy)>.35){brain.__stuck=null;brain.__escape=null;w.botStall=null;return;}
      const r=own.sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0],old=brain.__stuck;
      if(!old||old.rod!==r.id||Math.hypot(b.x-old.x,b.y-old.y)>.023){brain.__stuck={rod:r.id,x:b.x,y:b.y,since:w.time,attempts:0};w.botStall=null;return;}
      const age=w.time-old.since;
      if(age>2.7&&!brain.__escape&&w.time>=(brain.__escapeAfter||0))armEscape(brain,w,r,old);
      if(age>8&&old.attempts>=2&&!w.botStall)w.botStall={team:brain.team,rod:r.id,since:w.time,x:b.x,y:b.y,reason:'bot-timeout'};
    }
    B.update=function(w,dt){
      if(this.forceTechnique)return update.call(this,w,dt);
      this.__now=w.time;watchBall(this,w);
      if(escapeStep(this,w,dt))return;
      const before=new Map(w.rods.filter(r=>r.team===this.team&&!r.controlled).map(r=>[r.id,{y:r.targetY,theta:r.targetTheta}]));
      update.call(this,w,dt);
      if(this.level>=2||w.goalLock>0||w.serveRemaining>0)return;
      const ours=w.rods.filter(r=>r.team===this.team&&!r.controlled&&r.motor);
      if(!ours.length)return;
      const seen=this.perceived(w,LEVELS[this.level]);
      if(!seen){for(const r of ours){r.targetY=r.y;r.targetTheta=r.theta;}return;}
      const primary=ours.find(r=>this.plans.has(r.id))||[...ours].sort((a,b)=>Math.abs(a.x-seen.x)-Math.abs(b.x-seen.x))[0];
      const receiver=ours.find(r=>r.id===this.receiver&&r!==primary);
      const wanted=[primary?.id,receiver?.id].filter(id=>id!==undefined);
      if(!this.__hands)this.__hands=[];
      const next=this.__hands.filter(h=>wanted.includes(h.rod));
      for(const id of wanted)if(!next.some(h=>h.rod===id)){
        next.push({rod:id,ready:w.time+SETTINGS[this.level].transfer});
        this.memory.handleSwitches=(this.memory.handleSwitches||0)+1;
      }
      this.__hands=next;
      for(const r of ours){
        const hand=next.find(h=>h.rod===r.id);
        if(!hand||w.time<hand.ready){r.targetY=r.y;r.targetTheta=r.theta;r.catchHeld=false;if(hand)this.intent='Change handles · find the ball';continue;}
        if(!this.plans.has(r.id)){r.slideScale=Math.min(r.slideScale,SETTINGS[this.level].defend/C.maxSlide);}
      }
    };
    W.__playability10=true;return true;
  }
  function mount(root){
    const g=root.touchline,doc=root.document,F=root.Foos;if(!g||doc.getElementById('overlayButtonsToggle'))return false;
    const el=id=>doc.getElementById(id);let overlay=false,previous={tableOnly:g.tableOnly,showDocks:g.showDocks};
    try{overlay=JSON.parse(root.localStorage.getItem('pocketfoosball.overlay.v10')||'false')===true;}catch{}
    function save(){try{root.localStorage.setItem('pocketfoosball.overlay.v10',JSON.stringify(overlay));}catch{}}
    function setOverlay(value,restore=true){
      value=!!value;if(value&&!overlay)previous={tableOnly:g.tableOnly,showDocks:g.showDocks};
      const was=overlay;overlay=value;doc.body.classList.toggle('overlay-controls',overlay);el('overlayButtonsToggle').checked=overlay;
      if(value){g.setDocks(true);g.setTableOnly(true);}else if(was&&restore){g.setTableOnly(previous.tableOnly);g.setDocks(previous.showDocks);}
      g.renderer.resize();save();
    }
    const row=doc.createElement('label');row.className='toggle-row';row.innerHTML='<span>Overlay buttons<small>Full-size table. Floating handles, PIN and score.</small></span><input id="overlayButtonsToggle" type="checkbox"><span class="toggle-ui"></span>';
    el('dockToggle').closest('label').before(row);el('overlayButtonsToggle').onchange=e=>setOverlay(e.target.checked);
    const preset=doc.createElement('button');preset.id='overlayPreset';preset.type='button';preset.innerHTML='<span aria-hidden="true" class="view-icon view-all"></span><strong>Overlay</strong><small>Full table + handles</small>';preset.onclick=()=>setOverlay(true);doc.querySelector('.view-presets').appendChild(preset);
    doc.querySelector('.view-presets').addEventListener('click',e=>{if(e.target.closest('[data-view]'))setOverlay(false,false);},{capture:true});
    el('restoreView').addEventListener('click',()=>setOverlay(false,false),{capture:true});
    el('dockToggle').addEventListener('change',()=>setOverlay(false,false),{capture:true});
    el('tableOnlyToggle').addEventListener('change',()=>setOverlay(false,false),{capture:true});
    const practice=doc.createElement('button');practice.id='practiceReserve';practice.className='floating-utility';practice.textContent='↻ Re-serve';practice.setAttribute('aria-label','Re-serve practice ball at any time');practice.onclick=()=>{g.resetRally(0);g.makeSound('serve',.18);};el('arena').appendChild(practice);
    const score=doc.createElement('div');score.id='overlayScore';score.setAttribute('aria-label','Score');score.innerHTML='<span>MINT</span><b>0 : 0</b><span class="rival">CORAL</span>';el('arena').appendChild(score);
    const toast=doc.createElement('div');toast.id='neutralToast';toast.setAttribute('role','status');toast.hidden=true;el('arena').appendChild(toast);let toastUntil=0;
    const hint=doc.createElement('p');hint.className='panel-subtitle';hint.textContent='Double-tap or double-click a handle to return its figures to ready without centering the rod. In Overlay mode, tap PIN to trap; gentle backward touches stay free.';el('panel-controls').querySelector('.panel-subtitle').after(hint);
    const style=doc.createElement('style');style.id='playabilityStyles';style.textContent=`
      .view-presets{grid-template-columns:repeat(2,minmax(0,1fr))}
      .floating-utility,#overlayScore{position:absolute;z-index:11;border:1px solid #abc29550;background:#173127d9;color:#e3eedc;border-radius:10px;font:600 12px/1.2 var(--font);backdrop-filter:blur(6px)}
      #practiceReserve{top:10px;left:10px;min-height:42px;padding:9px 13px;touch-action:manipulation}
      #overlayScore{display:none;top:12px;left:12px;align-items:center;gap:9px;padding:9px 11px;pointer-events:none}#overlayScore span{font-size:8px;letter-spacing:.5px;color:#aae6c3}#overlayScore .rival{color:#efb097}#overlayScore b{font-size:18px;font-variant-numeric:tabular-nums;white-space:nowrap}
      body.in-game.overlay-controls #overlayScore{display:flex}body.in-game.overlay-controls.practice-mode #overlayScore{top:62px}
      body.in-game.overlay-controls .play-column{position:relative}
      body.in-game.overlay-controls .dock:not([hidden]){display:grid!important;position:absolute!important;left:50%;transform:translateX(-50%);bottom:max(9px,env(safe-area-inset-bottom,0px));top:auto;z-index:12;width:calc(100% - 16px);max-width:860px;height:64px;min-height:64px;margin:0!important;padding:4px;gap:5px;background:#10291d35;border:1px solid #a1c3a225;border-radius:14px;box-shadow:0 3px 20px #0002;grid-template-columns:repeat(4,minmax(0,1fr)) 58px}
      body.in-game.overlay-controls .dock .dock-pad,body.in-game.overlay-controls .dock .dock-pin{height:54px;min-height:54px;background:#1b392acd;border:1px solid #a5cfaf66;backdrop-filter:blur(3px);border-radius:10px;padding:6px;touch-action:none;box-shadow:none}
      body.in-game.overlay-controls .dock .dock-pad.touching{background:#427453e8;border-color:#c3edca}body.in-game.overlay-controls .dock .dock-pad strong{font-size:9px}body.in-game.overlay-controls .dock .dock-pad small{font-size:6px}body.in-game.overlay-controls .dock .keycap{display:none}
      body.in-game.overlay-controls #redDock:not([hidden]){bottom:auto;top:max(9px,env(safe-area-inset-top,0px));transform:translateX(-50%) rotate(180deg)}
      body.in-game.overlay-controls.local-mode #overlayScore{top:82px}
      body.in-game.overlay-controls.local-mode .compact-actions{top:82px!important}
      body.in-game.overlay-controls .inplay-hint{display:none!important}
      #neutralToast{position:absolute;z-index:13;bottom:90px;left:50%;transform:translateX(-50%);padding:8px 14px;border-radius:20px;background:#183828e8;color:#dbf4e4;font:600 11px var(--font);pointer-events:none;white-space:nowrap}
      body.menu-open #practiceReserve,body.menu-open #overlayScore,body.menu-open #neutralToast{visibility:hidden}
      #quickReset{display:none!important}
      @media(max-width:520px){body.in-game.overlay-controls .dock{gap:4px;grid-template-columns:repeat(4,minmax(0,1fr)) 51px}body.in-game.overlay-controls .dock .dock-pad strong{font-size:7px}body.in-game.overlay-controls .dock .grip-lines{display:none}#overlayScore{padding:9px 8px;gap:6px}#overlayScore span{font-size:7px}}
      @media(max-height:450px){body.in-game.overlay-controls .dock:not([hidden]){height:58px;min-height:58px}body.in-game.overlay-controls .dock .dock-pad,body.in-game.overlay-controls .dock .dock-pin{height:48px;min-height:48px}}
    `;doc.head.appendChild(style);
    function currentRod(e){
      const pad=e.target.closest?.('.dock-pad[data-rod]');let id=pad?Number(pad.dataset.rod):null;
      if(e.target===el('table')){const p=g.renderer.pointerPoint(e.clientX,e.clientY);id=g.renderer.hit(p.x,p.y);}
      const r=g.world.rods.find(r=>r.id===id);return r&&(r.team===0||g.mode==='local')?id:null;
    }
    // Suppress the old table-only long-hold shortcut only in Overlay mode,
    // where a visible PIN control is always available. Explicit clicks/keys
    // can still arm a held rod; normal motor/contact simulation is unchanged.
    let pinGestureUntil=-1;
    root.addEventListener('click',e=>{if(e.target.closest?.('.pin-button'))pinGestureUntil=performance.now()+50;},{capture:true});
    root.addEventListener('keydown',e=>{if(['KeyG','Slash'].includes(e.code))pinGestureUntil=performance.now()+50;},{capture:true});
    const setPin=g.world.setPin;
    g.world.setPin=function(r,on){
      if(on&&overlay&&r.controlled&&r.heldBy!=null&&(r.team===0||g.mode==='local')&&!r.pinIntent&&performance.now()>pinGestureUntil)return;
      return setPin.call(this,r,on);
    };
    const taps=new DoubleTap();
    root.addEventListener('pointerdown',e=>{if(g.state!=='playing'||doc.body.classList.contains('menu-open')||e.button>0)return;const id=currentRod(e);if(id!==null)taps.down(e.pointerId,id,e.clientX,e.clientY,e.timeStamp,e.pointerType);},{capture:true});
    root.addEventListener('pointermove',e=>taps.move(e.pointerId,e.clientX,e.clientY),{capture:true,passive:true});
    root.addEventListener('pointerup',e=>{const id=taps.up(e.pointerId,e.clientX,e.clientY,e.timeStamp);if(id!==null&&!g.tapShotMode13)root.setTimeout(()=>{
      if(g.state!=='playing')return;const r=g.world.rods.find(r=>r.id===id);if(r?.heldBy!=null)return;
      neutral(F,g.world,r);toast.textContent='Ready · '+({GK:'Keeper',DEF:'Defense',MID:'Midfield',ATT:'Attack'}[r.role]);toast.hidden=false;toastUntil=performance.now()+1000;g.makeSound('touch',.10);
    });},{capture:true});
    root.addEventListener('pointercancel',e=>taps.up(e.pointerId,e.clientX,e.clientY,e.timeStamp,true),{capture:true});
    root.addEventListener('blur',()=>taps.clear());doc.addEventListener('visibilitychange',()=>{if(doc.hidden)taps.clear();});
    el('deadBallBtn').onclick=()=>{if(g.world.isDeadBall()||g.world.botStall)g.resetRally(g.world.botStall?1-g.world.botStall.team:g.mode==='solo'&&g.world.lastTouch===0?1:0);};
    const draw=g.renderer.draw;
    g.renderer.draw=function(...args){
      draw.apply(this,args);
      practice.hidden=g.mode!=='practice'||!g.immersive;
      doc.body.classList.toggle('practice-mode',g.mode==='practice');
      score.querySelector('b').textContent=g.world.score.join(' : ');score.querySelector('.rival').textContent=g.mode==='solo'?g.brain.profile.name.toUpperCase():g.mode==='practice'?'PRACTICE':'CORAL';
      toast.hidden=performance.now()>toastUntil;
      const w=g.world,s=w.botStall;
      if(s&&g.mode==='solo'&&g.state==='playing'&&w.goalLock<=0&&w.serveRemaining<=0){
        const remain=Math.max(0,3-(w.time-s.since));
        el('deadBallNotice').hidden=false;el('deadBallBtn').hidden=false;
        el('deadBallNotice').querySelector('strong').textContent='Bot possession timeout';
        el('deadBallNotice').querySelector('.dead-copy > span').textContent='Unable to free it after repeated attempts.';
        el('deadBallCountdown').textContent=g.recovery.auto?'Re-serve in '+Math.max(1,Math.ceil(remain))+'…':'Auto re-serve off. Tap to restart.';
        el('deadBallNotice').style.setProperty('--remaining',String(remain/3));
        if(g.recovery.auto&&remain===0)g.resetRally(1-s.team);
      }else{
        el('deadBallNotice').querySelector('strong').textContent='Stuck ball';
        el('deadBallNotice').querySelector('.dead-copy > span').textContent='No figure can reach it.';
      }
      if(g.level===1)el('levelDetail').textContent='Medium · 380 ms visual delay, time to change handles, basic passes and shots. More forgiving defense.';
      if(g.level===0)el('levelDetail').textContent='Easy · slower reads and handle changes. Straight shots, generous openings.';
    };
    const label=el('autoResetToggle').closest('label').querySelector('small');label.textContent='3-second warning for dead balls or a timed-out bot recovery.';
    g.version='10.0.0';g.setOverlayButtons=setOverlay;g.neutralRod=id=>neutral(F,g.world,g.world.rods.find(r=>r.id===id));
    Object.defineProperty(g,'overlayButtons',{get:()=>overlay});
    doc.title='Pocket Foosball — Touchline 10';for(const e of doc.querySelectorAll('.top-title,.menu-edition,.edition'))e.innerHTML=e.innerHTML.replace(/\b0[89]\b/g,'10');
    if(overlay){overlay=false;setOverlay(true);}return true;
  }
  return {SETTINGS,DoubleTap,neutral,install,mount};
});
