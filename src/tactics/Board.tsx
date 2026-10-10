import { slotsOf, zoneSlots } from "./combat";
import { iconPaths } from "./icons";
import * as art from "./art";
import {
  deploymentError,
  BURN,
  FORT_CAP,
  HOLD,
  hasHouse,
  eaten,
  enemyCamps,
  gathering,
  queue,
  towerError,
  waiting as waitingCount,
} from "./outpost";
import type { Item } from "./outpost";
import { clash, guide, reasons } from "./guide";
import { setSnapshot } from "./report";
import type { Tone } from "./guide";
import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { useTactics } from "./state";
import {
  R,
  DX,
  route,
  squadPosition,
  adjacent,
  allTroops,
  activeRaids,
  FALLEN,
} from "./model";
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
      // A paper halo keeps names readable over fields and forest.
      stroke: { color: 0xf3efe2, width: 3, join: "round" },
    },
  });
  t.anchor.set(0.5);
  t.position.set(x, y);
  parent.addChild(t);
}
// Screen pixels the tray takes on the left edge.
const TRAY = 80;
const ENEMY = 0xb4544b,
  GOOD = 0x3f7f4f,
  // Clan del Humo tokens: soot, with the notch and cohesion ring in ember red.
  CLAN = art.P.soot,
  CREAM = 0xf4f0e3;
// Icon paths (M, L, Q, Z) parsed once and drawn upright at any position.
type Cmd = [string, ...number[]];
const parsed = Object.fromEntries(
  Object.entries(iconPaths).map(([type, paths]) => [
    type,
    paths.map((p) => ({
      fill: !!p.fill,
      cmds: (p.d.match(/[MLQZ][^MLQZ]*/g) ?? []).map(
        (part) =>
          [
            part[0],
            ...part
              .slice(1)
              .trim()
              .split(/[\s,]+/)
              .filter(Boolean)
              .map(Number),
          ] as Cmd,
      ),
    })),
  ]),
) as Record<Item, { fill: boolean; cmds: Cmd[] }[]>;
function icon(
  g: Graphics,
  type: Item,
  x: number,
  y: number,
  size: number,
  color: number,
  alpha = 1,
) {
  const k = size / 20,
    px = (v: number) => x + (v - 10) * k,
    py = (v: number) => y + (v - 10) * k;
  for (const path of parsed[type]) {
    for (const [c, ...n] of path.cmds) {
      if (c === "M") g.moveTo(px(n[0]), py(n[1]));
      else if (c === "L") g.lineTo(px(n[0]), py(n[1]));
      else if (c === "Q")
        g.quadraticCurveTo(px(n[0]), py(n[1]), px(n[2]), py(n[3]));
      else g.closePath();
    }
    if (path.fill) g.fill({ color, alpha });
    else g.stroke({ color, width: 1.6 * Math.max(1, k), alpha, cap: "round" });
  }
}
// Formation position of a slot, in the squad's frame (x towards the front).
export const slotOffset = (slot: number) => ({
  a: slot < 3 ? 8.5 : -8.5,
  b: ((slot % 3) - 1) * 15,
});
// A squad is a small block of six slots in formation, turned to its facing:
// side colour, one icon per member, facing notch and cohesion ring.
function token(
  g: Graphics,
  s: Squad,
  x: number,
  y: number,
  angle: number,
  alpha = 1,
  color = BLUE,
  flash = 0,
) {
  const c = Math.cos(angle),
    d = Math.sin(angle);
  const point = (a: number, b: number) => [
    x + a * c - b * d,
    y + a * d + b * c,
  ];
  const accent = color === CLAN ? ENEMY : color;
  const cohesion = s.cohesion ?? 100,
    faded = s.routing ? 0.55 : 1,
    slots = slotsOf(s),
    hitZone = flash > 0 && s.lastZone ? zoneSlots[s.lastZone] : [];
  g.ellipse(x + 1.5, y + 4, 26, 22).fill({ color: INK, alpha: 0.1 * alpha });
  g.poly([...point(31, 0), ...point(23, 6), ...point(23, -6)]).fill({
    color: accent,
    alpha: alpha * faded,
  });
  if (alpha > 0.5) {
    g.circle(x, y, 29).stroke({ color: 0xd6d0be, width: 3, alpha: 0.7 });
    g.moveTo(x, y - 29)
      .arc(
        x,
        y,
        29,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * Math.max(0.5, cohesion)) / 100,
      )
      .stroke({ color: cohesion < 30 ? 0xc0913f : accent, width: 3 });
  }
  const disorder = Math.max(0, 1 - cohesion / 60);
  for (let slot = 0; slot < 6; slot++) {
    const { a, b } = slotOffset(slot),
      i = slots.indexOf(slot),
      [px, py] = point(
        a + (i >= 0 ? Math.sin(slot * 7) * disorder * 3 : 0),
        b + (i >= 0 ? Math.cos(slot * 4) * disorder * 3 : 0),
      );
    if (i < 0) {
      g.roundRect(px - 6.5, py - 6.5, 13, 13, 3)
        .fill({ color, alpha: 0.12 * alpha * faded })
        .stroke({ color, width: 1, alpha: 0.55 * alpha * faded });
      continue;
    }
    g.roundRect(px - 7.5, py - 7.5, 15, 15, 3.5)
      .fill({ color, alpha: alpha * faded })
      .stroke({
        color: hitZone.includes(slot) ? 0xf0b54a : CREAM,
        width: hitZone.includes(slot) ? 2.5 : 1.2,
        alpha: hitZone.includes(slot) ? flash : alpha,
      });
    icon(g, s.members[i], px, py, 12, CREAM, alpha);
  }
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
      // Reports carry a picture of the map as the player sees it.
      setSnapshot(() => app.renderer.extract.base64(app.stage));
      const observer = new ResizeObserver(() => app.resize());
      observer.observe(ref.current!);
      const world = new Container(),
        base = new Container(),
        overlay = new Graphics(),
        hud = new Graphics();
      app.stage.addChild(world, hud);
      world.addChild(base, overlay);
      const b = useTactics.getState().battle;
      const flashOf = (u: Squad) =>
        u.lastHit === undefined
          ? 0
          : Math.max(0, 1 - (b.time - u.lastHit) / 0.6);
      // Hit flash around the token.
      const morale = (u: Squad, x: number, y: number) => {
        if (u.lastHit !== undefined && b.time - u.lastHit < 0.3)
          overlay.circle(x, y, 31).stroke({
            color: 0xe7c381,
            width: 3,
            alpha: 1 - (b.time - u.lastHit) / 0.3,
          });
      };
      const terrain = new Graphics();
      const territory = new Graphics();
      base.addChild(terrain, territory);
      // Ground: brightness says height (one band per level), hue says soil
      // (meadow, plain, dry, damp by water), smooth over the map.
      const nearWater = (c: (typeof b.cells)[number]) =>
        adjacent(c.id).some(
          (id) =>
            b.cells[id].terrain === "water" || b.cells[id].terrain === "ford",
        );
      const soilOf = (c: (typeof b.cells)[number]): art.Soil => {
        if (c.height === 0 && nearWater(c)) return "damp";
        // The heights are drier, the lowlands greener.
        const z = art.field2(c.x, c.y) - c.height / 100;
        return z > 0.6 ? "meadow" : z < 0.4 ? "dry" : "plain";
      };
      for (const c of b.cells) {
        const soil = soilOf(c);
        terrain
          .poly(hex(c.x, c.y))
          .fill(art.ground(soil, c.height))
          .stroke({ color: 0xaaa998, alpha: 0.18, width: 0.8 });
        if (c.terrain !== "plain" || c.place) continue;
        // Stains of a neighbouring soil, same brightness: variety without
        // blurring the height.
        const z = art.field2(c.x, c.y, 2);
        art.patches(
          terrain,
          c.x,
          c.y,
          c.id,
          art.ground(z > 0.5 ? "meadow" : "dry", c.height),
          0.7,
        );
        // Details that tell the height: scrub and stones up high, meadows,
        // flowers and copses down in the valleys.
        const pick = art.rnd(c.id, 90),
          dx = -10 + art.rnd(c.id, 91) * 20;
        if (c.height > 0) {
          if (pick < 0.3) art.scrub(terrain, c.x + dx, c.y + 6, c.id);
          else if (pick < 0.45) art.stones(terrain, c.x + 8, c.y + 10, c.id);
        } else if (soil === "meadow" || soil === "damp") {
          if (pick < 0.08) art.copse(terrain, c.x + dx, c.y + 2, c.id);
          else if (pick < 0.2) art.flowers(terrain, c.x, c.y - 8, c.id);
          else if (pick < 0.28) art.bush(terrain, c.x + dx, c.y + 8);
        } else if (pick < 0.08) art.stones(terrain, c.x + 8, c.y + 10, c.id);
        else if (pick < 0.14) art.bush(terrain, c.x + dx, c.y + 8);
      }
      // Nothing decorative sits on a cell edge: on this map edges are rules
      // (your frontier, the clan's, and later palisades), so a hedge or a
      // wall there would read as an obstacle that is not one.
      for (const c of b.cells) {
        // Relief: on the heights the north-west face catches the light and
        // the south-east face falls into shadow.
        if (c.height > 0) {
          const corners = hex(c.x, c.y, R - 2);
          terrain
            .poly([...corners.slice(6, 12), c.x, c.y])
            .fill({ color: 0xfffbea, alpha: 0.18 });
          terrain
            .poly([...corners.slice(0, 6), c.x, c.y])
            .fill({ color: 0x5a4e32, alpha: 0.07 });
        }
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
                .stroke({ color: 0x968c6c, width: 2, alpha: 0.85 });
              for (let j = 1; j < 5; j++) {
                const x = x1 + ((x2 - x1) * j) / 5,
                  y = y1 + ((y2 - y1) * j) / 5;
                terrain
                  .moveTo(x, y)
                  .lineTo(x + Math.cos(mid) * 6, y + Math.sin(mid) * 6)
                  .stroke({ color: 0x968c6c, width: 1, alpha: 0.6 });
              }
            }
          }
        }
        if (c.terrain === "forest")
          // Broadleaf in the lowlands, conifers on the hills.
          art.forest(terrain, c.x, c.y, c.id, c.height > 0);
        if (c.terrain === "rock") {
          terrain
            .poly(hex(c.x, c.y, R - 2))
            .fill({ color: 0xc9c6b6, alpha: 0.55 });
          for (const id of adjacent(c.id))
            if (b.cells[id].terrain === "rock" && id > c.id)
              terrain
                .moveTo(c.x, c.y)
                .lineTo(b.cells[id].x, b.cells[id].y)
                .stroke({
                  color: 0xa4a393,
                  width: 16,
                  alpha: 0.45,
                  cap: "round",
                });
        }
        if (c.terrain === "rock") art.rocks(terrain, c.x, c.y, c.id);
        if (c.terrain === "water" || c.terrain === "ford")
          art.water(
            terrain,
            c.x,
            c.y,
            hex(c.x, c.y, R),
            c.id,
            c.terrain === "ford",
          );
        if (c.terrain === "plain" && !c.place && art.rnd(c.id, 11) < 0.14)
          art.grass(terrain, c.x - 8 + art.rnd(c.id) * 16, c.y + 6, c.id);
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
      } else if (b.outpost?.map && b.outpost.map !== "llanura") {
        // Templates: a dirt road from the fort to each of the clan's camps,
        // along the way troops would take.
        const roadWorld = { ...b, squads: [], raids: [], fronts: [] };
        for (const end of b.outpost.entries ?? []) {
          const start = b.outpost.fort;
          const path = route(
            roadWorld,
            {
              id: "road",
              cell: start,
              path: [],
              progress: 0,
            } as unknown as Squad,
            end,
          );
          road.moveTo(b.cells[start].x, b.cells[start].y);
          for (const id of path) road.lineTo(b.cells[id].x, b.cells[id].y);
          road.stroke({
            color: 0xc9b18a,
            alpha: 0.45,
            width: 8,
            join: "round",
          });
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
            b.outpost ||
            b.lesson.index < 2 ||
            b.lesson.index >= 4 ||
            c.id === b.lesson.target ||
            (b.lesson.index === 3 && c.id === b.sectors![0].cell)),
      )) {
        const g = new Graphics();
        base.addChild(g);
        if (c.place === "fort") art.fort(g, c.x, c.y);
        // The rival camp is drawn with the clan's camps (see enemyCamps).
        else if (c.place === "village") {
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
                : c.place === "camp"
                  ? "CAMPAMENTO RIVAL"
                  : "LA VIGÍA"),
          c.x,
          c.y + 50,
          9,
        );
      }
      // Height marks, one per hill: on the highest ground of each rise
      // (a lower rise only gets its own when no summit sits on it).
      for (const level of [30, 15]) {
        const seen = new Set<number>();
        for (const c of b.cells) {
          if (c.height !== level || seen.has(c.id)) continue;
          const group = [c.id];
          seen.add(c.id);
          for (let i = 0; i < group.length; i++)
            for (const id of adjacent(group[i]))
              if (b.cells[id].height === level && !seen.has(id)) {
                seen.add(id);
                group.push(id);
              }
          if (
            level === 15 &&
            group.some((id) => adjacent(id).some((n) => b.cells[n].height > 15))
          )
            continue;
          const cx =
              group.reduce((t, id) => t + b.cells[id].x, 0) / group.length,
            cy = group.reduce((t, id) => t + b.cells[id].y, 0) / group.length,
            peak = group
              .map((id) => b.cells[id])
              .filter((p) => p.terrain !== "rock" && p.terrain !== "forest")
              .sort(
                (p, q) =>
                  Math.hypot(p.x - cx, p.y - cy) -
                  Math.hypot(q.x - cx, q.y - cy),
              )[0];
          if (peak) text(base, `▲ ${level}`, peak.x, peak.y - 14, 11, 0x7d735a);
        }
      }
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
        moved = false,
        // A waiting troop being dragged from the fort, in world coordinates.
        drag: { type: Item; index: number; x: number; y: number } | null = null;
      // Yard spot of the troop in hand, and the pointer on the map (world).
      let heldIndex = -1,
        pointer = { x: -1e4, y: -1e4 };
      // Waiting troops stand in a tray fixed to the left edge of the screen,
      // two columns of three, whatever the camera does. It is drawn in world
      // units (converted from screen pixels each frame) so dragging works the
      // same as anywhere on the map. k: world units per tray unit.
      const yard = () => px(20) / 16;
      const kits = () => b.outpost?.kits ?? 0;
      const trayRect = () => {
        const k = yard(),
          w = 44 * k,
          // Towers to place sit in a row below the troops.
          h = (62 + (kits() ? 22 : 0)) * k,
          top = app.screen.width < 700 ? 170 : 130,
          sy = Math.max(top, (top + app.screen.height - 100) / 2 - 31 * 1.25);
        return {
          x: (16 - pan.x) / world.scale.x,
          y: (sy - pan.y) / world.scale.y,
          w,
          h,
          k,
        };
      };
      const queueSpots = () => {
        const t = trayRect(),
          k = t.k;
        return [
          ...Array.from({ length: FORT_CAP }, (_, i) => ({
            x: t.x + t.w / 2 + (i < 3 ? 10 : -10) * k,
            y: t.y + 31 * k + ((i % 3) - 1) * 19 * k,
          })),
          ...Array.from({ length: Math.min(2, kits()) }, (_, i) => ({
            x: t.x + t.w / 2 + (i ? -10 : 10) * k,
            y: t.y + 72 * k,
          })),
        ];
      };
      // What sits on each tray spot: waiting troops, then towers to place.
      const trayItems = (): (Item | undefined)[] => {
        const troops: (Item | undefined)[] = queue(b.outpost!);
        return [
          ...Array.from({ length: FORT_CAP }, (_, i) => troops[i]),
          ...Array<Item>(Math.min(2, kits())).fill("tower"),
        ];
      };
      // Squads that can take one more troop where they stand.
      const hosts = () =>
        b.squads.filter(
          (u) => u.members.length < 6 && !deploymentError(b, u.cell),
        );
      // The squad under a point that can take one more troop.
      const hostAt = (p: { x: number; y: number }) =>
        hosts().find((u) => {
          const w = squadPosition(b, u);
          return Math.hypot(w.x - p.x, w.y - p.y) < Math.max(R * 0.8, reach());
        });
      // A distance on screen, in world units: touch targets stay finger-sized.
      const px = (n: number) => n / (world.scale.x || 1);
      const reach = () => Math.max(12, px(22));
      const drop = (p: { x: number; y: number }, type: Item) => {
        const s = useTactics.getState();
        if (type === "tower") {
          const id = cellAt(p);
          if (id < 0 || towerError(b, id)) return false;
          s.dropTower(id);
          return true;
        }
        // Anywhere on a squad joins it; its formation arranges itself.
        const host = hostAt(p);
        if (host) return (s.dropTroop(host.cell, type), true);
        const id = cellAt(p);
        if (id < 0 || deploymentError(b, id)) return false;
        s.dropTroop(id, type);
        return true;
      };
      const canvas = app.canvas;
      const transform = () => {
        const s = useTactics.getState();
        // The canvas can report a zero size before layout settles.
        if (app.screen.width < 50 || app.screen.height < 50) return;
        if (
          app.screen.width !== lastW ||
          app.screen.height !== lastH ||
          s.focus !== lastFocus
        ) {
          lastW = app.screen.width;
          lastH = app.screen.height;
          const narrow = lastW < 700;
          // The frontier is framed whole: fort and yard, every site and the
          // clan's camps, so the enemy is in view from the first frame.
          const frame = b.outpost
            ? [
                b.outpost.fort,
                ...b.outpost.sites.map((x) => x.cell),
                ...enemyCamps(b),
              ]
                .map((id) => b.cells[id])
                .reduce(
                  (box, c) => ({
                    x0: Math.min(box.x0, c.x - R),
                    x1: Math.max(box.x1, c.x + R),
                    y0: Math.min(box.y0, c.y - R),
                    y1: Math.max(box.y1, c.y + R * 1.5),
                  }),
                  {
                    x0: Infinity,
                    x1: -Infinity,
                    y0: Infinity,
                    y1: -Infinity,
                  },
                )
            : null;
          fit = frame
            ? narrow
              ? 0.6
              : Math.min(
                  // The tray takes the left edge of the screen.
                  (lastW - 60 - TRAY) / (frame.x1 - frame.x0),
                  (lastH - 200) / (frame.y1 - frame.y0),
                  1.25,
                )
            : b.fronts
              ? Math.min((lastW - 50) / (DX * 18), (lastH - 170) / (R * 18))
              : Math.min((lastW - 55) / (DX * 8), (lastH - 190) / (R * 12));
          const z = fit * s.zoom;
          pan = b.outpost
            ? {
                x: narrow
                  ? // Phones: the fort just right of the tray, the frontier ahead.
                    TRAY + 8 - (b.cells[b.outpost.fort].x - R * 1.2) * z
                  : (lastW + TRAY) / 2 - ((frame!.x0 + frame!.x1) / 2) * z,
                y: narrow
                  ? (lastH + 120) / 2 - R * 9 * z
                  : (lastH + 90) / 2 - ((frame!.y0 + frame!.y1) / 2) * z,
              }
            : {
                x: lastW / 2 - DX * (b.fronts ? 8.75 : 14.5) * z,
                y: lastH / 2 - R * (b.fronts ? 8.2 : 9.2) * z,
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
      // Two fingers pinch to zoom around their midpoint.
      const pointers = new Map<number, { x: number; y: number }>();
      // Capture can fail for pointers the browser no longer tracks.
      const capture = (id: number) => {
        try {
          canvas.setPointerCapture(id);
        } catch {
          /* The gesture still works without capture. */
        }
      };
      let lift = 0,
        pinch: {
          distance: number;
          zoom: number;
          anchor: { x: number; y: number };
        } | null = null;
      const pinchState = () => {
        const [a, c] = [...pointers.values()],
          rect = canvas.getBoundingClientRect();
        return {
          distance: Math.hypot(a.x - c.x, a.y - c.y) || 1,
          mid: {
            x: (a.x + c.x) / 2 - rect.left,
            y: (a.y + c.y) / 2 - rect.top,
          },
        };
      };
      const pointerDown = (e: PointerEvent) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const { distance, mid } = pinchState();
          pinch = {
            distance,
            zoom: useTactics.getState().zoom,
            anchor: {
              x: (mid.x - pan.x) / world.scale.x,
              y: (mid.y - pan.y) / world.scale.y,
            },
          };
          down = null;
          drag = null;
          capture(e.pointerId);
          return;
        }
        if (e.button !== 0 || pinch) return;
        canvas.style.cursor = "grabbing";
        const p = local(e),
          u = hit(p);
        if (b.outpost) {
          const items = trayItems(),
            spots = queueSpots(),
            index = items.findIndex(
              (item, k) =>
                !!item &&
                Math.hypot(spots[k].x - p.x, spots[k].y - p.y) < reach(),
            );
          if (index >= 0) {
            lift = e.pointerType === "touch" ? px(48) : 0;
            drag = { type: items[index]!, index, x: p.x, y: p.y - lift };
          }
        }
        down = {
          x: e.clientX,
          y: e.clientY,
          panX: pan.x,
          panY: pan.y,
          unit: u?.id ?? null,
        };
        moved = false;
        capture(e.pointerId);
      };
      const pointerMove = (e: PointerEvent) => {
        pointer = local(e);
        if (pointers.has(e.pointerId))
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pointers.size === 2) {
          const { distance, mid } = pinchState(),
            z = Math.max(
              0.65,
              Math.min(2.8, (pinch.zoom * distance) / pinch.distance),
            );
          useTactics.setState({ zoom: z });
          lastZoom = z;
          pan = {
            x: mid.x - pinch.anchor.x * fit * z,
            y: mid.y - pinch.anchor.y * fit * z,
          };
          return;
        }
        hover = cellAt(local(e));
        const state = useTactics.getState();
        canvas.style.cursor = down
          ? "grabbing"
          : hit(local(e)) ||
              (b.outpost && hover >= 0 && !deploymentError(b, hover))
            ? "pointer"
            : state.selected
              ? "crosshair"
              : "grab";
        if (drag && down) {
          const p = local(e);
          drag.x = p.x;
          drag.y = p.y - lift;
          if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6)
            moved = true;
          return;
        }
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
        pointers.delete(e.pointerId);
        if (pinch) {
          // The gesture ends when both fingers are up; no tap is taken from it.
          if (!pointers.size) pinch = null;
          if (canvas.hasPointerCapture(e.pointerId))
            canvas.releasePointerCapture(e.pointerId);
          return;
        }
        if (!down) return;
        const s = useTactics.getState(),
          p = local(e),
          id = cellAt(p),
          u = hit(p);
        if (drag) {
          const { type, index, x, y } = drag;
          drag = null;
          if (moved) drop({ x, y }, type);
          // A tap picks the troop up (or puts it back); the next tap places it.
          else
            useTactics
              .getState()
              .hold(s.held === type && heldIndex === index ? null : type);
          heldIndex = useTactics.getState().held ? index : -1;
        } else if (s.held && !moved) {
          // Holding a troop: tap a hole or a blue cell to place it, else drop it back.
          if (!drop(p, s.held)) s.hold(null);
        } else if (moved && down.unit && id >= 0) s.move(id);
        else if (!moved) {
          if (u) s.select(u.id);
          else if (s.selected && id >= 0) s.move(id);
          else if (
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
        canvas.style.cursor = "grab";
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
      const cancel = (e: PointerEvent) => {
        pointers.delete(e.pointerId);
        if (!pointers.size) pinch = null;
        hover = -1;
        down = null;
        drag = null;
      };
      canvas.addEventListener("pointerdown", pointerDown);
      canvas.addEventListener("pointermove", pointerMove);
      canvas.addEventListener("pointerup", pointerUp);
      canvas.addEventListener("pointercancel", cancel);
      canvas.addEventListener("pointerleave", cancel);
      canvas.addEventListener("wheel", wheel, { passive: false });
      // Neighbour across each hex edge k (edge k spans corners k and k + 1).
      const edges = b.cells.map((c) =>
        Array.from({ length: 6 }, (_, k) => {
          const a = (k * Math.PI) / 3;
          return adjacent(c.id).find((id) => {
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
        }),
      );
      // Cache sector edges; ownership colors are redrawn from simulation state.
      const borders = b.sectors
        ? edges.map((row, id) =>
            row.map(
              (near) =>
                near === undefined ||
                b.sectorCells![near] !== b.sectorCells![id],
            ),
          )
        : [];
      let lastTerritory = -1;
      const troopCounts = new Map(
        b.squads.map((u) => [u.id, u.members.length]),
      );
      const deploymentFlashes = new Map<string, number>();
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

      app.ticker.add(() => {
        transform();
        const s = useTactics.getState();
        overlay.clear();

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
            token(overlay, e, p.x, p.y, e.facing, 1, ENEMY);
            morale(e, p.x, p.y);
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
        if (b.outpost) {
          // At rest deploy cells only show faint corners: deploying starts at
          // the yard, and they light up while a troop is in hand.
          for (const c of b.cells) {
            if (deploymentError(b, c.id)) continue;
            const points = hex(c.x, c.y, R - 5);
            for (let k = 0; k < 6; k++) {
              const j = k * 2,
                prev = ((k + 5) % 6) * 2,
                next = ((k + 1) % 6) * 2;
              overlay
                .moveTo(
                  points[j] + (points[prev] - points[j]) * 0.19,
                  points[j + 1] + (points[prev + 1] - points[j + 1]) * 0.19,
                )
                .lineTo(points[j], points[j + 1])
                .lineTo(
                  points[j] + (points[next] - points[j]) * 0.19,
                  points[j + 1] + (points[next + 1] - points[j + 1]) * 0.19,
                )
                .stroke({ color: BLUE, width: 1.5, alpha: 0.3 });
            }
          }
          const camp = b.outpost.camp;
          if (camp && camp.progress > 0 && !camp.taken) {
            const c = b.cells[camp.cell];
            overlay
              .moveTo(c.x, c.y - (R - 6))
              .arc(
                c.x,
                c.y,
                R - 6,
                -Math.PI / 2,
                -Math.PI / 2 + camp.progress * Math.PI * 2,
              )
              .stroke({ color: BLUE, width: 3 });
          }
          // Land: what is yours, with a crisp frontier; red where it is eaten.
          territory.clear();
          const land = b.outpost.land ?? [],
            foe = b.outpost.foe ?? [],
            settled = b.outpost.settled ?? [],
            burning = b.outpost.burning ?? [],
            eating = eaten(b),
            built = new Set([
              b.outpost.fort,
              ...b.outpost.sites.map((x) => x.cell),
              ...(b.outpost.camp ? [b.outpost.camp.cell] : []),
            ]);
          for (const c of b.cells) {
            const v = land[c.id] ?? 0,
              people = settled[c.id] ?? 0,
              fire = b.time - (burning[c.id] ?? -Infinity);
            // The clan's land, in soot, with its own frontier.
            const f = foe[c.id] ?? 0;
            if (f > 0.02)
              territory
                .poly(hex(c.x, c.y, R - 1))
                .fill({ color: CLAN, alpha: f * 0.2 });
            if (f >= HOLD)
              edges[c.id].forEach((n, k) => {
                if (n !== undefined && (foe[n] ?? 0) >= HOLD) return;
                const a = ((k * 60 - 30) * Math.PI) / 180;
                territory
                  .moveTo(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R)
                  .lineTo(
                    c.x + Math.cos(a + Math.PI / 3) * R,
                    c.y + Math.sin(a + Math.PI / 3) * R,
                  )
                  .stroke({ color: CLAN, width: 2.5, alpha: 0.6 });
              });
            if (v > 0.02)
              territory
                .poly(hex(c.x, c.y, R - 1))
                .fill({ color: BLUE, alpha: v * 0.16 });
            if (v >= HOLD)
              edges[c.id].forEach((n, k) => {
                if (n !== undefined && (land[n] ?? 0) >= HOLD) return;
                const a = ((k * 60 - 30) * Math.PI) / 180;
                territory
                  .moveTo(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R)
                  .lineTo(
                    c.x + Math.cos(a + Math.PI / 3) * R,
                    c.y + Math.sin(a + Math.PI / 3) * R,
                  )
                  .stroke({ color: BLUE, width: 2.5, alpha: 0.75 });
              });
            // Raiders' tracks: where they came through, fading slowly.
            const trodden = b.outpost.tracks?.[c.id] ?? 0;
            if (trodden > 0.03 && !built.has(c.id))
              art.tracks(
                territory,
                c.x,
                c.y,
                b.outpost.trackDir?.[c.id] ?? 0,
                trodden,
                c.id,
              );
            // Lived-in ground: fields first, then a house on some cells.
            if (people > 0.25 && !built.has(c.id))
              art.homestead(
                territory,
                c.x,
                c.y,
                c.id,
                people,
                c.terrain === "plain",
                hasHouse(c.id),
              );
            // Burnt ground stays charred until it is lived in again.
            if (fire < 45 && people < 0.3 && !built.has(c.id))
              art.scorched(territory, c.x, c.y, 1 - fire / 45, c.id);
            if (fire < BURN) {
              // Flames, then smoke drifting up: the enemy is burning your people.
              art.fire(territory, c.x, c.y, 1 - fire / BURN, b.time);
              art.smoke(territory, c.x, c.y, fire);
            } else if (eating.has(c.id) && v > 0.02) {
              territory
                .poly(hex(c.x, c.y, R - 3))
                .fill({ color: ENEMY, alpha: 0.08 + v * 0.1 });
              for (let j = -1; j <= 1; j++)
                territory
                  .moveTo(c.x - 12 + j * 11, c.y + 11)
                  .lineTo(c.x + j * 11, c.y - 11)
                  .stroke({ color: ENEMY, width: 1.2, alpha: 0.45 });
            }
          }
          // Spots the mission suggests for the towers still in the tray:
          // a faint ring of stones, no flag yet.
          if (b.outpost.kits)
            for (const id of b.outpost.suggested ?? []) {
              if (b.outpost.sites.some((x) => x.cell === id)) continue;
              const c = b.cells[id];
              overlay
                .poly(hex(c.x, c.y, R - 4))
                .stroke({ color: BLUE, width: 1.5, alpha: 0.3 });
              for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4;
                overlay
                  .circle(c.x + Math.cos(a) * 13, c.y + Math.sin(a) * 13, 2.4)
                  .fill({ color: art.P.stone, alpha: 0.7 });
              }
            }
          for (const site of b.outpost.sites) {
            const c = b.cells[site.cell];
            if (site.active) art.tower(overlay, c.x, c.y);
            else {
              overlay
                .poly(hex(c.x, c.y, R - 4))
                .fill({ color: BLUE, alpha: 0.05 })
                .stroke({ color: BLUE, width: 1.5, alpha: 0.5 });
              if (site.progress > 0) {
                art.scaffold(overlay, c.x, c.y, site.progress);
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
              } else art.emplacement(overlay, c.x, c.y);
            }
          }
        }
        // The Clan del Humo camps where its waves set out: always in view,
        // smouldering, and growing while a wave gathers there.
        for (const id of enemyCamps(b)) {
          const c = b.cells[id],
            g = gathering(b).find((w) => w.from === id);
          // Their ground, in soot, as yours is in blue.
          overlay
            .poly(hex(c.x, c.y, R - 1))
            .fill({ color: CLAN, alpha: 0.12 })
            .stroke({ color: CLAN, width: 2.5, alpha: 0.55 });
          art.warCamp(
            overlay,
            c.x,
            c.y,
            0.25 + 0.75 * (g?.progress ?? 0),
            b.time,
          );
        }
        for (const raid of activeRaids(b)) {
          const village = b.cells[raid.target ?? 8 * 18 + 14];
          const danger =
            !raid.guard &&
            (raid.phase === "loot" ||
              (raid.phase === "approach" &&
                Math.hypot(
                  squadPosition(b, raid.troop).x - village.x,
                  squadPosition(b, raid.troop).y - village.y,
                ) <
                  DX * 3));
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
            token(overlay, e, p.x, p.y, e.facing, 1, CLAN, flashOf(e));
            // Each raid marches under the clan's standard.
            art.clanBanner(overlay, p.x + 20, p.y - 14, 30, 1, b.time);
            // Raiders heading home carry their loot: still worth catching.
            if (raid.outcome === "raided") {
              art.sack(overlay, p.x - 14, p.y - 14);
              art.sack(overlay, p.x + 12, p.y - 16);
            }
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
            morale(e, p.x, p.y);
          }
        }
        // Raids destroyed in battle: the men scatter, then what they
        // dropped stays on the field for a while.
        for (const f of b.fallen ?? []) {
          const age = b.time - f.time;
          if (age > FALLEN) continue;
          // Your fallen leave the march's colours; theirs, the clan's.
          const ours = f.side === "ally";
          art.fallen(
            overlay,
            f.x + (ours ? 10 : 0),
            f.y + (ours ? 12 : 0),
            Math.min(1, (FALLEN - age) / 8) * (ours ? 0.8 : 1),
            f.time,
            ours ? art.P.ally : art.P.soot,
            ours ? 0x24506e : art.P.enemyDark,
          );
          if (age < 1.2 && !ours)
            art.rout(overlay, f.x, f.y, age / 1.2, f.units.length);
        }
        // Clashes: contested hexes tint and a crossed marker sits between foes.
        const clashes = new Set<string>();
        for (const u of allTroops(b)) {
          const foe = u.engaged
            ? allTroops(b).find((o) => o.id === u.engaged)
            : undefined;
          if (!foe) continue;
          const key = [u.id, foe.id].sort().join("|");
          if (clashes.has(key)) continue;
          clashes.add(key);
          const p = squadPosition(b, u),
            q = squadPosition(b, foe),
            pulse = reducedMotion.matches ? 0 : Math.sin(b.time * 5) * 0.04;
          for (const at of [p, q])
            overlay
              .poly(hex(at.x, at.y, R - 3))
              .fill({ color: 0xc8615a, alpha: 0.1 + pulse });
          const mx = (p.x + q.x) / 2,
            my = (p.y + q.y) / 2;
          // The crossed swords take the colour of whoever is winning.
          const ally = b.squads.find((x) => x === u || x === foe),
            other = ally === u ? foe : u,
            side = ally ? clash(b, ally, other) : null,
            fill = side === "good" ? GOOD : side === "danger" ? ENEMY : CREAM,
            mark = side ? CREAM : INK,
            grow = side ? 2 + pulse * 25 : 0;
          overlay
            .circle(mx, my, 9 + grow)
            .fill({ color: fill, alpha: 0.95 })
            .stroke({
              color: side ? CREAM : INK,
              width: side ? 2 : 1,
              alpha: side ? 1 : 0.5,
            });
          overlay
            .moveTo(mx - 5, my - 5)
            .lineTo(mx + 5, my + 5)
            .moveTo(mx + 5, my - 5)
            .lineTo(mx - 5, my + 5)
            .stroke({ color: mark, width: 2 });
          // Beside the swords, on each side's half, why it is winning: the
          // troop that beats who it hits, the high ground, a blow on the flank.
          if (ally && other)
            for (const [att, tgt, colour] of [
              [ally, other, BLUE],
              [other, ally, CLAN],
            ] as const) {
              const why = reasons(b, att, tgt),
                from = squadPosition(b, att),
                len = Math.hypot(from.x - mx, from.y - my) || 1,
                ux = (from.x - mx) / len,
                uy = (from.y - my) / len;
              const glyphs: ((x: number, y: number) => void)[] = [];
              if (why.troop) {
                const type = why.troop;
                glyphs.push((x, y) => icon(overlay, type, x, y, 10, CREAM));
              }
              if (why.height)
                glyphs.push((x, y) =>
                  overlay
                    .poly([x - 4.5, y + 3.5, x, y - 4, x + 4.5, y + 3.5])
                    .fill(CREAM),
                );
              if (why.side)
                glyphs.push((x, y) =>
                  overlay
                    .arc(x, y, 3.8, Math.PI * 0.9, Math.PI * 2.2)
                    .stroke({
                      color: CREAM,
                      width: why.exposed ? 2.4 : 1.5,
                      cap: "round",
                    })
                    .poly([
                      x + 4.6,
                      y + 3.6,
                      x + 1.2,
                      y + 3.2,
                      x + 3.8,
                      y + 0.4,
                    ])
                    .fill(CREAM),
                );
              glyphs.forEach((draw, k) => {
                // Out to the side of the line between foes (each side its
                // own way), leaning towards whoever holds the advantage.
                const out = 21 + k * 15,
                  x = mx + ux * 6 - uy * out,
                  y = my + uy * 6 + ux * out;
                overlay
                  .roundRect(x - 6.5, y - 6.5, 13, 13, 3)
                  .fill(colour)
                  .stroke({ color: CREAM, width: 1 });
                draw(x, y);
              });
            }
        }
        for (const hit of b.strikes ?? []) {
          const t = Math.min(1, (b.time - hit.time) / 0.45),
            dx = hit.tx - hit.x,
            dy = hit.ty - hit.y,
            len = Math.hypot(dx, dy) || 1,
            color = hit.enemy ? ENEMY : BLUE;
          const x = hit.x + dx * t,
            y = hit.y + dy * t - Math.sin(t * Math.PI) * 14;
          if (t < 1)
            overlay
              .moveTo(x - (dx / len) * 12, y - (dy / len) * 12)
              .lineTo(x, y)
              .stroke({ color, width: 2.6, cap: "round" });
          else {
            const k = Math.min(1, (b.time - hit.time - 0.45) / 0.35);
            if (k >= 1) continue;
            overlay
              .circle(hit.tx, hit.ty, 8 + k * 16)
              .stroke({ color, width: 3 * (1 - k), alpha: 1 - k });
            for (let j = 0; j < 4; j++) {
              const a = j * (Math.PI / 2) + Math.PI / 4,
                r1 = 6 + k * 10,
                r2 = 11 + k * 14;
              overlay
                .moveTo(hit.tx + Math.cos(a) * r1, hit.ty + Math.sin(a) * r1)
                .lineTo(hit.tx + Math.cos(a) * r2, hit.ty + Math.sin(a) * r2)
                .stroke({ color: 0xd9a54a, width: 2, alpha: 1 - k });
            }
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
            token(overlay, selected, end.x, end.y, selected.targetFacing, 0.25);
          }
          if (hover >= 0 && hover !== selected.cell) {
            const c = b.cells[hover],
              valid = route(b, selected, hover).length > 0;
            overlay
              .poly(hex(c.x, c.y, R - 4))
              .fill({ color: valid ? BLUE : 0xbe6359, alpha: 0.09 })
              .stroke({ color: valid ? BLUE : 0xbe6359, width: 1, alpha: 0.7 });
            if (valid)
              token(overlay, selected, c.x, c.y, selected.targetFacing, 0.2);
          }
        }
        for (const u of b.squads) {
          const p = squadPosition(b, u);
          const now = performance.now();
          if ((troopCounts.get(u.id) ?? 0) < u.members.length)
            deploymentFlashes.set(u.id, now);
          troopCounts.set(u.id, u.members.length);
          const age = now - (deploymentFlashes.get(u.id) ?? -10000);
          if (age < 650 && !reducedMotion.matches)
            overlay
              .circle(p.x, p.y, 15 + age / 25)
              .stroke({ color: BLUE, width: 2, alpha: 0.55 * (1 - age / 650) });

          token(overlay, u, p.x, p.y, u.facing, 1, BLUE, flashOf(u));
          morale(u, p.x, p.y);
        }
        // Building, above the squads so it reads: an empty site shows the
        // squad it is waiting for; a squad on it works (sparks, progress);
        // a finished tower raises its flag and frees the squad.
        if (b.outpost)
          for (const site of b.outpost.sites) {
            const c = b.cells[site.cell],
              t = b.time;
            if (!site.active) {
              const builder = b.squads.find(
                (u) => u.cell === site.cell && !u.path.length && !u.routing,
              );
              const coming = b.squads.some((u) => u.path.at(-1) === site.cell);
              if (!builder && !coming) {
                // The squad this site is waiting for, as a dashed outline.
                const a = 0.35 + (Math.sin(t * 3) + 1) * 0.15;
                for (let slot = 0; slot < 6; slot++) {
                  const { a: fx, b: fy } = slotOffset(slot);
                  overlay
                    .roundRect(c.x + fx - 6.5, c.y + fy - 6.5, 13, 13, 3)
                    .stroke({ color: BLUE, width: 1.4, alpha: a });
                }
              } else if (builder && !builder.engaged) {
                // At work: chips fly off the top of the squad.
                for (let k = 0; k < 3; k++) {
                  const ph = (t * 1.6 + k / 3) % 1,
                    ang = -Math.PI / 2 + (k - 1) * 0.7,
                    d = 26 + ph * 14;
                  overlay
                    .moveTo(c.x + Math.cos(ang) * d, c.y + Math.sin(ang) * d)
                    .lineTo(
                      c.x + Math.cos(ang) * (d + 4),
                      c.y + Math.sin(ang) * (d + 4),
                    )
                    .stroke({ color: 0xd9a54a, width: 2, alpha: 1 - ph });
                }
                overlay
                  .moveTo(c.x, c.y - (R - 6))
                  .arc(
                    c.x,
                    c.y,
                    R - 6,
                    -Math.PI / 2,
                    -Math.PI / 2 + site.progress * Math.PI * 2,
                  )
                  .stroke({ color: BLUE, width: 4, cap: "round" });
              }
            } else if (site.builtAt !== null && site.builtAt > 0) {
              const age = t - site.builtAt;
              if (age < 3) {
                // The flag goes up; the squad is free to go.
                overlay.circle(c.x, c.y, R * (0.6 + age * 0.5)).stroke({
                  color: BLUE,
                  width: 3 * (1 - age / 3),
                  alpha: 1 - age / 3,
                });
                const free = b.squads.find((u) => u.cell === site.cell);
                if (free)
                  for (const k of [-1, 1]) {
                    const x = c.x + k * (34 + age * 6);
                    overlay
                      .poly([x, c.y - 6, x + k * 7, c.y, x, c.y + 6])
                      .fill({ color: BLUE, alpha: 1 - age / 3 });
                  }
              }
            }
          }
        const beat = reducedMotion.matches
          ? 0.5
          : (Math.sin(b.time * 4) + 1) / 2;
        if (b.outpost) {
          const o = b.outpost,
            f = b.cells[o.fort],
            waiting = queue(o),
            spots = queueSpots(),
            count = waitingCount(o),
            // Blue with room, amber when nearly full, red when the next arrival is lost.
            tone =
              count >= FORT_CAP
                ? ENEMY
                : count >= FORT_CAP - 1
                  ? 0xc0913f
                  : BLUE;
          const tray = trayRect(),
            k = tray.k;
          overlay
            .roundRect(tray.x, tray.y, tray.w, tray.h, 9 * k)
            .fill({ color: CREAM, alpha: 0.9 })
            .stroke({
              color: tone,
              width: 1.5 + (count >= FORT_CAP ? beat * 2 : 0),
              alpha: count ? 0.9 : 0.4,
            });
          // A new troop walks in from its house before taking its place.
          // Longer walks (spoils carried in from the field) take longer.
          const arrival = o.lastArrival,
            WALK =
              arrival?.from !== undefined
                ? Math.min(
                    5,
                    Math.max(
                      1.8,
                      Math.hypot(
                        b.cells[arrival.from].x - f.x,
                        b.cells[arrival.from].y - f.y,
                      ) / 160,
                    ),
                  )
                : 1.8,
            walking =
              arrival &&
              arrival.from !== undefined &&
              b.time - arrival.time < WALK
                ? waiting.lastIndexOf(arrival.type)
                : -1;
          const items = trayItems();
          spots.forEach((spot, i) => {
            if (!items[i] || i === walking || (drag && drag.index === i)) {
              overlay
                .circle(spot.x, spot.y, 2.5)
                .fill({ color: tone, alpha: 0.35 });
              return;
            }
            const fresh =
              o.lastArrival &&
              o.lastArrival.from === undefined &&
              b.time - o.lastArrival.time < 0.6 &&
              waiting.lastIndexOf(o.lastArrival.type) === i
                ? 1 - (b.time - o.lastArrival.time) / 0.6
                : 0;
            overlay
              .roundRect(
                spot.x - 8 * k,
                spot.y - (8 + fresh * 6) * k,
                16 * k,
                16 * k,
                4 * k,
              )
              .fill(items[i] === "tower" ? art.P.stoneDark : BLUE)
              .stroke({ color: CREAM, width: 1.5 });
            icon(
              overlay,
              items[i]!,
              spot.x,
              spot.y - fresh * 6 * k,
              12 * k,
              CREAM,
            );
          });
          if (walking >= 0 && arrival && arrival.from !== undefined) {
            const t = (b.time - arrival.time) / WALK,
              e = t * t * (3 - 2 * t),
              from = b.cells[arrival.from],
              to = spots[walking],
              x = from.x + (to.x - from.x) * e,
              y = from.y + (to.y - from.y) * e - Math.sin(t * Math.PI) * 10,
              g = yard();
            overlay
              .roundRect(x - 7 * g, y - 7 * g, 14 * g, 14 * g, 3.5 * g)
              .fill(BLUE)
              .stroke({ color: CREAM, width: 1.5 });
            icon(overlay, arrival.type, x, y, 11 * g, CREAM);
          }
          const forming = gathering(b);
          for (const g of forming) {
            const c = b.cells[g.from],
              shown = Math.max(1, Math.ceil(g.progress * g.units.length));
            if (g.progress > 0.75)
              overlay
                .circle(c.x, c.y, 34 + beat * 3)
                .stroke({ color: ENEMY, width: 2, alpha: 0.25 + beat * 0.3 });
            g.units.slice(0, shown).forEach((unit, k) => {
              const x = c.x + ((k % 3) - 1) * 17,
                y =
                  c.y +
                  (Math.floor(k / 3) - (g.units.length > 3 ? 0.5 : 0)) * 17;
              overlay
                .roundRect(x - 7.5, y - 7.5, 15, 15, 3.5)
                .fill(CLAN)
                .stroke({ color: CREAM, width: 1.2 });
              icon(overlay, unit, x, y, 12, CREAM);
            });
          }
          // A troop in hand (dragged, or picked up with a tap) lights up where
          // it can go: free deploy cells and the holes of squads that can be
          // reinforced where they stand.
          const handType = drag?.type ?? s.held,
            at = drag ?? pointer;
          if (handType && !drag && heldIndex >= 0 && heldIndex < spots.length) {
            const spot = spots[heldIndex];
            overlay
              .circle(spot.x, spot.y, 13 * k + beat * 2)
              .stroke({ color: 0xe0a63c, width: 3 });
          }
          if (handType === "tower")
            // A tower in hand: every cell where it could stand lights up.
            for (const c of b.cells) {
              if (towerError(b, c.id)) continue;
              const over = cellAt(at) === c.id;
              overlay
                .poly(hex(c.x, c.y, R - 4))
                .fill({ color: BLUE, alpha: over ? 0.22 : 0.05 + beat * 0.04 })
                .stroke({ color: BLUE, width: over ? 3 : 1.5, alpha: 0.45 });
            }
          if (handType && handType !== "tower") {
            for (const c of b.cells) {
              if (
                deploymentError(b, c.id) ||
                b.squads.some((u) => u.cell === c.id)
              )
                continue;
              const over = cellAt(at) === c.id;
              overlay
                .poly(hex(c.x, c.y, R - 4))
                .fill({ color: BLUE, alpha: over ? 0.22 : 0.08 + beat * 0.06 })
                .stroke({ color: BLUE, width: over ? 3 : 2, alpha: 0.6 });
            }
            // Squads with room light up as a whole: drop anywhere on them.
            const target = hostAt(at);
            for (const u of hosts()) {
              const w = squadPosition(b, u),
                near = u === target;
              overlay
                .circle(w.x, w.y, R * 0.72)
                .fill({ color: BLUE, alpha: near ? 0.2 : 0.06 + beat * 0.06 })
                .stroke({ color: BLUE, width: near ? 3 : 2, alpha: 0.7 });
            }
          }
          if (handType) {
            // No verdict on the troop in hand: whether it was a good choice
            // shows in the fight (see the clash badges).
            const ring = BLUE;
            const g = yard();
            if (!drag) {
              const spot = spots[heldIndex];
              if (spot)
                overlay
                  .circle(spot.x, spot.y, 17 * k)
                  .stroke({ color: ring, width: 2, alpha: 0.7 });
            } else {
              overlay
                .circle(drag.x, drag.y, 15 * g)
                .stroke({ color: ring, width: 3 });
              overlay
                .roundRect(
                  drag.x - 9 * g,
                  drag.y - 9 * g,
                  18 * g,
                  18 * g,
                  4 * g,
                )
                .fill(drag.type === "tower" ? art.P.stoneDark : BLUE)
                .stroke({ color: CREAM, width: 1.5 });
              icon(overlay, drag.type, drag.x, drag.y, 14 * g, CREAM);
            }
          }
        }
        // Off-screen raids and forming waves show as arrows on the screen edge.
        hud.clear();
        const threats = [
          ...activeRaids(b)
            .filter((r) => r.phase !== "retreat")
            .map((r) => squadPosition(b, r.troop)),
          ...gathering(b).map((g) => b.cells[g.from]),
        ];
        // Camps out of view: a quiet soot marker on the edge, no pulse.
        const inView = (x: number, y: number) => {
          const sx = x * world.scale.x + pan.x,
            sy = y * world.scale.y + pan.y;
          return (
            sx >= 0 &&
            sx <= app.screen.width &&
            sy >= (app.screen.width < 700 ? 160 : 120) &&
            sy <= app.screen.height - 90
          );
        };
        const forming = new Set(gathering(b).map((g) => g.from));
        for (const id of enemyCamps(b)) {
          const c = b.cells[id];
          if (forming.has(id) || inView(c.x, c.y)) continue;
          const sx = c.x * world.scale.x + pan.x,
            sy = c.y * world.scale.y + pan.y,
            top = app.screen.width < 700 ? 160 : 120,
            cx = Math.max(24, Math.min(app.screen.width - 24, sx)),
            cy = Math.max(top, Math.min(app.screen.height - 90, sy)),
            a = Math.atan2(sy - cy, sx - cx);
          hud
            .circle(cx, cy, 13)
            .fill({ color: CREAM, alpha: 0.9 })
            .stroke({ color: CLAN, width: 1.5 });
          hud.poly([cx - 6, cy + 4, cx, cy - 5, cx + 6, cy + 4]).fill(CLAN);
          hud
            .poly([
              cx + Math.cos(a) * 17,
              cy + Math.sin(a) * 17,
              cx + Math.cos(a + 0.5) * 12,
              cy + Math.sin(a + 0.5) * 12,
              cx + Math.cos(a - 0.5) * 12,
              cy + Math.sin(a - 0.5) * 12,
            ])
            .fill(CLAN);
        }
        for (const threat of threats) {
          const sx = threat.x * world.scale.x + pan.x,
            sy = threat.y * world.scale.y + pan.y,
            top = app.screen.width < 700 ? 160 : 120,
            bottom = app.screen.height - 90;
          if (sx >= 0 && sx <= app.screen.width && sy >= top && sy <= bottom)
            continue;
          const cx = Math.max(28, Math.min(app.screen.width - 28, sx)),
            cy = Math.max(top, Math.min(bottom, sy)),
            a = Math.atan2(sy - cy, sx - cx),
            pulse = reducedMotion.matches ? 0 : Math.sin(b.time * 4) * 3;
          hud
            .circle(cx, cy, 17 + pulse)
            .fill({ color: CREAM, alpha: 0.92 })
            .stroke({ color: ENEMY, width: 2 });
          hud
            .poly([
              cx + Math.cos(a) * 11,
              cy + Math.sin(a) * 11,
              cx + Math.cos(a + 2.4) * 8,
              cy + Math.sin(a + 2.4) * 8,
              cx + Math.cos(a - 2.4) * 8,
              cy + Math.sin(a - 2.4) * 8,
            ])
            .fill(ENEMY);
        }
        // Signals without words: marks on cells, readings around troops.
        const tones: Record<Tone, number> = {
          go: BLUE,
          danger: ENEMY,
          good: 0x3f7f4f,
        };
        const { marks, readings, yard: callYard } = guide(b, s),
          pulse = reducedMotion.matches ? 0.5 : (Math.sin(b.time * 4) + 1) / 2;
        if (callYard && b.outpost) {
          // Deploying starts here: the yard pulses when it is the next step.
          const t = trayRect(),
            k = t.k;
          overlay
            .roundRect(
              t.x - 5 * k,
              t.y - 5 * k,
              t.w + 10 * k,
              t.h + 10 * k,
              13 * k,
            )
            .stroke({ color: BLUE, width: 2.5, alpha: 0.4 + pulse * 0.5 });
        }
        for (const m of marks) {
          const c = b.cells[m.cell],
            color = tones[m.tone];
          overlay
            .poly(hex(c.x, c.y, R - 3))
            .fill({ color, alpha: 0.06 + pulse * 0.08 })
            .stroke({ color, width: 2.5, alpha: 0.5 + pulse * 0.4 });
          if (m.style === "ghost") {
            // The tower that would stand here.
            overlay
              .rect(c.x - 11, c.y - 11, 22, 22)
              .fill({ color: 0xc5c3b0, alpha: 0.3 + pulse * 0.3 })
              .stroke({ color, width: 1.5, alpha: 0.7 });
            overlay
              .moveTo(c.x - 10, c.y - 10)
              .lineTo(c.x - 10, c.y - 31)
              .stroke({ color: INK, width: 1.5, alpha: 0.45 });
            overlay
              .poly([c.x - 10, c.y - 31, c.x + 5, c.y - 27, c.x - 10, c.y - 21])
              .fill({ color, alpha: 0.5 });
          }
        }
        for (const r of readings) {
          const t = allTroops(b).find((u) => u.id === r.id);
          if (!t) continue;
          const p = squadPosition(b, t),
            color = tones[r.tone],
            up = r.tone === "good";
          overlay
            .circle(p.x, p.y, 34 + pulse * 2)
            .stroke({ color, width: 3, alpha: 0.85 });
          for (let k = 0; k < 2; k++) {
            const cy = p.y - 44 - k * 6;
            overlay
              .moveTo(p.x - 6, cy + (up ? 3 : -3))
              .lineTo(p.x, cy + (up ? -3 : 3))
              .lineTo(p.x + 6, cy + (up ? 3 : -3))
              .stroke({ color, width: 2.4 });
          }
        }
      });
      cleanup = () => {
        setSnapshot(null);
        canvas.removeEventListener("pointerdown", pointerDown);
        canvas.removeEventListener("pointermove", pointerMove);
        canvas.removeEventListener("pointerup", pointerUp);
        canvas.removeEventListener("pointercancel", cancel);
        canvas.removeEventListener("pointerleave", cancel);
        canvas.removeEventListener("wheel", wheel);
        observer.disconnect();
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
    </>
  );
}
