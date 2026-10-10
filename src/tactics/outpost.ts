import { troopNames } from "./combat";
import { applyMap, maps } from "./maps";
import type { MapName } from "./maps";
import type { TroopType } from "./combat";
import { createBattle, adjacent, blocked, route, DX, solid } from "./model";
import type { Battle, Raid, Squad, WaveSpec } from "./model";
const cell = (q: number, r: number) => r * 18 + q;
export const EAST = cell(16, 8);
// What the tray holds: troops, and towers waiting to be placed.
export type Item = TroopType | "tower";
export function createOutpost(map: MapName = "llanura"): Battle {
  const b = createBattle();
  const t = maps[map];
  b.squads = [];
  b.raids = [];
  b.cells.forEach((c) => delete c.place);
  b.cells[cell(3, 8)].place = "fort";
  b.outpost = {
    fort: cell(3, 8),
    map,
    entries: [...t.entries],
    sites: t.sites.map((cell) => ({
      cell,
      progress: 0,
      builtAt: null,
      active: false,
    })),
    nextRaid: Infinity,
    nextReinforcement: 25,
    serial: 0,
    waves: 0,
    noticeUntil: 0,
    notice: "",
    towerDeploys: 0,
    recruitAt: 0,
    reserve: { shield: 1, bow: 0, horse: 0 },
    arrivals: 0,
    supply: ["shield", "bow", "horse"],
    supplyEvery: 30,
    raids: {
      firstDelay: 12,
      interval: 20,
      waves: [["shield"]],
      strength: 30,
      limit: Infinity,
    },
    repelled: 0,
    turnedAway: 0,
    resolved: 0,
    fortSacked: 0,
    lostTowers: 0,
  };
  for (const s of b.outpost.sites) b.cells[s.cell].terrain = "plain";
  for (let q = 3; q < 18; q++) b.cells[cell(q, 8)].terrain = "plain";
  applyMap(b.cells, map, b.outpost.fort);
  settleLand(b);
  return b;
}
type Outpost = NonNullable<Battle["outpost"]>;
function notify(
  o: Outpost,
  text: string,
  at: number,
  tone: Outpost["noticeTone"],
  until: number,
) {
  o.notice = text;
  o.noticeAt = at;
  o.noticeTone = tone;
  o.noticeUntil = until;
}
const live = (b: Battle) => (b.raids ?? []).filter((r) => r.phase !== "gone");
const near = (b: Battle, a: number, c: number, distance = 130) =>
  Math.hypot(b.cells[a].x - b.cells[c].x, b.cells[a].y - b.cells[c].y) <
  distance;
export function deploymentError(b: Battle, id: number): string | null {
  const o = b.outpost,
    c = b.cells[id];
  if (!o || !c || solid(c)) return "Celda inaccesible";
  const anchors = [
    o.fort,
    ...o.sites.filter((s) => s.active).map((s) => s.cell),
  ];
  if (!anchors.some((base) => id === base || adjacent(base).includes(id)))
    return "Despliega junto al cuartel o una torre asegurada";
  if (id === o.fort) return "Elige una celda junto al cuartel";
  const unit = b.squads.find((u) => u.cell === id);
  if (
    unit &&
    (unit.path.length || unit.progress || unit.engaged || unit.routing)
  )
    return "La tropa debe estar detenida y fuera de combate";
  if (unit && unit.members.length >= 6) return "Escuadrón completo";
  if (!unit && b.squads.length >= 5) return "Máximo de cinco escuadrones";
  if (blocked(b, id, unit?.id ?? "reserve")) return "Celda ocupada o reservada";
  if (live(b).some((r) => near(b, r.troop.cell, id)))
    return "Posición bajo amenaza";
  return null;
}
// Adds a reserve troop to the squad on that cell (or a new one there); the
// formation arranges itself (see slotsOf).
export function addReserveTroop(
  b: Battle,
  id: number,
  type: TroopType,
): string | null {
  const error = deploymentError(b, id);
  if (error) return error;
  const o = b.outpost!;
  if (o.reserve[type] <= 0) return "No quedan tropas de ese tipo en reserva";
  let unit = b.squads.find((u) => u.cell === id);
  if (!unit) {
    o.serial++;
    unit = {
      id: `p${o.serial}`,
      name: `Escuadrón ${o.serial}`,
      cell: id,
      facing: 0,
      targetFacing: 0,
      members: [],
      path: [],
      progress: 0,
      hold: true,
      cohesion: 100,
    };
    b.squads.push(unit);
  }
  unit.members.push(type);
  o.reserve[type]--;
  if (id !== o.fort && !adjacent(o.fort).includes(id)) o.towerDeploys++;
  return null;
}
// ── Towers from the tray ──────────────────────────────────────────────
// A tower waits in the tray until it is placed on the map; a squad standing
// on it then builds it. It goes near your land (at most TOWER_REACH from a
// held cell, so it pushes the frontier) and apart from the fort and other
// towers (at least TOWER_GAP), on open ground the enemy is not standing on.
export const TOWER_REACH = 3.2,
  TOWER_GAP = 2.5;
const cellsApart = (b: Battle, a: number, c: number) =>
  Math.hypot(b.cells[a].x - b.cells[c].x, b.cells[a].y - b.cells[c].y) / DX;
export function towerError(b: Battle, id: number): string | null {
  const o = b.outpost,
    c = b.cells[id];
  if (!o || !c) return "Celda inaccesible";
  if (!(o.kits ?? 0)) return "No hay torres para colocar";
  if (solid(c) || c.terrain === "ford" || c.place)
    return "Aquí no se puede levantar";
  if (
    [o.fort, ...o.sites.map((x) => x.cell)].some(
      (x) => cellsApart(b, x, id) < TOWER_GAP,
    )
  )
    return "Demasiado cerca de otra torre";
  if (o.camp && !o.camp.taken && cellsApart(b, o.camp.cell, id) < 2)
    return "Demasiado cerca del campamento";
  const land = o.land ?? [];
  if (!land.some((v, x) => v >= HOLD && cellsApart(b, x, id) <= TOWER_REACH))
    return "Lejos de tu tierra";
  if (allTroopsAt(b, id)) return "Celda ocupada";
  return null;
}
const allTroopsAt = (b: Battle, id: number) =>
  live(b).some((r) => r.troop.cell === id);
// Places a tower from the tray: it becomes a site to be built.
export function placeTower(b: Battle, id: number): string | null {
  const error = towerError(b, id);
  if (error) return error;
  const o = b.outpost!;
  o.kits! -= 1;
  o.sites.push({ cell: id, progress: 0, builtAt: null, active: false });
  return null;
}
// The rival camp can be taken while a tower of yours stands near it.
export const CAMP_SUPPORT = 5.2;
export const campSupported = (b: Battle) => {
  const o = b.outpost!;
  return (
    !!o.camp &&
    o.sites.some(
      (s) => s.active && cellsApart(b, s.cell, o.camp!.cell) <= CAMP_SUPPORT,
    )
  );
};
// Convenience used by simulation tests; the live UI chooses the target cell.
export function createScout(b: Battle): string | null {
  const id = adjacent(b.outpost!.fort).find((id) => !deploymentError(b, id));
  return id === undefined
    ? "Despeja el cuartel"
    : addReserveTroop(b, id, "shield");
}
export function launch(
  b: Battle,
  spec: Omit<WaveSpec, "at" | "target"> & { target: number },
  wave?: number,
  guard = false,
): boolean {
  const o = b.outpost!;
  // An entry point held by your troops does not stop a wave: it forms on a
  // free cell next to it, right in front of them.
  const from = !blocked(b, spec.from, "incursion")
    ? spec.from
    : adjacent(spec.from).find(
        (id) => !blocked(b, id, "incursion") && !solid(b.cells[id]),
      );
  if (from === undefined) return false;
  const troop: Squad = {
    id: `incursion-${o.waves}`,
    name: "Incursión",
    cell: from,
    facing: Math.atan2(
      b.cells[spec.target].y - b.cells[from].y,
      b.cells[spec.target].x - b.cells[from].x,
    ),
    targetFacing: 0,
    members: [...spec.units],
    layout: spec.layout ? [...spec.layout] : undefined,
    path: [],
    progress: 0,
    hold: false,
    cohesion: spec.strength,
  };
  troop.targetFacing = troop.facing;
  const raid: Raid = {
    troop,
    target: spec.target,
    home: from,
    phase: "approach",
    pressure: 0,
    supplies: 100,
    stolen: 0,
    outcome: "active",
    resolvedAt: 0,
    strength: spec.strength,
    wave,
    guard: guard || undefined,
    ...(spec.probe ? { probe: true } : {}),
  };
  b.raids = [...(b.raids ?? []), raid];
  if (guard) {
    o.waves++;
    return true;
  }
  troop.path = route(b, troop, spec.target);
  if (!troop.path.length)
    for (const n of adjacent(spec.target)) {
      const path = route(b, troop, n);
      if (path.length) {
        troop.path = path;
        break;
      }
    }
  o.waves++;
  return true;
}
// Free play: raids come in from each entry in turn.
const nextEntry = (o: Outpost) => {
  const entries = o.entries?.length ? o.entries : [EAST];
  return entries[o.waves % entries.length];
};
// Scripted target: "tower" rotates over standing towers, else the fort.
function aim(b: Battle, target: WaveSpec["target"], index: number) {
  const o = b.outpost!;
  if (typeof target === "number") return target;
  // Whoever stands on the clan's camp draws every wave onto them.
  const camp = o.camp;
  if (
    camp &&
    !camp.taken &&
    b.squads.some((u) => u.cell === camp.cell || near(b, u.cell, camp.cell, 80))
  )
    return camp.cell;
  const towers = o.sites.filter((s) => s.active);
  return target === "fort" || !towers.length
    ? o.fort
    : towers[index % towers.length].cell;
}
// Troops wait at the fort, in view, until deployed. A full fort turns new
// arrivals away: the queue is the pressure to deploy.
export const FORT_CAP = 6;
export const waiting = (o: Outpost) =>
  Object.values(o.reserve).reduce((a, c) => a + c, 0);
// Waiting troops in display order (one entry per troop).
export const queue = (o: Outpost): TroopType[] =>
  (["shield", "bow", "horse"] as const).flatMap((t) =>
    Array<TroopType>(o.reserve[t]).fill(t),
  );
// A new troop for the fort: from a settled house, or from the battlefield
// (`from`) when it comes with the spoils of a destroyed raid.
function arrive(b: Battle, type: TroopType, from?: number) {
  const o = b.outpost!;
  o.arrivals++;
  if (waiting(o) >= FORT_CAP) {
    o.turnedAway++;
    notify(o, `${troopNames[type]} se retira`, o.fort, "danger", b.time + 3);
    return;
  }
  o.reserve[type]++;
  // The troop walks in from one of the settled houses, nearest first.
  const f = b.cells[o.fort];
  const home = (o.settled ?? [])
    .map((v, id) => [v, id] as const)
    .filter(([v, id]) => v > 0.7 && hasHouse(id) && id !== o.fort)
    .map(([, id]) => id)
    .sort(
      (a, c) =>
        Math.hypot(b.cells[a].x - f.x, b.cells[a].y - f.y) -
        Math.hypot(b.cells[c].x - f.x, b.cells[c].y - f.y),
    );
  o.lastArrival = {
    type,
    time: b.time,
    from:
      from ??
      (home.length ? home[o.arrivals % Math.min(3, home.length)] : undefined),
  };
  notify(o, `+1 ${troopNames[type].toLowerCase()}`, o.fort, "good", b.time + 4);
}
export const spoilsOf = (units: TroopType[]) =>
  (["shield", "bow", "horse"] as const)
    .map((t) => [t, units.filter((u) => u === t).length] as const)
    .sort((a, c) => c[1] - a[1])[0][0];
// Where the Clan del Humo camps: every cell its waves set out from.
export function enemyCamps(b: Battle): number[] {
  const o = b.outpost;
  if (!o) return [];
  const camps = o.script
    ? [...new Set(o.script.waves.map((w) => w.from))]
    : (o.entries ?? [EAST]);
  // A taken camp is gone: it burns and becomes your land.
  return o.camp?.taken ? camps.filter((id) => id !== o.camp!.cell) : camps;
}
// Seconds an enemy wave spends gathering in view before it sets out.
export const GATHER = 15;
// Waves forming at their entry points: who, where and how far along.
export function gathering(b: Battle) {
  return upcoming(b)
    .filter((e) => e.kind === "enemy" && e.at <= GATHER && e.from !== undefined)
    .map((e) => ({
      from: e.from!,
      units: e.units,
      progress: 1 - e.at / GATHER,
    }));
}
function runScript(b: Battle) {
  const o = b.outpost!,
    sc = o.script!;
  if (sc.clock === null) {
    if (
      sc.trigger === "start" ||
      (sc.trigger === "squad" && b.squads.length) ||
      o.sites.some((s) => s.active)
    )
      sc.clock = b.time;
    else return;
  }
  const t = b.time - sc.clock;
  while (sc.spawned < sc.waves.length && t >= sc.waves[sc.spawned].at) {
    const spec = sc.waves[sc.spawned];
    if (
      !launch(
        b,
        { ...spec, target: aim(b, spec.target, sc.spawned) },
        sc.spawned,
      )
    )
      break; // Spawn cell busy: try again next tick.
    sc.spawned++;
  }
  while (
    sc.delivered < sc.arrivals.length &&
    t >= sc.arrivals[sc.delivered].at
  ) {
    arrive(b, sc.arrivals[sc.delivered].type);
    sc.delivered++;
  }
}
export type Upcoming = {
  at: number;
  kind: "enemy" | "ally";
  units: TroopType[];
  from?: number;
};
// Known future events, in seconds from now, for the timeline.
export function upcoming(b: Battle): Upcoming[] {
  const o = b.outpost;
  if (!o) return [];
  const sc = o.script;
  if (sc) {
    const start = sc.clock;
    if (start === null) return [];
    const now = b.time - start;
    return [
      ...sc.waves.slice(sc.spawned).map((w) => ({
        at: Math.max(0, w.at - now),
        kind: "enemy" as const,
        units: w.units,
        from: w.from,
      })),
      ...sc.arrivals.slice(sc.delivered).map((a) => ({
        at: Math.max(0, a.at - now),
        kind: "ally" as const,
        units: [a.type],
      })),
      ...(nextHarvest(b) ? [nextHarvest(b)!] : []),
    ].sort((a, c) => a.at - c.at);
  }
  const events: Upcoming[] = [];
  if (Number.isFinite(o.nextRaid))
    events.push({
      at: Math.max(0, o.nextRaid - b.time),
      kind: "enemy",
      units:
        o.raids.waves[
          (o.raids.retry ? o.repelled : o.waves) % o.raids.waves.length
        ],
      from: nextEntry(o),
    });
  const harvest = nextHarvest(b);
  if (harvest) events.push(harvest);
  return events.sort((a, c) => a.at - c.at);
}
export function updateOutpost(b: Battle, dt: number) {
  const o = b.outpost;
  if (!o) return;
  b.raids ??= [];
  for (const site of o.sites) {
    if (site.active) continue;
    const enemy = live(b).some((r) => near(b, r.troop.cell, site.cell));
    const builder = b.squads.find(
      (u) => u.cell === site.cell && !u.path.length && !u.routing && !u.engaged,
    );
    if (builder && !enemy) {
      site.progress = Math.min(1, site.progress + dt / 6);
      if (site.progress >= 1) {
        site.active = true;
        site.builtAt = b.time;
        // The tower's own ground is held from the moment it stands.
        if (o.land) o.land[site.cell] = 1;
        notify(o, "Torre en pie", site.cell, "good", b.time + 4);
        if (!o.script) {
          if (!Number.isFinite(o.nextRaid) && o.repelled < o.raids.limit)
            o.nextRaid = b.time + o.raids.firstDelay;
          if (!Number.isFinite(o.nextReinforcement) && o.supply.length)
            o.nextReinforcement = b.time + 16;
        }
      }
    }
  }
  // Apply each raid's outcome once: a sacked tower falls, a sacked fort counts.
  for (const r of b.raids) {
    if (r.handled || r.outcome === "active") continue;
    r.handled = true;
    // Garrisons and scouts are no waves: they do not count towards them.
    if (r.guard || r.slow) continue;
    o.resolved++;
    if (r.outcome === "protected") {
      o.repelled++;
      continue;
    }
    if (r.target === o.fort) {
      o.fortSacked++;
      notify(o, "Cuartel saqueado", o.fort, "danger", b.time + 5);
      continue;
    }
    // Towers are not sacked outright: they fall when their land is eaten.
  }
  // A raid destroyed in battle leaves its arms behind: they equip one more
  // troop of its most common kind, who walks to the fort from the field.
  for (const r of b.raids) {
    if (r.fell === undefined || r.spoils) continue;
    r.spoils = true;
    arrive(b, spoilsOf(r.troop.members), r.troop.cell);
  }
  b.raids = b.raids.filter((r) => r.phase !== "gone");
  updateLand(b, dt);
  updateTracks(b, dt);
  updateScouts(b);
  if (o.camp && !o.camp.taken) updateCamp(b, o.camp, dt);
  if (o.script) {
    if (!o.camp?.taken) runScript(b);
    return;
  }
  // Free play keeps a steady rhythm: a raid every interval, up to two on
  // the map at once, at your towers in turn (or the fort while none stand).
  const raiding = b.raids.filter((r) => !r.slow && !r.guard).length;
  if (
    raiding < 2 &&
    b.time >= o.nextRaid &&
    o.repelled < o.raids.limit &&
    !o.camp?.taken
  ) {
    const towers = o.sites.filter((s) => s.active);
    if (
      launch(b, {
        from: nextEntry(o),
        units:
          o.raids.waves[
            (o.raids.retry ? o.repelled : o.waves) % o.raids.waves.length
          ],
        strength: o.raids.strength,
        target: towers.length ? towers[o.waves % towers.length].cell : o.fort,
      })
    )
      o.nextRaid = b.time + o.raids.interval;
  }
}
// Until your first squad stands, nothing waits: a lone scout sets out every
// SCOUT_EVERY seconds and walks very slowly towards the fort, giving time to
// form that squad. The normal rhythm starts with it (free play's raids, and
// missions whose clock waits for a squad).
export const SCOUT_EVERY = 45,
  SCOUT_FIRST = 8;
function updateScouts(b: Battle) {
  const o = b.outpost!;
  if (b.squads.length) {
    // The first squad stands: scouts stop, the normal rhythm begins.
    if (o.nextScout !== Infinity) {
      o.nextScout = Infinity;
      if (!o.script && !Number.isFinite(o.nextRaid))
        o.nextRaid = b.time + o.raids.firstDelay;
    }
    return;
  }
  if (o.script && o.script.clock !== null) return;
  o.nextScout ??= SCOUT_FIRST;
  if (b.time < o.nextScout) return;
  const entries = enemyCamps(b);
  if (
    entries.length &&
    launch(b, {
      from: entries[0],
      units: ["shield"],
      strength: 20,
      target: o.fort,
      probe: true,
    })
  ) {
    b.raids!.at(-1)!.slow = true;
    o.nextScout = b.time + SCOUT_EVERY;
  }
}
// Raiders leave tracks where they pass; they fade over a couple of minutes,
// so the map remembers where raids come from.
export const TRACKS_FADE = 150;
function updateTracks(b: Battle, dt: number) {
  const o = b.outpost!;
  o.tracks ??= b.cells.map(() => 0);
  o.trackDir ??= b.cells.map(() => 0);
  for (let id = 0; id < o.tracks.length; id++)
    if (o.tracks[id] > 0)
      o.tracks[id] = Math.max(0, o.tracks[id] - dt / TRACKS_FADE);
  for (const r of live(b)) {
    const e = r.troop;
    if (!e.path.length) continue;
    o.tracks[e.cell] = 1;
    o.trackDir[e.cell] = Math.atan2(
      b.cells[e.path[0]].y - b.cells[e.cell].y,
      b.cells[e.path[0]].x - b.cells[e.cell].x,
    );
  }
}
// Seconds a squad must hold the rival camp to take it.
export const CAMP_HOLD = 35;
// Holding the rival camp, uncontested and next to a secured tower, ends the raids.
function updateCamp(b: Battle, camp: NonNullable<Outpost["camp"]>, dt: number) {
  const o = b.outpost!;
  const supported = campSupported(b);
  // A squad standing on the camp holds it, even while it fights.
  const holder = b.squads.find(
    (u) => u.cell === camp.cell && !u.path.length && !u.routing,
  );
  if (!holder || !supported) {
    // Ground taken is not lost at once: retake it before it fades.
    camp.progress = Math.max(0, camp.progress - dt / 30);
    return;
  }
  // Contested: the clan fights for it and the taking slows to a third.
  const threat = live(b).some(
    (r) => r.phase !== "retreat" && near(b, r.troop.cell, camp.cell),
  );
  camp.progress = Math.min(
    1,
    camp.progress + dt / (CAMP_HOLD * (threat ? 3 : 1)),
  );
  if (camp.progress >= 1) {
    camp.taken = true;
    o.nextRaid = Infinity;
    for (const r of b.raids ?? []) if (r.phase === "retreat") r.phase = "gone";
    notify(o, "Campamento tomado", camp.cell, "good", b.time + 5);
  }
}

// ── Land ────────────────────────────────────────────────────────────────
// Land is what is yours. The fort holds its ring and every standing tower
// projects land around it (rocks block, forest and slopes cost reach). Enemy
// troops eat the land they stand on and next to; a tower whose own cell is
// eaten falls. Land also yields troops: the more you hold, the faster they come.
export const HOLD = 0.5;
// Seconds for held ground to become fields and houses; how fast fire razes
// it; how long the flames and smoke of a burning cell last.
export const SETTLE = 24;
const SCORCH = 0.6;
export const BURN = 6;
// Where people can settle: not on rock, in a river or a ford.
const livable = (c: Battle["cells"][number]) =>
  !solid(c) && c.terrain !== "ford";
// Some settled cells grow a house; troops set out from them.
export const hasHouse = (id: number) =>
  (id * 7 + Math.floor(id / 18)) % 3 === 0;
// Cell-seconds of held land per troop that arrives at the fort, and the
// fastest arrivals can come however much land is held.
export const HARVEST = 450;
const FASTEST = 18;
const yieldRate = (b: Battle) => Math.min(held(b) / HARVEST, 1 / FASTEST);
const GROW = 0.35,
  FADE = 0.06,
  EAT = 0.5,
  EAT_NEAR = 0.2,
  // A tower's own cell resists: it takes a while to topple.
  TOWER_RESIST = 0.12;
// Cells each source reaches, with the delay before land spreads to them.
function reach(b: Battle, from: number, limit: number) {
  const costs = new Map([[from, 0]]),
    open = [from];
  while (open.length) {
    const id = open.shift()!,
      cost = costs.get(id)!;
    for (const n of adjacent(id)) {
      const c = b.cells[n];
      if (solid(c)) continue;
      const next =
        cost +
        1 +
        (c.terrain === "forest" || c.terrain === "ford" ? 0.5 : 0) +
        Math.max(0, c.height - b.cells[id].height) / 30;
      if (next <= limit && next < (costs.get(n) ?? Infinity)) {
        costs.set(n, next);
        open.push(n);
      }
    }
  }
  return costs;
}
// Where land is supported right now, and from when each cell may grow.
function supported(b: Battle) {
  const o = b.outpost!,
    from = new Map<number, number>();
  for (const id of reach(b, o.fort, 1).keys()) from.set(id, -Infinity);
  for (const s of o.sites) {
    if (!s.active || s.builtAt === null) continue;
    for (const [id, cost] of reach(b, s.cell, 2)) {
      const start = s.builtAt + cost * 2;
      from.set(id, Math.min(from.get(id) ?? Infinity, start));
    }
  }
  return from;
}
// Settle land instantly (used when a mission starts with towers standing).
export function settleLand(b: Battle) {
  const o = b.outpost!;
  o.land = b.cells.map(() => 0);
  // Land already held when a mission starts is already lived in.
  o.settled = b.cells.map(() => 0);
  o.burning = b.cells.map(() => -Infinity);
  // The clan already holds the ground around its camps.
  o.foe = b.cells.map(() => 0);
  for (const camp of enemyCamps(b))
    for (const id of reach(b, camp, FOE_REACH).keys()) o.foe[id] = 1;
  for (const id of supported(b).keys()) {
    o.land[id] = 1;
    o.foe[id] = 0;
    if (livable(b.cells[id])) o.settled[id] = 1;
  }
}
export const held = (b: Battle) =>
  (b.outpost?.land ?? []).filter((v) => v >= HOLD).length;
// Cells an enemy is eating right now.
export function eaten(b: Battle) {
  const cells = new Set<number>();
  for (const r of live(b)) {
    if (r.phase === "retreat" || r.troop.routing || r.guard || r.probe)
      continue;
    cells.add(r.troop.cell);
    for (const n of adjacent(r.troop.cell)) cells.add(n);
  }
  return cells;
}
// ── The clan's land ─────────────────────────────────────────────────────
// The Clan del Humo holds ground too, in soot: around its camps (where your
// land is not), and wherever its raiders eat yours. Your land wins it back
// slowly where your towers reach, faster under your squads' feet; it fades
// on its own elsewhere. While the clan holds a cell your land grows there at
// FOE_DRAG of its pace. A taken camp stops feeding it.
const FOE_REACH = 2,
  FOE_GROW = 0.1,
  FOE_TAKE = 0.6,
  FOE_BACK = 0.06,
  FOE_TREAD = 0.4,
  FOE_FADE = 0.01,
  FOE_DRAG = 0.4;
export const foeHeld = (b: Battle) =>
  (b.outpost?.foe ?? []).filter((v) => v >= HOLD).length;
function updateFoe(
  b: Battle,
  eating: Map<number, number>,
  from: Map<number, number>,
  dt: number,
) {
  const o = b.outpost!,
    land = o.land!,
    foe = (o.foe ??= b.cells.map(() => 0));
  const camps = new Set<number>();
  for (const camp of enemyCamps(b))
    for (const id of reach(b, camp, FOE_REACH).keys()) camps.add(id);
  const trodden = new Set(
    b.squads.filter((u) => !u.routing).map((u) => u.cell),
  );
  for (let id = 0; id < foe.length; id++) {
    if (solid(b.cells[id])) continue;
    let v = foe[id];
    const eat = eating.get(id);
    if (eat) v += eat * FOE_TAKE * dt;
    else if (camps.has(id) && land[id] < HOLD) v += FOE_GROW * dt;
    else v -= (from.has(id) ? FOE_BACK : FOE_FADE) * dt;
    if (trodden.has(id)) v -= FOE_TREAD * dt;
    foe[id] = Math.min(1, Math.max(0, v));
  }
}
function updateLand(b: Battle, dt: number) {
  const o = b.outpost!;
  o.land ??= b.cells.map(() => 0);
  const land = o.land,
    from = supported(b),
    towers = new Set(o.sites.filter((s) => s.active).map((s) => s.cell));
  const eating = new Map<number, number>();
  for (const r of live(b)) {
    if (r.phase === "retreat" || r.troop.routing || r.guard || r.probe)
      continue;
    eating.set(r.troop.cell, (eating.get(r.troop.cell) ?? 0) + EAT);
    for (const n of adjacent(r.troop.cell))
      eating.set(n, (eating.get(n) ?? 0) + EAT_NEAR);
  }
  o.settled ??= b.cells.map(() => 0);
  o.burning ??= b.cells.map(() => -Infinity);
  o.foe ??= b.cells.map(() => 0);
  const settled = o.settled,
    burning = o.burning,
    foe = o.foe;
  for (let id = 0; id < land.length; id++) {
    const eat = eating.get(id);
    if (eat) {
      const resist = towers.has(id) || id === o.fort ? TOWER_RESIST : 1;
      land[id] = Math.max(0, land[id] - eat * resist * dt);
      // Settled ground burns where the enemy stands; what was built is lost.
      if (settled[id] > 0.05) {
        if (b.time - burning[id] > BURN) burning[id] = b.time;
        settled[id] = Math.max(0, settled[id] - SCORCH * dt);
      }
    } else {
      if (from.has(id)) {
        // Ground the clan holds is slow to win back.
        if (b.time >= from.get(id)!)
          land[id] = Math.min(
            1,
            land[id] + GROW * (foe[id] >= HOLD ? FOE_DRAG : 1) * dt,
          );
      } else land[id] = Math.max(0, land[id] - FADE * dt);
      // Held ground is slowly settled: fields first, then houses.
      if (land[id] >= HOLD && livable(b.cells[id]))
        settled[id] = Math.min(1, settled[id] + dt / SETTLE);
      else settled[id] = Math.max(0, settled[id] - dt * 0.1);
    }
  }
  updateFoe(b, eating, from, dt);
  // A tower whose own ground is eaten falls.
  for (const s of o.sites)
    if (s.active && land[s.cell] < 0.2) {
      s.active = false;
      s.progress = 0;
      s.builtAt = null;
      o.lostTowers++;
      notify(o, "Torre caída", s.cell, "danger", b.time + 6);
    }
  // Held land yields troops at the fort.
  o.harvest = (o.harvest ?? 0) + yieldRate(b) * dt;
  if (o.harvest >= 1) {
    o.harvest -= 1;
    arrive(b, o.supply[o.arrivals % o.supply.length] ?? "shield");
  }
}
// When the next troop earned by the land will arrive.
function nextHarvest(b: Battle): Upcoming | null {
  const o = b.outpost!,
    rate = yieldRate(b);
  if (!rate) return null;
  return {
    at: (1 - (o.harvest ?? 0)) / rate,
    kind: "ally",
    units: [o.supply[o.arrivals % o.supply.length] ?? "shield"],
  };
}
