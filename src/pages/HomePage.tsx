import { Link } from "react-router-dom";
import "./HomePage.css";

const SECTIONS: { to: string; title: string; blurb: string }[] = [
  { to: "/skills", title: "Skills", blurb: "The full 79-node combat skill tree, plus sortable skills and buffs tables." },
  { to: "/items", title: "Items", blurb: "Every item and piece of equipment recovered from the client — names, descriptions, icons." },
  { to: "/monsters", title: "Monsters", blurb: "Every monster in the recovered client, by name and icon." },
  { to: "/maps", title: "Maps", blurb: "What little zone/biome data exists client-side." },
  { to: "/leveling", title: "Leveling", blurb: "Character leveling & EXP — status of what's known." },
  { to: "/build-planner", title: "Build Planner", blurb: "Compose an equipment + skill loadout and share it." },
];

export function HomePage() {
  return (
    <div className="home-page">
      <h2>Soul's Remnant Reference</h2>
      <p className="home-page__intro">
        An unofficial, fan-made reference built from a recovered game client. Every piece of data is tagged
        with where it came from — verified client files, mined description text, or explicitly unknown where
        the game's server is the only source. Nothing here is guessed.
      </p>
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
