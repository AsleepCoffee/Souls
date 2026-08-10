import { useCallback, useEffect, useRef, useState } from "react";

export interface PanZoomState {
  pan: { x: number; y: number };
  zoom: number;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;
const SMOOTH_MS = 260;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Drives pan + zoom for a fixed-size "world" (worldWidth x worldHeight)
 * rendered inside a responsive viewport. The world is auto-scaled to fit the
 * viewport (`baseScale`); `zoom` multiplies on top of that. Node coordinates
 * stay in the world's native pixel space, so relative positions never shift.
 */
export function usePanZoom(worldWidth: number, worldHeight: number) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [state, setState] = useState<PanZoomState>({ pan: { x: 0, y: 0 }, zoom: 1 });
  const [smooth, setSmooth] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const pinchState = useRef<{ startDist: number; startZoom: number; midX: number; midY: number } | null>(null);
  const smoothTimer = useRef<number | null>(null);

  /** Marks the next state update(s) as animatable (button zoom, reset, keyboard-focus pan) —
   * as opposed to drag/wheel/pinch, which must track the pointer 1:1 with no transition lag. */
  const triggerSmooth = useCallback(() => {
    setSmooth(true);
    if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    smoothTimer.current = window.setTimeout(() => setSmooth(false), SMOOTH_MS + 40);
  }, []);

  useEffect(() => () => {
    if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
  }, []);

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scale = Math.min(rect.width / worldWidth, rect.height / worldHeight);
    setBaseScale(scale > 0 ? scale : 1);
    setState({
      pan: {
        x: (rect.width - worldWidth * scale) / 2,
        y: (rect.height - worldHeight * scale) / 2,
      },
      zoom: 1,
    });
  }, [worldWidth, worldHeight]);

  const resetSmooth = useCallback(() => {
    triggerSmooth();
    fit();
  }, [triggerSmooth, fit]);

  useEffect(() => {
    fit();
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit]);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      setState((prev) => {
        const currentScale = baseScale * prev.zoom;
        const worldX = (mx - prev.pan.x) / currentScale;
        const worldY = (my - prev.pan.y) / currentScale;
        const nextZoom = clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        const nextScale = baseScale * nextZoom;
        return {
          zoom: nextZoom,
          pan: {
            x: mx - worldX * nextScale,
            y: my - worldY * nextScale,
          },
        };
      });
    },
    [baseScale]
  );

  const zoomButton = useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      triggerSmooth();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },
    [zoomAt, triggerSmooth]
  );

  /** Double-click/double-tap: zoom in a step centered on the click point. Shift+double-click zooms out. */
  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      triggerSmooth();
      zoomAt(clientX, clientY, factor);
    },
    [zoomAt, triggerSmooth]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      // Finer-grained than a raw 1:1 deltaY mapping so a single mouse-wheel
      // notch (~100-120 units) or trackpad scroll reads as a gentle step
      // rather than a jump.
      const factor = Math.exp(-e.deltaY * 0.001);
      zoomAt(e.clientX, e.clientY, factor);
    },
    [zoomAt]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: state.pan.x, panY: state.pan.y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pan.x, state.pan.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setState((prev) => ({ ...prev, pan: { x: dragState.current!.panX + dx, y: dragState.current!.panY + dy } }));
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    dragState.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  // Touch pinch-to-zoom (two fingers) layered on top of pointer-based pan.
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      dragState.current = null;
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setState((prev) => {
        pinchState.current = {
          startDist: dist,
          startZoom: prev.zoom,
          midX: (a.clientX + b.clientX) / 2,
          midY: (a.clientY + b.clientY) / 2,
        };
        return prev;
      });
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchState.current) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const factor = dist / pinchState.current.startDist;
        const el = viewportRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const mx = pinchState.current.midX - rect.left;
        const my = pinchState.current.midY - rect.top;
        setState((prev) => {
          const targetZoom = clamp(pinchState.current!.startZoom * factor, MIN_ZOOM, MAX_ZOOM);
          const currentScale = baseScale * prev.zoom;
          const worldX = (mx - prev.pan.x) / currentScale;
          const worldY = (my - prev.pan.y) / currentScale;
          const nextScale = baseScale * targetZoom;
          return {
            zoom: targetZoom,
            pan: { x: mx - worldX * nextScale, y: my - worldY * nextScale },
          };
        });
      }
    },
    [baseScale]
  );

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchState.current = null;
  }, []);

  /** Pans just enough to bring a world-space rect into view (for keyboard focus). */
  const ensureVisible = useCallback(
    (worldX: number, worldY: number, margin = 40) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setState((prev) => {
        const scale = baseScale * prev.zoom;
        const screenX = prev.pan.x + worldX * scale;
        const screenY = prev.pan.y + worldY * scale;
        let dx = 0;
        let dy = 0;
        if (screenX < margin) dx = margin - screenX;
        else if (screenX > rect.width - margin) dx = rect.width - margin - screenX;
        if (screenY < margin) dy = margin - screenY;
        else if (screenY > rect.height - margin) dy = rect.height - margin - screenY;
        if (dx === 0 && dy === 0) return prev;
        return { ...prev, pan: { x: prev.pan.x + dx, y: prev.pan.y + dy } };
      });
      triggerSmooth();
    },
    [baseScale, triggerSmooth]
  );

  return {
    viewportRef,
    scale: baseScale * state.zoom,
    zoomLevel: state.zoom,
    pan: state.pan,
    smooth,
    isDragging: () => dragState.current !== null,
    handlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    zoomIn: () => zoomButton(1.25),
    zoomOut: () => zoomButton(1 / 1.25),
    reset: resetSmooth,
    ensureVisible,
    zoomAtPoint,
  };
}
