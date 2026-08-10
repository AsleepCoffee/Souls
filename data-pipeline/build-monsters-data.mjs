// Builds src/data/monsters.generated.json + data-pipeline/source/monster-icon-manifest.json
// from the recovered project's Resources/Monsters/Database/*.tres files.
//
// Dev-machine-only (never runs in CI, matches build-site-data.mjs's existing
// separation): requires RECOVERED_PROJECT_ROOT to point at the recovered
// Godot project.
//
// Usage:
//   RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered node data-pipeline/build-monsters-data.mjs

import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readTres, scalarField, extResourcePath } from "./lib/tres.mjs";
import { resolveIcon } from "./lib/resolve-icon.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "src", "data", "monsters.generated.json");
const MANIFEST_PATH = path.join(__dirname, "source", "monster-icon-manifest.json");
const PIPELINE_VERSION = "1.0.0";

function walkTres(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkTres(full));
    else if (entry.endsWith(".tres")) out.push(full);
  }
  return out;
}

function slugify(filename) {
  const base = filename.replace(/\.tres$/, "");
  return base
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

// Same-shaped stats object as the skills pipeline's unknownStat() — kept
// parallel so a future observations-merge feature (mirroring
// data-pipeline/observations/ + observedStat() for skills) could slot in
// without a schema change. Not built this phase; see plan's explicit
// out-of-scope note.
function unknownStat(note) {
  return { value: null, provenance: "server_runtime", note };
}

function main() {
  const recoveredRoot = process.env.RECOVERED_PROJECT_ROOT;
  if (!recoveredRoot) {
    console.error("RECOVERED_PROJECT_ROOT env var not set.");
    process.exit(1);
  }

  const monstersDbDir = path.join(recoveredRoot, "Resources", "Monsters", "Database");
  const monsterFiles = walkTres(monstersDbDir);
  console.log(`Found ${monsterFiles.length} monster .tres files.`);

  const monsters = [];
  const iconManifest = [];
  const usedSlugs = new Set();

  for (const filePath of monsterFiles) {
    const relFromDb = path.relative(monstersDbDir, filePath).replace(/\\/g, "/");
    const relFromRoot = path.relative(recoveredRoot, filePath).replace(/\\/g, "/");
    const parsed = readTres(filePath);

    const name = scalarField(parsed.resourceBody, "name");
    if (!name) {
      throw new Error(`Monster missing name: ${relFromRoot}`);
    }
    // Unlike items (where every sampled file had a real icon), at least one
    // monster (GiantSlime.tres) has a literal `sprite_frames = null` in its
    // .tres — a genuine data gap, not a parser failure. Warn and continue
    // with a null icon (SkillIcon already renders a "?" placeholder for
    // this) rather than crashing the whole pipeline over one entry.
    const icon = resolveIcon(parsed);
    if (!icon) {
      console.warn(`Warning: monster has no resolvable icon (sprite_frames likely null in source): ${relFromRoot} ("${name}")`);
    }
    const monsterId = scalarField(parsed.resourceBody, "monster_id");
    if (monsterId === null) {
      console.warn(`Warning: monster missing monster_id: ${relFromRoot} ("${name}") — using filename slug as key.`);
    }

    const sceneField = scalarField(parsed.resourceBody, "scene");
    const scenePath = extResourcePath(parsed, sceneField);

    let slug = slugify(path.basename(filePath));
    if (usedSlugs.has(slug)) {
      slug = slugify(relFromDb.replace(/\//g, "-"));
    }
    usedSlugs.add(slug);

    const iconOutFile = icon ? `${slug}.png` : null;
    if (icon && iconOutFile) {
      iconManifest.push({ id: slug, sourcePng: icon.sourcePath, crop: icon.crop, outFile: iconOutFile });
    }

    monsters.push({
      slug,
      monster_id:
        monsterId !== null
          ? { value: monsterId, provenance: "client_structured" }
          : { value: null, provenance: "unknown", note: "This monster's .tres has no monster_id field at all." },
      name: { value: name, provenance: "client_structured" },
      icon: iconOutFile
        ? { value: `assets/icons/monsters/${iconOutFile}`, provenance: "client_structured" }
        : { value: null, provenance: "unknown", note: "sprite_frames is null in this monster's .tres — no icon exists in the recovered client." },
      behavior_scene: scenePath ? { value: scenePath, provenance: "client_structured" } : { value: null, provenance: "unknown" },
      // All of these are shown as "???" in Scenes/UI/monster_info_window.gd
      // until the server responds to an on-demand per-monster query — none
      // exist in any recovered .tres/.gd file. Same treatment as skills'
      // server-runtime combat stats: never fabricated.
      stats: {
        level: unknownStat("Shown as \"???\" in monster_info_window.gd until the server responds; no monster level exists in any recovered file."),
        hp: unknownStat("Same — monster_info_window.gd's HP field is server-populated on request."),
        mp: unknownStat("Same — server-populated on request."),
        attack: unknownStat("Same — monster_info_window.gd's ATK field is server-populated on request."),
        defense: unknownStat("Same — monster_info_window.gd's DEF field is server-populated on request."),
        speed: unknownStat("Same — monster_info_window.gd's SPD field is server-populated on request."),
        exp_reward: unknownStat("No EXP-reward value exists in any recovered file — server-supplied on kill."),
      },
      drop_table: { value: null, provenance: "server_runtime", note: "monster_info_window_drop.gd's item_id/chance fields are populated by a per-monster server query when the Monster Info window is opened — no drop table exists in any recovered file." },
      found_in: { value: null, provenance: "server_runtime", note: "The \"Found in\" location shown in monster_info_window.gd is server-supplied on request; no zone/spawn data exists client-side (see the Maps page)." },
      source: { resource_path: relFromRoot, texture_path: icon ? icon.sourcePath : null },
    });
  }

  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(iconManifest, null, 2) + "\n", "utf-8");

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      pipeline_version: PIPELINE_VERSION,
      total_monsters: monsters.length,
    },
    monsters,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${monsters.length} monsters to ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`Wrote icon manifest (${iconManifest.length} entries) to ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main();
