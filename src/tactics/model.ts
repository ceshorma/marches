import { attackDamage, slotsOf, zoneFrom, zoneSlots } from "./combat";
import type { TroopType } from "./combat";
import { advanceFronts } from "./fronts";
import { news, troopName, veteran } from "./chronicle";
import type { News } from "./chronicle";
import { ENTRENCH, specialMembers, TIRED } from "./units";
import type { Special, SpecialKind, Stance } from "./units";
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
  // Rock and water stop everyone; forest and fords slow them down.
  terrain: "plain" | "forest" | "rock" | "water" | "ford";
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
  // Raids this squad destroyed (see chronicle.ts: veterans).
  feats?: number;
  // When it was last struck by arrows from afar.
  lastVolley?: number;
  // A unit taking several places (see units.ts).
  special?: Special;
  // The tactical action it is taking, since when, and when a charge's
  // weariness wears off.
  stance?: Stance;
  stanceAt?: number;
  tiredUntil?: number;
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
  // When the raid was destroyed in battle, and whether its spoils were taken.
  fell?: number;
  spoils?: boolean;
  // A garrison holds its ground: it fights whoever comes, never marches,
  // loots or eats land.
  guard?: boolean;
  // A probe: a light skirmish that fights but does not eat land.
  probe?: boolean;
  // A lone scout that comes very slowly while you have no squad yet.
  slow?: boolean;
  // The squads that were fighting it when it was destroyed.
  slayers?: string[];
  // Destroyed by arrows alone.
  shot?: boolean;
};
// A scripted mission: enemy waves and friendly arrivals on a shared clock.
export type WaveSpec = {
  at: number;
  from: number;
  units: TroopType[];
  layout?: number[];
  // A light skirmish that fights but does not eat land (scouts).
  probe?: boolean;
  // The assault it belongs to, and seconds after that assault opens.
  assault?: number;
  delay?: number;
  // "tower" picks the next standing tower (or the fort if none stand).
  target: "tower" | "fort" | number;
  strength: number;
};
export type Script = {
  trigger: "start" | "tower" | "squad";
  clock: number | null;
  waves: WaveSpec[];
  arrivals: { at: number; type: TroopType }[];
  spawned: number;
  delivered: number;
  // Waves come in assaults: each opens `gap` seconds after the one before
  // is over (the first, `gap` after the clock starts), so a quiet valley
  // follows every peak. When each assault opens (clock time; null until
  // known), how many are over, and the levy of troops each one leaves.
  assaults?: { gap: number }[];
  starts?: (number | null)[];
  cleared?: number;
  levies?: TroopType[][];
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
    lastArrival?: { type: TroopType; time: number; from?: number };
    // Campaign missions tune these; free play keeps the defaults.
    supply: TroopType[];
    supplyEvery: number;
    raids: RaidPlan;
    repelled: number;
    // Ownership of each cell, 0–1; held from 0.5 (see outpost.ts).
    land?: number[];
    // How settled each cell is (fields, then houses), 0–1, and when it
    // last caught fire.
    settled?: number[];
    burning?: number[];
    // Raiders' tracks on each cell (1 fresh → 0 gone) and their heading.
    tracks?: number[];
    trackDir?: number[];
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
    // How much of each cell the Clan del Humo holds, 0–1 (see outpost.ts).
    foe?: number[];
    // Towers waiting in the tray to be placed, and the spots a mission
    // suggests for them (any valid cell will do).
    kits?: number;
    suggested?: number[];
    // When the next lone scout sets out while no squad stands yet.
    nextScout?: number;
    // The map template and where the clan's raids come in (free play).
    map?: string;
    entries?: number[];
    // The chronicle: latest news, and how often each kind was told.
    news?: News[];
    newsCount?: Record<string, number>;
    // Special units waiting in the tray, raids destroyed so far (every few
    // bring one) and whether the land has given its war wagon.
    specials?: SpecialKind[];
    // Free play: whether an assault is on the map.
    assaultOpen?: boolean;
    spoilsCount?: number;
    wagonGiven?: boolean;
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
    // When the last wave was over, for the time land gets to grow back.
    clearAt?: number;
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
  // Raids destroyed in battle: what is left on the field for a while.
  // Allied squads that break leave one fallen member ("ally").
  fallen?: {
    x: number;
    y: number;
    time: number;
    units: TroopType[];
    side?: "ally";
  }[];
  strikes?: {
    x: number;
    y: number;
    tx: number;
    ty: number;
    time: number;
    enemy: boolean;
    // Arrows from afar fly in a high arc.
    volley?: boolean;
  }[];
};
// Height levels the attacker stands above its target.
export const rise = (b: Battle, source: Squad, target: Squad) =>
  (b.cells[source.cell].height - b.cells[target.cell].height) / 15;
// Cells nobody can stand on or cross.
export const solid = (c: Cell) => c.terrain === "rock" || c.terrain === "water";
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
    solid(b.cells[id]) ||
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
  return search(b, start, end, (id) => !blocked(b, id, s.id));
}
// The way the terrain allows, whoever stands on it: where a wave will march.
export const trail = (b: Battle, start: number, end: number) =>
  start === end ? [] : search(b, start, end, (id) => !solid(b.cells[id]));
function search(
  b: Battle,
  start: number,
  end: number,
  open_: (id: number) => boolean,
): number[] {
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
      if (next !== end && !open_(next)) continue;
      const a = b.cells[n],
        c = b.cells[next],
        v =
          cost.get(n)! +
          1 +
          (c.terrain === "forest" || c.terrain === "ford" ? 0.8 : 0) +
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
  // Moving gives up the ground it held.
  if (s.stance === "hold") s.stance = undefined;
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
// Seconds per cell on open, level ground: a squad marches at the pace of its
// slowest member, so a pure cavalry squad is fast and a mixed one is not.
export const PACE: Record<TroopType, number> = {
  horse: 0.9,
  bow: 1.3,
  shield: 1.6,
};
export const pace = (s: Squad) =>
  (s.special?.kind === "wagon"
    ? WAGON_PACE
    : Math.max(...s.members.map((m) => PACE[m]), PACE.horse)) *
  (s.stance === "wall" ? 2 : 1);
// The war wagon crawls.
export const WAGON_PACE = 3.2;
export function advance(b: Battle, dt: number) {
  b.time += dt;
  if (b.fronts) advanceFronts(b, dt);
  else advanceRaid(b, dt);
  for (const s of b.squads) {
    let delta =
      ((s.targetFacing - s.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    s.facing += Math.sign(delta) * Math.min(Math.abs(delta), dt * 2.5);
    if (s.stance === "skirmish") skirmish(b, s);
    // Caught by a fight halfway between cells: step back to the cell it was
    // leaving and fight from there, never from between two hexes.
    if (s.engaged && !s.disengaging && !s.routing) {
      settle(
        b,
        s,
        dt / pace(s),
        allTroops(b).find((o) => o.id === s.engaged),
      );
      continue;
    }
    if (!s.path.length) continue;
    const next = s.path[0];
    const blocker = allTroops(b).find(
      (o) =>
        o.id !== s.id &&
        (o.cell === next || (o.progress > 0 && o.path[0] === next)),
    );
    if (blocker) {
      // The way ahead is taken: back to the cell it was leaving.
      if (s.progress) {
        stepBack(s, dt / pace(s));
        continue;
      }
      const alternative = route(b, s, s.path.at(-1)!);
      if (alternative.length) s.path = alternative;
      // No way round: a broken squad regroups where it stands, and so does
      // one whose way is held by troops standing still; it is free for
      // orders again. One that is only passing by is waited for.
      else if (s.routing || (!blocker.path.length && !blocker.progress))
        s.path = [];
      continue;
    }
    const a = b.cells[s.cell],
      c = b.cells[next];
    s.targetFacing = Math.atan2(c.y - a.y, c.x - a.x);
    s.progress +=
      dt /
      (pace(s) +
        (c.terrain === "forest" || c.terrain === "ford" ? 1 : 0) +
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
// Hostigar: archers stepping back from a foe that comes to arm's length, to
// a free cell still within their range.
function skirmish(b: Battle, s: Squad) {
  if (s.routing || s.path.length || s.progress || !s.members.includes("bow"))
    return;
  const here = squadPosition(b, s);
  const foe = activeRaids(b)
    .map((r) => r.troop)
    .find((e) => {
      const p = squadPosition(b, e);
      return Math.hypot(p.x - here.x, p.y - here.y) < DX * 1.65;
    });
  if (!foe) return;
  const f = squadPosition(b, foe),
    away = (id: number) => Math.hypot(b.cells[id].x - f.x, b.cells[id].y - f.y);
  const step = adjacent(s.cell)
    .filter((id) => !blocked(b, id, s.id))
    .filter((id) => away(id) >= DX * 1.65 && away(id) < RANGE)
    .sort((a, c) => away(c) - away(a))[0];
  if (step === undefined) return;
  s.path = [step];
  s.disengaging = true;
  s.engaged = undefined;
}
// Walks a troop back towards the cell it was leaving; true once it is there.
function stepBack(s: Squad, amount: number) {
  if (!s.progress) return true;
  s.progress = Math.max(0, s.progress - amount);
  return !s.progress;
}
// Caught by a fight halfway: the troop settles on whichever of its two cells
// is nearer its foe (finishing the step or stepping back) and stops there.
function settle(b: Battle, s: Squad, amount: number, foe?: Squad) {
  if (!s.progress) {
    s.path = [];
    return;
  }
  const f = foe && squadPosition(b, foe),
    from = b.cells[s.cell],
    to = b.cells[s.path[0]],
    forward = f
      ? Math.hypot(to.x - f.x, to.y - f.y) <
        Math.hypot(from.x - f.x, from.y - f.y)
      : s.progress >= 0.5;
  if (!forward) {
    if (stepBack(s, amount)) s.path = [];
    return;
  }
  s.progress = Math.min(1, s.progress + amount);
  if (s.progress < 1) return;
  s.cell = s.path[0];
  s.path = [];
  s.progress = 0;
}
export function squadPosition(b: Battle, s: Squad) {
  const a = b.cells[s.cell],
    c = b.cells[s.path[0]] ?? a;
  return {
    x: a.x + (c.x - a.x) * s.progress,
    y: a.y + (c.y - a.y) * s.progress,
  };
}

// A broken squad loses one member from the zone that took the last blow
// (any member if that zone is empty). Returns true when none are left and
// the squad is gone.
export function casualty(b: Battle, s: Squad): boolean {
  const slots = slotsOf(s),
    zone = zoneSlots[s.lastZone ?? "front"];
  let i = s.members.findIndex((_, k) => zone.includes(slots[k]));
  if (i < 0) i = s.members.length - 1;
  // A special unit struck loses one of its places: its size is its life.
  if (s.special && specialMembers(s).includes(i)) {
    s.special.size--;
    if (!s.special.size) s.special = undefined;
  }
  const [lost] = s.members.splice(i, 1);
  s.layout = undefined;
  b.fallen = [
    ...(b.fallen ?? []).filter((f) => b.time - f.time < FALLEN),
    { ...squadPosition(b, s), time: b.time, units: [lost], side: "ally" },
  ];
  if (s.members.length) {
    news(b, "broke", { s: s.name, t: troopName[lost] });
    return false;
  }
  b.squads = b.squads.filter((u) => u !== s);
  news(b, "wiped", { s: s.name });
  return true;
}
// Raiders march at the pace of their slowest troop, this many times slower
// than your squads: riders come fast, lancers take their time.
export const RAID_PACE = 2.5;
// How far a squad shoots: the scorpion reaches three cells.
export const reachOf = (s: Squad) =>
  s.special?.kind === "scorpion" ? SCORPION_RANGE : RANGE;
// A hero cheers its own squad and those next to it.
export const inspired = (b: Battle, s: Squad) =>
  b.squads.some(
    (h) =>
      h.special?.kind === "hero" &&
      Math.hypot(
        squadPosition(b, h).x - squadPosition(b, s).x,
        squadPosition(b, h).y - squadPosition(b, s).y,
      ) <
        DX * 1.65,
  );
// What a squad's state does to the blows it deals...
function dealt(b: Battle, s: Squad, volley: boolean) {
  let k = 1;
  if (b.squads.some((u) => u.id === s.id) && inspired(b, s)) k *= HERO_HIT;
  if (volley) return k * (s.stance === "skirmish" ? 0.8 : 1);
  const sp = s.special;
  if (sp?.kind === "knights") k *= 1 + 0.08 * sp.size;
  if (sp?.kind === "scorpion") k *= 1 - 0.12 * sp.size;
  if ((s.tiredUntil ?? -1) > b.time) k *= 0.6;
  if (s.stance === "charge") {
    k *= sp?.kind === "knights" ? 2.5 : 2;
    s.stance = undefined;
    s.tiredUntil = b.time + TIRED;
  }
  return k;
}
// ...and to the blows it takes.
function taken(b: Battle, s: Squad, zone: string, volley: boolean) {
  let k = s.special?.kind === "wagon" ? 0.8 : 1;
  if (s.stance === "wall") k *= volley ? 1.3 : zone === "front" ? 0.5 : 1;
  if (
    s.stance === "hold" &&
    zone === "front" &&
    b.time - (s.stanceAt ?? b.time) >= ENTRENCH
  )
    k *= 0.7;
  return k;
}
// A hero's squad and its neighbours strike this much harder.
export const HERO_HIT = 1.1;
export const SCORPION_RANGE = DX * 3.2;
// How far archers shoot: two cells, over whoever stands between.
export const RANGE = DX * 2.2,
  // A volley from afar hurts less than a melee.
  VOLLEY = 0.75;
const recentlyHit = (b: Battle, s: Squad) =>
  s.lastHit !== undefined && b.time - s.lastHit < 2;
// Base damage of each exchange: your squads, and the raiders. Raiders hit
// hard enough that the wrong troop breaks and loses a member.
export const DEFEND_HIT = 7,
  RAID_HIT = 9,
  // Veterans hit this much harder.
  VETERAN_HIT = 1.15;
// Seconds the remains of a destroyed raid stay on the field.
export const FALLEN = 30;
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
  const fighting = e.engaged;
  e.engaged = undefined;
  const at = squadPosition(b, e);
  // A fight starts at arm's length; once joined it holds while both settle
  // on their cells, a little further apart.
  const defenders = b.squads.filter((s) => {
    const p = squadPosition(b, s),
      d = Math.hypot(p.x - at.x, p.y - at.y);
    return !s.routing && (d < DX * 1.65 || (s.id === fighting && d < DX * 2.2));
  });
  const distance = (s: Squad) => {
    const p = squadPosition(b, s);
    return Math.hypot(p.x - at.x, p.y - at.y);
  };
  // Your archers standing within RANGE but out of the melee shoot over it.
  const shooters = b.squads.filter(
    (s) =>
      !s.routing &&
      !defenders.includes(s) &&
      s.members.includes("bow") &&
      !s.path.length &&
      !s.progress &&
      distance(s) < reachOf(s),
  );
  const hit = (
    source: Squad,
    target: Squad,
    damage: number,
    enemy: boolean,
    volley = false,
  ) => {
    const p = squadPosition(b, source),
      t = squadPosition(b, target),
      zone = zoneFrom(target.facing, p, t);
    target.cohesion = Math.max(
      0,
      (target.cohesion ?? 100) -
        attackDamage(source, target, damage, rise(b, source, target), zone) *
          (veteran(source) ? VETERAN_HIT : 1) *
          dealt(b, source, volley) *
          taken(b, target, zone, volley),
    );
    target.lastHit = b.time;
    target.lastZone = zone;
    b.strikes!.push({ x: p.x, y: p.y, tx: t.x, ty: t.y, time: b.time, enemy });
    source.cooldown = 1.35;
  };
  // A volley: only the archers of a troop shoot, from their own slots.
  const volley = (
    source: Squad,
    target: Squad,
    damage: number,
    enemy: boolean,
  ) => {
    const slots = slotsOf(source),
      bows = source.members.flatMap((m, i) => (m === "bow" ? [i] : []));
    hit(
      {
        ...source,
        members: bows.map((i) => source.members[i]),
        layout: bows.map((i) => slots[i]),
        special: undefined,
      },
      target,
      damage * VOLLEY,
      enemy,
      true,
    );
    source.cooldown = 1.35;
    target.lastVolley = b.time;
    b.strikes!.at(-1)!.volley = true;
  };
  // A broken squad loses a member and runs to regroup, away from the raid.
  const rout = (s: Squad) => {
    if (casualty(b, s)) return;
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
  };
  for (const s of shooters) if (!s.cooldown) volley(s, e, DEFEND_HIT, false);
  // Raiders do not run from a fight: broken, they are destroyed where they
  // stand. Only raiders who got their loot head home, and can be caught.
  const destroy = () => {
    if (r.outcome === "active") {
      r.outcome = "protected";
      r.resolvedAt = b.time;
    }
    r.phase = "gone";
    r.fell = b.time;
    r.slayers = [...defenders, ...shooters].map((s) => s.id);
    // Broken by arrows alone, without a melee.
    if (!defenders.length) r.shot = true;
    b.fallen = [
      ...(b.fallen ?? []).filter((f) => b.time - f.time < FALLEN),
      { ...at, time: b.time, units: [...e.members] },
    ];
  };
  const withdraw = () => {
    r.phase = "retreat";
    r.outcome = "raided";
    r.resolvedAt = b.time;
    e.engaged = undefined;
    const path = route(b, e, r.home ?? 3 * COLS + 17);
    e.path = e.progress > 0 ? [e.path[0], ...path] : path;
  };
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
      if (!s.cooldown) hit(s, e, DEFEND_HIT, false);
    }
    // Raiders caught halfway step back to their cell too.
    settle(b, e, dt / 4.5, target);
    // Both sides fire in the same exchange, even if this breaks cohesion.
    if (!e.cooldown) hit(e, target, RAID_HIT, true);
    // Breaking costs a member, from the side that was struck.
    for (const s of defenders) if (s.cohesion! <= 0) rout(s);
  } else {
    if (r.phase === "fight")
      r.phase = r.guard
        ? "approach"
        : r.outcome === "raided"
          ? "retreat"
          : e.cell === (r.target ?? 8 * COLS + 14) && !e.path.length
            ? "loot"
            : "approach";
    // Raiders with archers shoot at the nearest squad in range as they come.
    const mark = e.members.includes("bow")
      ? b.squads
          .filter((s) => !s.routing && distance(s) < RANGE)
          .sort((a, c) => distance(a) - distance(c))[0]
      : undefined;
    if (mark && !e.cooldown) {
      volley(e, mark, RAID_HIT, true);
      if (mark.cohesion! <= 0) rout(mark);
    }
    // Nobody rallies under fire.
    if (!recentlyHit(b, e))
      e.cohesion = Math.min(
        r.strength ?? (b.outpost ? 30 : 100),
        e.cohesion + dt * 2,
      );
    for (const s of b.squads)
      if (!s.routing && !recentlyHit(b, s))
        s.cohesion = Math.min(
          100,
          (s.cohesion ?? 100) + dt * 3 * (inspired(b, s) ? 2 : 1),
        );
  }
  r.pressure = 1 - e.cohesion / 100;
  if (e.cohesion <= 0) return destroy();
  if (r.phase === "fight" || r.guard) return;
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
      // Beside a target held by troops it cannot fight (broken ones): it
      // sacks the ground there instead of waiting for ever.
      if (
        !e.path.length &&
        r.phase === "approach" &&
        !r.guard &&
        adjacent(goal).includes(e.cell)
      )
        r.phase = "loot";
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
    if (e.progress) {
      stepBack(e, dt / 4.5);
      return;
    }
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
  e.progress +=
    dt / (r.phase === "retreat" ? 2 : r.slow ? 12 : RAID_PACE * pace(e));
  if (e.progress >= 1) {
    e.cell = next;
    e.path.shift();
    e.progress = 0;
  }
}
