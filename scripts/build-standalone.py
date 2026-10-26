"""Gera a versão de arquivo único, sem dependências externas para jogar."""
from pathlib import Path
import re
import sys
import base64
import json

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / "CLUB-LEGACY-jogavel.html"
html = (root / "index.html").read_text()
css = (root / "style.css").read_text()
html, count = re.subn(r'<link\s+rel="stylesheet"\s+href="style.css"\s*/?>', lambda _: '<style>\n' + css + '\n</style>', html)
assert count == 1, "Folha de estilo não encontrada"

def inline_script(match):
    source = root / match.group(1)
    assert source.resolve().is_relative_to(root.resolve()), "Script fora da raiz"
    content = source.read_text()
    if source.name == 'badges-data.js':
        for image in sorted((root / 'assets/badges').iterdir()):
            mime = 'image/svg+xml' if image.suffix == '.svg' else 'image/png'
            uri = 'data:' + mime + ';base64,' + base64.b64encode(image.read_bytes()).decode()
            content = content.replace(json.dumps(str(image.relative_to(root))), json.dumps(uri))
        assert '"assets/badges/' not in content, 'Escudo externo não incorporado'
    return '<script>\n' + content.replace('</script', '<\\/script') + '\n</script>'

html = re.sub(r'<script\s+src="([^"<>]+\.js)"\s*>\s*</script>', inline_script, html)
assert not re.search(r'<script\s+src=', html), "Script externo não incorporado"
html = html.replace('</head>', '<!-- Calendários: OpenFootball / football.json, CC0 1.0. -->\n</head>')
for dependency, filename in (("LZ-String", "LICENSE.lz-string.txt"), ("Three.js", "LICENSE.three.txt")):
    license_text = (root / "vendor" / filename).read_text()
    html = html.replace("</head>", "<!-- " + dependency + " · licença MIT\n" + license_text.replace("--", "—") + "\n-->\n</head>")
output.write_text(html)
print(f"Versão jogável atualizada: {output} ({output.stat().st_size} bytes)")
