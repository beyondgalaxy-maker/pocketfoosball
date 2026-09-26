/* All artwork is drawn locally: no image requests, assets, fonts, or tracking. */
(function(root){
'use strict';
const E=root.JellyEngine,colors=['#f493a5','#71c9b3'],dark=['#994e68','#337b6b'];
const themes=[['#eee6f8','#faf1e3','#dbdbed','#b8c9ae'],['#e3edf4','#fff5df','#cbdde7','#b8d2b0'],['#f7e7ed','#fff3d8','#e3d1db','#b6cbb0']];
function round(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function text(c,s,x,y,size=16,color='#485442',align='center',weight=700){c.fillStyle=color;c.font=`${weight} ${size}px system-ui, sans-serif`;c.textAlign=align;c.fillText(s,x,y);}
function star(c,x,y,r,fill,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();for(let i=0;i<10;i++){let a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.48:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fillStyle=fill;c.fill();c.restore();}
function cloud(c,x,y,k=1,alpha=.7){c.save();c.globalAlpha=alpha;ellipse(c,x,y,50*k,15*k,'#fffdf5');ellipse(c,x-20*k,y-10*k,20*k,22*k,'#fffdf5');ellipse(c,x+13*k,y-13*k,30*k,28*k,'#fffdf5');c.restore();}
function jelly(c,p,t,scale=1,demo=false){
 const i=p.id; c.save();c.translate(p.x,p.y);c.scale(scale,scale);
 let squash=1,stretch=1;if(!demo){if(p.vy<-150){squash=.89;stretch=1.12;}else if(p.vy>260){squash=.93;stretch=1.08;}else if(Math.abs(p.vx)>40){squash=1+Math.sin(t*20)*.045;stretch=1/squash;}else stretch=1+Math.sin(t*3+i)*.025;}else{stretch=1+Math.sin(t*2.5+i)*.04;}
 c.globalAlpha=p.inv>0?(.6+.35*Math.cos(t*35)):1;ellipse(c,0,3,18,5,'#364d3320');c.scale(squash,stretch);
 round(c,-17,-36,34,36,[15,15,11,11],dark[i]);round(c,-17,-39,34,35,[16,16,10,10],colors[i]);ellipse(c,-9,-28,4,6,'#ffffff55');
 const look=(p.face||1)*1.7,blink=Math.sin(t*.9+i*2)>.996;ellipse(c,-6+look,-23,2.6,blink?.65:3.5,'#334034');ellipse(c,7+look,-23,2.6,blink?.65:3.5,'#334034');ellipse(c,-11,-16,3.5,1.8,'#df607751');ellipse(c,12,-16,3.5,1.8,'#df607751');
 c.strokeStyle='#334034';c.lineWidth=1.5;c.beginPath();c.arc(1+look,-18,3.2,0,Math.PI);c.stroke();
 if(i===0){ellipse(c,0,-40,3.2,3.2,'#fff5dc');}else{c.fillStyle='#fff5dc';c.beginPath();c.moveTo(0,-45);c.lineTo(4,-40);c.lineTo(0,-35);c.lineTo(-4,-40);c.fill();}
 ellipse(c,-9,-2,6,3,dark[i]);ellipse(c,10,-2,6,3,dark[i]);c.restore();
}
class Renderer{
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.particles=[];this.lastTick=-1;this.lastLevel=-1;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;}
 effects(s){if(s.tick===this.lastTick&&s.level===this.lastLevel)return;this.lastTick=s.tick;this.lastLevel=s.level;if(this.reduced)return;for(const e of s.events||[]){if(e.type==='jump')continue;const amount=e.type==='win'?75:16;for(let j=0;j<amount;j++){const a=Math.random()*Math.PI*2,v=60+Math.random()*180;this.particles.push({x:e.x,y:e.y-15,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,life:1,fill:['#f8cc6d','#ef91a4','#7bc7b1','#b69bcf'][j%4],r:2+Math.random()*4});}}}
 draw(s,t,dt=1/60,demo=false){
 const c=this.c,l=E.levels[s.level],theme=themes[Math.floor(s.level/4)%3];c.clearRect(0,0,1000,600);
 let bg=c.createLinearGradient(0,0,0,600);bg.addColorStop(0,theme[0]);bg.addColorStop(1,theme[1]);c.fillStyle=bg;c.fillRect(0,0,1000,600);
 // Slow background motion is cosmetic, never part of the simulation.
 const tm=this.reduced?0:t;ellipse(c,810,100,45,45,'#fff3c0');ellipse(c,797,100,3,4,'#c0a46a');ellipse(c,822,100,3,4,'#c0a46a');
 cloud(c,110+Math.sin(tm*.1)*12,125,.95,.65);cloud(c,480+Math.sin(tm*.08)*20,85,1.2,.55);cloud(c,870,218,.75,.5);
 c.fillStyle=theme[2];c.beginPath();c.moveTo(0,550);c.bezierCurveTo(160,250,260,430,400,510);c.bezierCurveTo(530,290,720,310,1000,510);c.lineTo(1000,600);c.lineTo(0,600);c.fill();c.fillStyle='#ffffff37';c.beginPath();c.moveTo(0,560);c.bezierCurveTo(200,435,360,485,500,560);c.bezierCurveTo(730,350,910,450,1000,560);c.lineTo(1000,600);c.lineTo(0,600);c.fill();
 for(let i=0;i<13;i++){const x=(i*157+37)%1000,y=85+(i*93)%365;star(c,x,y,3+(i%3),'#ffffffa0',tm*.15);}
 // Lost buddies fall into a soft cloud sea and immediately reappear.
 if(l.platforms[0].w<1000){c.fillStyle='#d8d4ed';c.fillRect(0,575,1000,25);for(let i=0;i<12;i++)cloud(c,i*95,586+Math.sin(tm+i)*3,.9,.8);}
 for(let k=0;k<l.platforms.length;k++){
  const p=E.platformAt(l.platforms[k],s.t),color=p.color===undefined?theme[3]:colors[p.color];
  if(p.ax||p.ay){c.setLineDash([4,9]);c.strokeStyle='#b2acc650';c.lineWidth=2;c.beginPath();c.moveTo(l.platforms[k].x-(p.ax||0)+p.w/2,l.platforms[k].y);c.lineTo(l.platforms[k].x+(p.ax||0)+p.w/2,l.platforms[k].y);c.stroke();c.setLineDash([]);round(c,p.x,p.y,p.w,p.h+6,12,'#aaa3c480');round(c,p.x,p.y,p.w,p.h,12,'#fffcf4');ellipse(c,p.x+p.w*.35,p.y+11,2,2,'#b7a7c1');ellipse(c,p.x+p.w*.65,p.y+11,2,2,'#b7a7c1');}
  else{round(c,p.x,p.y+3,p.w,p.h+7,9,'#56694322');round(c,p.x,p.y,p.w,p.h,8,p.h>30?'#bdc8a5':'#cfceb9');round(c,p.x,p.y,p.w,Math.min(11,p.h),7,color);for(let j=14;j<p.w-7;j+=29){ellipse(c,p.x+j,p.y+20,2,1.4,'#66784b29');}if(p.color!==undefined)text(c,p.color===0?'●':'◆',p.x+p.w/2,p.y+16,11,dark[p.color]);}
  if(p.h>35){for(let j=30;j<p.w-20;j+=67){c.strokeStyle='#7b9267';c.lineWidth=2;c.beginPath();c.moveTo(p.x+j,p.y);c.quadraticCurveTo(p.x+j-5,p.y-10,p.x+j-8,p.y-9);c.moveTo(p.x+j,p.y);c.quadraticCurveTo(p.x+j+5,p.y-14,p.x+j+7,p.y-11);c.stroke();if(j%3===0){ellipse(c,p.x+j+7,p.y-12,3,3,'#f8e3a2');}}}
 }
 for(const b of l.hazards){round(c,b.x,b.y,b.w,b.h,6,colors[b.color]);c.strokeStyle='#ffffffa0';c.lineWidth=2;c.beginPath();for(let x=0;x<=b.w;x+=4){const y=b.y+3+Math.sin(x*.1+tm*3)*2;x?c.lineTo(b.x+x,y):c.moveTo(b.x,y);}c.stroke();text(c,b.color===0?'● PEACH SODA':'◆ MINT SODA',b.x+b.w/2,b.y+12,8,dark[b.color]);}
 for(const b of l.springs){const pulse=2*Math.sin(tm*4);round(c,b.x-8,b.y-13,16,14,4,'#e4be76');round(c,b.x-26,b.y-23+pulse,52,14,9,'#c08b40');round(c,b.x-28,b.y-28+pulse,56,17,[14,14,6,6],'#f8d47c');for(let j=-15;j<=15;j+=15)ellipse(c,b.x+j,b.y-21+pulse,3,3,'#fff1c8');text(c,'↑',b.x,b.y-34+pulse,15,'#ae8447');}
 for(let i=0;i<l.plates.length;i++){const p=l.plates[i],pressed=s.plates[i]||s.gateOpen;c.strokeStyle=pressed?'#699268':'#ab8aca';c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y-9);c.lineTo(p.x,p.y-24);c.stroke();for(let j=0;j<5;j++){const a=j*Math.PI*.4;ellipse(c,p.x+Math.cos(a)*7,p.y-29+Math.sin(a)*7,5,5,pressed?'#a5c389':'#d1b4e6');}ellipse(c,p.x,p.y-29,4,4,'#fff1bd');round(c,p.x-24,p.y-(pressed?5:9),48,pressed?5:9,4,pressed?'#789a62':'#ab87c4');if(!s.gateOpen){text(c,String(i+1),p.x,p.y-47,11,'#8d6d9d');}}
 if(l.gate){const g=l.gate;if(!s.gateOpen){round(c,g.x-4,g.y-6,g.w+8,g.h+6,7,'#9a82b3');round(c,g.x,g.y,g.w,g.h,5,'#d5c1e4');c.strokeStyle='#ab8fc6';c.lineWidth=2;for(let y=g.y+12;y<g.y+g.h;y+=24){c.beginPath();c.moveTo(g.x+4,y);c.lineTo(g.x+g.w-4,y+12);c.stroke();}text(c,'♡',g.x+g.w/2,g.y-18,26,'#977caf');if(s.charge>0)round(c,g.x-15,g.y-8,54*s.charge,4,2,'#678863');}else{round(c,g.x-4,g.y+g.h-6,g.w+8,6,3,'#bdabc9');}}
 if(l.checkpoint){const b=l.checkpoint;c.strokeStyle='#7a8166';c.lineWidth=3;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x,b.y-62);c.stroke();c.fillStyle=s.checkpoint?'#75b79a':'#cfcebb';c.beginPath();c.moveTo(b.x,b.y-62);c.lineTo(b.x+29,b.y-54);c.lineTo(b.x,b.y-43);c.fill();text(c,s.checkpoint?'✓':'♡',b.x+11,b.y-51,11,'#fffbe8');}
 const ready=s.stars.every(Boolean)&&s.gateOpen,e=l.exit;
 c.save();c.globalAlpha=ready?1:.6;ellipse(c,e.x,e.y+1,42,8,'#45624622');c.lineWidth=8;const portalColors=['#e899a8','#efcd7c','#97c6a7','#aea2d1'];for(let j=0;j<4;j++){c.strokeStyle=portalColors[j];c.beginPath();const r=35-j*7;c.moveTo(e.x-r,e.y-2);c.lineTo(e.x-r,e.y-43);c.arc(e.x,e.y-43,r,Math.PI,0);c.lineTo(e.x+r,e.y-2);c.stroke();}c.restore();
 text(c,ready?'BOTH BUDDIES ↓':'3 STARS + BOTH BUDDIES',e.x,e.y-91,9,ready?'#456d50':'#7c7c79');if(ready){for(let j=0;j<5;j++)star(c,e.x+Math.sin(tm+j*2)*45,e.y-40+Math.cos(tm+j*2)*37,3,'#fff9df');}
 for(let j=0;j<l.stars.length;j++){if(s.stars[j])continue;const q=l.stars[j],y=q.y+Math.sin(tm*3+j)*3;ellipse(c,q.x,y,21,21,'#ffdc771e');star(c,q.x,y+2,15,'#c99c56');star(c,q.x,y,15,q.color<0?'#f7d775':colors[q.color],Math.sin(tm+j)*.1);ellipse(c,q.x-3,y-2,1.5,2,'#826b51');ellipse(c,q.x+4,y-2,1.5,2,'#826b51');if(q.color>=0)text(c,q.color===0?'●':'◆',q.x,y-24,9,dark[q.color]);}
 for(const b of l.saws){const q=E.platformAt(b,s.t);c.save();c.translate(q.x,q.y);c.rotate(tm*.9);star(c,0,0,b.r+6,'#889481');ellipse(c,0,0,b.r,b.r,'#a6b49a');c.restore();ellipse(c,q.x-6,q.y-2,2.5,3,'#485740');ellipse(c,q.x+6,q.y-2,2.5,3,'#485740');c.strokeStyle='#485740';c.lineWidth=2;c.beginPath();c.moveTo(q.x-6,q.y+7);c.lineTo(q.x+6,q.y+7);c.stroke();}
 if(demo){jelly(c,{id:0,x:165,y:548,vx:0,vy:0,face:1},tm,2.3,true);jelly(c,{id:1,x:245,y:548,vx:0,vy:0,face:-1},tm,2.3,true);text(c,'your new favorite +1',290,215,32,'#5b6660');text(c,'a hop. a boing. a really good friend.',290,246,15,'#81857c','center',500);text(c,'♡',206,404+Math.sin(tm*2)*7,38,'#db8ca1');}
 else{for(const p of s.players)jelly(c,p,tm);this.effects(s);}
 for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt*1.6;if(p.life<=0){this.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;c.globalAlpha=p.life;star(c,p.x,p.y,p.r,p.fill,tm*3);}c.globalAlpha=1;
 }
}
root.JellyRenderer=Renderer;
})(globalThis);
