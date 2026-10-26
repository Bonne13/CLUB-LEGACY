"""Baixa os escudos e bandeiras identificados em data/badges.json e gera o catálogo offline.

Não altera os desenhos. Use --refresh para atualizar os arquivos das mesmas fontes.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--refresh', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = root / 'data/badges.json'
data = json.loads(manifest.read_text())
folder = root / 'assets/badges'
folder.mkdir(parents=True, exist_ok=True)

def download(entry):
    file = folder / entry['file']
    if args.refresh or not file.exists():
        req = urllib.request.Request(entry['sourceUrl'], headers={'User-Agent': 'ClubLegacy/0.8'})
        with urllib.request.urlopen(req, timeout=35) as response:
            image = response.read(350_001)
        assert 64 < len(image) < 350_000, 'Tamanho inesperado: ' + entry['file']
        if file.suffix == '.png':
            assert image.startswith(b'\x89PNG\r\n\x1a\n'), 'PNG inválido'
        else:
            assert b'<svg' in image and not re.search(rb'<script|\bonload\s*=|<foreignObject', image, re.I), 'SVG inválido'
        file.write_bytes(image)
    entry['sha256'] = hashlib.sha256(file.read_bytes()).hexdigest()
    return entry

# Uma única requisição por arquivo, mesmo para nomes históricos alternativos.
files = {entry['file']: entry for entry in data['entries']}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    downloaded = list(pool.map(download, files.values()))
hashes = {entry['file']: entry['sha256'] for entry in downloaded}
for entry in data['entries']:
    entry['sha256'] = hashes[entry['file']]
manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
catalog = {
    'assets': {name: 'assets/badges/' + name for name in sorted(files)},
    'clubs': {entry['name']: entry['file'] for entry in data['entries'] if 'name' in entry},
    'countries': {entry['country']: entry['file'] for entry in data['entries'] if 'country' in entry},
}
(root / 'badges-data.js').write_text('"use strict";\n(function(root){const data=' + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';root.LegacyBadgeData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
print(f"{len(catalog['clubs'])} identidades de clubes, {len(catalog['countries'])} bandeiras; {len(files)} arquivos locais.")
