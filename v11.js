/* Touchline 11: side-contact compliance and translucent touch controls. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.TouchlineV11=api;api.installPhysics(root.Foos);const mount=()=>api.mount(root);if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function installPhysics(F){
  const P=F.World.prototype;if(P.__sideCompliance11)return;
  const contact=P.contact,move=P.moveRods,solve=P.solve,reset=P.reset,C=F.C,clamp=F.clamp;
  P.reset=function(...args){this.__railImpact=null;this.__railYields=new Map();return reset.apply(this,args);};
  P.solve=function(dt){if(this.__railImpact&&this.time-this.__railImpact.at>.025)this.__railImpact=null;this.__wallRestitution=new Set();return solve.call(this,dt);};
  P.contact=function(c,r,restitution,friction,iteration,kind){
   const b=this.ball,side=b.y<C.radius+.0015?-1:b.y>C.width-C.radius-.0015?1:0;
   // Only a real, predominantly sideways figure contact at a sidewall. A
   // fast shot through open space, near-wall proximity, or a held pin is not it.
   if(r&&kind==='foot'&&side&&c.ny*side>.72&&!r.pinJoint&&r.vy*side>.28&&Math.abs(r.omega)<2.5&&Math.abs(F.wrap(r.targetTheta-r.theta))<.09&&b.z<C.radius+.005){
    const current=this.__railImpact;
    if(!current||Math.abs(r.vy)>current.speed)this.__railImpact={rod:r,side,speed:Math.abs(r.vy),at:this.time};
   }
   const hit=this.__railImpact;
   if(!r&&kind==='wall'&&Math.abs(c.ny)>.99&&hit&&c.ny*hit.side<0&&b.vy*hit.side>.22){
    this.__railYields??=new Map();const rod=hit.rod;
    if(!this.__railYields.has(rod.id)&&this.time>(rod.__railCooldown??-1)){
     // Yielding grip/bumper: reflect a fraction of the rod's incoming lateral
     // kinetic energy, never push the ball by assignment. Subsequent existing
     // wall/figure impulses determine its rebound and spin.
     rod.vy=-hit.side*Math.min(hit.speed*.55,.65);
     this.__railYields.set(rod.id,{until:this.time+.085,side:hit.side});
     rod.__railCooldown=this.time+.16;
     this.stats.railReleases=(this.stats.railReleases||0)+1;
    }
   }
   // A wall can first become penetrating in a later solver pass after the
   // figure has pushed the ball. Give that contact ONE restitution impulse;
   // tying restitution to iteration zero silently erased these side taps.
   if(!r&&kind==='wall'&&Math.abs(c.ny)>.99){
    this.__wallRestitution??=new Set();const key=Math.sign(c.ny);
    if(!this.__wallRestitution.has(key)&&b.vy*c.ny<-.35){this.__wallRestitution.add(key);iteration=0;}
    else if(this.__wallRestitution.has(key))iteration=Math.max(1,iteration);
   }
   return contact.call(this,c,r,restitution,friction,iteration,kind);
  };
  P.moveRods=function(dt){
   const held=[];
   for(const [id,s] of this.__railYields||[]){
    const r=this.rods.find(r=>r.id===id);
    if(!r||this.time>s.until||r.pinIntent||Math.abs(r.omega)>2.5||Math.abs(F.wrap(r.targetTheta-r.theta))>.1||r.targetY* s.side<r.y*s.side-.01){this.__railYields.delete(id);continue;}
    held.push({r,y:r.y,v:r.vy});
   }
   move.call(this,dt);
   // A brief passive lateral compliance, not another powered stroke. Rotation
   // remains under the player's control. Existing collision impulses can still
   // change vy after this drift. The kinetic energy strictly decays here.
   for(const {r,y,v} of held){r.vy=v*Math.exp(-12*dt);r.y=clamp(y+r.vy*dt,-r.limit,r.limit);}
  };
  P.__sideCompliance11=true;
 }
 function mount(root){
  const g=root.touchline,d=root.document;if(!g||d.getElementById('glassOverlayStyles'))return;
  let fill=.08;try{const n=Number(root.localStorage.getItem('pocketfoosball.overlayFill.v11'));if(n>=.03&&n<=.3)fill=n;}catch{}
  const style=d.createElement('style');style.id='glassOverlayStyles';style.textContent=`
   body.in-game.overlay-controls .dock:not([hidden]){pointer-events:none;background:transparent!important;border-color:transparent!important;box-shadow:none!important;padding:2px;gap:6px;grid-template-columns:minmax(44px,.88fr) minmax(44px,.88fr) minmax(54px,1.2fr) minmax(54px,1.2fr) 52px;max-width:860px}
   body.in-game.overlay-controls .dock .dock-pad,body.in-game.overlay-controls .dock .dock-pin{pointer-events:auto;background:rgba(17,46,32,var(--overlay-fill,.08))!important;backdrop-filter:none!important;border:1px solid #c5eac334!important;box-shadow:none!important;color:#f0f8e9;text-shadow:0 1px 3px #092617;transition:background .14s,border-color .14s}
   body.in-game.overlay-controls .dock .dock-pad strong{font-size:9px;letter-spacing:.35px;opacity:.85}
   body.in-game.overlay-controls .dock .dock-pad small{opacity:.55;letter-spacing:.2px}
   body.in-game.overlay-controls .dock .grip-lines{opacity:.3}
   body.in-game.overlay-controls .dock .dock-pad.active{border-color:#d5f9d461!important}
   body.in-game.overlay-controls .dock .dock-pad.touching,body.in-game.overlay-controls .dock .dock-pad:active{background:rgba(24,65,40,.34)!important;border-color:#d8f9dbaa!important}
   body.in-game.overlay-controls .dock .dock-pin.armed,body.in-game.overlay-controls .dock .dock-pin.pinned{background:rgba(39,94,60,.3)!important;border-color:#bdfbb49c!important}
   body.in-game.overlay-controls #overlayScore{background:rgba(12,38,28,.18);backdrop-filter:none;border-color:#b7dfad28;text-shadow:0 1px 3px #092617}
   #overlayOpacityRow{margin:4px 0 14px}#overlayOpacityRow small{display:block;font-size:11px;color:var(--muted);font-weight:400}
   @media(max-width:380px){body.in-game.overlay-controls .dock:not([hidden]){gap:4px;grid-template-columns:minmax(44px,.86fr) minmax(44px,.86fr) minmax(50px,1.17fr) minmax(50px,1.17fr) 46px}body.in-game.overlay-controls .dock .dock-pad strong{font-size:7px}}
  `;d.head.appendChild(style);
  const row=d.createElement('label');row.id='overlayOpacityRow';row.className='sensitivity-row';row.htmlFor='overlayOpacity';row.innerHTML='Overlay shading <output id="overlayOpacityValue"></output><input id="overlayOpacity" type="range" min=".03" max=".30" step=".01"><small>Almost clear at rest. A stronger outline appears when touched. Midfield and attack have wider grips.</small>';
  d.getElementById('overlayButtonsToggle').closest('label').after(row);
  function setFill(n){fill=Math.max(.03,Math.min(.3,Number(n)||.08));d.documentElement.style.setProperty('--overlay-fill',fill);d.getElementById('overlayOpacity').value=fill;d.getElementById('overlayOpacityValue').textContent=Math.round(fill*100)+'%';try{root.localStorage.setItem('pocketfoosball.overlayFill.v11',String(fill));}catch{}}
  d.getElementById('overlayOpacity').oninput=e=>setFill(e.target.value);setFill(fill);
  root.addEventListener('hashchange',()=>{const code=root.TouchlineOnline?.parseRoom(root.location.hash);if(code&&g.online&&!g.online.session.active){d.getElementById('onlineCode').value=code;g.online.show();}});
  g.setOverlayOpacity=setFill;g.version='11.0.0';d.title='Pocket Foosball — Touchline 11';for(const e of d.querySelectorAll('.top-title,.menu-edition,.edition,.app-footer'))e.innerHTML=e.innerHTML.replace(/\b(?:08|09|10)\b/g,'11');
 }
 return {installPhysics,mount};
});
