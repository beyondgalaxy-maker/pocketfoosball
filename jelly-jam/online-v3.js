/* Session-aware PeerJS transport. Presence is not a dead connection. */
(function(root){
'use strict';
const VERSION=3,ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const cleanCode=s=>String(s||'').toUpperCase().replace(/[\s-]/g,'');
const validCode=s=>/^[A-HJ-NP-Z2-9]{8}$/.test(s);
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
let library;
function loadPeer(){if(root.Peer)return Promise.resolve();if(library)return library;
 library=(async()=>{for(const url of ['https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js']){try{await new Promise((resolve,reject)=>{const el=document.createElement('script');const timer=setTimeout(()=>done(false),10000);function done(ok){clearTimeout(timer);el.onload=el.onerror=null;if(!ok)el.remove();ok?resolve():reject(Error('Library unavailable'));}el.src=url;el.crossOrigin='anonymous';el.onload=()=>done(!!root.Peer);el.onerror=()=>done(false);document.head.append(el);});return;}catch{}}throw Error('Could not load online play. Check your network; local play still works.');})();library.catch(()=>library=null);return library;}
class Room{
 constructor(handlers={}){this.handlers=handlers;this.peer=null;this.conn=null;this.role='';this.code='';this.connected=false;this.generation=0;this.lastSeen=0;this.lastPulse=Date.now();this.remoteHidden=false;this.everConnected=false;this.retries=0;this.epoch='';this.seat='';this.timers=new Set();try{this.token=sessionStorage.getItem('jj3-seat')||random();sessionStorage.setItem('jj3-seat',this.token);}catch{this.token=random();}this.heartbeat=setInterval(()=>this.pulse(),2000);}
 event(name,...args){this.handlers[name]?.(...args);}
 later(fn,delay){const generation=this.generation;const timer=setTimeout(()=>{this.timers.delete(timer);if(generation===this.generation)fn();},delay);this.timers.add(timer);return timer;}
 async start(role,code=''){this.close();this.role=role;this.code=role==='host'?Array.from(crypto.getRandomValues(new Uint8Array(8)),x=>ALPHABET[x%32]).join(''):cleanCode(code);if(!validCode(this.code)){this.event('error','Enter the 8-character room code from your friend.');return;}const gen=this.generation;this.event('status','Connecting to the room service…');try{await loadPeer();if(gen===this.generation)this.makePeer();}catch(e){if(gen===this.generation)this.event('error',e.message);}}
 makePeer(){if(!this.role)return;const opts={debug:0,...(root.JELLY_PEER_OPTIONS||{})};const p=this.role==='host'?new root.Peer('jellyjam-v3-'+this.code,opts):new root.Peer(undefined,opts);this.peer=p;
  const timeout=this.later(()=>{if(this.peer===p&&!p.open){this.event('error','Room service did not answer. Reconnect or try another network.');}},20000);
  p.on('open',()=>{if(this.peer!==p)return;clearTimeout(timeout);this.retries=0;if(this.role==='host'){if(!this.everConnected)this.event('ready',this.code);else this.event('status','Room restored. Your buddy can reconnect.');}else this.dial();});
  p.on('connection',c=>{if(this.peer!==p||this.role!=='host'){c.close();return;}
   const same=c.metadata?.seat&&c.metadata.seat===this.seat;
   if(this.conn&&!same){c.on('open',()=>{c.send({type:'full'});this.later(()=>c.close(),200);});return;}
   if(same&&this.conn){const old=this.conn;this.conn=null;this.connected=false;try{old.close();}catch{}}
   this.attach(c);
  });
  p.on('disconnected',()=>{if(this.peer===p)this.reconnectSignal();});
  p.on('error',e=>{if(this.peer!==p)return;if(['network','server-error','socket-error','socket-closed'].includes(e.type)){this.event('status','Room service reconnecting…');this.reconnectSignal();return;}
   if(e.type==='peer-unavailable'&&this.everConnected){if(!this.connected)this.retry();return;}
   const messages={'peer-unavailable':'That room is not open. Check the code and ask the host to return.','unavailable-id':'Room code is in use. Return to the menu and make a new room.','browser-incompatible':'Online play needs a browser with WebRTC support.'};this.event('error',messages[e.type]||'Connection failed. Try reconnecting or a different network.');
  });
 }
 reconnectSignal(){const p=this.peer;if(!p||p.destroyed)return;this.later(()=>{if(this.peer!==p)return;try{if(p.disconnected)p.reconnect();}catch{}if(p.disconnected)this.reconnectSignal();},2500);}
 dial(){if(this.role!=='guest'||!this.peer||this.peer.destroyed||this.peer.disconnected||this.conn)return;
  try{this.attach(this.peer.connect('jellyjam-v3-'+this.code,{reliable:true,serialization:'json',metadata:{game:'jellyjam',v:VERSION,seat:this.token}}));}catch{this.retry();}}
 retry(){if(this.role!=='guest'||!this.everConnected||this.retryPending)return;this.retryPending=true;this.later(()=>{this.retryPending=false;if(!this.connected){if(!this.peer||this.peer.destroyed)this.makePeer();else if(this.peer.disconnected)this.reconnectSignal();else this.dial();}},Math.min(8000,800*2**Math.min(this.retries++,4)));}
 attach(c){this.conn=c;let welcomed=false;const timer=this.later(()=>{if(this.conn===c&&!welcomed)this.drop('Reconnect in progress. Keep both tabs open.');},12000);
  c.on('open',()=>{if(this.conn!==c)return;this.lastSeen=Date.now();if(this.role==='guest')c.send({type:'hello',v:VERSION,seat:this.token,hidden:document.hidden});});
  c.on('data',d=>{if(this.conn!==c||!d||typeof d!=='object'||typeof d.type!=='string')return;this.lastSeen=Date.now();
   if(d.type==='full'){this.event('error','That room already has two buddies. Rejoin from your original tab or create a new room.');this.close();return;}
   if(d.type==='version'){this.event('error','Both buddies must refresh to Jelly Jam 3.');this.close();return;}
   if(d.type==='hello'&&this.role==='host'&&!welcomed){if(d.v!==VERSION||typeof d.seat!=='string'||d.seat.length>80){c.send({type:'version'});this.drop('Refresh both pages to use the same version.');return;}this.seat=d.seat;this.epoch=random();this.remoteHidden=d.hidden===true;welcomed=true;c.send({type:'welcome',v:VERSION,epoch:this.epoch,hidden:document.hidden});this.accept(timer);return;}
   if(d.type==='welcome'&&this.role==='guest'&&!welcomed){if(d.v!==VERSION||typeof d.epoch!=='string'){this.event('error','Both players need to refresh.');this.close();return;}welcomed=true;this.epoch=d.epoch;this.remoteHidden=d.hidden===true;this.accept(timer);return;}
   if(!welcomed||d.epoch!==this.epoch)return;
   if(d.type==='ping'){this.remoteHidden=d.hidden===true;this.send({type:'pong',at:d.at,hidden:document.hidden});return;}
   if(d.type==='pong'){this.remoteHidden=d.hidden===true;this.event('latency',Math.max(0,Date.now()-Number(d.at||Date.now())));return;}
   if(d.type==='presence')this.remoteHidden=d.hidden===true;
   this.event('message',d);
  });
  c.on('close',()=>{clearTimeout(timer);if(this.conn===c)this.drop('Buddy disconnected. Reconnecting automatically…');});
  c.on('error',()=>{clearTimeout(timer);if(this.conn===c)this.drop('Connection interrupted. Reconnecting automatically…');});
 }
 accept(timer){clearTimeout(timer);const rejoined=this.everConnected;this.connected=true;this.everConnected=true;this.retries=0;this.lastSeen=Date.now();this.event('connected',this.role,rejoined);}
 send(data){if(!this.conn?.open)return false;const dc=this.conn.dataChannel;if(dc&&dc.bufferedAmount>65536)return false;try{this.conn.send({...data,epoch:this.epoch});return true;}catch{this.drop('Connection interrupted. Reconnecting…');return false;}}
 pulse(){const now=Date.now(),gap=now-this.lastPulse;this.lastPulse=now;if(!this.role)return;
  // OS/browser suspension is expected. Start a fresh probe on wake, not a false timeout.
  if(gap>8000&&!document.hidden){this.lastSeen=now;this.wake();}
  if(this.connected){this.send({type:'ping',at:now,hidden:document.hidden});if(!document.hidden&&!this.remoteHidden&&now-this.lastSeen>8000)this.event('stalled');if(!document.hidden&&!this.remoteHidden&&now-this.lastSeen>25000)this.drop('Connection timed out. Reconnecting…');}
  else if(this.everConnected&&!document.hidden)this.retry();
 }
 presence(hidden){this.send({type:'presence',hidden:!!hidden});if(!hidden)this.wake();}
 wake(){this.lastSeen=Date.now();this.lastPulse=Date.now();if(this.peer?.disconnected)this.reconnectSignal();if(this.connected){this.send({type:'presence',hidden:false});this.send({type:'resync'});this.event('wake');}else if(this.everConnected)this.retry();}
 drop(message){const c=this.conn,was=this.connected;this.conn=null;this.connected=false;try{c?.close();}catch{}if(was||this.everConnected)this.event('disconnected',message);else this.event('error',message);this.retry();}
 reconnect(){if(this.connected){this.wake();return;}if(!this.peer||this.peer.destroyed)this.makePeer();else if(this.peer.disconnected)this.reconnectSignal();else this.dial();}
 close(){this.generation++;for(const t of this.timers)clearTimeout(t);this.timers.clear();const p=this.peer,c=this.conn;this.peer=this.conn=null;this.role='';this.connected=false;this.everConnected=false;this.retryPending=false;this.remoteHidden=false;this.seat='';try{c?.close();p?.destroy();}catch{}}
 destroy(){this.close();clearInterval(this.heartbeat);}
}
root.JellyNetwork={Room,cleanCode,validCode};
})(globalThis);
