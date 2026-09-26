"""Create a self-contained offline-capable game; online PeerJS loads on demand."""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text()
for name in ('style.css','v2.css'):
    html=html.replace(f'<link rel="stylesheet" href="{name}">','<style>'+ (ROOT/name).read_text()+'</style>')
for name in ('engine.js','campaign.js','expansion.js','render-v2.js','online-v2.js','app-v2.js'):
    text=(ROOT/name).read_text()
    assert '</script' not in text.lower(), name
    html=html.replace(f'<script src="{name}"></script>','<script>'+text+'</script>')
(ROOT/'jelly-jam.html').write_text(html)
print('Built Jelly Jam 2:',len(html),'characters')
