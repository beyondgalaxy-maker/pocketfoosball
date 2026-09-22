/* Pocket Foosball: camera-correct sphere rendering. No animation-speed override.
 * World axes: x toward Coral, y along rods, z up. A grounded no-slip ball has
 * wx = -vy/R and wy = vx/R. The existing contact solver owns these values.
 */
(function(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.TouchlineRolling = api; api.install(root.touchline); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = v => { const n=Math.hypot(...v); if(n<1e-10) throw new Error('Degenerate ball camera'); return v.map(x=>x/n); };
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  function camera(right=[1,0,.11],up=[0,-1,.44]) {
    const R=unit(right), shear=dot(up,R), residual=up.map((x,i)=>x-shear*R[i]), U=unit(residual);
    return {right:[...right],up:[...up],R,U,N:unit(cross(U,R)),sx:Math.hypot(...right),sy:Math.hypot(...residual),shear};
  }
  function rotate(v,q) {
    const x=q.qx||0,y=q.qy||0,z=q.qz||0,w=q.qw??1;
    const a=2*(y*v[2]-z*v[1]),b=2*(z*v[0]-x*v[2]),c=2*(x*v[1]-y*v[0]);
    return [v[0]+w*a+y*c-z*b,v[1]+w*b+z*a-x*c,v[2]+w*c+x*b-y*a];
  }
  function advance(q,omega,dt) {
    const speed=Math.hypot(...omega);
    if(speed<1e-12||dt===0)return {qx:q.qx||0,qy:q.qy||0,qz:q.qz||0,qw:q.qw??1};
    const a=speed*dt*.5,k=Math.sin(a)/speed,[x,y,z]=omega.map(v=>v*k),w=Math.cos(a);
    const X=q.qx||0,Y=q.qy||0,Z=q.qz||0,W=q.qw??1;
    return {qx:w*X+x*W+y*Z-z*Y,qy:w*Y-x*Z+y*W+z*X,qz:w*Z+x*Y-y*X+z*W,qw:w*W-x*X-y*Y-z*Z};
  }
  function projection(v,view) { return [dot(v,view.right),-dot(v,view.up)]; }
  function shutter(ball,radius) {
    const speed=Math.hypot(ball.wx||0,ball.wy||0,ball.wz||0),exposure=1/120;
    const sweep=speed*exposure*radius;
    // At high speeds, crisp repeated panels can strobe backwards. Reduce their
    // contrast and integrate recent physical orientations, never slow the spin.
    return {speed,exposure,sweep,samples:sweep<1.1?1:clamp(Math.ceil(sweep/1.3),2,5),contrast:Math.exp(-.12*Math.max(0,sweep-1.1))};
  }
  const phi=(1+Math.sqrt(5))/2,vertices=[];
  for(const a of [-1,1])for(const b of [-phi,phi])vertices.push([0,a,b],[a,b,0],[b,0,a]);
  const adjacent=vertices.map((v,i)=>vertices.map((p,j)=>i!==j&&Math.abs(Math.hypot(...v.map((x,k)=>x-p[k]))-2)<1e-6?j:-1).filter(j=>j>=0));
  const cut=(i,j)=>unit(vertices[i].map((x,k)=>2*x+vertices[j][k]));
  function ordered(points) {
    const normal=unit(points.reduce((s,p)=>s.map((x,i)=>x+p[i]),[0,0,0]));
    const a=unit(cross(normal,Math.abs(normal[2])<.9?[0,0,1]:[1,0,0])),b=cross(normal,a);
    return points.sort((p,q)=>Math.atan2(dot(p,b),dot(p,a))-Math.atan2(dot(q,b),dot(q,a)));
  }
  const faces=vertices.map((v,i)=>({dark:true,anchor:i===0,points:ordered(adjacent[i].map(j=>cut(i,j)))}));
  for(let i=0;i<12;i++)for(const j of adjacent[i])if(j>i)for(const k of adjacent[i])if(k>j&&adjacent[j].includes(k))
    faces.push({dark:false,points:ordered([cut(i,j),cut(j,i),cut(j,k),cut(k,j),cut(k,i),cut(i,k)])});
  for(const face of faces) {
    const points=[];
    for(let i=0;i<face.points.length;i++){
      const a=face.points[i],b=face.points[(i+1)%face.points.length];
      for(const t of [0,.5])points.push(unit(a.map((v,k)=>v*(1-t)+b[k]*t)));
    }
    face.points=points;
  }
  function visible(points,q,view) {
    const out=[],world=points.map(v=>rotate(v,q));
    for(let i=0;i<world.length;i++) {
      const a=world[i],b=world[(i+1)%world.length],da=dot(a,view.N),db=dot(b,view.N);
      if(da>=0)out.push(a);
      if((da>=0)!==(db>=0)) { const t=da/(da-db);out.push(unit(a.map((x,k)=>x+(b[k]-x)*t))); }
    }
    return out;
  }
  const cache=new Map(),stats={draws:0,painted:0,cacheHits:0,last:null};
  function paint(ctx,radius,ball,view,style) {
    ctx.save();ctx.transform(view.sx,-view.shear,0,view.sy,0,0);
    ctx.beginPath();ctx.arc(0,0,radius,0,2*Math.PI);ctx.clip();
    ctx.fillStyle='#f2f0df';ctx.fillRect(-radius,-radius,2*radius,2*radius);
    const omega=[ball.wx||0,ball.wy||0,ball.wz||0];
    for(let sample=0;sample<style.samples;sample++) {
      const time=style.samples===1?0:-style.exposure*(sample+.5)/style.samples;
      const q=advance(ball,omega,time);
      ctx.globalAlpha=style.contrast/style.samples;
      for(const face of faces) {
        if(!face.dark)continue;
        const points=visible(face.points,q,view);if(points.length<3)continue;
        ctx.beginPath();points.forEach((p,i)=>{const x=dot(p,view.R)*radius,y=-dot(p,view.U)*radius;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();
        ctx.fillStyle=face.anchor?'#355248':'#223830';ctx.fill();
      }
    }
    ctx.globalAlpha=1;
    if(radius>9&&style.sweep<1.5) {
      ctx.strokeStyle='#536d6350';ctx.lineWidth=Math.max(.35,radius*.012);
      for(const face of faces) {
        const points=visible(face.points,ball,view);if(points.length<3)continue;
        ctx.beginPath();points.forEach((p,i)=>{const x=dot(p,view.R)*radius,y=-dot(p,view.U)*radius;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.stroke();
      }
    }
    const light=unit([-.28,-.22,1]);
    const shade=ctx.createRadialGradient(radius*.35*dot(light,view.R),-radius*.35*dot(light,view.U),radius*.08,0,0,radius);
    shade.addColorStop(0,'#ffffff35');shade.addColorStop(.60,'#ffffff00');shade.addColorStop(1,'#17251d65');
    ctx.fillStyle=shade;ctx.fillRect(-radius,-radius,2*radius,2*radius);ctx.restore();
    ctx.save();ctx.transform(view.sx,-view.shear,0,view.sy,0,0);ctx.beginPath();ctx.arc(0,0,radius,0,2*Math.PI);
    ctx.strokeStyle='#e9f1d6b0';ctx.lineWidth=.5;ctx.stroke();ctx.restore();
  }
  function draw(ctx,x,y,requestedRadius,ball,right,up) {
    if(!ctx||!Number.isFinite(requestedRadius)||requestedRadius<=0)return;
    const main=!right;
    const view=camera(right||[1,0,.11],up||[0,-(root.touchline?.renderer.pitch||1),.44]);
    // The old minimum-radius marker also enlarged the spinning surface. Keep
    // the visibility ring, but paint the actual collision-radius sphere inside it.
    const radius=main&&root.touchline&&root.Foos?root.touchline.renderer.s*root.Foos.C.radius:requestedRadius;
    const dpr=Math.min(root.devicePixelRatio||1,2),style=shutter(ball,radius);
    const key=[radius,dpr,...view.right,...view.up].map(n=>n.toFixed(4)).join(',');
    const stamp=[ball.qx||0,ball.qy||0,ball.qz||0,ball.qw??1,ball.wx||0,ball.wy||0,ball.wz||0].join(',');
    let entry=cache.get(key);
    if(!entry) {
      if(cache.size>=12)cache.delete(cache.keys().next().value);
      const width=Math.ceil(2*(radius*Math.hypot(...view.right)+2)),height=Math.ceil(2*(radius*Math.hypot(...view.up)+2));
      const canvas=root.document.createElement('canvas');canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
      entry={canvas,width,height,stamp:null};cache.set(key,entry);
    }
    if(entry.stamp!==stamp) {
      const c=entry.canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,entry.width,entry.height);
      c.translate(entry.width/2,entry.height/2);paint(c,radius,ball,view,style);entry.stamp=stamp;stats.painted++;
    } else stats.cacheHits++;
    ctx.drawImage(entry.canvas,x-entry.width/2,y-entry.height/2,entry.width,entry.height);stats.draws++;
    stats.last={radius,requestedRadius,main,projection:{right:view.right,up:view.up},samples:style.samples,contrast:style.contrast};
  }
  function installPhysics(physics) {
    const p=physics?.World?.prototype;
    if(!p||p.__rollingDriftAligned)return false;
    const solve=p.solve,integrate=p.integrateOrientation;
    // Position is drifted before contacts are resolved. Orient the surface with
    // that same pre-contact spin, not an impulse that happened at the end of the
    // substep. Ball velocity, contact impulses and rod dynamics are unchanged.
    p.solve=function(dt) {
      this.__rollingDrift=[this.ball.wx,this.ball.wy,this.ball.wz];
      return solve.call(this,dt);
    };
    p.integrateOrientation=function(dt) {
      const spin=this.__rollingDrift;this.__rollingDrift=null;
      if(!spin)return integrate.call(this,dt);
      const q=advance(this.ball,spin,dt),n=Math.hypot(q.qx,q.qy,q.qz,q.qw);
      for(const k of ['qx','qy','qz','qw'])this.ball[k]=q[k]/n;
    };
    p.__rollingDriftAligned=true;return true;
  }
  function install(game) {
    if(!game?.SoccerBall)return false;
    installPhysics(root.Foos);
    game.SoccerBall.draw=draw;game.SoccerBall.rotate=rotate;game.SoccerBall.faces=faces.length;
    game.rolling={camera,projection,rotate,advance,shutter,stats};game.version='8.0.1';return true;
  }
  return {camera,projection,rotate,advance,shutter,draw,install,installPhysics,stats,faces};
});
