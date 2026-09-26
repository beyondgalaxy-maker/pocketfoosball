/* Jelly Jam — deterministic, dependency-free game simulation. */
(function(root){
'use strict';
const W=1000,H=600,DT=1/60,PW=28,PH=34;
const box=(x,y,w,h=20,extra={})=>({x,y,w,h,...extra});
const star=(x,y,color=-1)=>({x,y,color});
const pad=(x,y)=>({x,y});
const floor=()=>[box(0,548,1000,60)];
const levels=[
 {name:'Meet cute',tag:'A LITTLE HOP GOES A LONG WAY',hint:'Grab all 3 stars. Bring BOTH buddies to the rainbow door.',par:35,platforms:[...floor(),box(270,468,140),box(455,388,140),box(650,468,140)],stars:[star(340,438),star(525,358),star(720,438)]},
 {name:'Better together',tag:'TWO BUTTONS. ONE BIG IDEA.',hint:'Stand on both flower buttons together. The gate stays open!',par:45,platforms:[...floor(),box(230,448,140),box(425,368,140),box(640,448,140)],stars:[star(300,418),star(495,338),star(710,418)],plates:[pad(200,548),pad(620,548)],gate:box(825,268,24,280)},
 {name:'Soda pop',tag:'YOUR COLOR IS YOUR SUPERPOWER',hint:'Peach is safe in peach soda. Mint is safe in mint soda. Jump over the other color!',par:40,platforms:[...floor(),box(190,448,130),box(415,438,130),box(660,448,130)],hazards:[box(280,531,120,17,{color:0}),box(510,531,120,17,{color:1})],stars:[star(340,518,0),star(570,518,1),star(725,408)]},
 {name:'Mushroom express',tag:'BOING IS A COMPLETE SENTENCE',hint:'Yellow mushrooms bounce you automatically. Steer in the air!',par:40,platforms:[box(0,548,210,60),box(290,418,160),box(535,298,150),box(755,418,130),box(810,548,190,60)],springs:[pad(145,548),pad(360,418)],stars:[star(365,380),star(610,260),star(815,380)]},
 {name:'Pick your flavor',tag:'DIFFERENT PATHS. SAME TEAM.',hint:'Circle platforms are Peach’s. Diamond platforms are Mint’s. Meet at the top!',par:55,platforms:[...floor(),box(200,458,140,20,{color:0}),box(330,368,130,20,{color:0}),box(660,458,140,20,{color:1}),box(530,368,130,20,{color:1}),box(445,278,110)],plates:[pad(390,368),pad(595,368)],gate:box(835,248,24,300),stars:[star(390,338,0),star(595,338,1),star(500,248)]},
 {name:'Cloud commuters',tag:'PLEASE MIND THE VERY CUTE GAP',hint:'Ride the moving clouds. The flag saves BOTH buddies a trip back.',par:55,platforms:[box(0,548,185,60),box(230,448,145,20,{ax:110,period:5}),box(420,468,160),box(620,378,145,20,{ax:105,period:5.5}),box(825,548,175,60)],springs:[pad(500,468)],checkpoint:pad(500,468),stars:[star(305,410),star(500,435),star(725,340)]},
 {name:'Prickly business',tag:'LOOKS LIKE SOMEONE NEEDS A HUG',hint:'Hop over the grumpy puffballs. Flower buttons still need one buddy each.',par:50,platforms:[...floor(),box(230,448,145),box(430,358,145),box(645,448,145)],saws:[{x:320,y:520,r:19,ax:85,period:3.5},{x:690,y:520,r:19,ax:100,period:4}],plates:[pad(300,448),pad(715,448)],gate:box(830,248,24,300),checkpoint:pad(500,548),stars:[star(300,416),star(500,326),star(715,416)]},
 {name:'Sky high-five',tag:'A FRIEND IS A VERY GOOD POWER-UP',hint:'Jump at the same time, close together, for a SUPER bounce. Normal hops work too!',par:50,platforms:[...floor(),box(170,468,150),box(340,388,150),box(515,308,150),box(700,248,140),box(855,248,145)],stars:[star(245,436),star(590,276),star(770,216)],exit:pad(935,248),checkpoint:pad(415,388)},
 {name:'Sherbet shuffle',tag:'A LITTLE SWEET. A LITTLE CHAOTIC.',hint:'Use the stepping stones, or take your own color through the soda.',par:55,platforms:[...floor(),box(190,438,125),box(370,358,125),box(555,438,125),box(730,358,125)],hazards:[box(185,531,270,17,{color:0}),box(515,531,280,17,{color:1})],saws:[{x:500,y:390,r:17,ay:70,period:3.6}],springs:[pad(95,548)],stars:[star(430,326),star(620,406),star(790,326)],plates:[pad(260,438),pad(790,358)],gate:box(875,248,24,300)},
 {name:'The big jam',tag:'ONE LAST LEAP. TOGETHER.',hint:'Mushrooms, clouds, flower buttons. You’ve got this. No buddy left behind!',par:70,platforms:[box(0,548,210,60),box(290,428,160),box(535,308,160),box(435,478,105,20,{ax:65,period:4}),box(765,428,100),box(810,548,190,60)],springs:[pad(140,548),pad(360,428)],checkpoint:pad(610,308),stars:[star(365,390),star(610,270),star(815,390)],plates:[pad(420,428),pad(610,308)],gate:box(880,248,24,300),saws:[{x:495,y:385,r:18,ay:35,period:3.5}]}
].map((l,i)=>({...l,id:i,exit:l.exit||pad(934,548),spawn:l.spawn||[pad(65,548),pad(115,548)],hazards:l.hazards||[],saws:l.saws||[],springs:l.springs||[],plates:l.plates||[]}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
const hit=(p,b)=>p.x+PW/2>b.x&&p.x-PW/2<b.x+b.w&&p.y>b.y&&p.y-PH<b.y+b.h;
function platformAt(b,t){const phase=2*Math.PI*t/(b.period||4);return {...b,x:b.x+(b.ax||0)*Math.sin(phase),y:b.y+(b.ay||0)*Math.sin(phase)};}
function makePlayer(p,id){return {id,x:p.x,y:p.y,vx:0,vy:0,ground:true,standing:0,coyote:.12,buffer:0,held:false,inv:0,jumpAt:-10,face:1};}
function create(level=0){const l=levels[clamp(level|0,0,levels.length-1)];return {level:l.id,t:0,players:l.spawn.map(makePlayer),stars:[false,false,false],plates:l.plates.map(()=>false),charge:0,gateOpen:!l.gate,checkpoint:false,rescues:0,won:false,exitHold:0,events:[],tick:0};}
function emit(s,type,x,y){s.events.push({type,x,y});}
function rescue(s,p){const l=levels[s.level],c=s.checkpoint?{x:l.checkpoint.x+(p.id?24:-24),y:l.checkpoint.y}:l.spawn[p.id];Object.assign(p,makePlayer(c,p.id),{inv:1.2});s.rescues++;emit(s,'rescue',p.x,p.y);}
function step(s,inputs,dt=DT){
 if(s.won)return s;
 dt=clamp(Number.isFinite(dt)?dt:DT,0,1/30); if(!dt)return s;
 const l=levels[s.level],oldT=s.t;s.t+=dt;s.tick++;s.events=[];
 const platforms=l.platforms.map(b=>platformAt(b,s.t));
 const ins=s.players.map((p,i)=>{const a=inputs[i]||{};return {left:!!a.left,right:!!a.right,jump:!!a.jump};});
 for(let i=0;i<2;i++){const p=s.players[i],a=ins[i];p.buffer=a.jump&&!p.held?.13:Math.max(0,p.buffer-dt);p.held=a.jump;p.coyote=p.ground?.12:Math.max(0,p.coyote-dt);}
 const superJump=s.players.every(p=>p.buffer>0&&p.coyote>0)&&Math.abs(s.players[0].x-s.players[1].x)<95&&Math.abs(s.players[0].y-s.players[1].y)<45;
 for(let i=0;i<2;i++){
  const p=s.players[i],a=ins[i];p.inv=Math.max(0,p.inv-dt);
  if(p.ground&&p.standing>=0){const old=platformAt(l.platforms[p.standing],oldT),now=platforms[p.standing];p.x+=now.x-old.x;p.y+=now.y-old.y;}
  p.vx=approach(p.vx,((a.right?1:0)-(a.left?1:0))*265,(a.left||a.right?2100:2600)*dt);if(Math.abs(p.vx)>10)p.face=Math.sign(p.vx);
  if(p.buffer>0&&p.coyote>0){p.vy=superJump?-760:-580;p.ground=false;p.coyote=0;p.buffer=0;p.jumpAt=s.t;emit(s,superJump?'super':'jump',p.x,p.y);}
  // Early release shortens ordinary jumps; spring jumps always retain their height.
  if(!a.jump&&p.vy<-260&&s.t-p.jumpAt<.4)p.vy=approach(p.vy,-260,2200*dt);
  const prevX=p.x,prevY=p.y;p.x=clamp(p.x+p.vx*dt,PW/2,W-PW/2);
  if(l.gate&&!s.gateOpen&&hit(p,l.gate)){p.x=prevX<l.gate.x?l.gate.x-PW/2:l.gate.x+l.gate.w+PW/2;p.vx=0;}
  p.vy=Math.min(900,p.vy+1550*dt);p.y+=p.vy*dt;p.ground=false;p.standing=-1;
  if(p.vy>=0){for(let k=0;k<platforms.length;k++){const b=platforms[k],old=platformAt(l.platforms[k],oldT);if(b.color!==undefined&&b.color!==i)continue;if(p.x+PW/2>b.x&&p.x-PW/2<b.x+b.w&&prevY<=old.y+4&&p.y>=b.y){p.y=b.y;p.vy=0;p.ground=true;p.standing=k;break;}}}
  if(p.ground){for(const b of l.springs){if(Math.abs(p.x-b.x)<26&&Math.abs(p.y-b.y)<7){p.vy=-860;p.ground=false;p.coyote=0;p.jumpAt=-10;emit(s,'spring',p.x,p.y);break;}}}
  if(p.y>H+75){rescue(s,p);continue;}
  if(p.inv<=0){let ouch=l.hazards.some(b=>b.color!==i&&hit(p,b));for(const b of l.saws){const q=platformAt(b,s.t);const nx=clamp(q.x,p.x-PW/2,p.x+PW/2),ny=clamp(q.y,p.y-PH,p.y);if(Math.hypot(q.x-nx,q.y-ny)<b.r)ouch=true;}if(ouch){rescue(s,p);continue;}}
  for(let j=0;j<l.stars.length;j++){const q=l.stars[j];if(!s.stars[j]&&(q.color<0||q.color===i)&&Math.abs(p.x-q.x)<27&&Math.abs(p.y-PH/2-q.y)<31){s.stars[j]=true;emit(s,'star',q.x,q.y);}}
  if(l.checkpoint&&!s.checkpoint&&Math.abs(p.x-l.checkpoint.x)<35&&Math.abs(p.y-l.checkpoint.y)<12){s.checkpoint=true;emit(s,'checkpoint',l.checkpoint.x,l.checkpoint.y);}
 }
 s.plates=l.plates.map(b=>s.players.some(p=>p.ground&&Math.abs(p.x-b.x)<26&&Math.abs(p.y-b.y)<8));
 if(!s.gateOpen){s.charge=s.plates.length&&s.plates.every(Boolean)?Math.min(1,s.charge+dt*2):Math.max(0,s.charge-dt*3);if(s.charge>=1){s.gateOpen=true;emit(s,'gate',l.gate.x,l.gate.y+80);}}
 const ready=s.stars.every(Boolean)&&s.gateOpen;
 if(ready&&s.players.every(p=>Math.abs(p.x-l.exit.x)<49&&Math.abs(p.y-l.exit.y)<18))s.exitHold+=dt;else s.exitHold=0;
 if(s.exitHold>=.45){s.won=true;emit(s,'win',l.exit.x,l.exit.y-30);}
 return s;
}
function snapshot(s){return JSON.parse(JSON.stringify(s));}
function validSnapshot(s){
 const finite=(v,min=-1e6,max=1e6)=>Number.isFinite(v)&&v>=min&&v<=max;
 return !!s&&Number.isInteger(s.level)&&s.level>=0&&s.level<levels.length&&finite(s.t,0,1e8)&&Number.isSafeInteger(s.tick)&&s.tick>=0&&typeof s.won==='boolean'&&typeof s.gateOpen==='boolean'&&typeof s.checkpoint==='boolean'&&finite(s.charge,0,1)&&finite(s.exitHold,0,5)&&Number.isSafeInteger(s.rescues)&&s.rescues>=0&&Array.isArray(s.players)&&s.players.length===2&&s.players.every((p,i)=>p&&p.id===i&&['x','y','vx','vy','inv','face'].every(k=>finite(p[k]))&&Math.abs(p.x)<2000&&Math.abs(p.y)<4000&&typeof p.ground==='boolean')&&Array.isArray(s.stars)&&s.stars.length===3&&s.stars.every(v=>typeof v==='boolean')&&Array.isArray(s.plates)&&s.plates.length===levels[s.level].plates.length&&s.plates.every(v=>typeof v==='boolean')&&Array.isArray(s.events)&&s.events.length<100&&s.events.every(e=>e&&['jump','super','spring','rescue','star','checkpoint','gate','win'].includes(e.type)&&finite(e.x)&&finite(e.y));
}
const API={W,H,DT,PW,PH,levels,create,step,snapshot,validSnapshot,platformAt,clamp};
if(typeof module==='object'&&module.exports)module.exports=API;else root.JellyEngine=API;
})(typeof globalThis==='object'?globalThis:this);
