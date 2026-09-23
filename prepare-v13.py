"""Build versioned verification scripts from the previous checked harnesses.
Existing assertions are retained. Tap mode is disabled during legacy touch checks
and then enabled for explicit new network stroke checks.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
s=(ROOT/'network-v12.py').read_text().replace('network-check-v12','network-check-v13').replace('12.0.0','13.0.0').replace('v:12','v:13')
s=s.replace("p.wait_for_function('window.touchline?.version===\"13.0.0\"')", "p.wait_for_function('window.touchline?.version===\"13.0.0\"');p.evaluate('touchline.controls13.set({tap:false})')")
anchor='   # Winning and a two-person rematch should not accidentally retain old score.'
assert s.count(anchor)==1
s=s.replace(anchor,'''   # Guest helper and tap strokes are transmitted as rod intent and strike
   # the host's authoritative ball, not a local-only visual animation.
   j.evaluate('touchline.controls13.set({tap:true});touchline.inputBridge.select(5)')
   for mode in ['tap','pass']:
    j.evaluate('for(const r of touchline.world.rods){TouchlineV13.cancelAssist(r);r.releaseAt=r.driveUntil=-1;r.strikeTarget=null;r.pinIntent=false;}')
    h.evaluate("""()=>{const w=touchline.world;for(const r of w.rods){TouchlineV13.cancelAssist(r);r.theta=r.targetTheta=1.48;r.y=r.targetY=0;r.vy=r.omega=0;r.releaseAt=r.driveUntil=-1;r.strikeTarget=null;r.pinIntent=false;}const r=w.rods[2];r.theta=r.targetTheta=.3;Object.assign(w.ball,{x:r.x-.037,y:.34,z:.017,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0});w.serveRemaining=w.goalLock=0;window.tapPeak13=0;window.tapContact13=w.touchLog.length;window.tapWatch13=setInterval(()=>window.tapPeak13=Math.max(window.tapPeak13,-w.ball.vx),3);touchline.online.snapshot(true);} """)
    j.wait_for_timeout(160)
    if mode=='tap':j.locator('#blueDock [data-rod="5"]').tap()
    else:j.locator('.assist13:not(.red) [data-assist="pass"]').tap()
    j.wait_for_timeout(520)
    check('Remote '+mode+' makes an authoritative physical contact',h.evaluate('tapPeak13>.35&&touchline.world.touchLog.length>tapContact13'),peak_m_s=h.evaluate('tapPeak13'))
    h.evaluate('clearInterval(window.tapWatch13)')
    j.wait_for_timeout(300)
   j.screenshot(path=str(OUT/'phone-tap-controls.png'))

'''+anchor)
(ROOT/'network-v13.py').write_text(s)
s=(ROOT/'site-v12.py').read_text().replace('site-check-v12','site-check-v13').replace('12.0.0','13.0.0').replace('?v=12','?v=13')
s=s.replace("'online.js','v12.js']", "'online.js','v12.js','v13.js']")
(ROOT/'site-v13.py').write_text(s)
(ROOT/'tests-preload-v13.cjs').write_text("const F=require('./engine');require('./rolling').installPhysics(F);require('./bot-control')(F);require('./v11').installPhysics(F);require('./v12').installPhysics(F);require('./v13').install(F);\n")

# The old wall fixture commanded an unheld servo. A hand is now required.
s=(ROOT/'probe-v12.cjs').read_text().replace('r.directGrip=true;', 'r.controlled=true;r.directGrip=true;')
(ROOT/'probe-v13.cjs').write_text(s)
