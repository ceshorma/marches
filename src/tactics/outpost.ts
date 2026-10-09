import type { TroopType } from "./combat";
import { createBattle, adjacent, blocked, route } from "./model";
import type { Battle, Squad } from "./model";
const cell = (q: number, r: number) => r * 18 + q;
export function createOutpost(): Battle {
  const b = createBattle();
  b.squads = [];
  b.cells.forEach((c) => delete c.place);
  b.cells[cell(3, 8)].place = "fort";
  b.outpost = {
    fort: cell(3, 8),
    sites: [cell(7, 8), cell(9, 5), cell(11, 9)].map((cell) => ({
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
    recruitAt: 0,
    reserve: { shield: 1, bow: 0, horse: 0 },
    arrivals: 0,
  };
  for (const s of b.outpost.sites) b.cells[s.cell].terrain = "plain";
  for (let q = 3; q < 18; q++) b.cells[cell(q, 8)].terrain = "plain";
  return b;
}
export function deploymentError(b: Battle, id: number): string | null {
  const o = b.outpost,
    c = b.cells[id];
  if (!o || !c || c.terrain === "rock") return "Celda inaccesible";
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
  if (
    b.raid &&
    b.raid.phase !== "gone" &&
    Math.hypot(
      b.cells[b.raid.troop.cell].x - c.x,
      b.cells[b.raid.troop.cell].y - c.y,
    ) < 130
  )
    return "Posición bajo amenaza";
  return null;
}
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
  unit.members.sort(
    (a, c) =>
      ["shield", "horse", "bow"].indexOf(a) -
      ["shield", "horse", "bow"].indexOf(c),
  );
  o.reserve[type]--;
  return null;
}
// Convenience used by simulation tests; the live UI chooses the target cell.
export function createScout(b: Battle): string | null {
  const id = adjacent(b.outpost!.fort).find((id) => !deploymentError(b, id));
  return id === undefined
    ? "Despeja el cuartel"
    : addReserveTroop(b, id, "shield");
}
export function updateOutpost(b: Battle, dt: number) {
  const o = b.outpost;
  if (!o) return;
  for (const site of o.sites) {
    if (site.active) continue;
    const enemy =
      b.raid &&
      b.raid.phase !== "gone" &&
      Math.hypot(
        b.cells[b.raid.troop.cell].x - b.cells[site.cell].x,
        b.cells[b.raid.troop.cell].y - b.cells[site.cell].y,
      ) < 130;
    const builder = b.squads.find(
      (u) => u.cell === site.cell && !u.path.length && !u.routing && !u.engaged,
    );
    if (builder && !enemy) {
      site.progress = Math.min(1, site.progress + dt / 6);
      if (site.progress >= 1) {
        site.active = true;
        site.builtAt = b.time;
        o.notice = "Torre levantada";
        o.noticeUntil = b.time + 4;
        if (!Number.isFinite(o.nextRaid)) o.nextRaid = b.time + 12;
        if (!Number.isFinite(o.nextReinforcement))
          o.nextReinforcement = b.time + 16;
      }
    }
  }
  if (b.raid?.outcome === "raided") {
    const site = o.sites.find((s) => s.cell === b.raid!.target);
    if (site?.active && (site.builtAt ?? 0) <= b.raid.resolvedAt) {
      site.active = false;
      site.progress = 0;
      site.builtAt = null;
      o.notice = "La torre ha caído. Puedes reconstruirla.";
      o.noticeUntil = b.time + 5;
    }
  }
  if (b.raid?.phase === "gone") {
    o.nextRaid = b.time + 28;
    b.raid = undefined;
  }
  if (b.time >= o.nextReinforcement) {
    const total = Object.values(o.reserve).reduce((a, c) => a + c, 0);
    if (total < 12) {
      const type: TroopType = (["shield", "bow", "horse"] as const)[
        o.arrivals % 3
      ];
      o.reserve[type]++;
      o.arrivals++;
      o.notice = "Una nueva tropa está disponible";
      o.noticeUntil = b.time + 5;
    }
    o.nextReinforcement = b.time + 30;
  }
  if (!b.raid && b.time >= o.nextRaid) {
    const targets = o.sites.filter((s) => s.active);
    if (targets.length) {
      const target = targets[o.waves % targets.length].cell;
      const home = cell(16, 8);
      if (blocked(b, home, "incursion")) return;
      const troop: Squad = {
        id: `incursion-${o.waves}`,
        name: "Incursión",
        cell: home,
        facing: Math.PI,
        targetFacing: Math.PI,
        members: ["shield"],
        path: [],
        progress: 0,
        hold: false,
        cohesion: 30,
      };
      b.raid = {
        troop,
        target,
        home,
        phase: "approach",
        pressure: 0,
        supplies: 100,
        stolen: 0,
        outcome: "active",
        resolvedAt: 0,
      };
      troop.path = route(b, troop, target);
      if (!troop.path.length)
        for (const n of adjacent(target)) {
          const path = route(b, troop, n);
          if (path.length) {
            troop.path = path;
            break;
          }
        }
      o.waves++;
      o.nextRaid = Infinity;
      o.notice = "Movimiento en el camino del este";
      o.noticeUntil = b.time + 5;
    }
  }
}
// Connected, terrain-weighted spread. Towers keep projecting after their builders leave.
export function outpostInfluence(b: Battle): Map<number, number> {
  const values = new Map<number, number>();
  if (!b.outpost) return values;
  for (const s of b.outpost.sites) {
    if (!s.active || s.builtAt === null) continue;
    const costs = new Map([[s.cell, 0]]),
      open = [s.cell];
    while (open.length) {
      const id = open.shift()!,
        cost = costs.get(id)!;
      for (const n of adjacent(id)) {
        const c = b.cells[n];
        if (c.terrain === "rock") continue;
        const next =
          cost +
          1 +
          (c.terrain === "forest" ? 0.5 : 0) +
          Math.max(0, c.height - b.cells[id].height) / 30;
        if (next <= 2 && next < (costs.get(n) ?? Infinity)) {
          costs.set(n, next);
          open.push(n);
        }
      }
    }
    for (const [id, cost] of costs) {
      const amount = Math.max(
        0,
        Math.min(1, (b.time - s.builtAt - cost * 2) / 3),
      );
      values.set(id, Math.max(values.get(id) ?? 0, amount));
    }
  }
  return values;
}
