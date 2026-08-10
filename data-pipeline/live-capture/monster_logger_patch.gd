# Monster runtime data logger — paste into your local recovered project.
#
# Where: Scenes/UI/monster_info_window.gd
#
# Unlike the skill/item hooks (one function, one call site), this window's
# stats arrive as several independent server-driven property setters, so
# there are more insertion points — still one line each, no logic to write.
#
# 1. Paste the `_log_monster_snapshot()` function below anywhere at file
#    scope (e.g. above `func cKQRaIq(...)`).
# 2. Add exactly one line — `_log_monster_snapshot()` — as the LAST line
#    inside EACH of these existing setter functions (they fire independently
#    as the server sends each stat, typically when you open the Monster Info
#    window on a monster you've flagged/researched):
#      func T81WIuJ(JtQaruY):   (sets `level`)
#      func rVX1TaD(xUKIGlt):   (sets `hp`)
#      func YXaZfFY(ceKXisn):   (sets `mp`)
#      func wHqE8NV(rrWyUbi):   (sets `i7iMrhE`, i.e. attack)
#      func FIuIbQp(Dr0Jk2M):   (sets `DIFKiD3`, i.e. speed)
#      func YPrSxay(H1ThLwt):   (sets `aLJE3oJ`, i.e. defense)
#      func q0lj8iM():          (sets kills/shinies-killed display; called by
#                                 both the kills and shinies setters already)
#      func do6oAgb(LpyDk2D):   (sets `ZJXOU4c`, i.e. the "Found in" string)
# 3. Also add `_log_monster_drop(RUZMPzf, wTOIJde, q_X63Kq)` as the first
#    line inside `func tlVCfLU(RUZMPzf : int, wTOIJde : float, q_X63Kq : String):`
#    — this is the per-drop callback for the "Unique Drops" list.
#
# It's fine (harmless, just slightly redundant) that this writes the file
# once per incoming stat rather than once per monster — every write merges
# into the same on-disk dict, so the end result after all of a monster's
# stats have arrived is a single complete entry either way.
#
# Output path: user://monster_runtime_dump.json
#
# To use the result: copy the file into
# data-pipeline/observations/monsters/monster_runtime_dump.json in the
# site's repo, then run `node data-pipeline/build-monsters-data.mjs`.

func _log_monster_snapshot() -> void:
	if monster_id <= 0:
		return
	var path := "user://monster_runtime_dump.json"
	var data: Dictionary = {}
	if FileAccess.file_exists(path):
		var f := FileAccess.open(path, FileAccess.READ)
		var txt := f.get_as_text()
		f.close()
		var parsed = JSON.parse_string(txt)
		if parsed is Dictionary:
			data = parsed
	var key := str(monster_id)
	var existing: Dictionary = data.get(key, {})
	existing["monster_id"] = monster_id
	existing["level"] = level
	existing["hp"] = hp
	existing["mp"] = mp
	existing["attack"] = i7iMrhE
	existing["defense"] = aLJE3oJ
	existing["speed"] = DIFKiD3
	existing["kills"] = kills
	existing["shinies_killed"] = d8O5L30
	existing["found_in"] = ZJXOU4c
	existing["recorded_at_unix"] = Time.get_unix_time_from_system()
	data[key] = existing
	var out := FileAccess.open(path, FileAccess.WRITE)
	out.store_string(JSON.stringify(data, "\t"))
	out.close()

func _log_monster_drop(item_id: int, chance: float, source: String) -> void:
	if monster_id <= 0:
		return
	var path := "user://monster_runtime_dump.json"
	var data: Dictionary = {}
	if FileAccess.file_exists(path):
		var f := FileAccess.open(path, FileAccess.READ)
		var txt := f.get_as_text()
		f.close()
		var parsed = JSON.parse_string(txt)
		if parsed is Dictionary:
			data = parsed
	var key := str(monster_id)
	var existing: Dictionary = data.get(key, {"monster_id": monster_id})
	var drops: Array = existing.get("drops", [])
	drops.append({"item_id": item_id, "chance": chance, "source": source})
	existing["drops"] = drops
	data[key] = existing
	var out := FileAccess.open(path, FileAccess.WRITE)
	out.store_string(JSON.stringify(data, "\t"))
	out.close()
	print("[monster-logger] recorded drop for monster ", monster_id, " -> ", path)
