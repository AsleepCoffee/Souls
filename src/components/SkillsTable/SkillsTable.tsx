import { useMemo, useState } from "react";
import type { SkillRecord } from "../../data/types";
import { BRANCHES, CLASSIFICATIONS, CLASSIFICATION_LABEL, BRANCH_COLOR, CLASSIFICATION_COLOR } from "../../data/constants";
import { DataTable, type Column } from "../common/DataTable";
import { SearchInput } from "../common/SearchInput";
import { FilterChipGroup } from "../common/FilterChips";
import { BranchBadge, ClassificationBadge, DamageTypeBadges } from "../common/Badge";
import { SkillIcon } from "../common/SkillIcon";
import { StatValue } from "../common/Provenance";
import { computeAttacksPerSecond, formatMs } from "../../utils/combat";
import { publicUrl } from "../../utils/publicUrl";
import "./SkillsTable.css";

const DAMAGE_TYPES = ["Melee", "Range", "Magic", "Faith"] as const;

export function SkillsTable({
  skills,
  onSelect,
  selectedId,
}: {
  skills: SkillRecord[];
  onSelect: (skill: SkillRecord) => void;
  selectedId: number | null;
}) {
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<Set<string>>(new Set());
  const [classFilter, setClassFilter] = useState<Set<string>>(new Set());
  const [damageFilter, setDamageFilter] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return skills.filter((s) => {
      if (branchFilter.size > 0 && !branchFilter.has(s.branch.value)) return false;
      if (classFilter.size > 0 && !classFilter.has(s.classification.value)) return false;
      if (damageFilter.size > 0 && !s.damage_types.value.some((t) => damageFilter.has(t))) return false;
      if (q && !s.name.value.toLowerCase().includes(q) && !s.description.value.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [skills, search, branchFilter, classFilter, damageFilter]);

  const activeFilterCount = branchFilter.size + classFilter.size + damageFilter.size + (search ? 1 : 0);

  const columns: Column<SkillRecord>[] = useMemo(
    () => [
      {
        key: "icon",
        label: "",
        render: (s) => <SkillIcon src={s.icon.value ? publicUrl(s.icon.value) : null} alt="" size={26} />,
        width: "40px",
      },
      {
        key: "name",
        label: "Skill",
        sortable: true,
        accessor: (s) => s.name.value,
        render: (s) => <span className="skills-table__name">{s.name.value}</span>,
        width: "180px",
      },
      {
        key: "id",
        label: "ID",
        sortable: true,
        accessor: (s) => s.skill_id,
        render: (s) => <span className="skills-table__mono">{s.skill_id}</span>,
        width: "56px",
        align: "right",
      },
      {
        key: "branch",
        label: "Branch",
        sortable: true,
        accessor: (s) => s.branch.value,
        render: (s) => <BranchBadge branch={s.branch.value} />,
        width: "100px",
      },
      {
        key: "classification",
        label: "Type",
        sortable: true,
        accessor: (s) => CLASSIFICATION_LABEL[s.classification.value],
        render: (s) => <ClassificationBadge classification={s.classification.value} />,
        width: "150px",
      },
      {
        key: "damage_types",
        label: "Damage",
        sortable: true,
        accessor: (s) => s.damage_types.value.join(","),
        render: (s) => <DamageTypeBadges types={s.damage_types.value} />,
        width: "130px",
      },
      {
        key: "base_power",
        label: "Base Power",
        sortable: true,
        accessor: (s) => s.stats.base_power.value,
        render: (s) => <StatValue value={s.stats.base_power.value} provenance={s.stats.base_power.provenance} note={s.stats.base_power.note} />,
        width: "100px",
        align: "right",
        headerTitle: "Not present in recovered client data for any combat skill — server-runtime only",
      },
      {
        key: "power_per_level",
        label: "Power / Lv",
        sortable: true,
        accessor: (s) => s.stats.power_per_level.value,
        render: (s) => <StatValue value={s.stats.power_per_level.value} provenance={s.stats.power_per_level.provenance} note={s.stats.power_per_level.note} />,
        width: "100px",
        align: "right",
      },
      {
        key: "cooldown",
        label: "Cooldown",
        sortable: true,
        accessor: (s) => s.stats.cooldown_ms.value,
        render: (s) => <StatValue value={formatMs(s.stats.cooldown_ms.value)} provenance={s.stats.cooldown_ms.provenance} note={s.stats.cooldown_ms.note} />,
        width: "100px",
        align: "right",
      },
      {
        key: "duration",
        label: "Duration",
        sortable: true,
        accessor: (s) => s.stats.duration_ms.value,
        render: (s) => <StatValue value={formatMs(s.stats.duration_ms.value)} provenance={s.stats.duration_ms.provenance} note={s.stats.duration_ms.note} />,
        width: "100px",
        align: "right",
      },
      {
        key: "aps",
        label: "Attacks / sec",
        sortable: true,
        accessor: (s) => computeAttacksPerSecond(s).value,
        render: (s) => {
          const r = computeAttacksPerSecond(s);
          return <StatValue value={r.value ? r.value.toFixed(2) : null} provenance="server_runtime" note={r.formula} />;
        },
        width: "110px",
        align: "right",
        headerTitle: "Computed as attack_count / (cooldown or duration in seconds); unknown where those timing fields are server-only",
      },
      {
        key: "max_level",
        label: "Max Lv",
        sortable: true,
        accessor: (s) => s.stats.max_level.value,
        render: (s) => <StatValue value={s.stats.max_level.value} provenance={s.stats.max_level.provenance} note={s.stats.max_level.note} />,
        width: "80px",
        align: "right",
      },
      {
        key: "scaling",
        label: "Scaling Attrs",
        sortable: false,
        render: (s) =>
          s.parsed_effects.length > 0 ? (
            <span className="skills-table__scaling" title={s.parsed_effects.map((e) => e.raw).join(", ")}>
              {s.parsed_effects.length} value{s.parsed_effects.length === 1 ? "" : "s"} in text
            </span>
          ) : (
            <span className="skills-table__muted">None found</span>
          ),
        width: "120px",
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        render: (s) => (
          <span className="skills-table__description" title={s.description.value}>
            {s.description.value}
          </span>
        ),
        width: "320px",
      },
    ],
    []
  );

  return (
    <div className="skills-table-wrap">
      <div className="skills-table__controls">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or description…" label="Search combat skills" />
        <FilterChipGroup
          label="Branch"
          options={BRANCHES}
          selected={branchFilter as Set<(typeof BRANCHES)[number]>}
          colorFor={(b) => BRANCH_COLOR[b]}
          onToggle={(v) =>
            setBranchFilter((prev) => {
              const next = new Set(prev);
              if (next.has(v)) next.delete(v);
              else next.add(v);
              return next;
            })
          }
          onClear={() => setBranchFilter(new Set())}
        />
        <FilterChipGroup
          label="Type"
          options={CLASSIFICATIONS}
          optionLabel={(c) => CLASSIFICATION_LABEL[c]}
          selected={classFilter as Set<(typeof CLASSIFICATIONS)[number]>}
          colorFor={(c) => CLASSIFICATION_COLOR[c]}
          onToggle={(v) =>
            setClassFilter((prev) => {
              const next = new Set(prev);
              if (next.has(v)) next.delete(v);
              else next.add(v);
              return next;
            })
          }
          onClear={() => setClassFilter(new Set())}
        />
        <FilterChipGroup
          label="Damage type (multi)"
          options={[...DAMAGE_TYPES]}
          selected={damageFilter as Set<(typeof DAMAGE_TYPES)[number]>}
          colorFor={(d) => BRANCH_COLOR[d as keyof typeof BRANCH_COLOR]}
          onToggle={(v) =>
            setDamageFilter((prev) => {
              const next = new Set(prev);
              if (next.has(v)) next.delete(v);
              else next.add(v);
              return next;
            })
          }
          onClear={() => setDamageFilter(new Set())}
        />
      </div>

      <div className="skills-table__status">
        Showing {filtered.length} of {skills.length} combat skills
        {activeFilterCount > 0 ? ` — ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(s) => s.skill_id}
        onRowSelect={onSelect}
        selectedKey={selectedId}
        defaultSort={{ key: "name", dir: "asc" }}
        caption="All combat skills, sortable and filterable"
      />
    </div>
  );
}
