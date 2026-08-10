# Item runtime data logger — paste into your local recovered project.
#
# Where: Scenes/UI/description_box.gd
#
# 1. Paste this whole function anywhere at file scope (e.g. directly above
#    `func Xd_G9rg(...)`).
# 2. Add exactly one line — `_log_item_runtime_data(G0cteiX)` — as the very
#    first line inside `func Xd_G9rg(QZ6wiCm, pnn6gmo, iS0xujk, xumtEW0,
#    RvMBCCF, fVGfs_Z, G0cteiX : Item):`, before anything else in that
#    function body.
#
# What it does: Xd_G9rg is the function that populates the item tooltip —
# it fires every time you hover an item anywhere (inventory, equipment
# window, auction house, a drop on the ground, etc.), and by that point the
# `Item` instance has real server-populated rarity/required_level/modifiers.
# This dumps those fields to a JSON file, keyed by item_id, merging into
# whatever's already there so repeated sessions accumulate.
#
# Output path: user://item_runtime_dump.json (same folder as
# skill_runtime_dump.json if you've also applied that patch — see
# %APPDATA%\Godot\app_userdata\<project name>\ on Windows).
#
# To use the result: copy the file into
# data-pipeline/observations/items/item_runtime_dump.json in the site's
# repo, then run `node data-pipeline/build-items-data.mjs` (with
# RECOVERED_PROJECT_ROOT still set — the merge step doesn't re-touch the
# recovered project, but the script expects the env var regardless).

func _log_item_runtime_data(it: Item) -> void:
	if it == null or it.item_data == null:
		return
	var path := "user://item_runtime_dump.json"
	var data: Dictionary = {}
	if FileAccess.file_exists(path):
		var f := FileAccess.open(path, FileAccess.READ)
		var txt := f.get_as_text()
		f.close()
		var parsed = JSON.parse_string(txt)
		if parsed is Dictionary:
			data = parsed
	var modifiers_out: Array = []
	for m in it.modifiers:
		modifiers_out.append({
			"modifier_id": m.modifier_id,
			"type": m.type,
			"value": m.value,
			"tier": m.tier,
			"line": m.line,
			"scales_per_level": m.scales_per_level,
			"upgrades": m.upgrades,
			"description": m.get_description(),
		})
	var key := str(it.item_data.item_id)
	data[key] = {
		"item_id": it.item_data.item_id,
		"name": it.item_data.name,
		"rarity": it.rarity,
		"required_level": it.required_level,
		"modifiers": modifiers_out,
		"recorded_at_unix": Time.get_unix_time_from_system(),
	}
	var out := FileAccess.open(path, FileAccess.WRITE)
	out.store_string(JSON.stringify(data, "\t"))
	out.close()
	print("[item-logger] recorded ", it.item_data.name, " (id ", it.item_data.item_id, ") -> ", path)
