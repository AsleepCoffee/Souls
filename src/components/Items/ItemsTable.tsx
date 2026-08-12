import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import rawMapsData from "../../data/maps.generated.json";
import type { ItemRecord, WorldMapData } from "../../data/types";
import { ITEM_CATEGORIES, ITEM_CATEGORY_COLOR, ITEM_CATEGORY_LABEL } from "../../data/constants";
import { DataTable, type Column } from "../common/DataTable";
import { SearchInput } from "../common/SearchInput";
import { FilterChipGroup } from "../common/FilterChips";
import { ColorBadge } from "../common/Badge";
import { SkillIcon } from "../common/SkillIcon";
import { StatValue } from "../common/Provenance";
import { publicUrl } from "../../utils/publicUrl";
import { buildItemZoneIndex } from "../../utils/crossLinks";
import "../SkillsTable/SkillsTable.css";

const mapsData = rawMapsData as unknown as WorldMapData;

export function ItemsTable({ items }: { items: ItemRecord[] }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [equipOnly, setEquipOnly] = useState(false);
  const itemZoneIndex = useMemo(() => buildItemZoneIndex(mapsData.zones), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter.size > 0 && !categoryFilter.has(it.category.value)) return false;
      if (equipOnly && !it.equipment_slot.value) return false;
      if (
        q &&
        !it.name.value.toLowerCase().includes(q) &&
        !(it.description.value ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [items, search, categoryFilter, equipOnly]);

  const activeFilterCount = categoryFilter.size + (equipOnly ? 1 : 0) + (search ? 1 : 0);

  const columns: Column<ItemRecord>[] = useMemo(
    () => [
      {
        key: "icon",
        label: "",
        render: (it) => <SkillIcon src={publicUrl(it.icon.value)} alt="" size={26} />,
        width: "40px",
      },
      {
        key: "name",
        label: "Item",
        sortable: true,
        accessor: (it) => it.name.value,
        render: (it) => <span className="skills-table__name">{it.name.value}</span>,
        width: "220px",
      },
      {
        key: "id",
        label: "ID",
        sortable: true,
        accessor: (it) => it.item_id.value,
        render: (it) => <StatValue value={it.item_id.value} provenance={it.item_id.provenance} note={it.item_id.note} />,
        width: "70px",
        align: "right",
      },
      {
        key: "category",
        label: "Category",
        sortable: true,
        accessor: (it) => ITEM_CATEGORY_LABEL[it.category.value],
        render: (it) => <ColorBadge label={ITEM_CATEGORY_LABEL[it.category.value]} color={ITEM_CATEGORY_COLOR[it.category.value]} />,
        width: "150px",
      },
      {
        key: "equipment_slot",
        label: "Equip Slot",
        sortable: true,
        accessor: (it) => it.equipment_slot.value?.label ?? (it.equipment_slot.value ? `Type ${it.equipment_slot.value.type}` : null),
        render: (it) =>
          it.equipment_slot.value ? (
            <StatValue
              value={it.equipment_slot.value.label ?? `Unknown slot (type ${it.equipment_slot.value.type})`}
              provenance={it.equipment_slot.provenance}
              note={it.equipment_slot.note}
            />
          ) : (
            <span className="skills-table__muted">—</span>
          ),
        width: "140px",
      },
      {
        key: "rarity",
        label: "Rarity",
        sortable: false,
        render: (it) => <StatValue value={it.stats.rarity.value} provenance={it.stats.rarity.provenance} note={it.stats.rarity.note} />,
        width: "100px",
        headerTitle: "Not present in the recovered client for any item — assigned by the server per instance",
      },
      {
        key: "required_level",
        label: "Req. Lv",
        sortable: false,
        render: (it) => <StatValue value={it.stats.required_level.value} provenance={it.stats.required_level.provenance} note={it.stats.required_level.note} />,
        width: "90px",
        align: "right",
      },
      {
        key: "zones",
        label: "Zones",
        sortable: true,
        accessor: (it) => (it.item_id.value != null ? itemZoneIndex.get(it.item_id.value)?.length ?? 0 : 0),
        render: (it) => {
          const count = it.item_id.value != null ? itemZoneIndex.get(it.item_id.value)?.length ?? 0 : 0;
          return count > 0 ? (
            <span title={`Gatherable in ${count} zone${count === 1 ? "" : "s"}`}>{count}</span>
          ) : (
            <span className="skills-table__muted">—</span>
          );
        },
        width: "70px",
        align: "right",
        headerTitle: "Number of World Map zones this item can be gathered in",
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        render: (it) =>
          it.description.value ? (
            <span className="skills-table__description" title={it.description.value}>
              {it.description.value}
            </span>
          ) : (
            <StatValue value={null} provenance={it.description.provenance} note={it.description.note} />
          ),
        width: "340px",
      },
    ],
    [itemZoneIndex]
  );

  return (
    <div className="skills-table-wrap">
      <div className="skills-table__controls">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or description…" label="Search items" />
        <FilterChipGroup
          label="Category"
          options={ITEM_CATEGORIES}
          optionLabel={(c) => ITEM_CATEGORY_LABEL[c]}
          selected={categoryFilter as Set<(typeof ITEM_CATEGORIES)[number]>}
          colorFor={(c) => ITEM_CATEGORY_COLOR[c]}
          onToggle={(v) =>
            setCategoryFilter((prev) => {
              const next = new Set(prev);
              if (next.has(v)) next.delete(v);
              else next.add(v);
              return next;
            })
          }
          onClear={() => setCategoryFilter(new Set())}
        />
        <div className="filter-group">
          <div className="filter-group__label">Equipment</div>
          <div className="filter-group__chips">
            <button
              type="button"
              className={`filter-chip ${equipOnly ? "filter-chip--active" : ""}`}
              aria-pressed={equipOnly}
              onClick={() => setEquipOnly((v) => !v)}
            >
              Equippable only
            </button>
          </div>
        </div>
      </div>

      <div className="skills-table__status">
        Showing {filtered.length} of {items.length} items
        {activeFilterCount > 0 ? ` — ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(it) => it.slug}
        onRowSelect={(it) => navigate(`/items/${it.slug}`)}
        defaultSort={{ key: "name", dir: "asc" }}
        caption="All items and equipment, sortable and filterable"
      />
    </div>
  );
}
