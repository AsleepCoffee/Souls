import type { Branch, Classification, Provenance } from "./types";

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
