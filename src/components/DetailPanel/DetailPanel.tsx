import { useEffect, useRef } from "react";
import type { SkillRecord } from "../../data/types";
import { SkillSummary } from "../common/SkillSummary";
import { ProvenanceTag, StatValue } from "../common/Provenance";
import { computeAttacksPerSecond, formatMs } from "../../utils/combat";
import "./DetailPanel.css";

export function DetailPanel({
  skill,
  onClose,
}: {
  skill: SkillRecord | null;
  onClose: () => void;
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (skill) closeBtnRef.current?.focus();
  }, [skill]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {skill && <div className="detail-panel__backdrop" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`detail-panel ${skill ? "detail-panel--open" : ""}`}
        aria-live="polite"
        aria-label="Skill details"
      >
      {skill ? (
        <>
          <div className="detail-panel__bar">
            <span className="detail-panel__eyebrow">Skill details</span>
            <button type="button" className="detail-panel__close" onClick={onClose} ref={closeBtnRef} aria-label="Close skill details">
              ✕
            </button>
          </div>
          <div className="detail-panel__body scrollbar-thin">
            <SkillSummary skill={skill} />

            {skill.buff_details && (
              <section className="detail-panel__section">
                <h4>Buff / toggle details</h4>
                <dl className="detail-panel__dl">
                  <dt>Affected stats</dt>
                  <dd>
                    {skill.buff_details.affected_stats.value.length > 0
                      ? skill.buff_details.affected_stats.value.join(", ")
                      : "Not identifiable from description text"}
                    <ProvenanceTag provenance={skill.buff_details.affected_stats.provenance} />
                  </dd>

                  <dt>MP/HP cost or regen penalty</dt>
                  <dd>
                    {skill.buff_details.regen_penalty ? (
                      <>
                        {skill.buff_details.regen_penalty.base_value}
                        {" (+"}
                        {skill.buff_details.regen_penalty.per_level}
                        {"/lv) "}
                        {skill.buff_details.regen_penalty.resource} regen {skill.buff_details.regen_penalty.unit}
                        <ProvenanceTag provenance={skill.buff_details.regen_penalty.provenance} />
                      </>
                    ) : (
                      <span className="detail-panel__muted">None stated in description</span>
                    )}
                  </dd>

                  <dt>Party sharing</dt>
                  <dd>
                    {skill.buff_details.party_sharing.shares_with_party ? (
                      <>
                        {skill.buff_details.party_sharing.snippets.map((s, i) => (
                          <p key={i} className="detail-panel__snippet">
                            {s}
                          </p>
                        ))}
                        <ProvenanceTag provenance={skill.buff_details.party_sharing.provenance} />
                      </>
                    ) : (
                      <span className="detail-panel__muted">No party-sharing language in description</span>
                    )}
                  </dd>

                  <dt>Stacking behavior</dt>
                  <dd>
                    {skill.buff_details.stacking_behavior.value === "multiplicative" ? "Multiplicative with other buffs" : "Unspecified (assume additive unless stated)"}
                    <ProvenanceTag
                      provenance={skill.buff_details.stacking_behavior.provenance}
                      note={skill.buff_details.stacking_behavior.note}
                    />
                  </dd>

                  <dt>Duration mentions</dt>
                  <dd>
                    {skill.buff_details.duration_hints.length > 0 ? (
                      skill.buff_details.duration_hints.map((h, i) => (
                        <div key={i}>
                          <code>{h.raw}</code>
                        </div>
                      ))
                    ) : (
                      <span className="detail-panel__muted">No explicit duration in description</span>
                    )}
                  </dd>

                  <dt>Restrictions</dt>
                  <dd>
                    {skill.buff_details.restrictions.snippets.length > 0 ? (
                      <>
                        {skill.buff_details.restrictions.snippets.map((s, i) => (
                          <p key={i} className="detail-panel__snippet">
                            {s}
                          </p>
                        ))}
                        <ProvenanceTag provenance={skill.buff_details.restrictions.provenance} />
                      </>
                    ) : (
                      <span className="detail-panel__muted">None found in description</span>
                    )}
                  </dd>
                </dl>
              </section>
            )}

            <section className="detail-panel__section">
              <h4>Numeric combat stats</h4>
              <dl className="detail-panel__dl">
                <dt>Base power</dt>
                <dd>
                  <StatValue value={skill.stats.base_power.value} provenance={skill.stats.base_power.provenance} note={skill.stats.base_power.note} />
                </dd>
                <dt>Power / level</dt>
                <dd>
                  <StatValue value={skill.stats.power_per_level.value} provenance={skill.stats.power_per_level.provenance} note={skill.stats.power_per_level.note} />
                </dd>
                <dt>Cooldown</dt>
                <dd>
                  <StatValue value={formatMs(skill.stats.cooldown_ms.value)} provenance={skill.stats.cooldown_ms.provenance} note={skill.stats.cooldown_ms.note} />
                </dd>
                <dt>Duration</dt>
                <dd>
                  <StatValue value={formatMs(skill.stats.duration_ms.value)} provenance={skill.stats.duration_ms.provenance} note={skill.stats.duration_ms.note} />
                </dd>
                <dt>Hits per use</dt>
                <dd>
                  <StatValue value={skill.stats.attack_count.value} provenance={skill.stats.attack_count.provenance} note={skill.stats.attack_count.note} />
                </dd>
                <dt>Attacks / sec (computed)</dt>
                <dd>
                  {(() => {
                    const aps = computeAttacksPerSecond(skill);
                    return <StatValue value={aps.value ? aps.value.toFixed(2) : null} provenance={aps.provenance} note={aps.formula} />;
                  })()}
                </dd>
                <dt>Max level</dt>
                <dd>
                  <StatValue value={skill.stats.max_level.value} provenance={skill.stats.max_level.provenance} note={skill.stats.max_level.note} />
                </dd>
                <dt>Damage scaling</dt>
                <dd>
                  <StatValue value={skill.stats.scaling_attributes.value} provenance={skill.stats.scaling_attributes.provenance} note={skill.stats.scaling_attributes.note} />
                </dd>
              </dl>
              <p className="detail-panel__stats-note">
                Fields marked "Unknown" are assigned by the MMO server at runtime (`Skill.gd`'s non-exported
                fields) and are not present in the recovered client — see{" "}
                <code>data-pipeline/live-capture/</code> for how to record them from a running, connected client.
              </p>
            </section>

            <section className="detail-panel__section">
              <h4>Source reference</h4>
              <dl className="detail-panel__dl">
                <dt>Resource</dt>
                <dd className="detail-panel__mono">{skill.source.resource_path}</dd>
                <dt>Texture</dt>
                <dd className="detail-panel__mono">{skill.source.texture_path}</dd>
              </dl>
            </section>
          </div>
        </>
      ) : (
        <div className="detail-panel__empty">
          <p>Select a skill on the tree, or from a table row, to see its full details here.</p>
        </div>
      )}
      </aside>
    </>
  );
}
