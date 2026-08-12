import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { ItemRecord, MonsterRecord, ZoneRecord } from "../../data/types";
import { RESOURCE_TYPE_COLOR, RESOURCE_TYPE_LABEL, ZONE_LAYER_LABEL } from "../../data/constants";
import { ColorBadge } from "../common/Badge";
import { SkillIcon } from "../common/SkillIcon";
import { StatValue } from "../common/Provenance";
import { publicUrl } from "../../utils/publicUrl";
import "../DetailPanel/DetailPanel.css";
import "../common/SkillSummary.css";
import "./ZoneDetail.css";

export function ZoneDetail({
  zone,
  onClose,
  itemsById,
  monstersById,
}: {
  zone: ZoneRecord | null;
  onClose: () => void;
  itemsById: Map<number, ItemRecord>;
  monstersById: Map<number, MonsterRecord>;
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (zone) closeBtnRef.current?.focus();
  }, [zone]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {zone && <div className="detail-panel__backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`detail-panel ${zone ? "detail-panel--open" : ""}`} aria-live="polite" aria-label="Zone details">
        {zone ? (
          <>
            <div className="detail-panel__bar">
              <span className="detail-panel__eyebrow">{ZONE_LAYER_LABEL[zone.layer]}</span>
              <button type="button" className="detail-panel__close" onClick={onClose} ref={closeBtnRef} aria-label="Close zone details">
                ✕
              </button>
            </div>
            <div className="detail-panel__body scrollbar-thin">
              <h3 className="zone-detail__name">{zone.display_name.value}</h3>

              <div className="skill-summary__row">
                <span className="skill-summary__label">Level</span>
                <StatValue value={zone.level.value} provenance={zone.level.provenance} note={zone.level.note} />
              </div>

              <section className="detail-panel__section">
                <h4>Warp point</h4>
                {zone.warp_point ? (
                  <StatValue
                    value={zone.warp_point.unlocked.value ? "Unlocked" : "Locked"}
                    provenance={zone.warp_point.unlocked.provenance}
                    note={zone.warp_point.unlocked.note}
                  />
                ) : (
                  <span className="zone-detail__muted">This zone has no warp point.</span>
                )}
              </section>

              <section className="detail-panel__section">
                <h4>Monsters ({zone.monsters.length})</h4>
                {zone.monsters.length === 0 ? (
                  <p className="zone-detail__muted">No monster spawns recorded here.</p>
                ) : (
                  <ul className="zone-detail__list">
                    {zone.monsters.map((spawn) => {
                      const monster = monstersById.get(spawn.reference_id);
                      return (
                        <li key={spawn.reference_id} className="zone-detail__row">
                          <SkillIcon src={monster?.icon.value ? publicUrl(monster.icon.value) : null} alt="" size={22} />
                          {monster ? (
                            <Link to={`/monsters/${monster.slug}`} className="zone-detail__row-name">
                              {spawn.name}
                            </Link>
                          ) : (
                            <span className="zone-detail__row-name">{spawn.name}</span>
                          )}
                          {spawn.essence_item_ids.length > 0 && (
                            <span className="zone-detail__essences">
                              {spawn.essence_item_ids.map((id) => {
                                const item = itemsById.get(id);
                                return item ? (
                                  <Link key={id} to={`/items/${item.slug}`} className="zone-detail__essence-chip" title={`Essence: ${item.name.value}`}>
                                    {item.name.value}
                                  </Link>
                                ) : null;
                              })}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="detail-panel__section">
                <h4>Gathering resources ({zone.resources.length})</h4>
                {zone.resources.length === 0 ? (
                  <p className="zone-detail__muted">No gathering resources recorded here.</p>
                ) : (
                  <ul className="zone-detail__list">
                    {zone.resources.map((spawn) => {
                      const item = itemsById.get(spawn.reference_id);
                      return (
                        <li key={spawn.reference_id} className="zone-detail__row">
                          <SkillIcon src={item?.icon.value ? publicUrl(item.icon.value) : null} alt="" size={22} />
                          {item ? (
                            <Link to={`/items/${item.slug}`} className="zone-detail__row-name">
                              {spawn.name}
                            </Link>
                          ) : (
                            <span className="zone-detail__row-name">{spawn.name}</span>
                          )}
                          <ColorBadge label={RESOURCE_TYPE_LABEL[spawn.resource_type.value] ?? `Type ${spawn.resource_type.value}`} color={RESOURCE_TYPE_COLOR[spawn.resource_type.value] ?? "var(--text-muted)"} />
                          <StatValue value={spawn.spawn_chance_percent.value} provenance={spawn.spawn_chance_percent.provenance} note={spawn.spawn_chance_percent.note} suffix="%" />
                          {spawn.found_on_trees && <span className="zone-detail__muted">(on trees)</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="detail-panel__empty">
            <p>Click a marker on the map to see zone details here.</p>
          </div>
        )}
      </aside>
    </>
  );
}
