export const COLS = 50,
  ROWS = 40,
  R = 18,
  DX = Math.sqrt(3) * R,
  DY = R * 1.5;
export type Faction = "ally" | "enemy" | "neutral";
export type Terrain = "plain" | "forest" | "mountain" | "water" | "bridge";
export type UnitType = "infantry" | "archer" | "cavalry" | "commander";
export type Posture = "defend" | "advance" | "patrol";
export interface Hex {
  id: number;
  q: number;
  r: number;
  x: number;
  y: number;
  terrain: Terrain;
  region: string;
  explored: boolean;
  ally: number;
  enemy: number;
  owner: Faction;
  occupant: string | null;
  variation: number;
}
export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  faction: Faction;
  cell: number;
  x: number;
  y: number;
  hp: number;
  path: number[];
  posture: Posture;
  home: number;
  patrol: number[];
  patrolIndex: number;
  revealed: boolean;
  isolated: boolean;
  attackCooldown: number;
  waitUntil?: number;
}
export interface Place {
  id: string;
  name: string;
  kind: "fort" | "village" | "tower" | "bridge";
  cell: number;
  faction: Faction;
  capture: number;
  capturing: Faction | null;
  discovered: boolean;
  threatened: boolean;
  claimed?: boolean;
  queue: { type: UnitType; remaining: number; total: number }[];
}
export interface GameEvent {
  id: number;
  time: number;
  title: string;
  detail: string;
  cell: number;
  kind: "danger" | "discovery" | "capture" | "info";
}
export interface World {
  seed: number;
  cells: Hex[];
  units: Unit[];
  places: Place[];
  time: number;
  gold: number;
  supplies: number;
  events: GameEvent[];
  nextId: number;
  revision: number;
  influenceClock: number;
  incomeClock: number;
  objectiveComplete: boolean;
}
export const cellId = (q: number, r: number) => r * COLS + q;
export const pos = (q: number, r: number) => ({
  x: DX * (q + (r % 2) * 0.5),
  y: DY * r,
});
export const riverQ = (r: number) =>
  26 + Math.sin(r * 0.17) * 2.6 + Math.sin(r * 0.39) * 0.6;
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function neighbors(id: number): number[] {
  const q = id % COLS,
    r = Math.floor(id / COLS);
  const offsets =
    r % 2
      ? [
          [1, 0],
          [-1, 0],
          [0, -1],
          [1, -1],
          [0, 1],
          [1, 1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [-1, -1],
          [0, -1],
          [-1, 1],
          [0, 1],
        ];
  return offsets
    .map(([a, b]) => [q + a, r + b])
    .filter(([a, b]) => a >= 0 && a < COLS && b >= 0 && b < ROWS)
    .map(([a, b]) => cellId(a, b));
}
export const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.hypot(a.x - b.x, a.y - b.y) / DX;
export const walkable = (c: Hex) =>
  c.terrain !== "water" && c.terrain !== "mountain";
export function findPath(cells: Hex[], start: number, end: number): number[] {
  if (start === end || !cells[end] || !walkable(cells[end])) return [];
  const open = new Set([start]),
    came = new Map<number, number>(),
    g = new Map([[start, 0]]),
    f = new Map([[start, distance(cells[start], cells[end])]]);
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const n of open) {
      if ((f.get(n) ?? Infinity) < best) {
        best = f.get(n)!;
        current = n;
      }
    }
    if (current === end) {
      const out: number[] = [];
      while (current !== start) {
        out.unshift(current);
        current = came.get(current)!;
      }
      return out;
    }
    open.delete(current);
    for (const n of neighbors(current)) {
      if (!walkable(cells[n])) continue;
      const score = g.get(current)! + (cells[n].terrain === "forest" ? 1.7 : 1);
      if (score < (g.get(n) ?? Infinity)) {
        came.set(n, current);
        g.set(n, score);
        f.set(n, score + distance(cells[n], cells[end]) * 0.8);
        open.add(n);
      }
    }
  }
  return [];
}
export const typeNames: Record<UnitType, string> = {
  infantry: "Infantería",
  archer: "Arqueros",
  cavalry: "Caballería",
  commander: "Comandante",
};
export const costs: Record<UnitType, number> = {
  infantry: 35,
  archer: 45,
  cavalry: 60,
  commander: 80,
};
export const recruitTime: Record<UnitType, number> = {
  infantry: 12,
  archer: 16,
  cavalry: 20,
  commander: 24,
};
export function createWorld(seed = 24300): World {
  const rand = random(seed);
  const cells: Hex[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let q = 0; q < COLS; q++) {
      const v = rand();
      let terrain: Terrain = "plain";
      const forest =
        Math.sin(q * 0.42) + Math.cos(r * 0.44) + Math.sin((q + r) * 0.3);
      if (forest > 1.08 || (q < 20 && r > 9 && r < 20 && forest > 0.15))
        terrain = "forest";
      if (
        (r < 8 && Math.sin(q * 0.65) + Math.cos(r * 0.8) > 0.1) ||
        (q > 35 && r > 28 && forest > 0.25) ||
        (q < 9 && r < 13 && forest > 0.4)
      )
        terrain = "mountain";
      if (
        Math.abs(q - riverQ(r)) < 1.12 ||
        (r > 30 && q < Math.max(0, (r - 30) * 1.5 + Math.sin(r) * 2))
      )
        terrain = "water";
      if ((r === 21 || r === 22) && Math.abs(q - riverQ(r)) < 2)
        terrain = "bridge";
      const region =
        r < 10
          ? "Altos del Norte"
          : q > 30
            ? "Tierras Rojas"
            : q >= 21
              ? "Paso del Río"
              : r < 21
                ? "Bosque Sombrío"
                : "Valle Claro";
      cells.push({
        id: cellId(q, r),
        q,
        r,
        ...pos(q, r),
        terrain,
        region,
        explored: false,
        ally: 0,
        enemy: 0,
        owner: "neutral",
        occupant: null,
        variation: v,
      });
    }
  const place = (
    id: string,
    name: string,
    kind: Place["kind"],
    q: number,
    r: number,
    faction: Faction,
  ): Place => {
    const cell = cellId(q, r);
    cells[cell].terrain = kind === "bridge" ? "bridge" : "plain";
    for (const n of neighbors(cell))
      if (cells[n].terrain === "mountain") cells[n].terrain = "plain";
    return {
      id,
      name,
      kind,
      cell,
      faction,
      capture: 0,
      capturing: null,
      discovered: faction === "ally",
      claimed: faction === "ally",
      threatened: false,
      queue: [],
    };
  };
  const places = [
    place("fort", "Fuerte del Alba", "fort", 13, 25, "ally"),
    place("village", "Valle Claro", "village", 20, 24, "neutral"),
    place("bridge", "Puente del Vado", "bridge", 25, 21, "neutral"),
    place("tower", "Torre de la Vigía", "tower", 23, 8, "neutral"),
    place("redfort", "Bastión Carmesí", "fort", 39, 17, "enemy"),
    place("forest", "Refugio del Roble", "village", 12, 14, "neutral"),
  ];
  const unit = (
    id: string,
    name: string,
    type: UnitType,
    q: number,
    r: number,
    faction: Faction,
    patrol: number[] = [],
  ): Unit => {
    const cell = cellId(q, r);
    cells[cell].terrain = "plain";
    return {
      id,
      name,
      type,
      faction,
      cell,
      ...pos(q, r),
      hp: 100,
      path: [],
      posture: patrol.length ? "patrol" : "defend",
      home: cell,
      patrol,
      patrolIndex: 0,
      revealed: faction === "ally" || q > 25,
      isolated: false,
      attackCooldown: 0,
    };
  };
  const units = [
    unit("u1", "Guardia del Alba", "infantry", 16, 24, "ally", [
      cellId(15, 24),
      cellId(16, 24),
    ]),
    unit("e1", "Patrulla Carmesí", "infantry", 33, 21, "enemy", [
      cellId(26, 21),
      cellId(33, 21),
    ]),
    unit("e2", "Vigías del Este", "cavalry", 37, 24, "enemy", [
      cellId(32, 27),
      cellId(38, 22),
    ]),
    unit("e3", "Acechadores del Roble", "archer", 13, 15, "enemy", [
      cellId(11, 16),
      cellId(14, 13),
    ]),
  ];
  // Keep the main strategic corridor connected across the bridge.
  for (let q = 13; q <= 39; q++) {
    const r = q < 23 ? 23 : q < 28 ? 21 : 20;
    cells[cellId(q, r)].terrain = q >= 23 && q <= 26 ? "bridge" : "plain";
  }
  return {
    seed,
    cells,
    places,
    units,
    time: 0,
    gold: 35,
    supplies: 0,
    events: [],
    nextId: 10,
    revision: 0,
    influenceClock: 1,
    incomeClock: 0,
    objectiveComplete: false,
  };
}
