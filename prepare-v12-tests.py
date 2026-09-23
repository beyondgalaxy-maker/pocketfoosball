from pathlib import Path
p=Path(__file__).resolve().parent
s=(p/'site-v11.py').read_text().replace('v11','v12').replace('11.0.0','12.0.0').replace('?v=11','?v=12')
s=s.replace("'bot-control.js','v12.js','online.js'", "'bot-control.js','v11.js','online.js','v12.js'")
old="   page.evaluate('touchline.openSettings()');page.click('#onlineMode');"
extra='''   check(name+': all four full-height lanes are available in practice',page.evaluate('touchline.controls12.lanes().length===4&&touchline.controls12.lanes()[0].height>innerHeight-5'))
   cdp=c.new_cdp_session(page)
   for rod in [0,1,3,5]:
    xy=page.evaluate('''+"'''"+'''id=>{const z=touchline.controls12.lanes().find(z=>z.id===id);let x=z.x+z.width/2,y=z.y+z.height*.25;for(let i=0;i<25;i++){const p=touchline.renderer.pointerPoint(x,y);if(touchline.renderer.hit(p.x,p.y)===id)return [x,y];y+=3;}return [x,y];}'''+"'''"+''',rod)
    x,y=xy;cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]});page.wait_for_timeout(40)
    check(name+': real upper-screen touch acquires row '+str(rod),page.evaluate('(id)=>touchline.world.rods[id].controlled',rod))
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   page.evaluate('touchline.controls12.set({size:66,width:90,lift:8,reach:.5})');page.reload(wait_until='networkidle');page.wait_for_function('touchline.version==="12.0.0"')
   check(name+': layout survives a real origin reload',page.evaluate('const p=touchline.controls12.get();p.size===66&&p.width===90&&p.lift===8&&p.reach===.5'))
   page.evaluate('touchline.setMode("solo");touchline.start();touchline.setOverlayButtons(true)');page.wait_for_timeout(80)
   check(name+': solo uses the saved lower-half reach',page.evaluate('touchline.controls12.lanes().length===4&&touchline.controls12.lanes()[0].y>innerHeight*.45'))
   page.evaluate('touchline.controls12.set(TouchlineV12.DEFAULTS);touchline.openSettings();touchline.setMenuTab("controls")')
   check(name+': simple layout settings are present',page.locator('#touchReach').is_visible() and page.locator('#touchSize').is_visible())
   page.screenshot(path=str(OUT/(name+'-settings.png')))
   page.evaluate('touchline.setMenuTab("match")');page.click('#onlineMode');'''
assert old in s;s=s.replace(old,extra);s=s.replace("page.evaluate('const p=touchline.controls12.get();p.size===66&&p.width===90&&p.lift===8&&p.reach===.5')", "page.evaluate('()=>{const p=touchline.controls12.get();return p.size===66&&p.width===90&&p.lift===8&&p.reach===.5}')")
(p/'site-v12.py').write_text(s)
s=(p/'network-v11.py').read_text().replace('v11','v12').replace('11.0.0','12.0.0').replace('v:11','v:12')
marker="   j.screenshot(path=str(OUT/'phone-playing.png'));h.screenshot(path=str(OUT/'desktop-playing.png'))"
extra='''   for page in [h,j]:
    page.wait_for_timeout(100)
    check('Online player has independent full-height touch lanes',page.evaluate('touchline.controls12.lanes().length===4'))
   def lane_point(page,rod,f=.32):
    return page.evaluate('''+"'''"+'''([id,f])=>{const z=touchline.controls12.lanes().find(z=>z.id===id);let x=z.x+z.width/2,y=z.y+z.height*f;for(let i=0;i<25;i++){const q=touchline.renderer.pointerPoint(x,y);if(touchline.renderer.hit(q.x,q.y)===id)return [x,y];y+=3;}return [x,y];}'''+"'''"+''',[rod,f])
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
   h.evaluate('''+"'''"+'''for(const r of touchline.world.rods){r.theta=r.targetTheta=Math.PI/2;r.releaseAt=-1;}const r=touchline.world.rods[2];r.theta=r.targetTheta=-.82;r.y=r.targetY=0;Object.assign(touchline.world.ball,{x:.6,y:.34,z:.017,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0});touchline.world.serveRemaining=0;touchline.world.goalLock=0;window.receivedFlick=false;window.observedForward=0;window.oldAngle=r.theta;window.flickWatch=setInterval(()=>{if(r.targetTheta<-6&&r.strikeTarget===null&&!r.directGrip)window.receivedFlick=true;window.observedForward=Math.max(window.observedForward,window.oldAngle-r.theta);},4);touchline.online.snapshot(true);'''+"'''"+''');j.wait_for_timeout(160)
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
'''
assert marker in s;s=s.replace(marker,extra)
(p/'network-v12.py').write_text(s)
