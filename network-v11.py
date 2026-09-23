"""Real PeerJS signaling + encrypted WebRTC, two independent browser contexts.
Run against GAME_URL or the repository served locally on an ordinary CI runner.
A same-runner connection is not a test of every carrier NAT or phone model.
"""
import json, os, time, threading, http.server, functools, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'network-check-v11';OUT.mkdir(exist_ok=True)
results=[];errors=[];server=None
url=os.environ.get('GAME_URL')
if not url:
 handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),handler)
 threading.Thread(target=server.serve_forever,daemon=True).start();url='http://127.0.0.1:8765/'
def check(name,ok,**metrics):
 results.append({'name':name,'passed':bool(ok),'metrics':metrics});print(('PASS ' if ok else 'FAIL ')+name,metrics,flush=True)
 if not ok:raise AssertionError(name)
def save():
 (OUT/'results.json').write_text(json.dumps({'passed':sum(x['passed'] for x in results),'total':len(results),'url':url,'transport':'PeerJS community signaling + real WebRTC','checks':results,'errors':errors},indent=2))
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
  host=browser.new_context(viewport={'width':1280,'height':800});guest=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  h=host.new_page();j=guest.new_page()
  try:
   for p in [h,j]:
    p.on('pageerror',lambda e:errors.append(str(e)));p.set_default_timeout(35000)
    response=p.goto(url,wait_until='networkidle');check('Public/static game loads without login',response.status==200,status=response.status)
    p.wait_for_function('window.touchline?.version==="11.0.0"')
    check('Online library is not requested during ordinary offline play',p.evaluate('typeof Peer==="undefined"'))
   # All connection operations use the UI, not an injected Peer implementation.
   h.click('#onlineMode');h.click('#onlineCreate');h.wait_for_function('touchline.online.session.phase==="lobby" && touchline.online.session.peer?.open')
   code=h.evaluate('touchline.online.session.room');check('Create room registers with real community signaling',len(code)==10)
   h.click('#onlineCopy');invite=h.locator('#onlineInvite').input_value();check('Invite contains the correct room fragment',invite.endswith('#room='+code))
   j.goto(url.split('#')[0]+'#room='+code);j.wait_for_function('window.touchline?.online')
   check('Invite opens Join without connecting automatically',j.locator('#onlineDialog').is_visible() and not j.evaluate('touchline.online.session.active'))
   j.click('#onlineJoin')
   for p in [h,j]:p.wait_for_function('touchline.online.session.connected')
   check('Both real data channels are open',h.evaluate('touchline.online.session.conn.dataChannel.readyState==="open"') and j.evaluate('touchline.online.session.conn.dataChannel.readyState==="open"'))
   check('Connection is peer-to-peer WebRTC rather than a shared-tab mock',h.evaluate('touchline.online.session.conn.peerConnection instanceof RTCPeerConnection'))
   h.click('#onlineReady');h.wait_for_timeout(200);check('One ready cannot start the game',not h.evaluate('touchline.online.session.started'))
   j.click('#onlineReady')
   for p in [h,j]:p.wait_for_function('touchline.online.session.started')
   check('Both ready starts a shared reaction countdown',h.evaluate('touchline.world.serveRemaining>0.8'))
   h.wait_for_timeout(2000)
   check('Snapshots and input stream in both directions',j.evaluate('touchline.online.session.frames.length>=2') and h.evaluate('touchline.online.session.lastInput>0'))
   j.keyboard.down('q');j.wait_for_timeout(180)
   check('Guest default keeper key moves the correct opponent-side rod',j.evaluate('touchline.world.rods[0].targetY<-.01') and h.evaluate('touchline.world.rods[7].targetY>.01'))
   j.keyboard.up('q');j.wait_for_timeout(100);check('Remote keyup releases the grip',h.evaluate('!touchline.world.rods[7].controlled'))
   j.evaluate('touchline.world.setPin(touchline.world.rods[5],true)');j.wait_for_timeout(130);check('Guest PIN controls its attacking row',h.evaluate('touchline.world.rods[2].pinIntent'))
   j.evaluate('touchline.neutralRod(5)');j.wait_for_timeout(130);check('Guest neutral releases pin at host',h.evaluate('!touchline.world.rods[2].pinIntent'))
   # Opposite perspective, not independently simulated scores/balls.
   h.evaluate('''for(const r of touchline.world.rods)r.theta=r.targetTheta=Math.PI/2;Object.assign(touchline.world.ball,{x:.6,y:.31,z:.017,vx:0,vy:0,vz:0});touchline.online.snapshot(true);''');j.wait_for_timeout(160)
   a=h.evaluate('[touchline.world.ball.x,touchline.world.ball.y]');b=j.evaluate('[touchline.world.ball.x,touchline.world.ball.y]')
   check('Ball position agrees in the two opposing perspectives',abs(a[0]+b[0]-1.2)<.005 and abs(a[1]+b[1]-.68)<.005,host=a,guest=b)
   bad=h.evaluate('touchline.online.session.invalid');j.evaluate('touchline.online.send({t:"input",v:11,seq:999999,epoch:touchline.online.session.epoch,rows:[[0,999]]})');j.wait_for_timeout(100)
   check('Malformed remote control packets are rejected',h.evaluate('touchline.online.session.invalid')>bad)
   j.evaluate('touchline.openSettings()');j.wait_for_timeout(200);t=h.evaluate('touchline.world.time');j.wait_for_timeout(200);check('Opening guest settings pauses host physics',abs(h.evaluate('touchline.world.time')-t)<.005)
   j.evaluate('touchline.start()');j.wait_for_timeout(200);check('Closing settings resumes the shared simulation',h.evaluate('touchline.world.time')>t+.05)
   h.evaluate('''for(const r of touchline.world.rods)r.theta=r.targetTheta=Math.PI/2;Object.assign(touchline.world.ball,{x:1.17,y:.34,z:.017,vx:2,vy:0,vz:0});touchline.world.serveRemaining=0;''');j.wait_for_function('touchline.world.score[1]===1');check('Host decides the goal exactly once',h.evaluate('touchline.world.score[0]===1'))
   j.wait_for_timeout(2200);check('New rally epoch agrees at both ends',h.evaluate('touchline.online.session.epoch')==j.evaluate('touchline.online.session.epoch'))
   for p in [h,j]:p.evaluate('touchline.setOverlayButtons(true)')
   j.screenshot(path=str(OUT/'phone-playing.png'));h.screenshot(path=str(OUT/'desktop-playing.png'))
   # Winning and a two-person rematch should not accidentally retain old score.
   h.evaluate('''touchline.world.score=[4,0];for(const r of touchline.world.rods)r.theta=r.targetTheta=Math.PI/2;Object.assign(touchline.world.ball,{x:1.17,y:.34,z:.017,vx:2,vy:0,vz:0});touchline.world.serveRemaining=0;touchline.world.goalLock=0;''')
   j.wait_for_function('touchline.online.session.finished');check('Final result is shared',h.evaluate('touchline.world.score[0]===5') and j.evaluate('touchline.world.score[1]===5'))
   for p in [h,j]:p.evaluate('touchline.online.show()')
   h.click('#onlineReady');j.click('#onlineReady');j.wait_for_function('touchline.world.score[0]===0&&touchline.world.score[1]===0&&!touchline.online.session.finished');check('Both-ready rematch clears scores and begins a new countdown',h.evaluate('touchline.world.serveRemaining>0.8'))
   j.evaluate('touchline.online.session.conn.close()');h.wait_for_timeout(200);t=h.evaluate('touchline.world.time');h.wait_for_timeout(200)
   check('An actual transport disconnect freezes instead of awarding goals',not h.evaluate('touchline.online.session.connected') and abs(h.evaluate('touchline.world.time')-t)<.005 and h.locator('#networkNotice').is_visible())
   h.evaluate('touchline.online.leave()');check('Leaving returns to usable offline play',h.evaluate('!touchline.online.session.active&&!touchline.world.paused'))
   check('No JavaScript errors across a full online session',not errors,errors=errors)
  except Exception as e:
   for p,name in [(h,'host'),(j,'guest')]:
    try:p.screenshot(path=str(OUT/(name+'-failure.png')));print(name,p.evaluate('window.touchline?.online?.session.message'),flush=True)
    except:pass
   results.append({'name':'Completion','passed':False,'error':str(e)});raise
  finally:save();browser.close()
finally:
 if server:server.shutdown()
 save()
