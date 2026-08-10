Captured by `data-pipeline/live-capture/monster_logger_patch.gd` (hooks `Scenes/UI/monster_info_window.gd`'s
per-stat setters and the unique-drop callback), consumed by `build-monsters-data.mjs`. Keyed by `monster_id`.
See `observation.example.json` in this folder for the expected shape. Note: EXP reward isn't captured — it
isn't shown anywhere in the Monster Info window, so there's nothing to hook for it.
