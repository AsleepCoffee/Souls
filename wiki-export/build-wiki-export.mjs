// Generates wiki.gg-ready MediaWiki wikitext from src/data/skills.generated.json.
// Output is plain wikitext + a manifest of what to upload — no extensions,
// no admin access, no JS required on the wiki's side. See wiki-export/README.md.
//
// Usage: node wiki-export/build-wiki-export.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "src/data/skills.generated.json");
const OUT_DIR = path.join(__dirname, "output");

const CLASSIFICATION_LABEL = {
  active: "Active",
  passive_stance: "Passive Stance",
  proficiency: "Proficiency (passive)",
  buff_toggle: "Buff / Toggle",
  basic_attack: "Basic Attack",
};

const TREE_IMAGE_FILE = "CombatSkillTree.png";
const NODE_RADIUS = 16;

function esc(s) {
  // Neutralize the handful of characters that matter to wikitext table/link
  // syntax. Verified against the current dataset (no |, [[, ]] present in
  // any description) but kept defensive for future data.
  return String(s).replace(/\|/g, "&#124;").replace(/\[\[/g, "&#91;&#91;").replace(/\]\]/g, "&#93;&#93;");
}

function iconWikiFilename(skill, iconMap) {
  const iconPath = skill.icon.value;
  if (!iconPath) return null;
  return iconMap.get(iconPath);
}

function iconCell(skill, iconMap, size = 24) {
  const fname = iconWikiFilename(skill, iconMap);
  return fname ? `[[File:${fname}|${size}px]]` : "(no icon)";
}

function computeAps(skill) {
  const attackCount = skill.stats.attack_count.value ?? 1;
  const basisMs = skill.stats.cooldown_ms.value ?? skill.stats.duration_ms.value;
  if (basisMs === null || basisMs <= 0) return null;
  return attackCount / (basisMs / 1000);
}

function numericCell(field, { unit = "", unknownSortValue = "-1" } = {}) {
  if (field.value === null || field.value === undefined) {
    return `| data-sort-value="${unknownSortValue}" | Unknown (server-only)\n`;
  }
  return `| data-sort-value="${field.value}" | ${field.value}${unit}\n`;
}

function buildIconManifest(skills) {
  // Multiple skills can share one source texture (e.g. Arrow Rain / Arrow
  // Storm); only emit one upload entry per unique file, keyed off the first
  // skill that uses it, and note the rest as "reuses" in the manifest.
  const iconMap = new Map(); // texture_path -> wiki filename
  const rows = [["skill_id", "skill_name", "local_icon_path", "suggested_wiki_filename", "notes"]];
  for (const s of skills) {
    const iconPath = s.icon.value;
    if (!iconPath) {
      rows.push([s.skill_id, s.name.value, "(missing)", "(missing)", "no icon in recovered client"]);
      continue;
    }
    const localPath = `public/${iconPath}`;
    if (!iconMap.has(iconPath)) {
      const wikiName = `${s.name.value.replace(/[^\w\s-]/g, "")} icon.png`;
      iconMap.set(iconPath, wikiName);
      rows.push([s.skill_id, s.name.value, localPath, wikiName, ""]);
    } else {
      rows.push([s.skill_id, s.name.value, localPath, iconMap.get(iconPath), `reuses same file as another skill — upload once`]);
    }
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  return { iconMap, csv };
}

function buildImagemap(skills, meta) {
  const lines = [];
  lines.push("<imagemap>");
  lines.push(`File:${TREE_IMAGE_FILE}|600px|Soul's Remnant combat skill tree (build ${meta.build_id})`);
  for (const s of skills) {
    const { x, y } = s.position.value;
    const label = `${esc(s.name.value)} (${s.branch.value}) — ${CLASSIFICATION_LABEL[s.classification.value]}`;
    lines.push(`circle ${Math.round(x)} ${Math.round(y)} ${NODE_RADIUS} [[#${esc(s.name.value)}|${label}]]`);
  }
  lines.push("desc none");
  lines.push("</imagemap>");
  return lines.join("\n");
}

function buildSkillsTable(skills, iconMap) {
  const lines = [];
  lines.push('{| class="wikitable sortable" style="font-size:90%;"');
  lines.push("|+ All combat skills (Melee, Range, Magic, Faith)");
  lines.push("! class=\"unsortable\" | Icon");
  lines.push("! Name !! ID !! Branch !! Type !! Damage types !! Base power !! Power/Lv !! Cooldown !! Duration !! Attacks/sec !! Max Lv !! Description");
  for (const s of skills) {
    lines.push("|-");
    lines.push(`| ${iconCell(s, iconMap)}`);
    lines.push(`| [[#${esc(s.name.value)}|${esc(s.name.value)}]]`);
    lines.push(`| ${s.skill_id}`);
    lines.push(`| ${s.branch.value}`);
    lines.push(`| ${CLASSIFICATION_LABEL[s.classification.value]}`);
    lines.push(`| ${s.damage_types.value.join(", ") || "—"}`);
    lines.push(numericCell(s.stats.base_power).trimEnd());
    lines.push(numericCell(s.stats.power_per_level).trimEnd());
    lines.push(numericCell(s.stats.cooldown_ms, { unit: "ms" }).trimEnd());
    lines.push(numericCell(s.stats.duration_ms, { unit: "ms" }).trimEnd());
    const aps = computeAps(s);
    lines.push(aps !== null ? `| data-sort-value="${aps}" | ${aps.toFixed(2)}` : `| data-sort-value="-1" | Unknown (server-only)`);
    lines.push(numericCell(s.stats.max_level).trimEnd() + " *");
    lines.push(`| ${esc(s.description.value)}`);
  }
  lines.push("|}");
  lines.push("");
  lines.push(
    "<nowiki>*</nowiki> Max level shown is the client-side class default (20); the server may override it per skill and this is not independently verified. " +
      "Base power, power/level, cooldown, duration, and attacks/sec are assigned by the game server at runtime and are not present in the recovered client — see the notice at the top of this page."
  );
  return lines.join("\n");
}

function buildBuffsTable(skills, iconMap) {
  const buffs = skills.filter((s) => s.buff_details !== null);
  const lines = [];
  lines.push('{| class="wikitable sortable" style="font-size:90%;"');
  lines.push("|+ Buffs, toggles, and passive stances");
  lines.push('! class="unsortable" | Icon');
  lines.push("! Name !! ID !! Branch !! Affected stats !! Base bonus !! Per level !! Duration !! Cooldown !! MP/HP cost !! Party sharing !! Stacking !! Restrictions");
  for (const s of buffs) {
    const bd = s.buff_details;
    const primary = s.parsed_effects[0];
    lines.push("|-");
    lines.push(`| ${iconCell(s, iconMap)}`);
    lines.push(`| [[#${esc(s.name.value)}|${esc(s.name.value)}]]`);
    lines.push(`| ${s.skill_id}`);
    lines.push(`| ${s.branch.value}`);
    lines.push(`| ${bd.affected_stats.value.join(", ") || "Unclear from text"}`);
    lines.push(primary ? `| data-sort-value="${primary.base_value}" | ${esc(primary.raw)}` : `| data-sort-value="-1" | —`);
    lines.push(
      primary && primary.per_level != null
        ? `| data-sort-value="${primary.per_level}" | ${primary.per_level > 0 ? "+" : ""}${primary.per_level}${primary.is_percent ? "%" : ""}/lv`
        : `| data-sort-value="-1" | —`
    );
    lines.push(
      bd.duration_hints.length > 0
        ? `| ${esc(bd.duration_hints[0].raw)}`
        : `| data-sort-value="-1" | Unknown (server) / not stated`
    );
    lines.push(`| data-sort-value="-1" | Unknown (server-only)`);
    lines.push(
      bd.regen_penalty
        ? `| −${bd.regen_penalty.base_value} (+${bd.regen_penalty.per_level}/lv) ${bd.regen_penalty.resource} regen/tick`
        : `| None stated`
    );
    lines.push(`| ${bd.party_sharing.shares_with_party ? "Shares with party" : "Solo only"}`);
    lines.push(`| ${bd.stacking_behavior.value === "multiplicative" ? "Multiplicative" : "Unspecified"}`);
    lines.push(`| ${bd.restrictions.snippets.length > 0 ? esc(bd.restrictions.snippets.join(" ")) : "None found"}`);
  }
  lines.push("|}");
  lines.push("");
  lines.push(
    "All values above are mined from each skill's in-game description text (the only place per-level buff numbers exist in the recovered client) — see each skill's detail section below for the full source sentence."
  );
  return lines.join("\n");
}

function buildScalingTable(skills) {
  const lines = [];
  lines.push('{| class="wikitable sortable" style="font-size:90%;"');
  lines.push("|+ Known scaling values, mined from description text (not a complete damage model)");
  lines.push("! Skill !! Branch !! Kind !! Base !! Per level !! In context");
  for (const s of skills) {
    for (const eff of s.parsed_effects) {
      lines.push("|-");
      lines.push(`| [[#${esc(s.name.value)}|${esc(s.name.value)}]]`);
      lines.push(`| ${s.branch.value}`);
      lines.push(`| ${eff.kind === "level_scaling" ? "Level scaling" : "Multiplier"}`);
      lines.push(`| data-sort-value="${eff.base_value}" | ${eff.base_value}${eff.is_percent ? "%" : ""}`);
      lines.push(
        eff.per_level != null
          ? `| data-sort-value="${eff.per_level}" | ${eff.per_level > 0 ? "+" : ""}${eff.per_level}${eff.is_percent ? "%" : ""}`
          : `| data-sort-value="0" | —`
      );
      lines.push(`| ${esc(eff.context)}`);
    }
  }
  lines.push("|}");
  return lines.join("\n");
}

function buildSkillDetailSections(skills, iconMap) {
  const lines = [];
  for (const s of skills) {
    lines.push(`=== ${esc(s.name.value)} ===`);
    lines.push(`${iconCell(s, iconMap, 32)} '''${esc(s.name.value)}''' (ID <code>${s.skill_id}</code>)`);
    lines.push("");
    lines.push(`* '''Branch:''' ${s.branch.value}`);
    lines.push(`* '''Type:''' ${CLASSIFICATION_LABEL[s.classification.value]}`);
    lines.push(`* '''Damage types:''' ${s.damage_types.value.join(", ") || "None (utility/support)"}`);
    lines.push(`* '''Status:''' ${s.passive.value ? "Passive" : "Active-use"}`);
    lines.push("");
    lines.push(esc(s.description.value));
    lines.push("");
    if (s.parsed_effects.length > 0) {
      lines.push("'''Known scaling (from description text):'''");
      for (const eff of s.parsed_effects) {
        lines.push(`* <code>${esc(eff.raw)}</code>`);
      }
      lines.push("");
    }
    lines.push(
      `'''Unlock requirement:''' ${esc(s.unlock_requirement.raw)} <small>(assigned by the game server at runtime; not stored in the recovered client)</small>`
    );
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const skills = [...raw.skills].sort((a, b) => a.name.value.localeCompare(b.name.value));
  mkdirSync(OUT_DIR, { recursive: true });

  const { iconMap, csv } = buildIconManifest(skills);
  writeFileSync(path.join(OUT_DIR, "icon-upload-manifest.csv"), csv, "utf-8");

  const imagemap = buildImagemap(skills, raw.meta);
  const skillsTable = buildSkillsTable(skills, iconMap);
  const buffsTable = buildBuffsTable(skills, iconMap);
  const scalingTable = buildScalingTable(skills);
  const detailSections = buildSkillDetailSections(skills, iconMap);

  writeFileSync(path.join(OUT_DIR, "tree-imagemap.wikitext"), imagemap + "\n", "utf-8");
  writeFileSync(path.join(OUT_DIR, "skills-table.wikitext"), skillsTable + "\n", "utf-8");
  writeFileSync(path.join(OUT_DIR, "buffs-table.wikitext"), buffsTable + "\n", "utf-8");
  writeFileSync(path.join(OUT_DIR, "scaling-values-table.wikitext"), scalingTable + "\n", "utf-8");
  writeFileSync(path.join(OUT_DIR, "skill-detail-sections.wikitext"), detailSections + "\n", "utf-8");

  const noticeBlock = [
    `''Data recovered from Soul's Remnant's local game client, Steam playtest build '''${raw.meta.build_id}'''. Unofficial, fan-compiled reference — not official developer documentation.''`,
    "",
    `'''A note on missing values:''' base power, power/level, cooldown, duration, attacks/sec, full per-stat scaling tables, and exact unlock requirements are assigned by the game's server at runtime and do not exist anywhere in the recovered client files. Cells and fields below marked "Unknown (server-only)" are not a research gap — the data genuinely isn't present client-side. Numbers written directly into a skill's description text (e.g. "13.11(+5.24/lv)% of max HP") are shown as-is since those are real, verified values, just sourced from prose rather than a structured field.`,
    "",
  ].join("\n");

  const fullPage = [
    "== Combat Skill Tree ==",
    noticeBlock,
    imagemap,
    "",
    "== Skills Table ==",
    skillsTable,
    "",
    "== Buffs & Toggles ==",
    buffsTable,
    "",
    "== Known Scaling Values ==",
    scalingTable,
    "",
    "== Skill Details ==",
    detailSections,
  ].join("\n");

  writeFileSync(path.join(OUT_DIR, "combat-skills-page.wikitext"), fullPage + "\n", "utf-8");

  console.log(`Wrote wikitext for ${skills.length} skills to ${path.relative(ROOT, OUT_DIR)}/`);
  console.log(`Unique icons to upload: ${iconMap.size}`);
}

main();
