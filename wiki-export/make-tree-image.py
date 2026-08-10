"""
Flattens the two-layer in-game tree art (bare linework + color overlay) into
a single composite PNG suitable for uploading to a wiki and wrapping in an
<imagemap> block. The live site layers these with CSS (mix-blend-mode:
soft-light); wikitext can't do that, so this bakes an approximation once,
offline. Re-run whenever the source art changes.

Usage: python wiki-export/make-tree-image.py
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BARE = ROOT / "public/assets/tree/skill_tree_combat_bare.png"
OVERLAY = ROOT / "public/assets/tree/skill_tree_combat_color_overlay.png"
OUT = ROOT / "wiki-export/output/assets/CombatSkillTree.png"

def main():
    bare = Image.open(BARE).convert("RGBA")
    overlay = Image.open(OVERLAY).convert("RGBA")
    assert bare.size == overlay.size, "bare/overlay size mismatch"

    # Soften the overlay's alpha so the tinted quadrants read as a wash over
    # the linework rather than flat color blocks, echoing the site's
    # mix-blend-mode: soft-light look closely enough for a static wiki image.
    r, g, b, a = overlay.split()
    a = a.point(lambda v: int(v * 0.5))
    overlay_soft = Image.merge("RGBA", (r, g, b, a))

    composite = Image.alpha_composite(bare, overlay_soft)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.save(OUT)
    print(f"Wrote {OUT} ({composite.size[0]}x{composite.size[1]})")

if __name__ == "__main__":
    main()
