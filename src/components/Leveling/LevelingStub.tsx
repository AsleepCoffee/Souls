import "./LevelingStub.css";

export function LevelingStub() {
  return (
    <div className="leveling-stub">
      <h2>Leveling</h2>
      <p>
        There is no EXP curve, level cap, or stat-growth formula to show here — none exists in any recovered
        file. <code>character_stats.gd</code> stores <code>level</code> and <code>exp</code> as plain runtime
        integers with no default progression table; <code>level_up_popup.gd</code> (the "Level Up!" toast) is
        purely a cosmetic animation and doesn't even display the new level or EXP amount; and the closest thing
        to a constants file, <code>GlobalVars.gd</code>, has nothing level-related in it at all.
      </p>
      <p>
        EXP reward amounts that do appear in the client (e.g. dungeon completion rewards) are raw integers read
        directly out of a server response dictionary at the moment they're shown — not computed from any local
        table.
      </p>
      <p className="leveling-stub__footnote">
        Recovering an actual EXP curve would mean recording EXP-to-next-level at several character levels while
        playing and reverse-engineering the pattern — not something this pipeline can mine from client files
        alone.
      </p>
    </div>
  );
}
