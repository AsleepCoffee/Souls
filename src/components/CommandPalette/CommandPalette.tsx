import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import rawSiteData from "../../data/skills.generated.json";
import rawItemsData from "../../data/items.generated.json";
import rawMonstersData from "../../data/monsters.generated.json";
import rawMapsData from "../../data/maps.generated.json";
import type { ItemsData, MonstersData, SiteData, WorldMapData } from "../../data/types";
import { buildSearchIndex, SEARCH_KIND_COLOR, SEARCH_KIND_LABEL, type SearchEntry } from "../../utils/searchIndex";
import { SearchInput } from "../common/SearchInput";
import { SkillIcon } from "../common/SkillIcon";
import { ColorBadge } from "../common/Badge";
import { publicUrl } from "../../utils/publicUrl";
import "./CommandPalette.css";

const siteData = rawSiteData as unknown as SiteData;
const itemsData = rawItemsData as unknown as ItemsData;
const monstersData = rawMonstersData as unknown as MonstersData;
const mapsData = rawMapsData as unknown as WorldMapData;

const MAX_RESULTS = 40;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const index = useMemo(() => buildSearchIndex(siteData, itemsData, monstersData, mapsData), []);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return index.slice(0, MAX_RESULTS);
    return index
      .filter((e) => e.name.toLowerCase().includes(q))
      .map((e) => {
        const name = e.name.toLowerCase();
        // Rank exact/prefix matches above mid-string substring matches (e.g. searching
        // "slime" should surface the monster "Slime" above "Blue Slime Piece").
        const rank = name === q ? 0 : name.startsWith(q) ? 1 : 2;
        return { entry: e, rank };
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_RESULTS)
      .map((r) => r.entry);
  }, [index, search]);

  useEffect(() => {
    if (open) {
      setSearch("");
      // Focus after the backdrop/panel mount. SearchInput doesn't forward a ref, so reach
      // through the wrapping div for its native <input>.
      const id = window.setTimeout(() => searchWrapRef.current?.querySelector("input")?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function go(entry: SearchEntry) {
    navigate(entry.route);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="command-palette__backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search the site">
        <div
          className="command-palette__search"
          ref={searchWrapRef}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) go(results[0]);
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search skills, items, monsters, zones…"
            label="Search the whole site"
          />
        </div>
        <div className="command-palette__list scrollbar-thin">
          {results.length === 0 && <p className="command-palette__empty">No matches.</p>}
          {results.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className="command-palette__item"
              onClick={() => go(entry)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(entry);
              }}
            >
              <SkillIcon src={entry.icon ? publicUrl(entry.icon) : null} alt="" size={24} />
              <span className="command-palette__item-text">
                <span className="command-palette__item-name">{entry.name}</span>
                {entry.sublabel && <span className="command-palette__item-sub">{entry.sublabel}</span>}
              </span>
              <ColorBadge label={SEARCH_KIND_LABEL[entry.kind]} color={SEARCH_KIND_COLOR[entry.kind]} />
            </button>
          ))}
        </div>
        <div className="command-palette__footer">
          <span>{results.length >= MAX_RESULTS ? `Showing first ${MAX_RESULTS} — keep typing to narrow` : `${results.length} result${results.length === 1 ? "" : "s"}`}</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
