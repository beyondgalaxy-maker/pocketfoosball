/* Input-only author solutions: these controllers never mutate simulation state. */
const E=require('../expansion.js');
const pt=(x,y=548,extra={})=>({x,y,...extra});
function control(s,i,g){const p=s.players[i],l=E.levels[s.level];if(g.platform!==undefined){const b=E.platformAt(l.platforms[g.platform],s.t);g={...g,x:b.x+b.w/2,y:b.y};}
 const dx=g.x-p.x,dy=g.y-p.y,stopping=p.vx*p.vx/5200+3;let left=false,right=false,jump=false,dash=false;
 if(Math.abs(dx)>Math.max(4,Math.sign(dx)===Math.sign(p.vx)?stopping:0)){left=dx<0;right=dx>0;}
 if(p.ground){const current=p.standing>=0?E.platformAt(l.platforms[p.standing],s.t):{x:p.x-10,y:p.y,w:20};const same=g.x>=current.x-5&&g.x<=current.x+current.w+5&&Math.abs(g.y-current.y)<8;const edge=dx>0?p.x>current.x+current.w-26:p.x<current.x+26;
 const canJump=Math.abs(dx)<195&&dy>=-106||p.dashUnlocked&&dy>=-106;
 if(!same&&(!g.spring||dy<-8)&&(dy<-8||edge)&&canJump&&!p.held)jump=true;
 if(edge&&!same&&!canJump&&dy<0){left=false;right=false;}
 // Skip a portal or phase switch without touching it, unless it is the destination.
 for(const q of [...(g.skip?l.portals:[]),...l.switches,...(g.nopush?s.crates.map(c=>({x:c.x+c.w/2,y:c.y+c.h})):[])]){if(Math.abs(g.x-q.x)<28)continue;const d=(q.x-p.x)*Math.sign(dx);if(d>20&&d<85&&Math.abs(q.y-p.y)<12&&!p.held)jump=true;}
 if(g.hop&&!p.held)jump=true;
 }else{jump=p.held||p.vy< -100;if(g.dash!==false&&p.dashUnlocked&&p.dashReady&&p.dashTime<=0&&Math.abs(dx)>125&&p.vy> -80&&p.y<=g.y+3&&!p.dashHeld)dash=true;}
 // Wait before a beam until there is enough quiet time to clear it.
 if(p.ground)for(const b of l.beams){if(p.y<b.y||p.y-E.PH>b.y+b.h)continue;const d=(b.x-p.x)*Math.sign(dx);const phase=(s.t+(b.offset||0))%(b.period||3);if(d>25&&d<70&&Math.abs(dx)>d&&(E.beamOn(s,b)||(b.period||3)-phase<.5)){left=false;right=false;jump=false;}}
 return {left,right,jump,dash};}
function solve(level,commands){const s=E.create(level);const trace=[];let frames=0,phase=0;const tick=ins=>{E.step(s,ins);frames++;if(s.dead)throw Error('death at phase '+phase+' '+JSON.stringify({t:s.t,p:s.players.map(p=>[p.x,p.y,p.vy]),stars:s.stars,phase:s.phase,keys:s.keys,doors:s.doors,crates:s.crates}));};
 const hold=()=>s.players.map(p=>pt(p.x,p.y));
 function run(targets,opts={}){const passed=[false,false],stops=[null,null];for(let f=0;f<(opts.max||1800);f++){let done=true;const ins=targets.map((g,i)=>{if(!g)return {};const p=s.players[i];if(g.warp&&p.portalLock&&Math.abs(p.x-g.x)>100){passed[i]=true;stops[i]=pt(p.x,p.y);}if(g.spring&&p.vy<-600&&Math.abs(p.x-g.x)<34)passed[i]=true;if(passed[i])return stops[i]?control(s,i,stops[i]):{jump:true};let x=g.x,y=g.y;if(g.platform!==undefined){const b=E.platformAt(E.levels[level].platforms[g.platform],s.t);x=b.x+b.w/2;y=b.y;}if(Math.abs(p.x-x)>12||Math.abs(p.y-y)>4||!p.ground)done=false;return control(s,i,g);});
 if(opts.until&&opts.until(s))return;if(!opts.until&&done)return;tick(ins);}throw Error('timeout phase '+phase+' '+JSON.stringify({targets,p:s.players.map(p=>[p.x,p.y,p.ground]),stars:s.stars,keys:s.keys,phase:s.phase,doors:s.doors,crates:s.crates}));}
 for(const cmd of commands){if(s.won)break;if(cmd.wait){for(let f=0;f<cmd.wait;f++)tick([{},{}]);}
 else if(cmd.both)run([cmd.both,cmd.both],cmd);
 else{const targets=hold();for(const [i,g] of Object.entries(cmd.go||{}))targets[Number(i)]=g;run(targets,cmd);}
 trace.push({phase,frames,players:s.players.map(p=>[Math.round(p.x),Math.round(p.y)]),stars:s.stars.slice()});phase++;}
 if(!s.won)run([E.levels[level].exit,E.levels[level].exit],{until:s=>s.won});return {s,frames,trace};}
const both=(x,y=548,extra={})=>({both:pt(x,y,extra)}),go=(i,x,y=548,extra={})=>({go:{[i]:pt(x,y,extra)}});
const warp=(i,x,y,side)=>({go:{[i]:pt(x,y)},until:s=>side(s.players[i])});
const plans={
10:[both(300),both(750),both(875)],
11:[both(155),both(425,548,{skip:true}),both(230,548,{warp:true}),both(775)],
12:[go(0,250,548,{warp:true}),go(1,290,548,{warp:true}),go(1,780),go(0,545),go(0,585,548,{warp:true}),both(900,548,{skip:true})],
13:[go(0,270),go(0,185),go(1,380,548,{warp:true}),go(1,765),go(0,380,548,{warp:true}),both(890)],
14:[go(0,400),both(870)],
15:[both(100),both(275,548,{skip:true}),both(370,458),both(535,378),both(175),both(890)],
16:[both(170),both(240),both(640),both(840)],
17:[both(175),both(225,548,{spring:true}),both(790),both(890)],
18:[both(190),both(280,548,{warp:true}),both(460,368),both(675,278),both(875,368),both(980)],
19:[go(0,220,548,{warp:true}),go(0,760),go(0,650,548,{warp:true}),go(0,425,548,{skip:true}),go(1,220,548,{warp:true}),go(0,220,548,{warp:true}),both(895)],
20:[go(0,380),go(0,310),go(0,470,548,{nopush:true}),go(1,840,548,{nopush:true}),go(0,840)],
21:[go(0,325),go(0,440,548,{hop:true}),both(465,548,{nopush:true}),both(635,548,{hop:true}),both(865)],
22:[go(0,285),go(0,185),go(1,545),go(1,610),go(0,855),both(900)],
23:[both(240),both(500),both(820)],
24:[both(145),both(345,463),both(530,378),both(715,463),both(920)],
25:[both(330,458),both(560,378),go(0,720,458),go(0,760,458),go(0,710,458),go(0,790,426,{nopush:true}),go(0,825,458),go(1,825,458,{nopush:true}),both(935)],
26:[go(0,320),go(0,260),go(0,450,548,{nopush:true}),go(1,680,548,{nopush:true}),go(1,650),both(890)],
27:[both(80),both(245,548,{skip:true}),both(300,548,{warp:true}),both(570),both(480,548,{warp:true}),both(150),both(300,548,{warp:true}),both(585,548,{warp:true}),both(875)],
28:[go(0,355),go(0,280),go(0,470,548,{nopush:true}),go(1,875,548,{nopush:true}),go(0,875)],
29:[go(0,205,548,{warp:true}),go(0,625),go(0,455,548,{warp:true}),go(1,280,548,{warp:true}),go(1,825),go(1,760,548,{warp:true}),both(145),both(325,548,{skip:true,warp:true}),both(935)],
30:[both(140),both(312,458),both(480,368),both(650,278),both(820,368),both(950,458)],
31:[both(170),both(205),both(535,478),both(890)],
32:[both(140),both(310,458),both(490,368),both(670,458),both(845,468),both(955)],
33:[go(1,300,548,{nopush:true}),go(1,220),go(0,345,548,{warp:true,nopush:true}),go(0,710),go(0,580,548,{warp:true}),go(1,275),go(0,100,548,{nopush:true}),go(0,190),go(0,140),go(0,300,548,{nopush:true}),go(1,345,548,{warp:true,nopush:true}),go(0,345,548,{warp:true}),both(890)],
34:[both(200),both(395),both(635),both(875)],
35:[both(100),both(300,458,{skip:true}),both(300,458),both(465,368),both(175),both(630,458),{both:pt(800,368),until:s=>s.stars.every(Boolean)},both(935)],
36:[go(1,270),go(1,190),go(0,300,548,{warp:true}),go(0,460,368),go(0,610,278),go(0,780,188),go(0,890),go(1,300,548,{warp:true}),go(1,890)],
37:[go(0,175),go(0,335),go(0,270),go(0,490,548,{nopush:true}),go(1,560,548,{nopush:true}),go(1,740),go(0,740),both(890)],
38:[both(120),both(165,548,{spring:true}),both(395,388,{platform:1,dash:false}),both(685,298,{spring:true}),both(920,458)],
39:[go(0,170),go(0,245,548,{hop:true}),go(0,295,548,{warp:true}),go(0,540,458),go(0,490,458,{warp:true}),go(0,235,516),go(1,295,548,{warp:true,nopush:true}),go(0,295,548,{warp:true}),both(535,458),both(710,368),both(945,458)]
};
if(require.main===module){const out=[];for(const [id,plan] of Object.entries(plans)){try{const r=solve(+id,plan);const result={level:+id+1,won:r.s.won,time:r.s.t,frames:r.frames};console.log(JSON.stringify(result));out.push(result);}catch(e){console.error(JSON.stringify({level:+id+1,error:e.message}));process.exitCode=1;}}require('fs').writeFileSync(__dirname+'/v2/solutions-results.json',JSON.stringify(out,null,2));}
module.exports={E,control,solve,plans,both,go,pt};
