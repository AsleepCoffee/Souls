"""
Pre-renders one tinted marker icon per World Map region color. The in-game
marker (Sprites/Map/World Map/world map icon/map_icon_default.png) is a tiny
4x4 greyscale texture — its per-zone color comes from Godot's self_modulate
tint at runtime (a straight per-channel multiply), which DataMaps has no
equivalent for on a shared icon. So instead of one shared icon, this bakes
the same multiply Godot does for every distinct region color found in
data-pipeline/source/worldmap-zones.json, then upscales 16x with
nearest-neighbor — same convention already used elsewhere on this wiki for
small pixel-art icons (see the runtime capture's "_scaled_16x" filenames).

Requires RECOVERED_PROJECT_ROOT to point at the recovered Godot project, and
data-pipeline/source/worldmap-zones.json to already exist (run
data-pipeline/build-worldmap-data.mjs first).

Usage:
  RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered python wiki-export/make-worldmap-marker-icons.py
"""

import json
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ZONES_PATH = ROOT / "data-pipeline" / "source" / "worldmap-zones.json"
OUT_DIR = ROOT / "wiki-export" / "output" / "assets" / "markers"
SOURCE_ICON = "Sprites/Map/World Map/world map icon/map_icon_default.png"
SCALE = 16


def color_key(rgba):
    return tuple(round(v * 1000) / 1000 for v in rgba)


def tint(im, rgba):
    r, g, b, a = im.split()
    tr, tg, tb, ta = rgba
    r = r.point(lambda v: round(v * tr))
    g = g.point(lambda v: round(v * tg))
    b = b.point(lambda v: round(v * tb))
    a = a.point(lambda v: round(v * ta))
    return Image.merge("RGBA", (r, g, b, a))


def main():
    recovered_root = os.environ.get("RECOVERED_PROJECT_ROOT")
    if not recovered_root:
        raise SystemExit("Set RECOVERED_PROJECT_ROOT to the recovered project's path.")
    recovered_root = Path(recovered_root)

    zones = json.loads(ZONES_PATH.read_text(encoding="utf-8"))["zones"]

    # Same "color + layer" bucketing as build-worldmap-datamap.mjs, so
    # region-N here lines up with region-N in the generated DataMaps JSON.
    buckets = {}
    for zone in zones:
        rgba = zone.get("color_rgba") or [1, 1, 1, 1]
        key = (color_key(rgba), zone["layer"])
        if key not in buckets:
            buckets[key] = rgba

    base = Image.open(recovered_root / SOURCE_ICON).convert("RGBA")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for i, (key, rgba) in enumerate(buckets.items()):
        tinted = tint(base, rgba)
        # LANCZOS, not NEAREST: this specific icon renders with a soft glow
        # in-game (unlike the crisp pixel-art everywhere else in this
        # project), confirmed by comparing a nearest-neighbor upscale
        # against a real screenshot — nearest gave flat color blocks, this
        # gives the diamond-with-glowing-center look actually seen in-game.
        upscaled = tinted.resize((tinted.width * SCALE, tinted.height * SCALE), Image.LANCZOS)
        out_path = OUT_DIR / f"WorldMapMarker-region-{i}.png"
        upscaled.save(out_path)

    print(f"Wrote {len(buckets)} tinted marker icons ({base.width * SCALE}x{base.height * SCALE} each) to {OUT_DIR}")


if __name__ == "__main__":
    main()
