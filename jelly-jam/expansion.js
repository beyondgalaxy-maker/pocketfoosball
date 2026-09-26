/* Jelly Jam 2: host-authoritative, fixed-step simulation. No browser dependencies. */
(function(root){
'use strict';
const E=typeof module==='object'&&module.exports?require('./engine.js'):root.JellyEngine;
if(typeof module==='object'&&module.exports)require('./campaign.js')(E);
const {W,H,DT,PW,PH,clamp,platformAt}=E;
const approach=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
const overlap=(a,b)=>a.x+a.w>b.x&&a.x<b.x+b.w&&a.y+a.h>b.y&&a.y<b.y+b.h;
const body=p=>({x:p.x-PW/2,y:p.y-PH,w:PW,h:PH});
const near=(p,q,r=25)=>Math.abs(p.x-q.x)<r&&Math.abs(p.y-q.y)<9;
const player=(p,id)=>({id,x:p.x,y:p.y,vx:0,vy:0,ground:true,standing:0,coyote:.10,buffer:0,held:false,inv:0,jumpAt:-10,face:1,dashHeld:false,dashTime:0,dashReady:false,dashUnlocked:false,portalLock:false,portalTime:0});
function create(level=0){const l=E.levels[clamp(level|0,0,E.levels.length-1)];return {level:l.id,t:0,total:0,round:0,tick:0,players:l.spawn.map(player),stars:l.stars.map(()=>false),plates:l.plates.map(()=>false),charge:0,gateOpen:!l.gate,checkpoint:false,rescues:0,won:false,exitHold:0,events:[],dead:false,deathLeft:0,phase:0,keys:[],doors:l.doors.map(()=>false),latched:l.doors.map(()=>false),crates:l.crates.map(c=>({...c,vy:0})),crumbles:l.platforms.map(()=>0),switchHeld:l.switches.map(()=>false),powerTimers:Array(l.powerups.length*2).fill(0)};}
function emit(s,type,x,y){s.events.push({type,x,y});}
function die(s,p){if(s.dead||s.won)return;s.dead=true;s.deathLeft=.7;s.rescues++;s.exitHold=0;for(const q of s.players){q.vx=q.vy=0;}emit(s,'rescue',p.x,p.y);}
function reset(s){const next=create(s.level);next.rescues=s.rescues;next.total=s.total;next.round=s.round+1;next.tick=s.tick+1;next.events=[{type:'reset',x:500,y:300}];Object.assign(s,next);}
function condition(s,rule){if(!rule)return true;if(rule.any)return rule.any.some(r=>condition(s,r));if(rule.all)return rule.all.every(r=>condition(s,r));if(rule.key)return s.keys.includes(rule.key);if(rule.phase!==undefined)return s.phase===rule.phase;
 const indices=rule.plates||[];const values=indices.map(id=>s.plates[id]===true);if(rule.mode==='empty')return values.every(v=>!v);if(rule.mode==='xor')return values.filter(Boolean).length===1;return values.length>0&&values.every(Boolean);}
function active(s,p,k){return (p.phase===undefined||p.phase===s.phase)&&(!p.crumble||s.crumbles[k]<p.crumble);}
function beamOn(s,b){if(b.rule&&!condition(s,b.rule))return false;return ((s.t+(b.offset||0))%(b.period||3))<(b.on||1.5);}
function surfaces(s){return E.levels[s.level].platforms.map((p,k)=>({...platformAt(p,s.t),k})).filter(p=>active(s,p,p.k));}
function walls(s){const l=E.levels[s.level];return [...l.walls,...l.doors.filter((_,i)=>!s.doors[i]),...(l.gate&&!s.gateOpen?[l.gate]:[])];}
function moveSolid(p,dx,dy,solids){let a=body(p);p.x=clamp(p.x+dx,PW/2,W-PW/2);for(const b of solids){if(overlap(body(p),b)){if(dx>0&&a.x+a.w<=b.x+.5)p.x=b.x-PW/2;else if(dx<0&&a.x>=b.x+b.w-.5)p.x=b.x+b.w+PW/2;else continue;p.vx=0;p.dashTime=0;}}
 a=body(p);p.y+=dy;for(const b of solids){if(overlap(body(p),b)){if(dy>=0&&a.y+a.h<=b.y+.5){p.y=b.y;p.vy=0;p.ground=true;}else if(dy<0&&a.y>=b.y+b.h-.5){p.y=b.y+b.h+PH;p.vy=0;p.dashTime=0;}}}}
function updateCrates(s,dt,plats,solid){for(let i=0;i<s.crates.length;i++){const c=s.crates[i],old=c.y;c.vy=Math.min(900,c.vy+1550*dt);c.y+=c.vy*dt;for(const b of [...plats,...solid,...s.crates.filter((_,j)=>j!==i)]){if(b.color!==undefined)continue;if(c.x+c.w>b.x&&c.x<b.x+b.w&&old+c.h<=b.y+1&&c.y+c.h>=b.y){c.y=b.y-c.h;c.vy=0;}}
 if(c.y>H+60){die(s,{x:c.x,y:H});return;}}}
function pushCrate(s,p,dx,solid){if(!dx)return;const b=body({...p,x:p.x+dx});for(const c of s.crates){if(!overlap(b,c)||p.y<=c.y+2)continue;let shift=p.vx>0?b.x+b.w-c.x:b.x-(c.x+c.w);const next={...c,x:c.x+shift};const blocked=next.x<0||next.x+next.w>W||[...solid,...s.crates.filter(q=>q!==c)].some(q=>overlap(next,q));if(!blocked)c.x=next.x;}}
function step(s,inputs=[],dt=DT){if(s.won)return s;dt=clamp(Number.isFinite(dt)?dt:DT,0,DT);if(!dt)return s;s.events=[];s.tick++;s.total+=dt;
 if(s.dead){s.deathLeft=Math.max(0,s.deathLeft-dt);if(s.deathLeft<=0)reset(s);return s;}
 const l=E.levels[s.level],oldT=s.t;s.t+=dt;const plats=surfaces(s);const solid=walls(s);updateCrates(s,dt,plats,solid);if(s.dead)return s;
 for(let i=0;i<s.powerTimers.length;i++)s.powerTimers[i]=Math.max(0,s.powerTimers[i]-dt);
 for(let k=0;k<l.platforms.length;k++)if(s.crumbles[k]>0)s.crumbles[k]+=dt;
 const ins=s.players.map((p,i)=>{const a=inputs[i]||{};return {left:a.left===true,right:a.right===true,jump:a.jump===true,dash:a.dash===true};});
 for(let i=0;i<2;i++){const p=s.players[i],a=ins[i];p.buffer=a.jump&&!p.held?.12:Math.max(0,p.buffer-dt);p.held=a.jump;p.coyote=p.ground?.10:Math.max(0,p.coyote-dt);}
 const superJump=s.players.every(p=>p.buffer>0&&p.coyote>0)&&Math.abs(s.players[0].x-s.players[1].x)<88&&Math.abs(s.players[0].y-s.players[1].y)<35;
 for(let i=0;i<2;i++){const p=s.players[i],a=ins[i];p.portalTime=Math.max(0,p.portalTime-dt);
  if(p.ground&&p.standing>=0&&l.platforms[p.standing]&&active(s,l.platforms[p.standing],p.standing)){const b=l.platforms[p.standing],old=platformAt(b,oldT),now=platformAt(b,s.t);p.x+=now.x-old.x+(b.belt||0)*dt;p.y+=now.y-old.y;}
  const ground=p.ground;if(ground&&p.dashUnlocked)p.dashReady=true;
  if(a.dash&&!p.dashHeld&&p.dashReady&&p.dashUnlocked){p.dashTime=.16;p.dashReady=false;p.vx=((a.right?1:0)-(a.left?1:0)||p.face)*920;p.vy=0;emit(s,'dash',p.x,p.y);}
  p.dashHeld=a.dash;
  if(p.dashTime<=0){p.vx=approach(p.vx,((a.right?1:0)-(a.left?1:0))*265,(a.left||a.right?2100:2600)*dt);if(Math.abs(p.vx)>10)p.face=Math.sign(p.vx);
   if(p.buffer>0&&p.coyote>0){p.vy=superJump?-760:-580;p.ground=false;p.coyote=0;p.buffer=0;p.jumpAt=s.t;emit(s,superJump?'super':'jump',p.x,p.y);}
   if(!a.jump&&p.vy<-260&&s.t-p.jumpAt<.4)p.vy=approach(p.vy,-260,2200*dt);p.vy=Math.min(900,p.vy+1550*dt);
  }else{p.dashTime=Math.max(0,p.dashTime-dt);if(p.dashTime===0)p.vx=clamp(p.vx,-265,265);}
  const prevY=p.y;pushCrate(s,p,p.vx*dt,solid);p.ground=false;p.standing=-1;moveSolid(p,p.vx*dt,p.vy*dt,[...solid,...s.crates]);
  if(p.vy>=0){for(const b of plats){if(b.color!==undefined&&b.color!==i)continue;const old=platformAt(l.platforms[b.k],oldT);if(p.x+PW/2>b.x&&p.x-PW/2<b.x+b.w&&prevY<=old.y+4&&p.y>=b.y&&p.y-b.y<40){p.y=b.y;p.vy=0;p.ground=true;p.standing=b.k;if(b.crumble&&!s.crumbles[b.k])s.crumbles[b.k]=dt;break;}}}
  if(p.ground){for(const b of l.springs)if(near(p,b,26)){p.vy=-860;p.ground=false;p.coyote=0;p.jumpAt=-10;emit(s,'spring',p.x,p.y);break;}}
  // A portal activates once per entry. Staying in the destination cannot loop.
  const touching=l.portals.filter(q=>(q.color===undefined||q.color===i)&&Math.abs(p.x-q.x)<23&&Math.abs(p.y-q.y)<38);
  if(!touching.length)p.portalLock=false;
  if(!p.portalLock&&p.portalTime<=0){const q=touching.find(q=>condition(s,q.rule));if(q){const dest=l.portals.find(d=>d.id===q.to);if(dest){p.x=dest.x+(dest.dx||0);p.y=dest.y;p.vx=dest.vx===undefined?p.vx:dest.vx;p.vy=dest.vy===undefined?p.vy:dest.vy;p.portalTime=.25;p.portalLock=true;p.ground=false;p.standing=-1;p.coyote=0;emit(s,'portal',p.x,p.y);}}}
  for(let k=0;k<l.powerups.length;k++){const q=l.powerups[k];if(!s.powerTimers[k*2+i]&&(q.color===undefined||q.color===i)&&Math.abs(p.x-q.x)<28&&Math.abs(p.y-PH/2-q.y)<29&&(!p.dashReady||!p.dashUnlocked)){p.dashUnlocked=p.dashReady=true;s.powerTimers[k*2+i]=.8;emit(s,'power',q.x,q.y);}}
  if(p.y>H+65){die(s,p);return s;}
  let ouch=l.hazards.some(b=>b.color!==i&&overlap(body(p),b));for(const b of l.saws){const q=platformAt(b,s.t),a=body(p);if(Math.hypot(q.x-clamp(q.x,a.x,a.x+a.w),q.y-clamp(q.y,a.y,a.y+a.h))<b.r)ouch=true;}
  for(const b of l.beams)if(beamOn(s,b)&&overlap(body(p),b))ouch=true;
  if(ouch){die(s,p);return s;}
  for(let j=0;j<l.stars.length;j++){const q=l.stars[j];if(!s.stars[j]&&(q.color<0||q.color===i)&&Math.abs(p.x-q.x)<27&&Math.abs(p.y-PH/2-q.y)<31){s.stars[j]=true;emit(s,'star',q.x,q.y);}}
  for(const q of l.keys)if(!s.keys.includes(q.id)&&(q.color===undefined||q.color===i)&&Math.abs(p.x-q.x)<26&&Math.abs(p.y-PH/2-q.y)<29){s.keys.push(q.id);emit(s,'key',q.x,q.y);}
 }
 s.plates=l.plates.map(b=>s.players.some(p=>(b.color===undefined||b.color===p.id)&&p.ground&&near(p,b,25))||s.crates.some(c=>Math.abs(c.x+c.w/2-b.x)<23&&Math.abs(c.y+c.h-b.y)<8));
 for(let k=0;k<l.switches.length;k++){const q=l.switches[k],down=s.players.some(p=>p.ground&&near(p,q,23));if(down&&!s.switchHeld[k]){s.phase=1-s.phase;emit(s,'phase',q.x,q.y);}s.switchHeld[k]=down;}
 for(let k=0;k<l.doors.length;k++){const b=l.doors[k];let open=condition(s,b.rule);if(b.latch&&open)s.latched[k]=true;open=open||s.latched[k];
  // A closing door never materializes through a buddy/crate. It waits until clear.
  if(!open&&s.doors[k]&&[...s.players.map(body),...s.crates].some(p=>overlap(p,b)))open=true;
  if(open&&!s.doors[k])emit(s,'gate',b.x,b.y+20);s.doors[k]=open;}
 if(!s.gateOpen){s.charge=s.plates.length&&s.plates.every(Boolean)?Math.min(1,s.charge+dt*2):Math.max(0,s.charge-dt*3);if(s.charge>=1){s.gateOpen=true;emit(s,'gate',l.gate.x,l.gate.y+60);}}
 if(s.stars.every(Boolean)&&s.gateOpen&&condition(s,l.exitRule)&&s.players.every(p=>near(p,l.exit,48)))s.exitHold+=dt;else s.exitHold=0;
 if(s.exitHold>=.45){s.won=true;emit(s,'win',l.exit.x,l.exit.y-30);}return s;
}
function validSnapshot(s){if(!s||!Number.isInteger(s.level)||!E.levels[s.level])return false;const l=E.levels[s.level];const num=(v,a=-1e6,b=1e9)=>Number.isFinite(v)&&v>=a&&v<=b;const bools=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(x=>typeof x==='boolean');
 return num(s.t,0)&&num(s.total,0)&&Number.isSafeInteger(s.tick)&&s.tick>=0&&Number.isSafeInteger(s.round)&&s.round>=0&&Number.isSafeInteger(s.rescues)&&s.rescues>=0&&num(s.deathLeft,0,1)&&typeof s.dead==='boolean'&&typeof s.won==='boolean'&&typeof s.gateOpen==='boolean'&&num(s.charge,0,1)&&num(s.exitHold,0,1)&&[0,1].includes(s.phase)&&bools(s.stars,3)&&bools(s.plates,l.plates.length)&&bools(s.doors,l.doors.length)&&bools(s.latched,l.doors.length)&&bools(s.switchHeld,l.switches.length)&&Array.isArray(s.crumbles)&&s.crumbles.length===l.platforms.length&&s.crumbles.every(v=>num(v,0))&&Array.isArray(s.powerTimers)&&s.powerTimers.length===l.powerups.length*2&&s.powerTimers.every(v=>num(v,0,1))&&Array.isArray(s.keys)&&s.keys.length<=l.keys.length&&s.keys.every(v=>l.keys.some(k=>k.id===v))&&Array.isArray(s.crates)&&s.crates.length===l.crates.length&&s.crates.every((c,i)=>['x','y','vy'].every(k=>num(c[k]))&&c.w===l.crates[i].w&&c.h===l.crates[i].h)&&Array.isArray(s.players)&&s.players.length===2&&s.players.every((p,i)=>p&&p.id===i&&['x','y','vx','vy','face','coyote','buffer','jumpAt','dashTime','portalTime'].every(k=>num(p[k]))&&Math.abs(p.x)<2000&&Math.abs(p.y)<4000&&['ground','held','dashHeld','dashReady','dashUnlocked','portalLock'].every(k=>typeof p[k]==='boolean')&&Number.isInteger(p.standing)&&p.standing>=-1&&p.standing<l.platforms.length)&&Array.isArray(s.events)&&s.events.length<64&&s.events.every(e=>e&&['jump','super','spring','rescue','star','gate','win','reset','dash','portal','power','key','phase'].includes(e.type)&&num(e.x)&&num(e.y));
}
Object.assign(E,{create,step,validSnapshot,condition,beamOn,active,body,overlap});if(typeof module==='object'&&module.exports)module.exports=E;
})(globalThis);
