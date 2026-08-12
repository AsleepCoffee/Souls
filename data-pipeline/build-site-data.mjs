// Transforms the recovered/parsed skill-tree export into the site's
// versioned data file. See data-pipeline/README.md for full provenance
// notes. Re-run with: node data-pipeline/build-site-data.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadObservations } from "./lib/observations.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PIPELINE_VERSION = "1.1.0";
const SOURCE_PATH = path.join(__dirname, "source", "souls-remnant-skill-tree.json");
const ICON_MAP_PATH = path.join(__dirname, "icon_mapping.json");
const OBSERVATIONS_DIR = path.join(__dirname, "observations", "skills");
const OUT_PATH = path.join(ROOT, "src", "data", "skills.generated.json");

const COMBAT_BRANCHES = ["Melee", "Range", "Magic", "Faith"];
const TREE_WIDTH = 576;
const TREE_HEIGHT = 546;

const REQUIREMENTS_PLACEHOLDER =
  "Provided by the game server at runtime; not stored in the PCK";

function observedStat(obs, key, note) {
  if (obs == null || obs[key] === undefined || obs[key] === null) return null;
  return {
    value: obs[key],
    provenance: "observed_live",
    note: `${note} Captured from the running client in ${obs._source_file}${
      obs.recorded_at_unix ? ` on ${new Date(obs.recorded_at_unix * 1000).toISOString().slice(0, 10)}` : ""
    }${obs.recorded_level ? ` at skill level ${obs.recorded_level}` : ""}.`,
  };
}

function formatLevelRequirements(reqs) {
  if (!Array.isArray(reqs) || reqs.length === 0) return null;
  return reqs
    .map((r) => {
      if (!r) return "";
      if (r.skill_id === -2) return `Character level ${r.level}`;
      return r.skill_name ? `${r.skill_name} (Skill #${r.skill_id}) at level ${r.level}` : `Skill #${r.skill_id} at level ${r.level}`;
    })
    .join(", ");
}

function formatScaling(scaling) {
  if (!Array.isArray(scaling) || scaling.length === 0) return null;
  return scaling
    .filter((s) => s && s.id)
    .map((s) => `${s.id}: ${s.amount ?? 0}${s.per_level ? ` (+${s.per_level}/lv)` : ""}`)
    .join("; ");
}

/**
 * Pull "NUMBER(+NUMBER/lv)%?" / "NUMBER(-NUMBER/lv)%?" and bare "xNUMBER"
 * scaling call-outs out of a description string. Best-effort text mining,
 * not a structured field — always tagged client_description downstream.
 */
function extractParsedEffects(description) {
  const effects = [];

  const scalingRe =
    /(-?\d+(?:\.\d+)?)\s*\(\s*([+-]\d+(?:\.\d+)?)\s*%?\s*\/\s*lv\s*\)\s*(%)?/gi;
  let m;
  while ((m = scalingRe.exec(description)) !== null) {
    const base = Number(m[1]);
    const perLevel = Number(m[2]);
    const isPercent = Boolean(m[3]);
    const start = Math.max(0, m.index - 40);
    const end = Math.min(description.length, m.index + m[0].length + 20);
    effects.push({
      kind: "level_scaling",
      raw: m[0],
      base_value: base,
      per_level: perLevel,
      is_percent: isPercent,
      context: description.slice(start, end).trim(),
      provenance: "client_description",
    });
  }

  const multRe = /x(\d+(?:\.\d+)?)(\s*\(\s*[+-]\d+(?:\.\d+)?\s*%?\s*\/\s*lv\s*\))?/gi;
  while ((m = multRe.exec(description)) !== null) {
    const start = Math.max(0, m.index - 40);
    const end = Math.min(description.length, m.index + m[0].length + 20);
    effects.push({
      kind: "multiplier",
      raw: m[0].trim(),
      base_value: Number(m[1]),
      per_level: null,
      is_percent: false,
      context: description.slice(start, end).trim(),
      provenance: "client_description",
    });
  }

  return effects;
}

const STAT_KEYWORDS = [
  "STR", "DEX", "INT", "SPR", "CON", "LUK",
  "Max HP", "Max MP", "HP regen", "MP regen",
  "Shield", "Defense", "Speed", "Jump",
  "Crit Rate", "Crit Damage", "Dodge Chance", "Accuracy", "Damage Balance",
  "Elemental Effect Chance", "Elemental Effect Potency",
  "Melee damage", "Range damage", "Magic damage", "Faith damage", "global damage",
  "EXP", "Skill EXP",
];

function extractAffectedStats(description) {
  const found = [];
  for (const kw of STAT_KEYWORDS) {
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(description)) found.push(kw);
  }
  return found;
}

function extractRegenPenalty(description) {
  const re = /Lowers your (MP|HP) regen by (-?\d+(?:\.\d+)?)\s*\(\s*([+-]\d+(?:\.\d+)?)\s*\/\s*lv\s*\)\s*per tick/i;
  const m = re.exec(description);
  if (!m) return null;
  return {
    resource: m[1].toUpperCase(),
    base_value: Number(m[2]),
    per_level: Number(m[3]),
    unit: "per tick while active",
    provenance: "client_description",
    raw: m[0],
  };
}

function splitSentences(description) {
  // Split on ". " followed by a capital letter, so decimals like "21.25%" don't
  // get treated as sentence boundaries.
  return description.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim());
}

function extractPartySharing(description) {
  const sentences = splitSentences(description).filter((s) => /party member/i.test(s));
  return {
    shares_with_party: sentences.length > 0,
    snippets: sentences,
    provenance: "client_description",
  };
}

function extractMultiplicative(description) {
  const isMultiplicative = /multipli(es|cative|ed)? with your other buff bonuses/i.test(description);
  return {
    value: isMultiplicative ? "multiplicative" : "unspecified",
    provenance: isMultiplicative ? "client_description" : "unknown",
    note: isMultiplicative
      ? "Description explicitly states this bonus multiplies with other buff bonuses."
      : "Description does not state whether this stacks additively or multiplicatively with other bonuses.",
  };
}

function extractDurationHints(description) {
  const re = /(-?\d+(?:\.\d+)?)\s*\(\s*([+-]\d+(?:\.\d+)?)\s*\/\s*lv\s*\)\s*seconds|(\b\d+(?:\.\d+)?)\s*seconds/gi;
  const hints = [];
  let m;
  while ((m = re.exec(description)) !== null) {
    const start = Math.max(0, m.index - 45);
    hints.push({
      raw: m[0],
      context: description.slice(start, m.index + m[0].length).trim(),
      provenance: "client_description",
    });
  }
  return hints;
}

const RESTRICTION_KEYWORDS = /\bcannot\b|\bcan only\b|\bonly works\b|\bonly holds\b|\bcan no longer\b|\brequires\b|\bcan't\b/i;

function extractRestrictions(description) {
  const sentences = splitSentences(description).filter((s) => RESTRICTION_KEYWORDS.test(s));
  return { snippets: sentences, provenance: "client_description" };
}

function classify(skill) {
  const desc = skill.description || "";
  const descLower = desc.toLowerCase();
  const tags = {
    charged: /\bcharge\b|\btap for\b|\bfull draw\b|\bfull charge\b/i.test(desc),
    hold_or_repeat: /\bhold the button\b|\bhold a jet\b|\brepeat/i.test(desc),
    hybrid_damage: (skill.types || "").split(",").map((t) => t.trim()).filter(Boolean).length > 1,
  };

  if (skill.passive) {
    return { classification: "proficiency", classification_provenance: "client_structured", tags };
  }
  if (descLower.startsWith("toggle.")) {
    return { classification: "buff_toggle", classification_provenance: "inferred", tags };
  }
  if (descLower.includes("passive stance")) {
    return { classification: "passive_stance", classification_provenance: "inferred", tags };
  }
  if (descLower.includes("basic attack")) {
    return { classification: "basic_attack", classification_provenance: "inferred", tags };
  }
  return { classification: "active", classification_provenance: "inferred", tags };
}

function unknownStat(note) {
  return { value: null, provenance: "server_runtime", note };
}

function buildSkillRecord(skill, iconMap, observations) {
  const obs = observations[String(skill.skill_id)] ?? null;
  const damage_types = (skill.types || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const { classification, classification_provenance, tags } = classify(skill);
  const parsed_effects = extractParsedEffects(skill.description || "");
  const iconFile = iconMap[String(skill.skill_id)];

  const isBuffLike = classification === "buff_toggle" || classification === "passive_stance";
  const buff_details = isBuffLike
    ? {
        affected_stats: { value: extractAffectedStats(skill.description || ""), provenance: "client_description" },
        regen_penalty: extractRegenPenalty(skill.description || ""),
        party_sharing: extractPartySharing(skill.description || ""),
        stacking_behavior: extractMultiplicative(skill.description || ""),
        duration_hints: extractDurationHints(skill.description || ""),
        restrictions: extractRestrictions(skill.description || ""),
      }
    : null;

  return {
    skill_id: skill.skill_id,
    name: { value: skill.name, provenance: "client_structured" },
    node_name: skill.node_name,
    branch: { value: skill.branch, provenance: "client_structured" },
    tree: skill.tree,
    damage_types: { value: damage_types, provenance: "client_structured" },
    position: {
      // The pre-parsed export's x/y are correct relative to each other (verified by tracing
      // every node's actual anchor/offset chain in skill_window.tscn from scratch — zero
      // structural error, node-for-node) but sit in SkillTreeContainer's own local space, which
      // is offset from the 576x546 background art's pixel space. SkillTreeBackground is declared
      // as a 576x546 box centered on that same container anchor point (offset_left=-288,
      // offset_top=-273, offset_right=288, offset_bottom=273), so converting into the
      // background's own coordinates needs +288/+273 — but the export's x/y only reflects an
      // effective +258/+243, a real, constant (30, 30) shortfall. Corrected here so every
      // consumer (site, wiki export) gets a value that's actually in the background's pixel
      // space, rather than re-deriving/reapplying this per consumer.
      value: { x: skill.x + 30, y: skill.y + 30 },
      provenance: "client_structured",
      note: "Instance position from the recovered skill_window.tscn / parsed export, in the 576x546 tree background's coordinate space (background-alignment correction of +30/+30 applied — see build-site-data.mjs).",
    },
    icon: iconFile
      ? { value: `assets/icons/${iconFile}`, provenance: "client_structured" }
      : { value: null, provenance: "unknown" },
    passive: { value: Boolean(skill.passive), provenance: "client_structured" },
    hidden_in_client_data: { value: Boolean(skill.hidden_in_client_data), provenance: "client_structured" },
    classification: { value: classification, provenance: classification_provenance },
    tags,
    description: { value: skill.description, provenance: "client_structured" },
    parsed_effects,
    stats: {
      base_power:
        observedStat(obs, "base_power", "Skill.base_power is server-supplied at runtime; not present in any recovered .tres/.tscn/.gd file.") ??
        unknownStat("Skill.base_power is populated by the server at runtime; not present in any recovered .tres/.tscn/.gd file."),
      power_per_level:
        observedStat(obs, "power_per_level", "Skill.power_per_level is server-supplied at runtime.") ??
        unknownStat("Skill.power_per_level is server-supplied at runtime."),
      cooldown_ms:
        observedStat(obs, "cooldown_ms", "Skill.cooldown is server-supplied at runtime.") ??
        unknownStat("Skill.cooldown is server-supplied at runtime."),
      duration_ms:
        observedStat(
          obs,
          "duration_ms",
          `Skill.duration is server-supplied at runtime.${
            obs?.duration_per_level_ms ? ` Increases by ${obs.duration_per_level_ms}ms per level.` : ""
          }`
        ) ?? unknownStat("Skill.duration is server-supplied at runtime."),
      attack_per_second:
        observedStat(obs, "attack_per_second", "Skill.attack_per_second is server-supplied at runtime.") ??
        unknownStat("Skill.attack_per_second is server-supplied at runtime."),
      attack_count:
        observedStat(obs, "attack_count", "Skill.attack_count is server-supplied at runtime.") ??
        unknownStat("Skill.attack_count is server-supplied at runtime (client default is 1, but true value is per-skill and server-assigned)."),
      max_level: observedStat(obs, "max_level", "Skill.max_level is server-supplied at runtime.") ?? {
        value: 20,
        provenance: "inferred",
        note: "Skill.gd declares `var max_level: int = 20` as a class-level default. The server may override this per skill; the recovered client never assigns a per-skill value, so this is a fallback, not a verified per-skill max.",
      },
      scaling_attributes: (() => {
        const formatted = obs ? formatScaling(obs.scaling) : null;
        if (formatted) {
          return observedStat({ ...obs, scaling: formatted }, "scaling", "Skill.PztI65W (per-stat damage scaling table) is server-supplied at runtime.");
        }
        return {
          value: null,
          provenance: "unknown",
          note: "Skill.PztI65W (per-stat scaling table used for melee/range/magic/faith/max_hp/max_mp damage contributions) is populated at runtime by the server and is empty in the recovered client.",
        };
      })(),
    },
    unlock_requirement: (() => {
      const formatted = obs ? formatLevelRequirements(obs.level_requirements) : null;
      if (formatted) {
        return {
          value: formatted,
          raw: formatted,
          provenance: "observed_live",
          note: `Captured from the running client's Skill.vOYoJ1G in ${obs._source_file}.`,
        };
      }
      return {
        value: null,
        raw: skill.requirements || REQUIREMENTS_PLACEHOLDER,
        provenance: "server_runtime",
      };
    })(),
    buff_details,
    source: {
      resource_path: skill.resource_path,
      texture_path: skill.texture_path,
    },
  };
}

function main() {
  if (!existsSync(SOURCE_PATH)) {
    throw new Error(`Missing source export at ${SOURCE_PATH}`);
  }
  const raw = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const iconMap = existsSync(ICON_MAP_PATH)
    ? JSON.parse(readFileSync(ICON_MAP_PATH, "utf-8"))
    : {};
  const observations = loadObservations(OBSERVATIONS_DIR);

  const combat = raw.skills.filter((s) => COMBAT_BRANCHES.includes(s.branch));

  if (combat.length !== 79) {
    console.warn(
      `Warning: expected 79 combat nodes, found ${combat.length}. Continuing, but double-check the source export.`
    );
  }

  const skills = combat
    .map((s) => buildSkillRecord(s, iconMap, observations))
    .sort((a, b) => a.skill_id - b.skill_id);

  const branchCounts = {};
  for (const s of skills) {
    const b = s.branch.value;
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  }

  const output = {
    meta: {
      steam_app: raw.steam_app,
      build_id: raw.build_id,
      generated_at: new Date().toISOString(),
      pipeline_version: PIPELINE_VERSION,
      source_file: "data-pipeline/source/souls-remnant-skill-tree.json",
      total_combat_nodes: skills.length,
      branch_counts: branchCounts,
      branches: COMBAT_BRANCHES,
      tree_background: {
        width: TREE_WIDTH,
        height: TREE_HEIGHT,
        bare: "assets/tree/skill_tree_combat_bare.png",
        overlay: "assets/tree/skill_tree_combat_color_overlay.png",
      },
    },
    skills,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${skills.length} combat skills to ${path.relative(ROOT, OUT_PATH)}`);
  console.log("Branch counts:", branchCounts);
  const observedCount = Object.keys(observations).length;
  if (observedCount > 0) {
    console.log(`Applied live-captured observations for ${observedCount} skill(s) from data-pipeline/observations/skills/.`);
  } else {
    console.log("No files in data-pipeline/observations/skills/ yet — all server-runtime stats remain Unknown.");
  }
}

main();
