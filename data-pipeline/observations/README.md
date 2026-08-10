# Observations

Hand-captured runtime data, organized per domain — `skills/`, `items/`, `monsters/`. Each subfolder is read by
its matching `build-*-data.mjs` script and merged into the generated JSON automatically; see that subfolder's
own README for the exact capture hook and file shape.

Every merged field is tagged `"observed_live"` everywhere it appears in the UI — distinct from
`"client_structured"` (verified from static files) and `"server_runtime"` (confirmed absent from static
files). Multiple files in the same subfolder merge automatically, field-by-field, in filename-sort order — a
later file's fields win over an earlier one's, so you can drop in `2026-08-10-session1.json`,
`2026-08-11-session2.json`, etc. as you play more, without hand-merging anything yourself.

This directory (and its contents) is real recorded game data, not build output — it's meant to be committed,
same as the rest of `data-pipeline/`.

All three capture hooks (`data-pipeline/live-capture/*.gd`) require the same thing: a locally-running, live
game client you've patched yourself, connected to your own account. That only works if you accept the risk
that a modified/instrumented client may not be permitted by the game's ToS/EULA — that's a call for whoever
runs the capture to make, not something this pipeline enforces or assumes.
