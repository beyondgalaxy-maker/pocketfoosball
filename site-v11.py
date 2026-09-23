"""Anonymous public Pages verification. This script does not alter the site."""
import os,time,json,hashlib,urllib.request,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'site-check-v11';OUT.mkdir(exist_ok=True)
URL='https://beyondgalaxy-maker.github.io/pocketfoosball/'
ASSETS=['index.html','styles.css','engine.js','app.js','input.js','rolling.js','bot-control.js','v11.js','online.js']
checks=[]
def check(name,ok,**metrics):
 checks.append({'name':name,'passed':bool(ok),'metrics':metrics});print(('PASS ' if ok else 'FAIL ')+name,metrics,flush=True)
 if not ok:raise AssertionError(name)
# Wait for branch-based Pages deployment; a stale successful page is not enough.
for attempt in range(70):
 try:
  mismatch=[]
  for name in ASSETS:
   request=urllib.request.Request(URL+name+'?releasecheck='+str(int(time.time())),headers={'Cache-Control':'no-cache'})
   actual=urllib.request.urlopen(request,timeout=15).read()
   if actual!=(ROOT/name).read_bytes():mismatch.append(name)
  if not mismatch:break
  print('Awaiting current Pages assets:',mismatch,flush=True)
 except Exception as e:print('Awaiting deployment:',str(e),flush=True)
 time.sleep(3)
else:raise AssertionError('Pages did not serve the current release within the verification window')
check('Every deployed runtime file matches this repository build byte for byte',True,files=ASSETS)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox']);errors=[]
  for name,width,height in [('portrait',390,844),('small-phone',320,640),('landscape',844,390),('desktop',1440,900)]:
   c=b.new_context(viewport={'width':width,'height':height},is_mobile=width<900,has_touch=True);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   response=page.goto(URL+'?v=11',wait_until='networkidle');page.wait_for_function('window.touchline?.version==="11.0.0"')
   check(name+': publicly accessible current game',response.status==200)
   page.evaluate('touchline.setMode("practice");touchline.start();touchline.setOverlayButtons(true)');page.wait_for_timeout(90)
   a=page.evaluate('touchline.renderer.s');page.evaluate('touchline.setOverlayButtons(false);touchline.setTableOnly(true)');page.wait_for_timeout(90)
   check(name+': overlay takes no size away from the full table',abs(a-page.evaluate('touchline.renderer.s'))<.1)
   page.evaluate('touchline.setOverlayButtons(true)');page.wait_for_timeout(90)
   pads=page.locator('#blueDock .dock-pad').evaluate_all('(es)=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,fill:getComputedStyle(e).backgroundColor,blur:getComputedStyle(e).backdropFilter}))')
   check(name+': nearly clear, readable and larger attacking grips',all(x['h']>=44 and '0.08' in x['fill'] and x['blur']=='none' for x in pads) and pads[2]['w']>pads[0]['w']*1.25)
   check(name+': score, PIN and practice re-serve remain available',page.locator('#overlayScore').is_visible() and page.locator('#dockPin0').is_visible() and page.locator('#practiceReserve').is_visible())
   page.evaluate('touchline.setOverlayOpacity(.12)');page.reload(wait_until='networkidle');page.wait_for_function('window.touchline?.version==="11.0.0"')
   check(name+': shading preference survives a real reload',page.evaluate('document.getElementById("overlayOpacity").value==="0.12"'))
   page.evaluate('touchline.setOverlayOpacity(.08);touchline.setMode("practice");touchline.start();touchline.setOverlayButtons(true)');page.wait_for_timeout(100);page.screenshot(path=str(OUT/(name+'-overlay.png')))
   page.evaluate('touchline.openSettings()');page.click('#onlineMode');check(name+': online lobby fits and is usable',page.locator('#onlineCreate').is_visible() and page.locator('#onlineJoin').is_visible())
   if name=='portrait':page.screenshot(path=str(OUT/'phone-lobby.png'))
   check(name+': merely opening the lobby does not load external signaling',page.evaluate('typeof Peer==="undefined"'))
   c.close()
  check('No JavaScript exceptions on the public game',not errors,errors=errors);b.close()
finally:
 (OUT/'results.json').write_text(json.dumps({'passed':sum(x['passed'] for x in checks),'total':len(checks),'url':URL,'checks':checks},indent=2))
# The caller runs network-v11.py separately against this verified origin.
