import { attackDamage, zoneFrom } from "./combat";
import type { TroopType } from "./combat";
import {
  createBattle,
  adjacent,
  allTroops,
  blocked,
  route,
  hold,
  squadPosition,
  DX,
  COLS,
  rise,
} from "./model";
import type { Battle, Squad, Sector } from "./model";
const at = (q: number, r: number) => r * COLS + q;
const distance = (b: Battle, a: Squad, c: Squad) => {
  const p = squadPosition(b, a),
    t = squadPosition(b, c);
  return Math.hypot(p.x - t.x, p.y - t.y) / DX;
};
function squad(id: string, name: string, cell: number, bows = 2): Squad {
  return {
    id,
    name,
    cell,
    facing: 0,
    targetFacing: 0,
    members: Array.from({ length: 6 }, (_, i) =>
      i < 6 - bows ? "shield" : "bow",
    ),
    path: [],
    progress: 0,
    hold: true,
    cohesion: 100,
    cooldown: 0,
  };
}
export function createFrontsBattle(): Battle {
  const b = createBattle();
  b.time = 240;
  b.bases = { allyReady: 240, enemyReady: 252, sequence: 0 };
  b.cells.forEach((c) => delete c.place);
  b.sectors = [
    {
      id: "west",
      name: "CUARTEL DEL ALBA",
      cell: at(3, 6),
      control: 1,
      owner: "ally",
      allies: 0,
      enemies: 0,
    },
    {
      id: "north",
      name: "ALTO DE LA VIGÍA",
      cell: at(8, 2),
      control: 1,
      owner: "ally",
      allies: 0,
      enemies: 0,
    },
    {
      id: "center",
      name: "PASO DEL ROBLE",
      cell: at(9, 6),
      control: 0.2,
      owner: "neutral",
      allies: 0,
      enemies: 0,
    },
    {
      id: "south",
      name: "CAMPOS DEL SUR",
      cell: at(8, 9),
      control: 1,
      owner: "ally",
      allies: 0,
      enemies: 0,
    },
    {
      id: "east",
      name: "CUARTEL CARMESÍ",
      cell: at(15, 5),
      control: -1,
      owner: "enemy",
      allies: 0,
      enemies: 0,
    },
  ];
  b.sectors.forEach((s, i) => {
    b.cells[s.cell].place =
      i === 0 || i === 4 ? "fort" : i === 1 || i === 2 ? "tower" : "village";
    b.cells[s.cell].terrain = "plain";
  });
  // Keep three distinct approaches through the north ridge, central pass and southern fields.
  for (const r of [2, 6, 9, 10])
    for (let q = 6; q < 18; q++) b.cells[at(q, r)].terrain = "plain";
  b.squads = [
    squad("s1", "Escuadrón I", at(7, 2), 3),
    squad("s2", "Escuadrón II", at(8, 6)),
    squad("s3", "Escuadrón III", at(8, 5), 3),
    squad("s4", "Escuadrón IV", at(7, 9)),
    squad("s5", "Escuadrón V", at(5, 6)),
    squad("s6", "Escuadrón VI", at(6, 8), 3),
    squad("s7", "Escuadrón VII", at(4, 7)),
  ];
  // Distinct roles are visible in the already-running scenario.
  b.squads[0].members = Array(6).fill("bow");
  b.squads[1].members = Array(6).fill("shield");
  b.squads[3].members = Array(6).fill("horse");
  b.squads[4].members = Array(6).fill("horse");
  b.fronts = [
    {
      troop: squad("n1", "Columna norte", at(11, 2)),
      home: at(16, 1),
      target: "north",
      rethink: 2,
    },
    {
      troop: squad("n2", "Apoyo norte", at(13, 3), 3),
      home: at(17, 2),
      target: "north",
      rethink: 3,
    },
    {
      troop: squad("c1", "Vanguardia central", at(10, 6)),
      home: at(16, 5),
      target: "center",
      rethink: 1,
    },
    {
      troop: squad("c2", "Columna central", at(13, 6)),
      home: at(17, 6),
      target: "center",
      rethink: 2,
    },
    {
      troop: squad("e1", "Columna sur", at(12, 9)),
      home: at(16, 10),
      target: "south",
      rethink: 3,
    },
    {
      troop: squad("e2", "Apoyo sur", at(14, 10), 3),
      home: at(17, 10),
      target: "south",
      rethink: 4,
    },
  ];
  b.fronts[0].troop.members = Array(6).fill("horse");
  b.fronts[1].troop.members = Array(6).fill("shield");
  b.fronts[2].troop.members = Array(6).fill("shield");
  b.fronts[3].troop.members = Array(6).fill("bow");
  b.fronts[4].troop.members = Array(6).fill("shield");
  b.fronts[5].troop.members = Array(6).fill("horse");
  allTroops(b).forEach((s) => (b.cells[s.cell].terrain = "plain"));
  b.sectorCells = b.cells.map((c) => {
    let result = 0,
      best = Infinity;
    b.sectors!.forEach((s, i) => {
      const p = b.cells[s.cell],
        d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < best) {
        best = d;
        result = i;
      }
    });
    return result;
  });
  b.pressure = b.cells.map(() => ({ ally: 0, enemy: 0 }));
  for (const f of b.fronts) {
    f.troop.facing = Math.PI;
    f.troop.targetFacing = Math.PI;
    planEnemy(
      b,
      f.troop,
      b.sectors.find((s) => s.id === f.target)!,
    );
  }
  // These are already-issued orders in the demonstration; player orders replace them.
  b.squads[5].path = route(b, b.squads[5], at(8, 8));
  b.squads[5].hold = false;
  b.squads[6].path = route(b, b.squads[6], at(6, 6));
  b.squads[6].hold = false;
  b.fronts.forEach((f, i) => {
    f.home = adjacent(b.sectors![4].cell)[i];
    b.cells[f.home].terrain = "plain";
  });
  updateControl(b, 0);
  return b;
}
function planEnemy(b: Battle, u: Squad, sector: Sector) {
  const center = b.cells[sector.cell],
    current = squadPosition(b, u);
  if (Math.hypot(current.x - center.x, current.y - center.y) < DX * 1.2) return;
  const candidates = [sector.cell, ...adjacent(sector.cell)].filter(
    (id) => !blocked(b, id, u.id),
  );
  for (const id of candidates) {
    const p = route(b, u, id);
    if (p.length) {
      u.path = u.progress > 0 ? [u.path[0], ...p] : p;
      return;
    }
  }
}
function retreat(b: Battle, u: Squad, enemy: boolean) {
  u.routing = true;
  u.engaged = undefined;
  u.disengaging = true;
  const home = enemy
    ? b.fronts!.find((f) => f.troop === u)!.home
    : b.sectors![0].cell;
  const candidates = [
    home,
    ...adjacent(home),
    ...adjacent(home).flatMap(adjacent),
  ];
  for (const id of candidates) {
    const p = route(b, u, id);
    if (p.length) {
      u.path = u.progress > 0 ? [u.path[0], ...p] : p;
      return;
    }
  }
  hold(u);
}
export function advanceFronts(b: Battle, dt: number) {
  if (
    b.bases &&
    b.time >= b.bases.enemyReady &&
    b.fronts!.length < 9 &&
    b.sectors![4].owner === "enemy"
  ) {
    const error = spawnReinforcement(b, true);
    if (error) b.bases.enemyReady = b.time + 2;
  }
  const troops = allTroops(b),
    enemies = b.fronts!.map((f) => f.troop);
  b.strikes = (b.strikes ?? []).filter((h) => b.time - h.time < 0.8);
  for (const u of troops) {
    u.cohesion ??= 100;
    u.cooldown = Math.max(0, (u.cooldown ?? 0) - dt);
    u.engaged = undefined;
    if (u.routing && !u.path.length) {
      u.cohesion = Math.min(100, u.cohesion + dt * 5);
      if (u.cohesion >= 80) {
        u.routing = false;
        u.disengaging = false;
      }
    }
  }
  // Each squad attacks at most one target per exchange; damage is applied after target selection.
  const attacks: { source: Squad; target: Squad; enemy: boolean }[] = [];
  for (const u of troops) {
    if (u.routing) continue;
    const enemy = enemies.includes(u),
      opponents = enemy ? b.squads : enemies;
    const target = opponents
      .filter((o) => !o.routing && distance(b, u, o) < 1.6)
      .sort((a, c) => distance(b, u, a) - distance(b, u, c))[0];
    if (!target) {
      u.cohesion = Math.min(100, u.cohesion! + dt * 1.5);
      continue;
    }
    u.engaged = target.id;
    const p = squadPosition(b, u),
      t = squadPosition(b, target);
    if (!u.disengaging) {
      hold(u);
      u.targetFacing = Math.atan2(t.y - p.y, t.x - p.x);
    }
    if (!u.cooldown) attacks.push({ source: u, target, enemy });
  }
  for (const { source, target, enemy } of attacks) {
    const p = squadPosition(b, source),
      t = squadPosition(b, target);
    target.cohesion = Math.max(
      0,
      target.cohesion! -
        attackDamage(
          source,
          target,
          6,
          rise(b, source, target),
          zoneFrom(target.facing, p, t),
        ),
    );
    target.lastHit = b.time;
    target.lastZone = zoneFrom(target.facing, p, t);
    source.cooldown = 1.5;
    b.strikes!.push({ x: p.x, y: p.y, tx: t.x, ty: t.y, time: b.time, enemy });
  }
  for (const u of troops)
    if (!u.routing && u.cohesion! <= 0) retreat(b, u, enemies.includes(u));
  for (const f of b.fronts!) {
    const u = f.troop;
    f.rethink -= dt;
    if (!u.routing && !u.engaged && f.rethink <= 0) {
      f.rethink = 3;
      let sector = b.sectors!.find((s) => s.id === f.target)!;
      if (sector.owner === "enemy" && sector.control < -0.95) {
        const choices = b
          .sectors!.filter((s) => s.owner !== "enemy")
          .sort(
            (a, c) =>
              Math.hypot(
                b.cells[a.cell].x - b.cells[u.cell].x,
                b.cells[a.cell].y - b.cells[u.cell].y,
              ) -
              Math.hypot(
                b.cells[c.cell].x - b.cells[u.cell].x,
                b.cells[c.cell].y - b.cells[u.cell].y,
              ),
          );
        if (choices.length) {
          sector = choices[0];
          f.target = sector.id;
        }
      }
      if (!u.path.length) planEnemy(b, u, sector);
    }
    const delta =
      ((u.targetFacing - u.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    u.facing += Math.sign(delta) * Math.min(Math.abs(delta), dt * 2.5);
    if (u.engaged && !u.routing) continue;
    if (!u.path.length) continue;
    const next = u.path[0];
    if (
      troops.some(
        (o) =>
          o !== u &&
          (o.cell === next || (o.progress > 0 && o.path[0] === next)),
      )
    ) {
      if (!u.progress) {
        const dest = u.path.at(-1)!,
          p = route(b, u, dest);
        if (p.length) u.path = p;
      }
      continue;
    }
    const a = b.cells[u.cell],
      c = b.cells[next];
    u.targetFacing = Math.atan2(c.y - a.y, c.x - a.x);
    u.progress +=
      dt /
      ((u.routing ? 1.8 : 3.3) +
        (c.terrain === "forest" ? 1 : 0) +
        Math.max(0, c.height - a.height) / 15);
    if (u.progress >= 1) {
      u.cell = next;
      u.path.shift();
      u.progress = 0;
    }
  }
  b.controlClock = (b.controlClock ?? 0) + dt;
  if (b.controlClock >= 0.5) {
    updateControl(b, b.controlClock);
    b.controlClock = 0;
  }
}
export function updateControl(b: Battle, dt: number) {
  const pressure = b.pressure!;
  pressure.forEach((p) => {
    p.ally = 0;
    p.enemy = 0;
  });
  // Project along connected cells: rock blocks, forest and ascent resist.
  for (const u of allTroops(b)) {
    if (u.routing) continue;
    const enemy = b.fronts!.some((f) => f.troop === u),
      cost = new Map([[u.cell, 0]]),
      open = [u.cell];
    while (open.length) {
      const id = open.shift()!,
        d = cost.get(id)!;
      for (const n of adjacent(id)) {
        const c = b.cells[n];
        if (c.terrain === "rock") continue;
        const v =
          d +
          1 +
          (c.terrain === "forest" ? 0.6 : 0) +
          Math.max(0, c.height - b.cells[id].height) / 30;
        if (v < 3.2 && v < (cost.get(n) ?? Infinity)) {
          cost.set(n, v);
          open.push(n);
        }
      }
    }
    for (const [id, d] of cost) {
      pressure[id][enemy ? "enemy" : "ally"] +=
        (1 - d / 3.2) *
        (u.members.length / 6) *
        (0.35 + ((u.cohesion ?? 100) / 100) * 0.65);
    }
  }
  for (const s of b.sectors!) {
    const ids = [s.cell, ...adjacent(s.cell)];
    s.allies = ids.reduce((sum, id) => sum + pressure[id].ally, 0) / ids.length;
    s.enemies =
      ids.reduce((sum, id) => sum + pressure[id].enemy, 0) / ids.length;
    const net = s.allies - s.enemies;
    if (Math.abs(net) > 0.06)
      s.control = Math.max(
        -1,
        Math.min(1, s.control + (dt * Math.max(-1.4, Math.min(1.4, net))) / 25),
      );
    if (s.control >= 0.98) s.owner = "ally";
    else if (s.control <= -0.98) s.owner = "enemy";
  }
}

export function spawnReinforcement(
  b: Battle,
  enemy = false,
  type: TroopType = "shield",
): string | null {
  if (!b.bases || !b.sectors) return "No hay cuartel disponible";
  const base = b.sectors[enemy ? 4 : 0],
    faction = enemy ? "enemy" : "ally",
    ready = enemy ? b.bases.enemyReady : b.bases.allyReady;
  if (base.owner !== faction)
    return "Cuartel capturado: no puede enviar refuerzos";
  if (b.time < ready) return "Preparando refuerzos";
  if ((enemy ? b.fronts!.length : b.squads.length) >= 9)
    return "Capacidad de la compañía completa";
  const id = adjacent(base.cell).find(
    (id) => !blocked(b, id, "new-reinforcement"),
  );
  if (id === undefined) return "Despeja una celda junto al cuartel";
  b.bases.sequence++;
  const u = squad(
    `${enemy ? "enemy" : "ally"}-reinforcement-${b.bases.sequence}`,
    enemy
      ? "Refuerzo Carmesí"
      : `Escuadrón ${["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][b.squads.length]}`,
    id,
  );
  u.members = Array(6).fill(
    enemy
      ? (["shield", "bow", "horse"] as TroopType[])[b.bases.sequence % 3]
      : type,
  );
  if (enemy) {
    const target = ["north", "center", "south"][(b.fronts!.length - 6) % 3];
    b.fronts!.push({ troop: u, home: id, target, rethink: 0 });
    planEnemy(
      b,
      u,
      b.sectors.find((s) => s.id === target)!,
    );
    b.bases.enemyReady = b.time + 35;
  } else {
    b.squads.push(u);
    b.bases.allyReady = b.time + 30;
  }
  return null;
}
