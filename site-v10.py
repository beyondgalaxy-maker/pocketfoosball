"""Read-only, anonymous verification of the actual published v10 website."""
from pathlib import Path
from urllib.request import Request,urlopen
from datetime import datetime,timezone
import hashlib,json,time
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent
BASE='https://beyondgalaxy-maker.github.io/pocketfoosball/'
OUT=R/'site-check-v10';OUT.mkdir(exist_ok=True)
report={'url':BASE,'checked_at':datetime.now(timezone.utc).isoformat(),'checks':[],'errors':[],'assets':[]}
def check(name,ok,**values):
 report['checks'].append(dict(name=name,passed=bool(ok),metrics=values));print('PASS' if ok else 'FAIL',name,values,flush=True)
 if not ok:raise AssertionError(name)
def get(url):
 with urlopen(Request(url,headers={'Cache-Control':'no-cache','User-Agent':'PocketFoosball-check'}),timeout=20) as r:return r.status,r.headers.get('Content-Type',''),r.read()
def sha(b):return hashlib.sha256(b).hexdigest()
try:
 for attempt in range(40):
  try:
   status,mime,html=get(BASE+'?verify=v10');assert status==200 and 'text/html' in mime and b'id="playBtn"' in html
   assets=[]
   for name in ['engine.js','input.js','app.js','rolling.js','bot-control.js','styles.css']:
    expected=sha((R/name).read_bytes());status,mime,body=get(BASE+name+'?verify='+expected[:16]);assert status==200 and sha(body)==expected,name+' not deployed yet';assets.append({'file':name,'sha256':expected,'bytes':len(body)})
   report['assets']=assets;break
  except Exception as e:
   if attempt==39:raise
   print('Waiting for Pages:',str(e),flush=True);time.sleep(4)
 check('Public HTTPS page and all runtime assets match the tested commit',len(report['assets'])==6)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
  for name,width,height in [('desktop',1440,900),('portrait',390,844),('landscape',844,390)]:
   ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=width<900,extra_http_headers={'Cache-Control':'no-cache'})
   p=ctx.new_page();p.set_default_timeout(10000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   response=p.goto(BASE+'?v=10',wait_until='networkidle');p.wait_for_function('touchline.version==="10.0.0"&&document.getElementById("bindingEditor")')
   check(name+': public version 10 loads without signing in',response.status==200 and '10' in p.title())
   p.locator('#playBtn').click();check(name+': match starts with a readiness interval',p.evaluate('touchline.world.serveRemaining>0&&touchline.state==="playing"'))
   p.evaluate('touchline.setMode("practice");touchline.start();touchline.setOverlayButtons(true)');p.wait_for_timeout(100)
   check(name+': overlay dock, PIN, score and practice Re-serve are visible',all(p.locator(s).is_visible() for s in ['#blueDock','#dockPin0','#overlayScore','#practiceReserve']))
   large=p.evaluate('touchline.renderer.s');p.evaluate('touchline.setOverlayButtons(false);touchline.setTableOnly(true)');p.wait_for_timeout(75)
   check(name+': overlay keeps the same full-size table',abs(large-p.evaluate('touchline.renderer.s'))<.1)
   p.evaluate('touchline.setOverlayButtons(true);const r=touchline.world.rods[5];r.theta=r.targetTheta=1.2;r.y=r.targetY=.025;')
   box=p.locator('#blueDock [data-rod="5"]').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;cdp=ctx.new_cdp_session(p)
   for i in range(2):
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});p.wait_for_timeout(30)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});p.wait_for_timeout(70)
   p.wait_for_timeout(360)
   check(name+': actual touch double-tap resets only the chosen rod angle',p.evaluate('Math.abs(Foos.wrap(touchline.world.rods[5].theta+.3))<.03&&Math.abs(touchline.world.rods[5].y-.025)<.001&&touchline.activeTouches===0'))
   p.locator('#practiceReserve').click();check(name+': practice re-serve is callable at any time',p.evaluate('Math.abs(touchline.world.ball.x-.864)<.01'))
   check(name+': page has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   p.screenshot(path=str(OUT/(name+'-overlay.png')))
   p.reload(wait_until='networkidle');p.wait_for_function('touchline.version==="10.0.0"')
   check(name+': overlay preference survives a genuine full reload',p.evaluate('touchline.overlayButtons===true'))
   check(name+': no uncaught JavaScript errors',not errors,errors=errors);ctx.close()
  browser.close()
except Exception as e:
 report['errors'].append(str(e));raise
finally:
 report['passed']=sum(c['passed'] for c in report['checks']);report['total']=len(report['checks']);report['scope']='Public HTTPS in fresh anonymous Chromium profiles, real localStorage, emulated phone touch. Not physical-phone or Safari testing.'
 (R/'site-v10-results.json').write_text(json.dumps(report,indent=2))
