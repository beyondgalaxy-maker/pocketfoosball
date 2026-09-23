"""Idempotent, guarded bridge for v12 input; no evaluation or runtime rewriting.
Executed before tests/build, with generated changes committed only after tests.
"""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parent

def sha(data):
 return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()

def upgrade(root=ROOT):
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
