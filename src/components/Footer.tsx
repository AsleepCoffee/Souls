import "./Footer.css";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        Names, descriptions, icons, and layouts across this site are recovered from Soul's Remnant's local game
        client (Steam playtest build 24640923) for reference purposes. Numeric balance data (combat stats, item
        rarity/modifiers, monster stats, EXP curves) is assigned by the game's server at runtime and is largely
        not present in the recovered client — this site never fabricates those values. See each field's
        provenance tag, or <code>data-pipeline/README.md</code>, for exactly where every value comes from.
      </p>
    </footer>
  );
}
