# Wiki.gg export

Generates wiki content from the same `src/data/skills.generated.json` that powers the live site, targeting the
real wiki at **soulsremnant.wiki.gg**, which already has a populated Skills page (written independently of this
project — Macros, Loadouts, Buff mechanics, Passive breakpoints, etc. aren't modeled here and shouldn't be
overwritten). What this directory is actually for right now: adding an interactive combat skill tree to that
page via the wiki's [DataMaps](https://support.wiki.gg/wiki/DataMaps) extension (confirmed enabled, no `Map:`
page built yet). The plain-wikitext `<imagemap>`/table outputs are also generated as a no-extension fallback,
but since the wiki already has hand-written tables, treat those as optional reference material, not something
to paste over the existing page.

**Icons already exist on the wiki** — confirmed via `Template:Favicon/Paste`'s source
(`[[File:{{{Icon}}}.png]]`) and real usage on the live page, so a skill's icon file is just its exact display
name + `.png` (e.g. `Onslaught.png`, `Blue Moon.png`), **except** where that collides with another page on the
wiki, disambiguated as `"<Name> (Skill).png"` — confirmed for `Perseverance`, and *guessed* (unverified) for
`Melee`/`Range`/`Magic`/`Faith` since those are also the branch/category names. See
`icon-filename-reference.csv` — check any row marked `UNVERIFIED` before publishing. **No icon uploads should be
needed** for the other 74; the only new asset to upload is the tree background image itself (see below).

## What's in `output/`

| File | What it is |
|---|---|
| `assets/CombatSkillTree.png` | The tree background, flattened to one static image (bare linework + branch-color wash baked together, since wikitext can't do the live CSS blend). This is a new asset — it needs uploading regardless of whether another tree image already exists on the wiki, since marker positions are pixel-aligned specifically to this file's 576x546 layout. |
| `icon-filename-reference.csv` | Every skill's expected wiki filename (`<Name>.png`, or `<Name> (Skill).png` where flagged). Reference only — these should already exist on the wiki. |
| `upload/` | Fallback only: the tree image + all 78 icons from the recovered client, pre-named to match the reference CSV — only needed for any specific icon that turns out to actually be missing/broken on the wiki. Generate with `node wiki-export/prepare-icon-uploads.mjs`. |
| `tree-imagemap.wikitext` | An `<imagemap>` block: 79 clickable circles at the tree's original coordinates, each linking to that skill's `#Anchor` section on the page. |
| `datamap-combat-skills.json` | A [DataMaps](https://support.wiki.gg/wiki/DataMaps) map document — same 79 skill positions/icons, but as an interactive map with pan/zoom, per-branch toggles, search, and rich popups. Requires the DataMaps extension (on-request). See "DataMaps version" below. |
| `skills-table.wikitext` | The full 79-row sortable skills table. |
| `buffs-table.wikitext` | The 16-row sortable buffs/toggles/passive-stance table. |
| `scaling-values-table.wikitext` | Every level-scaling/multiplier number mined from description text, one row each (70 rows). |
| `skill-detail-sections.wikitext` | One `=== Skill Name ===` section per skill — the imagemap's link targets, and the closest wikitext equivalent of the site's detail panel. |
| `combat-skills-page.wikitext` | All of the above concatenated into one ready-to-paste page, in this order: tree → skills table → buffs table → scaling values → skill details. |
| `datamap-world-map.json` | A second DataMaps document, for the World Map (105 zones, Surface + Caves as switchable background layers). Not derived from `skills.generated.json` — see "World Map version" below. |
| `assets/WorldMapSurface.png` / `WorldMapPath.png` / `WorldMapCaves.png` | World Map background images (upscaled 4x, nearest-neighbor). New assets — need uploading regardless of any existing map image on the wiki. |

Regenerate everything after a data refresh with:

```
node data-pipeline/build-site-data.mjs   # if the source export changed
node wiki-export/build-wiki-export.mjs
node wiki-export/build-datamap.mjs       # only needed if the wiki has DataMaps enabled
python wiki-export/make-tree-image.py    # only if the tree art itself changed
node wiki-export/prepare-icon-uploads.mjs   # rebuild upload/ after either of the above changes icons
```

## DataMaps version (if the extension is enabled on your wiki)

`build-datamap.mjs` writes `output/datamap-combat-skills.json` — a [DataMaps](https://support.wiki.gg/wiki/DataMaps)
map document built from the exact same `position`/`icon`/`branch`/`description` fields as the live tree and the
`<imagemap>` above, just re-shaped into DataMaps' JSON format instead of wikitext. It gets you an actually
interactive tree on the wiki: real pan/zoom, per-branch show/hide toggles (the four groups — Melee, Range, Magic,
Faith — are each independently switchable), search-by-name, and a rich popup per skill (icon, description, known
scaling values, the same "assigned by the server at runtime" notice as everywhere else) instead of a bare hover
title.

This generator was built from wiki.gg's public DataMaps documentation and real example map pages on other
wiki.gg wikis, **not test-published against soulsremnant.wiki.gg itself** (the wiki isn't reachable for
automated fetching) — the exact JSON field names can shift slightly between DataMaps versions, so treat this as
a strong starting point, not a guaranteed drop-in. The wiki's own source editor validates the JSON on save and
will point out any field it doesn't recognize.

To publish it:

1. Check `icon-filename-reference.csv` for any row marked `UNVERIFIED` (currently: Melee, Range, Magic, Faith)
   — confirm their real filenames on the wiki (same way you found `Blue_Moon.png`/`Onslaught.png`: right-click
   an existing icon for that skill, or check Special:ListFiles) and tell me if they differ from the
   `"<Name> (Skill).png"` guess so I can regenerate.
2. Upload `output/assets/CombatSkillTree.png` (or the pre-named copy in `output/upload/`) via Special:Upload —
   this is the only new file that should need uploading.
3. Create a new page in the `Map:` namespace, e.g. `Map:Combat Skill Tree`, using the source editor, and paste
   in the full contents of `datamap-combat-skills.json`.
4. Save — the editor will flag any schema mismatch immediately. If a field name has moved in the DataMaps
   version the wiki runs, the error message names the offending property; fix it in `build-datamap.mjs` (or
   by hand in the pasted JSON) and re-save.
5. Embed it on the Skills page with `{{Map:Combat Skill Tree}}` (or `{{DataMap:Combat Skill Tree}}`, depending
   on the wiki's configured template — the source editor's own preview will confirm which one works).

## World Map version

`build-worldmap-datamap.mjs` writes `output/datamap-world-map.json` — a DataMaps document for the 105-icon/104-
zone World Map (83 Surface, 22 Caves), built from `data-pipeline/source/worldmap-zones.json` (see
`data-pipeline/README.md`'s "Maps & Leveling" section for how that's extracted and what is/isn't recoverable per
zone). Surface and Caves are separate switchable background layers, each with their own set of zone markers;
Surface also carries the in-game road/path art as an overlay. Each zone's popup shows its recommended level,
monster list (each with its own favicon), resources (grouped by Herbalism/Mining/Fishing, colored, each with its
own favicon), and whether it has a warp point — real data from a 2026-08-11 live capture, not placeholders. The
built-in search bar also matches on monster name, not just zone name.

**Confirmed live in-game**: the colorful multi-biome continent is "Surface" and the underground network is
"Caves" — the game's own internal dictionary string labels them backwards from this, but a real screenshot of
the in-game map (toggle button reading "Caves" while that continent view is showing) settled it.

Zones are grouped by their in-game per-zone tint (26 groups — most colors map to one biome, e.g. all `plains_N`
share one green, but a couple of colors are used on both a Surface entrance and actual Caves zones, so those
split into two groups to keep default visibility correct per layer). Markers render as plain `CircularMarkerGroup`
dots (fillColor + dark stroke) — the actual in-game marker is a tiny tinted-glow icon, and
`wiki-export/make-worldmap-marker-icons.py` can pre-render that per region color into `output/assets/markers/`
if it's worth revisiting, but wiring up per-region image markers here ran into enough positioning trouble that a
flat drawn circle is the current, more reliable choice — no image uploads needed for markers at all.

This one is still first-pass in one respect — hasn't been tested against the live wiki at all yet:

- **Layer switching**: `associatedLayer` is set on each background, matching each marker group's id, on the
  assumption that DataMaps ties marker-group visibility to the active background this way — genuinely
  unconfirmed (there's no schema documentation tying background `associatedLayer` to a specific marker-side
  field). If switching to Caves doesn't hide Surface zone markers (or vice versa), that's expected; groups are
  independently toggleable in the legend regardless, so the map is still usable either way.

To publish it:

1. Upload the three background images from `output/assets/`: `WorldMapSurface.png`, `WorldMapPath.png`,
   `WorldMapCaves.png` — these are new assets regardless of anything already on the wiki. No marker images
   needed — those are plain drawn circles.
2. Create a new page in the `Map:` namespace, e.g. `Map:World Map`, and paste in the full contents of
   `datamap-world-map.json`.
3. Save, fix whatever the validator flags (same iterative process as the skill tree map), and embed with
   `{{Map:World Map}}`.

Regenerate all of the above with:

```
node data-pipeline/build-worldmap-data.mjs <path-to-combined-capture.json>
node wiki-export/build-worldmap-datamap.mjs
python wiki-export/make-worldmap-images.py         # only if the source art itself changed
# make-worldmap-marker-icons.py not currently used — see note above
```

## Plain wikitext fallback (optional — the wiki already has hand-written tables)

`tree-imagemap.wikitext`, `skills-table.wikitext`, `buffs-table.wikitext`, `scaling-values-table.wikitext`, and
`skill-detail-sections.wikitext` are generated the same way, in case they're useful as a cross-check or a
starting point for filling gaps — but since soulsremnant.wiki.gg already has its own tables for this content,
don't paste `combat-skills-page.wikitext` over the live page. If you do want to use any of it, preview before
saving, and reuse the existing icon filenames the same way the DataMaps output does (already handled
automatically — both generators share `wiki-export/lib/icon-manifest.mjs`).

## Things that don't carry over from the live site

- **No live pan/zoom or drag.** The tree is one static image; `<imagemap>` gives clickable regions, not an
  interactive canvas. Readers get MediaWiki's normal image zoom/click-to-enlarge behavior instead.
- **No live search/multi-select filtering.** MediaWiki's built-in `sortable` class (already in every table
  here) lets readers sort by any column, but there's no text search or checkbox filtering without a JS gadget,
  which needs admin access to install.
- **No APS calculator.** That was an interactive tool; there's nothing to mine into static wikitext for it.
  The formula itself is documented in the main site's Compare Tools tab if you want to describe it in prose.
- **Sort direction and "Unknown" values.** Native MediaWiki sorting has no concept of "always push unknowns to
  the bottom regardless of direction" (which the live site does). Unknown numeric cells are given
  `data-sort-value="-1"` so they group predictably (first on ascending, last on descending) rather than sorting
  unpredictably — this is standard wiki-table practice, just less polished than the live site's behavior.
- **Tooltips are plain text.** The imagemap's hover text (name, branch, type) is a bare HTML `title` attribute
  — no icon, no description, no color. Readers click through to the `=== Skill Name ===` section for the full
  picture, same information as the site's detail panel, just one click away instead of instant.

## Attribution

Same source as the rest of the project: Soul's Remnant, Steam playtest build 24640923, recovered from the
local game client. `CombatSkillTree.png` is a derived asset (the original two-layer art flattened into one
PNG for wiki upload) — see `wiki-export/make-tree-image.py`. See the repo root `data-pipeline/README.md` for
the full provenance model these tables' "Unknown (server-only)" cells are following.
