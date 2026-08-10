import "./Header.css";

export function Header({ buildId, generatedAt }: { buildId: string; generatedAt: string }) {
  return (
    <header className="site-header">
      <div className="site-header__title-group">
        <h1 className="site-header__title">Soul's Remnant — Combat Skill Reference</h1>
        <p className="site-header__subtitle">
          Unofficial, fan-made reference rebuilt from a recovered game client. Not affiliated with the developer.
        </p>
      </div>
      <div className="site-header__meta">
        <span className="site-header__build-badge" title={`Data generated ${new Date(generatedAt).toLocaleString()}`}>
          Game data build: {buildId}
        </span>
      </div>
    </header>
  );
}
