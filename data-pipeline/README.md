# Data pipeline

This directory documents where every domain's data comes from and how it was turned into
`src/data/{skills,items,monsters}.generated.json`. Nothing in the UI hard-codes game data — every page reads
one of these generated files.

## Provenance

- **Game**: Soul's Remnant (Steam app id `3479090`)
- **Build**: Steam playtest build `24640923`
- **Source client**: locally recovered/decompiled Godot 4 project at
  `C:\Users\Coffee\Documents\Codex\2026-08-10\i\work\souls_remnant_recovered`
  (not included in this repo — see "Assets copied into the repo" below)

## Shared infrastructure: `lib/`

`build-items-data.mjs` and `build-monsters-data.mjs` both read raw Godot `.tres` resource files directly (no
Godot runtime involved — just text), via two small shared modules:

- `lib/tres.mjs` — a minimal parser for the fixed handful of section shapes these files actually use
  (`[gd_resource]`, `[ext_resource]`, `[sub_resource]`, `[resource]`). Deliberately **not** a general-purpose
  Godot format parser — it exposes `scalarField(bodyText, name)` for pulling individual fields out of a
  section's raw text, rather than trying to fully parse array/dictionary literals (Godot's text format for
  those isn't valid JSON — unquoted `&"StringName"` literals, etc.).
- `lib/resolve-icon.mjs` — resolves a resource's icon (frame 0 of its "default" `SpriteFrames` animation)
  through both shapes that occur in practice: a plain texture, or an `AtlasTexture` crop out of a shared sheet.
  The atlas-crop case is common on both **equipment cosmetics and ~14% of plain item icons** — it's not an
  equipment-only edge case.

Every `build-*-data.mjs` script requires `RECOVERED_PROJECT_ROOT` (env var) pointing at the recovered project,
and is **dev-machine-only** — none of them run in CI. Their JSON output is committed to the repo like any other
source file; the GitHub Actions deploy workflow only ever runs `npm run build` against what's already checked
in.

## Skills

`data-pipeline/source/souls-remnant-skill-tree.json` — a pre-parsed export produced by an earlier pass over the
recovered `.tscn`/`.tres` files (not `lib/tres.mjs`-based; predates it).

`Resources/Skills/SkillData.gd`/`Skill.gd` make clear that a skill's **identity** data (id, name, description,
icon, passive flag, tree position, weapon/damage-type tags) is stored client-side as `SkillData` resources, but
a skill's **numeric balance** data (`base_power`, `power_per_level`, `cooldown`, `attack_per_second`,
`attack_count`, `duration`, `size`, per-stat scaling tables, `max_level`) lives on plain (non-`@export`) fields
of the runtime `Skill` class that the recovered code never assigns a literal value to — populated over the
network by the MMO server when the skill window opens. Consequently:

- Identity fields are tagged `"client_structured"`.
- Numeric scaling call-outs baked directly into description text (e.g. "13.11(+5.24/lv)% of max HP") are
  regex-extracted and tagged `"client_description"` — real numbers, sourced from prose, not guaranteed to be
  the *complete* set of a skill's effects.
- `base_power`, `power_per_level`, `cooldown`, `attack_per_second`, `attack_count`, `duration`, `max_level`, and
  full per-stat scaling tables are `"server_runtime"` (shown as "Unknown") **unless** a matching observation
  exists under `data-pipeline/observations/skills/` — see "Recovering server-runtime fields" below, all 79
  combat skills currently have one. Unlock prerequisites follow the same rule.
- Classification (`basic_attack`/`passive`/`buff_toggle`/`active`) is derived deterministically and tagged
  `"inferred"` when it depends on parsing description text.

Regenerate: `node data-pipeline/build-site-data.mjs` (reads the pre-parsed JSON above; no
`RECOVERED_PROJECT_ROOT` needed for this one script since its source is already an intermediate export).

See "Recovering server-runtime fields" below — skills have a capture hook too.

## Items

`Resources/Items/Database/**/*.tres` (1,181 files across the top level plus `weapons/`, `gathering_material/`,
`new_crafting_materials/` subfolders) and `Resources/Equipment/Database/**/*.tres` (320 files, each wrapping an
`ItemData` reference via `item_data = ExtResource(...)`).

- `item_id`, `name`, `description` (present on most but not all — 48/54 top-level weapon items have none), and
  icon are `"client_structured"`. One item (`SoulCrystal.tres`) has no `item_id` at all — items are keyed by a
  filename-derived slug, not `item_id`, for exactly this reason.
- `category` is derived from which subfolder a `.tres` lives in — `"client_structured"`.
- `equipment_slot` (for the 320 equipment-wrapped items) is cross-referenced from
  `Scenes/UI/dps_calculator_window.gd`'s slot-label array, corroborated independently by
  `Scenes/UI/equipment_window.gd`'s tooltip strings — two sources agree, but it's still a derived mapping, not
  a single declared field, so it's tagged `"inferred"`. Slot types `0` and `6` have no label in either source
  and render as "Unknown slot (type N)".
- Rarity, required level, and all stat modifiers are `"server_runtime"`/unknown — confirmed via `Item.gd`'s
  never-assigned placeholder defaults (`rarity: int = -1`, `required_level: int = 0`) and `ItemModifier.gd`
  having zero `@export` fields with no `.tres` files anywhere for it.

Regenerate:

```
RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered node data-pipeline/build-items-data.mjs
RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered python data-pipeline/extract-icons.py
```

The first writes `src/data/items.generated.json` and `data-pipeline/source/item-icon-manifest.json`; the
second turns that manifest into actual PNGs under `public/assets/icons/items/`.

## Monsters

`Resources/Monsters/Database/*.tres` (135 files, flat folder — includes `TestDummy.tres`, confirmed to be a
legitimate "Target Dummy" entry with a real name/scene/sprite, not a dev artifact).

- `monster_id`, `name`, icon, and the linked behavior scene are `"client_structured"`. Two monsters
  (`GiantSlime.tres`, `PuppeteerAnchor.tres`) have a literal `sprite_frames = null` in their source — a real
  data gap, not a parser failure — and get `icon: null` (renders the same "?" placeholder used everywhere else
  for a missing icon).
- Combat stats (level, HP, MP, ATK, DEF, SPD, EXP reward), drop table, and spawn location are all
  `"server_runtime"`/unknown — confirmed by `Scenes/UI/monster_info_window.gd` literally rendering `"???"` for
  each of these fields until the server responds to an on-demand per-monster request.

Regenerate:

```
RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered node data-pipeline/build-monsters-data.mjs
RECOVERED_PROJECT_ROOT=/path/to/souls_remnant_recovered python data-pipeline/extract-icons.py
```

(`extract-icons.py` handles both items' and monsters' manifests in one run if both exist.)

## Recovering server-runtime fields: `live-capture/` + `observations/`

Everything tagged `"server_runtime"` above genuinely doesn't exist in any recovered file — but all of it *is*
visible in-game, since the client's own UI renders it once the server has sent it for whatever you're currently
looking at. Three GDScript hooks under `data-pipeline/live-capture/`, one per domain, patch into the exact
function each UI screen already calls to display that data, and dump the now-populated fields to a JSON file:

| Domain | Patch | Hooks | Fires when |
|---|---|---|---|
| Skills | `skill_logger_patch.gd` | `Scenes/UI/skill_window.gd`'s `SpzcYip` | You click a skill in the skill tree. |
| Items | `item_logger_patch.gd` | `Scenes/UI/description_box.gd`'s `Xd_G9rg` | You hover any item (inventory, equipment, auction house, ground drops). |
| Monsters | `monster_logger_patch.gd` | `Scenes/UI/monster_info_window.gd`'s per-stat setters + drop callback | You open Monster Info on a monster (several stats arrive independently, hence several small insertion points instead of one). |

No network/protocol reverse-engineering is involved in any of the three — each hook just reads values the
client already has in memory after the server sent them, the same moment the game's own UI would show them to
you.

Drop the resulting dump(s) into the matching `data-pipeline/observations/{skills,items,monsters}/` subfolder
and re-run that domain's `build-*-data.mjs` — any field present there overrides the matching "Unknown" stat
with a real value tagged `"observed_live"`. Multiple dumps merge automatically, field-by-field, in
filename-sort order, so repeated play sessions accumulate without any manual merging.

One thing every domain's capture *doesn't* get you: monster EXP reward isn't shown anywhere in the Monster Info
window, so there's no UI call to hook for it — it stays unknown regardless of how much you play.

This only works against your own account and requires accepting the risk that a modified/instrumented client
may not be permitted by the game's ToS/EULA — that's a call for whoever runs the capture to make, not something
this pipeline enforces or assumes.

### Skills: full-coverage capture via `import-runtime-skill-capture.mjs`

Skills have a second, higher-coverage capture path in addition to the click-to-record hook above: a full server
skill-data export (all skills the server sends at login, not just the ones you click through in the UI) can be
converted directly into the same `observations/skills/` shape with:

```
node data-pipeline/import-runtime-skill-capture.mjs <path-to-raw-runtime-export.json>
node data-pipeline/build-site-data.mjs
```

The expected input is a JSON document with a top-level `skills` array where each entry carries `skill_id`,
`tree` (only `"Combat Skills"` entries are imported — the site doesn't model Life Skills yet), `base_power`,
`power_per_level`, `cooldown`, `duration_base`/`duration_per_level`, `attack_per_second`, `attack_count`,
`scalings` (`[{id, amount, per_level}]`), and `requirements` (`[{skill_id, skill_name, level}]`). All 79 combat
skills currently have observations from this path (captured 2026-08-11), so every previously-"Unknown"
`server_runtime` stat on the Skills page and in `wiki-export/` is now populated and tagged `"observed_live"`.

The export also includes fields the site doesn't model yet — `resource_cost_base/per_level` (HP/MP cost),
`mob_count_base/per_level` (target count), `size_base/per_level` (AoE radius), `animation_duration`,
`learn_costs`, and per-level `active_level_effects`/`passive_level_effects` — plus 17 Life Skills and 3
standalone skills (Roll, Search, Taming) outside the combat tree entirely. None of that is wired into the site
schema yet; it's sitting unused in the raw export if a future pass wants to add it.

## Maps & Leveling

**Leveling**: no pipeline exists — there is nothing to extract. See `src/components/Leveling/LevelingStub.tsx`
for exactly what was checked and why nothing is recoverable from client files alone.

**Maps**: this was wrong in an earlier pass of this README — the World Map *does* have real recoverable data,
and it's wired into the live site at `/maps` (`src/pages/MapsPage.tsx`), not just the wiki export.

`data-pipeline/build-maps-data.mjs` reads `data-pipeline/source/worldmap-zones.json` (see below for how that
file itself is produced) and writes `src/data/maps.generated.json` — no `RECOVERED_PROJECT_ROOT` needed, since
the source is already a parsed intermediate export, same relationship `build-site-data.mjs` has to its own
pre-parsed skill-tree source:

```
node data-pipeline/build-maps-data.mjs
```

Zone `display_name`/`x`/`y` and each resource's `resource_type` are `"client_structured"`; zone `level`,
each resource's `spawn_chance_percent`, and a present warp point's `unlocked` flag are `"observed_live"`,
tagged with the capture date. A monster spawn's `essence_item_ids` has the `0` sentinel (11/224 entries in the
current capture) filtered out — it means "no essence item," not "item #0". A `warp_point: null` on a zone is a
structural fact (this zone has no warp point) rather than an unknown value, and isn't wrapped in a provenance
field. Cross-links from Items/Monsters detail pages into zones (and vice versa) are computed at runtime in the
React app from the already-loaded generated JSON files (`src/utils/crossLinks.ts`), not baked in at pipeline
time — this keeps `build-maps-data.mjs`, `build-items-data.mjs`, and `build-monsters-data.mjs` independently
regenerable with no execution-order dependency between them.

One thing this capture is *not*: a monster's `essence_item_ids` and a zone's gathering `resources` are not the
same thing as a monster's actual combat loot/drop table. `monster_logger_patch.gd` (below) already has a hook
for capturing that, but no one has run it yet — `MonsterRecord.drop_table`, `ItemStats.rarity`,
`ItemStats.required_level`, and `ItemStats.modifiers` are still genuinely unknown and stay tagged
`"server_runtime"` on the site.

Original capture provenance: `Scenes/UI/world_map_window.tscn` bakes in the zone list (105 icon instances / 104
unique zones: 83 Surface, 22 Caves — `spawn` appears on both layers), each zone's display name, its
Surface-vs-Caves layer, and its position (Godot anchor-relative offsets on a `WorldMapMapIcon` node, measured
against a shared 355x264 box) — `"client_structured"`. Per-zone level, monster list, resource list (with spawn
chance %), and warp point status are `"server_runtime"` by default (requested on demand via
`world_map_window.gd`'s `Cmosn1p`/opcode 154) — *but* as of 2026-08-11 there's a full live capture covering all
104 zones, same idea as the skills capture above.

- `data-pipeline/build-worldmap-data.mjs <path-to-combined-capture.json>` reads a combined client+server capture
  (see `data-pipeline/observations/worldmap/README.md`) and writes `data-pipeline/source/worldmap-zones.json`.
  The pixel math: source background PNGs are 269x264, narrower than the 355-wide anchor box positions are
  measured against (`stretch_mode` `KEEP_ASPECT_CENTERED` letterboxes the image centered within that box), so
  box-space coordinates need a 43px horizontal offset to land in actual image pixel space — see the script's
  comments for the derivation, cross-checked against the capture's own independently-computed positions (exact
  match).
  - **Layer labeling**: the client's own `D9Qm8AN` dictionary (`world_map_window.gd`) — and the capture's
    `layer_label`, which just echoes that same dictionary — call layer 0 "Caves" and layer 1 "Surface". Every
    other signal disagrees: layer-0 zone names are outdoor biome names (`outskirts_west`, `plains_1`,
    `desert_1`, ...), layer-1 names are unambiguous cave names (`cave_1`, `deep_cave_N`, `frost_cave`,
    `hall_of_might`); layer-0's background art is a colorful multi-biome continent vs. layer-1's vertical
    underground cross-section; and layer-0 zones average level 37.7 (max 88) vs. layer-1's 50.1 (max 105),
    consistent with layer 0 being the beginner-accessible overworld. Going with what the data says (0=Surface,
    1=Caves) over the dict string, flagged loudly in the script — quickest way to fully confirm: open the World
    Map in-game somewhere obviously outdoors and check what the toggle button currently says.
- `wiki-export/make-worldmap-images.py` (`RECOVERED_PROJECT_ROOT` required — this one still reads image files
  directly from the recovered project, not the capture) upscales the three background PNGs (Surface, its
  path/road overlay, Caves) 4x with nearest-neighbor into `wiki-export/output/assets/`. The in-game Surface
  background is actually a 14-frame animated texture; the wiki export uses one static frame — the animation
  itself doesn't carry over.
- `wiki-export/build-worldmap-datamap.mjs` turns `worldmap-zones.json` into a
  [DataMaps](https://support.wiki.gg/wiki/DataMaps) document at `wiki-export/output/datamap-world-map.json`,
  with Surface/Caves as switchable backgrounds and each zone's popup showing level/monsters/resources/warp
  status tagged `"observed_live"`. Built the same way the combat-skill-tree DataMaps export was — best-effort
  against the schema and this wiki's confirmed quirks, not yet verified live (the skill tree needed several
  rounds of live tuning for marker anchor offsets and coordinate-space edge cases; expect this one might too).

## Assets copied into the repo

Only the assets the site actually renders were copied out of the recovered project, under `public/assets/`:

- `public/assets/tree/skill_tree_combat_bare.png` / `skill_tree_combat_color_overlay.png` — the original
  576x546 combat tree background art.
- `public/assets/icons/*.png` — the 78 unique skill icon textures (see `data-pipeline/icon_mapping.json` for
  the skill_id → filename map).
- `public/assets/icons/items/*.png` — 1,181 item icons (see `data-pipeline/source/item-icon-manifest.json`).
- `public/assets/icons/monsters/*.png` — 133 monster icons, 2 monsters have no icon in the source (see
  `data-pipeline/source/monster-icon-manifest.json`).
- `public/assets/maps/*.png` — World Map background art (Surface, Caves, the road overlay), upscaled via
  `wiki-export/make-worldmap-images.py`.
- `public/fonts/{04B_03__,GhastlyPixe,alagard}.{TTF,ttf}` — three of the pixel/fantasy fonts from
  `UI/Fonts/` in the recovered project. The site's visual style (dark + medium-purple palette, these same
  font families) is matched to soulsremnant.com's own stylesheet, but the font *files* themselves come from
  the recovered client, not scraped off the live site — 04B03 in particular is the exact font
  `Skill.gd`'s level-label uses in-game, not just a look-alike.

No other game assets, and no game code, were copied. The installed game and the recovered project directory
were not modified.

## Updating for a future game build

Replace the source files each `build-*-data.mjs` script reads (the pre-parsed skill-tree JSON for skills; the
recovered project's `Resources/` folders for items/monsters, pointed at via `RECOVERED_PROJECT_ROOT`), then
re-run the relevant script(s) and, if any icons changed, `extract-icons.py`. The UI reads only the generated
JSON files, so no component code needs to change for a data refresh.
