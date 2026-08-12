import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import rawMapsData from "../../data/maps.generated.json";
import type { MonsterRecord, WorldMapData } from "../../data/types";
import { DataTable, type Column } from "../common/DataTable";
import { SearchInput } from "../common/SearchInput";
import { SkillIcon } from "../common/SkillIcon";
import { StatValue } from "../common/Provenance";
import { publicUrl } from "../../utils/publicUrl";
import { buildMonsterZoneIndex } from "../../utils/crossLinks";
import "../SkillsTable/SkillsTable.css";
import "../BuffsTable/BuffsTable.css";

const mapsData = rawMapsData as unknown as WorldMapData;

export function MonstersTable({ monsters }: { monsters: MonsterRecord[] }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const monsterZoneIndex = useMemo(() => buildMonsterZoneIndex(mapsData.zones), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monsters;
    return monsters.filter((m) => m.name.value.toLowerCase().includes(q));
  }, [monsters, search]);

  const columns: Column<MonsterRecord>[] = useMemo(
    () => [
      {
        key: "icon",
        label: "",
        render: (m) => <SkillIcon src={m.icon.value ? publicUrl(m.icon.value) : null} alt="" size={26} />,
        width: "40px",
      },
      {
        key: "name",
        label: "Monster",
        sortable: true,
        accessor: (m) => m.name.value,
        render: (m) => <span className="skills-table__name">{m.name.value}</span>,
        width: "200px",
      },
      {
        key: "id",
        label: "ID",
        sortable: true,
        accessor: (m) => m.monster_id.value,
        render: (m) => <StatValue value={m.monster_id.value} provenance={m.monster_id.provenance} note={m.monster_id.note} />,
        width: "70px",
        align: "right",
      },
      {
        key: "level",
        label: "Level",
        sortable: false,
        render: (m) => <StatValue value={m.stats.level.value} provenance={m.stats.level.provenance} note={m.stats.level.note} />,
        width: "80px",
        align: "right",
      },
      {
        key: "hp",
        label: "HP",
        sortable: false,
        render: (m) => <StatValue value={m.stats.hp.value} provenance={m.stats.hp.provenance} note={m.stats.hp.note} />,
        width: "90px",
        align: "right",
        headerTitle: "Not present in any recovered file — shown as \"???\" in-game until the server responds to a Monster Info request",
      },
      {
        key: "attack",
        label: "ATK",
        sortable: false,
        render: (m) => <StatValue value={m.stats.attack.value} provenance={m.stats.attack.provenance} note={m.stats.attack.note} />,
        width: "80px",
        align: "right",
      },
      {
        key: "defense",
        label: "DEF",
        sortable: false,
        render: (m) => <StatValue value={m.stats.defense.value} provenance={m.stats.defense.provenance} note={m.stats.defense.note} />,
        width: "80px",
        align: "right",
      },
      {
        key: "speed",
        label: "SPD",
        sortable: false,
        render: (m) => <StatValue value={m.stats.speed.value} provenance={m.stats.speed.provenance} note={m.stats.speed.note} />,
        width: "80px",
        align: "right",
      },
      {
        key: "exp_reward",
        label: "EXP Reward",
        sortable: false,
        render: (m) => <StatValue value={m.stats.exp_reward.value} provenance={m.stats.exp_reward.provenance} note={m.stats.exp_reward.note} />,
        width: "110px",
        align: "right",
      },
      {
        key: "found_in",
        label: "Found In",
        sortable: false,
        render: (m) => <StatValue value={m.found_in.value} provenance={m.found_in.provenance} note={m.found_in.note} />,
        width: "120px",
      },
      {
        key: "zones",
        label: "Zones",
        sortable: true,
        accessor: (m) => (m.monster_id.value != null ? monsterZoneIndex.get(m.monster_id.value)?.length ?? 0 : 0),
        render: (m) => {
          const count = m.monster_id.value != null ? monsterZoneIndex.get(m.monster_id.value)?.length ?? 0 : 0;
          return count > 0 ? (
            <span title={`Spawns in ${count} zone${count === 1 ? "" : "s"}`}>{count}</span>
          ) : (
            <span className="skills-table__muted">—</span>
          );
        },
        width: "70px",
        align: "right",
        headerTitle: "Number of World Map zones this monster spawns in (from a live capture, separate from the freeform \"Found In\" field)",
      },
    ],
    [monsterZoneIndex]
  );

  return (
    <div className="skills-table-wrap">
      <div className="skills-table__controls">
        <SearchInput value={search} onChange={setSearch} placeholder="Search monster name…" label="Search monsters" />
      </div>

      <p className="buffs-table__note">
        Combat stats, drop tables, and spawn locations are shown as "???" in-game until the server responds to an
        on-demand request per monster — none exist in any recovered file. Name and icon are real, verified client
        data.
      </p>

      <div className="skills-table__status">
        Showing {filtered.length} of {monsters.length} monsters
        {search ? " — 1 filter active" : ""}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(m) => m.slug}
        onRowSelect={(m) => navigate(`/monsters/${m.slug}`)}
        defaultSort={{ key: "name", dir: "asc" }}
        caption="All monsters, sortable and searchable"
      />
    </div>
  );
}
