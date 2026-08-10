import { useMemo, useState } from "react";
import { SearchInput } from "../common/SearchInput";
import { SkillIcon } from "../common/SkillIcon";
import "./PickerOverlay.css";

export interface PickerOption {
  key: string;
  name: string;
  icon: string | null;
  sublabel?: string;
}

/** Lightweight searchable picker modal shared by the equipment and skill pickers. */
export function PickerOverlay({
  title,
  options,
  onSelect,
  onClose,
}: {
  title: string;
  options: PickerOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div className="picker-overlay__backdrop" onClick={onClose}>
      <div className="picker-overlay" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="picker-overlay__bar">
          <h3>{title}</h3>
          <button type="button" className="picker-overlay__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" label={`Search ${title}`} />
        <div className="picker-overlay__list scrollbar-thin">
          {filtered.length === 0 && <p className="picker-overlay__empty">No matches.</p>}
          {filtered.map((o) => (
            <button key={o.key} type="button" className="picker-overlay__item" onClick={() => onSelect(o.key)}>
              <SkillIcon src={o.icon} alt="" size={26} />
              <span className="picker-overlay__item-text">
                <span className="picker-overlay__item-name">{o.name}</span>
                {o.sublabel && <span className="picker-overlay__item-sub">{o.sublabel}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
