# Data pipeline

This directory documents where the site's skill data comes from and how it was
turned into `src/data/skills.generated.json`.

## Provenance

- **Game**: Soul's Remnant (Steam app id `3479090`)
- **Build**: Steam playtest build `24640923`
- **Source client**: locally recovered/decompiled Godot project at
  `C:\Users\Coffee\Documents\Codex\2026-08-10\i\work\souls_remnant_recovered`
  (not included in this repo — see "Assets copied into the repo" below)
- **Parsed extraction**: `souls-remnant-skill-tree.json` /
  `souls-remnant-skill-tree.csv`, produced by an external parsing pass over
  the recovered `.tscn`/`.tres` files. A copy of the JSON used to build this
  site is checked in at `data-pipeline/source/souls-remnant-skill-tree.json`.

## What is, and is not, in the recovered client

The recovered client (`Resources/Skills/SkillData.gd`, `Resources/Skills/Skill.gd`,
`Scripts/Utility Objects/damage_math.gd`, `dps_math.gd`) makes clear that a
skill's **identity** data (id, name, description, icon, passive flag, tree
position, weapon/damage-type tags) is stored client-side as `SkillData`
resources, but a skill's **numeric balance** data (`base_power`,
`power_per_level`, `cooldown`, `attack_per_second`, `attack_count`,
`duration`, `size`, per-stat scaling tables, `max_level`) lives on plain
(non-`@export`) fields of the runtime `Skill` class that the recovered code
never assigns a literal value to — they are populated over the network by the
MMO server when the skill window opens. No `.tres`, `.tscn`, or `.gd` file in
the recovered project contains those numbers. This matches the brief: those
fields are "supplied by the MMO server at runtime and may not exist in the
recovered client files."

Consequently:

- Fields sourced from `SkillData` / the parsed JSON (id, name, description,
  branch, passive flag, icon path, tree x/y, hidden flag) are tagged
  `"client_structured"`.
- Numeric scaling call-outs that are baked directly into the description text
  (e.g. "13.11(+5.24/lv)% of max HP") are extracted with a regex and tagged
  `"client_description"` — real numbers, but sourced from prose, not a
  structured field, and not guaranteed to be the *complete* set of a skill's
  effects.
- `base_power`, `power_per_level`, `cooldown`, `attack_per_second`,
  `attack_count`, `duration`, `max_level`/level cap, and full per-stat scaling
  tables are tagged `"server_runtime"` and rendered as "Unknown — server
  runtime" in the UI. Nothing here is invented.
- Unlock prerequisites are tagged `"server_runtime"` for the same reason (the
  client only stores a placeholder string,
  `"Provided by the game server at runtime; not stored in the PCK"`).
- A skill's classification (`basic_attack` / `passive` / `buff_toggle` /
  `active`) is derived deterministically from structured + description data
  and tagged `"inferred"` when it depends on parsing the description text
  (e.g. detecting the literal phrase "A basic attack:" or "Toggle.").

## Assets copied into the repo

Only the assets the site actually renders were copied out of the recovered
project, under `public/assets/`:

- `public/assets/tree/skill_tree_combat_bare.png` and
  `skill_tree_combat_color_overlay.png` — the original 576x546 combat tree
  background art, from
  `Sprites/Skills/Skill Tree/skill_tree_combat_*.png`.
- `public/assets/icons/*.png` — the 78 unique skill icon textures referenced
  by the 79 combat nodes, copied from `Sprites/Skills/**` with their original
  filenames preserved (see `data-pipeline/icon_mapping.json` for the
  skill_id → filename map).

No other game assets, and no game code, were copied. The installed game and
the recovered project directory were not modified.

## Regenerating `src/data/skills.generated.json`

```
node data-pipeline/build-site-data.mjs
```

Reads `data-pipeline/source/souls-remnant-skill-tree.json`, filters to the 4
combat branches (Melee/Range/Magic/Faith), classifies each skill, extracts
description-embedded scaling numbers, and writes
`src/data/skills.generated.json` plus a `meta` block recording the Steam app
id, build id, generation timestamp, and this pipeline's version.

To update for a future game build: replace
`data-pipeline/source/souls-remnant-skill-tree.json` (and the copied assets,
if icons/positions changed) with a fresh export, then re-run the script. The
UI reads only the generated JSON, so no component code needs to change for a
data refresh.

## Recovering the server-runtime fields: `live-capture/` + `observations/`

Everything tagged `"server_runtime"` above is genuinely absent from every recovered
file — but it *is* visible in-game, since `skill_window.gd` renders it (`"Power: "`,
`"Duration: "`, etc.) once a skill's server data has arrived. `data-pipeline/live-capture/`
has a small GDScript hook (`skill_logger_patch.gd`) that a locally-running, live-connected
client can paste in to dump those now-populated `Skill` fields to a JSON file as you open
each skill in the tree — no network/protocol reverse-engineering involved, just reading
values the client already has in memory after the server sent them.

Drop the resulting dump(s) into `data-pipeline/observations/*.json` and re-run
`node data-pipeline/build-site-data.mjs` — any field present there overrides the matching
"Unknown (server-only)" stat with a real value tagged `"observed_live"`, distinct from
`"client_structured"` (static file) and `"server_runtime"` (confirmed still missing).
Multiple dumps merge automatically, field-by-field, in filename-sort order. See
`data-pipeline/live-capture/skill_logger_patch.gd` and `data-pipeline/observations/README.md`
for the exact patch and file format.

This only works against your own account and requires accepting the risk that a
modified/instrumented client may not be permitted by the game's ToS/EULA — that's a call
for whoever runs the capture to make, not something this pipeline enforces or assumes.
