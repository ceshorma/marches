import {
  createWorld,
  costs,
  distance,
  DX,
  findPath,
  neighbors,
  recruitTime,
  typeNames,
  walkable,
} from "./world";
import type { World, Unit, UnitType, Faction, Place } from "./world";
export function event(
  w: World,
  title: string,
  detail: string,
  cell: number,
  kind: World["events"][number]["kind"] = "info",
) {
  w.events.unshift({ id: w.nextId++, time: w.time, title, detail, cell, kind });
  w.events = w.events.slice(0, 35);
}
export function moveUnit(w: World, id: string, target: number): string | null {
  const u = w.units.find((u) => u.id === id && u.faction === "ally");
  if (!u) return "Selecciona una unidad aliada.";
  if (!w.cells[target] || !walkable(w.cells[target]))
    return "El agua y las montañas no son transitables. Busca un paso.";
  const route = findPath(w.cells, u.cell, target);
  if (!route.length && target !== u.cell)
    return "No hay un camino disponible hasta esa posición.";
  u.path = route;
  u.posture = "advance";
  return null;
}
export function recruit(
  w: World,
  placeId: string,
  type: UnitType,
): string | null {
  const p = w.places.find((p) => p.id === placeId);
  if (!p || p.faction !== "ally" || p.kind !== "fort")
    return "Solo puedes reclutar en fortalezas aliadas.";
  if (w.gold < costs[type]) return "No hay suficiente oro.";
  if (p.queue.length >= 3) return "La cola de reclutamiento está completa.";
  w.gold -= costs[type];
  p.queue.push({
    type,
    remaining: recruitTime[type],
    total: recruitTime[type],
  });
  event(
    w,
    "Reclutamiento en marcha",
    `${typeNames[type]} en ${p.name}. Estarán listos en ${recruitTime[type]} segundos.`,
    p.cell,
  );
  return null;
}
export function projectInfluence(w: World, immediate = false) {
  const ally = new Float32Array(w.cells.length),
    enemy = new Float32Array(w.cells.length);
  const sources = [
    ...w.places
      .filter((p) => p.faction !== "neutral")
      .map((p) => ({
        cell: p.cell,
        faction: p.faction,
        strength: p.kind === "fort" ? 11 : 8,
      })),
    ...w.units.map((u) => ({ cell: u.cell, faction: u.faction, strength: 4 })),
  ];
  for (const s of sources) {
    const values = s.faction === "ally" ? ally : enemy,
      seen = new Map<number, number>([[s.cell, s.strength]]),
      queue = [s.cell];
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head],
        strength = seen.get(id)!;
      values[id] = Math.max(values[id], strength);
      for (const n of neighbors(id)) {
        const c = w.cells[n];
        if (c.terrain === "water") continue;
        const cost =
          c.terrain === "mountain" ? 3 : c.terrain === "forest" ? 1.65 : 1.1;
        const next =
          strength -
          cost -
          (c.owner !== "neutral" && c.owner !== s.faction ? 0.5 : 0);
        if (next > 0.2 && next > (seen.get(n) ?? 0)) {
          seen.set(n, next);
          queue.push(n);
        }
      }
    }
  }
  for (const c of w.cells) {
    const factor = immediate ? 1 : 0.16;
    c.ally += (ally[c.id] - c.ally) * factor;
    c.enemy += (enemy[c.id] - c.enemy) * factor;
    c.owner =
      c.ally > 1 && c.ally > c.enemy + 1
        ? "ally"
        : c.enemy > 1 && c.enemy > c.ally + 1
          ? "enemy"
          : "neutral";
  }
}
function reveal(w: World) {
  for (const u of w.units.filter((u) => u.faction === "ally")) {
    const radius = u.type === "cavalry" ? 7 : 5;
    for (const c of w.cells) if (distance(c, u) < radius) c.explored = true;
  }
  for (const p of w.places) {
    if (!p.discovered && w.cells[p.cell].explored) {
      p.discovered = true;
      event(
        w,
        "Nueva posición descubierta",
        `${p.name}: ${p.faction === "enemy" ? "una posición enemiga" : "una oportunidad para ampliar tu influencia"}.`,
        p.cell,
        "discovery",
      );
    }
  }
  for (const u of w.units.filter((u) => u.faction === "enemy")) {
    const visible = w.cells[u.cell].explored;
    if (visible && !u.revealed) {
      event(
        w,
        "Enemigo avistado",
        `${u.name} ha sido detectada en ${w.cells[u.cell].region}.`,
        u.cell,
        "danger",
      );
    }
    u.revealed = visible;
  }
}
function autoOrder(w: World, u: Unit) {
  if (u.path.length) return;
  if (u.posture === "patrol" && u.patrol.length) {
    const target = u.patrol[u.patrolIndex % u.patrol.length];
    u.patrolIndex++;
    u.path = findPath(w.cells, u.cell, target);
  } else if (u.posture === "advance") {
    const enemy = w.units.find(
      (e) => e.faction !== u.faction && e.revealed && distance(u, e) < 4,
    );
    if (enemy) u.path = findPath(w.cells, u.cell, enemy.cell);
  }
}
function processCapture(w: World, p: Place, dt: number) {
  const nearby = w.units.filter(
    (u) => distance(u, w.cells[p.cell]) < 1.8 && u.hp > 0,
  );
  const allies = nearby.filter((u) => u.faction === "ally"),
    enemies = nearby.filter((u) => u.faction === "enemy");
  const faction: Faction | null =
    allies.length && !enemies.length
      ? "ally"
      : enemies.length && !allies.length
        ? "enemy"
        : null;
  if (faction && faction !== p.faction) {
    if (p.capturing !== faction) {
      p.capture = 0;
      p.capturing = faction;
    }
    p.capture = Math.min(100, p.capture + dt * 8);
    if (p.capture >= 100) {
      p.faction = faction;
      p.capture = 0;
      p.capturing = null;
      event(
        w,
        faction === "ally" ? "Posición asegurada" : "Posición perdida",
        `${p.name} está bajo control ${faction === "ally" ? "aliado" : "enemigo"}. Su influencia se extenderá por el territorio.`,
        p.cell,
        faction === "ally" ? "capture" : "danger",
      );
      if (faction === "enemy" && p.queue.length) {
        event(
          w,
          "Reclutamiento cancelado",
          `La caída de ${p.name} ha interrumpido los refuerzos.`,
          p.cell,
          "danger",
        );
        p.queue = [];
      }
      if (p.id === "bridge" && faction === "ally") w.objectiveComplete = true;
    }
  } else {
    p.capture = Math.max(0, p.capture - dt * 3);
    if (!p.capture) p.capturing = null;
  }
  const threatened =
    p.faction === "ally" &&
    w.units.some(
      (u) => u.faction === "enemy" && distance(u, w.cells[p.cell]) < 6,
    );
  if (threatened && !p.threatened)
    event(
      w,
      "Posición bajo amenaza",
      `Fuerzas enemigas se aproximan a ${p.name}. La guarnición necesita apoyo.`,
      p.cell,
      "danger",
    );
  p.threatened = threatened;
}
export function tick(w: World, dt: number) {
  w.time += dt;
  for (const u of w.units) {
    autoOrder(w, u);
    const enemy = w.units.find(
      (e) =>
        e.faction !== u.faction &&
        distance(u, e) < (u.type === "archer" ? 3.1 : 1.45),
    );
    u.attackCooldown -= dt;
    if (enemy) {
      if (u.attackCooldown <= 0) {
        const cover = w.cells[enemy.cell].terrain === "forest" ? 0.7 : 1;
        enemy.hp -=
          (u.type === "cavalry" ? 12 : u.type === "archer" ? 9 : 11) * cover;
        u.attackCooldown = 1.5;
      }
      if (u.posture === "defend") u.path = [];
    } else if (u.path.length) {
      const c = w.cells[u.path[0]],
        d = Math.hypot(c.x - u.x, c.y - u.y),
        speed =
          (u.faction === "enemy" ? 11 : u.type === "cavalry" ? 42 : 29) *
          (c.terrain === "forest" ? 0.65 : 1);
      const travel = dt * speed;
      if (d <= travel) {
        u.x = c.x;
        u.y = c.y;
        u.cell = c.id;
        u.path.shift();
      } else {
        u.x += ((c.x - u.x) / d) * travel;
        u.y += ((c.y - u.y) / d) * travel;
      }
    }
    const isolated =
      u.faction === "ally" &&
      !w.places.some(
        (p) => p.faction === "ally" && distance(u, w.cells[p.cell]) < 9,
      ) &&
      !w.units.some(
        (a) => a.id !== u.id && a.faction === "ally" && distance(u, a) < 6,
      );
    if (isolated && !u.isolated)
      event(
        w,
        "Unidad aislada",
        `${u.name} está lejos del apoyo de la compañía. Acerca refuerzos.`,
        u.cell,
        "danger",
      );
    u.isolated = isolated;
  }
  for (const p of w.places) {
    processCapture(w, p, dt);
    if (p.faction !== "neutral" && p.kind === "fort") {
      for (const u of w.units)
        if (u.faction !== p.faction && distance(u, w.cells[p.cell]) < 3.5)
          u.hp -= dt * 3;
    }
    if (p.queue.length && p.faction === "ally") {
      p.queue[0].remaining -= dt;
      if (p.queue[0].remaining <= 0) {
        const job = p.queue.shift()!;
        const c =
          w.cells[
            neighbors(p.cell).find(
              (id) =>
                walkable(w.cells[id]) && !w.units.some((u) => u.cell === id),
            ) ?? p.cell
          ];
        w.units.push({
          id: `u${w.nextId++}`,
          name: `${typeNames[job.type]} del Alba`,
          type: job.type,
          faction: "ally",
          cell: c.id,
          x: c.x,
          y: c.y,
          hp: 100,
          path: [],
          posture: "defend",
          home: c.id,
          patrol: [],
          patrolIndex: 0,
          revealed: true,
          isolated: false,
          attackCooldown: 0,
        });
        event(
          w,
          "Refuerzos disponibles",
          `${typeNames[job.type]} se han unido a la compañía en ${p.name}.`,
          p.cell,
        );
      }
    }
  }
  const dead = w.units.filter((u) => u.hp <= 0);
  for (const u of dead)
    event(
      w,
      u.faction === "enemy" ? "Incursión repelida" : "Unidad perdida",
      `${u.name} ha caído en combate.`,
      u.cell,
      u.faction === "enemy" ? "capture" : "danger",
    );
  w.units = w.units.filter((u) => u.hp > 0);
  w.influenceClock += dt;
  if (w.influenceClock >= 0.5) {
    w.influenceClock = 0;
    projectInfluence(w);
    reveal(w);
    for (const c of w.cells) c.occupant = null;
    for (const u of w.units) w.cells[u.cell].occupant = u.id;
  }
  w.incomeClock += dt;
  if (w.incomeClock >= 30) {
    w.incomeClock -= 30;
    const n = w.places.filter((p) => p.faction === "ally").length;
    w.gold += n * 5;
    w.supplies += n * 3;
    event(
      w,
      "Llegan suministros",
      `Tus ${n} posiciones aportan ${n * 5} de oro y ${n * 3} provisiones.`,
      w.places[0].cell,
    );
  }
  w.revision++;
}
export function initialWorld(seed = 24300) {
  const w = createWorld(seed);
  projectInfluence(w, true);
  reveal(w);
  return w;
}
export function patrolUnit(w: World, u: Unit) {
  const goal = neighbors(u.cell)
    .flatMap(neighbors)
    .find((id) => walkable(w.cells[id]) && distance(w.cells[id], u) > 1.2);
  u.home = u.cell;
  u.patrol = [goal ?? u.cell, u.cell];
  u.patrolIndex = 0;
  u.path = [];
  u.posture = "patrol";
}
export const worldSize = { width: 50 * DX, height: 40 * 27 };
