import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { useTactics } from "./state";
import { R, DX, route, squadPosition } from "./model";
import type { Squad } from "./model";
const BLUE = 0x326f97,
  INK = 0x344750;
const hex = (x: number, y: number, r = R) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 30) * Math.PI) / 180;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  }).flat();
function text(
  parent: Container,
  str: string,
  x: number,
  y: number,
  size = 12,
  color = INK,
) {
  const t = new Text({
    text: str,
    style: {
      fontFamily: "Georgia",
      fontSize: size,
      fill: color,
      letterSpacing: 2,
    },
  });
  t.anchor.set(0.5);
  t.position.set(x, y);
  parent.addChild(t);
}
function soldiers(
  g: Graphics,
  s: Squad,
  x: number,
  y: number,
  angle: number,
  alpha = 1,
) {
  const c = Math.cos(angle),
    d = Math.sin(angle);
  const point = (a: number, b: number) => [
    x + a * c - b * d,
    y + a * d + b * c,
  ];
  s.members.forEach((m, i) => {
    const [px, py] = point(i < 3 ? 10 : -10, ((i % 3) - 1) * 16);
    g.ellipse(px + 1, py + 3, 7, 5).fill({
      color: 0x344750,
      alpha: 0.13 * alpha,
    });
    g.circle(px, py, 6).fill({ color: BLUE, alpha });
    const [hx, hy] = [px + 2 * c, py + 2 * d];
    g.circle(hx, hy, 3).fill({ color: 0xc6c9bd, alpha });
    if (m === "shield") {
      const [sx, sy] = [px + 7 * c, py + 7 * d];
      g.circle(sx, sy, 4)
        .fill({ color: 0x214d69, alpha })
        .stroke({ color: 0xdfdfca, width: 1, alpha });
      const [a, b] = [px - 3 * d, py + 3 * c];
      g.moveTo(a - 9 * c, b - 9 * d)
        .lineTo(a + 12 * c, b + 12 * d)
        .stroke({ color: 0x695a43, width: 1.4, alpha });
      g.circle(a + 12 * c, b + 12 * d, 1.5).fill({ color: INK, alpha });
    } else {
      const [a, b] = [px + 8 * c, py + 8 * d];
      g.moveTo(a - 7 * d, b + 7 * c)
        .quadraticCurveTo(a + 9 * c, b + 9 * d, a + 7 * d, b - 7 * c)
        .stroke({ color: 0x806347, width: 1.6, alpha });
      g.moveTo(a - 7 * d, b + 7 * c)
        .lineTo(a + 7 * d, b - 7 * c)
        .stroke({ color: 0xc6b68d, width: 0.8, alpha });
    }
  });
  const [fx, fy] = point(-20, -21);
  g.moveTo(fx, fy + 5)
    .lineTo(fx, fy - 12)
    .stroke({ color: INK, width: 1, alpha });
  g.poly([fx, fy - 12, fx + 12, fy - 9, fx, fy - 5]).fill({
    color: BLUE,
    alpha,
  });
}
export default function Board() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dead = false;
    const app = new Application();
    let cleanup = () => {};
    void (async () => {
      await app.init({
        resizeTo: ref.current!,
        background: 0xf5f3ec,
        antialias: true,
        resolution: Math.min(devicePixelRatio, 2),
        autoDensity: true,
      });
      if (dead) {
        app.destroy(true);
        return;
      }
      ref.current!.appendChild(app.canvas);
      const world = new Container(),
        base = new Container(),
        overlay = new Graphics();
      app.stage.addChild(world);
      world.addChild(base, overlay);
      const b = useTactics.getState().battle;
      const terrain = new Graphics();
      base.addChild(terrain);
      for (const c of b.cells) {
        terrain
          .poly(hex(c.x, c.y))
          .fill(
            c.height === 30 ? 0xe4dfbd : c.height === 15 ? 0xd4d6b9 : 0xeee9d8,
          )
          .stroke({ color: 0xaaa998, alpha: 0.38, width: 0.8 });
        if (c.height > 0) {
          for (let k = 0; k < 6; k++) {
            const a = ((k * 60 - 30) * Math.PI) / 180,
              mid = a + Math.PI / 6,
              near = b.cells
                .filter(
                  (n) =>
                    Math.hypot(n.x - c.x, n.y - c.y) < DX + 1 && n.id !== c.id,
                )
                .find(
                  (n) =>
                    Math.abs(
                      Math.atan2(
                        Math.sin(Math.atan2(n.y - c.y, n.x - c.x) - mid),
                        Math.cos(Math.atan2(n.y - c.y, n.x - c.x) - mid),
                      ),
                    ) < 0.2,
                );
            if (near && near.height < c.height) {
              const x1 = c.x + Math.cos(a) * R,
                y1 = c.y + Math.sin(a) * R,
                x2 = c.x + Math.cos(a + Math.PI / 3) * R,
                y2 = c.y + Math.sin(a + Math.PI / 3) * R;
              terrain
                .moveTo(x1, y1)
                .lineTo(x2, y2)
                .stroke({ color: 0x8c9879, width: 4 });
              for (let j = 1; j < 6; j++) {
                const x = x1 + ((x2 - x1) * j) / 6,
                  y = y1 + ((y2 - y1) * j) / 6;
                terrain
                  .moveTo(x, y)
                  .lineTo(x + Math.cos(mid) * 8, y + Math.sin(mid) * 8)
                  .stroke({ color: 0x7e8e78, width: 1.3 });
              }
            }
          }
        }
        if (c.terrain === "forest") {
          for (let j = 0; j < 3; j++) {
            const x = c.x + (j - 1) * 14,
              y = c.y + (j % 2 ? 10 : -6);
            terrain
              .circle(x + 2, y + 3, 13)
              .fill({ color: 0x384a39, alpha: 0.1 });
            terrain
              .poly(
                Array.from({ length: 9 }, (_, i) => {
                  const a = (i * Math.PI * 2) / 9,
                    r = 12 + (i % 2) * 2;
                  return [x + Math.cos(a) * r, y + Math.sin(a) * r];
                }).flat(),
              )
              .fill(j % 2 ? 0x8a9b79 : 0x778d6e);
            terrain
              .circle(x - 2, y - 3, 7)
              .fill({ color: 0xa3b18d, alpha: 0.3 });
            terrain.circle(x, y, 2).fill(0x5b6b51);
          }
        }
        if (c.terrain === "rock")
          for (let j = 0; j < 3; j++) {
            const x = c.x + (j - 1) * 15,
              y = c.y + (j % 2) * 10;
            terrain
              .poly([
                x - 10,
                y + 5,
                x - 7,
                y - 8,
                x + 2,
                y - 12,
                x + 11,
                y - 2,
                x + 8,
                y + 8,
              ])
              .fill(0xb4b4a7)
              .stroke({ color: 0x939789, width: 1 });
            terrain
              .poly([x - 7, y - 8, x + 2, y - 12, x + 11, y - 2, x, y])
              .fill(0xcccdc0);
          }
        if (c.terrain === "plain" && !c.place && c.id % 9 === 0) {
          for (let j = 0; j < 3; j++)
            terrain
              .moveTo(c.x + j * 4 - 4, c.y + 5)
              .lineTo(c.x + j * 5 - 5, c.y - 2 - (j % 2) * 4)
              .stroke({ color: 0xa9ad87, width: 1 });
        }
      }
      const road = new Graphics();
      base.addChild(road);
      road
        .moveTo(b.cells[146].x, b.cells[146].y)
        .bezierCurveTo(580, 690, 700, 460, b.cells[158].x, b.cells[158].y)
        .stroke({ color: 0xc9b18a, alpha: 0.5, width: 9 });
      for (const c of b.cells.filter((c) => c.place)) {
        const g = new Graphics();
        base.addChild(g);
        if (c.place === "fort") {
          g.roundRect(c.x - 23, c.y - 22, 46, 44, 3)
            .fill(0xc8bea0)
            .stroke({ color: 0x776f58, width: 4 });
          for (const dx of [-22, 22])
            for (const dy of [-21, 21])
              g.rect(c.x + dx - 4, c.y + dy - 4, 8, 8).fill(0x8b8064);
          g.poly([c.x - 15, c.y + 8, c.x - 7, c.y - 9, c.x + 1, c.y + 8]).fill(
            BLUE,
          );
          g.poly([
            c.x + 3,
            c.y + 10,
            c.x + 10,
            c.y - 6,
            c.x + 17,
            c.y + 10,
          ]).fill(0x668fa2);
        } else if (c.place === "village") {
          for (const dx of [-13, 12]) {
            g.rect(c.x + dx - 9, c.y - 12, 18, 26).fill(0xb87958);
            g.moveTo(c.x + dx, c.y - 12)
              .lineTo(c.x + dx, c.y + 14)
              .stroke({ color: 0xe0aa7a, width: 2 });
          }
        } else {
          g.rect(c.x - 12, c.y - 12, 24, 24)
            .fill(0xaba999)
            .stroke({ color: 0x7d8177, width: 3 });
          g.rect(c.x - 6, c.y - 6, 12, 12).fill(0xd8d4bf);
        }
        text(
          base,
          c.place === "fort"
            ? "FUERTE DEL ALBA"
            : c.place === "village"
              ? "ALDEA DEL VALLE"
              : "LA VIGÍA",
          c.x,
          c.y + 50,
          9,
        );
      }
      text(
        base,
        "+30",
        b.cells[4 * 18 + 6].x,
        b.cells[4 * 18 + 6].y,
        13,
        0x7b8068,
      );
      text(
        base,
        "+15",
        b.cells[7 * 18 + 8].x,
        b.cells[7 * 18 + 8].y,
        13,
        0x7b8068,
      );
      text(
        base,
        "0",
        b.cells[9 * 18 + 11].x,
        b.cells[9 * 18 + 11].y,
        13,
        0x8a8e7c,
      );
      let pan = { x: 0, y: 0 },
        fit = 1,
        lastW = 0,
        lastH = 0,
        lastFocus = -1,
        lastZoom = 1,
        hover = -1,
        down: {
          x: number;
          y: number;
          panX: number;
          panY: number;
          unit: string | null;
        } | null = null,
        moved = false;
      const canvas = app.canvas;
      const transform = () => {
        const s = useTactics.getState();
        if (
          app.screen.width !== lastW ||
          app.screen.height !== lastH ||
          s.focus !== lastFocus
        ) {
          lastW = app.screen.width;
          lastH = app.screen.height;
          fit =
            lastW < 700
              ? 0.72
              : Math.min((lastW - 60) / (DX * 18), (lastH - 140) / (R * 18));
          pan = {
            x: lastW / 2 - DX * (lastW < 700 ? 6.5 : 8.75) * fit * s.zoom,
            y: lastH / 2 - R * (lastW < 700 ? 10 : 8.3) * fit * s.zoom,
          };
          lastFocus = s.focus;
          lastZoom = s.zoom;
        }
        if (s.zoom !== lastZoom) {
          const ratio = s.zoom / lastZoom;
          pan = {
            x: lastW / 2 + (pan.x - lastW / 2) * ratio,
            y: lastH / 2 + (pan.y - lastH / 2) * ratio,
          };
          lastZoom = s.zoom;
        }
        world.scale.set(fit * s.zoom);
        world.position.set(pan.x, pan.y);
      };
      const local = (e: PointerEvent | WheelEvent) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left - pan.x) / world.scale.x,
          y: (e.clientY - rect.top - pan.y) / world.scale.y,
        };
      };
      const cellAt = (p: { x: number; y: number }) => {
        let id = -1,
          best = R;
        for (const c of b.cells) {
          const d = Math.hypot(c.x - p.x, c.y - p.y);
          if (d < best) {
            best = d;
            id = c.id;
          }
        }
        return id;
      };
      const hit = (p: { x: number; y: number }) =>
        b.squads.find((s) => {
          const a = squadPosition(b, s);
          return Math.hypot(a.x - p.x, a.y - p.y) < R * 0.8;
        });
      const pointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        const p = local(e),
          u = hit(p);
        down = {
          x: e.clientX,
          y: e.clientY,
          panX: pan.x,
          panY: pan.y,
          unit: u?.id ?? null,
        };
        moved = false;
        canvas.setPointerCapture(e.pointerId);
      };
      const pointerMove = (e: PointerEvent) => {
        hover = cellAt(local(e));
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
          moved = true;
          if (!down.unit)
            pan = {
              x: down.panX + e.clientX - down.x,
              y: down.panY + e.clientY - down.y,
            };
          else if (useTactics.getState().selected !== down.unit)
            useTactics.getState().select(down.unit);
        }
      };
      const pointerUp = (e: PointerEvent) => {
        if (!down) return;
        const s = useTactics.getState(),
          p = local(e),
          id = cellAt(p),
          u = hit(p);
        if (s.orienting && s.selected) {
          const unit = b.squads.find((u) => u.id === s.selected)!;
          const at = squadPosition(b, unit);
          s.rotate(Math.atan2(p.y - at.y, p.x - at.x));
        } else if (moved && down.unit && id >= 0) s.move(id);
        else if (!moved) {
          if (u) s.select(u.id);
          else if (s.selected && id >= 0) s.move(id);
          else s.select(null);
        }
        down = null;
        if (canvas.hasPointerCapture(e.pointerId))
          canvas.releasePointerCapture(e.pointerId);
      };
      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        const p = local(e),
          rect = canvas.getBoundingClientRect(),
          z = Math.max(
            0.65,
            Math.min(
              2.8,
              useTactics.getState().zoom * Math.exp(-e.deltaY * 0.001),
            ),
          );
        useTactics.setState({ zoom: z });
        lastZoom = z;
        pan = {
          x: e.clientX - rect.left - p.x * fit * z,
          y: e.clientY - rect.top - p.y * fit * z,
        };
      };
      const cancel = () => {
        down = null;
      };
      canvas.addEventListener("pointerdown", pointerDown);
      canvas.addEventListener("pointermove", pointerMove);
      canvas.addEventListener("pointerup", pointerUp);
      canvas.addEventListener("pointercancel", cancel);
      canvas.addEventListener("wheel", wheel, { passive: false });
      app.ticker.add(() => {
        transform();
        const s = useTactics.getState();
        overlay.clear();
        const selected = b.squads.find((u) => u.id === s.selected);
        if (selected) {
          const at = squadPosition(b, selected);
          overlay
            .poly(hex(at.x, at.y, R - 3))
            .fill({ color: BLUE, alpha: 0.07 })
            .stroke({ color: BLUE, width: 2 });
          const path = selected.path;
          let from = at;
          for (const id of path) {
            const c = b.cells[id],
              d = Math.hypot(c.x - from.x, c.y - from.y);
            for (let t = 8; t < d; t += 10)
              overlay
                .circle(
                  from.x + ((c.x - from.x) * t) / d,
                  from.y + ((c.y - from.y) * t) / d,
                  2,
                )
                .fill({ color: BLUE, alpha: 0.65 });
            from = c;
          }
          if (path.length) {
            const end = b.cells[path.at(-1)!];
            overlay
              .poly(hex(end.x, end.y, R - 4))
              .stroke({ color: BLUE, alpha: 0.5, width: 1.4 });
            soldiers(
              overlay,
              selected,
              end.x,
              end.y,
              selected.targetFacing,
              0.25,
            );
          }
          if (hover >= 0 && hover !== selected.cell && !s.orienting) {
            const c = b.cells[hover],
              valid = route(b, selected, hover).length > 0;
            overlay
              .poly(hex(c.x, c.y, R - 4))
              .fill({ color: valid ? BLUE : 0xbe6359, alpha: 0.09 })
              .stroke({ color: valid ? BLUE : 0xbe6359, width: 1, alpha: 0.7 });
            if (valid)
              soldiers(overlay, selected, c.x, c.y, selected.targetFacing, 0.2);
          }
          if (s.orienting)
            overlay
              .circle(at.x, at.y, R + 5)
              .stroke({ color: BLUE, width: 1, alpha: 0.6 });
        }
        for (const u of b.squads) {
          const p = squadPosition(b, u);
          soldiers(overlay, u, p.x, p.y, u.facing);
          const a = u.facing;
          overlay
            .poly([
              p.x + Math.cos(a) * 33,
              p.y + Math.sin(a) * 33,
              p.x + Math.cos(a + 0.18) * 27,
              p.y + Math.sin(a + 0.18) * 27,
              p.x + Math.cos(a - 0.18) * 27,
              p.y + Math.sin(a - 0.18) * 27,
            ])
            .fill({ color: BLUE, alpha: 0.65 });
        }
      });
      cleanup = () => {
        canvas.removeEventListener("pointerdown", pointerDown);
        canvas.removeEventListener("pointermove", pointerMove);
        canvas.removeEventListener("pointerup", pointerUp);
        canvas.removeEventListener("pointercancel", cancel);
        canvas.removeEventListener("wheel", wheel);
        app.destroy(true, { children: true });
      };
    })();
    return () => {
      dead = true;
      cleanup();
    };
  }, []);
  return (
    <div
      ref={ref}
      className="tactical-canvas"
      aria-label="Tablero táctico de Valle Claro"
    />
  );
}
