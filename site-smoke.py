"""Verify the public GitHub Pages website, not an injected/local HTML preview.
Read-only HTTP requests and isolated browser profiles; no credentials required.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin
from datetime import datetime, timezone
import hashlib, json, os, re, time
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
BASE='https://beyondgalaxy-maker.github.io/pocketfoosball/'
OUT=ROOT/'site-check';OUT.mkdir(exist_ok=True)
report={'url':BASE,'checked_at':datetime.now(timezone.utc).isoformat(),'assets':[], 'checks':[], 'errors':[]}
def check(name,ok,**metrics):
    report['checks'].append({'name':name,'passed':bool(ok),'metrics':metrics})
    print(('PASS ' if ok else 'FAIL ')+name,metrics,flush=True)
    if not ok:raise AssertionError(name)
def get(url):
    req=Request(url,headers={'User-Agent':'PocketFoosball-public-site-check','Cache-Control':'no-cache'})
    with urlopen(req,timeout=20) as r:
        return r.status,r.headers.get('Content-Type',''),r.read()
def sha(data):return hashlib.sha256(data).hexdigest()
try:
    # Deployment may run concurrently with CI. Require the exact committed
    # assets, not a stale page or an HTTP-200 GitHub error document.
    assets=['engine.js','input.js','app.js','rolling.js','bot-control.js','styles.css']
    expected={name:sha((ROOT/name).read_bytes()) for name in assets}
    last_error=None
    for attempt in range(30):
        try:
            status,kind,body=get(BASE+'?verify='+os.environ.get('GITHUB_SHA','v9'))
            assert status==200 and 'text/html' in kind and b'id="playBtn"' in body
            observed=[]
            for name in assets:
                st,mime,data=get(urljoin(BASE,name)+'?verify='+expected[name][:16])
                assert st==200 and sha(data)==expected[name],name+' is not the checked release yet'
                observed.append({'path':name,'http_status':st,'sha256':sha(data),'bytes':len(data)})
            report['assets']=observed
            break
        except Exception as error:
            last_error=str(error);print('Waiting for public deployment:',last_error,flush=True)
            if attempt==29:raise
            time.sleep(4)
    check('The public HTTPS entrypoint and all six runtime assets load without login',len(report['assets'])==6)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
        try:
            for name,width,height,mobile in [('desktop',1440,900,False),('phone-portrait',390,844,True),('phone-landscape',844,390,True)]:
                context=browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile,
                    extra_http_headers={'Cache-Control':'no-cache'})
                page=context.new_page();page.set_default_timeout(10000)
                errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                response=page.goto(BASE,wait_until='networkidle',timeout=30000)
                page.wait_for_function('window.touchline?.version==="9.0.0"&&document.getElementById("bindingEditor")')
                check(name+': the unmodified public page starts version 9',response.status==200 and '09' in page.title())
                check(name+': public page fits the viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                page.locator('#playBtn').click()
                check(name+': Play starts a ready interval',page.evaluate('touchline.state==="playing"&&touchline.world.serveRemaining>0'))
                page.evaluate('touchline.setTableOnly(true)');page.wait_for_timeout(100)
                check(name+': table-only mode keeps the menu reachable',page.locator('#compactMenu').is_visible() and not page.locator('#blueDock').is_visible())
                page.screenshot(path=str(OUT/(name+'-playing.png')))
                page.locator('#compactMenu').click();page.locator('#tab-controls').click()
                page.locator('.keyboard-settings > summary').click()
                page.locator('[data-binding="0.up"]').click();page.keyboard.press('t')
                check(name+': binding edits use real origin localStorage',page.evaluate('JSON.parse(localStorage.getItem("touchline.bindings.v9")).bindings["0.up"].code==="KeyT"'))
                page.reload(wait_until='networkidle');page.wait_for_function('touchline.version==="9.0.0"&&document.getElementById("bindingEditor")')
                check(name+': a full reload restores the keybinding',page.evaluate('TouchlineInput.bindings.get("0.up").code==="KeyT"'))
                page.evaluate('touchline.setMode("practice");touchline.start();touchline.world.serveRemaining=0;const r=touchline.world.rods[0];r.y=r.targetY=r.vy=0;')
                page.keyboard.down('t');page.wait_for_timeout(140);page.keyboard.up('t');page.wait_for_timeout(45)
                check(name+': the rebound key moves the actual keeper and releases',page.evaluate('touchline.world.rods[0].y<-.009&&touchline.keyboardActive.length===0'))
                # Touch-input path on real browser DOM, with a fresh pinch-free grip.
                if mobile:
                    page.evaluate('touchline.setTableOnly(false);touchline.setDocks(true);touchline.setCameraMode("off");')
                    pad=page.locator('#blueDock [data-rod="5"]');pad.scroll_into_view_if_needed();box=pad.bounding_box()
                    x=box['x']+box['width']/2;y=box['y']+box['height']/2
                    before=page.evaluate('touchline.world.rods[5].targetY');cdp=context.new_cdp_session(page)
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]})
                    dx,dy=(14,0) if height>width else (0,14)
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':x+dx,'y':y+dy}]})
                    page.wait_for_timeout(60)
                    after=page.evaluate('touchline.world.rods[5].targetY')
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                    check(name+': a touch drag moves a row on the hosted game',abs(after-before)>.0005)
                check(name+': no uncaught JavaScript errors',not errors,errors=errors)
                context.close()
        finally:browser.close()
except Exception as error:
    report['errors'].append(str(error));raise
finally:
    report['passed']=sum(c['passed'] for c in report['checks']);report['total']=len(report['checks'])
    report['scope']='Public HTTPS site, fresh Chromium profiles, real localStorage, emulated phone viewports/touches. Not physical phone hardware or Safari.'
    (ROOT/'site-check-results.json').write_text(json.dumps(report,indent=2))
