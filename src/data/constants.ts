import type { Branch, Classification, ItemCategory, Provenance, ZoneLayer } from "./types";

// Matched to the actual in-game skill_tree_combat_color_overlay.png quadrant
// colors (sampled: Melee #ff7777 top, Faith #cc9eff right, Range #fdff77
// bottom, Magic #5357ff left), then tuned for contrast on a dark UI.
export const BRANCH_COLOR: Record<Branch, string> = {
  Melee: "#e8746f",
  Range: "#d9cf5c",
  Magic: "#7c82f2",
  Faith: "#c298f0",
};

export const BRANCH_COLOR_SOFT: Record<Branch, string> = {
  Melee: "rgba(232, 116, 111, 0.16)",
  Range: "rgba(217, 207, 92, 0.16)",
  Magic: "rgba(124, 130, 242, 0.16)",
  Faith: "rgba(194, 152, 240, 0.16)",
};

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  active: "Active",
  passive_stance: "Passive Stance",
  proficiency: "Proficiency (passive)",
  buff_toggle: "Buff / Toggle",
  basic_attack: "Basic Attack",
};

export const CLASSIFICATION_COLOR: Record<Classification, string> = {
  active: "#6fa8dc",
  passive_stance: "#4fd1c5",
  proficiency: "#4fd1c5",
  buff_toggle: "#c98fe0",
  basic_attack: "#e0a355",
};

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  client_structured: "Verified — client data",
  client_description: "From in-game description text",
  observed_live: "Verified — recorded in-game",
  server_runtime: "Unknown — server runtime only",
  inferred: "Inferred / derived",
  unknown: "Unknown",
};

export const PROVENANCE_SHORT: Record<Provenance, string> = {
  client_structured: "Client",
  client_description: "Description",
  observed_live: "In-game",
  server_runtime: "Server-only",
  inferred: "Inferred",
  unknown: "Unknown",
};

export const BRANCHES: Branch[] = ["Melee", "Range", "Magic", "Faith"];

export const CLASSIFICATIONS: Classification[] = [
  "active",
  "basic_attack",
  "buff_toggle",
  "passive_stance",
  "proficiency",
];

export const ITEM_CATEGORY_LABEL: Record<ItemCategory, string> = {
  general: "General",
  weapon: "Weapon",
  gathering_material: "Gathering Material",
  crafting_material: "Crafting Material",
};

export const ITEM_CATEGORY_COLOR: Record<ItemCategory, string> = {
  general: "#8fb7e8",
  weapon: "#e0685a",
  gathering_material: "#7fc26b",
  crafting_material: "#cf9d4f",
};

export const ITEM_CATEGORIES: ItemCategory[] = ["general", "weapon", "gathering_material", "crafting_material"];

// Canonical slot list for the Loadout Planner — same mapping as
// data-pipeline/build-items-data.mjs's EQUIPMENT_SLOT_LABEL (kept in sync by
// hand; the pipeline can't share TS constants with the frontend). Slot 6 and
// 12 are intentionally absent — no friendly label was found for either in
// either of the two source scripts that corroborate this mapping.
export const EQUIPMENT_SLOT_LABEL: Record<number, string> = {
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

export const EQUIPMENT_SLOT_TYPES: number[] = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13];

export const ZONE_LAYER_LABEL: Record<ZoneLayer, string> = {
  0: "Surface",
  1: "Caves",
};

export const ZONE_LAYER_COLOR: Record<ZoneLayer, string> = {
  0: "#e8b968",
  1: "#8b7cf6",
};

export const ZONE_LAYERS: ZoneLayer[] = [0, 1];

// Resource-type enum observed in the World Map capture (herbalism/mining/fishing gathering
// nodes). Colors picked distinct from ITEM_CATEGORY_COLOR since both badges can appear together
// on an item's "Where to gather" section.
export const RESOURCE_TYPE_LABEL: Record<number, string> = {
  0: "Herbalism",
  1: "Mining",
  2: "Fishing",
};

export const RESOURCE_TYPE_COLOR: Record<number, string> = {
  0: "#b5e05c",
  1: "#8a94a6",
  2: "#5fc9d9",
};

export const RESOURCE_TYPES: number[] = [0, 1, 2];
