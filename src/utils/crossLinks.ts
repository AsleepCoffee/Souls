// Cross-domain lookups between items/monsters and the zones they appear in.
// Computed at runtime from the already-loaded generated JSON files rather
// than baked in at pipeline time — keeps build-maps-data.mjs,
// build-items-data.mjs, and build-monsters-data.mjs independently
// regenerable with no execution-order dependency between them. Cheap at
// this scale (1,181 items + 135 monsters + 105 zones): callers should build
// each index once via useMemo, not on every render.

import type { ItemRecord, MonsterRecord, ZoneRecord, ZoneMonsterSpawn, ZoneResourceSpawn } from "../data/types";

export interface ItemZoneEntry {
  zone: ZoneRecord;
  spawn: ZoneResourceSpawn;
}

export interface MonsterZoneEntry {
  zone: ZoneRecord;
  spawn: ZoneMonsterSpawn;
}

export function buildItemZoneIndex(zones: ZoneRecord[]): Map<number, ItemZoneEntry[]> {
  const index = new Map<number, ItemZoneEntry[]>();
  for (const zone of zones) {
    for (const spawn of zone.resources) {
      const list = index.get(spawn.reference_id);
      if (list) list.push({ zone, spawn });
      else index.set(spawn.reference_id, [{ zone, spawn }]);
    }
  }
  return index;
}

export function buildMonsterZoneIndex(zones: ZoneRecord[]): Map<number, MonsterZoneEntry[]> {
  const index = new Map<number, MonsterZoneEntry[]>();
  for (const zone of zones) {
    for (const spawn of zone.monsters) {
      const list = index.get(spawn.reference_id);
      if (list) list.push({ zone, spawn });
      else index.set(spawn.reference_id, [{ zone, spawn }]);
    }
  }
  return index;
}

export interface ItemEssenceEntry {
  zone: ZoneRecord;
  monster: ZoneMonsterSpawn;
}

/** item_id -> monsters that drop it as an essence item, with the zone each spawn was recorded in. */
export function buildItemEssenceIndex(zones: ZoneRecord[]): Map<number, ItemEssenceEntry[]> {
  const index = new Map<number, ItemEssenceEntry[]>();
  for (const zone of zones) {
    for (const monster of zone.monsters) {
      for (const itemId of monster.essence_item_ids) {
        const list = index.get(itemId);
        const entry = { zone, monster };
        if (list) list.push(entry);
        else index.set(itemId, [entry]);
      }
    }
  }
  return index;
}

/** item_id -> full ItemRecord, so a zone/monster cross-link can render the real name/icon/slug in one lookup. */
export function buildItemByIdIndex(items: ItemRecord[]): Map<number, ItemRecord> {
  const index = new Map<number, ItemRecord>();
  for (const item of items) {
    if (item.item_id.value != null) index.set(item.item_id.value, item);
  }
  return index;
}

/** monster_id -> full MonsterRecord, same rationale as buildItemByIdIndex. */
export function buildMonsterByIdIndex(monsters: MonsterRecord[]): Map<number, MonsterRecord> {
  const index = new Map<number, MonsterRecord>();
  for (const monster of monsters) {
    if (monster.monster_id.value != null) index.set(monster.monster_id.value, monster);
  }
  return index;
}
