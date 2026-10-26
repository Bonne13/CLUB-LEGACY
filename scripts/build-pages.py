"""Gera somente os arquivos públicos do site para o GitHub Pages."""

import argparse
from pathlib import Path
import shutil
import subprocess
import sys


root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", type=Path, default=root / "dist")
args = parser.parse_args()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)

subprocess.run(
    [sys.executable, str(root / "scripts/build-standalone.py"), str(output / "index.html")],
    check=True,
)
(output / ".nojekyll").write_text("", encoding="utf-8")
for name in ("data/LICENSE.openfootball.txt", "vendor/LICENSE.lz-string.txt", "vendor/LICENSE.three.txt", "data/SOURCES.md", "data/badges.json", "data/captains.json", "data/press.json"):
    destination = output / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / name, destination)

print(f"Site pronto para publicação: {output}")
