"""Empacota as referências editoriais e os critérios verificados, sem dependências de rede."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'data/press.json').read_text())
text = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
(root / 'press-data.js').write_text('"use strict";\n(function(root){const data=' + text + ';root.LegacyPressData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
print(f"Imprensa: {len(data['outlets'])} veículos e {len(data['journalists'])} perfis reais.")
