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
import { loadObservations, observedField } from "./lib/observations.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "src", "data", "monsters.generated.json");
const MANIFEST_PATH = path.join(__dirname, "source", "monster-icon-manifest.json");
const OBSERVATIONS_DIR = path.join(__dirname, "observations", "monsters");
const PIPELINE_VERSION = "1.1.0";

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

// Same-shaped stats object as the skills pipeline's unknownStat().
function unknownStat(note) {
  return { value: null, provenance: "server_runtime", note };
}

function unknownDropField() {
  return {
    value: null,
    provenance: "server_runtime",
    note: "monster_info_window_drop.gd's item_id/chance fields are populated by a per-monster server query when the Monster Info window is opened — no drop table exists in any recovered file.",
  };
}

function unknownFoundInField() {
  return {
    value: null,
    provenance: "server_runtime",
    note: "The \"Found in\" location shown in monster_info_window.gd is server-supplied on request; no zone/spawn data exists client-side (see the Maps page).",
  };
}

function formatDrops(drops) {
  if (!Array.isArray(drops) || drops.length === 0) return null;
  return drops
    .map((d) => `Item #${d?.item_id ?? "?"} (${d?.chance != null ? `${d.chance}%` : "?"}${d?.source ? `, ${d.source}` : ""})`)
    .join("; ");
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

  const observations = loadObservations(OBSERVATIONS_DIR);

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
      // server-runtime combat stats: never fabricated. Overridden below with
      // real observed_live values wherever data-pipeline/observations/monsters/
      // has a capture for this monster_id.
      stats: (() => {
        const obs = monsterId !== null ? observations[String(monsterId)] : null;
        return {
          level: observedField(obs, "level", "Shown as \"???\" in monster_info_window.gd until the server responds.") ?? unknownStat("Shown as \"???\" in monster_info_window.gd until the server responds; no monster level exists in any recovered file."),
          hp: observedField(obs, "hp", "Same — HP field is server-populated on request.") ?? unknownStat("Same — monster_info_window.gd's HP field is server-populated on request."),
          mp: observedField(obs, "mp", "Same — MP field is server-populated on request.") ?? unknownStat("Same — server-populated on request."),
          attack: observedField(obs, "attack", "Same — ATK field is server-populated on request.") ?? unknownStat("Same — monster_info_window.gd's ATK field is server-populated on request."),
          defense: observedField(obs, "defense", "Same — DEF field is server-populated on request.") ?? unknownStat("Same — monster_info_window.gd's DEF field is server-populated on request."),
          speed: observedField(obs, "speed", "Same — SPD field is server-populated on request.") ?? unknownStat("Same — monster_info_window.gd's SPD field is server-populated on request."),
          exp_reward: unknownStat("No EXP-reward value exists in any recovered file — server-supplied on kill, and the monster_logger_patch.gd hook doesn't capture it (not shown in Monster Info)."),
        };
      })(),
      drop_table: (() => {
        const obs = monsterId !== null ? observations[String(monsterId)] : null;
        const formatted = obs ? formatDrops(obs.drops) : null;
        return formatted
          ? observedField({ ...obs, drops: formatted }, "drops", "monster_info_window_drop.gd's item_id/chance fields are server-supplied per query.") ?? unknownDropField()
          : unknownDropField();
      })(),
      found_in: (() => {
        const obs = monsterId !== null ? observations[String(monsterId)] : null;
        return (
          observedField(obs, "found_in", "The \"Found in\" location is server-supplied on request.") ??
          unknownFoundInField()
        );
      })(),
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
  const observedCount = Object.keys(observations).length;
  if (observedCount > 0) {
    console.log(`Applied live-captured observations for ${observedCount} monster(s) from data-pipeline/observations/monsters/.`);
  } else {
    console.log("No files in data-pipeline/observations/monsters/ yet — all monster stats remain Unknown.");
  }
}

main();
