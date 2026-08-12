// Converts a "developer-authorized runtime client export" (the
// souls-remnant-runtime-skills.json produced by the WIKI_SKILL_DATA capture
// pipeline — see the accompanying souls-remnant-runtime-capture-notes.md)
// into the flat, skill_id-keyed observation shape build-site-data.mjs
// expects under data-pipeline/observations/skills/. See
// data-pipeline/observations/README.md for the general pattern this follows.
//
// Usage: node data-pipeline/import-runtime-skill-capture.mjs <path-to-souls-remnant-runtime-skills.json>

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "observations", "skills");

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node data-pipeline/import-runtime-skill-capture.mjs <path-to-runtime-skills.json>");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(inputPath, "utf-8"));
  const capturedAt = raw.captured_at_utc ? new Date(raw.captured_at_utc) : null;
  const recordedAtUnix = capturedAt ? Math.floor(capturedAt.getTime() / 1000) : undefined;

  let skipped = 0;
  const out = {};
  for (const s of raw.skills) {
    // The site currently only models the Combat Skills tree (79 nodes); the
    // capture also includes Life Skills and 3 standalone skills (Roll,
    // Search, Taming) that have no home in the site's schema yet.
    if (s.tree !== "Combat Skills") {
      skipped++;
      continue;
    }
    const entry = {
      base_power: s.base_power,
      power_per_level: s.power_per_level,
      cooldown_ms: s.cooldown,
      duration_ms: s.duration_base,
      attack_per_second: s.attack_per_second,
      attack_count: s.attack_count,
    };
    if (typeof s.duration_per_level === "number" && s.duration_per_level !== 0) {
      entry.duration_per_level_ms = s.duration_per_level;
    }
    if (Array.isArray(s.scalings) && s.scalings.length > 0) {
      entry.scaling = s.scalings.map((sc) => ({ id: sc.id, amount: sc.amount, per_level: sc.per_level }));
    }
    if (Array.isArray(s.requirements) && s.requirements.length > 0) {
      entry.level_requirements = s.requirements.map((r) => ({ skill_id: r.skill_id, level: r.level, skill_name: r.skill_name }));
    }
    if (recordedAtUnix) entry.recorded_at_unix = recordedAtUnix;
    out[String(s.skill_id)] = entry;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = capturedAt ? capturedAt.toISOString().slice(0, 10) : "unknown-date";
  const outPath = path.join(OUT_DIR, `runtime-capture-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf-8");

  console.log(`Wrote observations for ${Object.keys(out).length} combat skills to ${path.relative(process.cwd(), outPath)}`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} non-combat-tree record(s) (Life Skills / Roll / Search / Taming — not yet modeled in the site).`);
  }
  console.log("Re-run `node data-pipeline/build-site-data.mjs` to apply these observations.");
}

main();
