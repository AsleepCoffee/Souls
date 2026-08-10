// Resolves a parsed .tres's icon: frame 0 of its "default" SpriteFrames
// animation, which is either a plain texture (most items/monsters) or an
// AtlasTexture crop out of a shared sheet (equipment cosmetics, and ~14% of
// plain items too — hat/weapon icons drawn from a shared spritesheet).
import { scalarField } from "./tres.mjs";

function parseRect2(raw) {
  const m = /Rect2\(([^)]+)\)/.exec(String(raw));
  if (!m) return null;
  const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  const [x, y, w, h] = parts;
  return { x, y, w, h };
}

/**
 * @param {ReturnType<import("./tres.mjs").parseTres>} parsed
 * @returns {{ sourcePath: string, crop: {x:number,y:number,w:number,h:number} | null } | null}
 */
export function resolveIcon(parsed) {
  const spriteFramesField = scalarField(parsed.resourceBody, "sprite_frames");
  if (!spriteFramesField || typeof spriteFramesField !== "object" || spriteFramesField.ref !== "sub") {
    return null;
  }
  const sf = parsed.subResources.get(spriteFramesField.id);
  if (!sf) return null;

  // Frame 0 of the (first, "default") animation is always the first
  // "texture": occurrence in file order — confirmed across every sample.
  const m = /"texture":\s*(ExtResource|SubResource)\("([^"]+)"\)/.exec(sf.bodyText);
  if (!m) return null;
  const [, kind, refId] = m;

  if (kind === "ExtResource") {
    const ext = parsed.extResources.get(refId);
    if (!ext) return null;
    return { sourcePath: ext.path.replace(/^res:\/\//, ""), crop: null };
  }

  const atlasSub = parsed.subResources.get(refId);
  if (!atlasSub || atlasSub.type !== "AtlasTexture") return null;
  const atlasRefField = scalarField(atlasSub.bodyText, "atlas");
  if (!atlasRefField || typeof atlasRefField !== "object" || atlasRefField.ref !== "ext") return null;
  const ext = parsed.extResources.get(atlasRefField.id);
  if (!ext) return null;
  const crop = parseRect2(scalarField(atlasSub.bodyText, "region"));
  return { sourcePath: ext.path.replace(/^res:\/\//, ""), crop };
}
