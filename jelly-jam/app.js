(function(){
'use strict';
const E=JellyEngine,$=id=>document.getElementById(id),modal=$('modal');
const renderer=new JellyRenderer($('game')),preview=new JellyRenderer($('preview'));
let state=E.create(0),mode='local',playing=false,paused=false,soloActive=0,seq=0,lastSeq=-1,remoteInput={},remoteAt=0,remoteHidden=false,winShown=false,guestDraw=null,modalKind='',soundOn=false,audio=null,announceTimer,toastTimer,sendClock=0;
const keys=new Set(),pointers=new Map();
let records={};try{const x=JSON.parse(localStorage.getItem('jelly-jam-v1')||'{}');if(x&&typeof x==='object'&&!Array.isArray(x))records=x;}catch{}
const online=()=>mode==='host'||mode==='guest';
const time=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const safeRecord=i=>{const r=records[i];return r&&Number.isFinite(r.time)&&r.time>0&&Number.isFinite(r.rescues)?r:null;};
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function announce(message){$('announcement').textContent=message;$('announcement').classList.add('show');clearTimeout(announceTimer);announceTimer=setTimeout(()=>$('announcement').classList.remove('show'),2300);}
function clearInputs(){keys.clear();pointers.clear();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));if(mode==='guest')room.send({type:'input',left:false,right:false,jump:false});}
function tone(type){if(!soundOn)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const notes={jump:[330,490],super:[390,780],spring:[220,880],star:[740,1100],gate:[440,660],checkpoint:[550,800],rescue:[200,110],win:[523,659,784,1046],click:[520]};(notes[type]||notes.click).forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.07;o.type='sine';o.frequency.setValueAtTime(hz,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.17);});}catch{}}
function closeModal(){if(modal.open)modal.close();modalKind='';}
function openModal(kind,html){clearInputs();modalKind=kind;$('modalContent').innerHTML=html;if(!modal.open)modal.showModal();}
const closeButton='<button class="close" id="closeDialog" aria-label="Close dialog">×</button>';
function dialogClose(){if(modalKind==='lobby'){room.close();closeModal();}else if(modalKind==='win'||modalKind==='disconnect')return;else{closeModal();if(playing)setPaused(false);}}
modal.addEventListener('cancel',e=>{e.preventDefault();dialogClose();});
modal.addEventListener('click',e=>{if(e.target.id==='closeDialog')dialogClose();});
function showHome(){room.close();playing=false;paused=false;mode='local';clearInputs();closeModal();$('home').hidden=false;$('play').hidden=true;document.body.classList.remove('in-game');$('stageVeil').hidden=true;const url=new URL(location.href);url.hash='';history.replaceState(null,'',url);}
function updateControls(){
 const who=mode==='guest'?1:mode==='solo'?soloActive:0;
 document.querySelectorAll('.touch-player').forEach(el=>{el.hidden=mode==='local'?false:Number(el.dataset.player)!==who;});
 $('swap').hidden=mode!=='solo';
 if(online()){$('peachKeys').innerHTML=`<b class="${who?'mint':'peach'}-text">${who?'◆ You are Mint':'● You are Peach'}</b> <kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump · arrow keys work too`;$('mintKeys').textContent='Send the room link to your buddy. Keep this tab open.';}
 else if(mode==='solo'){$('peachKeys').innerHTML=`<b class="${who?'mint':'peach'}-text">${who?'◆ Mint':'● Peach'} selected</b> <kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump`;$('mintKeys').innerHTML='<kbd>Tab</kbd> switch buddy · the other one stays put';}
 else{$('peachKeys').innerHTML='<b class="peach-text">● Peach</b> <kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump';$('mintKeys').innerHTML='<b class="mint-text">◆ Mint</b> <kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump';}
 $('levels').disabled=mode==='guest';
}
function showPlay(){playing=true;$('home').hidden=true;$('play').hidden=false;document.body.classList.add('in-game');updateControls();updateHUD();if(!online())$('networkStatus').textContent=mode==='solo'?'● Solo practice · Tab to switch':'● Same keyboard';}
function start(newMode='local',level=0){room.close();mode=newMode;soloActive=0;loadLevel(level);showPlay();$('game').focus({preventScroll:true});}
function loadLevel(level){state=E.create(level);guestDraw=null;paused=false;remoteInput={};winShown=false;renderer.particles=[];closeModal();clearInputs();$('stageVeil').hidden=true;updateHUD();if(mode==='host')sendState();}
function updateHUD(){const l=E.levels[state.level];$('levelTag').textContent=l.tag;$('levelTitle').textContent=String(state.level+1).padStart(2,'0')+' / '+l.name;$('starCount').textContent=state.stars.map(b=>b?'★':'☆').join(' ');$('starCount').setAttribute('aria-label',state.stars.filter(Boolean).length+' of 3 stars collected');$('timer').textContent=time(state.t);$('tip').textContent=l.hint;$('pause').textContent=paused?'▶ Resume':'Ⅱ Pause';$('stageVeil').hidden=!paused;}
function sendState(){if(mode==='host'&&room.connected)room.send({type:'state',seq:++seq,state:E.snapshot(state),paused});}
function setPaused(value){clearInputs();if(mode==='guest'){room.send({type:'pause',value:!!value});if(!value&&remoteHidden)return;}else if(!value&&(document.hidden||remoteHidden)&&online()){toast('Both buddies need to return to their game tabs first.');return;}paused=!!value;updateHUD();sendState();}
function pauseMenu(){if(!playing)return;setPaused(true);openModal('pause',`${closeButton}<div class="eyebrow">TAKE A LITTLE BREATHER</div><h2 id="modalTitle">Your buddy can wait.</h2><p>Grab a snack. Stretch your fingers. The adventure will be right here.</p><button class="primary" id="resume">Back to the good stuff →</button><button class="secondary" id="pauseRetry">Restart this level</button><button class="quiet" id="leave" style="width:100%;margin-top:15px">Leave game & return to menu</button>`);$('resume').onclick=()=>{closeModal();setPaused(false);};$('pauseRetry').onclick=retry;$('leave').onclick=showHome;}
function retry(){if(mode==='guest'){room.send({type:'restart'});closeModal();}else loadLevel(state.level);}
function chooseLevel(){if(mode==='guest')return;setPaused(true);openModal('levels',`${closeButton}<div class="eyebrow">YOUR LITTLE ADVENTURE</div><h2 id="modalTitle">Pick a pocket of joy.</h2><p>Every level is open. Start anywhere, or come back for a faster, cleaner run.</p><div class="level-grid">${E.levels.map((l,i)=>{const r=safeRecord(i);return `<button class="level-card" data-level="${i}">${String(i+1).padStart(2,'0')} ${r?'✓':''}<b>${l.name}</b><span>${r?'Best '+time(r.time)+' · '+r.rescues+' rescues':'Ready for your first adventure'}</span></button>`;}).join('')}</div>`);document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>loadLevel(Number(b.dataset.level)));}
function showHelp(){if(playing)setPaused(true);openModal('help',`${closeButton}<div class="eyebrow">THREE KEYS. INFINITE GOOD VIBES.</div><h2 id="modalTitle">You’ve already got this.</h2><div class="help-row"><b>● Peach: A / D to move, W to jump.</b><b>◆ Mint: ← / → to move, ↑ to jump.</b>Online or solo? Either set of keys controls your buddy. On touchscreens, use the big arrow buttons.</div><div class="help-row"><b>★ Collect all 3 stars. Meet at the rainbow door.</b>Both buddies need to be there. No one gets left behind.</div><div class="help-row"><b>✿ Two flower buttons = two buddies.</b>Stand on both together for half a second. The gate stays open, so you can both leave.</div><div class="help-row"><b>↑ Mushrooms go boing. Your color is safe.</b>Peach likes peach soda and circle platforms. Mint likes mint soda and diamond platforms. Everything is marked with a shape, too.</div><div class="help-row"><b>♡ Try a synchronized super jump.</b>Stand close and jump at the same time. Oops? Instant rescue. Flags save a checkpoint for both of you.</div><p>Hold jump for a higher hop. R retries. Escape pauses. Solo practice: Tab switches between buddies.</p><button id="gotIt" class="primary">Let’s do this →</button>`);$('gotIt').onclick=dialogClose;}
function showWin(){
 winShown=true;const l=E.levels[state.level],r=safeRecord(state.level),best=!r||state.t<r.time;
 records[state.level]={time:best?state.t:r.time,rescues:Math.min(state.rescues,r?r.rescues:state.rescues)};try{localStorage.setItem('jelly-jam-v1',JSON.stringify(records));}catch{}
 const final=state.level===E.levels.length-1,medal=state.rescues===0?(state.t<=l.par?'GOLDEN BUDDIES':'SMOOTH OPERATORS'):'GOOD VIBES ONLY';
 openModal('win',`<div class="result-icon">${final?'♡':'✦'}</div><div class="eyebrow" style="justify-content:center">${medal}</div><h2 id="modalTitle" style="text-align:center">${final?'You two are a whole vibe.':'That’s the power of two.'}</h2><p style="text-align:center">${final?'Ten little adventures. One very good team. Thanks for playing Jelly Jam.':best?'Your fastest run of this level. Nicely done, buddies!':'Another little adventure, conquered together.'}</p><div class="result-stats"><div><b>${time(state.t)}</b><span>TEAM TIME</span></div><div><b>3 / 3</b><span>STARS</span></div><div><b>${state.rescues}</b><span>RESCUES</span></div></div><button class="primary" id="nextLevel" ${mode==='guest'?'disabled':''}>${mode==='guest'?'Waiting for Peach to choose…':final?'One more adventure? →':'Next little adventure →'}</button><button class="secondary" id="winRetry" ${mode==='guest'?'disabled':''}>Go again · beat your time</button><button class="quiet" id="winMenu" style="width:100%;margin-top:13px">Back to menu</button>`);
 $('nextLevel').onclick=()=>loadLevel((state.level+1)%E.levels.length);$('winRetry').onclick=retry;$('winMenu').onclick=showHome;
}
function lobby(){
 room.close();openModal('lobby',`${closeButton}<div class="eyebrow">ANYWHERE IS BETTER TOGETHER</div><h2 id="modalTitle">Bring your favorite +1.</h2><p>Create a room, then send your friend the link. You’re Peach. They’re Mint. No accounts needed.</p><button id="hostRoom" class="primary">Create a room ↗</button><div class="rule">OR JOIN YOUR BUDDY</div><form id="joinForm" class="room-form"><input id="roomInput" aria-label="8-character room code" placeholder="ROOM CODE" maxlength="12" autocomplete="off" spellcheck="false" autocapitalize="characters" required><button class="secondary" type="submit">Join →</button></form><p class="error" id="roomError" role="status"></p><p style="font-size:10px">Online play needs internet and a browser that supports WebRTC. Some school, work, VPN, or strict networks may block direct connections.</p>`);
 $('hostRoom').onclick=()=>{state=E.create(0);mode='host';$('hostRoom').disabled=true;room.start('host');};
 $('joinForm').onsubmit=e=>{e.preventDefault();join($('roomInput').value);};
}
function join(code){mode='guest';if($('roomError'))$('roomError').textContent='Connecting to your buddy…';room.start('guest',code);}
function waiting(code){
 openModal('lobby',`${closeButton}<div class="eyebrow">ONE ROOM. TWO VERY GOOD BUDDIES.</div><h2 id="modalTitle">Your +1 is invited.</h2><p>Send this link to your friend, or ask them to enter the code. The game starts when they join.</p><div class="room-code" id="roomCode">${code.slice(0,4)} ${code.slice(4)}</div><button id="copyInvite" class="primary">Copy invite link ↗</button><button id="copyCode" class="secondary">Copy room code</button><p id="roomError" class="error" role="status">Waiting for your buddy…</p><p style="font-size:10px">Keep this tab open. Anyone with the code can join your two-person room.</p>`);
 $('copyInvite').onclick=()=>{const url=new URL(location.href);url.search='';url.hash='room='+code;if(location.protocol==='file:'){copy(code);toast('Local file: share the room code, not a file link.');}else copy(url.href);};$('copyCode').onclick=()=>copy(code);
}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied! Send it to your buddy.');}catch{const el=document.createElement('textarea');el.value=text;el.style.cssText='position:fixed;top:0;left:0;width:2px;height:2px;opacity:.01';(modal.open?$('modalContent'):document.body).append(el);el.select();let ok=false;try{ok=document.execCommand('copy');}catch{}el.remove();if(ok)toast('Copied!');else{if($('roomError'))$('roomError').textContent=text;toast('Copy the link or code shown in the dialog.');}}}
function disconnected(message){
 paused=true;clearInputs();updateHUD();$('networkStatus').textContent='● Disconnected';
 openModal('disconnect',`<div class="eyebrow">NO BUDDY LEFT BEHIND</div><h2 id="modalTitle">Lost the connection.</h2><p id="disconnectMessage"></p><div class="room-code">${room.code.slice(0,4)} ${room.code.slice(4)}</div>${mode==='guest'?'<button class="primary" id="rejoin">Rejoin the room →</button>':'<p>Your room is still open. Ask your buddy to join again with the same code.</p>'}<button class="secondary" id="continueLocal">Keep playing on one keyboard</button><button class="quiet" id="disconnectHome" style="width:100%;margin-top:12px">Back to menu</button>`);$('disconnectMessage').textContent=message;if($('rejoin'))$('rejoin').onclick=()=>join(room.code);$('continueLocal').onclick=()=>{room.close();mode='local';paused=false;clearInputs();closeModal();showPlay();};$('disconnectHome').onclick=showHome;
}
const room=new JellyNetwork.Room({
 ready:waiting,
 status:message=>{if($('roomError'))$('roomError').textContent=message;},
 error:message=>{if($('roomError')){$('roomError').textContent=message;if($('hostRoom'))$('hostRoom').disabled=false;}else toast(message);},
 connected:role=>{mode=role;paused=false;remoteHidden=false;remoteInput={};remoteAt=performance.now();lastSeq=-1;guestDraw=null;winShown=false;closeModal();showPlay();$('networkStatus').textContent='● Connected · '+(role==='host'?'you are Peach':'you are Mint');announce('Your buddy is here. Let’s jam!');if(role==='host')sendState();},
 disconnected,
 latency:ms=>{if(online())$('networkStatus').textContent='● '+(mode==='host'?'Peach':'Mint')+' · '+Math.round(ms)+' ms';},
 message:data=>{
  if(mode==='host'){
   if(data.type==='input'){remoteInput={left:data.left===true,right:data.right===true,jump:data.jump===true};remoteAt=performance.now();}
   else if(data.type==='pause'&&typeof data.value==='boolean'){setPaused(data.value);if(paused&&!state.won&&!modal.open)pauseMenu();else if(!paused&&modalKind==='pause')closeModal();}
   else if(data.type==='visibility'){remoteHidden=data.hidden===true;if(remoteHidden){setPaused(true);if(!modal.open)pauseMenu();}}
   else if(data.type==='restart'&&!document.hidden&&!remoteHidden)loadLevel(state.level);
  }else if(mode==='guest'&&data.type==='state'&&Number.isInteger(data.seq)&&data.seq>lastSeq&&E.validSnapshot(data.state)){
   lastSeq=data.seq;const previous=state,oldLevel=state.level;state=data.state;paused=data.paused===true;
   if(oldLevel!==state.level||previous.won&&!state.won||state.t<previous.t){winShown=false;guestDraw=null;closeModal();renderer.particles=[];}
   if(!state.won&&paused&&!modal.open)pauseMenu();else if(!paused&&modalKind==='pause')closeModal();
   if(state.stars.filter(Boolean).length>previous.stars.filter(Boolean).length)tone('star');
   if(!paused&&modalKind==='disconnect')closeModal();updateHUD();
  }
 }
});
function keyboardSet(which){return which===0?{left:keys.has('KeyA'),right:keys.has('KeyD'),jump:keys.has('KeyW')||keys.has('Space')}:{left:keys.has('ArrowLeft'),right:keys.has('ArrowRight'),jump:keys.has('ArrowUp')};}
function inputFor(which){const a=keyboardSet(which);for(const p of pointers.values())if(p.player===which)a[p.key]=true;return a;}
function currentInputs(){if(paused||modal.open)return [{},{}];if(mode==='local')return [inputFor(0),inputFor(1)];const a=inputFor(0),b=inputFor(1),merged={left:a.left||b.left,right:a.right||b.right,jump:a.jump||b.jump};if(mode==='solo'){const list=[{},{}];list[soloActive]=merged;return list;}return mode==='host'?[merged,performance.now()-remoteAt<350?remoteInput:{}]:[{},merged];}
function sendInput(){if(mode==='guest'&&room.connected){const a=currentInputs()[1];room.send({type:'input',left:!!a.left,right:!!a.right,jump:!!a.jump});}}
function swap(){if(mode!=='solo')return;clearInputs();soloActive=1-soloActive;updateControls();announce(soloActive?'◆ Mint’s turn!':'● Peach’s turn!');}
const gameCodes=new Set(['KeyA','KeyD','KeyW','Space','ArrowLeft','ArrowRight','ArrowUp']);
window.addEventListener('keydown',e=>{if(!playing||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Escape'){e.preventDefault();if(modal.open)dialogClose();else pauseMenu();return;}if(modal.open)return;if(e.code==='KeyR'&&!e.repeat){e.preventDefault();retry();return;}if(e.code==='Tab'&&mode==='solo'){e.preventDefault();if(!e.repeat)swap();return;}if(gameCodes.has(e.code)){e.preventDefault();keys.add(e.code);sendInput();}});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(playing&&gameCodes.has(e.code)){e.preventDefault();sendInput();}});
window.addEventListener('blur',clearInputs);
document.addEventListener('visibilitychange',()=>{clearInputs();if(playing&&online()){if(mode==='guest')room.send({type:'visibility',hidden:document.hidden});if(document.hidden){setPaused(true);if(!modal.open)pauseMenu();}}});
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{if(!playing||paused||modal.open)return;e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{player:Number(b.dataset.p),key:b.dataset.key});b.classList.add('pressed');sendInput();});const release=e=>{pointers.delete(e.pointerId);if(!Array.from(pointers.values()).some(p=>p.player===Number(b.dataset.p)&&p.key===b.dataset.key))b.classList.remove('pressed');sendInput();};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);b.addEventListener('contextmenu',e=>e.preventDefault());}
$('local').onclick=()=>start('local');$('solo').onclick=()=>start('solo');$('online').onclick=lobby;$('help').onclick=showHelp;$('brand').onclick=e=>{e.preventDefault();playing?pauseMenu():showHome();};$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent=soundOn?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(soundOn));tone('click');};$('pause').onclick=()=>{if(paused){closeModal();setPaused(false);}else pauseMenu();};$('restart').onclick=retry;$('levels').onclick=chooseLevel;$('swap').onclick=swap;
let last=performance.now(),acc=0,lastPaint=performance.now(),hudClock=0;
setInterval(()=>{
 const now=performance.now(),elapsed=Math.min(.1,(now-last)/1000);last=now;sendClock+=elapsed;hudClock+=elapsed;
 if(playing&&!paused&&!state.won&&mode!=='guest'){
  acc+=elapsed;while(acc>=E.DT){E.step(state,currentInputs());acc-=E.DT;renderer.effects(state);for(const e of state.events){tone(e.type);if(e.type==='super')announce('SUPER BUDDY BOUNCE!');if(e.type==='gate')announce('Flower power! The gate is open.');if(e.type==='checkpoint')announce('Checkpoint! Both buddies are safe.');}if(state.won)break;}
 }else acc=0;
 if(sendClock>=1/30){sendClock=0;if(mode==='host')sendState();else if(mode==='guest')sendInput();}
 if(playing&&hudClock>.15){hudClock=0;updateHUD();}
 if(playing&&state.won&&!winShown)showWin();
},1000/60);
function paint(now){const dt=Math.min(.04,(now-lastPaint)/1000);lastPaint=now;if(playing){let draw=state;if(mode==='guest'){
 if(!guestDraw)guestDraw=state.players.map(p=>({...p}));for(let i=0;i<2;i++){const target=state.players[i],p=guestDraw[i],snap=Math.abs(p.x-target.x)>100||Math.abs(p.y-target.y)>100;const a=snap?1:1-Math.exp(-dt*22);const x=p.x+(target.x-p.x)*a,y=p.y+(target.y-p.y)*a;Object.assign(p,target,{x,y});}draw={...state,players:guestDraw};}
 renderer.draw(draw,now/1000,dt);
 }else preview.draw(E.create(0),now/1000,dt,true);requestAnimationFrame(paint);}
requestAnimationFrame(paint);
window.addEventListener('pagehide',()=>room.destroy());
// Read-only entry points support diagnostics and reproducible browser tests.
Object.defineProperty(window,'JellyJam',{value:{get state(){return state;},get mode(){return mode;},get paused(){return paused;},get connected(){return room.connected;},get roomCode(){return room.code;},get remoteInput(){return {...remoteInput};}}});
const code=new URLSearchParams(location.hash.slice(1)).get('room');if(code){lobby();$('roomInput').value=JellyNetwork.cleanCode(code);$('roomError').textContent='Your friend invited you. Press Join to connect.';}
})();
