# Soul's Remnant — Combat Skill Reference

An unofficial, fan-made interactive reference for Soul's Remnant's combat skill tree, rebuilt from a locally
recovered game client (Steam playtest **build 24640923**). It reproduces the original 576×546 combat tree
layout and pixel-art icons, and adds sortable/filterable tables and comparison tools on top.

Not affiliated with the developer. No installed game files were modified — only the specific icon and
background assets the site renders were copied out, into `public/assets/`.

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

## Regenerating the site data

The tree/table/tool UI never hard-codes skill data — it reads `src/data/skills.generated.json`, produced by:

```
node data-pipeline/build-site-data.mjs
```

See [`data-pipeline/README.md`](data-pipeline/README.md) for exactly where every field comes from, what's
verified vs. inferred vs. unknown, and how to point the pipeline at a future game build.

## What's here

- **Skill Tree tab** — the full 79-node combat tree (Melee/Range/Magic/Faith), pannable and zoomable
  (scroll/pinch/drag), with keyboard focus support, a hover tooltip, and a persistent detail panel on click.
  No progression locking is reproduced — every combat node is shown, including any normally hidden ones.
- **Skills Table tab** — all 79 combat skills, sortable by every numeric/text column, searchable, and
  filterable by branch/classification/damage type (damage type supports multiple selections).
- **Buffs & Toggles tab** — the 16 buff/toggle/passive-stance skills, with affected stats, regen penalties,
  party-sharing, and stacking behavior mined from their in-game descriptions.
- **Compare Tools tab** — an attacks-per-second calculator with a visible formula, a branch structural
  comparison, and a "known scaling values" explorer listing every level-scaling/multiplier number that
  appears in the game's own skill description text.

## Publishing to a wiki.gg wiki

`wiki-export/` generates plain MediaWiki wikitext from the same data — sortable wiki-tables plus a clickable
`<imagemap>` tree — for wikis where you only have regular editing rights (no admin, no extensions, no JS).
See [`wiki-export/README.md`](wiki-export/README.md) for what it produces and how to paste it in.

```
node wiki-export/build-wiki-export.mjs
```

## On missing data

A large share of a skill's numeric balance — `base_power`, `power_per_level`, `cooldown`, `attack_per_second`,
`attack_count`, `duration`, full per-stat scaling tables, and exact unlock prerequisites — is assigned by
Soul's Remnant's MMO server at runtime and genuinely does not exist anywhere in the recovered client files
(confirmed by reading `Resources/Skills/Skill.gd`: those are plain, never-assigned fields on the runtime
`Skill` class). This site does not invent values for them. Every such field is shown as "Unknown" with a
tooltip explaining why, and tagged with its provenance (`client_structured` / `client_description` /
`observed_live` / `server_runtime` / `inferred` / `unknown`) everywhere it appears — in the tree tooltip, the
detail panel, and every table cell.

Those fields *are* visible in-game, though (the skill window displays them once a skill's server data has
loaded) — `data-pipeline/live-capture/` has a hook for recording them from your own live-connected client, and
`data-pipeline/observations/` is where the pipeline picks up whatever you capture. See
[`data-pipeline/README.md`](data-pipeline/README.md#recovering-the-server-runtime-fields-live-capture--observations)
for how it works and the ToS/account-risk caveat that comes with running a modified client.

## Tech

Vite + React + TypeScript, no UI framework. Data pipeline is a small standalone Node script (see above) so
the game-data refresh path stays independent of the UI code.
