export const COLS = 18,
  ROWS = 12,
  R = 42,
  DX = Math.sqrt(3) * R;
export type Cell = {
  id: number;
  q: number;
  r: number;
  x: number;
  y: number;
  height: number;
  terrain: "plain" | "forest" | "rock";
  place?: "fort" | "village" | "tower";
};
export type Squad = {
  id: string;
  name: string;
  cell: number;
  facing: number;
  targetFacing: number;
  members: ("shield" | "bow")[];
  path: number[];
  progress: number;
  hold: boolean;
  pendingFacing?: number;
};
export type Battle = { cells: Cell[]; squads: Squad[]; time: number };
export const adjacent = (id: number) => {
  const q = id % COLS,
    r = Math.floor(id / COLS);
  return [
    [1, 0],
    [-1, 0],
    [r % 2 ? 0 : -1, -1],
    [r % 2 ? 1 : 0, -1],
    [r % 2 ? 0 : -1, 1],
    [r % 2 ? 1 : 0, 1],
  ]
    .map(([a, b]) => [q + a, r + b])
    .filter(([a, b]) => a >= 0 && a < COLS && b >= 0 && b < ROWS)
    .map(([a, b]) => b * COLS + a);
};
export function createBattle(): Battle {
  const cells: Cell[] = Array.from({ length: COLS * ROWS }, (_, id) => {
    const q = id % COLS,
      r = Math.floor(id / COLS),
      d = ((q - 6) / 5) ** 2 + ((r - 5) / 4) ** 2;
    return {
      id,
      q,
      r,
      x: DX * (q + (r % 2) * 0.5),
      y: r * R * 1.5,
      height: d < 0.28 ? 30 : d < 1 ? 15 : 0,
      terrain:
        (q * 17 + r * 31) % 43 < 5 && q > 1
          ? "forest"
          : (q === 11 && r > 2 && r < 8) || (q === 4 && r === 3)
            ? "rock"
            : "plain",
    };
  });
  for (const [q, r, p] of [
    [2, 8, "fort"],
    [14, 8, "village"],
    [7, 3, "tower"],
  ] as const) {
    cells[r * COLS + q].place = p;
    cells[r * COLS + q].terrain = "plain";
  }
  const squads: Squad[] = [
    {
      id: "s1",
      name: "Escuadrón I",
      cell: 6 * COLS + 7,
      facing: 0,
      targetFacing: 0,
      members: ["shield", "shield", "shield", "bow", "bow", "bow"],
      path: [],
      progress: 0,
      hold: true,
    },
    {
      id: "s2",
      name: "Escuadrón II",
      cell: 8 * COLS + 5,
      facing: 0,
      targetFacing: 0,
      members: ["shield", "shield", "shield", "shield", "bow", "bow"],
      path: [],
      progress: 0,
      hold: true,
    },
  ];
  squads.forEach((s) => (cells[s.cell].terrain = "plain"));
  return { cells, squads, time: 0 };
}
export function blocked(b: Battle, id: number, squad: string) {
  return (
    !b.cells[id] ||
    b.cells[id].terrain === "rock" ||
    b.squads.some(
      (s) =>
        s.id !== squad &&
        (s.cell === id || s.path[0] === id || s.path.at(-1) === id),
    )
  );
}
export function route(b: Battle, s: Squad, end: number): number[] {
  const start = s.progress > 0 ? s.path[0] : s.cell;
  if (start === end || blocked(b, end, s.id)) return [];
  const open = new Set([start]),
    cost = new Map([[start, 0]]),
    prev = new Map<number, number>();
  while (open.size) {
    let n = [...open].sort((a, c) => cost.get(a)! - cost.get(c)!)[0];
    open.delete(n);
    if (n === end) {
      const p: number[] = [];
      while (n !== start) {
        p.unshift(n);
        n = prev.get(n)!;
      }
      return p;
    }
    for (const next of adjacent(n)) {
      if (blocked(b, next, s.id)) continue;
      const a = b.cells[n],
        c = b.cells[next],
        v =
          cost.get(n)! +
          1 +
          (c.terrain === "forest" ? 0.8 : 0) +
          Math.max(0, c.height - a.height) / 15;
      if (v < (cost.get(next) ?? Infinity)) {
        cost.set(next, v);
        prev.set(next, n);
        open.add(next);
      }
    }
  }
  return [];
}
export function order(b: Battle, id: string, end: number): string | null {
  const s = b.squads.find((s) => s.id === id);
  if (!s) return "Selecciona un escuadrón";
  if (end === s.cell && !s.progress) {
    s.path = [];
    s.hold = true;
    return null;
  }
  const p = route(b, s, end);
  if (!p.length) return "Destino bloqueado o sin acceso";
  s.path = s.progress > 0 ? [s.path[0], ...p] : p;
  s.pendingFacing = undefined;
  s.hold = false;
  return null;
}
export function hold(s: Squad) {
  s.path = s.progress > 0 ? s.path.slice(0, 1) : [];
  s.hold = true;
}
export function advance(b: Battle, dt: number) {
  b.time += dt;
  for (const s of b.squads) {
    let delta =
      ((s.targetFacing - s.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    s.facing += Math.sign(delta) * Math.min(Math.abs(delta), dt * 2.5);
    if (!s.path.length) continue;
    const next = s.path[0];
    if (
      b.squads.some(
        (o) =>
          o.id !== s.id &&
          (o.cell === next || (o.progress > 0 && o.path[0] === next)),
      )
    ) {
      if (!s.progress) {
        const alternative = route(b, s, s.path.at(-1)!);
        if (alternative.length) s.path = alternative;
      }
      continue;
    }
    const a = b.cells[s.cell],
      c = b.cells[next];
    s.targetFacing = Math.atan2(c.y - a.y, c.x - a.x);
    s.progress +=
      dt /
      (1.4 +
        (c.terrain === "forest" ? 1 : 0) +
        Math.max(0, c.height - a.height) / 15);
    if (s.progress >= 1) {
      s.cell = next;
      s.path.shift();
      s.progress = 0;
      if (!s.path.length && s.pendingFacing !== undefined) {
        s.targetFacing = s.pendingFacing;
        s.pendingFacing = undefined;
      }
    }
  }
}
export function squadPosition(b: Battle, s: Squad) {
  const a = b.cells[s.cell],
    c = b.cells[s.path[0]] ?? a;
  return {
    x: a.x + (c.x - a.x) * s.progress,
    y: a.y + (c.y - a.y) * s.progress,
  };
}
