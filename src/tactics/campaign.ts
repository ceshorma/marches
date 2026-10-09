import { createBattle, adjacent, blocked, route } from "./model";
import { createFrontsBattle } from "./fronts";
import type { Battle } from "./model";
export const missions = [
  {
    name: "La primera orden",
    objective: "OCUPA EL PUESTO",
    hint: "Selecciona tu tropa y señala el hexágono marcado.",
    success: "Posición asegurada",
  },
  {
    name: "La primera incursión",
    objective: "PROTEGE LA ALDEA",
    hint: "Intercepta la patrulla antes de que se lleve los suministros.",
    success: "Aldea protegida",
  },
  {
    name: "La tropa adecuada",
    objective: "DESALOJA A LOS ARQUEROS",
    hint: "Elige una tropa. Consulta sus ventajas de daño al seleccionarla.",
    success: "Paso despejado",
  },
  {
    name: "Los refuerzos",
    objective: "DESPLIEGA Y TOMA EL PASO",
    hint: "Abre tu cuartel, elige refuerzos y ocupa el puesto central.",
    success: "Nueva frontera asegurada",
  },
  {
    name: "Los tres frentes",
    objective: "CAPTURA EL CUARTEL RIVAL",
    hint: "Sostén tus sectores y corta los refuerzos enemigos.",
    success: "Campaña completada",
  },
];
export function createMission(index: number): Battle {
  index = Math.max(0, Math.min(missions.length - 1, index));
  const b = index < 2 ? createBattle(index === 1) : createFrontsBattle();
  b.time = 0;
  b.lesson = {
    index,
    status: "active",
    progress: 0,
    nextArrival: index === 0 ? 12 : 18,
    arrivals: 0,
    target:
      index === 0
        ? 8 * 18 + 7
        : index === 1
          ? 8 * 18 + 14
          : index === 4
            ? 5 * 18 + 15
            : 6 * 18 + 9,
  };
  if (index === 0) {
    b.squads = b.squads.slice(0, 1);
    const u = b.squads[0];
    u.cell = 8 * 18 + 3;
    u.members = Array(6).fill("shield");
    b.cells.forEach((c) => delete c.place);
    b.cells[8 * 18 + 2].place = "fort";
    b.cells[b.lesson.target].place = "tower";
    b.cells[b.lesson.target].terrain = "plain";
  } else if (index === 1) {
    b.squads = b.squads.slice(0, 1);
    b.squads[0].members = Array(6).fill("shield");
  } else if (index === 2 || index === 3) {
    b.fronts = b.fronts!.slice(0, 1);
    const enemy = b.fronts[0];
    enemy.troop.cell = 6 * 18 + 10;
    enemy.troop.path = [];
    enemy.troop.progress = 0;
    enemy.troop.members = Array(6).fill(index === 2 ? "bow" : "shield");
    enemy.target = "center";
    enemy.rethink = 3;
    b.squads = b.squads.slice(0, index === 2 ? 3 : 1);
    b.squads.forEach((u, i) => {
      u.cell = (5 + i) * 18 + 5;
      u.path = [];
      u.progress = 0;
      u.members = Array(6).fill((["shield", "bow", "horse"] as const)[i]);
      b.cells[u.cell].terrain = "plain";
    });
    b.sectors![2].control = 0;
    b.sectors![2].owner = "neutral";
    if (index === 2) {
      b.bases = undefined;
    } else {
      b.bases!.allyReady = 0;
      b.bases!.enemyReady = Infinity;
    }
  } else {
    b.bases!.allyReady = 0;
    b.bases!.enemyReady = 12;
  }
  return b;
}
export function updateMission(b: Battle, dt: number) {
  const lesson = b.lesson;
  if (!lesson || lesson.status !== "active") return;
  if (
    lesson.index < 3 &&
    b.time >= (lesson.nextArrival ?? Infinity) &&
    (lesson.arrivals ?? 0) < (lesson.index === 0 ? 1 : 2)
  ) {
    const home =
      lesson.index === 0
        ? 8 * 18 + 2
        : lesson.index === 1
          ? 8 * 18 + 10
          : 6 * 18 + 3;
    const cell = adjacent(home).find((id) => !blocked(b, id, "arrival"));
    if (cell !== undefined) {
      const template = b.squads[0],
        serial = b.squads.length + 1;
      const unit = {
        ...template,
        id: `arrival-${serial}`,
        name: `Refuerzo ${serial}`,
        cell,
        path: [] as number[],
        progress: 0,
        cohesion: 100,
        engaged: undefined,
        routing: false,
        disengaging: false,
        cooldown: 0,
        hold: false,
        members: Array(6).fill(lesson.index === 2 ? "horse" : "shield"),
      };
      b.squads.push(unit);
      const rally = adjacent(cell).find(
        (id) => !blocked(b, id, unit.id) && b.cells[id].q > b.cells[cell].q,
      );
      if (rally !== undefined) unit.path = route(b, unit, rally);
      lesson.arrivals = (lesson.arrivals ?? 0) + 1;
      lesson.noticeUntil = b.time + 5;
    }
    lesson.nextArrival = b.time + 25;
  }

  switch (lesson.index) {
    case 0: {
      const occupied = b.squads.some(
        (u) => u.cell === lesson.target && !u.path.length,
      );
      lesson.progress = occupied ? Math.min(1, lesson.progress + dt / 3) : 0;
      if (lesson.progress >= 1) lesson.status = "won";
      break;
    }
    case 1:
      if (b.raid?.outcome === "protected") lesson.status = "won";
      else if (b.raid?.outcome === "raided") lesson.status = "lost";
      break;
    case 2:
      if (b.fronts!.every((f) => f.troop.routing)) lesson.status = "won";
      break;
    case 3:
      lesson.progress = Math.max(0, b.sectors![2].control);
      if (lesson.deployed && b.sectors![2].owner === "ally")
        lesson.status = "won";
      break;
    case 4:
      if (b.sectors![4].owner === "ally") lesson.status = "won";
      else if (b.sectors![0].owner === "enemy") lesson.status = "lost";
      break;
  }
}
export function readProgress() {
  try {
    return Math.max(
      0,
      Math.min(
        4,
        Number(globalThis.localStorage?.getItem("marches-campaign-progress")) ||
          0,
      ),
    );
  } catch {
    return 0;
  }
}
export function saveProgress(index: number) {
  try {
    globalThis.localStorage?.setItem(
      "marches-campaign-progress",
      String(index),
    );
  } catch {
    /* Play remains available when storage is disabled. */
  }
}
