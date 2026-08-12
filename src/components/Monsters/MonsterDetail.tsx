import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import rawMonstersData from "../../data/monsters.generated.json";
import rawItemsData from "../../data/items.generated.json";
import rawMapsData from "../../data/maps.generated.json";
import type { ItemsData, MonstersData, WorldMapData } from "../../data/types";
import { ZONE_LAYER_LABEL } from "../../data/constants";
import { ColorBadge } from "../common/Badge";
import { SkillIcon } from "../common/SkillIcon";
import { StatValue, ProvenanceTag } from "../common/Provenance";
import { Breadcrumb } from "../common/Breadcrumb";
import { publicUrl } from "../../utils/publicUrl";
import { buildItemByIdIndex, buildMonsterZoneIndex } from "../../utils/crossLinks";
import "../common/SkillSummary.css";
import "../DetailPanel/DetailPanel.css";
import "../Items/ItemDetail.css";

const monstersData = rawMonstersData as unknown as MonstersData;
const itemsData = rawItemsData as unknown as ItemsData;
const mapsData = rawMapsData as unknown as WorldMapData;

export function MonsterDetail() {
  const { slug } = useParams<{ slug: string }>();
  const monster = monstersData.monsters.find((m) => m.slug === slug);
  const monsterZoneIndex = useMemo(() => buildMonsterZoneIndex(mapsData.zones), []);
  const itemsById = useMemo(() => buildItemByIdIndex(itemsData.items), []);
  const spawnZones = monster?.monster_id.value != null ? monsterZoneIndex.get(monster.monster_id.value) ?? [] : [];

  if (!monster) {
    return (
      <div className="item-detail item-detail--missing">
        <p>No monster found for "{slug}".</p>
        <Link to="/monsters">← Back to Monsters</Link>
      </div>
    );
  }

  return (
    <div className="item-detail">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Monsters", to: "/monsters" }, { label: monster.name.value }]} />

      <header className="item-detail__header">
        <SkillIcon src={monster.icon.value ? publicUrl(monster.icon.value) : null} alt="" size={56} />
        <div>
          <h2 className="item-detail__name">
            {monster.name.value} <span className="skill-summary__id">#{monster.slug}</span>
          </h2>
        </div>
      </header>

      <div className="skill-summary__row">
        <span className="skill-summary__label">Monster ID</span>
        <StatValue value={monster.monster_id.value} provenance={monster.monster_id.provenance} note={monster.monster_id.note} />
      </div>

      <section className="detail-panel__section">
        <h4>Combat stats</h4>
        <dl className="detail-panel__dl">
          <dt>Level</dt>
          <dd>
            <StatValue value={monster.stats.level.value} provenance={monster.stats.level.provenance} note={monster.stats.level.note} />
          </dd>
          <dt>HP</dt>
          <dd>
            <StatValue value={monster.stats.hp.value} provenance={monster.stats.hp.provenance} note={monster.stats.hp.note} />
          </dd>
          <dt>MP</dt>
          <dd>
            <StatValue value={monster.stats.mp.value} provenance={monster.stats.mp.provenance} note={monster.stats.mp.note} />
          </dd>
          <dt>Attack</dt>
          <dd>
            <StatValue value={monster.stats.attack.value} provenance={monster.stats.attack.provenance} note={monster.stats.attack.note} />
          </dd>
          <dt>Defense</dt>
          <dd>
            <StatValue value={monster.stats.defense.value} provenance={monster.stats.defense.provenance} note={monster.stats.defense.note} />
          </dd>
          <dt>Speed</dt>
          <dd>
            <StatValue value={monster.stats.speed.value} provenance={monster.stats.speed.provenance} note={monster.stats.speed.note} />
          </dd>
          <dt>EXP reward</dt>
          <dd>
            <StatValue value={monster.stats.exp_reward.value} provenance={monster.stats.exp_reward.provenance} note={monster.stats.exp_reward.note} />
          </dd>
        </dl>
        <p className="detail-panel__stats-note">
          Every field above is shown as "???" in the game's own Monster Info window until the server responds to
          an on-demand request for this specific monster — none exist in any recovered file.
        </p>
      </section>

      <section className="detail-panel__section">
        <h4>Drops & location</h4>
        <dl className="detail-panel__dl">
          <dt>Drop table</dt>
          <dd>
            <StatValue value={monster.drop_table.value} provenance={monster.drop_table.provenance} note={monster.drop_table.note} />
          </dd>
          <dt>Found in</dt>
          <dd>
            <StatValue value={monster.found_in.value} provenance={monster.found_in.provenance} note={monster.found_in.note} />
          </dd>
        </dl>
      </section>

      {spawnZones.length > 0 && (
        <section className="detail-panel__section">
          <h4>
            Found in these zones ({spawnZones.length} {spawnZones.length === 1 ? "zone" : "zones"})
          </h4>
          <p className="detail-panel__stats-note">
            Recorded from a live World Map capture — a real, separate data source from the "Found in" field
            above, which stays "Unknown" since nothing directly populates it.
          </p>
          <ul className="item-detail__gather-list">
            {spawnZones.map(({ zone, spawn }) => {
              const essenceItems = spawn.essence_item_ids.map((id) => itemsById.get(id)).filter((it): it is NonNullable<typeof it> => Boolean(it));
              return (
                <li key={zone.map_id} className="item-detail__gather-row">
                  <Link to={`/maps?zone=${zone.map_id}`} className="item-detail__gather-zone">
                    {zone.display_name.value}
                  </Link>
                  <ColorBadge label={ZONE_LAYER_LABEL[zone.layer]} color="var(--text-muted)" />
                  {zone.level.value != null && <span className="item-detail__gather-note">Lv. {zone.level.value}</span>}
                  {essenceItems.map((it) => (
                    <Link key={it.slug} to={`/items/${it.slug}`} className="item-detail__gather-note" title={`Essence drop: ${it.name.value}`}>
                      Essence: {it.name.value}
                    </Link>
                  ))}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="detail-panel__section">
        <h4>Source reference</h4>
        <dl className="detail-panel__dl">
          <dt>Resource</dt>
          <dd className="detail-panel__mono">{monster.source.resource_path}</dd>
          <dt>Behavior scene</dt>
          <dd className="detail-panel__mono">
            <StatValue
              value={monster.behavior_scene.value}
              provenance={monster.behavior_scene.provenance}
              note={monster.behavior_scene.note}
            />
          </dd>
          <dt>Texture</dt>
          <dd className="detail-panel__mono">
            {monster.source.texture_path ?? <StatValue value={null} provenance="unknown" note="sprite_frames is null in this monster's .tres." />}
            {monster.source.texture_path && <ProvenanceTag provenance="client_structured" />}
          </dd>
        </dl>
      </section>
    </div>
  );
}
