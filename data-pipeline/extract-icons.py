"""
Crops/copies item and monster icon PNGs out of the recovered project into
public/assets/icons/{items,monsters}/, driven by the icon manifests that
build-items-data.mjs / build-monsters-data.mjs write to data-pipeline/source/.

Manual, re-run-when-needed — same convention as wiki-export/make-tree-image.py.
Requires RECOVERED_PROJECT_ROOT to point at the recovered Godot project.

Usage:
  RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered python data-pipeline/extract-icons.py
"""

import json
import os
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "data-pipeline" / "source"
OUT_BASE = ROOT / "public" / "assets" / "icons"

MANIFESTS = [
    ("item-icon-manifest.json", OUT_BASE / "items"),
    ("monster-icon-manifest.json", OUT_BASE / "monsters"),
]


def extract_one(recovered_root: Path, entry: dict, out_dir: Path) -> bool:
    src = recovered_root / entry["sourcePng"]
    if not src.exists():
        print(f"  MISSING source: {src}")
        return False
    im = Image.open(src).convert("RGBA")
    crop = entry.get("crop")
    if crop:
        x, y, w, h = crop["x"], crop["y"], crop["w"], crop["h"]
        im = im.crop((x, y, x + w, y + h))
    out_dir.mkdir(parents=True, exist_ok=True)
    im.save(out_dir / entry["outFile"])
    return True


def main():
    recovered_root_env = os.environ.get("RECOVERED_PROJECT_ROOT")
    if not recovered_root_env:
        print("RECOVERED_PROJECT_ROOT env var not set.", file=sys.stderr)
        sys.exit(1)
    recovered_root = Path(recovered_root_env)
    if not recovered_root.exists():
        print(f"RECOVERED_PROJECT_ROOT does not exist: {recovered_root}", file=sys.stderr)
        sys.exit(1)

    any_manifest = False
    for manifest_name, out_dir in MANIFESTS:
        manifest_path = SOURCE_DIR / manifest_name
        if not manifest_path.exists():
            print(f"Skipping {manifest_name} (not found — run the matching build-*.mjs script first)")
            continue
        any_manifest = True
        with open(manifest_path, encoding="utf-8") as f:
            entries = json.load(f)
        ok = 0
        for entry in entries:
            if extract_one(recovered_root, entry, out_dir):
                ok += 1
        print(f"{manifest_name}: extracted {ok}/{len(entries)} icons to {out_dir.relative_to(ROOT)}")

    if not any_manifest:
        print("No icon manifests found in data-pipeline/source/. Nothing to do.")


if __name__ == "__main__":
    main()
