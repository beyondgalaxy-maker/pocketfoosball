"""Real PeerJS signaling + encrypted WebRTC, two independent browser contexts.
Run against GAME_URL or the repository served locally on an ordinary CI runner.
A same-runner connection is not a test of every carrier NAT or phone model.
"""
import json, os, time, threading, http.server, functools, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'network-check-v13';OUT.mkdir(exist_ok=True)
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
    p.wait_for_function('window.touchline?.version==="13.0.0"');p.evaluate('touchline.controls13.set({tap:false})')
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
   bad=h.evaluate('touchline.online.session.invalid');j.evaluate('touchline.online.send({t:"input",v:13,seq:999999,epoch:touchline.online.session.epoch,rows:[[0,999]]})');j.wait_for_timeout(100)
   check('Malformed remote control packets are rejected',h.evaluate('touchline.online.session.invalid')>bad)
   j.evaluate('touchline.openSettings()');j.wait_for_timeout(200);t=h.evaluate('touchline.world.time');j.wait_for_timeout(200);check('Opening guest settings pauses host physics',abs(h.evaluate('touchline.world.time')-t)<.005)
   j.evaluate('touchline.start()');j.wait_for_timeout(200);check('Closing settings resumes the shared simulation',h.evaluate('touchline.world.time')>t+.05)
   h.evaluate('''for(const r of touchline.world.rods)r.theta=r.targetTheta=Math.PI/2;Object.assign(touchline.world.ball,{x:1.17,y:.34,z:.017,vx:2,vy:0,vz:0});touchline.world.serveRemaining=0;''');j.wait_for_function('touchline.world.score[1]===1');check('Host decides the goal exactly once',h.evaluate('touchline.world.score[0]===1'))
   j.wait_for_timeout(2200);check('New rally epoch agrees at both ends',h.evaluate('touchline.online.session.epoch')==j.evaluate('touchline.online.session.epoch'))
   for p in [h,j]:p.evaluate('touchline.setOverlayButtons(true)')
   for page in [h,j]:
    page.wait_for_timeout(100)
    check('Online player has independent full-height touch lanes',page.evaluate('touchline.controls12.lanes().length===4'))
   def lane_point(page,rod,f=.32):
    return page.evaluate('''([id,f])=>{const z=touchline.controls12.lanes().find(z=>z.id===id);let x=z.x+z.width/2,y=z.y+z.height*f;for(let i=0;i<25;i++){const q=touchline.renderer.pointerPoint(x,y);if(touchline.renderer.hit(q.x,q.y)===id)return [x,y];y+=3;}return [x,y];}''',[rod,f])
   hx,hy=lane_point(h,1)
   h.mouse.move(hx,hy);h.mouse.down();h.wait_for_timeout(60)
   check('Host upper-screen lane acquires the intended row',h.evaluate('touchline.world.rods[1].controlled'))
   h.mouse.up()
   cdp=guest.new_cdp_session(j);x,y=lane_point(j,5,.52)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});j.wait_for_timeout(140)
   check('Guest upper-screen touch reaches the correct host rod',j.evaluate('touchline.world.rods[5].controlled') and h.evaluate('touchline.world.rods[2].controlled'))
   old=h.evaluate('touchline.world.rods[2].targetY')
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-24,'y':y,'id':1}]});j.wait_for_timeout(150)
   check('Guest lane slides over the actual network',abs(h.evaluate('touchline.world.rods[2].targetY')-old)>.005)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});j.wait_for_timeout(130)
   check('Network lane release removes remote control',h.evaluate('!touchline.world.rods[2].controlled'))
   # Actual guest touch requests the forward finish. Host records the received
   # intent and integrates it, rather than the guest assigning a ball trajectory.
   h.evaluate('''for(const r of touchline.world.rods){r.theta=r.targetTheta=Math.PI/2;r.releaseAt=-1;}const r=touchline.world.rods[2];r.theta=r.targetTheta=-.82;r.y=r.targetY=0;Object.assign(touchline.world.ball,{x:.6,y:.34,z:.017,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0});touchline.world.serveRemaining=0;touchline.world.goalLock=0;window.receivedFlick=false;window.observedForward=0;window.oldAngle=r.theta;window.flickWatch=setInterval(()=>{if(r.targetTheta<-6&&r.strikeTarget===null&&!r.directGrip)window.receivedFlick=true;window.observedForward=Math.max(window.observedForward,window.oldAngle-r.theta);},4);touchline.online.snapshot(true);''');j.wait_for_timeout(160)
   x,y=lane_point(j,5,.52);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});j.wait_for_timeout(160);base=time.time()
   for i,dist in enumerate([2,52,102,152],1):
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','timestamp':base+i*.016,'touchPoints':[{'x':x,'y':y-dist,'id':1}]})
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','timestamp':base+.084,'touchPoints':[]});j.wait_for_timeout(500)
   check('Guest fast swipe triggers once using real touch events',j.evaluate('(touchline.world.stats.manualFlicks||0)===1'))
   check('Host receives and executes forward-only rollover intent',h.evaluate('receivedFlick&&observedForward>4'),forward_radians=h.evaluate('observedForward'))
   h.evaluate('clearInterval(window.flickWatch)')
   j.evaluate('touchline.controls12.set({size:66,lift:9})');j.wait_for_timeout(50)
   check('Online layout changes remain private to each player',h.evaluate('touchline.controls12.get().size===54') and j.evaluate('touchline.controls12.get().size===66'))
   j.screenshot(path=str(OUT/'phone-playing.png'));h.screenshot(path=str(OUT/'desktop-playing.png'))

   # Guest helper and tap strokes are transmitted as rod intent and strike
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
