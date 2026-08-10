# Skill runtime data logger — paste into your local recovered project.
#
# Where: Scenes/UI/skill_window.gd
#
# 1. Paste this whole function anywhere at file scope (e.g. directly above
#    `func SpzcYip(AKCjhhu : SkillData):`).
# 2. Add exactly one line — `_log_skill_runtime_data(AKCjhhu)` — as the very
#    first line inside `func SpzcYip(AKCjhhu : SkillData):`, before anything
#    else in that function body.
#
# What it does: every time the skill detail panel renders for a skill (i.e.
# every time you click a node in the skill tree), this dumps that skill's
# now-server-populated Skill fields to a JSON file, keyed by skill_id,
# merging into whatever's already there so repeated sessions accumulate.
# Nothing is sent anywhere; it's a local file only.
#
# Output path: user://skill_runtime_dump.json — on Windows this resolves to
# %APPDATA%\Godot\app_userdata\<project name>\skill_runtime_dump.json
# (run OS.get_user_data_dir() in the debugger if you're not sure of the
# exact folder name; it matches project.godot's config/name).
#
# To use the result: copy that file into
# data-pipeline/observations/skill_runtime_dump.json in the site's repo,
# then run `node data-pipeline/build-site-data.mjs`. Any field present in
# the dump overrides the corresponding "Unknown (server-only)" stat with a
# real, provenance-tagged value.

static func _log_skill_runtime_data(sd: SkillData) -> void:
	if sd == null or sd.skill == null:
		return
	var sk: Skill = sd.skill
	var path := "user://skill_runtime_dump.json"
	var data: Dictionary = {}
	if FileAccess.file_exists(path):
		var f := FileAccess.open(path, FileAccess.READ)
		var txt := f.get_as_text()
		f.close()
		var parsed = JSON.parse_string(txt)
		if parsed is Dictionary:
			data = parsed
	var key := str(sd.skill_id)
	data[key] = {
		"skill_id": sd.skill_id,
		"name": sd.name,
		"recorded_level": sk.level,
		"base_power": sk.base_power,
		"power_per_level": sk.power_per_level,
		"cooldown_ms": sk.cooldown,
		"duration_ms": sk.duration,
		"attack_per_second": sk.attack_per_second,
		"attack_count": sk.attack_count,
		"max_level": sk.max_level,
		"size": sk.size,
		"mob_count": sk.mob_count,
		"scaling": sk.PztI65W,
		"level_requirements": sk.vOYoJ1G,
		"recorded_at_unix": Time.get_unix_time_from_system(),
	}
	var out := FileAccess.open(path, FileAccess.WRITE)
	out.store_string(JSON.stringify(data, "\t"))
	out.close()
	print("[skill-logger] recorded ", sd.name, " (id ", sd.skill_id, ") -> ", path)
