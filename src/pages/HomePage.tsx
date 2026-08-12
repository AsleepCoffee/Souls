import { Link } from "react-router-dom";
import rawSiteData from "../data/skills.generated.json";
import rawItemsData from "../data/items.generated.json";
import rawMonstersData from "../data/monsters.generated.json";
import rawMapsData from "../data/maps.generated.json";
import type { ItemsData, MonstersData, SiteData, WorldMapData } from "../data/types";
import "./HomePage.css";

const siteData = rawSiteData as unknown as SiteData;
const itemsData = rawItemsData as unknown as ItemsData;
const monstersData = rawMonstersData as unknown as MonstersData;
const mapsData = rawMapsData as unknown as WorldMapData;

const SECTIONS: { to: string; title: string; blurb: string }[] = [
  { to: "/skills", title: "Skills", blurb: "The full 79-node combat skill tree, plus sortable skills and buffs tables — every numeric stat fully captured." },
  { to: "/items", title: "Items", blurb: "Every item and piece of equipment recovered from the client, with where-to-gather zones and spawn chance where known." },
  { to: "/monsters", title: "Monsters", blurb: "Every monster in the recovered client, cross-linked to the World Map zones it spawns in." },
  { to: "/maps", title: "Maps", blurb: "An interactive Surface/Caves World Map — zone levels, monster spawns, gathering resources with spawn chance, and warp points." },
  { to: "/leveling", title: "Leveling", blurb: "No EXP curve exists in any recovered file, but there's a player-contributed early-game route to level 10+." },
  { to: "/build-planner", title: "Build Planner", blurb: "Compose an equipment + skill loadout and share it." },
];

const STAT_TILES = [
  { label: "Combat skills", value: siteData.meta.total_combat_nodes },
  { label: "Items & equipment", value: itemsData.meta.total_items },
  { label: "Monsters", value: monstersData.meta.total_monsters },
  { label: "Zones mapped", value: mapsData.meta.total_zones },
];

export function HomePage() {
  return (
    <div className="home-page">
      <h2>Soul's Remnant Reference</h2>
      <p className="home-page__intro">
        An unofficial, fan-made reference built from a recovered game client. Every piece of data is tagged
        with where it came from — verified client files, mined description text, a live in-game capture, or
        explicitly unknown where the game's server is the only source. Nothing here is guessed. Press{" "}
        <kbd>Ctrl/⌘ K</kbd> anywhere to search across all of it.
      </p>

      <div className="home-page__stats">
        {STAT_TILES.map((t) => (
          <div key={t.label} className="home-page__stat">
            <span className="home-page__stat-value">{t.value.toLocaleString()}</span>
            <span className="home-page__stat-label">{t.label}</span>
          </div>
        ))}
      </div>

      <div className="home-page__grid">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="home-page__card">
            <h3>{s.title}</h3>
            <p>{s.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
