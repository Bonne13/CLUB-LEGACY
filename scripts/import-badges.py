"""Compatibilidade: regenera os emblemas originais locais, sem baixar escudos oficiais."""
from pathlib import Path
import subprocess
root = Path(__file__).resolve().parents[1]
subprocess.run(["node", str(root / "scripts/build-badges.cjs")], check=True)
