'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const F=require('./engine');require('./rolling').installPhysics(F);require('./bot-control')(F);require('./v11').installPhysics(F);require('./v12').installPhysics(F);const V=require('./v13');V.install(F);const N=require('./online');
const results=[];function test(name,f){try{const metrics=f();results.push({name,passed:true,metrics});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL '+name,e.message);}}
function step(w,n,fn){for(let i=0;i<n;i++){fn?.(i);w.step();w.events=[];}}
function single(id=5){const w=new F.World(35),r=w.rods[id];w.rules=false;w.walls=[];w.rods=[r];return {w,r};}
function block(speed,held,id=5){const {w,r}=single(id);r.theta=r.targetTheta=0;r.controlled=held;const sign=r.dir;Object.assign(w.ball,{x:r.x-sign*.055,y:r.bases[Math.floor(r.bases.length/2)],z:F.C.radius,vx:sign*speed,vy:0,vz:0,wx:0,wy:sign*speed/F.C.radius,wz:0});let angle=0;step(w,192,()=>{angle=Math.max(angle,Math.abs(r.theta));});return {angle,w,r};}
for(const [label,x,y,t,ok]of[['quick',2,1,70,true],['hold',0,0,260,false],['drag',20,0,100,false],['reverse clock',0,0,-1,false]])test('Tap classifier: '+label,()=>assert.equal(new V.Tap(0,0,0).valid(x,y,t),ok));
test('Shaking back to the origin does not become a shot',()=>{const t=new V.Tap(0,0,0);t.move(15,0);assert.equal(t.valid(0,0,160),false);});
for(const id of [2,5])for(const p of [.12,.48])test('Tap makes a physical '+(p<.2?'pass':'shot')+' from row '+id,()=>{
 const {w,r}=single(id);Object.assign(w.ball,{x:r.x+r.dir*.037,y:.34,z:F.C.radius});const before=JSON.stringify(w.ball);assert.ok(V.shot(F,w,r,p));assert.equal(JSON.stringify(w.ball),before);let peak=0;step(w,120,()=>peak=Math.max(peak,w.ball.vx*r.dir));assert.ok(w.touchLog.length);assert.ok(p<.2?peak>.4&&peak<2:peak>2.5);assert.ok(Math.abs(F.wrap(r.theta+.3*r.dir))<.02);return {peak_m_s:peak};
});
test('A tap with a misaligned figure misses instead of auto-aiming',()=>{const {w,r}=single();r.y=r.targetY=.085;Object.assign(w.ball,{x:r.x+.037,y:.34});assert.ok(V.shot(F,w,r));step(w,100);assert.equal(w.touchLog.length,0);});
test('A pin is not silently converted into an automatic snake',()=>{const {w,r}=single();w.setPin(r,true);const target=r.targetTheta;assert.equal(V.shot(F,w,r),false);assert.equal(r.targetTheta,target);});
for(const state of ['paused','serveRemaining','goalLock'])test('Tap respects '+state,()=>{const {w,r}=single();w[state]=state==='paused'?true:1;assert.equal(V.shot(F,w,r),false);});
for(const side of [-1,1])test('Side-touch helper produces lateral contact '+side,()=>{const {w,r}=single();Object.assign(w.ball,{x:r.x+.036,y:.34});const before=JSON.stringify(w.ball);assert.ok(V.sideTouch(F,w,r,side));assert.equal(JSON.stringify(w.ball),before);let peak=0;step(w,170,()=>peak=Math.max(peak,w.ball.vy*side));assert.ok(peak>.3);assert.ok(w.touchLog.some(t=>t.kind==='Side touch'));return {peak_m_s:peak};});
test('A side touch can reach and contact a second figure',()=>{const {w,r}=single();Object.assign(w.ball,{x:r.x+.036,y:.34});V.sideTouch(F,w,r,-1);step(w,185);assert.ok(new Set(w.touchLog.map(t=>t.man)).size>=2);return {figures:[...new Set(w.touchLog.map(t=>t.man))]};});
test('A new manual grip cancels a queued helper stroke',()=>{const {w,r}=single();V.shot(F,w,r);assert.ok(V.cancelAssist(r));assert.equal(r.__assist13,undefined);assert.equal(r.strikeTarget,null);assert.equal(r.driveUntil,-1);});
test('Helper cannot take a third hand',()=>{const w=new F.World();w.rods[0].controlled=w.rods[1].controlled=true;assert.equal(V.shot(F,w,w.rods[5]),false);assert.equal(V.ready(F,w,w.rods[3]),false);});
for(const id of [2,5])test('Firm held blocks and finite unheld resistance at end '+id,()=>{const soft=block(1.5,false,id),hard=block(12,false,id),held=block(12,true,id);assert.ok(soft.angle<.09);assert.ok(hard.angle>1.4);assert.ok(held.angle<.12);assert.ok(hard.angle>held.angle*15);return {soft_degrees:soft.angle*180/Math.PI,hard_degrees:hard.angle*180/Math.PI,held_degrees:held.angle*180/Math.PI};});
test('An unheld raised figure stays at its deliberate angle',()=>{const {w,r}=single();r.theta=r.targetTheta=1.45;Object.assign(w.ball,{x:.1,y:.4});step(w,720);assert.equal(r.theta,1.45);});
test('An impact-opened foot leaves a physical lane for the following ball',()=>{const {w,r}=block(12,false);assert.ok(Math.abs(r.theta)>1.4);Object.assign(w.ball,{x:r.x-.06,y:.34,z:F.C.radius,vx:2,vy:0,vz:0,wx:0,wy:2/F.C.radius,wz:0});step(w,35);assert.ok(w.ball.x>r.x+.06);});
test('Four keyboard-like requests cannot create four powered grips',()=>{const w=new F.World();for(const r of w.rods)if(r.team===0){r.controlled=true;r.targetY=.08;}w.step();assert.equal(w.rods.filter(r=>r.team===0&&r.__gripped13).length,2);});
for(const level of [0,1,2,3,4])for(const profile of ['bob','maya','theo','iris','kai'])test('Two-hand budget and transfer delay: '+profile+' '+level,()=>{
 const w=new F.World(94),b=new F.Brain(1,level,63,profile);w.reset(1);let peak=0,transfers=0;
 for(let i=0;i<1200;i++){
  const ball=JSON.stringify(w.ball);b.update(w,F.C.fixedDt);assert.equal(JSON.stringify(w.ball),ball);
  assert.ok(b.hands13.length<=2);for(const h of b.hands13)if(w.time<h.ready){assert.ok(!w.rods[h.rod].__botHeld13);transfers++;}
  peak=Math.max(peak,w.rods.filter(r=>r.__botHeld13).length);
  for(const r of w.rods)if(r.team===1&&!r.__botHeld13){assert.equal(r.pinIntent,false);assert.equal(r.targetY,r.y);assert.equal(r.targetTheta,r.theta);assert.ok(r.driveUntil<=w.time);}
  w.step();w.events=[];
 }
 assert.ok(peak===2&&transfers>0);return {peakHands:peak,transferFrames:transfers,contacts:w.stats.contacts};
});
test('Online pass carries only bounded rod intent, not ball authority',()=>{const w=new F.World(),r=w.rods[5];V.shot(F,w,r,.12);w.step();const p=N.captureInput(w,1,1,false),host=new F.World();const old=JSON.stringify(host.ball);assert.ok(N.validInput(p)&&N.applyInput(host,p,F));host.moveRods(F.C.fixedDt);assert.ok(host.rods[2].__gripped13);assert.equal(JSON.stringify(host.ball),old);});
test('Idle remote targets cannot impersonate a new local ready grip',()=>{const host=new F.World(),guest=new F.World();guest.rods[5].targetTheta=-1.2;const before=host.rods[2].theta;assert.ok(N.applyInput(host,N.captureInput(guest,1,1,false),F));host.moveRods(F.C.fixedDt);assert.equal(host.rods[2].theta,before);assert.ok(host.rods.filter(r=>r.team===1).every(r=>!r.__gripped13&&!r.__assist13));});
test('A reset releases every hand, pending pin and helper',()=>{const w=new F.World(),b=new F.Brain(1,4);w.time=1;b.update(w,F.C.fixedDt);V.shot(F,w,w.rods[5]);w.reset();for(const r of w.rods)assert.ok(!r.__assist13&&!r.__botHeld13&&!r.__pendingPin13&&!r.__gripped13);});
const passed=results.filter(r=>r.passed).length;fs.writeFileSync('v13-test-results.json',JSON.stringify({passed,total:results.length,results},null,2));console.log(`${passed}/${results.length} v13 checks`);process.exitCode=passed===results.length?0:1;
