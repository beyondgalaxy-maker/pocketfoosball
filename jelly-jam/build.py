"""Build an offline-capable single HTML file, with online play loaded on demand."""
from pathlib import Path
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="style.css">','<style>\n'+(root/'style.css').read_text()+'\n</style>')
for name in ['engine.js','render.js','online.js','app.js']:
    source=(root/name).read_text()
    if '</script' in source.lower():
        raise ValueError(f'Unsafe script closing tag in {name}')
    html=html.replace(f'<script src="{name}"></script>','<script>\n'+source+'\n</script>')
(root/'jelly-jam.html').write_text(html)
print('Built jelly-jam.html:',len(html.encode()),'bytes')
