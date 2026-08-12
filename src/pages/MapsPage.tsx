import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import rawMapsData from "../data/maps.generated.json";
import rawItemsData from "../data/items.generated.json";
import rawMonstersData from "../data/monsters.generated.json";
import type { ItemsData, MonstersData, WorldMapData, ZoneLayer } from "../data/types";
import { ZONE_LAYER_LABEL, ZONE_LAYERS } from "../data/constants";
import { buildItemByIdIndex, buildMonsterByIdIndex } from "../utils/crossLinks";
import { MapView } from "../components/Maps/MapView";
import { ZoneDetail } from "../components/Maps/ZoneDetail";
import { SearchInput } from "../components/common/SearchInput";
import { publicUrl } from "../utils/publicUrl";
import "../App.css";
import "../components/SkillsTable/SkillsTable.css";
import "../components/common/FilterChips.css";

const mapsData = rawMapsData as unknown as WorldMapData;
const itemsData = rawItemsData as unknown as ItemsData;
const monstersData = rawMonstersData as unknown as MonstersData;

const BACKGROUND_BY_LAYER: Record<ZoneLayer, string> = {
  0: "assets/maps/WorldMapSurface.png",
  1: "assets/maps/WorldMapCaves.png",
};

export function MapsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");

  const itemsById = useMemo(() => buildItemByIdIndex(itemsData.items), []);
  const monstersById = useMemo(() => buildMonsterByIdIndex(monstersData.monsters), []);

  const selectedZone = useMemo(() => {
    const zoneParam = searchParams.get("zone");
    if (!zoneParam) return null;
    return mapsData.zones.find((z) => z.map_id === zoneParam) ?? null;
  }, [searchParams]);

  const layer: ZoneLayer = selectedZone ? selectedZone.layer : searchParams.get("layer") === "1" ? 1 : 0;

  const zonesForLayer = useMemo(() => mapsData.zones.filter((z) => z.layer === layer), [layer]);

  function selectLayer(next: ZoneLayer) {
    setSearchParams({ layer: String(next) }, { replace: true });
  }

  function selectZone(mapId: string) {
    setSearchParams({ zone: mapId }, { replace: true });
  }

  function closeZone() {
    setSearchParams({ layer: String(layer) }, { replace: true });
  }

  return (
    <div className="app-panel">
      <div className="skills-table-wrap">
        <div className="skills-table__controls">
          <SearchInput value={search} onChange={setSearch} placeholder="Search zone name…" label="Search zones" />
          <div className="filter-group" role="group" aria-label="Layer">
            <div className="filter-group__label">Layer</div>
            <div className="filter-group__chips">
              {ZONE_LAYERS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`filter-chip ${layer === l ? "filter-chip--active" : ""}`}
                  aria-pressed={layer === l}
                  onClick={() => selectLayer(l)}
                >
                  {ZONE_LAYER_LABEL[l]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="skills-table__status">
          Showing {zonesForLayer.length} zones on {ZONE_LAYER_LABEL[layer]}
        </div>

        <div className="content-with-panel">
          <MapView
            zones={zonesForLayer}
            imageWidth={mapsData.meta.image_width}
            imageHeight={mapsData.meta.image_height}
            backgroundSrc={publicUrl(BACKGROUND_BY_LAYER[layer])}
            pathOverlaySrc={layer === 0 ? publicUrl("assets/maps/WorldMapPath.png") : undefined}
            searchQuery={search}
            selectedMapId={selectedZone?.map_id ?? null}
            onSelect={selectZone}
          />
          <ZoneDetail zone={selectedZone} onClose={closeZone} itemsById={itemsById} monstersById={monstersById} />
        </div>
      </div>
    </div>
  );
}
