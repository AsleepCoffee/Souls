import { useMemo, useState } from "react";
import type { SkillRecord } from "../../data/types";
import { BRANCHES, BRANCH_COLOR } from "../../data/constants";
import { DataTable, type Column } from "../common/DataTable";
import { FilterChipGroup } from "../common/FilterChips";
import { SearchInput } from "../common/SearchInput";
import { BranchBadge } from "../common/Badge";
import { ProvenanceTag } from "../common/Provenance";
import "./ScalingExplorer.css";

interface EffectRow {
  key: string;
  skill: SkillRecord;
  kind: string;
  raw: string;
  base_value: number;
  per_level: number | null;
  is_percent: boolean;
  context: string;
}

export function ScalingExplorer({ skills }: { skills: SkillRecord[] }) {
  const [branchFilter, setBranchFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const rows: EffectRow[] = useMemo(() => {
    const out: EffectRow[] = [];
    for (const s of skills) {
      s.parsed_effects.forEach((eff, i) => {
        out.push({
          key: `${s.skill_id}-${i}`,
          skill: s,
          kind: eff.kind === "level_scaling" ? "Level scaling" : "Multiplier",
          raw: eff.raw,
          base_value: eff.base_value,
          per_level: eff.per_level,
          is_percent: eff.is_percent,
          context: eff.context,
        });
      });
    }
    return out;
  }, [skills]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (branchFilter.size > 0 && !branchFilter.has(r.skill.branch.value)) return false;
      if (q && !r.skill.name.value.toLowerCase().includes(q) && !r.context.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, branchFilter, search]);

  const columns: Column<EffectRow>[] = useMemo(
    () => [
      {
        key: "skill",
        label: "Skill",
        sortable: true,
        accessor: (r) => r.skill.name.value,
        render: (r) => <span className="skills-table__name">{r.skill.name.value}</span>,
        width: "160px",
      },
      {
        key: "branch",
        label: "Branch",
        sortable: true,
        accessor: (r) => r.skill.branch.value,
        render: (r) => <BranchBadge branch={r.skill.branch.value} />,
        width: "90px",
      },
      {
        key: "kind",
        label: "Kind",
        sortable: true,
        accessor: (r) => r.kind,
        render: (r) => r.kind,
        width: "110px",
      },
      {
        key: "base_value",
        label: "Base",
        sortable: true,
        accessor: (r) => r.base_value,
        render: (r) => (
          <span>
            {r.base_value}
            {r.is_percent ? "%" : ""}
          </span>
        ),
        width: "80px",
        align: "right",
      },
      {
        key: "per_level",
        label: "Per Level",
        sortable: true,
        accessor: (r) => r.per_level,
        render: (r) =>
          r.per_level != null ? (
            <span>
              {r.per_level > 0 ? "+" : ""}
              {r.per_level}
              {r.is_percent ? "%" : ""}
            </span>
          ) : (
            <span className="skills-table__muted">—</span>
          ),
        width: "90px",
        align: "right",
      },
      {
        key: "context",
        label: "In context",
        sortable: false,
        render: (r) => (
          <span className="scaling-explorer__context" title={r.context}>
            …{r.context}…
            <ProvenanceTag provenance="client_description" />
          </span>
        ),
        width: "360px",
      },
    ],
    []
  );

  return (
    <div className="scaling-explorer">
      <h3>Known scaling values (mined from descriptions)</h3>
      <p className="scaling-explorer__intro">
        Every row below is a real number pulled out of a skill's in-game description text with a pattern match for
        <code>BASE(+PER_LEVEL/lv)</code> and <code>xMULTIPLIER</code> call-outs — the only per-level scaling data
        that exists anywhere in the recovered client. It is a partial picture (not every effect a skill has is
        necessarily spelled out numerically in its description) and it is not the same as the structured
        <code>base_power</code>/<code>power_per_level</code> fields, which remain server-only. Use this to compare
        how branches phrase their scaling, not as a complete damage model.
      </p>

      <div className="skills-table__controls">
        <SearchInput value={search} onChange={setSearch} placeholder="Search skill or effect text…" label="Search scaling values" />
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
      </div>

      <div className="skills-table__status">
        {filtered.length} scaling values found across {skills.length} combat skills
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(r) => r.key}
        defaultSort={{ key: "skill", dir: "asc" }}
        caption="Scaling values extracted from skill description text, across all combat branches"
      />
    </div>
  );
}
