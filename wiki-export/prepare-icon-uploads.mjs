// FALLBACK ONLY: the target wiki (soulsremnant.wiki.gg) already has these
// icon files uploaded under the filenames in icon-filename-reference.csv
// (confirmed via Template:Favicon/Paste + real usage on the live Skills
// page) — normally there's nothing to upload. This script is here for the
// rare case a specific icon turns out to be missing/broken on the wiki: it
// copies the recovered source icons into one folder, pre-named to match,
// so whichever ones are actually needed can be uploaded without manual
// renaming.
//
// Usage: node wiki-export/prepare-icon-uploads.mjs

import { readFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildIconManifest } from "./lib/icon-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "src/data/skills.generated.json");
const TREE_IMAGE_SRC = path.join(__dirname, "output/assets/CombatSkillTree.png");
const OUT_DIR = path.join(__dirname, "output/upload");

function main() {
  const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const skills = [...raw.skills].sort((a, b) => a.name.value.localeCompare(b.name.value));
  const { iconMap } = buildIconManifest(skills);

  mkdirSync(OUT_DIR, { recursive: true });

  let copied = 0;
  let missing = 0;
  for (const [iconPath, wikiName] of iconMap.entries()) {
    const src = path.join(ROOT, "public", iconPath);
    if (!existsSync(src)) {
      console.warn(`Missing source file, skipped: ${src}`);
      missing++;
      continue;
    }
    copyFileSync(src, path.join(OUT_DIR, wikiName));
    copied++;
  }

  if (existsSync(TREE_IMAGE_SRC)) {
    copyFileSync(TREE_IMAGE_SRC, path.join(OUT_DIR, "CombatSkillTree.png"));
    copied++;
  } else {
    console.warn(`Tree background not found at ${TREE_IMAGE_SRC} — run wiki-export/make-tree-image.py first.`);
  }

  console.log(`Copied ${copied} file(s), pre-named for upload, to ${path.relative(ROOT, OUT_DIR)}/`);
  if (missing > 0) console.warn(`${missing} icon(s) missing from public/assets/icons/ — check the site build.`);
}

main();
