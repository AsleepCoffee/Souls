Not consumed via the `loadObservations()`/`observedField()` pattern the skills/items/monsters domains use —
World Map zone data is combined enough (client-structured layout + server-captured detail in one file) that
`build-worldmap-data.mjs` reads a full capture export directly instead. Drop the capture JSON anywhere and run:

```
node data-pipeline/build-worldmap-data.mjs <path-to-combined-capture.json>
```

Expected shape: `{ icons: [{map_id, display_name, layer, position_centered: {center_x, center_y}, ...}],
server_details_by_map_id: { <map_id>: {level, monsters, resources, warp_point} } }`. See
`data-pipeline/build-worldmap-data.mjs` for exactly which fields are read.
