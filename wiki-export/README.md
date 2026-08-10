# Wiki.gg export

Plain MediaWiki wikitext generated from the same `src/data/skills.generated.json` that powers the live site —
for regular wiki editors with no admin access, no extensions beyond the ones nearly every wiki.gg wiki already
has (core sortable tables + the `<imagemap>` extension), and no JavaScript.

This is a deliberately different, wiki-native reinterpretation of the site, not an embed of it. You lose live
pan/zoom, live filtering, and the APS calculator; you keep a normal-looking wiki page with a clickable tree
image and fully sortable data tables.

## What's in `output/`

| File | What it is |
|---|---|
| `assets/CombatSkillTree.png` | The tree background, flattened to one static image (bare linework + branch-color wash baked together, since wikitext can't do the live CSS blend). Upload this first. |
| `icon-upload-manifest.csv` | Every skill icon that needs uploading, with a suggested wiki filename. 78 files cover all 79 skills (Arrow Rain and Arrow Storm share one source icon — upload it once, reuse it). |
| `tree-imagemap.wikitext` | An `<imagemap>` block: 79 clickable circles at the tree's original coordinates, each linking to that skill's `#Anchor` section on the page. |
| `skills-table.wikitext` | The full 79-row sortable skills table. |
| `buffs-table.wikitext` | The 16-row sortable buffs/toggles/passive-stance table. |
| `scaling-values-table.wikitext` | Every level-scaling/multiplier number mined from description text, one row each (70 rows). |
| `skill-detail-sections.wikitext` | One `=== Skill Name ===` section per skill — the imagemap's link targets, and the closest wikitext equivalent of the site's detail panel. |
| `combat-skills-page.wikitext` | All of the above concatenated into one ready-to-paste page, in this order: tree → skills table → buffs table → scaling values → skill details. |

Regenerate everything after a data refresh with:

```
node data-pipeline/build-site-data.mjs   # if the source export changed
node wiki-export/build-wiki-export.mjs
python wiki-export/make-tree-image.py    # only if the tree art itself changed
```

## How to publish it

1. **Upload the tree image.** On the wiki, go to Special:Upload and upload `assets/CombatSkillTree.png`
   (keep the filename, or update `TREE_IMAGE_FILE` in `build-wiki-export.mjs` and regenerate if you rename it).
2. **Upload the icons** listed in `icon-upload-manifest.csv`, using the `suggested_wiki_filename` column as
   the upload filename. There are 78 unique files for 79 skills — the manifest flags the one reused pair.
3. **Create the page** (e.g. "Combat Skills") and paste in `combat-skills-page.wikitext`, or paste the
   individual section files into however many separate pages you'd prefer — each file is self-contained
   wikitext, so splitting them up later is just cut-and-paste.
4. **Preview before saving.** The imagemap and both `data-sort-value`-driven tables are easy to eyeball-check
   in the wiki's edit preview; check that the 79 circles line up with the icons in the preview image and that
   clicking one jumps to the right section.

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
