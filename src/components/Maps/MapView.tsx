import type { ZoneRecord } from "../../data/types";
import "./MapView.css";

export function MapView({
  zones,
  imageWidth,
  imageHeight,
  backgroundSrc,
  pathOverlaySrc,
  searchQuery,
  selectedMapId,
  onSelect,
}: {
  zones: ZoneRecord[];
  imageWidth: number;
  imageHeight: number;
  backgroundSrc: string;
  pathOverlaySrc?: string;
  searchQuery: string;
  selectedMapId: string | null;
  onSelect: (mapId: string) => void;
}) {
  const q = searchQuery.trim().toLowerCase();

  return (
    <div className="map-view">
      <div className="map-view__frame" style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}>
        <img className="map-view__background" src={backgroundSrc} alt="" draggable={false} />
        {pathOverlaySrc && <img className="map-view__background map-view__path" src={pathOverlaySrc} alt="" draggable={false} />}
        {zones.map((zone) => {
          const matched = q.length === 0 || zone.display_name.value.toLowerCase().includes(q);
          const selected = zone.map_id === selectedMapId;
          return (
            <button
              key={zone.map_id}
              type="button"
              className={`map-view__marker ${selected ? "map-view__marker--selected" : ""} ${matched ? "" : "map-view__marker--dim"}`}
              style={
                {
                  left: `${(zone.x.value / imageWidth) * 100}%`,
                  top: `${(zone.y.value / imageHeight) * 100}%`,
                  "--marker-color": `rgb(${zone.color_rgb.value})`,
                  "--marker-color-soft": `rgba(${zone.color_rgb.value}, 0.45)`,
                } as React.CSSProperties
              }
              onClick={() => onSelect(zone.map_id)}
              title={`${zone.display_name.value}${zone.level.value != null ? ` (Lv. ${zone.level.value})` : ""}`}
            >
              <span className="visually-hidden">{zone.display_name.value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
