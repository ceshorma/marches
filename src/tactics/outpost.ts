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
    nextReinforcement: Infinity,
    serial: 0,
    waves: 0,
    noticeUntil: 0,
    notice: "",
    recruitAt: 0,
  };
  for (const s of b.outpost.sites) b.cells[s.cell].terrain = "plain";
  for (let q = 3; q < 18; q++) b.cells[cell(q, 8)].terrain = "plain";
  return b;
}
export function createScout(b: Battle, automatic = false): string | null {
  const o = b.outpost!;
  if (b.squads.length >= 5) return "Ya tienes cinco escuadrones";
  if (!automatic && b.time < o.recruitAt) return "Preparando otro escuadrón";
  const id = adjacent(o.fort).find((id) => !blocked(b, id, "recruit"));
  if (id === undefined) return "Despeja el cuartel";
  o.serial++;
  const unit: Squad = {
    id: `p${o.serial}`,
    name: `Escuadrón ${o.serial}`,
    cell: id,
    facing: 0,
    targetFacing: 0,
    members: ["shield"],
    path: [],
    progress: 0,
    hold: true,
    cohesion: 100,
  };
  b.squads.push(unit);
  o.recruitAt = b.time + 25;
  if (automatic) {
    const target = adjacent(id).find(
      (n) => b.cells[n].q > b.cells[id].q && !blocked(b, n, unit.id),
    );
    if (target !== undefined) unit.path = route(b, unit, target);
    o.notice = "Llegan refuerzos al cuartel";
    o.noticeUntil = b.time + 5;
  }
  return null;
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
  if (b.time >= o.nextReinforcement && b.squads.length < 5) {
    const error = createScout(b, true);
    o.nextReinforcement = b.time + (error ? 2 : 30);
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
