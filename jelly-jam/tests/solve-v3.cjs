/* Input-only author solutions: these controllers never mutate simulation state. */
const E=require('../engine-v3.js');
const pt=(x,y=548,extra={})=>({x,y,...extra});
function control(s,i,g){const p=s.players[i],l=E.levels[s.level];if(g.platform!==undefined){const b=E.platformAt(l.platforms[g.platform],s.t);g={...g,x:b.x+b.w/2,y:b.y};}
 const dx=g.x-p.x,dy=g.y-p.y,stopping=p.vx*p.vx/5200+3;let left=false,right=false,jump=false,dash=false;
 if(Math.abs(dx)>Math.max(4,Math.sign(dx)===Math.sign(p.vx)?stopping:0)){left=dx<0;right=dx>0;}
 if(g.fly){let j=s.crates.some(c=>(c.x+c.w/2-p.x)*Math.sign(dx)>25&&(c.x+c.w/2-p.x)*Math.sign(dx)<80&&p.ground&&Math.abs(c.y+c.h-p.y)<10&&!p.held);return {left,right,jump:j||(!p.ground&&p.held)};}if(p.ground){const current=p.standing>=0?E.platformAt(l.platforms[p.standing],s.t):{x:p.x-10,y:p.y,w:20};const same=g.x>=current.x-5&&g.x<=current.x+current.w+5&&Math.abs(g.y-current.y)<8;const edge=dx>0?p.x>current.x+current.w-26:p.x<current.x+26;
 const canJump=Math.abs(dx)<195&&dy>=-106||p.dashUnlocked&&dy>=-106;
 if(!same&&(!g.spring||dy<-8)&&(dy<-8||edge)&&canJump&&!p.held)jump=true;
 if(edge&&!same&&!canJump&&dy<0){left=false;right=false;}
 // Skip a portal or phase switch without touching it, unless it is the destination.
 for(const q of [...(g.skip?l.portals:[]),...l.switches,...(g.skipRunes?l.runes:[]),...(g.nopush?s.crates.map(c=>({x:c.x+c.w/2,y:c.y+c.h})):[])]){if(Math.abs(g.x-q.x)<28)continue;const d=(q.x-p.x)*Math.sign(dx);if(d>20&&d<85&&Math.abs(q.y-p.y)<12&&!p.held)jump=true;}
 if(g.hop&&!p.held)jump=true;
 }else{jump=p.held||p.vy< -100;if(g.dash!==false&&p.dashUnlocked&&p.dashReady&&p.dashTime<=0&&Math.abs(dx)>125&&p.vy> -80&&p.y<=g.y+3&&!p.dashHeld)dash=true;}
 // Wait before a beam until there is enough quiet time to clear it.
 if(p.ground)for(const b of l.beams){if(p.y<b.y||p.y-E.PH>b.y+b.h)continue;const d=(b.x-p.x)*Math.sign(dx);const phase=(s.t+(b.offset||0))%(b.period||3);if(d>25&&d<70&&Math.abs(dx)>d&&(E.beamOn(s,b)||(b.period||3)-phase<.5)){left=false;right=false;jump=false;}}
 return {left,right,jump,dash};}
function solve(level,commands){const s=E.create(level);const trace=[];let frames=0,phase=0;const tick=ins=>{E.step(s,ins);frames++;if(s.dead)throw Error('death at phase '+phase+' '+JSON.stringify({t:s.t,p:s.players.map(p=>[p.x,p.y,p.vy]),stars:s.stars,phase:s.phase,keys:s.keys,doors:s.doors,crates:s.crates}));};
 const hold=()=>s.players.map(p=>pt(p.x,p.y,{passive:true}));
 function run(targets,opts={}){const passed=[false,false],stops=[null,null];for(let f=0;f<(opts.max||1800);f++){let done=true;const ins=targets.map((g,i)=>{if(!g)return {};const p=s.players[i];if(g.warp&&p.portalLock&&Math.abs(p.x-g.x)>100){passed[i]=true;stops[i]=pt(p.x,p.y);}if(g.spring&&p.vy<-600&&Math.abs(p.x-g.x)<34)passed[i]=true;if(passed[i])return stops[i]?control(s,i,stops[i]):{jump:true};let x=g.x,y=g.y;if(g.platform!==undefined){const b=E.platformAt(E.levels[level].platforms[g.platform],s.t);x=b.x+b.w/2;y=b.y;}if(!g.passive&&(Math.abs(p.x-x)>12||Math.abs(p.y-y)>4||!p.ground))done=false;return control(s,i,g);});
 if(opts.until&&opts.until(s))return;if(!opts.until&&done)return;tick(ins);}throw Error('timeout phase '+phase+' '+JSON.stringify({targets,p:s.players.map(p=>[p.x,p.y,p.ground]),stars:s.stars,keys:s.keys,phase:s.phase,doors:s.doors,crates:s.crates}));}
 for(const cmd of commands){if(s.won)break;if(cmd.use){const ins=[{},{}];for(const i of cmd.use)ins[i]={action:true};tick(ins);tick([{},{}]);}
 else if(cmd.wait){for(let f=0;f<cmd.wait;f++)tick([{},{}]);}
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
36:[go(0,175),go(0,335),go(0,270),go(0,490,548,{nopush:true}),go(1,560,548,{nopush:true}),go(1,740),go(0,740),both(890)],
37:[go(0,175),go(0,335),go(0,270),go(0,490,548,{nopush:true}),go(1,560,548,{nopush:true}),go(1,740),go(0,740),both(890)],
38:[both(120),both(165,548,{spring:true}),both(395,388,{platform:1,dash:false}),both(685,298,{spring:true}),both(920,458)],
39:[go(0,170),go(0,245,548,{hop:true}),go(0,295,548,{warp:true}),go(0,540,458),go(0,490,458,{warp:true}),go(0,235,516),go(1,295,548,{warp:true,nopush:true}),go(0,295,548,{warp:true}),both(535,458),both(710,368),both(945,458)]
};

const lift=(x,y,who=null)=>{const g=pt(x,y,{fly:true,nopush:true});return who===null?{both:g,until:s=>s.players.every(p=>Math.abs(p.x-x)<25&&p.y<y+5),max:3600}:{go:{[who]:g},until:s=>Math.abs(s.players[who].x-x)<25&&s.players[who].y<y+5,max:3600};};
const use=(i)=>({use:[i]}),wait=(n=60)=>({wait:n});
const B=both,G=go,W=wait,L=lift,U=use;
const skip={skip:true,nopush:true,skipRunes:true};
Object.assign(plans,{
40:[B(175),L(335,220),B(500,270),B(585,270),B(800,548)],
41:[G(0,300),G(0,185),L(485,240,1),G(1,740,300),G(1,855,300),L(485,240,0),G(0,810,300),B(960,548)],
42:[G(0,250),G(0,400),U(0),B(600),B(880)],
43:[G(0,590),G(0,700,548,{nopush:true}),G(1,600,548,{nopush:true}),B(880)],
44:[G(0,385,548,{nopush:true}),G(0,241),G(0,450),U(0),G(1,350,548,{nopush:true}),G(0,350),L(615,210),B(760,270),B(865,270)],
45:[G(0,270,458),G(0,425,388),W(65),U(0),B(600),B(750)],
46:[G(0,374),G(0,470,548,{nopush:true}),G(1,470,548,{nopush:true}),L(630,210),B(770,270),B(875,270)],
47:[G(0,375),G(0,500,548,{nopush:true}),G(1,600,548,{nopush:true}),B(880)],
48:[G(0,160,748),U(0),L(255,410),B(440,470),G(0,560,470),U(0),W(65),G(0,610,470),B(730,748,{warp:true}),L(1030,410),B(1220,470),B(1380,470),B(1500,748)],
49:[G(0,105,848),L(230,520,1),G(1,545,588),G(1,480,588),U(1),W(65),L(230,520,0),G(0,380,588),B(655,848,{warp:true}),B(900,848),L(1015,420),B(1210,488)],
50:[G(0,200),G(0,630,548,{skipRunes:true}),G(0,470),G(0,310),G(1,715),B(875)],
51:[G(0,300),G(0,550,548,{skipRunes:true}),G(0,610,548,{warp:true}),G(0,1000),G(0,835,548,{warp:true}),G(0,480),G(0,610,548,{warp:true}),G(1,610,548,{warp:true,skipRunes:true}),G(1,925),B(1260)],
52:[G(0,350,748,{nopush:true}),G(0,215,748),G(0,500,748),U(0),L(660,360,0),G(0,500,440),U(0),G(0,580,440),G(1,810,748,{nopush:true}),G(0,810,748),L(1150,390),B(1350,460)],
53:[G(0,175,748),G(0,430,748),L(590,410,1),G(1,855,480),G(0,880,748),G(0,1000,748,{nopush:true}),G(1,1040,748),B(1200,748)],
54:[G(0,100,848),G(0,310,758,{skip:true}),G(0,510,668),G(0,595,668),U(0),W(65),G(0,780,848,{warp:true}),G(1,780,848,{warp:true}),G(0,1520,848),B(1255,758),G(1,1490,668),B(1640,848,{skip:true})],
55:[B(255,570),B(495,500),B(815,430),B(1080,500),B(1210,500),B(1450,570),B(1750,480),B(2050,400),B(2410,480)],
56:[L(290,1050),B(470,1120),G(0,480,1120),U(0),L(665,740),B(855,810),G(0,925,810),U(0),L(565,430),B(780,500),L(550,105),B(760,170)],
57:[G(0,390,948,{nopush:true}),G(0,215,948),L(745,620,0),G(0,450,700),W(65),U(0),G(0,580,700),G(1,820,948,{nopush:true}),G(0,820,948),L(1045,620,1),G(1,1350,700),G(1,1580,948),G(1,1530,948),G(0,1580,948)],
58:[G(0,300,1048,{nopush:true}),G(0,180,1048),G(0,380,1048),G(0,435,1048),U(0),W(65),B(550,1048,{warp:true}),L(910,600),G(1,1100,680),G(0,1230,680,{skipRunes:true}),G(0,1130,680),G(0,1030,680),B(1280,1048),B(1210,1048,{warp:true}),L(1610,730),B(1780,810)],
59:[G(0,355,948,{nopush:true}),G(0,200,948),G(0,580,948),U(0),W(65),L(765,615,0),G(0,855,690),G(0,620,948,{warp:true}),G(1,620,948,{warp:true,nopush:true}),L(1255,710,1),G(1,1430,780),G(1,1490,780),U(1),W(65),G(0,1700,948,{skipRunes:true}),G(0,1650,948),G(0,1420,948),G(0,1130,948),B(1750,948,{warp:true}),B(2055,948),B(2235,858),B(2520,768),B(2730,858)]
});
plans[5]=[B(145),B(0,0,{platform:1}),B(500,468,{spring:true}),B(0,0,{platform:3}),B(930)];
if(require.main===module){const out=[];const ids=process.argv.slice(2).map(Number);for(const id of ids.length?ids:Array.from({length:20},(_,i)=>40+i)){try{const r=solve(id,plans[id]);console.log('PASS',id+1, r.s.t.toFixed(1)+'s',r.frames+' frames');out.push({level:id+1,won:r.s.won,time:r.s.t,frames:r.frames,trace:r.trace});}catch(e){console.error('FAIL',id+1,e.message);process.exitCode=1;}}require('fs').mkdirSync(__dirname+'/v3',{recursive:true});require('fs').writeFileSync(__dirname+'/v3/solutions-results.json',JSON.stringify(out,null,2));}
module.exports={E,control,solve,plans,both,go,pt,lift,use};
