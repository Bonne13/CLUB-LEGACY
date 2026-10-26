"""Empacota as referências de capitania revisadas, sem buscas de nomes em tempo de jogo."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'data/captains.json').read_text())
text = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
(root / 'captains-data.js').write_text('"use strict";\n(function(root){const data=' + text + ';root.LegacyCaptainsData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
print(f"Capitania: {len(data['clubs'])} clubes, {sum(len(c['captains']) for c in data['clubs'])} identidades reais.")
