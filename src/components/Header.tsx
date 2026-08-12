import { Link } from "react-router-dom";
import "./Header.css";

export function Header({
  buildId,
  generatedAt,
  onOpenSearch,
}: {
  buildId: string;
  generatedAt: string;
  onOpenSearch: () => void;
}) {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/.test(navigator.platform ?? navigator.userAgent);

  return (
    <header className="site-header">
      <div className="site-header__title-group">
        <h1 className="site-header__title">
          <Link to="/" className="site-header__title-link">
            Soul's Remnant Reference
          </Link>
        </h1>
        <p className="site-header__subtitle">
          Unofficial, fan-made wiki rebuilt from a recovered game client. Not affiliated with the developer.
        </p>
      </div>
      <div className="site-header__meta">
        <button type="button" className="site-header__search-trigger" onClick={onOpenSearch}>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="site-header__search-icon">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <line x1="13.4" y1="13.4" x2="18" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>Search everything</span>
          <kbd className="site-header__search-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <span className="site-header__build-badge" title={`Data generated ${new Date(generatedAt).toLocaleString()}`}>
          Game data build: {buildId}
        </span>
      </div>
    </header>
  );
}
