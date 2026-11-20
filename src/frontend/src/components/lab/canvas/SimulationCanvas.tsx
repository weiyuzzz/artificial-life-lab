import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { CanvasHud } from "./CanvasHud";
import { HoverTooltip } from "./HoverTooltip";
import { computeView, fitWorld, panBy, screenToWorld, zoomAt } from "./camera";
import { drawWorld, readPalette } from "./renderer";

interface Point {
  x: number;
  y: number;
}

const CLICK_SLOP = 5;

/** Live simulation viewport: rAF renderer decoupled from engine ticks, with camera interactions. */
export function SimulationCanvas() {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef({ moved: false, total: 0, pinchDist: 0 });
  const labelRef = useRef(t);
  labelRef.current = t;
  const [pointer, setPointer] = useState<(Point & { w: number }) | null>(null);
  const hoveredId = useSimStore((s) => s.hoveredId);

  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = el.clientWidth;
      const h = el.clientHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const palette = readPalette();
    let raf = 0;
    const frame = () => {
      const s = useSimStore.getState();
      const engine = s.getEngine();
      const { w, h, dpr } = sizeRef.current;
      if (w > 0 && h > 0) {
        const view = computeView(
          w,
          h,
          engine.params.worldWidth,
          engine.params.worldHeight,
          s.camera,
        );
        drawWorld(ctx, engine, view, dpr, palette, {
          selectedId: s.selectedId,
          hoveredId: s.hoveredId,
          overlays: s.overlays,
          selectedLabel: labelRef.current("canvas.selected", {
            id: s.selectedId ?? "",
          }),
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const { w, h } = sizeRef.current;
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016));
      zoomAt(w, h, e.clientX - rect.left, e.clientY - rect.top, factor);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const local = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pickAt = (p: Point) => {
    const s = useSimStore.getState();
    const engine = s.getEngine();
    const { w, h } = sizeRef.current;
    const view = computeView(
      w,
      h,
      engine.params.worldWidth,
      engine.params.worldHeight,
      s.camera,
    );
    const wp = screenToWorld(view, p.x, p.y);
    return engine.findOrganismAt(wp.x, wp.y, 9 / view.scale);
  };

  const pinchMetrics = () => {
    const [a, b] = [...pointersRef.current.values()];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, local(e));
    const g = gestureRef.current;
    if (pointersRef.current.size === 1) {
      g.moved = false;
      g.total = 0;
    } else if (pointersRef.current.size === 2) {
      g.moved = true;
      g.pinchDist = pinchMetrics().dist;
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    const pointers = pointersRef.current;
    const prev = pointers.get(e.pointerId);
    const { w, h } = sizeRef.current;
    if (!prev) {
      if (e.pointerType === "mouse") {
        useSimStore.getState().hover(pickAt(p)?.id ?? null);
        setPointer({ ...p, w });
      }
      return;
    }
    const g = gestureRef.current;
    if (pointers.size >= 2) {
      const before = pinchMetrics();
      pointers.set(e.pointerId, p);
      const after = pinchMetrics();
      panBy(w, h, after.mid.x - before.mid.x, after.mid.y - before.mid.y);
      if (g.pinchDist > 0) {
        zoomAt(w, h, after.mid.x, after.mid.y, after.dist / g.pinchDist);
      }
      g.pinchDist = after.dist;
      return;
    }
    pointers.set(e.pointerId, p);
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    g.total += Math.abs(dx) + Math.abs(dy);
    if (g.total > CLICK_SLOP) g.moved = true;
    if (g.moved) {
      panBy(w, h, dx, dy);
      setPointer(null);
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const pointers = pointersRef.current;
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (wasSingle && !gestureRef.current.moved) {
      useSimStore.getState().select(pickAt(local(e))?.id ?? null);
    }
    if (pointers.size === 1) gestureRef.current.pinchDist = 0;
  };

  const onPointerLeave = () => {
    useSimStore.getState().hover(null);
    setPointer(null);
  };

  const zoomCenter = (factor: number) => {
    const { w, h } = sizeRef.current;
    zoomAt(w, h, w / 2, h / 2, factor);
  };

  return (
    <div
      ref={containerRef}
      className="lab-grid absolute inset-0 overflow-hidden"
      data-ocid="lab.canvas.canvas_target"
    >
      <canvas
        ref={canvasRef}
        id="simulation-canvas"
        aria-label={t("canvas.label")}
        className={`absolute inset-0 h-full w-full touch-none select-none ${
          hoveredId !== null ? "cursor-pointer" : "cursor-crosshair"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      />
      <div className="canvas-vignette absolute inset-0" />
      <CanvasHud
        onZoomIn={() => zoomCenter(1.35)}
        onZoomOut={() => zoomCenter(1 / 1.35)}
        onFit={fitWorld}
      />
      {pointer && hoveredId !== null && (
        <HoverTooltip x={pointer.x} y={pointer.y} width={pointer.w} />
      )}
    </div>
  );
}
