/* PeerJS is loaded only after an explicit online action. Local play is offline. */
(function(root){
'use strict';
const VERSION=1,ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const cleanCode=s=>String(s||'').toUpperCase().replace(/[\s-]/g,'');
const validCode=s=>/^[A-HJ-NP-Z2-9]{8}$/.test(s);
let library;
function loadPeer(){
 if(root.Peer)return Promise.resolve();if(library)return library;
 library=(async()=>{for(const url of ['https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js']){try{await new Promise((resolve,reject)=>{const el=document.createElement('script');let timer=setTimeout(()=>done(false),10000);function done(ok){clearTimeout(timer);el.onload=el.onerror=null;if(!ok)el.remove();ok?resolve():reject(new Error('Library unavailable'));}el.src=url;el.crossOrigin='anonymous';el.onload=()=>done(!!root.Peer);el.onerror=()=>done(false);document.head.append(el);});return;}catch{}}
 throw new Error('Could not load online play. Check your connection or try another network. Local play still works.');})();
 library.catch(()=>{library=null;});return library;
}
class Room{
 constructor(handlers={}){this.handlers=handlers;this.peer=null;this.conn=null;this.connected=false;this.role='';this.code='';this.generation=0;this.openTimer=null;this.joinTimer=null;this.retryTimer=null;this.lastSeen=0;this.heartbeat=setInterval(()=>{if(this.connected){if(Date.now()-this.lastSeen>10000){this.drop('Connection lost. Your buddy can rejoin with the same code.');return;}this.send({type:'ping',at:Date.now()});}},2000);}
 event(name,...args){if(this.handlers[name])this.handlers[name](...args);}
 async start(role,code=''){
  this.close();const generation=this.generation;this.role=role;this.code=role==='host'?Array.from(crypto.getRandomValues(new Uint8Array(8)),x=>ALPHABET[x%32]).join(''):cleanCode(code);
  if(!validCode(this.code)){this.event('error','Enter the 8-character room code from your friend.');return;}
  this.event('status','Connecting to the room service…');
  try{await loadPeer();if(generation!==this.generation)return;
   const opts={debug:0,...(root.JELLY_PEER_OPTIONS||{})};
   this.peer=role==='host'?new root.Peer('jellyjam-v1-'+this.code,opts):new root.Peer(undefined,opts);
   const peer=this.peer;
   this.openTimer=setTimeout(()=>{if(this.peer===peer){this.event('error','The room service did not answer. Try again, or play on one keyboard.');this.close();}},18000);
   peer.on('open',()=>{if(this.peer!==peer)return;clearTimeout(this.openTimer);if(role==='host'){this.event('ready',this.code);this.event('status','Room ready. Waiting for your buddy…');}else{this.attach(peer.connect('jellyjam-v1-'+this.code,{reliable:true,serialization:'json',metadata:{game:'jellyjam',v:VERSION}}));this.joinTimer=setTimeout(()=>{if(!this.connected&&this.peer===peer){this.event('error','Could not reach your friend. Check the code, keep their tab open, or try a different network.');this.close();}},20000);}});
   peer.on('connection',conn=>{if(this.peer!==peer){conn.close();return;}if(role!=='host'||this.conn){conn.on('open',()=>{conn.send({type:'full'});setTimeout(()=>conn.close(),250);});return;}this.attach(conn);});
   peer.on('error',err=>{if(this.peer!==peer)return;const messages={'peer-unavailable':'That room is not open. Ask your friend to create a room and check the code.','unavailable-id':'That room code is already in use. Please create a new room.','network':'The room service is unreachable. Check your connection.','browser-incompatible':'This browser does not support online play. Try a current Chrome, Firefox, Edge, or Safari.'};this.event('error',messages[err.type]||'Online connection failed. Try again or use local play.');if(!this.connected)this.close();});
   peer.on('disconnected',()=>{if(this.peer!==peer)return;this.event('status',this.connected?'Playing · room service reconnecting…':'Room service disconnected. Reconnecting…');clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>{if(this.peer===peer&&!peer.destroyed)try{peer.reconnect();}catch{}},1500);});
  }catch(err){if(generation===this.generation){this.event('error',err.message);this.close();}}
 }
 attach(conn){
  this.conn=conn;const peer=this.peer;let welcomed=false;
  const handshake=setTimeout(()=>{if(this.conn===conn&&!welcomed){this.drop('Your buddy could not finish connecting. Try joining again.');}},15000);
  conn.on('open',()=>{if(this.conn!==conn)return;this.lastSeen=Date.now();if(this.role==='guest')conn.send({type:'hello',v:VERSION});});
  conn.on('data',data=>{
   if(this.conn!==conn||!data||typeof data!=='object'||typeof data.type!=='string')return;
   this.lastSeen=Date.now();
   if(data.type==='full'){this.event('error','That room already has two buddies. Create a new room to play.');this.close();return;}
   if(data.type==='hello'&&this.role==='host'&&!welcomed){if(data.v!==VERSION){conn.send({type:'version'});this.drop('Game versions differ. Both players should refresh.');return;}welcomed=true;clearTimeout(handshake);this.connected=true;conn.send({type:'welcome',v:VERSION});this.event('connected','host');return;}
   if(data.type==='welcome'&&this.role==='guest'&&!welcomed){if(data.v!==VERSION){this.drop('Game versions differ. Refresh both pages.');return;}welcomed=true;clearTimeout(handshake);clearTimeout(this.joinTimer);this.connected=true;this.event('connected','guest');return;}
   if(data.type==='version'){this.event('error','Both players should refresh to use the same game version.');this.close();return;}
   if(!welcomed)return;
   if(data.type==='ping'){this.send({type:'pong',at:data.at});return;}
   if(data.type==='pong'){this.event('latency',Math.max(0,Date.now()-Number(data.at||Date.now())));return;}
   this.event('message',data);
  });
  conn.on('close',()=>{clearTimeout(handshake);if(this.conn===conn)this.drop('Buddy disconnected. Rejoin with the same room code.');});
  conn.on('error',()=>{clearTimeout(handshake);if(this.conn===conn)this.drop('The connection dropped. Try rejoining this room.');});
 }
 send(data){if(!this.conn?.open)return;const dc=this.conn.dataChannel;if(dc&&dc.bufferedAmount>131072)return;try{this.conn.send(data);}catch{this.drop('Connection lost. Please rejoin.');}}
 drop(message){const c=this.conn;this.conn=null;const was=this.connected;this.connected=false;clearTimeout(this.joinTimer);try{c?.close();}catch{}if(was)this.event('disconnected',message);else this.event('error',message);}
 close(){this.generation++;clearTimeout(this.openTimer);clearTimeout(this.joinTimer);clearTimeout(this.retryTimer);const p=this.peer,c=this.conn;this.peer=null;this.conn=null;this.connected=false;this.role='';try{c?.close();p?.destroy();}catch{}}
 destroy(){this.close();clearInterval(this.heartbeat);}
}
root.JellyNetwork={Room,cleanCode,validCode};
})(globalThis);
