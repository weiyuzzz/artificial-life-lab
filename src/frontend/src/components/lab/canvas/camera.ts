import { type Camera, useSimStore } from "@/store/useSimStore";

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 16;

/** Screen-space mapping of the world: screen = world * scale + offset. */
export interface View {
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function computeView(
  width: number,
  height: number,
  worldWidth: number,
  worldHeight: number,
  camera: Camera,
): View {
  const fit = Math.max(
    0.0001,
    Math.min(width / worldWidth, height / worldHeight) * 0.94,
  );
  const scale = fit * camera.zoom;
  return {
    width,
    height,
    worldWidth,
    worldHeight,
    scale,
    offsetX: width / 2 - (worldWidth / 2 + camera.panX) * scale,
    offsetY: height / 2 - (worldHeight / 2 + camera.panY) * scale,
  };
}

export function screenToWorld(view: View, sx: number, sy: number) {
  return {
    x: (sx - view.offsetX) / view.scale,
    y: (sy - view.offsetY) / view.scale,
  };
}

function clampPan(camera: Camera, ww: number, wh: number): Camera {
  return {
    zoom: camera.zoom,
    panX: Math.max(-ww / 2, Math.min(ww / 2, camera.panX)),
    panY: Math.max(-wh / 2, Math.min(wh / 2, camera.panY)),
  };
}

function currentView(width: number, height: number): View {
  const s = useSimStore.getState();
  const p = s.getEngine().params;
  return computeView(width, height, p.worldWidth, p.worldHeight, s.camera);
}

/** Zoom by `factor` keeping the world point under (sx, sy) fixed on screen. */
export function zoomAt(
  width: number,
  height: number,
  sx: number,
  sy: number,
  factor: number,
): void {
  const view = currentView(width, height);
  const { camera, setCamera } = useSimStore.getState();
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * factor));
  if (zoom === camera.zoom) return;
  const wp = screenToWorld(view, sx, sy);
  const nextScale = (view.scale / camera.zoom) * zoom;
  const ww = view.worldWidth;
  const wh = view.worldHeight;
  setCamera(
    clampPan(
      {
        zoom,
        panX: (width / 2 - sx) / nextScale + wp.x - ww / 2,
        panY: (height / 2 - sy) / nextScale + wp.y - wh / 2,
      },
      ww,
      wh,
    ),
  );
}

/** Pan by a screen-space delta in pixels. */
export function panBy(width: number, height: number, dx: number, dy: number) {
  const view = currentView(width, height);
  const { camera, setCamera } = useSimStore.getState();
  setCamera(
    clampPan(
      {
        zoom: camera.zoom,
        panX: camera.panX - dx / view.scale,
        panY: camera.panY - dy / view.scale,
      },
      view.worldWidth,
      view.worldHeight,
    ),
  );
}

export function fitWorld(): void {
  useSimStore.getState().setCamera({ zoom: 1, panX: 0, panY: 0 });
}
