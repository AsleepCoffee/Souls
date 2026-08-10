import "./Tabs.css";

export type TabKey = "tree" | "skills" | "buffs" | "compare";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tree", label: "Skill Tree" },
  { key: "skills", label: "Skills Table" },
  { key: "buffs", label: "Buffs & Toggles" },
  { key: "compare", label: "Compare Tools" },
];

export function Tabs({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="tabs" role="tablist" aria-label="Site sections">
      {TABS.map((t) => (
        <button
          key={t.key}
          role="tab"
          type="button"
          aria-selected={active === t.key}
          className={`tabs__btn ${active === t.key ? "tabs__btn--active" : ""}`}
          onClick={() => onChange(t.key)}
          id={`tab-${t.key}`}
          aria-controls={`panel-${t.key}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
