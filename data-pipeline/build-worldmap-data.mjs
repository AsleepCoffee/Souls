// Builds the World Map's zone list from a combined client+server capture
// (see data-pipeline/observations/worldmap/README.md for where this comes
// from). The zone names, positions, and Surface/Caves layer are
// client_structured (baked into the recovered project's
// Scenes/UI/world_map_window.tscn); level, monsters, resources, and warp
// point status are server_runtime data that this specific capture recorded
// live from the running client — see data-pipeline/README.md's "Maps &
// Leveling" section for the full provenance story and the layer-labeling
// caveat below.
//
// Usage: node data-pipeline/build-worldmap-data.mjs <path-to-combined-capture.json>

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "source", "worldmap-zones.json");

// The source PNGs are 269x264 — narrower than the 355-wide box the capture's
// own coordinates are measured against (Godot's anchor-relative offsets,
// stretch_mode=KEEP_ASPECT_CENTERED letterboxes the image centered within
// that box: full height, (355-269)/2 = 43px empty on each side). So we
// recompute from position_centered (the raw "distance from box center"
// values) directly into actual image pixel space, rather than trusting the
// capture's own "position_on_355x264_image" field, which is in box space,
// not image space.
const IMAGE_WIDTH = 269;
const IMAGE_HEIGHT = 264;

// The client's own D9Qm8AN dictionary (world_map_window.gd) — and this
// capture's "layer_label", which just echoes that same dictionary — label
// layer 0 "Caves" and layer 1 "Surface". That reads backwards against every
// other signal available: layer-0 zone names are overwhelmingly outdoor
// biome names (outskirts/plains/forest/desert/beach/ocean/savannah/...)
// while layer-1 names are unambiguous cave names (cave_1, deep_cave_N,
// frost_cave, hall_of_might); layer 0's background art is a colorful
// multi-biome continent while layer 1's is a vertical underground
// cross-section; and layer-0 zones average level 37.7 (max 88) vs layer-1's
// 50.1 (max 105), consistent with layer 0 being the beginner-accessible
// overworld. Going with the label that matches the data, not the dict
// string — flag this loudly if it turns out to be wrong (quickest check:
// open the World Map in-game and see what the toggle button currently says
// while standing somewhere obviously outdoors).
const LAYER_LABEL = { 0: "Surface", 1: "Caves" };

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node data-pipeline/build-worldmap-data.mjs <path-to-combined-capture.json>");
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(inputPath, "utf-8"));

  const zones = raw.icons.map((icon) => {
    const x = IMAGE_WIDTH / 2 + icon.position_centered.center_x;
    const y = IMAGE_HEIGHT / 2 + icon.position_centered.center_y;
    const server = raw.server_details_by_map_id[icon.map_id] ?? null;

    return {
      map_id: icon.map_id,
      display_name: icon.display_name || icon.map_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      layer: icon.layer,
      layer_label: LAYER_LABEL[icon.layer] ?? `Unknown layer ${icon.layer}`,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      color_rgba: icon.color_rgba ?? null,
      level: server?.level ?? null,
      monsters: server?.monsters ?? [],
      resources: server
        ? [...server.resources].sort((a, b) => b.spawn_chance_percent - a.spawn_chance_percent)
        : [],
      warp_point: server?.warp_point ?? null,
    };
  });

  if (zones.length === 0) {
    throw new Error("Found 0 zones — check the capture file's shape (expected raw.icons array).");
  }

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        image_width: IMAGE_WIDTH,
        image_height: IMAGE_HEIGHT,
        zones,
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );

  const byLayer = {};
  let withServerData = 0;
  for (const z of zones) {
    byLayer[z.layer_label] = (byLayer[z.layer_label] || 0) + 1;
    if (z.level !== null) withServerData++;
  }
  console.log(`Wrote ${zones.length} zones to ${path.relative(process.cwd(), OUT_PATH)}`);
  console.log("By layer:", byLayer);
  console.log(`${withServerData}/${zones.length} zones have server-captured level/monster/resource/warp data.`);
}

main();
