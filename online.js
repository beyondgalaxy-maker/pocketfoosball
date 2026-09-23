/* Private two-player WebRTC rooms. The host simulates; the guest sends only
 * bounded rod intent. Both players see themselves at the Mint end. No accounts,
 * microphones, cameras, database, or GitHub write access are used by the game.
 * PeerJS 1.5.5 is loaded only after Create/Join; its public signaling/ICE services
 * are external to GitHub Pages and are not an availability guarantee.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.TouchlineOnline=api;const ready=()=>api.mount(root);if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const VERSION=12,ROWS=[0,1,3,5],BALL=['x','y','z','vx','vy','vz','wx','wy','wz','qx','qy','qz','qw'];
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=n=>typeof n==='number'&&Number.isFinite(n),round=n=>Math.round(n*1e6)/1e6;
 const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
 function roomCode(crypto){const b=new Uint8Array(10);crypto.getRandomValues(b);return [...b].map(x=>alphabet[x%32]).join('');}
 function parseRoom(text){if(typeof text!=='string'||text.length>1000)return null;let t=text.trim();if(t.includes('#'))t=new URLSearchParams(t.split('#')[1]).get('room')||'';t=t.toUpperCase().replace(/[\s-]/g,'');return /^[2-9A-HJ-NP-Z]{10}$/.test(t)?t:null;}
 function packBall(b){return BALL.map(k=>round(b[k]));}
 function mirrorBall(a,C){return [C.length-a[0],C.width-a[1],a[2],-a[3],-a[4],a[5],-a[6],-a[7],a[8],-a[10],a[9],a[12],-a[11]];}
 function validState(p){return p&&p.t==='state'&&Number.isSafeInteger(p.seq)&&Number.isSafeInteger(p.epoch)&&finite(p.time)&&p.time>=0&&Array.isArray(p.ball)&&p.ball.length===13&&p.ball.every(n=>finite(n)&&Math.abs(n)<1e5)&&Array.isArray(p.rods)&&p.rods.length===8&&p.rods.every(a=>Array.isArray(a)&&a.length===10&&a.every(n=>finite(n)&&Math.abs(n)<1e5))&&Array.isArray(p.score)&&p.score.length===2&&p.score.every(n=>Number.isSafeInteger(n)&&n>=0&&n<1000)&&finite(p.serve)&&p.serve>=0&&p.serve<=5&&finite(p.lock)&&p.lock>=0&&p.lock<=5;}
 function packState(w,seq,epoch,paused,finished){return {t:'state',v:VERSION,seq,epoch,time:w.time,ball:packBall(w.ball),rods:w.rods.map(r=>[r.y,r.theta,r.vy,r.omega,r.targetY,r.targetTheta,r.pinIntent?1:0,r.pinJoint?r.pinJoint.index:-1,r.pinJoint?r.pinJoint.x:0,r.pinSide].map(round)),score:[...w.score],serve:Math.max(0,w.serveRemaining),lock:Math.max(0,w.goalLock),paused:!!paused,finished:!!finished,dead:w.isDeadBall()?1:0};}
 function captureInput(w,seq,epoch,paused){return {t:'input',v:VERSION,seq,epoch,paused:!!paused,rows:ROWS.map(id=>{const r=w.rods[id],bits=(r.controlled?1:0)|(r.directGrip?2:0)|(r.catchHeld?4:0)|(r.pinIntent?8:0);return [id,r.targetY,r.targetTheta,r.slideScale,r.spinScale,bits,r.releaseAt>0?clamp(r.releaseAt-w.time,0,2):-1,clamp(r.driveUntil-w.time,-1,2),r.motorFeed,clamp(r.feedUntil-w.time,-1,2),r.strikeTarget??null,clamp(r.windUntil-w.time,-1,2)].map(n=>n===null?null:round(n));})};}
 function validInput(p){return p&&p.t==='input'&&Number.isSafeInteger(p.seq)&&p.seq>=0&&Number.isSafeInteger(p.epoch)&&Array.isArray(p.rows)&&p.rows.length===4&&p.rows.every((r,i)=>Array.isArray(r)&&r.length===12&&r[0]===ROWS[i]&&r.every((x,k)=>k===10?x===null||finite(x)&&Math.abs(x)<1e5:finite(x)&&Math.abs(x)<1e5)&&Math.abs(r[1])<=.25&&r[3]>=0&&r[3]<=1&&r[4]>=0&&r[4]<=1&&Number.isInteger(r[5])&&r[5]>=0&&r[5]<=15&&r[6]>=-1&&r[6]<=2&&r[7]>=-1&&r[7]<=2&&Math.abs(r[8])<=135&&r[9]>=-1&&r[9]<=2&&r[11]>=-1&&r[11]<=2);}
 function applyInput(w,p,F){if(!validInput(p))return false;for(const a of p.rows){const r=w.rods[7-a[0]],flags=a[5];if(r.team!==1)continue;const pin=!!(flags&8);if(r.pinIntent!==pin)w.setPin(r,pin);r.targetY=clamp(-a[1],-r.limit,r.limit);r.targetTheta=clamp(-a[2],r.theta-4*Math.PI,r.theta+4*Math.PI);r.slideScale=a[3];r.spinScale=a[4];r.controlled=!!(flags&1);r.heldBy=r.controlled?'remote':null;r.directGrip=!!(flags&2);r.catchHeld=!!(flags&4);r.releaseAt=a[6]<0?-1:w.time+a[6];r.driveUntil=w.time+a[7];r.motorFeed=-a[8];r.feedUntil=w.time+a[9];r.strikeTarget=a[10]===null?null:clamp(-a[10],r.theta-4*Math.PI,r.theta+4*Math.PI);r.windUntil=w.time+a[11];}return true;}
 function interpolateBall(a,b,t){const out=a.map((n,i)=>n+(b[i]-n)*t);let sign=0;for(let i=9;i<13;i++)sign+=a[i]*b[i];for(let i=9;i<13;i++)out[i]=a[i]+((sign<0?-b[i]:b[i])-a[i])*t;const length=Math.hypot(...out.slice(9));for(let i=9;i<13;i++)out[i]/=length||1;return out;}
 function rawChannel(dc,pc){const callbacks=new Map();const emit=(n,v)=>(callbacks.get(n)||[]).forEach(f=>f(v));const o={peerConnection:pc,dataChannel:dc,get open(){return dc.readyState==='open';},on(n,f){callbacks.set(n,[...(callbacks.get(n)||[]),f]);},send(v){dc.send(JSON.stringify(v));},close(){dc.close();pc.close();}};dc.addEventListener('open',()=>emit('open'));dc.addEventListener('close',()=>emit('close'));dc.addEventListener('error',e=>emit('error',e));dc.addEventListener('message',e=>{if(typeof e.data!=='string'||e.data.length>16384)return;try{emit('data',JSON.parse(e.data));}catch{}});return o;}
 let library;
 function loadPeer(root){if(root.Peer)return Promise.resolve(root.Peer);if(library)return library;library=new Promise((resolve,reject)=>{const s=root.document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';s.crossOrigin='anonymous';s.referrerPolicy='no-referrer';const timeout=setTimeout(()=>{s.remove();library=null;reject(new Error('Connection library timed out. Check your connection and retry.'));},15000);s.onload=()=>{clearTimeout(timeout);root.Peer?resolve(root.Peer):(library=null,reject(new Error('Online library did not load.')));};s.onerror=()=>{clearTimeout(timeout);library=null;s.remove();reject(new Error('Online service could not load. Offline play still works.'));};root.document.head.appendChild(s);});return library;}
 function mount(root){
  const g=root.touchline,F=root.Foos,d=root.document;if(!g||g.online)return false;
  const $=id=>d.getElementById(id),w=g.world,clock=()=>root.performance.now();
  const session={active:false,role:null,phase:'idle',room:null,conn:null,peer:null,connected:false,started:false,ready:false,remoteReady:false,remotePaused:false,epoch:0,seq:0,lastInput:-1,lastState:-1,lastSeen:0,lastSend:0,lastPing:0,rtt:null,frames:[],message:'Create a private table or join a friend.',generation:0,bytesSent:0,bytesReceived:0,invalid:0,stale:false,finished:false,restartReady:false};
  const panel=d.createElement('dialog');panel.id='onlineDialog';panel.innerHTML=`<button type="button" class="dialog-close icon-btn" id="onlineClose" aria-label="Close online lobby">×</button><span class="eyebrow">TWO PEOPLE. ONE TABLE.</span><h2>Across the table.<br>Wherever you are.</h2><p class="online-intro">Private one-on-one matches. Both players use their usual Mint-side controls.</p><div id="onlineSetup"><button id="onlineCreate" class="primary-btn">Create private room <span>↗</span></button><label for="onlineCode">Have an invite?</label><div class="online-join"><input id="onlineCode" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Room code or invite link" maxlength="1000"><button id="onlineJoin" class="secondary-btn">Join</button></div></div><div id="onlineRoom" hidden><span class="eyebrow">YOUR PRIVATE ROOM</span><div class="online-room-code"><strong id="onlineRoomCode"></strong><button id="onlineCopy" class="secondary-btn">Copy invite</button></div><input id="onlineInvite" readonly aria-label="Invite link" hidden><div class="online-seats"><span id="onlineYou">You · not ready</span><span id="onlineFriend">Friend · waiting</span></div><button id="onlineReady" class="primary-btn" disabled>Ready to play <span>✓</span></button></div><p id="onlineStatus" role="status" aria-live="polite"></p><div class="online-actions"><button id="onlineLeave" class="secondary-btn" hidden>Leave room</button><button id="onlineBack" class="secondary-btn">Back to table</button></div><p class="online-disclosure">Online uses PeerJS community signaling and connection services. Only game data is exchanged; no camera or microphone. Share the invite only with your opponent. Keep both tabs open. Restricted networks may fail to connect; no ranked matchmaking or guaranteed relay service.</p>`;d.body.appendChild(panel);
  const style=d.createElement('style');style.id='onlineStyles';style.textContent=`
   #onlineDialog{width:min(520px,calc(100vw - 24px));max-height:calc(100dvh - 28px);margin:auto;padding:28px;border:1px solid #85a58c66;border-radius:22px;background:#183327;color:#e5efdf;box-shadow:0 20px 100px #0008;overflow:auto;font-family:var(--font)}#onlineDialog::backdrop{background:#08170eb3;backdrop-filter:blur(5px)}#onlineDialog h2{font-size:clamp(27px,6vw,38px);line-height:1.1;margin:18px 0 12px;letter-spacing:-1px}#onlineDialog button{min-height:44px;touch-action:manipulation}#onlineDialog .online-intro{font-size:13px;line-height:1.6;color:#bbcbbb;margin-bottom:22px}#onlineSetup>label{display:block;margin:20px 0 8px;font-size:12px}#onlineDialog input{min-width:0;box-sizing:border-box;background:#10271b;border:1px solid #8ca28a66;border-radius:10px;color:#eef8e8;padding:12px;font:15px var(--font);width:100%}.online-join{display:grid;grid-template-columns:1fr 72px;gap:8px}.online-join button{margin:0!important}.online-room-code{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 12px}.online-room-code strong{font-size:22px;letter-spacing:2px}.online-room-code button{font-size:11px;max-width:110px;margin:0}.online-seats{display:flex;gap:8px;margin:16px 0;font-size:12px;color:#bfdec2}.online-seats span{padding:10px;background:#29523855;border-radius:8px;flex:1}#onlineStatus{min-height:42px;font-size:13px;line-height:1.5;color:#d0e4c6;padding:12px 0 0}.online-actions{display:flex;gap:8px}.online-actions button{flex:1;font-size:12px}.online-disclosure{font-size:10px!important;line-height:1.65;color:#a5b7a5;margin:18px 0 0!important}#onlineChip{position:absolute;right:12px;bottom:82px;z-index:16;font:600 10px var(--font);border:1px solid #b6d8bd40;border-radius:16px;color:#d5efce;background:#14322275;padding:8px 12px;min-height:36px;touch-action:manipulation;backdrop-filter:none}#networkNotice{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:15;background:#153221ee;border:1px solid #c4deaf66;border-radius:16px;padding:18px 22px;max-width:80%;text-align:center;color:#edf5e3;font:600 14px/1.5 var(--font);pointer-events:none}body.menu-open #onlineChip{display:none}body.online-mode #difficultySection,body.online-mode #newMatchBtn,body.online-mode #autoResetToggle{display:none!important}body.online-mode #deadBallBtn{font-size:11px}body.online-mode #overlayScore{display:flex!important}body.online-mode #redName,body.online-mode #blueName{font-size:10px}#modeSwitch{grid-template-columns:repeat(4,minmax(0,1fr))}#modeSwitch button{padding-left:6px;padding-right:6px}body.online-mode #winScore{pointer-events:none;opacity:.55}@media(max-width:400px){#onlineDialog{padding:22px}.online-room-code strong{font-size:18px;letter-spacing:1px}#onlineDialog h2{font-size:28px}}`;
  d.head.appendChild(style);
  const mode=d.createElement('button');mode.id='onlineMode';mode.type='button';mode.textContent='Online';$('modeSwitch').appendChild(mode);
  const chip=d.createElement('button');chip.id='onlineChip';chip.hidden=true;chip.setAttribute('aria-label','Online connection and room');$('arena').appendChild(chip);
  const notice=d.createElement('div');notice.id='networkNotice';notice.hidden=true;$('arena').appendChild(notice);
  function show(){if(!panel.open)panel.showModal();render();}
  function hide(){if(panel.open)panel.close();}
  function message(text){session.message=text;render();}
  function isLocalPaused(){return session.started&&(d.hidden||g.state==='paused'||panel.open||g.state==='ready');}
  function shouldFreeze(){return !session.connected||!session.started||session.finished||session.stale||session.remotePaused||isLocalPaused();}
  function send(p,urgent=false){const c=session.conn;if(!c?.open)return false;const bytes=JSON.stringify(p).length;if(bytes>16384)return false;if(!urgent&&(c.dataChannel?.bufferedAmount||0)>32768)return false;try{c.send(p);session.bytesSent+=bytes;return true;}catch{return false;}}
  function packet(t,extra={}){return {t,v:VERSION,...extra};}
  function cleanup(){session.generation++;const peer=session.peer,conn=session.conn;if(session.savedAutoReset!==undefined){g.setAutoReset(session.savedAutoReset);delete session.savedAutoReset;}session.active=false;session.started=false;session.connected=false;session.peer=session.conn=null;session.phase='idle';session.room=null;session.frames=[];session.ready=session.remoteReady=false;session.role=null;session.stale=false;session.finished=false;session.remotePaused=false;w.paused=false;d.body.classList.remove('online-mode');try{conn?.close();peer?.destroy();}catch{}chip.hidden=true;notice.hidden=true;}
  function leave(){send(packet('leave'),true);const was=session.active;cleanup();if(was){g.setMode('solo');g.openSettings();}message('Room closed. Offline play is ready.');hide();}
  function failed(text){if(session.active){session.connected=false;session.stale=true;session.phase='disconnected';w.paused=true;}message(text);}
  function render(){
   $('onlineStatus').textContent=session.message;
   $('onlineSetup').hidden=!!session.room;$('onlineRoom').hidden=!session.room;$('onlineLeave').hidden=!session.active;
   $('onlineRoomCode').textContent=session.room?session.room.slice(0,5)+' '+session.room.slice(5):'';
   $('onlineYou').textContent='You · '+(session.ready?'ready':'not ready');$('onlineFriend').textContent='Friend · '+(!session.connected?'waiting':session.remoteReady?'ready':'connected');
   $('onlineReady').disabled=!session.connected||session.ready||session.started&&!session.finished;
   $('onlineReady').innerHTML=(session.ready?'Waiting for friend':session.finished?'Ready for rematch':'Ready to play')+' <span>✓</span>';
   $('onlineBack').textContent=session.started?'Return to match':'Back to table';
   $('onlineCreate').disabled=['loading','connecting'].includes(session.phase);$('onlineJoin').disabled=$('onlineCreate').disabled;
  }
  function greeting(){send(packet('hello',{room:session.room}),true);session.lastSeen=clock();}
  function bind(c,role,room){
   if(session.conn&&session.conn!==c){try{c.close();}catch{}return false;}
   session.role=role;session.room=room;session.conn=c;session.active=true;session.phase='connecting';session.lastSeen=clock();
   const onOpen=()=>{if(session.conn!==c)return;greeting();message('Connected. Checking game versions…');};
   c.on('open',onOpen);c.on('data',p=>{if(session.conn!==c)return;receive(p);});c.on('close',()=>{if(session.conn===c)failed('Your friend disconnected. This match is paused. Leave and create a new room to reconnect.');});c.on('error',()=>{if(session.conn===c)failed('Connection interrupted. Keep the tab open, or leave and try a new room.');});
   if(c.open)onOpen();return true;
  }
  function snapshot(urgent=false){if(session.role!=='host'||!session.started)return;send(packState(w,++session.seq,session.epoch,shouldFreeze(),g.state==='finished'),urgent);}
  function startLocal(){
   const oldActive=session.active;session.started=false;w.paused=false;g.setMode('solo');$('winScore').querySelector('[data-score="5"]').click();g.start();session.active=oldActive;session.started=true;session.phase='playing';session.finished=false;session.stale=false;session.remotePaused=false;session.ready=session.remoteReady=false;session.frames=[];session.lastInput=session.lastState=-1;session.lastSeen=clock();session.lastScore=[0,0];w.botStall=null;w.score=[0,0];w.serveRemaining=1.5;w.serveDuration=1.5;if(session.savedAutoReset===undefined)session.savedAutoReset=g.recovery.auto;g.setAutoReset(true);d.body.classList.add('online-mode');hide();message('Match connected. First to 5.');chip.hidden=false;
  }
  function hostStart(){session.epoch++;startLocal();send(packet('start',{epoch:session.epoch}),true);snapshot(true);}
  function ready(){if(!session.connected||session.started&&!session.finished)return;session.ready=true;send(packet('ready'),true);render();if(session.role==='host'&&session.remoteReady)hostStart();}
  function receive(p){
   if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.t!=='string')return;
   let size;try{size=JSON.stringify(p).length;}catch{return;}if(size>16384){session.invalid++;return;}
   if(p.v!==VERSION){failed('Different game versions. Both players should refresh this page, then create a new room.');return;}
   session.bytesReceived+=size;session.lastSeen=clock();
   if(p.t==='hello'){
    if(p.room!==session.room){failed('Room code did not match.');return;}
    const first=!session.connected;session.connected=true;session.phase='lobby';session.stale=false;if(first)send(packet('hello',{room:session.room}),true);message('Friend connected. Both players press Ready to play.');return;
   }
   if(!session.connected)return;
   if(p.t==='leave'){failed('Your friend left the room. The match has stopped.');return;}
   if(p.t==='ping'&&finite(p.at)){send(packet('pong',{at:p.at}),true);return;}
   if(p.t==='pong'&&finite(p.at)){const rtt=clock()-p.at;if(rtt>=0&&rtt<15000)session.rtt=session.rtt===null?rtt:.8*session.rtt+.2*rtt;return;}
   if(p.t==='ready'){session.remoteReady=true;render();if(session.role==='host'&&session.ready&&(!session.started||session.finished))hostStart();return;}
   if(p.t==='start'&&session.role==='guest'&&Number.isSafeInteger(p.epoch)&&p.epoch>session.epoch){session.epoch=p.epoch;startLocal();return;}
   if(p.t==='input'&&session.role==='host'&&session.started){
    if(!validInput(p)||p.seq<=session.lastInput||p.epoch!==session.epoch){session.invalid++;return;}
    session.lastInput=p.seq;session.remotePaused=!!p.paused;if(!session.remotePaused&&!session.finished)applyInput(w,p,F);return;
   }
   if(p.t==='state'&&session.role==='guest'&&session.started){
    if(!validState(p)||p.seq<=session.lastState||p.epoch<session.epoch){session.invalid++;return;}
    session.lastState=p.seq;
    if(p.epoch!==session.epoch){session.epoch=p.epoch;session.frames=[];for(const r of w.rods){r.pinJoint=null;r.pinIntent=false;r.driveUntil=r.releaseAt=-1;r.strikeTarget=null;}}
    session.frames.push({p,at:clock()});if(session.frames.length>8)session.frames.shift();session.remotePaused=!!p.paused;session.finished=!!p.finished;
    w.score=[p.score[1],p.score[0]];w.goalLock=p.lock;w.serveDuration=1.5;
    if(session.lastScore&&w.score.some((v,i)=>v!==session.lastScore[i])){g.makeSound('goal',.2);session.goalUntil=clock()+1100;session.goalText=w.score[0]>session.lastScore[0]?'You scored':'Friend scored';}session.lastScore=[...w.score];
    if(p.finished)message(w.score[0]>w.score[1]?'You won. Open the room for a rematch.':'Friend won. Open the room for a rematch.');
    const age=Math.min(.15,(session.rtt||0)/2000);if(Math.abs(w.time-p.time)>.15)w.time=p.time+age;
    return;
   }
   if(p.t==='control'&&typeof p.paused==='boolean'){session.remotePaused=p.paused;return;}
   if(p.t==='reserve'&&session.role==='host'&&session.started&&w.isDeadBall()){g.resetRally(w.lastTouch===0?1:0);snapshot(true);}
  }
  async function connect(role,text){
   const code=role==='host'?roomCode(root.crypto):parseRoom(text);if(!code){message('Enter the 10-character room code or paste the invite link.');return;}
   cleanup();session.phase='loading';session.active=true;session.role=role;session.room=code;session.generation++;const generation=session.generation;g.openSettings();show();message('Preparing a secure game connection…');
   try{
    if(!root.RTCPeerConnection)throw new Error('This browser does not support WebRTC. Try current Safari, Chrome, Edge, or Firefox.');
    const Peer=await loadPeer(root);if(generation!==session.generation)return;
    const id='pocketfoosball12-'+(role==='host'?code:roomCode(root.crypto));const peer=new Peer(id,{debug:0,secure:true});session.peer=peer;session.phase='connecting';
    const timer=setTimeout(()=>{if(generation===session.generation&&!session.connected&&(role==='guest'||session.conn))failed('Could not connect. Check the code and both tabs. A firewall or the community connection service may be blocking this network.');},22000);
    peer.on('open',()=>{
     if(generation!==session.generation){peer.destroy();return;}
     if(role==='host'){session.phase='lobby';message('Room created. Share the invite, then both players press Ready.');}
     else{message('Finding your friend’s table…');bind(peer.connect('pocketfoosball12-'+code,{serialization:'json',reliable:true,metadata:{v:VERSION,room:code}}),'guest',code);}
    });
    peer.on('connection',c=>{if(role!=='host'||session.conn||c.metadata?.room!==code||c.metadata?.v!==VERSION){c.on('open',()=>c.close());return;}bind(c,'host',code);});
    peer.on('call',c=>c.close());
    peer.on('error',e=>{clearTimeout(timer);if(generation!==session.generation)return;const names={'peer-unavailable':'Room not found. Ask your friend to keep their room open and check the code.','unavailable-id':'This room code is in use. Create another room.','network':'The connection service is unavailable on this network. Retry or switch networks.'};failed(names[e.type]||'Online connection failed. Offline modes are still available.');});
    peer.on('disconnected',()=>{if(generation===session.generation&&!session.conn?.open)failed('Disconnected from the room service. Leave and retry.');});
   }catch(e){if(generation===session.generation)failed(e.message||'Unable to connect.');}
  }
  function applyGuestView(){
   const frames=session.frames;if(!frames.length)return;
   const now=clock(),newest=frames[frames.length-1],latest=newest.p;
   // A short render buffer avoids snapshot jitter; bounded extrapolation stops
   // at 35 ms rather than inventing a long path through a defender or goal.
   const target=now-45;let before=frames[0],after=frames[0];for(const f of frames){if(f.at<=target)before=f;if(f.at>=target){after=f;break;}after=f;}
   const t=after.at>before.at?clamp((target-before.at)/(after.at-before.at),0,1):1;
   let ball=interpolateBall(mirrorBall(before.p.ball,F.C),mirrorBall(after.p.ball,F.C),t);
   if(target>newest.at&&!latest.paused&&latest.serve===0&&latest.lock===0){const dt=Math.min(.035,(target-newest.at)/1000);ball[0]+=ball[3]*dt;ball[1]+=ball[4]*dt;ball[2]=Math.max(F.C.radius,ball[2]+ball[5]*dt);const q=g.rolling.advance({qx:ball[9],qy:ball[10],qz:ball[11],qw:ball[12]},ball.slice(6,9),dt);ball.splice(9,4,q.qx,q.qy,q.qz,q.qw);}
   BALL.forEach((k,i)=>w.ball[k]=ball[i]);
   w.serveRemaining=Math.max(0,latest.serve-(latest.paused?0:(now-newest.at)/1000));w.goalLock=latest.lock;w.deadTime=latest.dead?2:0;
   for(const r of w.rods){const a=latest.rods[7-r.id],remote=r.team!==0,locked=a[7]>=0;
    if(remote||!r.controlled||locked){const k=remote||locked?1:.4;r.y+=( -a[0]-r.y)*k;r.theta+=(-a[1]-r.theta)*k;r.vy=-a[2];r.omega=-a[3];}
    if(remote){r.targetY=-a[4];r.targetTheta=-a[5];r.pinIntent=!!a[6];}
    if(a[6]&&r.pinIntent||remote){r.pinJoint=locked?{x:F.C.length-a[8],theta:-a[1],index:r.bases.length-1-a[7],normal:{x:0,y:0,z:-1}}:null;r.pinRequested=locked;r.pinStage=locked?'held':r.pinIntent?'waiting':null;r.pinSide=-a[9];if(locked)r.targetTheta=-a[1];}
    else r.pinJoint=null;
   }
  }
  const oldStep=w.step,oldReset=w.reset,oldDead=w.isDeadBall,brainUpdate=F.Brain.prototype.update;
  w.step=function(dt=F.C.fixedDt){
   if(!session.active||!session.started)return oldStep.call(this,dt);
   if(shouldFreeze()){this.paused=true;this.events.length=0;return;}
   this.paused=false;
   if(session.role==='guest'){this.time+=dt;this.moveRods(dt);this.events.length=0;return;}
   const result=oldStep.call(this,dt);
   const sound=this.events.filter(e=>['hit','touch','bank','serve'].includes(e.type)).map(e=>[e.type,Math.min(1,(e.impulse||.02)*14)]);if(sound.length)send(packet('audio',{items:sound.slice(0,6)}));return result;
  };
  w.reset=function(...args){const ret=oldReset.apply(this,args);if(session.active&&session.started&&session.role==='host')session.epoch++;return ret;};
  w.isDeadBall=function(){return session.active&&session.role==='guest'?false:oldDead.call(this);};
  F.Brain.prototype.update=function(world,dt){if(session.active&&world===w)return;return brainUpdate.call(this,world,dt);};
  const oldDraw=g.renderer.draw;g.renderer.draw=function(...args){
   if(session.active&&session.started&&session.role==='guest')applyGuestView();
   oldDraw.apply(this,args);if(!session.active)return;
   chip.hidden=false;chip.textContent=(session.connected?(session.rtt===null?'Online':Math.round(session.rtt)+' ms'):'Disconnected')+' · Room';
   $('blueName').textContent='YOU';$('redName').textContent='FRIEND';$('overlayScore').querySelector('span').textContent='YOU';$('overlayScore').querySelector('.rival').textContent='FRIEND';
   $('onlineMode').classList.add('active');
   if(session.started){
    const finished=session.role==='host'?g.state==='finished':session.finished;if(finished){session.finished=true;session.phase='finished';}
    let text=finished?(w.score[0]>w.score[1]?'You win!':'Friend wins.')+' Open Room for a rematch.':session.stale?'Connection interrupted · match frozen':!session.connected?'Friend disconnected · match frozen':session.remotePaused?'Friend paused · waiting for their return':clock()<(session.goalUntil||0)?session.goalText:'';
    notice.textContent=text;notice.hidden=!text;
   }
  };
  // Session heartbeats run independently of rendering, including while menus
  // are open. Lost or backgrounded peers freeze the host instead of conceding.
  root.setInterval(()=>{
   if(!session.active||!session.conn?.open)return;
   const now=clock();const wasStale=session.stale;session.stale=now-session.lastSeen>1200;
   if(wasStale&&!session.stale&&session.role==='host'&&session.started&&w.goalLock<=0)w.beginServe(1);
   if(now-session.lastPing>700){session.lastPing=now;send(packet('ping',{at:now}),true);send(packet('control',{paused:isLocalPaused()}),true);}
   if(session.started&&now-session.lastSend>=25){session.lastSend=now;if(session.role==='host')snapshot();else send(captureInput(w,++session.seq,session.epoch,isLocalPaused()));}
   if(session.stale)w.paused=true;
  },16);
  const priorReceive=receive; // audio is intentionally not inserted into the
  // simulation event queue: the guest never awards its own goals or resets.
  receive=function(p){if(p?.t==='audio'&&p.v===VERSION&&session.role==='guest'&&session.connected){if(Array.isArray(p.items)&&p.items.length<=6)for(const a of p.items)if(Array.isArray(a)&&['hit','touch','bank','serve'].includes(a[0])&&finite(a[1]))g.makeSound(a[0],clamp(a[1],0,1));return;}return priorReceive(p);};
  $('onlineCreate').onclick=()=>connect('host');$('onlineJoin').onclick=()=>connect('guest',$('onlineCode').value);$('onlineCode').onkeydown=e=>{if(e.key==='Enter')connect('guest',e.target.value);};$('onlineReady').onclick=ready;$('onlineLeave').onclick=leave;$('onlineClose').onclick=hide;$('onlineBack').onclick=()=>{hide();if(session.started&&g.state==='paused')g.start();};mode.onclick=show;chip.onclick=show;
  $('onlineCopy').onclick=async()=>{if(!session.room)return;const url=new URL(root.location.href);url.search='';url.hash='room='+session.room;const value=url.href;$('onlineInvite').value=value;try{await root.navigator.clipboard.writeText(value);message('Invite copied. Send it privately to your opponent.');}catch{$('onlineInvite').hidden=false;$('onlineInvite').select();message('Select and copy the invite below the room code.');}};
  d.addEventListener('click',e=>{if(!session.active)return;const change=e.target.closest('#modeSwitch [data-mode]');if(change){cleanup();return;}if(e.target.closest('#newMatchBtn')||session.finished&&e.target.closest('#playBtn,#canvasStart')){e.preventDefault();e.stopImmediatePropagation();show();}if(e.target.closest('#deadBallBtn')&&session.role==='guest'){e.preventDefault();e.stopImmediatePropagation();send(packet('reserve'),true);}},{capture:true});
  d.addEventListener('visibilitychange',()=>{if(session.connected)send(packet('control',{paused:d.hidden||isLocalPaused()}),true);});root.addEventListener('pagehide',()=>{send(packet('leave'),true);cleanup();});
  panel.addEventListener('cancel',()=>{if(session.started&&g.state==='paused')g.start();});
  const invite=parseRoom(root.location.hash);if(invite){$('onlineCode').value=invite;message('You have a private-table invite. Press Join to connect.');show();}
  g.online={session,create:()=>connect('host'),join:code=>connect('guest',code),ready,leave,show,send,bind,rawChannel,snapshot,applyGuestView};
  const guide=[...$('guideDialog').querySelectorAll('p')].find(e=>e.textContent.includes('There is no online multiplayer.'));if(guide)guide.textContent=guide.textContent.replace('There is no online multiplayer.','Online mode creates a private WebRTC room: share the invite, then both players press Ready. Both see themselves at the Mint end, with their usual controls.');
  render();return true;
 }
 return {VERSION,ROWS,BALL,roomCode,parseRoom,packBall,mirrorBall,validState,packState,captureInput,validInput,applyInput,interpolateBall,rawChannel,mount};
});
