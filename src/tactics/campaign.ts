import { nameSquad } from "./chronicle";
import { createOutpost, held, launch, settleLand } from "./outpost";
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
  CAMP = cell(16, 8),
  GARRISON = cell(15, 8);
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
  strength = 70,
  target: WaveSpec["target"] = "tower",
): WaveSpec => ({ at, from, units, strength, target });
// An assault: waves that set out together (each `delay` seconds after it
// opens), `gap` seconds after the assault before it is over.
type Assault = { gap: number; waves: WaveSpec[] };
const assault = (gap: number, ...waves: WaveSpec[]): Assault => ({
  gap,
  waves,
});
// A wave inside an assault: `at` is its delay from the assault's start.
const w = (
  from: number,
  units: TroopType[],
  strength = 70,
  delay = 0,
  target: WaveSpec["target"] = "tower",
) => wave(delay, from, units, strength, target);
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
  trigger: "start" | "tower" | "squad";
  // Assaults in a sawtooth: peaks that grow, a quiet valley after each.
  assaults: Assault[];
  // Troops arriving at set times, and the levy each assault leaves behind
  // (it reaches the fort when the assault is over).
  arrivals: { at: number; type: TroopType }[];
  levies?: TroopType[][];
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
// Land objective: reach the goal once the last wave is over (the land then
// has RECOVER seconds to grow back, see updateMission); a sacked fort loses.
const holdLand = (b: Battle): Status =>
  b.outpost!.fortSacked
    ? "lost"
    : allResolved(b) &&
        !b.raids?.length &&
        held(b) >= missions[b.lesson!.index].goal!
      ? "won"
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
    // The waves start with your first squad; until then a lone scout comes.
    trigger: "squad",
    arrivals: [{ at: 10, type: A }],
    // Riders first: your lancers beat them, and the first clash shows it.
    // Small and soon: a lone rider, then two, then a proper raid.
    assaults: [
      assault(15, w(E, [C], 35)),
      assault(12, w(E, [C, C], 45)),
      assault(15, w(E, [C, C, A], 55)),
    ],
    levies: [[L], [L, A]],
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
    arrivals: [{ at: 8, type: C }],
    assaults: [
      assault(15, w(E, [L, L])),
      assault(20, w(S, [C, C])),
      assault(22, w(E, [L, A]), w(S, [C, L], 70, 4)),
    ],
    levies: [
      [L, C],
      [L, A],
    ],
    map: { plain: [cell(7, 9), cell(7, 10), cell(7, 11), cell(6, 10)] },
    goal: 18,
    check: holdLand,
  },
  {
    name: "Cada tropa su rival",
    objective: "CONSERVA 19 CASILLAS",
    hint: "Lanceros vencen a caballería, caballería a arqueros, arqueros a lanceros.",
    success: "Has leído al enemigo",
    failure: "No te quedó tierra suficiente",
    sites: [WEST],
    built: [WEST],
    squads: [{ cell: cell(3, 7), members: [L, L] }],
    reserve: { ...none, horse: 2, bow: 1 },
    trigger: "start",
    arrivals: [],
    // Each levy brings what beats the next assault: read it and place it.
    assaults: [
      assault(20, w(E, [A, A, A, A], 75)),
      assault(20, w(E, [C, C, C], 75)),
      assault(22, w(E, [L, L, L, L], 75)),
    ],
    levies: [
      [L, L],
      [A, A],
    ],
    goal: 19,
    check: holdLand,
  },
  {
    name: "La loma del norte",
    objective: "DOMINA 28 CASILLAS",
    hint: "Desde el noreste bajan hacia la loma. Una torre en lo alto los recibe cuesta arriba.",
    success: "Dos torres en pie",
    failure: "No te quedó tierra suficiente",
    sites: [WEST, NORTH],
    built: [WEST],
    squads: [{ cell: cell(3, 7), members: [L, L, A] }],
    reserve: { shield: 2, bow: 2, horse: 0 },
    trigger: "start",
    arrivals: [],
    assaults: [
      assault(25, w(NE, [L, L, C])),
      assault(20, w(E, [A, A, A])),
      assault(20, w(NE, [C, C, C]), w(E, [L, A], 70, 4)),
      assault(22, w(E, [L, L, A, A]), w(NE, [C, L], 70, 4)),
    ],
    levies: [[C], [A, L], [L, C]],
    goal: 28,
    check: holdLand,
  },
  {
    name: "La pinza",
    objective: "DOMINA 36 CASILLAS",
    hint: "Atacan de dos en dos y desde lados opuestos. Reparte la defensa.",
    success: "La pinza no se cerró",
    failure: "No te quedó tierra suficiente",
    sites: [WEST, NORTH, SOUTH],
    built: [WEST],
    squads: [{ cell: cell(3, 7), members: [L, L, A, A] }],
    reserve: { shield: 2, bow: 1, horse: 2 },
    trigger: "start",
    arrivals: [],
    assaults: [
      assault(22, w(E, [L, L, A]), w(S, [C, C])),
      assault(20, w(NE, [C, C, C]), w(SE, [A, A, A])),
      assault(22, w(E, [L, L, L, A]), w(S, [C, C, L])),
    ],
    levies: [
      [L, C],
      [A, L],
    ],
    map: { plain: [cell(7, 9), cell(7, 10), cell(7, 11)] },
    goal: 36,
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
    arrivals: [],
    // The camp keeps sending assaults until it falls, each a little larger.
    assaults: Array.from({ length: 16 }, (_, k) =>
      assault(
        k ? 22 : 18,
        ...Array.from({ length: Math.min(3, 2 + Math.floor(k / 3)) }, (_, j) =>
          w(
            [E, NE, SE][(k + j) % 3],
            (
              [
                [L, L, A],
                [C, C, L],
                [A, A, C],
              ] as TroopType[][]
            )[(k + j) % 3],
            80,
            j * 4,
          ),
        ),
      ),
    ),
    levies: Array.from(
      { length: 16 },
      (_, k) =>
        (
          [
            [C, L],
            [A, C],
            [L, A],
          ] as TroopType[][]
        )[k % 3],
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
// The assaults laid out as one list of waves, each knowing its assault.
// `at` is an estimate (valleys follow the fights), used for the map only.
function flatten(assaults: Assault[]): WaveSpec[] {
  let clock = 0;
  return assaults.flatMap((a, k) => {
    clock += a.gap;
    const out = a.waves.map((wv) => ({
      ...wv,
      at: clock + wv.at,
      assault: k,
      delay: wv.at,
    }));
    clock += 30;
    return out;
  });
}
export function createMission(index: number): Battle {
  index = Math.max(0, Math.min(missions.length - 1, index));
  const m = missions[index],
    b = createOutpost(),
    o = b.outpost!;
  for (const id of m.map?.plain ?? []) b.cells[id].terrain = "plain";
  for (const id of m.map?.forest ?? []) b.cells[id].terrain = "forest";
  for (const id of m.map?.rock ?? []) b.cells[id].terrain = "rock";
  // Towers already standing; the rest wait in the tray, with the mission's
  // sites as suggestions of where to put them.
  o.sites = o.sites.filter((s) => m.built?.includes(s.cell));
  for (const s of o.sites) {
    s.active = true;
    s.progress = 1;
    // Pre-built towers already project their full influence.
    s.builtAt = -10;
  }
  o.suggested = m.sites.filter((id) => !m.built?.includes(id));
  o.kits = o.suggested.length;
  for (const id of o.suggested) b.cells[id].terrain = "plain";
  o.reserve = { ...m.reserve };
  // Troops earned by land cycle through every type.
  o.supply = ["shield", "bow", "horse"];
  o.nextReinforcement = Infinity;
  o.nextRaid = Infinity;
  o.script = {
    trigger: m.trigger,
    clock: null,
    waves: flatten(m.assaults),
    arrivals: m.arrivals,
    spawned: 0,
    delivered: 0,
    assaults: m.assaults.map((a) => ({ gap: a.gap })),
    levies: m.levies,
  };
  for (const wv of o.script.waves) b.cells[wv.from].terrain = "plain";
  for (const s of m.squads ?? []) {
    o.serial++;
    b.cells[s.cell].terrain = "plain";
    b.squads.push({
      id: `p${o.serial}`,
      name: nameSquad(b),
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
  // A garrison holds the road in front of the camp: beat it to take the camp.
  if (m.camp) {
    b.cells[GARRISON].terrain = "plain";
    launch(
      b,
      {
        from: GARRISON,
        units: [L, L, A, A, C, C],
        strength: 120,
        target: GARRISON,
      },
      undefined,
      true,
    );
  }
  b.lesson = { index, status: "active", progress: 0, target: m.sites[0] };
  return b;
}
export function updateMission(b: Battle) {
  const lesson = b.lesson;
  if (!lesson || lesson.status !== "active" || !b.outpost) return;
  lesson.status = missions[lesson.index].check(b);
  // Every wave over and the objective still unmet: no endless stalemate.
  // The land eaten in the last fight gets RECOVER seconds to grow back.
  if (lesson.status !== "active" || !allResolved(b) || b.raids?.length) {
    lesson.clearAt = undefined;
    return;
  }
  lesson.clearAt ??= b.time;
  if (b.time - lesson.clearAt >= RECOVER) lesson.status = "lost";
}
export const RECOVER = 10;
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
