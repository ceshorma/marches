import { attackDamage, zoneFrom } from "./combat";
import type { TroopType } from "./combat";
import { advanceFronts } from "./fronts";
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
  place?: "fort" | "village" | "tower" | "camp";
};
export type Squad = {
  id: string;
  name: string;
  cell: number;
  facing: number;
  targetFacing: number;
  members: TroopType[];
  // Formation slot of each member (see combat.ts); derived when absent.
  layout?: number[];
  // Last zone that took a blow, for the hit flash.
  lastZone?: "front" | "left" | "right" | "rear";
  path: number[];
  progress: number;
  hold: boolean;
  pendingFacing?: number;
  cohesion?: number;
  engaged?: string;
  cooldown?: number;
  routing?: boolean;
  disengaging?: boolean;
  lastHit?: number;
};
export type Raid = {
  target?: number;
  home?: number;
  troop: Squad;
  phase: "approach" | "fight" | "loot" | "retreat" | "gone";
  pressure: number;
  supplies: number;
  stolen: number;
  outcome: "active" | "protected" | "raided";
  resolvedAt: number;
  // Cohesion the raiders recover to between clashes.
  strength?: number;
  // Scripted wave this raid belongs to, and whether its outcome was applied.
  wave?: number;
  handled?: boolean;
};
// A scripted mission: enemy waves and friendly arrivals on a shared clock.
export type WaveSpec = {
  at: number;
  from: number;
  units: TroopType[];
  layout?: number[];
  // "tower" picks the next standing tower (or the fort if none stand).
  target: "tower" | "fort" | number;
  strength: number;
};
export type Script = {
  trigger: "start" | "tower";
  clock: number | null;
  waves: WaveSpec[];
  arrivals: { at: number; type: TroopType }[];
  spawned: number;
  delivered: number;
};
export type Sector = {
  id: string;
  name: string;
  cell: number;
  control: number;
  owner: "ally" | "enemy" | "neutral";
  allies: number;
  enemies: number;
};
export type Front = {
  troop: Squad;
  home: number;
  target: string;
  rethink: number;
};
export type RaidPlan = {
  firstDelay: number;
  interval: number;
  waves: TroopType[][];
  strength: number;
  // Raids stop once this many have been repelled.
  limit: number;
  // Repeat a wave's composition until the player repels it.
  retry?: boolean;
};
export type OutpostSite = {
  cell: number;
  progress: number;
  builtAt: number | null;
  active: boolean;
};
export type Battle = {
  outpost?: {
    fort: number;
    sites: OutpostSite[];
    nextRaid: number;
    nextReinforcement: number;
    serial: number;
    waves: number;
    noticeUntil: number;
    notice: string;
    // Where on the map the notice is anchored, and how it reads.
    noticeAt?: number;
    noticeTone?: "go" | "info" | "danger" | "good";
    // Troops added next to a tower rather than the fort.
    towerDeploys: number;
    recruitAt: number;
    reserve: Record<TroopType, number>;
    arrivals: number;
    lastArrival?: { type: TroopType; time: number };
    // Campaign missions tune these; free play keeps the defaults.
    supply: TroopType[];
    supplyEvery: number;
    raids: RaidPlan;
    repelled: number;
    // Ownership of each cell, 0–1; held from 0.5 (see outpost.ts).
    land?: number[];
    // Progress towards the next troop earned by held land.
    harvest?: number;
    // Arrivals lost because the fort was full.
    turnedAway: number;
    // Raids that ended either way, and raids that sacked the fort.
    resolved: number;
    fortSacked: number;
    lostTowers: number;
    script?: Script;
    camp?: { cell: number; needs: number; progress: number; taken: boolean };
  };
  lesson?: {
    index: number;
    status: "active" | "won" | "lost";
    progress: number;
    target: number;
    nextArrival?: number;
    arrivals?: number;
    deployed?: boolean;
    noticeUntil?: number;
  };
  cells: Cell[];
  squads: Squad[];
  time: number;
  raid?: Raid;
  // Simultaneous raids (outpost and campaign); `raid` is the legacy village scenario.
  raids?: Raid[];
  fronts?: Front[];
  sectors?: Sector[];
  sectorCells?: number[];
  pressure?: { ally: number; enemy: number }[];
  controlClock?: number;
  bases?: { allyReady: number; enemyReady: number; sequence: number };
  strikes?: {
    x: number;
    y: number;
    tx: number;
    ty: number;
    time: number;
    enemy: boolean;
  }[];
};
// Height levels the attacker stands above its target.
export const rise = (b: Battle, source: Squad, target: Squad) =>
  (b.cells[source.cell].height - b.cells[target.cell].height) / 15;
export const allTroops = (b: Battle) => [
  ...b.squads,
  ...(b.fronts?.map((f) => f.troop) ?? []),
  ...(b.raid && b.raid.phase !== "gone" ? [b.raid.troop] : []),
  ...(b.raids ?? []).filter((r) => r.phase !== "gone").map((r) => r.troop),
];
export const activeRaids = (b: Battle) =>
  [...(b.raid ? [b.raid] : []), ...(b.raids ?? [])].filter(
    (r) => r.phase !== "gone",
  );
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
export function createBattle(mission = false): Battle {
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
  const battle: Battle = { cells, squads, time: 0 };
  if (mission) {
    squads[0].cell = 8 * COLS + 12;
    squads[1].cell = 9 * COLS + 12;
    squads.forEach((s) => (cells[s.cell].terrain = "plain"));
    // A clear approach gives the player time to read and respond.
    for (let r = 3; r <= 8; r++)
      for (let q = 14; q <= 17; q++) cells[r * COLS + q].terrain = "plain";
    const troop: Squad = {
      id: "raiders",
      name: "Patrulla enemiga",
      cell: 3 * COLS + 17,
      facing: Math.PI / 2,
      targetFacing: Math.PI / 2,
      members: ["shield", "shield", "shield", "bow"],
      path: [],
      progress: 0,
      hold: false,
    };
    battle.raid = {
      troop,
      phase: "approach",
      pressure: 0,
      supplies: 100,
      stolen: 0,
      outcome: "active",
      resolvedAt: 0,
    };
    troop.path = route(battle, troop, 8 * COLS + 14);
  }
  return battle;
}
export function blocked(b: Battle, id: number, squad: string) {
  return (
    !b.cells[id] ||
    b.cells[id].terrain === "rock" ||
    allTroops(b).some(
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
  if (s.routing) return "El escuadrón se está reagrupando";
  if (end === s.cell && !s.progress) {
    s.path = [];
    s.hold = true;
    return null;
  }
  const p = route(b, s, end);
  if (!p.length) return "Destino bloqueado o sin acceso";
  s.path = s.progress > 0 ? [s.path[0], ...p] : p;
  s.disengaging = !!s.engaged;
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
  if (b.fronts) advanceFronts(b, dt);
  else advanceRaid(b, dt);
  for (const s of b.squads) {
    let delta =
      ((s.targetFacing - s.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    s.facing += Math.sign(delta) * Math.min(Math.abs(delta), dt * 2.5);
    if (s.engaged && !s.disengaging && !s.routing) continue;
    if (!s.path.length) continue;
    const next = s.path[0];
    if (
      allTroops(b).some(
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
      if (!s.path.length) s.disengaging = false;
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

// Combat is resolved in timed exchanges; effects are emitted only by real attacks.
export function advanceRaid(b: Battle, dt: number) {
  b.strikes = (b.strikes ?? []).filter((hit) => b.time - hit.time < 0.8);
  for (const s of b.squads) {
    s.cohesion ??= 100;
    s.cooldown = Math.max(0, (s.cooldown ?? 0) - dt);
    s.engaged = undefined;
    if (s.routing && !s.path.length) {
      s.cohesion = Math.min(100, s.cohesion + dt * 6);
      if (s.cohesion >= 60) s.routing = false;
    }
  }
  for (const r of activeRaids(b)) stepRaid(b, r, dt);
}
function stepRaid(b: Battle, r: Raid, dt: number) {
  const e = r.troop;
  e.cohesion ??= 100;
  e.cooldown = Math.max(0, (e.cooldown ?? 0) - dt);
  e.engaged = undefined;
  const at = squadPosition(b, e);
  const defenders = b.squads.filter(
    (s) =>
      !s.routing &&
      Math.hypot(squadPosition(b, s).x - at.x, squadPosition(b, s).y - at.y) <
        DX * 1.65,
  );
  const hit = (
    source: Squad,
    target: Squad,
    damage: number,
    enemy: boolean,
  ) => {
    const p = squadPosition(b, source),
      t = squadPosition(b, target),
      zone = zoneFrom(target.facing, p, t);
    target.cohesion = Math.max(
      0,
      (target.cohesion ?? 100) -
        attackDamage(source, target, damage, rise(b, source, target), zone),
    );
    target.lastHit = b.time;
    target.lastZone = zone;
    b.strikes!.push({ x: p.x, y: p.y, tx: t.x, ty: t.y, time: b.time, enemy });
    source.cooldown = 1.35;
  };
  const withdraw = () => {
    r.phase = "retreat";
    r.outcome = r.supplies > 0 ? "protected" : "raided";
    r.resolvedAt = b.time;
    e.engaged = undefined;
    e.routing = true;
    const path = route(b, e, r.home ?? 3 * COLS + 17);
    e.path = e.progress > 0 ? [e.path[0], ...path] : path;
  };
  if (r.phase !== "retreat") {
    if (defenders.length) {
      r.phase = "fight";
      const target = defenders
        .slice()
        .sort(
          (a, c) =>
            Math.hypot(
              squadPosition(b, a).x - at.x,
              squadPosition(b, a).y - at.y,
            ) -
            Math.hypot(
              squadPosition(b, c).x - at.x,
              squadPosition(b, c).y - at.y,
            ),
        )[0];
      const p = squadPosition(b, target);
      e.engaged = target.id;
      e.facing = e.targetFacing = Math.atan2(p.y - at.y, p.x - at.x);
      for (const s of defenders) {
        s.engaged = e.id;
        const p = squadPosition(b, s);
        if (!s.disengaging) {
          hold(s);
          s.targetFacing = Math.atan2(at.y - p.y, at.x - p.x);
        }
        if (!s.cooldown) hit(s, e, 7, false);
      }
      // Both sides fire in the same exchange, even if this breaks cohesion.
      if (!e.cooldown) hit(e, target, 5, true);
      for (const s of defenders)
        if (s.cohesion! <= 0) {
          s.routing = true;
          s.engaged = undefined;
          s.disengaging = true;
          const candidates = b.cells
            .filter(
              (c) =>
                !blocked(b, c.id, s.id) &&
                Math.hypot(c.x - at.x, c.y - at.y) > DX * 3,
            )
            .sort(
              (a, c) =>
                Math.hypot(a.x - b.cells[s.cell].x, a.y - b.cells[s.cell].y) -
                Math.hypot(c.x - b.cells[s.cell].x, c.y - b.cells[s.cell].y),
            );
          for (const c of candidates) {
            const p = route(b, s, c.id);
            if (p.length) {
              s.path = s.progress > 0 ? [s.path[0], ...p] : p;
              break;
            }
          }
        }
    } else {
      if (r.phase === "fight")
        r.phase =
          e.cell === (r.target ?? 8 * COLS + 14) && !e.path.length
            ? "loot"
            : "approach";
      e.cohesion = Math.min(
        r.strength ?? (b.outpost ? 30 : 100),
        e.cohesion + dt * 2,
      );
      for (const s of b.squads)
        if (!s.routing)
          s.cohesion = Math.min(100, (s.cohesion ?? 100) + dt * 3);
    }
    r.pressure = 1 - e.cohesion / 100;
    if (e.cohesion <= 0 || r.supplies <= 0) withdraw();
  }
  if (r.phase === "fight") return;
  if (r.phase === "loot") {
    const take = Math.min(r.supplies, dt * 4);
    r.supplies -= take;
    r.stolen += take;
    if (r.supplies <= 0) withdraw();
  }
  if (
    r.phase === "approach" &&
    e.cell === (r.target ?? 8 * COLS + 14) &&
    !e.path.length
  )
    r.phase = "loot";
  if (!e.path.length) {
    if (r.phase === "retreat" && e.cell === (r.home ?? 3 * COLS + 17)) {
      r.phase = "gone";
      return;
    }
    if (r.phase !== "loot") {
      const goal =
        r.phase === "retreat"
          ? (r.home ?? 3 * COLS + 17)
          : (r.target ?? 8 * COLS + 14);
      e.path = route(b, e, goal);
      // A held goal: close in on the nearest free neighbour and fight there.
      if (
        !e.path.length &&
        r.phase === "approach" &&
        !adjacent(goal).includes(e.cell)
      )
        e.path =
          adjacent(goal)
            .map((n) => route(b, e, n))
            .filter((p) => p.length)
            .sort((p, q) => p.length - q.length)[0] ?? [];
    }
  }
  if (!e.path.length) return;
  const next = e.path[0];
  if (
    // Other raids block too: several can be on the map at once.
    allTroops(b).some(
      (s) =>
        s.id !== e.id &&
        (s.cell === next || (s.progress > 0 && s.path[0] === next)),
    )
  ) {
    if (!e.progress)
      e.path = route(
        b,
        e,
        r.phase === "retreat"
          ? (r.home ?? 3 * COLS + 17)
          : (r.target ?? 8 * COLS + 14),
      );
    return;
  }
  const a = b.cells[e.cell],
    c = b.cells[next];
  e.facing = e.targetFacing = Math.atan2(c.y - a.y, c.x - a.x);
  e.progress += dt / (r.phase === "retreat" ? 2 : 4.5);
  if (e.progress >= 1) {
    e.cell = next;
    e.path.shift();
    e.progress = 0;
  }
}
