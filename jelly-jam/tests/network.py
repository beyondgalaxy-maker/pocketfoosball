"""Two independent browser contexts, real WebRTC, and production game handlers.
Set JELLY_NETWORK_CLOUD=1 to use official PeerJS + its public signaling service.
Without it, a native WebRTC adapter uses Playwright only for signaling, not data.
"""
from pathlib import Path
import os, json, time, subprocess, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
CLOUD=os.getenv('JELLY_NETWORK_CLOUD')=='1'
server=None
try:
 if CLOUD:
  server=subprocess.Popen(['python','-m','http.server','8766','--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.5)
 with sync_playwright() as p:
  executable=shutil.which('chromium') or None
  browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
  pages={};pending={};errors=[]
  signal_queue=[]
  def register(source,id):
   pages[id]=source['page']
  def signal(source,message):
   signal_queue.append(message)
  def pump():
   batch=signal_queue[:];signal_queue.clear()
   for message in batch:
    if message['to'] in pages and not pages[message['to']].is_closed():
     pages[message['to']].evaluate('m=>{__receiveRTC(m).catch(e=>console.error(e));}',message)
    else:signal_queue.append(message)
  def wait_js(page,expression,timeout=20000):
   end=time.monotonic()+timeout/1000
   while time.monotonic()<end:
    pump()
    if page.evaluate(expression):return
    page.wait_for_timeout(35)
   raise AssertionError('Timed out: '+expression+'; '+page.inner_text('body')[-1200:])
  def make_page():
   context=browser.new_context(viewport={'width':1200,'height':900});page=context.new_page()
   page.on('pageerror',lambda e:errors.append(str(e)))
   if not CLOUD:
    page.expose_binding('__registerRTC',register);page.expose_binding('__signalRTC',signal)
    page.set_content('<html><body></body></html>');page.evaluate((ROOT/'tests/rtc-adapter.js').read_text())
    page.set_content((ROOT/'jelly-jam.html').read_text())
   else:page.goto('http://127.0.0.1:8766')
   return page
  print('Making host',flush=True);host=make_page();host.click('#online');host.click('#hostRoom')
  print('Waiting for code',flush=True);host.wait_for_selector('#roomCode',timeout=45000);code=host.inner_text('#roomCode').replace(' ','')
  print('Joining',code,flush=True);guest=make_page();guest.click('#online');guest.fill('#roomInput',code);guest.click('#joinForm button')
  print('Await connection',flush=True);wait_js(guest,'JellyJam.connected',timeout=20000);wait_js(host,'JellyJam.connected')
  assert guest.evaluate('JellyJam.mode')=='guest';assert host.evaluate('JellyJam.mode')=='host'
  # Begin from an explicitly resumed state in case browser focus hid a tab.
  host.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
  if host.locator('#resume').is_visible():host.click('#resume')
  host.wait_for_timeout(250)
  x=host.evaluate('JellyJam.state.players[1].x')
  guest.keyboard.down('ArrowRight');guest.wait_for_timeout(550);guest.keyboard.up('ArrowRight');guest.wait_for_timeout(200)
  hx=host.evaluate('JellyJam.state.players[1].x');gx=guest.evaluate('JellyJam.state.players[1].x')
  assert hx>x+65,(x,hx)
  assert abs(hx-gx)<14,(hx,gx)
  guest.keyboard.down('ArrowUp');guest.wait_for_timeout(170)
  assert host.evaluate('JellyJam.state.players[1].y')<530
  guest.keyboard.up('ArrowUp');guest.wait_for_timeout(700)
  # Pause is shared and no held key survives the pause.
  guest.click('#pause');host.wait_for_function('JellyJam.paused')
  before=host.evaluate('JellyJam.state.t');guest.wait_for_timeout(250)
  assert host.evaluate('JellyJam.state.t')==before
  host.click('#resume');guest.wait_for_function('!JellyJam.paused')
  host.click('#levels');host.click('[data-level="4"]');guest.wait_for_function('JellyJam.state.level===4')
  # Guest restart requests go to the authoritative host.
  guest.click('#restart');guest.wait_for_timeout(160)
  assert guest.evaluate('JellyJam.state.t')<1
  # A third player is rejected without disrupting the current pair.
  third=make_page();third.click('#online');third.fill('#roomInput',code);third.click('#joinForm button')
  wait_js(third,"document.getElementById('roomError')?.textContent.includes('already has two')",timeout=20000)
  assert host.evaluate('JellyJam.connected') and guest.evaluate('JellyJam.connected')
  third.close();guest.close();host.wait_for_selector('#continueLocal',timeout=20000)
  saved=host.evaluate('JellyJam.state.level')
  replacement=make_page();replacement.click('#online');replacement.fill('#roomInput',code);replacement.click('#joinForm button')
  wait_js(replacement,'JellyJam.connected')
  replacement.wait_for_function(f'JellyJam.state.level==={saved}')
  host.wait_for_function('!JellyJam.paused')
  replacement.close();host.wait_for_selector('#continueLocal',timeout=20000);host.click('#continueLocal')
  assert host.evaluate('JellyJam.mode')=='local' and not host.evaluate('JellyJam.paused')
  assert not errors,errors
  report={'transport':'official PeerJS public signaling + real WebRTC' if CLOUD else 'native WebRTC + in-process signaling','checks':['room creation','join','remote movement','remote jump','state agreement','shared pause','key release','level synchronization','guest restart','third-player rejection','disconnect pause','rejoin preserves level','continue locally'],'page_errors':errors,'passed':True}
  (ROOT/'tests/network-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
  browser.close()
finally:
 if server:server.terminate();server.wait()
