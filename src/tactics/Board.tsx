import { troopTypes, troopNames } from "./combat";
import { outpostInfluence, deploymentError } from "./outpost";
import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { useTactics } from "./state";
import { R, DX, route, squadPosition, adjacent } from "./model";
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
  color = BLUE,
) {
  const c = Math.cos(angle),
    d = Math.sin(angle);
  const point = (a: number, b: number) => [
    x + a * c - b * d,
    y + a * d + b * c,
  ];
  s.members.forEach((m, i) => {
    const disorder = Math.max(0, 1 - (s.cohesion ?? 100) / 60);
    const [px, py] =
      s.members.length === 1
        ? [x, y]
        : point(
            (i < 3 ? 10 : -10) + Math.sin(i * 7) * disorder * 6,
            ((i % 3) - 1) * 16 + Math.cos(i * 4) * disorder * 5,
          );
    if (m === "horse") {
      const foot = (a: number, b: number) => [
        px + a * c - b * d,
        py + a * d + b * c,
      ];
      const points = [
        [-10, -5],
        [5, -5],
        [9, -3],
        [12, -3],
        [12, 3],
        [7, 5],
        [-8, 5],
      ]
        .map(([a, b]) => foot(a, b))
        .flat();
      g.poly(points).fill({ color: 0x76654f, alpha });
      for (const a of [-6, 5]) {
        const [x1, y1] = foot(a, -7),
          [x2, y2] = foot(a, 7);
        g.moveTo(x1, y1)
          .lineTo(x2, y2)
          .stroke({ color: 0x50493c, width: 2, alpha });
      }
      g.circle(px, py, 4.7).fill({ color, alpha });
      g.circle(px + c, py + d, 2.5).fill({ color: 0xd2d1bd, alpha });
      const [x1, y1] = foot(-4, -4),
        [x2, y2] = foot(15, -4);
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: INK, width: 1, alpha });
      return;
    }
    g.ellipse(px + 1, py + 3, 7, 5).fill({
      color: 0x344750,
      alpha: 0.13 * alpha,
    });
    g.circle(px, py, 6).fill({ color, alpha });
    const [hx, hy] = [px + 2 * c, py + 2 * d];
    g.circle(hx, hy, 3).fill({ color: 0xc6c9bd, alpha });
    if (m === "shield") {
      const [sx, sy] = [px + 7 * c, py + 7 * d];
      g.circle(sx, sy, 4)
        .fill({ color, alpha })
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
    color,
    alpha,
  });
}
export default function Board() {
  const ref = useRef<HTMLDivElement>(null),
    menuRef = useRef<HTMLDivElement>(null);
  const game = useTactics();
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (game.deployCell === null) setPickerOpen(false);
  }, [game.deployCell]);
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
      const morale = (u: Squad, x: number, y: number, color: number) => {
        if (!u.engaged && !u.routing) return;
        overlay
          .roundRect(x - 21, y + 31, 42, 4, 2)
          .fill({ color: 0x706f60, alpha: 0.25 });
        overlay
          .roundRect(
            x - 21,
            y + 31,
            Math.max(0.2, (42 * (u.cohesion ?? 100)) / 100),
            4,
            2,
          )
          .fill((u.cohesion ?? 100) < 30 ? 0xb28a49 : color);
        if (u.lastHit !== undefined && b.time - u.lastHit < 0.25)
          overlay.circle(x, y, 29).stroke({
            color: 0xe7c381,
            width: 2,
            alpha: 1 - (b.time - u.lastHit) / 0.25,
          });
      };
      const terrain = new Graphics();
      const territory = new Graphics();
      base.addChild(terrain, territory);
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
      if (b.sectors) {
        const roadWorld = { ...b, squads: [], fronts: [] };
        for (const [from, to] of [
          [0, 2],
          [2, 1],
          [2, 3],
          [2, 4],
        ]) {
          const start = b.sectors[from].cell,
            end = b.sectors[to].cell;
          const path = route(
            roadWorld,
            { ...b.squads[0], cell: start, path: [], progress: 0 },
            end,
          );
          road.moveTo(b.cells[start].x, b.cells[start].y);
          for (const id of path) road.lineTo(b.cells[id].x, b.cells[id].y);
          road.stroke({ color: 0xc9b18a, alpha: 0.35, width: 6 });
        }
      } else {
        road
          .moveTo(b.cells[146].x, b.cells[146].y)
          .bezierCurveTo(580, 690, 700, 460, b.cells[158].x, b.cells[158].y)
          .stroke({ color: 0xc9b18a, alpha: 0.5, width: 9 });
      }
      for (const c of b.cells.filter(
        (c) =>
          c.place &&
          (!b.lesson ||
            b.lesson.index < 2 ||
            b.lesson.index >= 4 ||
            c.id === b.lesson.target ||
            (b.lesson.index === 3 && c.id === b.sectors![0].cell)),
      )) {
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
          b.sectors?.find((s) => s.cell === c.id)?.name ??
            (c.place === "fort"
              ? "FUERTE DEL ALBA"
              : c.place === "village"
                ? "ALDEA DEL VALLE"
                : "LA VIGÍA"),
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
          fit = b.outpost
            ? lastW < 700
              ? 0.6
              : Math.min((lastW - 60) / (DX * 16), (lastH - 180) / (R * 14))
            : b.lesson?.index === 0
              ? Math.min((lastW - 60) / (DX * 8), (lastH - 230) / (R * 9))
              : b.lesson && (b.lesson.index === 2 || b.lesson.index === 3)
                ? Math.min((lastW - 60) / (DX * 12), (lastH - 230) / (R * 12))
                : b.fronts
                  ? Math.min((lastW - 50) / (DX * 18), (lastH - 170) / (R * 18))
                  : Math.min((lastW - 55) / (DX * 8), (lastH - 190) / (R * 12));
          pan = {
            x:
              lastW / 2 -
              DX *
                (b.outpost
                  ? lastW < 700
                    ? 6.5
                    : 9
                  : b.lesson?.index === 0
                    ? 5
                    : b.lesson && (b.lesson.index === 2 || b.lesson.index === 3)
                      ? 7
                      : b.fronts
                        ? 8.75
                        : 14.5) *
                fit *
                s.zoom,
            y:
              lastH / 2 -
              R *
                (b.outpost
                  ? 10.5
                  : b.lesson?.index === 0
                    ? 12
                    : b.lesson && (b.lesson.index === 2 || b.lesson.index === 3)
                      ? 9
                      : b.fronts
                        ? 8.2
                        : 9.2) *
                fit *
                s.zoom,
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
          const plusCell =
            b.outpost && Object.values(b.outpost.reserve).some((n) => n > 0)
              ? b.cells.find(
                  (c) =>
                    !deploymentError(b, c.id) &&
                    Math.hypot(p.x - (c.x + 24), p.y - (c.y - 23)) < 10,
                )
              : undefined;
          if (plusCell) {
            useTactics.setState({ deployCell: plusCell.id });
            setPickerOpen(true);
          } else if (u) {
            s.select(u.id);
            if (b.outpost && !deploymentError(b, u.cell))
              useTactics.setState({ deployCell: u.cell });
          } else if (s.selected && id >= 0) s.move(id);
          else if (b.outpost && id >= 0 && !deploymentError(b, id)) {
            useTactics.setState({ deployCell: id, selected: null });
          } else if (b.outpost && id === b.outpost.fort) {
            const candidate = adjacent(id).find((n) => !deploymentError(b, n));
            if (candidate !== undefined)
              useTactics.setState({ deployCell: candidate, selected: null });
          } else if (
            b.bases &&
            b.sectors?.some(
              (sector) =>
                sector.cell === id &&
                (sector.id === "west" || sector.id === "east"),
            )
          ) {
            useTactics.setState({
              selected: null,
              selectedBase: id === b.sectors[0].cell ? "ally" : "enemy",
            });
          } else s.select(null);
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
      // Cache sector edges; ownership colors are redrawn from simulation state.
      const borders = b.sectors
        ? b.cells.map((c) =>
            Array.from({ length: 6 }, (_, k) => {
              const a = (k * Math.PI) / 3,
                near = adjacent(c.id).find((id) => {
                  const n = b.cells[id];
                  return (
                    Math.abs(
                      Math.atan2(
                        Math.sin(Math.atan2(n.y - c.y, n.x - c.x) - a),
                        Math.cos(Math.atan2(n.y - c.y, n.x - c.x) - a),
                      ),
                    ) < 0.2
                  );
                });
              return (
                near === undefined ||
                b.sectorCells![near] !== b.sectorCells![c.id]
              );
            }),
          )
        : [];
      let lastTerritory = -1;
      app.ticker.add(() => {
        transform();
        const s = useTactics.getState();
        overlay.clear();
        if (menuRef.current && s.deployCell !== null) {
          const c = b.cells[s.deployCell],
            x = c.x * world.scale.x + pan.x,
            y = c.y * world.scale.y + pan.y;
          menuRef.current.style.left = `${Math.max(8, Math.min(app.screen.width - 195, x + 24 * world.scale.x))}px`;
          menuRef.current.style.top = `${Math.max(80, Math.min(app.screen.height - 210, y - 23 * world.scale.y))}px`;
          menuRef.current.style.visibility =
            x < 0 || x > app.screen.width || y < 0 || y > app.screen.height
              ? "hidden"
              : "visible";
        }

        if (
          b.sectors &&
          (!b.lesson || b.lesson.index >= 3) &&
          Math.floor(b.time * 2) !== lastTerritory
        ) {
          lastTerritory = Math.floor(b.time * 2);
          territory.clear();
          for (const c of b.cells) {
            const sector = b.sectors[b.sectorCells![c.id]],
              p = b.pressure![c.id],
              color =
                sector.control > 0.05
                  ? BLUE
                  : sector.control < -0.05
                    ? 0xc8615a
                    : 0xb59d73;
            territory
              .poly(hex(c.x, c.y))
              .fill({ color, alpha: 0.035 + Math.abs(sector.control) * 0.12 });
            const strength = Math.max(p.ally, p.enemy);
            if (strength > 0.12 && c.terrain !== "rock")
              territory.poly(hex(c.x, c.y, R - 3)).fill({
                color: p.ally > p.enemy ? BLUE : 0xc8615a,
                alpha: Math.min(0.14, strength * 0.065),
              });
            if (p.enemy > 0.2 && (p.ally > 0.2 || sector.owner === "ally"))
              for (let j = -1; j <= 1; j++)
                territory
                  .moveTo(c.x - 12 + j * 10, c.y + 10)
                  .lineTo(c.x + j * 10, c.y - 10)
                  .stroke({ color: 0xc8615a, alpha: 0.35, width: 1 });
            borders[c.id].forEach((border, k) => {
              if (!border) return;
              const a = ((k * 60 - 30) * Math.PI) / 180;
              territory
                .moveTo(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R)
                .lineTo(
                  c.x + Math.cos(a + Math.PI / 3) * R,
                  c.y + Math.sin(a + Math.PI / 3) * R,
                )
                .stroke({
                  color:
                    sector.owner === "ally"
                      ? BLUE
                      : sector.owner === "enemy"
                        ? 0xc8615a
                        : 0x9b987e,
                  alpha: 0.55,
                  width: 1.6,
                });
            });
          }
        }
        if (b.sectors) {
          if (b.bases)
            for (const side of ["ally", "enemy"] as const) {
              if (b.lesson && b.lesson.index < 4 && side === "enemy") continue;
              const sector = b.sectors[side === "ally" ? 0 : 4],
                c = b.cells[sector.cell],
                color = side === "ally" ? BLUE : 0xc8615a;
              overlay
                .poly(hex(c.x, c.y, R - 5))
                .stroke({ color, width: 2, alpha: 0.6 });
              if (sector.owner === side) {
                const ready =
                  side === "ally" ? b.bases.allyReady : b.bases.enemyReady;
                const duration = side === "ally" ? 30 : 35;
                const progress = Math.max(
                  0,
                  Math.min(1, 1 - (ready - b.time) / duration),
                );
                overlay
                  .moveTo(c.x, c.y - (R - 3))
                  .arc(
                    c.x,
                    c.y,
                    R - 3,
                    -Math.PI / 2,
                    -Math.PI / 2 + progress * Math.PI * 2,
                  )
                  .stroke({ color, width: 2, alpha: 0.8 });
              }
              if (s.selectedBase === side)
                for (const id of adjacent(sector.cell)) {
                  const n = b.cells[id];
                  if (n.terrain === "rock") continue;
                  overlay
                    .circle(n.x, n.y, 5)
                    .stroke({ color, width: 1.4, alpha: 0.5 });
                }
            }
          for (const sector of b.sectors) {
            if (b.lesson && b.lesson.index < 3) continue;
            const c = b.cells[sector.cell],
              color =
                sector.owner === "ally"
                  ? BLUE
                  : sector.owner === "enemy"
                    ? 0xc8615a
                    : 0x9a987c;
            overlay
              .moveTo(c.x - 23, c.y - 10)
              .lineTo(c.x - 23, c.y - 34)
              .stroke({ color: INK, width: 1.4 });
            overlay
              .poly([c.x - 23, c.y - 34, c.x - 6, c.y - 29, c.x - 23, c.y - 22])
              .fill(color);
            if (Math.abs(sector.control) < 0.98) {
              overlay.roundRect(c.x - 24, c.y + 30, 48, 4, 2).fill(0xc9c6b5);
              overlay
                .roundRect(
                  c.x - 24,
                  c.y + 30,
                  Math.max(0.2, (48 * (sector.control + 1)) / 2),
                  4,
                  2,
                )
                .fill(BLUE);
              overlay
                .roundRect(
                  c.x - 24 + (48 * (sector.control + 1)) / 2,
                  c.y + 30,
                  Math.max(0.2, (48 * (1 - sector.control)) / 2),
                  4,
                  2,
                )
                .fill(0xc8615a);
            }
            if (
              sector.owner === "ally" &&
              sector.enemies > sector.allies + 0.08
            )
              overlay.circle(c.x, c.y, R + 3).stroke({
                color: 0xc8615a,
                alpha: 0.2 + Math.sin(b.time * 3) * 0.12,
                width: 2,
              });
          }
          for (const front of b.fronts!) {
            const e = front.troop,
              p = squadPosition(b, e);
            soldiers(overlay, e, p.x, p.y, e.facing, 1, 0xc15c53);
            morale(e, p.x, p.y, 0xc15c53);
            let from = p;
            if (!e.engaged)
              for (const id of e.path) {
                const c = b.cells[id],
                  len = Math.hypot(c.x - from.x, c.y - from.y);
                for (let t = 6; t < len; t += 14)
                  overlay
                    .circle(
                      from.x + ((c.x - from.x) * t) / len,
                      from.y + ((c.y - from.y) * t) / len,
                      1.6,
                    )
                    .fill({ color: 0xc15c53, alpha: e.routing ? 0.3 : 0.55 });
                from = c;
              }
          }
          // Existing allied orders remain visible at strategic scale.
          for (const u of b.squads.filter(
            (u) => u.id !== s.selected && u.path.length,
          )) {
            let from = squadPosition(b, u);
            for (const id of u.path) {
              const c = b.cells[id];
              overlay
                .moveTo(from.x, from.y)
                .lineTo(c.x, c.y)
                .stroke({ color: BLUE, alpha: 0.32, width: 1 });
              from = c;
            }
          }
        }
        if (b.lesson) {
          const c = b.cells[b.lesson.target];
          overlay.poly(hex(c.x, c.y, R - 2)).stroke({
            color: BLUE,
            width: 2,
            alpha: 0.45 + Math.sin(b.time * 2) * 0.15,
          });
          if (b.lesson.index === 0) {
            overlay
              .circle(c.x, c.y, R - 7)
              .stroke({ color: BLUE, alpha: 0.15, width: 3 });
            if (b.lesson.progress > 0)
              overlay
                .moveTo(c.x, c.y - (R - 7))
                .arc(
                  c.x,
                  c.y,
                  R - 7,
                  -Math.PI / 2,
                  -Math.PI / 2 + b.lesson.progress * Math.PI * 2,
                )
                .stroke({ color: BLUE, width: 3 });
          }
        }
        if (b.outpost) {
          if (Object.values(b.outpost.reserve).some((n) => n > 0))
            for (const c of b.cells) {
              if (deploymentError(b, c.id)) continue;
              const x = c.x + 24,
                y = c.y - 23;
              overlay
                .circle(x, y, 8)
                .fill({ color: 0xf5f3ec, alpha: 0.9 })
                .stroke({ color: BLUE, width: 1, alpha: 0.5 });
              overlay
                .moveTo(x - 3, y)
                .lineTo(x + 3, y)
                .moveTo(x, y - 3)
                .lineTo(x, y + 3)
                .stroke({ color: BLUE, width: 1 });
            }
          territory.clear();
          const control = outpostInfluence(b);
          for (const [id, amount] of control) {
            if (amount <= 0) continue;
            const c = b.cells[id];
            territory
              .poly(hex(c.x, c.y, R - 1))
              .fill({ color: BLUE, alpha: amount * 0.18 })
              .stroke({ color: BLUE, alpha: amount * 0.35, width: 1 });
          }
          for (const site of b.outpost.sites) {
            const c = b.cells[site.cell];
            if (site.active) {
              overlay
                .rect(c.x - 11, c.y - 11, 22, 22)
                .fill(0xc5c3b0)
                .stroke({ color: 0x788b82, width: 2 });
              overlay.rect(c.x - 5, c.y - 5, 10, 10).fill(0xe8e5d5);
              overlay
                .moveTo(c.x - 10, c.y - 10)
                .lineTo(c.x - 10, c.y - 31)
                .stroke({ color: INK, width: 1.5 });
              overlay
                .poly([
                  c.x - 10,
                  c.y - 31,
                  c.x + 5,
                  c.y - 27,
                  c.x - 10,
                  c.y - 21,
                ])
                .fill(BLUE);
            } else {
              overlay
                .poly(hex(c.x, c.y, R - 4))
                .stroke({ color: BLUE, width: 1, alpha: 0.3 });
              overlay
                .rect(c.x - 10, c.y - 10, 20, 20)
                .stroke({ color: 0x8e9989, width: 1.5, alpha: 0.65 });
              overlay
                .moveTo(c.x - 5, c.y)
                .lineTo(c.x + 5, c.y)
                .moveTo(c.x, c.y - 5)
                .lineTo(c.x, c.y + 5)
                .stroke({ color: BLUE, width: 1.3, alpha: 0.7 });
              if (site.progress > 0) {
                overlay
                  .moveTo(c.x, c.y - (R - 8))
                  .arc(
                    c.x,
                    c.y,
                    R - 8,
                    -Math.PI / 2,
                    -Math.PI / 2 + site.progress * Math.PI * 2,
                  )
                  .stroke({ color: BLUE, width: 3 });
                overlay
                  .rect(c.x - 8, c.y - 8, 16, 16)
                  .fill({ color: 0xc5c3b0, alpha: site.progress });
              }
            }
          }
        }
        const raid = b.raid,
          village = b.cells[b.raid?.target ?? 8 * 18 + 14];
        if (raid) {
          const danger =
            raid.phase === "loot" ||
            (raid.phase === "approach" &&
              Math.hypot(
                squadPosition(b, raid.troop).x - village.x,
                squadPosition(b, raid.troop).y - village.y,
              ) <
                DX * 3);
          if (!b.outpost) {
            overlay
              .poly(hex(village.x, village.y, R - 2))
              .fill({ color: BLUE, alpha: 0.05 })
              .stroke({ color: BLUE, alpha: 0.4, width: 1.5 });
            overlay
              .moveTo(village.x - 22, village.y - 8)
              .lineTo(village.x - 22, village.y - 37)
              .stroke({ color: INK, width: 1.5 });
            overlay
              .poly([
                village.x - 22,
                village.y - 37,
                village.x - 6,
                village.y - 32,
                village.x - 22,
                village.y - 25,
              ])
              .fill(BLUE);
          }
          if (danger)
            overlay
              .circle(village.x, village.y, R + 4 + Math.sin(b.time * 3) * 3)
              .stroke({
                color: 0xc8615a,
                alpha: 0.3 + Math.sin(b.time * 3) * 0.15,
                width: 2,
              });
          if (raid.stolen > 0) {
            overlay
              .roundRect(village.x - 24, village.y + 29, 48, 4, 2)
              .fill(0xd6d0be);
            overlay
              .roundRect(
                village.x - 24,
                village.y + 29,
                Math.max(0.1, (48 * raid.supplies) / 100),
                4,
                2,
              )
              .fill(BLUE);
          }
          if (raid.phase !== "gone") {
            const e = raid.troop,
              p = squadPosition(b, e);
            soldiers(overlay, e, p.x, p.y, e.facing, 1, 0xc15c53);
            let from = p;
            for (const id of raid.phase === "fight" ? [] : e.path) {
              const c = b.cells[id],
                length = Math.hypot(c.x - from.x, c.y - from.y);
              for (let t = 6; t < length; t += 13)
                overlay
                  .circle(
                    from.x + ((c.x - from.x) * t) / length,
                    from.y + ((c.y - from.y) * t) / length,
                    1.8,
                  )
                  .fill({ color: 0xc15c53, alpha: 0.6 });
              from = c;
            }
            morale(e, p.x, p.y, 0xc15c53);
          }
        }
        for (const hit of b.strikes ?? []) {
          const t = Math.min(1, (b.time - hit.time) / 0.55),
            dx = hit.tx - hit.x,
            dy = hit.ty - hit.y,
            len = Math.hypot(dx, dy) || 1;
          const x = hit.x + dx * t,
            y = hit.y + dy * t - Math.sin(t * Math.PI) * 12;
          if (t < 1)
            overlay
              .moveTo(x - (dx / len) * 9, y - (dy / len) * 9)
              .lineTo(x, y)
              .stroke({ color: hit.enemy ? 0xb65149 : BLUE, width: 1.8 });
          else {
            const a = Math.max(0, 1 - (b.time - hit.time - 0.55) / 0.25);
            overlay
              .moveTo(hit.tx - 5, hit.ty - 5)
              .lineTo(hit.tx + 5, hit.ty + 5)
              .moveTo(hit.tx + 5, hit.ty - 5)
              .lineTo(hit.tx - 5, hit.ty + 5)
              .stroke({ color: 0xb8995f, width: 2, alpha: a });
          }
        }
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
          morale(u, p.x, p.y, BLUE);
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
    <>
      <div
        ref={ref}
        className="tactical-canvas"
        aria-label="Tablero táctico de Valle Claro"
      />
      {game.battle.outpost && game.deployCell !== null && (
        <div
          ref={menuRef}
          className="map-recruit"
          aria-label="Añadir tropas en esta celda"
        >
          {!pickerOpen ? (
            <button
              className="map-plus"
              aria-label="Añadir tropa aquí"
              onClick={() => setPickerOpen(true)}
            >
              +
            </button>
          ) : (
            <>
              <div className="map-recruit-heading">
                <span>
                  {game.battle.squads.find((u) => u.cell === game.deployCell)
                    ?.members.length ?? 0}
                  /6
                </span>
                <button
                  aria-label="Cerrar tropas disponibles"
                  onClick={() => useTactics.setState({ deployCell: null })}
                >
                  ×
                </button>
              </div>
              {troopTypes.map((type) => (
                <button
                  key={type}
                  aria-label={`Añadir ${troopNames[type]}`}
                  disabled={
                    game.battle.outpost!.reserve[type] === 0 ||
                    !!deploymentError(game.battle, game.deployCell!)
                  }
                  onClick={() => game.placeTroop(type)}
                >
                  <i className={`reserve-icon ${type}`}>
                    {type === "shield" ? "♜" : type === "bow" ? "⌁" : "♞"}
                  </i>
                  <span>{troopNames[type]}</span>
                  <b>{game.battle.outpost!.reserve[type]}</b>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
