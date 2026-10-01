"""Normalizza gli originali Higgsfield nel formato nativo del gioco (richiede Pillow)."""
import argparse
import json
from pathlib import Path
from urllib.request import urlretrieve

from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--download", action="store_true", help="Scarica gli originali mancanti dagli URL del manifest")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / "scripts/higgsfield-assets.json").read_text())
source_dir = root / "artifacts/higgsfield"
source_dir.mkdir(parents=True, exist_ok=True)
for asset in manifest["assets"]:
    source = source_dir / f'{asset["id"]}-source.png'
    if not source.exists():
        if not args.download:
            raise SystemExit(f"Originale assente: {source}. Usa --download per recuperarlo.")
        urlretrieve(asset["sourceUrl"], source)
    kind = asset.get("kind", "title" if asset["id"] == "title" else "battle")
    dimensions = tuple(manifest["processing"]["dimensions"][kind])
    with Image.open(source) as original:
        image = original.convert("RGB").resize(dimensions, Image.Resampling.NEAREST)
        image = image.quantize(colors=manifest["processing"]["paletteColors"], method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        target = root / asset["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, optimize=True)
        print(f'{asset["id"]}: {dimensions[0]}×{dimensions[1]}, {target.stat().st_size} byte')
