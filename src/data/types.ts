// Types mirroring src/data/skills.generated.json (see data-pipeline/build-site-data.mjs).
// Every piece of data that can vary in confidence carries an explicit
// `provenance` tag so the UI never presents a guess as a verified fact.

export type Provenance =
  | "client_structured"
  | "client_description"
  | "server_runtime"
  | "inferred"
  | "unknown";

export interface Field<T> {
  value: T;
  provenance: Provenance;
  note?: string;
  raw?: string;
}

export type Branch = "Melee" | "Range" | "Magic" | "Faith";

export type Classification =
  | "active"
  | "passive_stance"
  | "proficiency"
  | "buff_toggle"
  | "basic_attack";

export interface ParsedEffect {
  kind: "level_scaling" | "multiplier";
  raw: string;
  base_value: number;
  per_level: number | null;
  is_percent: boolean;
  context: string;
  provenance: Provenance;
}

export interface StatField {
  value: number | null;
  provenance: Provenance;
  note?: string;
}

export interface SkillStats {
  base_power: StatField;
  power_per_level: StatField;
  cooldown_ms: StatField;
  duration_ms: StatField;
  attack_per_second: StatField;
  attack_count: StatField;
  max_level: StatField;
  scaling_attributes: { value: null; provenance: Provenance; note?: string };
}

export interface SkillTags {
  charged: boolean;
  hold_or_repeat: boolean;
  hybrid_damage: boolean;
}

export interface RegenPenalty {
  resource: "MP" | "HP";
  base_value: number;
  per_level: number;
  unit: string;
  provenance: Provenance;
  raw: string;
}

export interface PartySharing {
  shares_with_party: boolean;
  snippets: string[];
  provenance: Provenance;
}

export interface StackingBehavior {
  value: "multiplicative" | "unspecified";
  provenance: Provenance;
  note?: string;
}

export interface DurationHint {
  raw: string;
  context: string;
  provenance: Provenance;
}

export interface BuffDetails {
  affected_stats: Field<string[]>;
  regen_penalty: RegenPenalty | null;
  party_sharing: PartySharing;
  stacking_behavior: StackingBehavior;
  duration_hints: DurationHint[];
  restrictions: { snippets: string[]; provenance: Provenance };
}

export interface SkillRecord {
  skill_id: number;
  name: Field<string>;
  node_name: string;
  branch: Field<Branch>;
  tree: string;
  damage_types: Field<string[]>;
  position: Field<{ x: number; y: number }>;
  icon: Field<string | null>;
  passive: Field<boolean>;
  hidden_in_client_data: Field<boolean>;
  classification: Field<Classification>;
  tags: SkillTags;
  description: Field<string>;
  parsed_effects: ParsedEffect[];
  stats: SkillStats;
  unlock_requirement: Field<string | null>;
  buff_details: BuffDetails | null;
  source: { resource_path: string; texture_path: string };
}

export interface SiteData {
  meta: {
    steam_app: number;
    build_id: string;
    generated_at: string;
    pipeline_version: string;
    source_file: string;
    total_combat_nodes: number;
    branch_counts: Record<string, number>;
    branches: Branch[];
    tree_background: {
      width: number;
      height: number;
      bare: string;
      overlay: string;
    };
  };
  skills: SkillRecord[];
}
