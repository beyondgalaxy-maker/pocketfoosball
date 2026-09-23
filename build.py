"""Build standalone offline play; online mode loads PeerJS only when requested."""
from pathlib import Path


def build(root: Path) -> Path:
    html = (root / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="styles.css">',
                        '<style>\n' + (root / 'styles.css').read_text(encoding='utf-8') + '\n</style>')
    for name in ('engine.js', 'input.js', 'app.js', 'rolling.js', 'bot-control.js', 'v11.js', 'online.js'):
        script = (root / name).read_text(encoding='utf-8')
        if '</script' in script.lower():
            raise ValueError(f'{name} contains a closing script sequence; escape it before bundling.')
        html = html.replace(f'<script src="{name}"></script>', '<script>\n' + script + '\n</script>')
    destination = root / 'touchline.html'
    destination.write_text(html, encoding='utf-8')
    site = root / 'site'
    site.mkdir(exist_ok=True)
    (site / 'index.html').write_text(html, encoding='utf-8')
    return destination


if __name__ == '__main__':
    target = build(Path(__file__).resolve().parent)
    print(f'Built {target.name} ({target.stat().st_size:,} bytes)')
