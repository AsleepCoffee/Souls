import { Link, useParams } from "react-router-dom";
import rawItemsData from "../../data/items.generated.json";
import type { ItemsData } from "../../data/types";
import { ITEM_CATEGORY_COLOR, ITEM_CATEGORY_LABEL } from "../../data/constants";
import { ColorBadge } from "../common/Badge";
import { SkillIcon } from "../common/SkillIcon";
import { StatValue, ProvenanceTag } from "../common/Provenance";
import { publicUrl } from "../../utils/publicUrl";
import "../common/SkillSummary.css";
import "../DetailPanel/DetailPanel.css";
import "./ItemDetail.css";

const itemsData = rawItemsData as unknown as ItemsData;

export function ItemDetail() {
  const { slug } = useParams<{ slug: string }>();
  const item = itemsData.items.find((it) => it.slug === slug);

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
      <Link to="/items" className="item-detail__back">
        ← Back to Items
      </Link>

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
