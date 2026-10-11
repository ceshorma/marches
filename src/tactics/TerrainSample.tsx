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
// Crown silhouette is lobed and shaded, never a stack of circles.
function crown(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  seed: number,
  pine: boolean,
) {
  const points: number[] = [];
  const n = pine ? 24 : 32;
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n;
    const reach =
      r * (pine ? (i % 2 ? 0.58 : 1) : 0.85 + art.rnd(seed, i) * 0.18);
    points.push(x + Math.cos(a) * reach, y + Math.sin(a) * reach);
  }
  g.poly(points.map((v, i) => v + (i % 2 ? 2.2 : 1.6))).fill({
    color: 0x273c2b,
    alpha: 0.19,
  });
  g.poly(points)
    .fill(pine ? 0x4e6950 : 0x5c7950)
    .stroke({ color: 0x3e563d, width: 0.7, alpha: 0.7 });
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4,
      px = x + Math.cos(a) * r * 0.34,
      py = y + Math.sin(a) * r * 0.34;
    const lobe = Array.from({ length: 14 }, (_, j) => {
      const angle = (j * Math.PI) / 7,
        rr = r * (0.28 + art.rnd(seed + i, j) * 0.12);
      return [px + Math.cos(angle) * rr, py + Math.sin(angle) * rr];
    }).flat();
    g.poly(lobe).fill(i < 2 ? 0x8b9f68 : 0x718b5c);
  }
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
      // All visuals derive from one cell record: never paint terrain across cells.
      const cells = Array.from({ length: 150 }, (_, id) => {
        const q = id % 15,
          r = Math.floor(id / 15);
        const x = 35 + DX * (q + (r % 2) * 0.5),
          y = 40 + r * R * 1.5;
        const high =
          (r === 2 && q >= 7 && q <= 8) || (r === 3 && q >= 6 && q <= 8);
        const ranges: Record<number, [number, number]> = {
          1: [6, 8],
          2: [5, 9],
          3: [5, 9],
          4: [5, 9],
          5: [6, 8],
        };
        const hill = !!ranges[r] && q >= ranges[r][0] && q <= ranges[r][1];
        const forest =
          q >= 1 && q <= 3 && r >= 3 && r <= 6 && !(q === 3 && r === 6);
        const pine = q >= 10 && q <= 11 && r >= 1 && r <= 3;
        const water = q === (r < 3 ? 13 : r < 8 ? 12 : 13);
        return {
          id,
          q,
          r,
          x,
          y,
          height: high ? 30 : hill ? 15 : 0,
          kind: water
            ? r === 6
              ? "ford"
              : "water"
            : forest
              ? "forest"
              : pine
                ? "pine"
                : "plain",
        };
      });
      const lookup = new Map(cells.map((c) => [c.q + "," + c.r, c]));
      const neighbor = (c: (typeof cells)[number], k: number) => {
        const odd = c.r % 2;
        const offsets = [
          [1, 0],
          [odd, 1],
          [odd - 1, 1],
          [-1, 0],
          [odd - 1, -1],
          [odd, -1],
        ];
        const [dq, dr] = offsets[k];
        return lookup.get(c.q + dq + "," + (c.r + dr));
      };
      const edge = (c: (typeof cells)[number], k: number, inset = 0) => {
        const pts = hex(c.x, c.y, R - inset),
          j = k * 2,
          n = ((k + 1) % 6) * 2;
        return [pts[j], pts[j + 1], pts[n], pts[n + 1]];
      };
      const strokeEdge = (
        c: (typeof cells)[number],
        k: number,
        color: number,
        width: number,
        alpha = 1,
        inset = 0,
      ) => {
        const [x, y, xx, yy] = edge(c, k, inset);
        g.moveTo(x, y).lineTo(xx, yy).stroke({ color, width, alpha });
      };
      const wet = (c: (typeof cells)[number] | undefined) =>
        c?.kind === "water" || c?.kind === "ford";
      const wooded = (c: (typeof cells)[number] | undefined) =>
        c?.kind === "forest" || c?.kind === "pine";
      for (const c of cells) {
        const color = wet(c)
          ? c.kind === "ford"
            ? 0xb2c7bd
            : 0xa4c6cb
          : c.height === 30
            ? 0x7e915e
            : c.height === 15
              ? 0xa8b37e
              : wooded(c)
                ? 0x9fae84
                : 0xd5d7af;
        g.poly(hex(c.x, c.y)).fill(color);
        g.poly(hex(c.x, c.y)).stroke({
          color: 0x596746,
          width: 0.65,
          alpha: 0.16,
        });
      }
      for (const c of cells)
        for (let k = 0; k < 6; k++) {
          const n = neighbor(c, k);
          if (n && c.height > n.height && !wet(c)) {
            // A narrow stone lip stays entirely inside the higher hex.
            const outer = edge(c, k),
              inner = edge(c, k, 5);
            g.poly([
              outer[0],
              outer[1],
              outer[2],
              outer[3],
              inner[2],
              inner[3],
              inner[0],
              inner[1],
            ])
              .fill(0xd8d4b9)
              .stroke({ color: 0x7e8461, width: 0.7, alpha: 0.8 });
            strokeEdge(c, k, 0xf0ecd5, 1.3, 0.95, 5);
            const [x, y, xx, yy] = edge(c, k),
              dx = xx - x,
              dy = yy - y,
              len = Math.hypot(dx, dy);
            for (let j = 1; j < 5; j++) {
              const px = x + (dx * j) / 5,
                py = y + (dy * j) / 5;
              g.moveTo(px, py)
                .lineTo(px - (dy / len) * 4, py + (dx / len) * 4)
                .stroke({ color: 0x697951, width: 0.8, alpha: 0.5 });
            }
          }
          if (wet(c) && n && !wet(n)) strokeEdge(c, k, 0xeee7cd, 3, 0.95, 1);
          if (wooded(c) && !wooded(n)) strokeEdge(c, k, 0x647b59, 1.2, 0.6);
        }
      for (const c of cells) {
        if (wooded(c)) {
          const canopy = new Container(),
            trees = new Graphics(),
            mask = new Graphics();
          mask.poly(hex(c.x, c.y, R - 2)).fill(0xffffff);
          canopy.addChild(trees, mask);
          trees.mask = mask;
          world.addChild(canopy);
          // Irregular packing within a cell; mask guarantees no crown crosses its edge.
          for (let i = 0; i < 10; i++) {
            const a = i * 2.399 + art.rnd(c.id, 9),
              r = i === 0 ? 0 : 12 + art.rnd(c.id, i) * 19;
            const x = c.x + Math.cos(a) * r,
              y = c.y + Math.sin(a) * r;
            crown(
              trees,
              x,
              y,
              9 + art.rnd(c.id, i + 20) * 4,
              c.id * 13 + i,
              c.kind === "pine",
            );
          }
        } else if (wet(c)) {
          if (c.kind === "ford") {
            for (let i = 0; i < 6; i++)
              g.ellipse(c.x - 22 + i * 9, c.y + (i % 2 ? 2 : -2), 3, 2).fill(
                0xe2dfc7,
              );
          } else {
            g.moveTo(c.x - 5, c.y - 12)
              .quadraticCurveTo(c.x + 1, c.y - 5, c.x - 3, c.y + 3)
              .stroke({ color: 0xe6f0ee, width: 1, alpha: 0.6 });
          }
        } else if (c.height === 0 && art.rnd(c.id, 7) < 0.08)
          art.grass(g, c.x, c.y, c.id);
      }
      for (const [id, label] of [
        [112, "0"],
        [65, "+15"],
        [37, "+30"],
      ] as const) {
        const c = cells[id];
        const text = new Text({
          text: label,
          style: {
            fontFamily: "Georgia",
            fontSize: 13,
            fill: c.height === 30 ? 0xf3f0db : 0x52613f,
          },
        });
        text.anchor.set(0.5);
        text.position.set(c.x, c.y);
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
