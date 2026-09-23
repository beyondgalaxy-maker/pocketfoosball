"""Guarded, idempotent integration of v13. Keeps the previous source readable."""
from pathlib import Path

def replace_once(path, old, new):
    text=path.read_text()
    if new in text:return
    if text.count(old)!=1:raise ValueError(f'Expected one integration anchor in {path.name}')
    path.write_text(text.replace(old,new,1))

def upgrade(root):
    replace_once(root/'bot-control.js', "const id=taps.up(e.pointerId,e.clientX,e.clientY,e.timeStamp);if(id!==null)", "const id=taps.up(e.pointerId,e.clientX,e.clientY,e.timeStamp);if(id!==null&&!g.tapShotMode13)")
    replace_once(root/'v12.js', 'const record=p.v12||(p.v12=newRecord(p));', 'if(Math.hypot(deltaSlide,deltaTurn)>2&&root.TouchlineV13?.cancelAssist(r)){p.theta=r.theta;p.startTurn=a.turn-deltaTurn;}const record=p.v12||(p.v12=newRecord(p));')
    replace_once(root/'index.html','<script src="v12.js"></script>','<script src="v12.js"></script>\n<script src="v13.js"></script>')
    replace_once(root/'build.py', "'v12.js')", "'v12.js', 'v13.js')")
    replace_once(root/'online.js','const VERSION=12,','const VERSION=13,')
    text=(root/'online.js').read_text().replace('pocketfoosball12-', 'pocketfoosball13-')
    (root/'online.js').write_text(text)

if __name__=='__main__':upgrade(Path(__file__).resolve().parent)
