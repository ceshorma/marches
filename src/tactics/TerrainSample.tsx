import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import * as art from "./art";
import "./tactics.css";

// Terrain-only art study. Does not alter the campaign or its movement rules.
const R = 37,
  DX = Math.sqrt(3) * R;
const hex = (x: number, y: number, r = R) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 30) * Math.PI) / 180;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  }).flat();
const terrace = [
  330, 155, 380, 90, 475, 65, 565, 85, 665, 130, 710, 215, 680, 290, 605, 320,
  555, 302, 510, 280, 455, 306, 385, 280, 330, 220,
];
const summit = [
  425, 155, 455, 122, 522, 118, 583, 147, 610, 190, 585, 225, 530, 238, 470,
  218, 432, 190,
];
// Two corner-cutting passes retain the landform while removing polygon corners.
function smooth(points: number[], passes = 2): number[] {
  if (!passes) return points;
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const j = (i + 2) % points.length;
    out.push(
      points[i] * 0.75 + points[j] * 0.25,
      points[i + 1] * 0.75 + points[j + 1] * 0.25,
      points[i] * 0.25 + points[j] * 0.75,
      points[i + 1] * 0.25 + points[j + 1] * 0.75,
    );
  }
  return smooth(out, passes - 1);
}
export default function TerrainSample() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const app = new Application();
    let disposed = false,
      clean = () => {};
    void (async () => {
      await app.init({
        resizeTo: ref.current!,
        background: 0xf5f3ec,
        antialias: true,
      });
      if (disposed) {
        app.destroy(true);
        return;
      }
      ref.current!.appendChild(app.canvas);
      const world = new Container(),
        g = new Graphics();
      world.addChild(g);
      app.stage.addChild(world);
      const cells = Array.from({ length: 150 }, (_, id) => ({
        id,
        x: 35 + DX * ((id % 15) + (Math.floor(id / 15) % 2) * 0.5),
        y: 40 + Math.floor(id / 15) * R * 1.5,
      }));
      for (const c of cells) g.poly(hex(c.x, c.y)).fill(0xdce0c1);
      g.poly(smooth(terrace))
        .fill(0xb2bd91)
        .stroke({ color: 0x6d7855, width: 1.3 });
      g.poly(smooth(summit))
        .fill(0x83976b)
        .stroke({ color: 0x5b6b43, width: 1.3 });
      // Inset contours follow the same landforms, no triangulated hex textures.
      const inset = (p: number[], cx: number, cy: number, k: number) =>
        p.map((v, i) => (i % 2 ? cy : cx) + (v - (i % 2 ? cy : cx)) * k);
      g.poly(smooth(inset(terrace, 520, 195, 0.94))).stroke({
        color: 0xe7e8c9,
        width: 1.2,
        alpha: 0.85,
      });
      g.poly(smooth(inset(summit, 520, 180, 0.91))).stroke({
        color: 0xcbd2a4,
        width: 1,
        alpha: 0.8,
      });
      // Fine, irregular slope marks follow the rounded contour, leaving the access clear.
      const edge = smooth(terrace);
      for (let i = 0; i < edge.length; i += 4) {
        const j = (i + 2) % edge.length,
          x = edge[i],
          y = edge[i + 1],
          dx = edge[j] - x,
          dy = edge[j + 1] - y;
        if (y > 270 && x > 400 && x < 590) continue;
        const len = Math.hypot(dx, dy) || 1,
          depth = 3 + art.rnd(i, 9) * 4;
        g.moveTo(x, y)
          .lineTo(x + (dy / len) * depth, y - (dx / len) * depth)
          .stroke({ color: 0x727c59, width: 0.75, alpha: 0.4 });
      }
      for (const c of cells)
        g.poly(hex(c.x, c.y)).stroke({
          color: 0x596746,
          width: 0.7,
          alpha: 0.11,
        });
      // Variable-width banks replace the uniform pipe-shaped river.
      const bank = (extra: number) => {
        const left: number[] = [],
          right: number[] = [];
        for (let y = 0; y <= 590; y += 8) {
          const x = 851 + Math.sin(y / 78) * 17 + Math.sin(y / 37) * 4;
          const w =
            10 + Math.sin(y / 53) * 2.5 + Math.cos(y / 29) * 1.3 + extra;
          left.push(x - w, y);
          right.unshift(x + w, y);
        }
        return [...left, ...right];
      };
      g.poly(bank(4)).fill(0xe2dfbf);
      g.poly(bank(1)).fill(0x729fa9);
      g.poly(bank(0)).fill(0xa4c6cb);
      for (let i = 0; i < 18; i++) {
        const y = 20 + i * 31,
          x = 851 + Math.sin(y / 78) * 17 + Math.sin(y / 37) * 4;
        g.moveTo(x - 3, y)
          .quadraticCurveTo(x + 1, y + 4, x - 1, y + 10)
          .stroke({ color: 0xe1eef0, width: 0.8, alpha: 0.55 });
      }
      for (let i = 0; i < 7; i++) {
        const y = 349 + i * 1.8,
          x = 851 + Math.sin(y / 78) * 17 + Math.sin(y / 37) * 4 - 10 + i * 3;
        g.ellipse(x, y, 2.3 + art.rnd(i) * 1.3, 1.8).fill(0xd1d1b9);
      }
      // Continuous irregular stands: jittered spacing, varied crown sizes, no rosettes.
      for (let row = 0; row < 23; row++)
        for (let col = 0; col < 48; col++) {
          const seed = row * 48 + col;
          const x = col * 21 + 12 + (art.rnd(seed, 1) - 0.5) * 12;
          const y = row * 21 + 46 + (art.rnd(seed, 2) - 0.5) * 12;
          const oak =
            ((x - 146) / 111) ** 2 + ((y - 246) / 126) ** 2 <
            1 + 0.12 * Math.sin(y / 21);
          const pine =
            ((x - 756) / 57) ** 2 + ((y - 180) / 94) ** 2 <
            1 + 0.13 * Math.sin(y / 17);
          if (!oak && !pine) continue;
          const size = 0.72 + art.rnd(seed, 3) * 0.53;
          (pine ? art.pine : art.oak)(g, x, y, size, seed);
        }
      for (const c of cells)
        if (c.y > 375 && c.x < 740 && art.rnd(c.id, 7) < 0.09)
          art.grass(g, c.x, c.y, c.id);
      for (const [label, x, y] of [
        ["0", 490, 430],
        ["+15", 400, 235],
        ["+30", 520, 178],
      ] as const) {
        const text = new Text({
          text: label,
          style: {
            fontFamily: "Georgia",
            fontSize: 13,
            fill: label === "+30" ? 0xf3f0db : 0x52613f,
          },
        });
        text.position.set(x, y);
        world.addChild(text);
      }
      let zoom = 1,
        pan = { x: 0, y: 0 },
        drag: { x: number; y: number } | null = null;
      const fit = () => {
        const s = Math.min(
          (app.screen.width - 24) / 1010,
          (app.screen.height - 115) / 620,
        );
        world.scale.set(s * zoom);
        world.position.set(
          (app.screen.width - 1010 * s * zoom) / 2 + pan.x,
          85 + pan.y,
        );
      };
      fit();
      const obs = new ResizeObserver(() => {
        app.renderer.resize(
          ref.current!.clientWidth,
          ref.current!.clientHeight,
        );
        fit();
      });
      obs.observe(ref.current!);
      const canvas = app.canvas;
      canvas.style.touchAction = "none";
      canvas.style.cursor = "grab";
      const down = (e: PointerEvent) => {
        drag = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!drag) return;
        pan.x += e.clientX - drag.x;
        pan.y += e.clientY - drag.y;
        drag = { x: e.clientX, y: e.clientY };
        fit();
      };
      const up = () => {
        drag = null;
      };
      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom = Math.max(0.7, Math.min(3, zoom * Math.exp(-e.deltaY * 0.001)));
        fit();
      };
      const reset = () => {
        zoom = 1;
        pan = { x: 0, y: 0 };
        fit();
      };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
      canvas.addEventListener("wheel", wheel, { passive: false });
      window.addEventListener("terrain-reset", reset);
      clean = () => {
        obs.disconnect();
        window.removeEventListener("terrain-reset", reset);
        app.destroy(true, { children: true });
      };
    })();
    return () => {
      disposed = true;
      clean();
    };
  }, []);
  return (
    <main style={{ height: "100dvh", background: "#f5f3ec" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0 }} />
      <header
        style={{
          position: "absolute",
          top: 20,
          left: 24,
          right: 24,
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          color: "#344750",
        }}
      >
        <div>
          <strong style={{ fontFamily: "Georgia", letterSpacing: 3 }}>
            MARCHES
          </strong>
          <div style={{ fontSize: 12, marginTop: 7 }}>
            Estudio de terreno · Curvas de nivel
          </div>
        </div>
        <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button
            onClick={() => window.dispatchEvent(new Event("terrain-reset"))}
          >
            Centrar
          </button>
          <a href="./">Volver al juego</a>
        </nav>
      </header>
    </main>
  );
}
