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
