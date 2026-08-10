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
  full per-stat scaling tables are tagged `"server_runtime"` (shown as "Unknown"). Unlock prerequisites are the
  same (the client only stores a placeholder string).
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

## Maps & Leveling

No pipeline exists for either — there is nothing to extract. See the "Maps" and "Leveling" pages themselves
(`src/components/Maps/MapsStub.tsx`, `src/components/Leveling/LevelingStub.tsx`) for exactly what was checked
and why nothing more is recoverable from client files alone.

## Assets copied into the repo

Only the assets the site actually renders were copied out of the recovered project, under `public/assets/`:

- `public/assets/tree/skill_tree_combat_bare.png` / `skill_tree_combat_color_overlay.png` — the original
  576x546 combat tree background art.
- `public/assets/icons/*.png` — the 78 unique skill icon textures (see `data-pipeline/icon_mapping.json` for
  the skill_id → filename map).
- `public/assets/icons/items/*.png` — 1,181 item icons (see `data-pipeline/source/item-icon-manifest.json`).
- `public/assets/icons/monsters/*.png` — 133 monster icons, 2 monsters have no icon in the source (see
  `data-pipeline/source/monster-icon-manifest.json`).

No other game assets, and no game code, were copied. The installed game and the recovered project directory
were not modified.

## Updating for a future game build

Replace the source files each `build-*-data.mjs` script reads (the pre-parsed skill-tree JSON for skills; the
recovered project's `Resources/` folders for items/monsters, pointed at via `RECOVERED_PROJECT_ROOT`), then
re-run the relevant script(s) and, if any icons changed, `extract-icons.py`. The UI reads only the generated
JSON files, so no component code needs to change for a data refresh.
