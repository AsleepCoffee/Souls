import type { SkillRecord } from "../data/types";

export interface ApsResult {
  value: number | null;
  formula: string;
  basis: "cooldown" | "duration" | null;
}

/**
 * Attacks-per-second, computed (never read pre-computed) from whichever
 * verified timing field is available: attack_count / (cooldown or
 * animation-duration, in seconds). Cooldown is preferred as the
 * activation-to-activation cadence for most skills; duration is used as a
 * fallback for channeled/DoT-style skills where cooldown alone
 * under-represents cadence. Returns null (not a guess) when neither timing
 * field is known.
 */
export function computeAttacksPerSecond(skill: SkillRecord): ApsResult {
  const attackCount = skill.stats.attack_count.value ?? 1;
  const cooldownMs = skill.stats.cooldown_ms.value;
  const durationMs = skill.stats.duration_ms.value;

  const basisMs = cooldownMs ?? durationMs;
  const basis: ApsResult["basis"] = cooldownMs != null ? "cooldown" : durationMs != null ? "duration" : null;

  if (basisMs === null || basisMs <= 0) {
    return {
      value: null,
      basis: null,
      formula: "attack_count / (cooldown_ms / 1000) — unknown: cooldown_ms and duration_ms are both server-runtime-only for this skill",
    };
  }

  return {
    value: attackCount / (basisMs / 1000),
    basis,
    formula: `${attackCount} hit${attackCount === 1 ? "" : "s"} / (${basisMs}ms ${basis} / 1000) = ${(attackCount / (basisMs / 1000)).toFixed(2)}/s`,
  };
}

export function formatMs(ms: number | null): string | null {
  if (ms === null) return null;
  return `${(ms / 1000).toFixed(2)}s`;
}
