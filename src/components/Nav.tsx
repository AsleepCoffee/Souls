import { NavLink } from "react-router-dom";
import "./Nav.css";

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Home", end: true },
  { to: "/skills", label: "Skills" },
  { to: "/items", label: "Items" },
  { to: "/monsters", label: "Monsters" },
  { to: "/maps", label: "Maps" },
  { to: "/leveling", label: "Leveling" },
  { to: "/build-planner", label: "Build Planner" },
];

export function Nav() {
  return (
    <nav className="site-nav" aria-label="Site sections">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `site-nav__link ${isActive ? "site-nav__link--active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
