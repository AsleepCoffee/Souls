// Generates a wiki.gg DataMaps map document (JSON) for the World Map, from
// data-pipeline/source/worldmap-zones.json (produced by
// data-pipeline/build-worldmap-data.mjs from a combined client+server
// capture — see data-pipeline/observations/worldmap/README.md). Zone names/
// positions/layer/color are client_structured; level/monsters/resources/
// warp point are server_runtime data this specific capture recorded live —
// tagged as such in each popup.
//
// Zones are grouped by their in-game self_modulate color (a per-region tint,
// not per-zone noise: every plains_N shares one green, every deep_cave_N
// shares one purple, etc.), matching how the in-game World Map itself
// colors zone dots, since DataMaps only supports per-group coloring, not
// per-marker.
//
// Markers are plain CircularMarkerGroup dots (fillColor + dark stroke), not
// an image — the actual in-game marker is a tiny tinted-glow icon, but
// wiring up per-region image markers on this wiki ran into enough anchor/
// positioning trouble that a flat drawn circle is the more reliable choice.
// See wiki-export/make-worldmap-marker-icons.py if that's worth revisiting.
//
// First-pass / unverified against the live wiki in other respects — expect
// to need some live iteration (layer-switch behavior etc.) once this is
// actually pasted in and tested.
//
// Usage: node wiki-export/build-worldmap-datamap.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(__dirname.replace(/wiki-export$/, "data-pipeline"), "source", "worldmap-zones.json");
const OUT_DIR = path.join(__dirname, "output");

// Must match wiki-export/make-worldmap-images.py's SCALE constant.
const SCALE = 4;

// Circular markers are inherently centered on their coordinate (no anchor
// quirk to compensate for, unlike the icon markers on the skill tree map).
const MARKER_SIZE = 12;

const LAYER_BACKGROUND_ID = { 0: "surface", 1: "caves" };

const LEVEL_COLOR = "#ffd166";
const SECTION_LABEL_COLOR = "#4fd1c5";
const RESOURCE_TYPE_COLOR = { Herbalism: "#8bc34a", Mining: "#b08968", Fishing: "#63a5e0" };

function esc(s) {
  return String(s).replace(/\|/g, "&#124;").replace(/\[\[/g, "&#91;&#91;").replace(/\]\]/g, "&#93;&#93;");
}

// Same convention as skill icons: the wiki file is just "<exact name>.png"
// (confirmed working for monsters and items too, not just skills). If a
// specific name collides with another page's title on the wiki, this'll
// render a broken/red link for that one — same fix as before, tell me the
// real filename and I'll add a per-name override.
function favicon(name) {
  return `[[File:${name}.png|16px|link=]]`;
}

function slugId(zone, index) {
  return `zone-${zone.map_id}-${zone.layer}-${index}`;
}

function rgbaToHex(rgba) {
  const toHex = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
  return `#${toHex(rgba[0])}${toHex(rgba[1])}${toHex(rgba[2])}`;
}

function humanize(s) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Groups with more than one zone need a shared display label. Try the
// map_id with any trailing "_<number>" stripped (catches plains_1..4 ->
// "plains", deep_cave_1..N -> "deep_cave"); if that's not a clean majority,
// fall back to the first "_"-token (catches outskirts_west/outskirts_north/
// ... -> "outskirts", which have no numeric suffix to strip); if neither
// gives a clear pattern, just use the first zone's own display name.
function deriveRegionLabel(zones) {
  if (zones.length === 1) return zones[0].display_name;

  const stripped = zones.map((z) => z.map_id.replace(/_\d+$/, ""));
  const strippedMode = mode(stripped);
  if (strippedMode.count > 1) return humanize(strippedMode.value);

  const firstTokens = zones.map((z) => z.map_id.split("_")[0]);
  const tokenMode = mode(firstTokens);
  if (tokenMode.count > 1) return humanize(tokenMode.value);

  return zones[0].display_name;
}

function mode(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const [value, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { value, count };
}

function sectionLabel(text) {
  return `<span style="color:${SECTION_LABEL_COLOR}">'''${text}:'''</span>`;
}

function buildDescription(zone) {
  const lines = [];
  const levelPart = zone.level !== null ? `<span style="color:${LEVEL_COLOR}">'''Level ${zone.level}'''</span>` : "";
  lines.push(`'''${zone.layer_label} zone'''${levelPart ? ` &bull; ${levelPart}` : ""}`);
  lines.push("----");

  lines.push(sectionLabel("Monsters"));
  if (zone.monsters.length > 0) {
    for (const m of zone.monsters) lines.push(`* ${favicon(m.name)} ${esc(m.name)}`);
  } else {
    lines.push("* None");
  }

  lines.push("");
  lines.push(sectionLabel("Resources"));
  if (zone.resources.length > 0) {
    const byType = new Map();
    for (const r of zone.resources) {
      if (!byType.has(r.resource_type_label)) byType.set(r.resource_type_label, []);
      byType.get(r.resource_type_label).push(r);
    }
    for (const [typeLabel, items] of byType) {
      const color = RESOURCE_TYPE_COLOR[typeLabel] ?? "#ffffff";
      lines.push(`<span style="color:${color}">'''${esc(typeLabel)}'''</span>`);
      for (const r of items) {
        lines.push(`* ${favicon(r.name)} ${esc(r.name)}${r.found_on_trees ? " (trees)" : ""}`);
      }
    }
  } else {
    lines.push("* None");
  }

  if (zone.warp_point) {
    // unlocked/locked is per-character capture state, not a fact about the
    // zone — showing it as "Locked" would just reflect whichever character
    // did the capture, not something true for every reader. Just note that
    // a warp point exists here, matching the in-game map's own icon (which
    // shows *a* warp icon either way, varying only its own tint per-player).
    lines.push("");
    lines.push(`${sectionLabel("Warp point")} Yes`);
  }

  return lines.join("\n");
}

function buildSearchKeywords(zone) {
  const pairs = [[zone.display_name, 10]];
  for (const m of zone.monsters) pairs.push([m.name, 5]);
  return pairs;
}

function main() {
  const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  mkdirSync(OUT_DIR, { recursive: true });

  const width = raw.image_width * SCALE;
  const height = raw.image_height * SCALE;

  // Bucket zones by their exact in-game color (quantized to dodge float
  // noise) AND layer — most colors are single-layer already, but a couple
  // (e.g. the grey "cave entrance" tint) are shared between a Surface zone
  // and actual Caves zones, and groups can't mix layers without breaking
  // per-layer default visibility.
  const byColorKey = new Map(); // "colorKey|layer" -> { rgba, layer, zones: [] }
  for (const zone of raw.zones) {
    const rgba = zone.color_rgba ?? [1, 1, 1, 1];
    const colorKey = rgba.map((v) => Math.round(v * 1000) / 1000).join(",") + "|" + zone.layer;
    if (!byColorKey.has(colorKey)) byColorKey.set(colorKey, { rgba, layer: zone.layer, zones: [] });
    byColorKey.get(colorKey).zones.push(zone);
  }

  const groups = {};
  const markers = {};
  let groupIndex = 0;
  for (const { rgba, layer, zones } of byColorKey.values()) {
    const groupIdNum = groupIndex++;
    const groupId = `region-${groupIdNum}`;
    groups[groupId] = {
      name: deriveRegionLabel(zones),
      fillColor: rgbaToHex(rgba),
      strokeColor: "#1a1a1a",
      strokeWidth: 1,
      size: MARKER_SIZE,
      static: true,
      isSwitchable: true,
      // Keep the initial view uncluttered — Surface shows by default
      // (matching the background's own default), Caves regions start
      // toggled off in the legend until the user switches over.
      isDefault: layer === 0,
    };
    markers[groupId] = zones.map((zone, i) => ({
      id: slugId(zone, i),
      x: Math.round(zone.x * SCALE),
      y: Math.round(zone.y * SCALE),
      name: zone.display_name,
      description: buildDescription(zone),
      isWikitext: true,
      canSearchFor: true,
      searchKeywords: buildSearchKeywords(zone),
    }));
  }

  const map = {
    $schema: "https://soulsremnant.wiki.gg/extensions/DataMaps/schemas/v17.3.json",
    settings: {
      showCoordinates: false,
    },
    crs: {
      order: "xy",
      topLeft: [0, 0],
      bottomRight: [width, height],
    },
    backgrounds: [
      {
        name: "Surface",
        associatedLayer: LAYER_BACKGROUND_ID[0],
        image: "WorldMapSurface.png",
        at: [
          [0, 0],
          [width, height],
        ],
        overlays: [
          {
            image: "WorldMapPath.png",
            at: [
              [0, 0],
              [width, height],
            ],
          },
        ],
      },
      {
        name: "Caves",
        associatedLayer: LAYER_BACKGROUND_ID[1],
        image: "WorldMapCaves.png",
        at: [
          [0, 0],
          [width, height],
        ],
      },
    ],
    groups,
    markers,
  };

  const outPath = path.join(OUT_DIR, "datamap-world-map.json");
  writeFileSync(outPath, JSON.stringify(map, null, 2) + "\n", "utf-8");

  const totalMarkers = Object.values(markers).reduce((n, arr) => n + arr.length, 0);
  console.log(`Wrote DataMaps document for ${totalMarkers} zones across ${Object.keys(groups).length} region groups to ${path.relative(ROOT, outPath)}`);
  console.log(`Requires: WorldMapSurface.png, WorldMapPath.png, WorldMapCaves.png uploaded (from wiki-export/output/assets/, or run wiki-export/make-worldmap-images.py to regenerate).`);
}

main();
