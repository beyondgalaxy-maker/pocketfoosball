from pathlib import Path
import json, subprocess, time, os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python','-m','http.server','8765','--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 time.sleep(.5)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or None,headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':980})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765') if os.getenv('JELLY_TEST_HTTP') else page.set_content((ROOT/'jelly-jam.html').read_text());page.screenshot(path=str(ROOT/'tests/home.png'))
  page.click('#local');page.wait_for_timeout(300)
  x=page.evaluate('JellyJam.state.players[0].x')
  page.keyboard.down('KeyD');page.wait_for_timeout(450);page.keyboard.up('KeyD')
  assert page.evaluate('JellyJam.state.players[0].x')>x+60
  page.keyboard.down('KeyW');page.wait_for_timeout(160);page.keyboard.up('KeyW')
  assert page.evaluate('JellyJam.state.players[0].y')<530
  page.wait_for_timeout(800)
  page.screenshot(path=str(ROOT/'tests/game.png'))
  page.click('#pause');t=page.evaluate('JellyJam.state.t');page.wait_for_timeout(200)
  assert page.evaluate('JellyJam.state.t')==t
  page.click('#resume');page.wait_for_timeout(100)
  assert page.evaluate('JellyJam.state.t')>t
  page.click('#levels');assert page.locator('[data-level]').count()==10
  page.click('[data-level="9"]');assert page.evaluate('JellyJam.state.level')==9
  page.click('#restart');assert page.evaluate('JellyJam.state.level')==9
  page.click('#help');page.click('#gotIt')
  page.click('#brand');page.click('#leave');page.click('#solo')
  page.keyboard.press('Tab');assert 'Mint selected' in page.inner_text('#peachKeys')
  print(json.dumps({'errors':errors,'local_smoke':'passed'}));assert not errors
  mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
  m=mobile.new_page();m.goto('http://127.0.0.1:8765') if os.getenv('JELLY_TEST_HTTP') else m.set_content((ROOT/'jelly-jam.html').read_text());m.screenshot(path=str(ROOT/'tests/mobile-home.png'))
  m.click('#local');m.wait_for_timeout(300);m.screenshot(path=str(ROOT/'tests/mobile-game.png'))
  assert m.evaluate('document.documentElement.scrollWidth <= innerWidth')
  assert m.locator('#touchControls').is_visible()
  # Two simultaneous, native touchscreen pointers control two different buddies.
  buttons=[m.locator('[data-p="0"][data-key="right"]'),m.locator('[data-p="1"][data-key="right"]')]
  points=[]
  for i,b in enumerate(buttons):
   box=b.bounding_box();points.append({'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':i+1})
  before=m.evaluate('JellyJam.state.players.map(p=>p.x)')
  cdp=mobile.new_cdp_session(m)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points})
  m.wait_for_timeout(400)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  after=m.evaluate('JellyJam.state.players.map(p=>p.x)')
  assert all(a>b+40 for a,b in zip(after,before)),(before,after)
  m.wait_for_timeout(300);stopped=m.evaluate('JellyJam.state.players.map(p=>p.x)');m.wait_for_timeout(300)
  assert m.evaluate('JellyJam.state.players.map(p=>p.x)')==stopped
  # Online room validation never requires a download or network request.
  page.click('#brand');page.click('#leave');page.click('#online');page.fill('#roomInput','BAD');page.click('#joinForm button')
  assert '8-character' in page.inner_text('#roomError')
  page.click('#closeDialog');page.click('#help');page.click('#gotIt')
  assert not errors,errors
  report={'passed':True,'page_errors':errors,'checks':['desktop render','independent keyboard movement','jump','pause/resume','10-level picker','restart','help','solo Tab switch','390px layout','native two-player multitouch','touch release','invalid-room feedback']}
  (ROOT/'tests/browser-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
  browser.close()
finally:
 server.terminate();server.wait()
