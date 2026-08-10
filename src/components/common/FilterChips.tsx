import "./FilterChips.css";

export function FilterChipGroup<T extends string>({
  label,
  options,
  optionLabel,
  selected,
  onToggle,
  onClear,
  colorFor,
}: {
  label: string;
  options: T[];
  optionLabel?: (opt: T) => string;
  selected: Set<T>;
  onToggle: (opt: T) => void;
  onClear: () => void;
  colorFor?: (opt: T) => string | undefined;
}) {
  return (
    <div className="filter-group" role="group" aria-label={label}>
      <div className="filter-group__label">
        {label}
        {selected.size > 0 && (
          <button type="button" className="filter-group__clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      <div className="filter-group__chips">
        {options.map((opt) => {
          const active = selected.has(opt);
          const color = colorFor?.(opt);
          return (
            <button
              key={opt}
              type="button"
              className={`filter-chip ${active ? "filter-chip--active" : ""}`}
              aria-pressed={active}
              style={active && color ? { borderColor: color, color, background: `${color}22` } : undefined}
              onClick={() => onToggle(opt)}
            >
              {optionLabel ? optionLabel(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
