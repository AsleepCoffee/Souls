import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import rawItemsData from "../../data/items.generated.json";
import rawMonstersData from "../../data/monsters.generated.json";
import rawMapsData from "../../data/maps.generated.json";
import type { ItemsData, MonstersData, WorldMapData } from "../../data/types";
import { ITEM_CATEGORY_COLOR, ITEM_CATEGORY_LABEL, RESOURCE_TYPE_COLOR, RESOURCE_TYPE_LABEL, ZONE_LAYER_LABEL } from "../../data/constants";
import { ColorBadge } from "../common/Badge";
import { SkillIcon } from "../common/SkillIcon";
import { StatValue, ProvenanceTag } from "../common/Provenance";
import { Breadcrumb } from "../common/Breadcrumb";
import { publicUrl } from "../../utils/publicUrl";
import { buildItemEssenceIndex, buildItemZoneIndex, buildMonsterByIdIndex } from "../../utils/crossLinks";
import "../common/SkillSummary.css";
import "../DetailPanel/DetailPanel.css";
import "./ItemDetail.css";

const itemsData = rawItemsData as unknown as ItemsData;
const monstersData = rawMonstersData as unknown as MonstersData;
const mapsData = rawMapsData as unknown as WorldMapData;

export function ItemDetail() {
  const { slug } = useParams<{ slug: string }>();
  const item = itemsData.items.find((it) => it.slug === slug);
  const itemZoneIndex = useMemo(() => buildItemZoneIndex(mapsData.zones), []);
  const itemEssenceIndex = useMemo(() => buildItemEssenceIndex(mapsData.zones), []);
  const monstersById = useMemo(() => buildMonsterByIdIndex(monstersData.monsters), []);
  const itemId = item?.item_id.value ?? null;
  const gatherSpots = useMemo(() => (itemId != null ? itemZoneIndex.get(itemId) ?? [] : []), [itemZoneIndex, itemId]);
  const droppedByMonsters = useMemo(() => {
    const essenceSources = itemId != null ? itemEssenceIndex.get(itemId) ?? [] : [];
    const seen = new Map<number, string>();
    for (const { monster } of essenceSources) {
      if (!seen.has(monster.reference_id)) seen.set(monster.reference_id, monster.name);
    }
    return [...seen.entries()];
  }, [itemEssenceIndex, itemId]);

  if (!item) {
    return (
      <div className="item-detail item-detail--missing">
        <p>No item found for "{slug}".</p>
        <Link to="/items">← Back to Items</Link>
      </div>
    );
  }

  return (
    <div className="item-detail">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Items", to: "/items" }, { label: item.name.value }]} />

      <header className="item-detail__header">
        <SkillIcon src={publicUrl(item.icon.value)} alt="" size={56} />
        <div>
          <h2 className="item-detail__name">
            {item.name.value} <span className="skill-summary__id">#{item.slug}</span>
          </h2>
          <div className="skill-summary__badges">
            <ColorBadge label={ITEM_CATEGORY_LABEL[item.category.value]} color={ITEM_CATEGORY_COLOR[item.category.value]} />
            {item.equipment_slot.value && (
              <StatValue
                value={item.equipment_slot.value.label ?? `Unknown slot (type ${item.equipment_slot.value.type})`}
                provenance={item.equipment_slot.provenance}
                note={item.equipment_slot.note}
              />
            )}
          </div>
        </div>
      </header>

      <div className="skill-summary__row">
        <span className="skill-summary__label">Item ID</span>
        <StatValue value={item.item_id.value} provenance={item.item_id.provenance} note={item.item_id.note} />
      </div>

      <p className="skill-summary__description">
        {item.description.value ?? (
          <StatValue value={null} provenance={item.description.provenance} note={item.description.note} />
        )}
      </p>

      <section className="detail-panel__section">
        <h4>Stats</h4>
        <dl className="detail-panel__dl">
          <dt>Rarity</dt>
          <dd>
            <StatValue value={item.stats.rarity.value} provenance={item.stats.rarity.provenance} note={item.stats.rarity.note} />
          </dd>
          <dt>Required level</dt>
          <dd>
            <StatValue
              value={item.stats.required_level.value}
              provenance={item.stats.required_level.provenance}
              note={item.stats.required_level.note}
            />
          </dd>
          <dt>Modifiers</dt>
          <dd>
            <StatValue value={item.stats.modifiers.value} provenance={item.stats.modifiers.provenance} note={item.stats.modifiers.note} />
          </dd>
        </dl>
        <p className="detail-panel__stats-note">
          These fields are assigned by the game server per item instance and are never present in the recovered
          client — see <code>data-pipeline/README.md</code> for the full explanation.
        </p>
      </section>

      {droppedByMonsters.length > 0 && (
        <section className="detail-panel__section">
          <h4>
            Dropped by ({droppedByMonsters.length} {droppedByMonsters.length === 1 ? "monster" : "monsters"})
          </h4>
          <p className="detail-panel__stats-note">
            Essence drop recorded from a live World Map capture — chance/rate isn't captured, only that this
            monster drops this essence.
          </p>
          <ul className="item-detail__gather-list">
            {droppedByMonsters.map(([monsterId, name]) => {
              const monster = monstersById.get(monsterId);
              return (
                <li key={monsterId} className="item-detail__gather-row">
                  <SkillIcon src={monster?.icon.value ? publicUrl(monster.icon.value) : null} alt="" size={22} />
                  {monster ? (
                    <Link to={`/monsters/${monster.slug}`} className="item-detail__gather-zone">
                      {name}
                    </Link>
                  ) : (
                    <span className="item-detail__gather-zone">{name}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {gatherSpots.length > 0 && (
        <section className="detail-panel__section">
          <h4>Where to gather ({gatherSpots.length} {gatherSpots.length === 1 ? "zone" : "zones"})</h4>
          <ul className="item-detail__gather-list">
            {gatherSpots
              .slice()
              .sort((a, b) => b.spawn.spawn_chance_percent.value! - a.spawn.spawn_chance_percent.value!)
              .map(({ zone, spawn }) => (
                <li key={zone.map_id} className="item-detail__gather-row">
                  <Link to={`/maps?zone=${zone.map_id}`} className="item-detail__gather-zone">
                    {zone.display_name.value}
                  </Link>
                  <ColorBadge label={ZONE_LAYER_LABEL[zone.layer]} color="var(--text-muted)" />
                  <ColorBadge
                    label={RESOURCE_TYPE_LABEL[spawn.resource_type.value] ?? `Type ${spawn.resource_type.value}`}
                    color={RESOURCE_TYPE_COLOR[spawn.resource_type.value] ?? "var(--text-muted)"}
                  />
                  <StatValue
                    value={spawn.spawn_chance_percent.value}
                    provenance={spawn.spawn_chance_percent.provenance}
                    note={spawn.spawn_chance_percent.note}
                    suffix="%"
                  />
                  {spawn.found_on_trees && <span className="item-detail__gather-note">(on trees)</span>}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="detail-panel__section">
        <h4>Source reference</h4>
        <dl className="detail-panel__dl">
          <dt>Resource</dt>
          <dd className="detail-panel__mono">{item.source.resource_path}</dd>
          <dt>Texture</dt>
          <dd className="detail-panel__mono">
            {item.source.texture_path}
            <ProvenanceTag provenance="client_structured" />
          </dd>
        </dl>
      </section>
    </div>
  );
}
