"""
Prepares the three World Map background images for wiki upload: the Surface
map (one static frame of what's an animated 14-frame texture in-game — the
animation itself doesn't carry over to a static wiki image), its path/road
overlay, and the separate Caves map. Source PNGs are all a small 269x264 in
the recovered project (matching the in-game UI's own native resolution) —
upscaled 4x with nearest-neighbor to stay crisp (no blur) at a size that's
actually usable to zoom/pan into on a wiki page.

Requires RECOVERED_PROJECT_ROOT to point at the recovered Godot project.

Usage:
  RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered python wiki-export/make-worldmap-images.py
"""

import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "wiki-export" / "output" / "assets"
SCALE = 4

SOURCES = {
    "WorldMapSurface.png": "Sprites/Map/World Map/world_map_frame_1.png",
    "WorldMapPath.png": "Sprites/Map/World Map/World map path.png",
    "WorldMapCaves.png": "Sprites/Map/World Map/world_map_cave.png",
}


def main():
    recovered_root = os.environ.get("RECOVERED_PROJECT_ROOT")
    if not recovered_root:
        raise SystemExit("Set RECOVERED_PROJECT_ROOT to the recovered project's path.")
    recovered_root = Path(recovered_root)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for out_name, src_rel in SOURCES.items():
        src = recovered_root / src_rel
        im = Image.open(src).convert("RGBA")
        upscaled = im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST)
        out_path = OUT_DIR / out_name
        upscaled.save(out_path)
        print(f"Wrote {out_path} ({upscaled.size[0]}x{upscaled.size[1]}, from {im.size[0]}x{im.size[1]})")


if __name__ == "__main__":
    main()
