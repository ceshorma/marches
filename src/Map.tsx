import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { useGame } from "./store";
import {
  COLS,
  ROWS,
  R,
  DX,
  DY,
  distance,
  findPath,
  pos,
  random,
  riverQ,
  walkable,
} from "./world";
import type { Hex, UnitType } from "./world";
const C = {
  blue: 0x397cac,
  red: 0xc8615a,
  ink: 0x414c49,
  paper: 0xf5f3ec,
  water: 0xa8cedd,
};
const polygon = (c: Hex, r = R) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 30) * Math.PI) / 180;
    return [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r];
  }).flat();
function label(
  parent: Container,
  text: string,
  x: number,
  y: number,
  size: number,
  color: number,
  spacing = 0,
) {
  const t = new Text({
    text,
    style: {
      fontFamily: "Georgia",
      fontSize: size,
      fill: color,
      letterSpacing: spacing,
      align: "center",
    },
  });
  t.anchor.set(0.5);
  t.position.set(x, y);
  parent.addChild(t);
  return t;
}
function symbol(
  g: Graphics,
  type: UnitType,
  x: number,
  y: number,
  s: number,
  color: number,
  alpha = 1,
) {
  if (type === "infantry") g.rect(x - s, y - s, s * 2, s * 2);
  else if (type === "archer")
    g.poly([x, y - s * 1.2, x + s * 1.1, y + s, x - s * 1.1, y + s]);
  else if (type === "cavalry")
    g.poly([x, y - s * 1.35, x + s, y, x, y + s * 1.35, x - s, y]);
  else g.circle(x, y, s);
  g.fill({ color, alpha }).stroke({ color: C.paper, width: 2, alpha });
}
function fort(g: Graphics, x: number, y: number, color: number, s = 1) {
  g.poly([
    x - 12 * s,
    y + 11 * s,
    x - 12 * s,
    y - 10 * s,
    x - 7 * s,
    y - 10 * s,
    x - 7 * s,
    y - 5 * s,
    x - 3 * s,
    y - 5 * s,
    x - 3 * s,
    y - 12 * s,
    x + 3 * s,
    y - 12 * s,
    x + 3 * s,
    y - 5 * s,
    x + 7 * s,
    y - 5 * s,
    x + 7 * s,
    y - 10 * s,
    x + 12 * s,
    y - 10 * s,
    x + 12 * s,
    y + 11 * s,
  ])
    .fill(color)
    .stroke({ color: C.paper, width: 1.5 });
  g.roundRect(x - 3 * s, y + 2 * s, 6 * s, 10 * s, 2 * s).fill(C.paper);
}
function dashed(
  g: Graphics,
  points: { x: number; y: number }[],
  color: number,
  width = 1.7,
  alpha = 0.8,
  dash = 6,
) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      d = Math.hypot(b.x - a.x, b.y - a.y);
    for (let t = 0; t < d; t += dash * 2) {
      const end = Math.min(d, t + dash);
      g.moveTo(a.x + ((b.x - a.x) * t) / d, a.y + ((b.y - a.y) * t) / d)
        .lineTo(a.x + ((b.x - a.x) * end) / d, a.y + ((b.y - a.y) * end) / d)
        .stroke({ color, width, alpha });
    }
  }
}
export default function Map() {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current,
      app = new Application();
    let disposed = false,
      initialized = false;
    let cleanup = () => {};
    (async () => {
      try {
        await app.init({
          resizeTo: el,
          background: C.paper,
          antialias: true,
          resolution: Math.min(devicePixelRatio, 2),
          autoDensity: true,
          preference: "webgl",
        });
        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }
        initialized = true;
        el.appendChild(app.canvas);
        app.canvas.setAttribute(
          "aria-label",
          "Mapa de MARCHES. Arrastra una unidad para moverla o selecciónala y pulsa un destino. Arrastra el terreno para desplazar y usa la rueda para acercar.",
        );
        app.canvas.setAttribute("role", "application");
        const root = new Container();
        app.stage.addChild(root);
        const terrain = new Graphics(),
          influence = new Graphics(),
          geography = new Graphics(),
          roads = new Graphics(),
          grid = new Graphics(),
          details = new Graphics(),
          fog = new Graphics(),
          regionLabels = new Container(),
          placeLabels = new Container(),
          dynamic = new Graphics(),
          tactical = new Graphics();
        root.addChild(
          terrain,
          influence,
          geography,
          roads,
          grid,
          details,
          fog,
          regionLabels,
          placeLabels,
          tactical,
          dynamic,
        );
        let worldRef = useGame.getState().world;
        const build = () => {
          const w = useGame.getState().world;
          worldRef = w;
          terrain.clear();
          geography.clear();
          roads.clear();
          details.clear();
          regionLabels.removeChildren().forEach((c) => c.destroy());
          placeLabels.removeChildren().forEach((c) => c.destroy());
          const rand = random(w.seed + 17);
          for (const c of w.cells) {
            let color =
              c.terrain === "water"
                ? Math.abs(c.q - riverQ(c.r)) < 1.12
                  ? 0xe8e7d9
                  : C.water
                : c.terrain === "forest"
                  ? [0xdce3d2, 0xd5dfcd, 0xd2ddc9, 0xdce2cf][
                      Math.floor(c.variation * 4)
                    ]
                  : c.terrain === "mountain"
                    ? [0xe0dfd4, 0xe4e1d7, 0xdcdcd2][
                        Math.floor(c.variation * 3)
                      ]
                    : [0xe8e7d9, 0xecebdc, 0xe5e5d6, 0xeae9dc, 0xe8e8db][
                        Math.floor(c.variation * 5)
                      ];
            terrain.poly(polygon(c, R + 0.4)).fill(color);
          }
          // A continuous river follows the same geography used for pathfinding.
          geography.moveTo((riverQ(0) + 0.2) * DX, -20);
          for (let r = 0; r < ROWS; r += 0.25)
            geography.lineTo((riverQ(r) + 0.22) * DX, r * DY);
          geography.stroke({
            width: 61,
            color: C.water,
            cap: "round",
            join: "round",
          });
          geography.moveTo((riverQ(0) + 0.25) * DX, -20);
          for (let r = 0; r < ROWS; r += 0.3)
            geography.lineTo((riverQ(r) + 0.3) * DX, r * DY);
          geography.stroke({ width: 1, color: 0xd0e5e9, alpha: 0.5 });
          for (const c of w.cells) {
            if (c.terrain === "forest") {
              const count = 3 + Math.floor(rand() * 3);
              for (let j = 0; j < count; j++) {
                const x = c.x + (rand() - 0.5) * 24,
                  y = c.y + (rand() - 0.5) * 22,
                  s = 3.2 + rand() * 2.5;
                details
                  .moveTo(x, y + s)
                  .lineTo(x, y + s + 3)
                  .stroke({ color: 0x778c79, width: 1 });
                details
                  .poly([x, y - s * 1.6, x - s, y + s, x + s, y + s])
                  .fill({ color: j % 2 ? 0x829b84 : 0x91a88c, alpha: 0.9 });
                details
                  .poly([x, y - s * 1.6, x, y + s, x + s, y + s])
                  .fill({ color: 0x688573, alpha: 0.26 });
              }
            } else if (c.terrain === "mountain") {
              const x = c.x,
                y = c.y,
                s = 9 + rand() * 8;
              details
                .poly([x - s, y + s * 0.5, x, y - s, x + s, y + s * 0.5])
                .fill(0xb8b9ad);
              details
                .poly([x, y - s, x + s, y + s * 0.5, x + 1, y + s * 0.5])
                .fill(0xcaccbe);
              details
                .poly([
                  x,
                  y - s,
                  x - 3,
                  y - s * 0.45,
                  x + 1,
                  y - s * 0.55,
                  x + 4,
                  y - s * 0.38,
                ])
                .fill({ color: 0xf5f3ec, alpha: 0.8 });
            } else if (c.terrain === "plain" && rand() > 0.68) {
              details
                .moveTo(c.x - 4, c.y + 3)
                .quadraticCurveTo(c.x, c.y - 1, c.x + 4, c.y + 3)
                .stroke({ color: 0xb7bd9f, width: 0.7, alpha: 0.6 });
            }
          }
          const links = [
            [0, 1],
            [0, 2],
            [2, 4],
            [2, 3],
            [0, 5],
          ];
          for (const [a, b] of links) {
            const path = findPath(w.cells, w.places[a].cell, w.places[b].cell);
            const pts = [
              w.cells[w.places[a].cell],
              ...path.map((id) => w.cells[id]),
            ];
            for (const width of [5, 2]) {
              roads.moveTo(pts[0].x, pts[0].y);
              for (const p of pts) roads.lineTo(p.x, p.y);
              roads.stroke({
                width,
                color: width === 5 ? 0xf5f0dd : 0xb2ad98,
                alpha: width === 5 ? 0.8 : 0.55,
                join: "round",
                cap: "round",
              });
            }
          }
          for (const [text, q, r] of [
            ["A L T O S   D E L   N O R T E", 24, 4],
            ["B O S Q U E   S O M B R Í O", 12, 11],
            ["V A L L E   C L A R O", 11, 29],
            ["P A S O   D E L   R Í O", 26, 15],
            ["T I E R R A S   R O J A S", 39, 27],
          ] as const) {
            const p = pos(q, r);
            const t = label(regionLabels, text, p.x, p.y, 14, 0x697168);
            t.alpha = 0.8;
          }
          const sea = label(
            regionLabels,
            "M A R   D E   L A   C A L M A",
            190,
            985,
            13,
            0x608b9b,
          );
          sea.rotation = -0.12;
          for (const p of w.places) {
            const c = w.cells[p.cell];
            const t = label(placeLabels, p.name, c.x, c.y + 31, 12, 0x4c5752);
            t.name = p.id;
          }
        };
        build();
        let targetX = 525,
          targetY = 650;
        let zoom = useGame.getState().zoom,
          targetZoom = zoom;
        let viewX = targetX,
          viewY = targetY;
        let lastZoom = zoom,
          lastFocus = 0,
          lastRevision = -1;
        let hover: Hex | undefined;
        let down: { x: number; y: number; vx: number; vy: number } | null =
          null;
        let dragged = false;
        let frame = 0;
        let dragUnit: string | null = null;
        let previewPath: number[] = [];
        let previewCell = -1;
        let fogOpacity = new Float32Array(
          worldRef.cells.map((c) => (c.explored ? 0 : 1)),
        );
        const toWorld = (x: number, y: number) => ({
          x: (x - app.screen.width / 2) / zoom + viewX,
          y: (y - app.screen.height / 2) / zoom + viewY,
        });
        const nearest = (x: number, y: number) => {
          const r = Math.max(0, Math.min(ROWS - 1, Math.round(y / DY))),
            q = Math.max(
              0,
              Math.min(COLS - 1, Math.round(x / DX - (r % 2) * 0.5)),
            );
          return useGame.getState().world.cells[r * COLS + q];
        };
        const coords = (e: PointerEvent | WheelEvent) => {
          const rect = app.canvas.getBoundingClientRect();
          return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        const onDown = (e: PointerEvent) => {
          if (e.button !== 0 && e.button !== 2) return;
          const p = coords(e),
            wp = toWorld(p.x, p.y),
            s = useGame.getState();
          down = { ...p, vx: targetX, vy: targetY };
          dragged = false;
          const u = s.world.units.find(
            (u) =>
              u.faction === "ally" &&
              Math.hypot(u.x - wp.x, u.y - wp.y) < Math.max(19, 22 / zoom),
          );
          dragUnit = e.button === 0 && u ? u.id : null;
          if (dragUnit) s.select({ kind: "unit", id: dragUnit });
          app.canvas.setPointerCapture(e.pointerId);
        };
        const onMove = (e: PointerEvent) => {
          const p = coords(e),
            wp = toWorld(p.x, p.y),
            s = useGame.getState();
          hover = nearest(wp.x, wp.y);
          if (down && Math.hypot(p.x - down.x, p.y - down.y) > 5) {
            dragged = true;
            if (!dragUnit) {
              targetX = down.vx - (p.x - down.x) / zoom;
              targetY = down.vy - (p.y - down.y) / zoom;
            }
          }
          const selected = s.world.units.find(
            (u) =>
              u.faction === "ally" && u.id === (dragUnit ?? s.selection?.id),
          );
          if (selected && hover.id !== previewCell) {
            previewCell = hover.id;
            previewPath = findPath(s.world.cells, selected.cell, hover.id);
          }
          app.canvas.style.cursor =
            dragUnit && dragged
              ? "crosshair"
              : dragged
                ? "grabbing"
                : selected
                  ? "crosshair"
                  : "grab";
        };
        const onUp = (e: PointerEvent) => {
          if (!down) return;
          const s = useGame.getState(),
            w = s.world,
            p = coords(e),
            wp = toWorld(p.x, p.y),
            cell = nearest(wp.x, wp.y);
          const moving = dragUnit;
          down = null;
          dragUnit = null;
          previewPath = [];
          previewCell = -1;
          if (dragged) {
            if (moving) s.move(moving, cell.id);
            return;
          }
          const selected = w.units.find(
            (u) =>
              u.id === s.selection?.id &&
              s.selection.kind === "unit" &&
              u.faction === "ally",
          );
          const u = w.units.find(
            (u) =>
              u.revealed &&
              Math.hypot(u.x - wp.x, u.y - wp.y) < Math.max(19, 22 / zoom),
          );
          if (u && (u.faction === "ally" || !selected)) {
            s.select({ kind: "unit", id: u.id });
            return;
          }
          const place = w.places.find(
            (p) => p.discovered && distance(w.cells[p.cell], wp) < 0.85,
          );
          if (place?.faction === "ally" && e.button === 0) {
            s.select({ kind: "place", id: place.id });
            return;
          }
          if (selected) {
            s.move(selected.id, cell.id);
            return;
          }
          if (place) {
            s.select({ kind: "place", id: place.id });
            return;
          }
          s.select(null);
        };
        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          const p = coords(e),
            prev = targetZoom;
          targetZoom = Math.max(
            0.42,
            Math.min(2.8, targetZoom * Math.exp(-e.deltaY * 0.0014)),
          );
          targetX += (p.x - app.screen.width / 2) * (1 / prev - 1 / targetZoom);
          targetY +=
            (p.y - app.screen.height / 2) * (1 / prev - 1 / targetZoom);
          useGame.getState().setZoom(targetZoom);
          lastZoom = targetZoom;
        };
        const context = (e: Event) => e.preventDefault();
        app.canvas.addEventListener("pointerdown", onDown);
        app.canvas.addEventListener("pointermove", onMove);
        app.canvas.addEventListener("pointerup", onUp);
        app.canvas.addEventListener("pointercancel", () => {
          down = null;
          dragUnit = null;
          previewPath = [];
        });
        app.canvas.addEventListener("wheel", onWheel, { passive: false });
        app.canvas.addEventListener("contextmenu", context);
        app.ticker.add((ticker) => {
          const s = useGame.getState(),
            w = s.world;
          if (w !== worldRef) {
            build();
            lastRevision = -1;
            fogOpacity = new Float32Array(
              w.cells.map((c) => (c.explored ? 0 : 1)),
            );
          }
          if (s.zoom !== lastZoom) {
            targetZoom = s.zoom;
            lastZoom = s.zoom;
          }
          if (s.focus && s.focus.nonce !== lastFocus) {
            lastFocus = s.focus.nonce;
            targetX = s.focus.x;
            targetY = s.focus.y;
          }
          targetX = Math.max(100, Math.min(1460, targetX));
          targetY = Math.max(80, Math.min(1010, targetY));
          const lerp = 1 - Math.pow(0.8, ticker.deltaTime);
          zoom += (targetZoom - zoom) * lerp;
          viewX += (targetX - viewX) * lerp;
          viewY += (targetY - viewY) * lerp;
          root.scale.set(zoom);
          root.position.set(
            app.screen.width / 2 - viewX * zoom,
            app.screen.height / 2 - viewY * zoom,
          );
          frame += ticker.deltaTime;
          const tacticalAlpha = Math.max(0, Math.min(1, (zoom - 1.8) / 0.65));
          grid.alpha = tacticalAlpha * 0.25;
          regionLabels.alpha = Math.max(0.15, Math.min(1, 1.6 - zoom * 0.6));
          details.alpha = Math.min(1, 0.45 + zoom * 0.6);
          placeLabels.alpha = Math.min(1, 0.45 + zoom * 0.6);
          if (lastRevision !== Math.floor(w.time * 2)) {
            lastRevision = Math.floor(w.time * 2);
            influence.clear();
            fog.clear();
            grid.clear();
            for (const c of w.cells) {
              grid.poly(polygon(c)).stroke({ color: 0x8c9589, width: 0.7 });
              if (c.owner !== "neutral" && c.terrain !== "water") {
                const color = c.owner === "ally" ? C.blue : C.red;
                const strength = Math.max(c.ally, c.enemy);
                influence
                  .poly(polygon(c, R + 0.25))
                  .fill({ color, alpha: Math.min(0.27, strength * 0.027) });
                for (let k = 0; k < 6; k++) {
                  const a = ((k * 60 - 30) * Math.PI) / 180,
                    b = (((k + 1) * 60 - 30) * Math.PI) / 180,
                    mid = (a + b) / 2;
                  const adjacent = nearest(
                    c.x + Math.cos(mid) * DX,
                    c.y + Math.sin(mid) * DX,
                  );
                  if (adjacent.owner !== c.owner) {
                    influence
                      .moveTo(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R)
                      .lineTo(c.x + Math.cos(b) * R, c.y + Math.sin(b) * R)
                      .stroke({ color, width: 1.1, alpha: 0.32 });
                  }
                }
              }
              fogOpacity[c.id] +=
                ((c.explored ? 0 : 1) - fogOpacity[c.id]) * 0.42;
              if (fogOpacity[c.id] > 0.01)
                fog
                  .poly(polygon(c, R + 0.5))
                  .fill({ color: C.paper, alpha: fogOpacity[c.id] });
            }
            for (const t of placeLabels.children) {
              const p = w.places.find((p) => p.id === t.name);
              t.visible = !!p?.discovered;
            }
          }
          for (const t of regionLabels.children) {
            const c = nearest(t.x, t.y);
            t.visible =
              c.explored &&
              w.places.filter((p) => p.faction === "ally").length > 1;
          }
          for (const t of placeLabels.children) {
            const p = w.places.find((p) => p.id === t.name);
            t.visible =
              !!p?.discovered &&
              ((s.selection?.kind === "place" && s.selection.id === p.id) ||
                hover?.id === p.cell);
          }
          influence.visible = s.layer === "influence";
          dynamic.clear();
          tactical.clear();
          const selected =
            s.selection?.kind === "unit"
              ? w.units.find((u) => u.id === s.selection!.id)
              : undefined;
          if (selected && selected.faction === "ally") {
            if (tacticalAlpha > 0) {
              for (const c of w.cells)
                if (walkable(c) && distance(c, selected) < 4)
                  tactical
                    .poly(polygon(c, R - 1))
                    .fill({ color: C.blue, alpha: 0.05 * tacticalAlpha });
              tactical
                .circle(
                  selected.x,
                  selected.y,
                  selected.type === "archer" ? DX * 3.1 : DX * 1.45,
                )
                .stroke({
                  color: C.blue,
                  width: 1,
                  alpha: 0.2 * tacticalAlpha,
                });
            }
            dynamic
              .circle(selected.x, selected.y, 22 + Math.sin(frame * 0.03))
              .stroke({ color: C.blue, width: 1.5, alpha: 0.7 });
            dynamic
              .circle(selected.x, selected.y, 27)
              .stroke({ color: C.blue, width: 0.7, alpha: 0.25 });
          }
          for (const p of w.places) {
            if (!p.discovered) continue;
            const c = w.cells[p.cell],
              color =
                p.faction === "ally"
                  ? C.blue
                  : p.faction === "enemy"
                    ? C.red
                    : 0x7d8274;
            const sel =
              s.selection?.kind === "place" && s.selection.id === p.id;
            if (sel) dynamic.circle(c.x, c.y, 26).stroke({ color, width: 1.6 });
            if (p.threatened)
              dynamic.circle(c.x, c.y, 28 + Math.sin(frame * 0.06) * 5).stroke({
                color: C.red,
                width: 2,
                alpha: 0.4 + Math.sin(frame * 0.06) * 0.2,
              });
            if (p.kind === "fort") {
              dynamic
                .circle(c.x, c.y, 20)
                .fill({ color: C.paper, alpha: 0.75 });
              fort(dynamic, c.x, c.y, color, 1.1);
              dynamic
                .moveTo(c.x - 6, c.y - 12)
                .lineTo(c.x - 6, c.y - 30)
                .stroke({ color, width: 1.3 });
              dynamic
                .poly([
                  c.x - 6,
                  c.y - 30,
                  c.x + 5,
                  c.y - 28,
                  c.x + 3,
                  c.y - 21,
                  c.x - 6,
                  c.y - 23,
                ])
                .fill(color);
            } else if (p.kind === "tower") {
              fort(dynamic, c.x, c.y, color, 0.7);
            } else if (p.kind === "village") {
              dynamic
                .poly([
                  c.x - 10,
                  c.y,
                  c.x - 10,
                  c.y + 10,
                  c.x + 3,
                  c.y + 10,
                  c.x + 3,
                  c.y,
                  c.x - 4,
                  c.y - 8,
                ])
                .fill(color)
                .stroke({ color: C.paper, width: 1.5 });
              dynamic
                .poly([
                  c.x + 4,
                  c.y + 3,
                  c.x + 4,
                  c.y + 11,
                  c.x + 12,
                  c.y + 11,
                  c.x + 12,
                  c.y + 3,
                  c.x + 8,
                  c.y - 2,
                ])
                .fill(color);
              dynamic.rect(c.x - 5, c.y + 3, 4, 7).fill(C.paper);
            } else {
              dynamic
                .roundRect(c.x - 34, c.y - 7, 68, 14, 2)
                .fill(0xb7ad96)
                .stroke({ color: C.paper, width: 1.5 });
              dynamic
                .moveTo(c.x - 33, c.y - 9)
                .lineTo(c.x + 33, c.y - 9)
                .moveTo(c.x - 33, c.y + 9)
                .lineTo(c.x + 33, c.y + 9)
                .stroke({ color: 0x7a7c70, width: 3 });
              for (let i = -25; i <= 25; i += 10)
                dynamic
                  .moveTo(c.x + i, c.y - 5)
                  .lineTo(c.x + i, c.y + 5)
                  .stroke({ color: 0x8c8778, width: 1 });
            }
            if (
              p.faction === "neutral" &&
              p.kind === "village" &&
              p.capture === 0
            ) {
              dynamic
                .circle(c.x, c.y, 23 + Math.sin(frame * 0.025) * 2)
                .stroke({ color: 0x9aa17d, width: 1, alpha: 0.25 });
            }
            if (p.capture > 0) {
              dynamic
                .circle(c.x, c.y, 25)
                .stroke({ color: 0xffffff, width: 4, alpha: 0.7 });
              dynamic
                .arc(
                  c.x,
                  c.y,
                  25,
                  -Math.PI / 2,
                  -Math.PI / 2 + (Math.PI * 2 * p.capture) / 100,
                )
                .stroke({
                  color: p.capturing === "ally" ? C.blue : C.red,
                  width: 3,
                });
            }
            if (p.queue.length) {
              dynamic.rect(c.x - 15, c.y + 17, 30, 3).fill(0xd1d4c7);
              dynamic
                .rect(
                  c.x - 15,
                  c.y + 17,
                  30 * (1 - p.queue[0].remaining / p.queue[0].total),
                  3,
                )
                .fill(C.blue);
            }
          }
          for (const ev of w.events) {
            if (ev.kind !== "discovery" || w.time - ev.time > 18) continue;
            const c = w.cells[ev.cell];
            dynamic
              .circle(c.x, c.y, 28 + Math.sin(frame * 0.035) * 3)
              .stroke({ color: 0xb2985a, width: 1.5, alpha: 0.5 });
            dynamic
              .circle(c.x + 20, c.y - 20, 7)
              .fill(0xb2985a)
              .stroke({ color: C.paper, width: 1.5 });
            dynamic
              .moveTo(c.x + 20, c.y - 24)
              .lineTo(c.x + 20, c.y - 18)
              .stroke({ color: C.paper, width: 1.5 });
            dynamic.circle(c.x + 20, c.y - 16, 1).fill(C.paper);
          }
          // At strategic scale nearby detachments become one company marker.
          const allies = w.units.filter((u) => u.faction === "ally");
          const aggregate = Math.max(0, Math.min(1, (0.7 - zoom) / 0.2));
          const clustered = allies.filter(
            (u) => allies[0] && distance(u, allies[0]) < 5,
          );
          for (const u of w.units) {
            if (!u.revealed) continue;
            const color = u.faction === "ally" ? C.blue : C.red;
            const path = u.path.map((id) => w.cells[id]);
            if (path.length) {
              dashed(
                dynamic,
                [u, ...path],
                color,
                u.faction === "ally" ? 1.8 : 1.4,
                u.faction === "ally" ? 0.8 : 0.55,
                5,
              );
              const end = path[path.length - 1];
              dynamic
                .circle(end.x, end.y, 4)
                .stroke({ color, width: 1.2, alpha: 0.6 });
            }
            const visibility =
              clustered.includes(u) && clustered.length > 1 ? 1 - aggregate : 1;
            if (visibility <= 0) continue;
            dynamic
              .circle(u.x, u.y + 1, 13)
              .fill({ color: C.paper, alpha: 0.7 * visibility });
            symbol(dynamic, u.type, u.x, u.y, 8.5, color, visibility);
            if (u.hp < 99 || selected?.id === u.id) {
              dynamic.rect(u.x - 11, u.y + 15, 22, 2).fill(0xd5d6ca);
              dynamic
                .rect(u.x - 11, u.y + 15, (22 * Math.max(0, u.hp)) / 100, 2)
                .fill(color);
            }
            if (u.isolated) {
              dynamic
                .poly([u.x + 13, u.y - 20, u.x + 20, u.y - 8, u.x + 6, u.y - 8])
                .fill(0xc59d51);
            }
          }
          if (aggregate > 0 && clustered.length > 1) {
            const x = clustered.reduce((a, u) => a + u.x, 0) / clustered.length,
              y = clustered.reduce((a, u) => a + u.y, 0) / clustered.length;
            dynamic
              .circle(x, y, 20)
              .fill({ color: C.paper, alpha: aggregate })
              .stroke({ color: C.blue, width: 2, alpha: aggregate });
            symbol(dynamic, "commander", x, y, 11, C.blue, aggregate);
          }
          if (
            selected?.faction === "ally" &&
            previewPath.length &&
            (!dragged || dragUnit)
          ) {
            dashed(
              tactical,
              [selected, ...previewPath.map((id) => w.cells[id])],
              C.blue,
              1.7,
              0.55,
              5,
            );
            const end = w.cells[previewPath[previewPath.length - 1]];
            tactical
              .circle(end.x, end.y, 8)
              .stroke({ color: C.blue, width: 1.5, alpha: 0.6 });
          }
          if (hover && hover.explored) {
            tactical
              .poly(polygon(hover, R - 1))
              .fill({
                color:
                  s.mode === "move"
                    ? walkable(hover)
                      ? C.blue
                      : C.red
                    : 0xffffff,
                alpha: 0.13,
              })
              .stroke({
                color: s.mode === "move" ? C.blue : 0x6b786c,
                width: 1,
                alpha: 0.55,
              });
            if (s.mode === "move" && selected) {
              dashed(tactical, [selected, hover], C.blue, 1, 0.4);
            }
          }
        });
        cleanup = () => {
          app.canvas.removeEventListener("pointerdown", onDown);
          app.canvas.removeEventListener("pointermove", onMove);
          app.canvas.removeEventListener("pointerup", onUp);
          app.canvas.removeEventListener("wheel", onWheel);
          app.canvas.removeEventListener("contextmenu", context);
          app.destroy(true, { children: true });
        };
      } catch (e) {
        console.error(e);
        if (!disposed) setError(true);
      }
    })();
    return () => {
      disposed = true;
      if (initialized) cleanup();
    };
  }, []);
  return (
    <div className="map-canvas" ref={host}>
      {error && (
        <div className="map-error">
          No se ha podido dibujar el mundo.
          <br />
          <button onClick={() => location.reload()}>Reintentar</button>
        </div>
      )}
    </div>
  );
}
