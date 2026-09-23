"""Idempotent, guarded bridge for v12 input; no evaluation or runtime rewriting.
Executed before tests/build, with generated changes committed only after tests.
"""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parent

def sha(data):
 return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()

def upgrade(root=ROOT):
 p=root/'v12.js'; raw=p.read_bytes(); s=raw.decode()
 if '__railConsumedTargets' not in s:
  if sha(raw)!='4091aaff95bbfc340870c618a0e540904407e828':
   raise ValueError('Unexpected v12 source; review the recoil input guard.')
  old='  p.moveRods=function(dt){'
  replacement="""  const reset12=p.reset;
  p.reset=function(...args){this.__railConsumedTargets=new Map();return reset12.apply(this,args);};
  p.moveRods=function(dt){
   // Repeated network snapshots are not fresh inward hand motion. Consume the
   // released preload until the user actually changes their rod target.
   const consumed=this.__railConsumedTargets||(this.__railConsumedTargets=new Map());
   for(const [id,rest] of consumed){
    const r=this.rods.find(x=>x.id===id);if(!r)continue;
    if(r.pinIntent||Math.abs(r.targetTheta-rest.angle)>.0001){consumed.delete(id);continue;}
    if(Math.abs(r.targetY-rest.blocked)<.00001)r.targetY=rest.y;
    else if(Math.abs(r.targetY-rest.y)>.00001)consumed.delete(id);
   }"""
  assert s.count(old)==1;s=s.replace(old,replacement,1)
  old='if(this.time>=yielded.until&&(r.targetY-r.y)*yielded.side>0)r.targetY=r.y;'
  new='if(this.time>=yielded.until&&(r.targetY-r.y)*yielded.side>0){consumed.set(id,{blocked:r.targetY,y:r.y,angle:r.targetTheta});r.targetY=r.y;}'
  assert s.count(old)==1;p.write_text(s.replace(old,new,1))
 p=root/'app.js'; raw=p.read_bytes(); s=raw.decode()
 if 'inputBridge:' not in s:
  if sha(raw)!='2f2a31803d9aec379866701cb2284abd565dae78':
   raise ValueError('Unexpected application revision; review the input bridge manually.')
  old='window.touchline={version:'
  assert s.count(old)==1
  s=s.replace(old,'window.touchline={inputBridge:{points:j,select:bt,axes:vt,refresh:xt,cancel:Mt},version:',1)
  p.write_text(s)
 p=root/'online.js'; s=p.read_text()
 if 'const VERSION=11,' in s:
  s=s.replace('const VERSION=11,','const VERSION=12,',1).replace('pocketfoosball11-','pocketfoosball12-')
  p.write_text(s)
 p=root/'index.html'; s=p.read_text()
 if '<script src="v12.js"></script>' not in s:
  old='<script src="online.js"></script>'; assert s.count(old)==1
  s=s.replace(old,old+'\n<script src="v12.js"></script>',1)
  p.write_text(s)
 p=root/'build.py'; s=p.read_text()
 if "'v12.js'" not in s:
  assert "'online.js')" in s
  p.write_text(s.replace("'online.js')","'online.js', 'v12.js')"))

if __name__=='__main__':
 upgrade();print('v12 input bridge and static entrypoint ready.')
