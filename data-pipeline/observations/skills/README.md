Captured by `data-pipeline/live-capture/skill_logger_patch.gd`, consumed by `build-site-data.mjs`.
See `observation.example.json` in this folder for the expected shape.

`runtime-capture-*.json` files in this folder come from a different, higher-coverage source: a full server
skill-data export (all 79 combat skills at once, vs. the UI hook above which only records skills you actually
click on in-game) converted into this shape by
`data-pipeline/import-runtime-skill-capture.mjs <path-to-raw-export.json>`. Same `observed_live` provenance,
same merge logic — just a different capture method upstream. See `data-pipeline/README.md` for details.
