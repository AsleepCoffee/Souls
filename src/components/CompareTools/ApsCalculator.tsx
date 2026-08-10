import { useMemo, useState } from "react";
import "./ApsCalculator.css";

type Basis = "cooldown" | "duration";

export function ApsCalculator() {
  const [attackCount, setAttackCount] = useState(1);
  const [timingMs, setTimingMs] = useState(1000);
  const [basis, setBasis] = useState<Basis>("cooldown");
  const [charged, setCharged] = useState(false);

  const aps = useMemo(() => {
    if (timingMs <= 0) return null;
    return attackCount / (timingMs / 1000);
  }, [attackCount, timingMs]);

  return (
    <div className="aps-calc">
      <h3>Attacks-per-second calculator</h3>
      <p className="aps-calc__intro">
        Enter timing values from any source you trust (a datamine, an in-game timer, this site's own verified
        fields once a future build fills them in) to see the computed rate and the exact formula used. Nothing
        here is pulled from an unverified guess — this is a calculator, not a lookup of hidden numbers.
      </p>

      <div className="aps-calc__grid">
        <label className="aps-calc__field">
          <span>Hits per activation</span>
          <input
            type="number"
            min={1}
            step={1}
            value={attackCount}
            onChange={(e) => setAttackCount(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>

        <label className="aps-calc__field">
          <span>Timing basis</span>
          <select value={basis} onChange={(e) => setBasis(e.target.value as Basis)}>
            <option value="cooldown">Cooldown (activation cadence)</option>
            <option value="duration">Animation / channel duration</option>
          </select>
        </label>

        <label className="aps-calc__field">
          <span>{basis === "cooldown" ? "Cooldown" : "Duration"} (ms)</span>
          <input
            type="number"
            min={1}
            step={10}
            value={timingMs}
            onChange={(e) => setTimingMs(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>

        <label className="aps-calc__checkbox">
          <input type="checkbox" checked={charged} onChange={(e) => setCharged(e.target.checked)} />
          <span>Charged attack (release-triggered, not repeat-triggered)</span>
        </label>
      </div>

      <div className="aps-calc__result">
        <div className="aps-calc__result-value">{aps !== null ? aps.toFixed(2) : "—"} attacks/sec</div>
        <code className="aps-calc__formula">
          {attackCount} hit{attackCount === 1 ? "" : "s"} / ({timingMs}ms {basis} / 1000) = {aps !== null ? aps.toFixed(3) : "?"}/s
        </code>
        {charged && (
          <p className="aps-calc__note">
            Charged attacks are release-triggered rather than repeat-triggered — treat this rate as "max sustained
            rate if released instantly," not a guaranteed attack cadence, since charge time itself isn't a fixed
            cooldown in the recovered client data.
          </p>
        )}
      </div>

      <details className="aps-calc__details">
        <summary>Why can't this be pre-filled per skill?</summary>
        <p>
          Every combat skill's <code>cooldown</code>, <code>duration</code>, and <code>attack_count</code> live on
          non-exported fields of the recovered <code>Skill</code> runtime class (see{" "}
          <code>Resources/Skills/Skill.gd</code>) that the client never assigns a literal value to — they arrive
          from the MMO server when the skill window opens. No file in the recovered project pairs a specific skill
          with a specific cooldown or animation time, so pre-filling this calculator per skill would mean
          inventing numbers. Use it with values you can verify from another source instead.
        </p>
      </details>
    </div>
  );
}
