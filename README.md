# Soul's Remnant Reference

An unofficial, fan-made reference wiki for Soul's Remnant — skills, items, monsters, maps, leveling, and a
loadout planner — rebuilt from a locally recovered game client (Steam playtest **build 24640923**).

Not affiliated with the developer. No installed game files were modified — only the specific icon and
background assets the site renders were copied out, into `public/assets/`.

Live at: https://asleepcoffee.github.io/Souls/

## Running locally

```
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

Other scripts:

```
npm run build     # type-check (tsc -b) + production build to dist/
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

## What's here

| Route | Contents |
|---|---|
| `/skills` | The full 79-node combat skill tree (pan/zoom, keyboard nav, hover tooltip, detail panel), a sortable skills table, a buffs/toggles table, and attack-speed/scaling compare tools. |
| `/items` | 1,181 items + 320 equipment pieces, sortable/searchable/filterable by category and equipment slot, each with a detail page at `/items/:slug` — gathering-material items show every zone they can be gathered in and at what spawn chance. |
| `/monsters` | 135 monsters, sortable/searchable, each with a detail page at `/monsters/:slug` — cross-linked to every World Map zone the monster spawns in. |
| `/maps` | An interactive Surface/Caves World Map — all 105 zones, click a marker for its level, monster spawns, gathering resources (with spawn chance %), and warp point status. |
| `/leveling` | An honest "here's what little we know" page — no EXP curve or level cap exists in any recovered file. |
| `/build-planner` | A shareable equipment + skill loadout composer (not a DPS calculator — see below). |

Press **Ctrl/⌘ K** anywhere on the site to search skills, items, monsters, and zones in one place.

None of the UI hard-codes game data — every page reads a generated JSON file (`src/data/*.generated.json`)
produced by a standalone pipeline script. See [`data-pipeline/README.md`](data-pipeline/README.md) for exactly
where every field comes from, per domain, and how to point the pipeline at a future game build.

## Publishing to a wiki.gg wiki

`wiki-export/` generates plain MediaWiki wikitext (sortable wiki-tables plus a clickable `<imagemap>` tree) for
the combat skill tree specifically — for wikis where you only have regular editing rights (no admin, no
extensions, no JS). See [`wiki-export/README.md`](wiki-export/README.md). (Items/monsters aren't covered by
this export yet.)

```
node wiki-export/build-wiki-export.mjs
```

## On missing data

A large share of this game's numeric data — combat stats (base power, cooldowns, durations, scaling tables),
item rarity/required level/stat modifiers, monster HP/ATK/DEF/SPD/EXP/drop tables, and the entire EXP/leveling
curve — is assigned by Soul's Remnant's MMO server at runtime and genuinely does not exist anywhere in the
recovered client files (confirmed per-domain by reading the relevant `.gd` scripts — e.g. `Skill.gd`'s
never-assigned runtime fields, `Item.gd`'s placeholder defaults, `monster_info_window.gd` literally rendering
`"???"` until the server responds). This site never invents values for these. Every such field is shown as
"Unknown" with a tooltip explaining why, and tagged with its provenance (`client_structured` /
`client_description` / `observed_live` / `server_runtime` / `inferred` / `unknown`) everywhere it appears.

All of it *is* visible in-game, though — the client's own UI shows it once the server has sent it for whatever
you're looking at. `data-pipeline/live-capture/` has one GDScript hook per domain (skills, items, monsters) for
recording it from your own live-connected client, and `data-pipeline/observations/` is where each domain's
pipeline picks up whatever you capture. See
[`data-pipeline/README.md`](data-pipeline/README.md#recovering-server-runtime-fields-live-capture--observations)
for how it works and the ToS/account-risk caveat that comes with running a modified client.

**Skills are fully captured as of 2026-08-11** — all 79 combat skills' base power, power/level, cooldown,
duration, attacks/sec, per-stat scaling, and unlock requirements are populated from a live runtime export
(`data-pipeline/import-runtime-skill-capture.mjs`) and tagged `"observed_live"`.

**The World Map is also fully captured as of 2026-08-11** — all 105 zones' level, monster spawns, gathering
resources (with spawn chance %), and warp point status are populated and tagged `"observed_live"` (see
`/maps` above, and `data-pipeline/build-maps-data.mjs`). This is *not* the same thing as a monster's actual
combat loot/drop table, though — `MonsterRecord.drop_table`, `ItemStats.rarity`, `ItemStats.required_level`,
and `ItemStats.modifiers` still have no capture on file and remain "Unknown".

The Build Planner is a loadout composer, not a stat calculator, for the same reason — there's no honest number
to compute a "build score" from.

## Tech

Vite + React 19 + TypeScript + React Router (client-side routing, with the standard GitHub Pages 404.html
SPA-fallback trick since Pages has no server-side routing). No UI framework. The data pipeline is a set of
standalone Node scripts under `data-pipeline/` — see its README for the full breakdown — so the game-data
refresh path stays independent of the UI code.
