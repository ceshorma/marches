import { createOutpost, held, settleLand } from "./outpost";
import { adjacent } from "./model";
import type { Battle, WaveSpec } from "./model";
import type { TroopType } from "./combat";
// Campaign 1 · «La Marca del Este». Every mission is a series of enemy waves
// and friendly arrivals on one clock; the map, where enemies come from and
// what they bring change how to advance. docs/campana-1.md holds the design.
const cell = (q: number, r: number) => r * 18 + q;
const WEST = cell(7, 8),
  NORTH = cell(9, 5),
  SOUTH = cell(11, 9),
  CAMP = cell(16, 8);
// Enemy entry points on the map edge.
const E = cell(16, 8),
  NE = cell(15, 0),
  SE = cell(16, 11),
  S = cell(7, 11);
type Status = "active" | "won" | "lost";
const L: TroopType = "shield",
  A: TroopType = "bow",
  C: TroopType = "horse";
const wave = (
  at: number,
  from: number,
  units: TroopType[],
  strength = 40,
  target: WaveSpec["target"] = "tower",
): WaveSpec => ({ at, from, units, strength, target });
export type MissionConfig = {
  name: string;
  objective: string;
  // Briefing shown in the header for the first seconds of the mission.
  hint: string;
  success: string;
  failure: string;
  sites: number[];
  built?: number[];
  squads?: { cell: number; members: TroopType[]; layout?: number[] }[];
  reserve: Record<TroopType, number>;
  // The clock starts at once, or when the first tower stands.
  trigger: "start" | "tower";
  waves: WaveSpec[];
  arrivals: { at: number; type: TroopType }[];
  // Terrain changes that shape this mission's routes.
  map?: { rock?: number[]; forest?: number[]; plain?: number[] };
  camp?: boolean;
  // Cells of land to hold when the last wave is over.
  goal?: number;
  check: (b: Battle) => Status;
};
const none = { shield: 0, bow: 0, horse: 0 };
const standing = (b: Battle) => b.outpost!.sites.filter((s) => s.active).length;
const allResolved = (b: Battle) =>
  b.outpost!.resolved >= b.outpost!.script!.waves.length;
// Land objective: hold the goal when the last wave is over; a sacked fort loses.
const holdLand = (b: Battle): Status =>
  b.outpost!.fortSacked
    ? "lost"
    : allResolved(b) && !b.raids?.length
      ? held(b) >= missions[b.lesson!.index].goal!
        ? "won"
        : "lost"
      : "active";
export const missions: MissionConfig[] = [
  {
    name: "La primera torre",
    objective: "DOMINA 18 CASILLAS",
    hint: "El cuartel espera órdenes. Una torre al este extiende tu tierra.",
    success: "La torre resiste",
    failure: "No te quedó tierra suficiente",
    sites: [WEST],
    reserve: { ...none, shield: 2 },
    trigger: "tower",
    arrivals: [{ at: 10, type: A }],
    waves: [wave(25, E, [L, L], 35), wave(65, E, [L, L, A], 40)],
    goal: 18,
    check: holdLand,
  },
  {
    name: "Dos caminos",
    objective: "CONSERVA 18 CASILLAS",
    hint: "Llegan por el este y por el sur. El lado por el que te golpean importa.",
    success: "Ningún flanco cedió",
    failure: "No te quedó tierra suficiente",
    sites: [WEST],
    built: [WEST],
    squads: [{ cell: cell(3, 7), members: [L, L, A] }],
    reserve: { ...none, shield: 1 },
    trigger: "start",
    arrivals: [
      { at: 20, type: C },
      { at: 55, type: L },
      { at: 70, type: A },
    ],
    waves: [
      wave(15, E, [L, L]),
      wave(45, S, [C, C]),
      wave(85, E, [L, A]),
      wave(85, S, [C, L]),
    ],
    map: { plain: [cell(7, 9), cell(7, 10), cell(7, 11), cell(6, 10)] },
    goal: 18,
    check: holdLand,
  },
  {
    name: "Cada tropa su rival",
    objective: "CONSERVA 18 CASILLAS",
    hint: "Lanceros vencen a caballería, caballería a arqueros, arqueros a lanceros.",
    success: "Has leído al enemigo",
    failure: "No te quedó tierra suficiente",
    sites: [WEST],
    built: [WEST],
    squads: [{ cell: cell(3, 7), members: [L, L] }],
    reserve: { ...none, horse: 2, bow: 1 },
    trigger: "start",
    arrivals: [
      { at: 30, type: L },
      { at: 45, type: L },
      { at: 70, type: A },
      { at: 80, type: A },
    ],
    waves: [
      wave(20, E, [A, A, A, A], 45),
      wave(55, E, [C, C, C], 45),
      wave(95, E, [L, L, L, L], 45),
    ],
    goal: 18,
    check: holdLand,
  },
  {
    name: "La loma del norte",
    objective: "DOMINA 26 CASILLAS",
    hint: "Desde el noreste bajan hacia la loma. Una torre en lo alto los recibe cuesta arriba.",
    success: "Dos torres en pie",
    failure: "No te quedó tierra suficiente",
    sites: [WEST, NORTH],
    built: [WEST],
    squads: [{ cell: cell(3, 7), members: [L, L, A] }],
    reserve: { shield: 2, bow: 2, horse: 0 },
    trigger: "start",
    arrivals: [
      { at: 35, type: C },
      { at: 70, type: A },
      { at: 105, type: L },
    ],
    waves: [
      wave(45, NE, [L, L, C]),
      wave(80, E, [A, A, A]),
      wave(115, NE, [C, C, C]),
      wave(150, E, [L, L, A, A]),
    ],
    goal: 26,
    check: holdLand,
  },
  {
    name: "La pinza",
    objective: "DOMINA 30 CASILLAS",
    hint: "Atacan de dos en dos y desde lados opuestos. Reparte la defensa.",
    success: "La pinza no se cerró",
    failure: "No te quedó tierra suficiente",
    sites: [WEST, NORTH, SOUTH],
    built: [WEST],
    squads: [{ cell: cell(3, 7), members: [L, L, A, A] }],
    reserve: { shield: 2, bow: 1, horse: 2 },
    trigger: "start",
    arrivals: [
      { at: 35, type: L },
      { at: 70, type: C },
      { at: 105, type: A },
      { at: 115, type: L },
    ],
    waves: [
      wave(30, E, [L, L, A]),
      wave(30, S, [C, C]),
      wave(75, NE, [C, C, C]),
      wave(75, SE, [A, A, A]),
      wave(125, E, [L, L, L, A]),
      wave(125, S, [C, C, L]),
    ],
    map: { plain: [cell(7, 9), cell(7, 10), cell(7, 11)] },
    goal: 30,
    check: holdLand,
  },
  {
    name: "La línea del este",
    objective: "TOMA EL CAMPAMENTO RIVAL",
    hint: "Las oleadas salen del campamento. Una torre al sur permite tomarlo.",
    success: "La Marca del Este es tuya",
    failure: "La frontera ha caído",
    sites: [WEST, NORTH, SOUTH],
    built: [WEST],
    squads: [{ cell: cell(3, 7), members: [L, L, A] }],
    reserve: { shield: 2, bow: 2, horse: 2 },
    trigger: "start",
    arrivals: Array.from({ length: 30 }, (_, i) => ({
      at: 25 + i * 25,
      type: ([C, L, A] as const)[i % 3],
    })),
    // The camp keeps sending waves until it falls.
    waves: Array.from({ length: 40 }, (_, i) =>
      wave(
        18 + i * 22,
        i % 2 ? (i % 4 === 1 ? NE : SE) : E,
        (
          [
            [L, L, A],
            [C, C, L],
            [A, A, C],
          ] as TroopType[][]
        )[i % 3],
        50,
      ),
    ),
    camp: true,
    check: (b) =>
      b.outpost!.camp!.taken
        ? "won"
        : b.outpost!.fortSacked || (b.time > 120 && !standing(b))
          ? "lost"
          : "active",
  },
];
export function createMission(index: number): Battle {
  index = Math.max(0, Math.min(missions.length - 1, index));
  const m = missions[index],
    b = createOutpost(),
    o = b.outpost!;
  for (const id of m.map?.plain ?? []) b.cells[id].terrain = "plain";
  for (const id of m.map?.forest ?? []) b.cells[id].terrain = "forest";
  for (const id of m.map?.rock ?? []) b.cells[id].terrain = "rock";
  o.sites = o.sites.filter((s) => m.sites.includes(s.cell));
  for (const s of o.sites)
    if (m.built?.includes(s.cell)) {
      s.active = true;
      s.progress = 1;
      // Pre-built towers already project their full influence.
      s.builtAt = -10;
    }
  o.reserve = { ...m.reserve };
  // Troops earned by land cycle through every type.
  o.supply = ["shield", "bow", "horse"];
  o.nextReinforcement = Infinity;
  o.nextRaid = Infinity;
  o.script = {
    trigger: m.trigger,
    clock: null,
    waves: m.waves,
    arrivals: m.arrivals,
    spawned: 0,
    delivered: 0,
  };
  for (const w of m.waves) b.cells[w.from].terrain = "plain";
  for (const s of m.squads ?? []) {
    o.serial++;
    b.cells[s.cell].terrain = "plain";
    b.squads.push({
      id: `p${o.serial}`,
      name: `Escuadrón ${o.serial}`,
      cell: s.cell,
      facing: 0,
      targetFacing: 0,
      members: [...s.members],
      layout: s.layout ? [...s.layout] : undefined,
      path: [],
      progress: 0,
      hold: true,
      cohesion: 100,
    });
  }
  if (m.camp) {
    b.cells[CAMP].place = "camp";
    b.cells[CAMP].terrain = "plain";
    for (const id of adjacent(CAMP))
      if (b.cells[id].terrain === "rock") b.cells[id].terrain = "plain";
    o.camp = { cell: CAMP, needs: SOUTH, progress: 0, taken: false };
  }
  settleLand(b);
  b.lesson = { index, status: "active", progress: 0, target: m.sites[0] };
  return b;
}
export function updateMission(b: Battle) {
  const lesson = b.lesson;
  if (!lesson || lesson.status !== "active" || !b.outpost) return;
  lesson.status = missions[lesson.index].check(b);
  // Every wave over and the objective still unmet: no endless stalemate.
  if (lesson.status === "active" && allResolved(b) && !b.raids?.length)
    lesson.status = "lost";
}
// Raids resolved / total, for the progress readout.
export function waveProgress(b: Battle) {
  const sc = b.outpost?.script;
  return sc ? { done: b.outpost!.resolved, total: sc.waves.length } : null;
}
const KEY = "marches-campaign-1";
// Stored value: missions unlocked so far; missions.length means completed.
export function readProgress() {
  try {
    return Math.max(
      0,
      Math.min(
        missions.length,
        Number(globalThis.localStorage?.getItem(KEY)) || 0,
      ),
    );
  } catch {
    return 0;
  }
}
export function saveProgress(index: number) {
  try {
    globalThis.localStorage?.setItem(KEY, String(index));
  } catch {
    /* Play remains available when storage is disabled. */
  }
}
