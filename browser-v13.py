"""Native pointer regression; GAME_URL checks the deployed origin, otherwise local HTML."""
import json, os, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'browser-check-v13';OUT.mkdir(exist_ok=True)
URL=os.environ.get('GAME_URL');results=[];errors=[]
def check(name,ok,**m):
 results.append({'name':name,'passed':bool(ok),'metrics':m});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name)
def touch(cdp,kind,x=0,y=0):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'id':1}]})
def fixture(p):
 p.evaluate('''()=>{const g=touchline,w=g.world;g.resetRally();g.inputBridge.select(5);for(const r of w.rods){delete r.__assist13;r.releaseAt=r.driveUntil=-1;r.pinIntent=false;r.theta=r.targetTheta=1.48;r.y=r.targetY=0;}const r=w.rods[5];r.theta=r.targetTheta=-.3;Object.assign(w.ball,{x:r.x+.037,y:.34,z:.017,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0});w.stats.tapShots=0;w.serveRemaining=w.goalLock=0;}''')
def load(ctx,prefs=None):
 p=ctx.new_page();p.set_default_timeout(8000);p.on('pageerror',lambda e:errors.append(str(e)))
 if URL:
  res=p.goto(URL,wait_until='networkidle');check('Anonymous public page returns OK',res.status==200)
 else:
  storage='<script>window.__prefs='+json.dumps(prefs or {})+';Object.defineProperty(window,"localStorage",{value:{getItem:k=>window.__prefs[k]??null,setItem:(k,v)=>window.__prefs[k]=String(v)}});</script>'
  p.set_content((ROOT/'touchline.html').read_text().replace('<head>','<head>'+storage))
 p.wait_for_function('touchline.version==="13.0.0"');p.evaluate('touchline.setMode("practice");touchline.start();touchline.setOverlayButtons(true);touchline.controls13.set({tap:true,helpers:true})');p.wait_for_timeout(120);return p
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  for name,width,height in [('portrait',390,844),('small',320,568),('landscape',844,390),('desktop',1440,900)]:
   ctx=b.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=width<900);p=load(ctx);cdp=ctx.new_cdp_session(p)
   check(name+': tap mode defaults on',p.evaluate('touchline.controls13.get().tap'))
   scale=p.evaluate('touchline.renderer.s');p.evaluate('touchline.controls13.set({helpers:false})');p.wait_for_timeout(60)
   check(name+': hiding helpers is optional and changes no table scale',not p.locator('.assist13:not(.red)').is_visible() and abs(p.evaluate('touchline.renderer.s')-scale)<.1)
   p.evaluate('touchline.controls13.set({helpers:true})');p.wait_for_timeout(60)
   rects=p.locator('.assist13:not(.red) button').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
   check(name+': four useful targets fit without reserving table space',all(r['height']>=44 and r['width']>=44 and r['x']>=0 and r['right']<=width and r['y']>=0 and r['bottom']<=height for r in rects))
   check(name+': PIN and Practice re-serve remain accessible',p.locator('#dockPin0').is_visible() and p.locator('#practiceReserve').is_visible())
   fixture(p);p.locator('#blueDock [data-rod="5"]').tap();p.wait_for_timeout(240)
   check(name+': actual touch tap produces one shot and ball contact',p.evaluate('touchline.world.stats.tapShots===1&&touchline.world.touchLog.some(t=>t.kind==="Tap shot")'))
   check(name+': touch ends with no stuck finger',p.evaluate('!touchline.world.rods[5].controlled&&touchline.inputBridge.points.size===0'))
   fixture(p);p.locator('.assist13:not(.red) [data-assist="pass"]').tap();p.wait_for_timeout(230)
   check(name+': soft-pass button drives an actual contact',p.evaluate('touchline.world.touchLog.some(t=>t.kind==="Tap pass")'))
   fixture(p);p.locator('.assist13:not(.red) [data-assist="left"]').tap();p.wait_for_timeout(720)
   check(name+': side helper drives actual lateral foot contact',p.evaluate('touchline.world.touchLog.some(t=>t.kind==="Side touch")'))
   fixture(p);p.evaluate('touchline.world.rods[5].theta=touchline.world.rods[5].targetTheta=1.4');p.locator('.assist13:not(.red) [data-assist="ready"]').tap();p.wait_for_timeout(400)
   check(name+': explicit Ready returns the raised figure',p.evaluate('Math.abs(Foos.wrap(touchline.world.rods[5].theta+.3))<.06'))
   fixture(p);box=p.locator('#blueDock [data-rod="5"]').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
   touch(cdp,'touchStart',x,y);p.wait_for_timeout(300)
   check(name+': holding the pad supplies a firm hand',p.evaluate('touchline.world.rods[5].__gripped13'))
   touch(cdp,'touchEnd');p.wait_for_timeout(80)
   check(name+': holding then releasing never fires a tap shot',p.evaluate('(touchline.world.stats.tapShots||0)===0'))
   check(name+': released row is passively braked, not actively held',p.evaluate('!touchline.world.rods[5].__gripped13'))
   fixture(p);touch(cdp,'touchStart',x,y);touch(cdp,'touchMove',x+20,y);touch(cdp,'touchMove',x,y);touch(cdp,'touchEnd');p.wait_for_timeout(60)
   check(name+': dragging out and back cannot accidentally shoot',p.evaluate('(touchline.world.stats.tapShots||0)===0'))
   fixture(p);p.locator('#blueDock [data-rod="5"]').tap();p.wait_for_timeout(90);p.locator('#blueDock [data-rod="5"]').tap();p.wait_for_timeout(80)
   check(name+': two taps fire twice instead of resetting the angle',p.evaluate('touchline.world.stats.tapShots===2'))
   p.evaluate('touchline.controls13.set({tap:false});touchline.world.stats.tapShots=0');p.locator('#blueDock [data-rod="5"]').tap();p.wait_for_timeout(80)
   check(name+': manual-only mode does not turn a tap into a shot',p.evaluate('touchline.world.stats.tapShots===0'))
   fixture(p);p.evaluate('touchline.controls13.set({tap:true});touchline.world.setPin(touchline.world.rods[5],true)');p.locator('#blueDock [data-rod="5"]').tap();p.wait_for_timeout(80)
   check(name+': a tap never converts PIN to an automatic snake',p.evaluate('touchline.world.stats.tapShots===0&&touchline.world.rods[5].pinIntent'))
   fixture(p);p.keyboard.down('q');p.keyboard.down('w');p.keyboard.down('e');p.keyboard.down('r');p.wait_for_timeout(100)
   check(name+': keyboard cannot power more than two hands',p.evaluate('touchline.world.rods.filter(r=>r.team===0&&r.__gripped13).length<=2'))
   for k in ['q','w','e','r']:p.keyboard.up(k)
   p.evaluate('touchline.controls13.set({tap:false,helpers:false})')
   if URL:
    p.reload(wait_until='networkidle');p.wait_for_function('touchline.controls13');saved=p.evaluate('touchline.controls13.get()')
   else:
    prefs=p.evaluate('window.__prefs');q=ctx.new_page();storage='<script>window.__prefs='+json.dumps(prefs)+';Object.defineProperty(window,"localStorage",{value:{getItem:k=>window.__prefs[k]??null,setItem:(k,v)=>window.__prefs[k]=String(v)}});</script>';q.set_content((ROOT/'touchline.html').read_text().replace('<head>','<head>'+storage));q.wait_for_function('touchline.controls13');saved=q.evaluate('touchline.controls13.get()');q.close()
   check(name+': saved choices restore without resetting other controls',saved=={'tap':False,'helpers':False})
   p.evaluate('touchline.controls13.set({tap:true,helpers:true});touchline.setMode("practice");touchline.start();touchline.setOverlayButtons(true)');p.wait_for_timeout(100);p.screenshot(path=str(OUT/(name+'-play.png')))
   p.evaluate('touchline.openSettings();touchline.setMenuTab("controls")');p.locator('#tapControls13').scroll_into_view_if_needed();p.screenshot(path=str(OUT/(name+'-settings.png')));ctx.close()
  check('No JavaScript exceptions in native pointer testing',not errors,errors=errors);b.close()
finally:
 (OUT/'results.json').write_text(json.dumps({'passed':sum(x['passed'] for x in results),'total':len(results),'url':URL,'checks':results,'errors':errors},indent=2))
