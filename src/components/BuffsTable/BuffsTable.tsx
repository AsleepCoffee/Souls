import { useMemo, useState } from "react";
import type { SkillRecord } from "../../data/types";
import { BRANCHES, BRANCH_COLOR } from "../../data/constants";
import { DataTable, type Column } from "../common/DataTable";
import { SearchInput } from "../common/SearchInput";
import { FilterChipGroup } from "../common/FilterChips";
import { BranchBadge, ClassificationBadge } from "../common/Badge";
import { SkillIcon } from "../common/SkillIcon";
import { ProvenanceTag } from "../common/Provenance";
import { publicUrl } from "../../utils/publicUrl";
import "../SkillsTable/SkillsTable.css";
import "./BuffsTable.css";

export function BuffsTable({
  skills,
  onSelect,
  selectedId,
}: {
  skills: SkillRecord[];
  onSelect: (skill: SkillRecord) => void;
  selectedId: number | null;
}) {
  const buffs = useMemo(() => skills.filter((s) => s.buff_details !== null), [skills]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return buffs.filter((s) => {
      if (branchFilter.size > 0 && !branchFilter.has(s.branch.value)) return false;
      if (q && !s.name.value.toLowerCase().includes(q) && !s.description.value.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [buffs, search, branchFilter]);

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
        label: "Buff",
        sortable: true,
        accessor: (s) => s.name.value,
        render: (s) => (
          <div>
            <div className="skills-table__name">{s.name.value}</div>
            <ClassificationBadge classification={s.classification.value} />
          </div>
        ),
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
        width: "90px",
      },
      {
        key: "affected_stats",
        label: "Affected stats",
        sortable: true,
        accessor: (s) => s.buff_details!.affected_stats.value.join(","),
        render: (s) =>
          s.buff_details!.affected_stats.value.length > 0 ? (
            <span title={s.buff_details!.affected_stats.value.join(", ")}>
              {s.buff_details!.affected_stats.value.slice(0, 3).join(", ")}
              {s.buff_details!.affected_stats.value.length > 3 ? "…" : ""}
            </span>
          ) : (
            <span className="skills-table__muted">Unclear from text</span>
          ),
        width: "170px",
      },
      {
        key: "base_bonus",
        label: "Base Bonus",
        sortable: true,
        accessor: (s) => s.parsed_effects[0]?.base_value ?? null,
        render: (s) =>
          s.parsed_effects[0] ? (
            <code className="buffs-table__code">
              {s.parsed_effects[0].raw}
              <ProvenanceTag provenance={s.parsed_effects[0].provenance} note="Parsed from description text — first scaling value mentioned; buffs often have several." />
            </code>
          ) : (
            <span className="skills-table__muted">—</span>
          ),
        width: "150px",
      },
      {
        key: "bonus_per_level",
        label: "Per Level",
        sortable: true,
        accessor: (s) => s.parsed_effects[0]?.per_level ?? null,
        render: (s) =>
          s.parsed_effects[0]?.per_level != null ? (
            <span>
              {s.parsed_effects[0].per_level > 0 ? "+" : ""}
              {s.parsed_effects[0].per_level}
              {s.parsed_effects[0].is_percent ? "%" : ""}
              /lv
            </span>
          ) : (
            <span className="skills-table__muted">—</span>
          ),
        width: "90px",
        align: "right",
      },
      {
        key: "duration",
        label: "Duration",
        sortable: true,
        accessor: (s) => s.buff_details!.duration_hints[0]?.raw ?? null,
        render: (s) =>
          s.buff_details!.duration_hints.length > 0 ? (
            <span title={s.buff_details!.duration_hints.map((h) => h.raw).join(", ")}>{s.buff_details!.duration_hints[0].raw}</span>
          ) : (
            <span className="skills-table__muted">Unknown (server) / not stated</span>
          ),
        width: "120px",
      },
      {
        key: "cooldown",
        label: "Cooldown",
        sortable: false,
        render: () => (
          <span className="skills-table__muted" title="Skill.cooldown is server-runtime only; not present in the recovered client for any skill">
            Unknown (server)
          </span>
        ),
        width: "110px",
      },
      {
        key: "regen_penalty",
        label: "MP/HP cost",
        sortable: true,
        accessor: (s) => s.buff_details!.regen_penalty?.base_value ?? null,
        render: (s) =>
          s.buff_details!.regen_penalty ? (
            <span>
              −{s.buff_details!.regen_penalty.base_value} (+{s.buff_details!.regen_penalty.per_level}/lv) {s.buff_details!.regen_penalty.resource} regen/tick
              <ProvenanceTag provenance={s.buff_details!.regen_penalty.provenance} />
            </span>
          ) : (
            <span className="skills-table__muted">None stated</span>
          ),
        width: "170px",
      },
      {
        key: "party_sharing",
        label: "Party sharing",
        sortable: true,
        accessor: (s) => (s.buff_details!.party_sharing.shares_with_party ? "Yes" : "No"),
        render: (s) => (s.buff_details!.party_sharing.shares_with_party ? <span className="buffs-table__yes">Shares</span> : <span className="skills-table__muted">Solo only</span>),
        width: "100px",
      },
      {
        key: "stacking",
        label: "Stacking",
        sortable: true,
        accessor: (s) => s.buff_details!.stacking_behavior.value,
        render: (s) => (
          <span title={s.buff_details!.stacking_behavior.note}>
            {s.buff_details!.stacking_behavior.value === "multiplicative" ? "Multiplicative" : "Unspecified"}
          </span>
        ),
        width: "110px",
      },
      {
        key: "restrictions",
        label: "Restrictions",
        sortable: false,
        render: (s) =>
          s.buff_details!.restrictions.snippets.length > 0 ? (
            <span title={s.buff_details!.restrictions.snippets.join(" ")} className="skills-table__scaling">
              {s.buff_details!.restrictions.snippets.length} note{s.buff_details!.restrictions.snippets.length === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="skills-table__muted">None</span>
          ),
        width: "100px",
      },
    ],
    []
  );

  return (
    <div className="skills-table-wrap">
      <div className="skills-table__controls">
        <SearchInput value={search} onChange={setSearch} placeholder="Search buffs & toggles…" label="Search buffs and toggles" />
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

      <p className="buffs-table__note">
        Includes toggle skills and "Passive stance" skills — the two buff-like categories in the recovered
        description text. Duration, cooldown, and full scaling tables are largely server-runtime-only; values shown
        here are either mined directly from the skill's in-game description (marked <em>Description</em>) or
        explicitly unknown.
      </p>

      <div className="skills-table__status">
        Showing {filtered.length} of {buffs.length} buffs/toggles ({buffs.length} of {skills.length} combat skills
        are buff-like)
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(s) => s.skill_id}
        onRowSelect={onSelect}
        selectedKey={selectedId}
        defaultSort={{ key: "name", dir: "asc" }}
        caption="Buff and toggle/stance combat skills, sortable and filterable"
      />
    </div>
  );
}
