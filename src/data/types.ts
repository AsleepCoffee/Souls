// Types mirroring src/data/skills.generated.json (see data-pipeline/build-site-data.mjs).
// Every piece of data that can vary in confidence carries an explicit
// `provenance` tag so the UI never presents a guess as a verified fact.

export type Provenance =
  | "client_structured"
  | "client_description"
  | "observed_live"
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
  scaling_attributes: { value: string | null; provenance: Provenance; note?: string };
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

export type ItemCategory = "general" | "weapon" | "gathering_material" | "crafting_material";

export interface EquipmentSlot {
  type: number;
  label: string | null;
}

export interface ItemStats {
  /** Raw 0-6 rarity tier (Item.rarity in the client). Utils.gd maps it to a color ramp (gray→white→green→blue→purple→orange→pink) but no tier *names* are confirmed anywhere in the recovered client — do not invent them. */
  rarity: StatField;
  required_level: StatField;
  modifiers: { value: string | null; provenance: Provenance; note?: string };
}

export interface ItemRecord {
  slug: string;
  item_id: Field<number | null>;
  name: Field<string>;
  description: Field<string | null>;
  category: Field<ItemCategory>;
  icon: Field<string>;
  equipment_slot: Field<EquipmentSlot | null>;
  stats: ItemStats;
  source: { resource_path: string; texture_path: string };
}

export interface ItemsData {
  meta: {
    generated_at: string;
    pipeline_version: string;
    total_items: number;
    total_equipment_merged: number;
    category_counts: Record<string, number>;
  };
  items: ItemRecord[];
}

export interface MonsterStats {
  level: StatField;
  hp: StatField;
  mp: StatField;
  attack: StatField;
  defense: StatField;
  speed: StatField;
  exp_reward: StatField;
}

export interface MonsterRecord {
  slug: string;
  monster_id: Field<number | null>;
  name: Field<string>;
  icon: Field<string | null>;
  behavior_scene: Field<string | null>;
  stats: MonsterStats;
  drop_table: { value: string | null; provenance: Provenance; note?: string };
  found_in: { value: string | null; provenance: Provenance; note?: string };
  source: { resource_path: string; texture_path: string | null };
}

export interface MonstersData {
  meta: {
    generated_at: string;
    pipeline_version: string;
    total_monsters: number;
  };
  monsters: MonsterRecord[];
}

export type ZoneLayer = 0 | 1; // 0 = Surface, 1 = Caves — see data-pipeline/README.md's layer-labeling caveat

export interface ZoneMonsterSpawn {
  name: string;
  reference_id: number; // matches MonsterRecord.monster_id.value
  essence_item_ids: number[]; // matches ItemRecord.item_id.value; the 0 sentinel is filtered at pipeline time
}

export interface ZoneResourceSpawn {
  name: string;
  reference_id: number; // matches ItemRecord.item_id.value
  resource_type: Field<number>; // 0 Herbalism / 1 Mining / 2 Fishing
  spawn_chance_percent: StatField;
  found_on_trees: boolean;
}

export interface ZoneWarpPoint {
  warp_point_id: string;
  unlocked: Field<boolean>; // observed_live — reflects the capturing account's own progress, not a global fact
}

export interface ZoneRecord {
  map_id: string;
  layer: ZoneLayer;
  display_name: Field<string>;
  x: Field<number>; // already corrected into the background image's pixel space
  y: Field<number>;
  /** The zone's in-game region tint (self_modulate), as a CSS-ready "r, g, b" string (0-255 each). */
  color_rgb: Field<string>;
  level: StatField;
  monsters: ZoneMonsterSpawn[];
  resources: ZoneResourceSpawn[];
  /** null = this zone structurally has no warp point — not an unknown value. */
  warp_point: ZoneWarpPoint | null;
}

export interface WorldMapData {
  meta: {
    generated_at: string;
    pipeline_version: string;
    image_width: number;
    image_height: number;
    total_zones: number;
    layer_counts: Record<string, number>;
  };
  zones: ZoneRecord[];
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
