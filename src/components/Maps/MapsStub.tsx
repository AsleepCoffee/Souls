import "./MapsStub.css";

const BIOMES = [
  "Beach", "Cave", "Deep Cave", "Deep Desert", "Deep Forest", "Deep Ocean", "Desert", "Forest",
  "Mech", "Misty Forest", "Ocean", "Outskirts", "Plains", "Plains Dungeon", "Rocky Path", "Savannah",
  "Snowy Mountain", "Spawn", "Sulfuric Plains", "Waterfall Graveyard", "White",
];

export function MapsStub() {
  return (
    <div className="maps-stub">
      <h2>Maps</h2>
      <p>
        There is no zone database to show here. Soul's Remnant streams its overworld to the client as raw tile
        chunks at runtime — zone names, coordinates, level ranges, and monster-spawn locations are all sent by
        the server on demand (confirmed in <code>channel_packet_handler.gd</code> and
        <code> dungeon_entrance_window.gd</code>), and none of it is stored in any recovered file. Even the
        client-side tile cache (<code>MapCache.gd</code>) only keeps anonymous chunk coordinates, never a zone
        name.
      </p>
      <p>
        The one thing that <em>is</em> real, client-side data: 21 named parallax background scenes, used purely
        as cosmetic backdrop art behind gameplay. These are theme/biome names, not a verified list of in-game
        zones — there's no guarantee of a 1:1 mapping, and no level ranges or monster lists are attached to any
        of them.
      </p>
      <ul className="maps-stub__biomes">
        {BIOMES.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="maps-stub__footnote">
        A real Maps section would need either live packet capture while playing (see{" "}
        <code>data-pipeline/live-capture/</code> for the pattern already used for skill stats) or
        community-sourced documentation — not something this pipeline can mine from client files alone.
      </p>
    </div>
  );
}
