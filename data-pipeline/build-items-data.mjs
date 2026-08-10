// Builds src/data/items.generated.json + data-pipeline/source/item-icon-manifest.json
// from the recovered project's Resources/Items/Database/** and
// Resources/Equipment/Database/** .tres files.
//
// Dev-machine-only (never runs in CI, matches build-site-data.mjs's existing
// separation): requires RECOVERED_PROJECT_ROOT to point at the recovered
// Godot project.
//
// Usage:
//   RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered node data-pipeline/build-items-data.mjs

import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readTres, scalarField, extResourcePath } from "./lib/tres.mjs";
import { resolveIcon } from "./lib/resolve-icon.mjs";
import { loadObservations, observedField } from "./lib/observations.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "src", "data", "items.generated.json");
const MANIFEST_PATH = path.join(__dirname, "source", "item-icon-manifest.json");
const OBSERVATIONS_DIR = path.join(__dirname, "observations", "items");
const PIPELINE_VERSION = "1.1.0";

// Cross-referenced from Scenes/UI/dps_calculator_window.gd's O8FB39N label
// array, corroborated independently by Scenes/UI/equipment_window.gd's
// tooltip strings. Two independent sources agree, but this is still a
// cross-reference rather than a single declared field, so it's tagged
// "inferred" downstream, not "client_structured". Slot 6 and slot 0 have no
// label in either source.
const EQUIPMENT_SLOT_LABEL = {
  1: "Hat",
  2: "Topwear",
  3: "Accessory",
  4: "Aura",
  5: "Weapon",
  7: "Backpack",
  8: "Face Accessory",
  9: "Bottomwear",
  10: "Shoes",
  11: "Cape",
  13: "Accessory 2",
};
const EQUIPMENT_SLOT_SOURCE_NOTE =
  "Cross-referenced from Scenes/UI/dps_calculator_window.gd's slot-label array and corroborated by Scenes/UI/equipment_window.gd's tooltip strings — two independent sources agree, but this is a derived mapping, not a single declared field.";

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

function categoryFromRelPath(relPath) {
  const norm = relPath.replace(/\\/g, "/");
  if (norm.startsWith("weapons/")) return "weapon";
  if (norm.startsWith("gathering_material/")) return "gathering_material";
  if (norm.startsWith("new_crafting_materials/")) return "crafting_material";
  return "general";
}

function unknownField(note) {
  return { value: null, provenance: "server_runtime", note };
}

function formatModifiers(modifiers) {
  if (!Array.isArray(modifiers) || modifiers.length === 0) return null;
  // Prefer each modifier's own captured `description` — that's the literal
  // in-game tooltip line for it, more readable than reconstructing one from
  // modifier_id/value/tier ourselves.
  return modifiers
    .map((m) => (m && m.description) || `${m?.modifier_id ?? "?"}: ${m?.value ?? "?"}`)
    .join("; ");
}

function main() {
  const recoveredRoot = process.env.RECOVERED_PROJECT_ROOT;
  if (!recoveredRoot) {
    console.error("RECOVERED_PROJECT_ROOT env var not set.");
    process.exit(1);
  }

  const itemsDbDir = path.join(recoveredRoot, "Resources", "Items", "Database");
  const equipDbDir = path.join(recoveredRoot, "Resources", "Equipment", "Database");

  const observations = loadObservations(OBSERVATIONS_DIR);

  const itemFiles = walkTres(itemsDbDir);
  console.log(`Found ${itemFiles.length} item .tres files.`);

  /** @type {Map<string, object>} keyed by relative resource path, e.g. "Resources/Items/Database/HealthPotion.tres" */
  const itemsByRelPath = new Map();
  const items = [];
  const iconManifest = [];
  const usedSlugs = new Set();

  for (const filePath of itemFiles) {
    const relFromDb = path.relative(itemsDbDir, filePath).replace(/\\/g, "/");
    const relFromRoot = path.relative(recoveredRoot, filePath).replace(/\\/g, "/");
    const parsed = readTres(filePath);

    const name = scalarField(parsed.resourceBody, "name");
    if (!name) {
      throw new Error(`Item missing name: ${relFromRoot}`);
    }
    const icon = resolveIcon(parsed);
    if (!icon) {
      throw new Error(`Item missing resolvable icon: ${relFromRoot}`);
    }
    const itemId = scalarField(parsed.resourceBody, "item_id");
    if (itemId === null) {
      console.warn(`Warning: item missing item_id: ${relFromRoot} ("${name}") — using filename slug as key.`);
    }
    const description = scalarField(parsed.resourceBody, "description");

    let slug = slugify(path.basename(filePath));
    if (usedSlugs.has(slug)) {
      // Duplicate basename in different subfolders — disambiguate deterministically.
      slug = slugify(relFromDb.replace(/\//g, "-"));
    }
    usedSlugs.add(slug);

    const iconOutFile = `${slug}.png`;
    iconManifest.push({ id: slug, sourcePng: icon.sourcePath, crop: icon.crop, outFile: iconOutFile });

    const record = {
      slug,
      item_id: itemId !== null ? { value: itemId, provenance: "client_structured" } : { value: null, provenance: "unknown", note: "This item's .tres has no item_id field at all." },
      name: { value: name, provenance: "client_structured" },
      description:
        description !== null
          ? { value: description, provenance: "client_structured" }
          : { value: null, provenance: "unknown", note: "No description field present in this item's .tres file." },
      category: { value: categoryFromRelPath(relFromDb), provenance: "client_structured" },
      icon: { value: `assets/icons/items/${iconOutFile}`, provenance: "client_structured" },
      equipment_slot: { value: null, provenance: "unknown" }, // filled in below if this item is equipment-wrapped
      // Notes explaining WHY these are unknown live once in the UI (ItemDetail's
      // stats section, ItemsTable's column header tooltips), not per-record —
      // repeating a ~150-char note on all 1,181 items would needlessly bloat
      // the generated JSON (this alone was ~27% of its total size).
      stats: (() => {
        const obs = itemId !== null ? observations[String(itemId)] : null;
        return {
          rarity: observedField(obs, "rarity", "Item.rarity is server-supplied per instance.") ?? unknownField(),
          required_level: observedField(obs, "required_level", "Item.required_level is server-supplied per instance.") ?? unknownField(),
          modifiers: obs
            ? observedField({ ...obs, modifiers: formatModifiers(obs.modifiers) }, "modifiers", "ItemModifier data is server-supplied per instance.") ?? unknownField()
            : unknownField(),
        };
      })(),
      source: { resource_path: relFromRoot, texture_path: icon.sourcePath },
    };

    itemsByRelPath.set(relFromRoot, record);
    items.push(record);
  }

  // Equipment overlay: resolve each wrapper's item_data reference and merge equipment_slot onto the matching item.
  const equipFiles = walkTres(equipDbDir);
  console.log(`Found ${equipFiles.length} equipment .tres files.`);
  let mergedCount = 0;
  for (const filePath of equipFiles) {
    const relFromRoot = path.relative(recoveredRoot, filePath).replace(/\\/g, "/");
    const parsed = readTres(filePath);
    const itemDataField = scalarField(parsed.resourceBody, "item_data");
    const targetRelPath = extResourcePath(parsed, itemDataField);
    if (!targetRelPath) {
      console.warn(`Warning: equipment file has no resolvable item_data reference: ${relFromRoot}`);
      continue;
    }
    const item = itemsByRelPath.get(targetRelPath);
    if (!item) {
      console.warn(`Warning: equipment file's item_data target not found in item catalog: ${relFromRoot} -> ${targetRelPath}`);
      continue;
    }
    const slotType = scalarField(parsed.resourceBody, "equipment_type");
    const label = slotType != null ? EQUIPMENT_SLOT_LABEL[slotType] ?? null : null;
    item.equipment_slot = {
      value: { type: slotType, label },
      provenance: "inferred",
      note: EQUIPMENT_SLOT_SOURCE_NOTE,
    };
    mergedCount++;
  }
  console.log(`Merged equipment_slot onto ${mergedCount}/${equipFiles.length} items.`);

  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(iconManifest, null, 2) + "\n", "utf-8");

  const categoryCounts = {};
  for (const it of items) categoryCounts[it.category.value] = (categoryCounts[it.category.value] || 0) + 1;

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      pipeline_version: PIPELINE_VERSION,
      total_items: items.length,
      total_equipment_merged: mergedCount,
      category_counts: categoryCounts,
    },
    items,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${items.length} items to ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`Wrote icon manifest (${iconManifest.length} entries) to ${path.relative(ROOT, MANIFEST_PATH)}`);
  console.log("Category counts:", categoryCounts);
  const observedCount = Object.keys(observations).length;
  if (observedCount > 0) {
    console.log(`Applied live-captured observations for ${observedCount} item(s) from data-pipeline/observations/items/.`);
  } else {
    console.log("No files in data-pipeline/observations/items/ yet — all item stats remain Unknown.");
  }
}

main();
