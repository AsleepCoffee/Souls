// Transforms data-pipeline/source/worldmap-zones.json (itself produced by
// build-worldmap-data.mjs from a raw client+server capture — see that
// script and data-pipeline/README.md's "Maps & Leveling" section for the
// full provenance story and the layer-labeling caveat) into the site's
// versioned data file. No RECOVERED_PROJECT_ROOT needed — the source here
// is already a parsed intermediate export, same relationship
// build-site-data.mjs has to its own pre-parsed skill-tree source.
//
// Usage: node data-pipeline/build-maps-data.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PIPELINE_VERSION = "1.0.0";
const SOURCE_PATH = path.join(__dirname, "source", "worldmap-zones.json");
const OUT_PATH = path.join(ROOT, "src", "data", "maps.generated.json");

// The World Map capture this pipeline currently ships with. Update this if
// worldmap-zones.json is regenerated from a newer capture.
const CAPTURE_DATE = "2026-08-11";
const CAPTURE_NOTE_SUFFIX = `Captured live from the running client's World Map on ${CAPTURE_DATE}.`;

const KNOWN_RESOURCE_TYPES = new Set([0, 1, 2]); // Herbalism / Mining / Fishing — see src/data/constants.ts

/** Godot color_rgba components are floats in [0,1] (sometimes fractionally over/under by float noise) — convert to a CSS "r, g, b" string. */
function toCssRgb(color_rgba) {
  if (!Array.isArray(color_rgba) || color_rgba.length < 3) return "232, 185, 104"; // fallback: --accent-strong
  const [r, g, b] = color_rgba.map((c) => Math.max(0, Math.min(255, Math.round(c * 255))));
  return `${r}, ${g}, ${b}`;
}

function buildZoneRecord(zone) {
  const monsters = (zone.monsters ?? []).map((m) => ({
    name: m.name,
    reference_id: m.reference_id,
    // 0 is a sentinel meaning "no essence item", not a real item id (11/224
    // entries in the current capture have it) — filter it here so the site
    // never has to special-case an "item #0" that doesn't exist.
    essence_item_ids: (m.essence_item_ids ?? []).filter((id) => id !== 0),
  }));

  const resources = (zone.resources ?? []).map((r) => {
    if (!KNOWN_RESOURCE_TYPES.has(r.resource_type)) {
      console.warn(`Warning: zone "${zone.map_id}" resource "${r.name}" has unrecognized resource_type ${r.resource_type} — add it to src/data/constants.ts's RESOURCE_TYPE_LABEL/COLOR.`);
    }
    return {
      name: r.name,
      reference_id: r.reference_id,
      resource_type: { value: r.resource_type, provenance: "client_structured" },
      spawn_chance_percent: {
        value: r.spawn_chance_percent,
        provenance: "observed_live",
        note: `Resource spawn chance for this zone. ${CAPTURE_NOTE_SUFFIX}`,
      },
      found_on_trees: Boolean(r.found_on_trees),
    };
  });

  const warp_point = zone.warp_point
    ? {
        warp_point_id: zone.warp_point.warp_point_id,
        unlocked: {
          value: Boolean(zone.warp_point.unlocked),
          provenance: "observed_live",
          note: `Reflects the capturing account's own progress unlocking this warp point, not a global/universal fact. ${CAPTURE_NOTE_SUFFIX}`,
        },
      }
    : null;

  return {
    map_id: zone.map_id,
    layer: zone.layer,
    display_name: { value: zone.display_name, provenance: "client_structured" },
    x: {
      value: zone.x,
      provenance: "client_structured",
      note: "Position corrected into the 269x264 background image's pixel space by build-worldmap-data.mjs — see that script's comments for the box-to-image offset math.",
    },
    y: { value: zone.y, provenance: "client_structured" },
    color_rgb: {
      value: toCssRgb(zone.color_rgba),
      provenance: "client_structured",
      note: "The zone's in-game region tint (self_modulate color on its WorldMapMapIcon node).",
    },
    level:
      zone.level == null
        ? { value: null, provenance: "server_runtime", note: "Zone level is requested on demand from the server (world_map_window.gd opcode 154) and wasn't present in this capture for this zone." }
        : { value: zone.level, provenance: "observed_live", note: `Zone level. ${CAPTURE_NOTE_SUFFIX}` },
    monsters,
    resources,
    warp_point,
  };
}

function main() {
  if (!existsSync(SOURCE_PATH)) {
    throw new Error(`Missing source export at ${SOURCE_PATH} — run build-worldmap-data.mjs against a capture first.`);
  }
  const raw = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));

  if (!Array.isArray(raw.zones) || raw.zones.length === 0) {
    throw new Error("Source worldmap-zones.json has no zones — check its shape.");
  }

  const zones = raw.zones.map(buildZoneRecord).sort((a, b) => a.map_id.localeCompare(b.map_id));

  const layer_counts = {};
  for (const z of zones) {
    layer_counts[z.layer] = (layer_counts[z.layer] || 0) + 1;
  }

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      pipeline_version: PIPELINE_VERSION,
      image_width: raw.image_width,
      image_height: raw.image_height,
      total_zones: zones.length,
      layer_counts,
    },
    zones,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");

  const withLevel = zones.filter((z) => z.level.value !== null).length;
  const withMonsters = zones.filter((z) => z.monsters.length > 0).length;
  const withResources = zones.filter((z) => z.resources.length > 0).length;
  const withWarp = zones.filter((z) => z.warp_point !== null).length;
  console.log(`Wrote ${zones.length} zones to ${path.relative(ROOT, OUT_PATH)}`);
  console.log("By layer:", layer_counts);
  console.log(`${withLevel}/${zones.length} zones have an observed level, ${withMonsters} have monster spawns, ${withResources} have gathering resources, ${withWarp} have a warp point.`);
}

main();
