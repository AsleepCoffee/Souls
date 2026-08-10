export interface Loadout {
  /** equipment slot type (1-13) -> chosen item slug */
  equipment: Record<number, string>;
  /** skill_ids the user has placed in "active" slots */
  active: number[];
  /** skill_ids the user has placed in the "passive" list */
  passive: number[];
}

export const EMPTY_LOADOUT: Loadout = { equipment: {}, active: [], passive: [] };

/** Base64 + URI-encoded JSON — compact enough for a query string, no backend needed to "save" a build. */
export function encodeLoadout(l: Loadout): string {
  return btoa(encodeURIComponent(JSON.stringify(l)));
}

export function decodeLoadout(raw: string | null): Loadout {
  if (!raw) return EMPTY_LOADOUT;
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(raw)));
    return {
      equipment: typeof parsed.equipment === "object" && parsed.equipment ? parsed.equipment : {},
      active: Array.isArray(parsed.active) ? parsed.active : [],
      passive: Array.isArray(parsed.passive) ? parsed.passive : [],
    };
  } catch {
    return EMPTY_LOADOUT;
  }
}
