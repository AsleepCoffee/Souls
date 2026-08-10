# Observations

Drop JSON dumps produced by `data-pipeline/live-capture/skill_logger_patch.gd` here (any filename ending in
`.json`), then re-run `node data-pipeline/build-site-data.mjs`. Every field present in a dump overrides the
matching skill's "Unknown (server-only)" stat with a real value, tagged `observed_live` everywhere it appears
in the UI — distinct from `client_structured` (verified from static files) and `server_runtime` (confirmed
absent from static files).

Multiple files merge automatically, field-by-field, in filename-sort order — a later file's fields win over an
earlier one's for the same skill, so you can drop in `2026-08-10-session1.json`,
`2026-08-11-session2.json`, etc. as you play more, without hand-merging anything yourself.

See `data-pipeline/live-capture/skill_logger_patch.gd` for exactly what gets captured and how, and
`observation.example.json` in this directory for the expected shape.

This directory (and its contents) is real recorded game data, not build output — it's meant to be committed,
same as the rest of `data-pipeline/`.
