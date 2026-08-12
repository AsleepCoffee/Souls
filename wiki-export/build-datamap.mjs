// Generates a wiki.gg DataMaps map document (JSON) for the combat skill
// tree, using the exact same skill positions/icons/text as the live site's
// interactive tree and the plain-wikitext <imagemap> in build-wiki-export.mjs.
// Requires the DataMaps extension to be enabled on the target wiki (it's an
// on-request extension — see wiki-export/README.md).
//
// This was built from wiki.gg's public DataMaps documentation and real
// example map pages on other wiki.gg wikis, not verified against a live
// Soul's Remnant wiki page — paste the output into a new `Map:` page's
// source editor and fix any field-name mismatch it flags for the DataMaps
// version actually enabled on your wiki (the editor validates on save).
//
// Usage: node wiki-export/build-datamap.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildIconManifest } from "./lib/icon-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "src/data/skills.generated.json");
const OUT_DIR = path.join(__dirname, "output");

// Matches wiki-export/make-tree-image.py's output and the site's own
// public/assets/tree/skill_tree_combat_bare.png dimensions.
const TREE_IMAGE_FILE = "CombatSkillTree.png";
const TREE_WIDTH = 576;
const TREE_HEIGHT = 546;
const ICON_SIZE = 40; // on-map glyph size, confirmed correct — don't touch without re-verifying position offset
// ICON_SIZE/2 accounted for the bottom-right anchor; this extra bit is a
// further empirical fudge dialed in against the live map render.
const ANCHOR_FUDGE = 10;
const MARKER_OFFSET = ICON_SIZE / 2 + ANCHOR_FUDGE;

const CLASSIFICATION_LABEL = {
  active: "Active",
  passive_stance: "Passive Stance",
  proficiency: "Proficiency (passive)",
  buff_toggle: "Buff / Toggle",
  basic_attack: "Basic Attack",
};

// Matches this wiki's own established palette (used on its existing skill
// articles and buff tables), not the live site's slightly different one.
const BRANCH_COLOR_WIKI = {
  Melee: "#e28080",
  Range: "#cecd80",
  Magic: "#80d9e2",
  Faith: "#9592FF",
};

const STAT_KEY_COLOR = {
  melee_damage: "#e28080",
  range_damage: "#cecd80",
  magic_damage: "#80d9e2",
  faith_damage: "#9592FF",
  max_hp: "#61D679",
  max_mp: "#63a5e0",
};

const UNLOCK_COLOR = "#ffd166";
const STAT_LABEL_COLOR = "#4fd1c5";

function colorizeScaling(text) {
  return text
    .split("; ")
    .map((part) => {
      const [key, ...rest] = part.split(":");
      const color = STAT_KEY_COLOR[key.trim()];
      return color ? `<span style="color:${color}">${esc(key)}</span>:${rest.join(":")}` : esc(part);
    })
    .join("; ");
}

function esc(s) {
  return String(s).replace(/\|/g, "&#124;").replace(/\[\[/g, "&#91;&#91;").replace(/\]\]/g, "&#93;&#93;");
}

function slugId(skill) {
  return `skill-${skill.skill_id}`;
}

function branchGroupId(branch) {
  return branch.toLowerCase();
}

// Each branch has an eponymous skill (Melee/Range/Magic/Faith, the branch
// "proficiency" passive) — reuse its own icon as that branch's group icon,
// so markers render as actual skill icons instead of plain colored dots.
function buildGroups(branches, skills, iconMap) {
  const groups = {};
  for (const b of branches) {
    const branchSkill = skills.find((s) => s.name.value === b);
    const iconFile = branchSkill?.icon.value ? iconMap.get(branchSkill.icon.value) : null;
    groups[branchGroupId(b)] = {
      name: b,
      icon: iconFile ?? `${b}.png`,
      size: ICON_SIZE,
      // Without this, icon size scales with zoom (map units, not screen
      // pixels) — at the default fit-to-container zoom the tree is well
      // under 1x scale, so icons render much smaller than "size" implies.
      static: true,
      isSwitchable: true,
    };
  }
  return groups;
}

function statCell(field, unit = "") {
  if (field.value === null || field.value === undefined) return "Unknown (server-only)";
  return `${field.value}${unit}`;
}

function statLabel(text) {
  return `<span style="color:${STAT_LABEL_COLOR}">'''${text}:'''</span>`;
}

function buildDescription(s, iconFile) {
  const branchColor = BRANCH_COLOR_WIKI[s.branch.value] ?? "#ffffff";
  const lines = [];
  if (iconFile) {
    lines.push(`[[File:${iconFile}|30x30px|left|link=]]`);
  }
  lines.push(
    `<span style="color:${branchColor}">'''${esc(s.branch.value)}'''</span> &bull; ${
      CLASSIFICATION_LABEL[s.classification.value]
    } &bull; ${s.damage_types.value.join(", ") || "No damage type (utility/support)"}`
  );
  const unlockText = s.unlock_requirement.value
    ? esc(s.unlock_requirement.value).replace(/\s*\(Skill #\d+\)/, "")
    : esc(s.unlock_requirement.raw);
  lines.push(`<span style="color:${UNLOCK_COLOR}">'''Unlock:'''</span> ${unlockText}`);
  lines.push('<div style="clear:both"></div>');
  lines.push("----");
  lines.push(esc(s.description.value));
  if (s.parsed_effects.length > 0) {
    lines.push("");
    lines.push("'''Known scaling (from description text):'''");
    for (const eff of s.parsed_effects) {
      lines.push(`* <code>${esc(eff.raw)}</code>`);
    }
  }
  lines.push("----");
  const stats = s.stats;
  const power =
    stats.base_power.value !== null
      ? `${stats.base_power.value}${stats.power_per_level.value ? ` (+${stats.power_per_level.value}/lv)` : ""}`
      : "Unknown (server-only)";
  lines.push(`* ${statLabel("Base power")} ${power}`);
  lines.push(`* ${statLabel("Cooldown")} ${statCell(stats.cooldown_ms, "ms")}`);
  lines.push(`* ${statLabel("Duration")} ${statCell(stats.duration_ms, "ms")}`);
  lines.push(`* ${statLabel("Attacks/sec")} ${statCell(stats.attack_per_second)}`);
  if (stats.scaling_attributes.value) {
    lines.push(`* ${statLabel("Scaling")} ${colorizeScaling(stats.scaling_attributes.value)}`);
  }
  return lines.join("\n");
}

function buildMarkers(skills, iconMap) {
  const markers = {};
  for (const b of ["Melee", "Range", "Magic", "Faith"]) {
    markers[branchGroupId(b)] = [];
  }
  for (const s of skills) {
    const group = branchGroupId(s.branch.value);
    if (!markers[group]) markers[group] = [];
    const iconFile = s.icon.value ? iconMap.get(s.icon.value) : null;
    // Confirmed empirically: this wiki's DataMaps renders icon markers
    // anchored at their own bottom-right corner rather than centered on the
    // given coordinate, landing every icon ICON_SIZE/2 px up-left of the
    // intended point. Compensate by shifting the source coordinate the same
    // amount down-right so the rendered icon centers correctly.
    const marker = {
      id: slugId(s),
      x: Math.round(s.position.value.x) + MARKER_OFFSET,
      y: Math.round(s.position.value.y) + MARKER_OFFSET,
      name: esc(s.name.value),
      description: buildDescription(s, iconFile),
      isWikitext: true,
      canSearchFor: true,
      searchKeywords: [s.name.value, s.branch.value, CLASSIFICATION_LABEL[s.classification.value]].join(" "),
    };
    if (iconFile) marker.icon = iconFile; // on-map glyph only; popup icon is embedded in description now
    markers[group].push(marker);
  }
  return markers;
}

function main() {
  const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const skills = [...raw.skills].sort((a, b) => a.name.value.localeCompare(b.name.value));
  mkdirSync(OUT_DIR, { recursive: true });

  const { iconMap } = buildIconManifest(skills);
  const branches = ["Melee", "Range", "Magic", "Faith"];

  const map = {
    $schema: "https://soulsremnant.wiki.gg/extensions/DataMaps/schemas/v17.3.json",
    settings: {
      showCoordinates: false,
    },
    // Explicit object form with order:"xy" — the bare [[x,y],[x,y]] array form
    // is ambiguous about axis order, and the schema's default order is "yx",
    // which would stretch/skew positions since the tree isn't square (576x546).
    crs: {
      order: "xy",
      topLeft: [0, 0],
      bottomRight: [TREE_WIDTH, TREE_HEIGHT],
    },
    // Explicit object form with "at" bounds matching crs exactly — the plain
    // filename shorthand leaves how the image is fit/positioned within the
    // coordinate space unstated, which is a plausible source of a uniform
    // placement offset.
    background: {
      image: TREE_IMAGE_FILE,
      at: [
        [0, 0],
        [TREE_WIDTH, TREE_HEIGHT],
      ],
    },
    groups: buildGroups(branches, skills, iconMap),
    markers: buildMarkers(skills, iconMap),
  };

  const outPath = path.join(OUT_DIR, "datamap-combat-skills.json");
  writeFileSync(outPath, JSON.stringify(map, null, 2) + "\n", "utf-8");

  const totalMarkers = Object.values(map.markers).reduce((n, arr) => n + arr.length, 0);
  console.log(`Wrote DataMaps document for ${totalMarkers} skills to ${path.relative(ROOT, outPath)}`);
  console.log(`Paste this into the source editor of a new "Map:" page (e.g. Map:Combat Skill Tree) on the wiki.`);
  console.log(`Requires: DataMaps extension enabled, ${TREE_IMAGE_FILE} uploaded (new file, needed for marker-position alignment even if another tree image already exists on the wiki). Skill icons referenced here should already exist on the wiki under their skill name (see icon-filename-reference.csv) — check any row flagged UNVERIFIED before saving.`);
}

main();
