"""Real data-channel tests, including tab presence, rejoin and protocol recovery.
CLOUD=1 uses public PeerJS; otherwise signaling alone is adapted, not gameplay.
"""
from pathlib import Path
import os,json,time,shutil,subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/v3';OUT.mkdir(exist_ok=True)
CLOUD=os.getenv('JELLY_NETWORK_CLOUD')=='1';URL=os.getenv('JELLY_TEST_URL');server=None
if CLOUD and not URL:
 server=subprocess.Popen(['python3','-m','http.server','8799','--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.4);URL='http://127.0.0.1:8799'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or None,headless=True,args=['--no-sandbox']);pages={};queue=[];errors=[];checks=[]
  def register(source,id):pages[id]=source['page']
  def signal(source,m):queue.append(m)
  def pump():
   batch=queue[:];queue.clear()
   for m in batch:
    if m['to'] in pages and not pages[m['to']].is_closed():pages[m['to']].evaluate('m=>__receiveRTC(m).catch(e=>console.error(e))',m)
    else:queue.append(m)
  def wait(page,expression,seconds=20):
   end=time.monotonic()+seconds
   while time.monotonic()<end:
    pump()
    if page.evaluate(expression):return
    page.wait_for_timeout(30)
   raise AssertionError(expression+'; '+page.inner_text('body')[-1400:])
  def check(name,value):
   assert value,name
   checks.append(name);print('PASS',name,flush=True)
  def make(context=None,mobile=False):
   context=context or browser.new_context(viewport={'width':844 if mobile else 1250,'height':390 if mobile else 900},has_touch=mobile,is_mobile=mobile)
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   # Observe native peer connections solely to exercise real transport failure.
   if CLOUD:page.add_init_script("window.__testRTCs=[];const Native=window.RTCPeerConnection;window.RTCPeerConnection=class extends Native{constructor(...args){super(...args);window.__testRTCs.push(this);}};")
   if not CLOUD:
    page.expose_binding('__registerRTC',register);page.expose_binding('__signalRTC',signal);page.set_content('<html></html>');page.evaluate((ROOT/'tests/rtc-v2.js').read_text());page.set_content((ROOT/'jelly-jam.html').read_text())
   else:page.goto(URL)
   return context,page
  def ready_pair(h,g):
   if h.evaluate('JellyJam.paused'):
    if h.locator('#resume').is_visible():h.click('#resume')
    if g.locator('#resume').is_visible():g.click('#resume')
    wait(h,'!JellyJam.paused');wait(g,'!JellyJam.paused')
  hc,h=make();h.click('#online');h.click('#hostRoom');h.wait_for_selector('#roomCode',timeout=45000);code=h.inner_text('#roomCode').replace(' ','')
  gc,g=make(mobile=True);g.click('#online');g.fill('#roomInput',code);g.click('#joinForm button');wait(h,'JellyJam.connected');wait(g,'JellyJam.connected');wait(g,'!JellyJam.paused');check('Host and mobile guest join over real WebRTC',True)
  x=h.evaluate('JellyJam.state.players[1].x');cdp=gc.new_cdp_session(g);box=g.locator('[data-p="1"][data-key="right"]').bounding_box()
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}]});g.wait_for_timeout(430);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});g.wait_for_timeout(180)
  check('Native mobile guest touch moves remote buddy with snapshot agreement',h.evaluate('JellyJam.state.players[1].x')>x+55 and abs(h.evaluate('JellyJam.state.players[1].x')-g.evaluate('JellyJam.state.players[1].x'))<15)
  # A real short key pulse is retained even if release arrives within one sim tick.
  g.keyboard.press('ArrowUp');g.wait_for_timeout(95);check('Quick guest jump tap is not lost',h.evaluate('JellyJam.state.players[1].y')<540)
  # Dispatch actual visibilitychange events with an explicit synthetic visibility state.
  def hidden(page,value):page.evaluate("v=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>v});document.dispatchEvent(new Event('visibilitychange'));}",value)
  saved=h.evaluate('({level:JellyJam.state.level,round:JellyJam.state.round,stars:JellyJam.state.stars})')
  g.keyboard.down('ArrowRight');hidden(g,True);wait(h,'JellyJam.paused');h.wait_for_timeout(180);t=h.evaluate('JellyJam.state.t');g.wait_for_timeout(300);check('Guest away pauses the whole team',h.evaluate('JellyJam.state.t')==t)
  check('Away clears remote held movement',not h.evaluate('JellyJam.remoteInput.right'))
  hidden(g,False);wait(g,'JellyJam.paused');h.click('#resume');h.wait_for_timeout(120);check('One ready player cannot resume alone',h.evaluate('JellyJam.paused'));g.click('#resume');wait(h,'!JellyJam.paused');wait(g,'!JellyJam.paused');g.keyboard.up('ArrowRight');check('Both ready restores same run',h.evaluate('({level:JellyJam.state.level,round:JellyJam.state.round,stars:JellyJam.state.stars})')==saved)
  for n in range(3):
   hidden(h,True);wait(g,'JellyJam.paused');hidden(g,True);hidden(h,False);hidden(g,False);ready_pair(h,g)
  check('Repeated both-tab away/return cycles recover',True)
  hidden(g,True);wait(h,'JellyJam.paused');t=h.evaluate('JellyJam.state.t');h.wait_for_timeout(12500);check('Away beyond old heartbeat deadline preserves room',h.evaluate('JellyJam.connected') and h.evaluate('JellyJam.state.t')==t);hidden(g,False);ready_pair(h,g)
  # BFCache lifecycle must not destroy the reusable Room timer or transport.
  h.evaluate("dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));")
  wait(g,'JellyJam.paused');ready_pair(h,g);check('Back-forward-cache suspend/restore retains room',h.evaluate('JellyJam.connected'))
  # Load a portal puzzle through the host map; the guest remains a guest.
  h.click('#levels');h.click('[data-chapter="1"]');h.click('[data-level="13"]');h.click('#playSelected');wait(g,'JellyJam.state.level===13 && !JellyJam.paused');check('Atlas level selection synchronizes',True)
  # Solve the live held-flower portal/key relay using ordinary key controls.
  def walk(page,who,target):
   held=None;end=time.monotonic()+8
   while time.monotonic()<end:
    q=page.evaluate(f'JellyJam.state.players[{who}]');dx=target-q['x'];stopping=q['vx']**2/5200+3
    desired=('ArrowRight' if dx>0 else 'ArrowLeft') if abs(dx)>max(5,stopping if dx*q['vx']>0 else 0) else None
    if desired!=held:
     if held:page.keyboard.up(held)
     if desired:page.keyboard.down(desired)
     held=desired
    if abs(dx)<12 and abs(q['vx'])<1:return
    page.wait_for_timeout(30);pump()
   if held:page.keyboard.up(held)
   raise AssertionError('Could not walk to puzzle waypoint')
  walk(h,0,185);walk(g,1,770);wait(h,"JellyJam.state.keys.includes('sun')")
  check('Live teamwork powers portal and collects a shared key',h.evaluate('JellyJam.state.players[1].x>650 && JellyJam.state.stars[1]'))
  progress=h.evaluate('({round:JellyJam.state.round,keys:JellyJam.state.keys,stars:JellyJam.state.stars})');hidden(h,True);wait(g,'JellyJam.paused');hidden(h,False);ready_pair(h,g)
  check('Tab return preserves actual collected puzzle progress',h.evaluate('({round:JellyJam.state.round,keys:JellyJam.state.keys,stars:JellyJam.state.stars})')==progress)
  g.click('#restart');g.wait_for_timeout(160);check('Guest restart remains host-authoritative',g.evaluate('JellyJam.state.level')==13 and g.evaluate('JellyJam.state.t')<1 and not g.evaluate('JellyJam.state.keys.length'))
  # Exercise new shared optical machinery using only real guest controls.
  h.click('#levels');h.click('[data-chapter="4"]');h.click('[data-level="42"]');h.click('#playSelected');wait(g,'JellyJam.state.level===42 && !JellyJam.paused')
  walk(g,1,400);g.keyboard.press('KeyE');wait(h,'JellyJam.state.mirrorAngles[0]===0 && JellyJam.state.lit[0]');wait(g,'JellyJam.state.mirrorAngles[0]===0 && JellyJam.state.lit[0]')
  check('Guest action rotates real mirror and synchronizes powered circuit',True)
  optical=h.evaluate('({mirrors:JellyJam.state.mirrorAngles,lit:JellyJam.state.lit,round:JellyJam.state.round})');hidden(g,True);wait(h,'JellyJam.paused');hidden(g,False);ready_pair(h,g)
  check('Reflected light puzzle survives guest tab return',h.evaluate('({mirrors:JellyJam.state.mirrorAngles,lit:JellyJam.state.lit,round:JellyJam.state.round})')==optical)
  h.click('#levels');h.click('[data-chapter="4"]');h.click('[data-level="45"]');h.click('#playSelected');wait(g,'JellyJam.state.level===45 && !JellyJam.paused');wait(h,'JellyJam.state.stored[0]');wait(g,'JellyJam.state.stored[0]')
  hidden(h,True);wait(g,'JellyJam.paused');hidden(h,False);ready_pair(h,g)
  check('Charged memory receiver persists and synchronizes after host return',h.evaluate('JellyJam.state.stored[0]') and g.evaluate('JellyJam.state.stored[0]'))
  # Attempt a third seat while the legitimate connection is live.
  tc,third=make();third.click('#online');third.fill('#roomInput',code);third.click('#joinForm button');wait(third,"document.getElementById('roomError')?.textContent.includes('already has two')");check('Third player rejected without dropping pair',h.evaluate('JellyJam.connected') and g.evaluate('JellyJam.connected'));tc.close()
  # Close only the guest, then enter again. Host must preserve the run and require ready.
  level=h.evaluate('JellyJam.state.level');g.close();wait(h,"document.getElementById('continueLocal')!==null",25)
  _,g2=make(gc,mobile=True);g2.click('#online');g2.fill('#roomInput',code);g2.click('#joinForm button');wait(g2,'JellyJam.connected');wait(g2,f'JellyJam.state.level==={level}');wait(g2,'JellyJam.paused');check('Reconnect preserves host level and pauses safely',h.evaluate('JellyJam.paused'));ready_pair(h,g2);check('Rejoined guest restores optical memory from host',h.evaluate('JellyJam.state.stored[0]') and g2.evaluate('JellyJam.state.stored[0]'))
  # Disconnect the underlying channel (not a game handler) to test automatic retry.
  g2.evaluate('window.__testRTCs.forEach(c=>c.close())' if CLOUD else 'Object.values(__testPeer.connections).forEach(c=>c.close())');wait(g2,'!JellyJam.connected');wait(g2,'JellyJam.connected',25);wait(h,'JellyJam.connected');wait(g2,'JellyJam.paused');ready_pair(h,g2);check('Dropped channel reconnects automatically',True)
  g2.close();wait(h,"document.getElementById('continueLocal')!==null",25);h.click('#continueLocal');check('Disconnect can continue locally without reset',h.evaluate('JellyJam.mode')=='local' and h.evaluate('JellyJam.state.level')==level and not h.evaluate('JellyJam.paused'))
  check('No page exceptions',not errors);report={'passed':True,'transport':'public PeerJS + real WebRTC' if CLOUD else 'native WebRTC + adapted signaling','visibility_test':'visibilitychange handlers with synthetic hidden state; BFCache PageTransitionEvent; real channel close/rejoin','checks':checks,'page_errors':errors};(OUT/'network-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));browser.close()
finally:
 if server:server.terminate();server.wait()
