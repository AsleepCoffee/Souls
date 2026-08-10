// Shared "load hand-captured observation JSON files from a directory and
// merge them field-by-field" logic, used by build-site-data.mjs,
// build-items-data.mjs, and build-monsters-data.mjs. See
// data-pipeline/observations/README.md for the full picture.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * @param {string} dir absolute path to an observations subfolder (e.g. data-pipeline/observations/items)
 * @returns {Record<string, any>} merged observations keyed by whatever id the capture hook used (item_id, monster_id, skill_id, ...)
 */
export function loadObservations(dir) {
  const merged = {};
  if (!existsSync(dir)) return merged;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.includes(".example."))
    .sort();
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(path.join(dir, file), "utf-8"));
    for (const [id, fields] of Object.entries(parsed)) {
      merged[id] = { ...(merged[id] || {}), ...fields, _source_file: file };
    }
  }
  return merged;
}

/**
 * Builds a Field-shaped object for a stat sourced from a captured observation,
 * or null if that field isn't present in the observation (caller should fall
 * back to the usual "unknown/server_runtime" field in that case).
 */
export function observedField(obs, key, note) {
  if (obs == null || obs[key] === undefined || obs[key] === null) return null;
  return {
    value: obs[key],
    provenance: "observed_live",
    note: `${note} Captured from the running client in ${obs._source_file}${
      obs.recorded_at_unix ? ` on ${new Date(obs.recorded_at_unix * 1000).toISOString().slice(0, 10)}` : ""
    }.`,
  };
}
