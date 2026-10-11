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
      for (const c of cells) g.poly(hex(c.x, c.y)).fill(0xd5d9ae);
      g.poly(terrace).fill(0xadb783).stroke({ color: 0x6d7855, width: 1.3 });
      g.poly(summit).fill(0x7f9060).stroke({ color: 0x5b6b43, width: 1.3 });
      // Inset contours follow the same landforms, no triangulated hex textures.
      const inset = (p: number[], cx: number, cy: number, k: number) =>
        p.map((v, i) => (i % 2 ? cy : cx) + (v - (i % 2 ? cy : cx)) * k);
      g.poly(inset(terrace, 520, 195, 0.95)).stroke({
        color: 0xe7e8c9,
        width: 1.2,
        alpha: 0.85,
      });
      g.poly(inset(summit, 520, 180, 0.92)).stroke({
        color: 0xcbd2a4,
        width: 1,
        alpha: 0.8,
      });
      // South-facing open ramp; hachures only on the steeper outer edges.
      for (let i = 0; i < terrace.length; i += 2) {
        const j = (i + 2) % terrace.length;
        if (i >= 14 && i <= 20) continue;
        const x = terrace[i],
          y = terrace[i + 1],
          dx = terrace[j] - x,
          dy = terrace[j + 1] - y,
          len = Math.hypot(dx, dy);
        for (let t = 10; t < len; t += 11)
          g.moveTo(x + (dx * t) / len, y + (dy * t) / len)
            .lineTo(
              x + (dx * t) / len + (dy / len) * 6,
              y + (dy * t) / len - (dx / len) * 6,
            )
            .stroke({ color: 0x727c59, width: 1, alpha: 0.65 });
      }
      for (const c of cells)
        g.poly(hex(c.x, c.y)).stroke({
          color: 0x596746,
          width: 0.7,
          alpha: 0.16,
        });
      // River and ford: a clean continuous ribbon, read entirely from above.
      g.moveTo(843, -5)
        .bezierCurveTo(905, 140, 790, 195, 852, 310)
        .bezierCurveTo(915, 425, 791, 470, 843, 590)
        .stroke({ color: 0xe9e7cf, width: 30, cap: "round" });
      g.moveTo(843, -5)
        .bezierCurveTo(905, 140, 790, 195, 852, 310)
        .bezierCurveTo(915, 425, 791, 470, 843, 590)
        .stroke({ color: 0x94bec8, width: 23, cap: "round" });
      for (let i = 0; i < 6; i++)
        g.ellipse(858 + i * 3, 345 + i * 3, 3.5, 2).fill(0xd2d1b9);
      // Dense treetop clusters occupy the forest, open ground stays low and sparse.
      for (const c of cells) {
        const oak = c.x < 238 && c.y > 110 && c.y < 360;
        const pine = c.x > 680 && c.x < 793 && c.y > 85 && c.y < 235;
        if (oak || pine) {
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3,
              x = c.x + Math.cos(a) * 19,
              y = c.y + Math.sin(a) * 19;
            (pine ? art.pine : art.oak)(g, x, y, 0.95, c.id + i);
          }
          (pine ? art.pine : art.oak)(g, c.x, c.y, 1.05, c.id);
        } else if (c.y > 365 && c.x < 750 && art.rnd(c.id, 7) < 0.12)
          art.grass(g, c.x, c.y, c.id);
      }
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
