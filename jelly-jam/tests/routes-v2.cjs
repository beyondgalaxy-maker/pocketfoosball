const E=require('../expansion.js');
const pt=(x,y,extra={})=>({x,y,...extra});
const routes=[
 [[pt(340,468),pt(525,388),pt(720,468)]],
 [[pt(300,448),pt(495,368),pt(710,448),pt(200,548,{plate:true})],[pt(300,448),pt(495,368),pt(710,448),pt(620,548,{plate:true})]],
 [[pt(340,548),pt(260,448),pt(480,438),pt(725,448)],[pt(260,448),pt(480,438),pt(570,548),pt(725,448)]],
 [[pt(145,548,{spring:true}),pt(365,418,{spring:true}),pt(610,298),pt(815,418)]] ,
 [[pt(270,458),pt(390,368),pt(500,278),pt(390,368,{plate:true})],[pt(730,458),pt(595,368,{plate:true})]],
 [[pt(0,0,{platform:1}),pt(500,468,{spring:true}),pt(0,0,{platform:3})]],
 [[pt(300,448),pt(500,358),pt(715,448),pt(300,448,{plate:true})],[pt(300,448),pt(500,358),pt(715,448,{plate:true})]],
 [[pt(245,468),pt(415,388),pt(590,308),pt(770,248),pt(935,248)]],
 [[pt(95,548,{spring:true}),pt(260,438,{plate:true}),pt(430,358),pt(620,438),pt(790,358)],[pt(95,548,{spring:true}),pt(255,438),pt(430,358),pt(620,438),pt(790,358,{plate:true})]],
 [[pt(140,548,{spring:true}),pt(365,428,{spring:true}),pt(610,308),pt(420,428,{plate:true}),pt(360,428,{spring:true}),pt(610,308),pt(815,428)],[pt(140,548,{spring:true}),pt(365,428,{spring:true}),pt(610,308,{plate:true}),pt(815,428)]]
];
function targetOf(s,t){return t.platform!==undefined?{...t,x:E.platformAt(E.levels[s.level].platforms[t.platform],s.t).x+70,y:E.platformAt(E.levels[s.level].platforms[t.platform],s.t).y}:t;}
function control(s,i,target,mem){const p=s.players[i],l=E.levels[s.level],g=targetOf(s,target);const dx=g.x-p.x,dy=g.y-p.y;let left=false,right=false,jump=false;
 const stopping=p.vx*p.vx/5200+3;
 if(Math.abs(dx)>Math.max(5,Math.sign(dx)===Math.sign(p.vx)?stopping:0)){left=dx<0;right=dx>0;}
 if(p.ground){
  const current=p.standing>=0?E.platformAt(l.platforms[p.standing],s.t):null;
  const onSame=current&&g.x>=current.x-5&&g.x<=current.x+current.w+5&&Math.abs(g.y-current.y)<8;
  const nearEdge=current&&(dx>0?p.x>current.x+current.w-27:p.x<current.x+27);
  const canJump=Math.abs(dx)<185&&dy>=-106;
  if(!onSame&&!target.spring&&(dy<-8||nearEdge)&&canJump&&!p.held)jump=true;
  if(nearEdge&&!onSame&&!canJump&&dy<0){left=false;right=false;}
 }else jump=true;
 return {left,right,jump};}
function runLevel(level,maxFrames=36000){const s=E.create(level),paths=[routes[level][0],routes[level][1]||routes[level][0]].map(r=>r.map(g=>({...g})));let phase=[0,0],trace=[],lastRescues=0;
 for(let frame=0;frame<maxFrames&&!s.won;frame++){
  const inputs=[];
  for(let i=0;i<2;i++){
   const p=s.players[i],path=paths[i];let g=path[Math.min(phase[i],path.length-1)];g=targetOf(s,g);
   if(phase[i]<path.length&&Math.abs(p.x-g.x)<(g.spring?35:g.plate?15:22)&&Math.abs(p.y-g.y)<15){if(!g.plate||s.gateOpen){phase[i]++;trace.push([frame,i,phase[i],Math.round(p.x),Math.round(p.y)]);}}
   if(phase[i]>=path.length){if(!s.gateOpen)inputs.push({});else{
    inputs.push(control(s,i,E.levels[level].exit,{}));
   }}else inputs.push(control(s,i,path[phase[i]],{}));
  }
  E.step(s,inputs);
  if(s.rescues>lastRescues){phase=[0,0];lastRescues=s.rescues;}
 }
 return {s,phase,trace};
}
if(require.main===module){for(let i=0;i<10;i++){const r=runLevel(i,18000);console.log(JSON.stringify({level:i+1,won:r.s.won,time:r.s.t,stars:r.s.stars,gate:r.s.gateOpen,rescues:r.s.rescues,phase:r.phase,players:r.s.players.map(p=>[Math.round(p.x),Math.round(p.y),p.ground]),trace:r.trace.slice(-8)}));}}
module.exports={runLevel,control,routes,pt};
