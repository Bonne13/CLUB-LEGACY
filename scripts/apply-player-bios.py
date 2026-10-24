"""Incorpora as biografias verificadas ao catálogo que é carregado offline."""
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
path = root / "roster-data.js"
match = re.search(r"const data\s*=\s*(\{.*\});\s*root\.LegacyRosterData", path.read_text(), re.S)
if not match:
    raise ValueError("Catálogo não reconhecido")
data = json.loads(match[1])
data["playerBios"] = json.loads((root / "data/player-bios.json").read_text())
if (root / "data/player-positions.json").exists():
    data["playerPositions"] = json.loads((root / "data/player-positions.json").read_text())
path.write_text('"use strict";\n(function(root){const data=' + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ';root.LegacyRosterData=data;if(typeof module!=="undefined")module.exports=data;})(globalThis);\n')
print(f'Biografias incorporadas: {len(data["playerBios"]["players"])}')
