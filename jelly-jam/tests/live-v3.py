"""Verify deployed bytes before invoking the real browser/network suites."""
from pathlib import Path
import hashlib,json,time,urllib.request
ROOT=Path(__file__).resolve().parents[1]
URL='https://beyondgalaxy-maker.github.io/pocketfoosball/jelly-jam/'
files=['index.html','engine.js','campaign.js','campaign-v3.js','engine-v3.js','render-v3.js','online-v3.js','app-v3.js','style.css','v2.css','v3.css']
for name in files:
 expected=hashlib.sha256((ROOT/name).read_bytes()).digest()
 for attempt in range(24):
  try:
   request=urllib.request.Request(URL+name+'?verify='+str(time.time()),headers={'Cache-Control':'no-cache'})
   with urllib.request.urlopen(request,timeout=20) as response:actual=response.read()
   assert hashlib.sha256(actual).digest()==expected,name
   print('MATCH',name,flush=True);break
  except Exception:
   if attempt==23:raise
   time.sleep(5)
(ROOT/'tests/v3').mkdir(exist_ok=True)
(ROOT/'tests/v3/deployed-results.json').write_text(json.dumps({'passed':True,'url':URL,'files':files},indent=2))
