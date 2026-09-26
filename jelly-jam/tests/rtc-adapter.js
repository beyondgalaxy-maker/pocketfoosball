/* TEST ONLY: real RTCPeerConnection data channels with an in-process signaling
   bridge. Production always uses the official PeerJS client and public service. */
(()=>{
class Emitter{constructor(){this.events={};}on(n,fn){(this.events[n]??=[]).push(fn);return this;}emit(n,...a){for(const fn of this.events[n]||[])fn(...a);}}
class DataConnection extends Emitter{
 constructor(owner,remote,incoming=false){super();this.owner=owner;this.peer=remote;this.open=false;this.dataChannel=null;this.pc=new RTCPeerConnection({iceServers:[]});this.pending=[];this.dead=false;
 this.pc.onicecandidate=e=>{if(e.candidate)owner.signal(remote,{kind:'candidate',candidate:e.candidate.toJSON()});};
 this.pc.ondatachannel=e=>this.attach(e.channel);
 if(!incoming)this.attach(this.pc.createDataChannel('jelly-test',{ordered:true}));}
 attach(dc){this.dataChannel=dc;dc.onopen=()=>{this.open=true;this.emit('open');};dc.onmessage=e=>this.emit('data',JSON.parse(e.data));dc.onclose=()=>{this.open=false;this.emit('close');};dc.onerror=e=>this.emit('error',e);}
 async remoteDescription(sdp){await this.pc.setRemoteDescription(sdp);for(const c of this.pending)await this.pc.addIceCandidate(c);this.pending=[];}
 async candidate(c){if(this.pc.remoteDescription)await this.pc.addIceCandidate(c);else this.pending.push(c);}
 send(v){this.dataChannel.send(JSON.stringify(v));}
 close(){if(this.dead)return;this.dead=true;this.open=false;this.dataChannel?.close();this.pc.close();this.emit('close');}
}
class Peer extends Emitter{
 constructor(id){super();this.id=id||'guest-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16)).join('');this.destroyed=false;this.connections={};window.__testPeer=this;window.__registerRTC(this.id).then(()=>this.emit('open',this.id));}
 signal(to,payload){return window.__signalRTC({from:this.id,to,...payload});}
 connect(to){const c=new DataConnection(this,to);this.connections[to]=c;(async()=>{const offer=await c.pc.createOffer();await c.pc.setLocalDescription(offer);await this.signal(to,{kind:'offer',sdp:c.pc.localDescription.toJSON()});})().catch(e=>this.emit('error',e));return c;}
 async receive(m){if(this.destroyed)return;let c=this.connections[m.from];if(m.kind==='offer'){c=new DataConnection(this,m.from,true);this.connections[m.from]=c;this.emit('connection',c);await c.remoteDescription(m.sdp);const answer=await c.pc.createAnswer();await c.pc.setLocalDescription(answer);await this.signal(m.from,{kind:'answer',sdp:c.pc.localDescription.toJSON()});}else if(m.kind==='answer')await c.remoteDescription(m.sdp);else if(m.kind==='candidate'){if(c)await c.candidate(m.candidate);else{(this.early??=[]).push(m);return;}}if(this.early?.length&&c){const queue=this.early;this.early=[];for(const item of queue)await this.receive(item);}}
 destroy(){this.destroyed=true;for(const c of Object.values(this.connections))c.close();}
 reconnect(){this.emit('open',this.id);}
}
window.Peer=Peer;window.__receiveRTC=m=>window.__testPeer.receive(m);
})();
