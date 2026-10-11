// Validate imported data before it replaces the live game. Unknown metadata
// is harmless, but every field consumed by the simulation has a schema.
import { COLS, ROWS } from "./model";
import { missions } from "./campaign";
type Check = (v: unknown) => boolean;
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const num: Check = (v) => typeof v === "number" && Number.isFinite(v);
const timer: Check = (v) => typeof v === "number" && !Number.isNaN(v);
const str: Check = (v) => typeof v === "string";
const bool: Check = (v) => typeof v === "boolean";
const integer: Check = (v) =>
  num(v) && Number.isInteger(v) && (v as number) >= 0;
const cell: Check = (v) => integer(v) && (v as number) < COLS * ROWS;
const unitInterval: Check = (v) =>
  num(v) && (v as number) >= 0 && (v as number) <= 1;
const one =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v);
const array =
  (check: Check): Check =>
  (v) =>
    Array.isArray(v) && v.every(check);
const nullable =
  (check: Check): Check =>
  (v) =>
    v === null || check(v);
const shape =
  (
    required: Record<string, Check>,
    optional: Record<string, Check> = {},
  ): Check =>
  (v) =>
    obj(v) &&
    Object.entries(required).every(([k, check]) => check(v[k])) &&
    Object.entries(optional).every(
      ([k, check]) => v[k] === undefined || check(v[k]),
    );
const record =
  (check: Check): Check =>
  (v) =>
    obj(v) && Object.values(v).every(check);
const troop = one("shield", "bow", "horse");
const troops = array(troop);
const kind = one("hero", "knights", "scorpion", "wagon");
const field =
  (check: Check): Check =>
  (v) =>
    array(check)(v) && (v as unknown[]).length === COLS * ROWS;
const special = shape(
  {
    kind,
    type: troop,
    size: (v) => integer(v) && (v as number) > 0 && (v as number) <= 6,
  },
  { name: str },
);
const squadShape = shape(
  {
    id: str,
    name: str,
    cell,
    facing: num,
    targetFacing: num,
    members: troops,
    path: array(cell),
    progress: unitInterval,
    hold: bool,
  },
  {
    layout: array((v) => integer(v) && (v as number) < 6),
    lastZone: one("front", "left", "right", "rear"),
    pendingFacing: num,
    cohesion: (v) => num(v) && (v as number) >= 0,
    engaged: str,
    cooldown: num,
    routing: bool,
    disengaging: bool,
    lastHit: num,
    feats: integer,
    lastVolley: num,
    special,
    stance: one("hold", "wall", "charge", "skirmish"),
    stanceAt: num,
    tiredUntil: num,
  },
);
const squad: Check = (v) => {
  if (!squadShape(v) || !obj(v)) return false;
  const m = v.members as string[],
    layout = v.layout as number[] | undefined;
  if (!m.length || m.length > 6) return false;
  if (
    layout &&
    (layout.length !== m.length || new Set(layout).size !== layout.length)
  )
    return false;
  const sp = v.special;
  return (
    !obj(sp) || m.filter((t) => t === sp.type).length >= (sp.size as number)
  );
};
const raid = shape(
  {
    troop: squad,
    phase: one("approach", "fight", "loot", "retreat", "gone"),
    pressure: num,
    supplies: num,
    stolen: num,
    outcome: one("active", "protected", "raided"),
    resolvedAt: timer,
  },
  {
    target: cell,
    home: cell,
    strength: num,
    wave: integer,
    handled: bool,
    fell: num,
    spoils: bool,
    guard: bool,
    probe: bool,
    slow: bool,
    slayers: array(str),
    shot: bool,
  },
);
const wave = shape(
  {
    at: num,
    from: cell,
    units: troops,
    target: (v) => one("tower", "fort")(v) || cell(v),
    strength: num,
  },
  { layout: array(integer), probe: bool, assault: integer, delay: num },
);
const script = shape(
  {
    trigger: one("start", "tower", "squad"),
    clock: nullable(num),
    waves: array(wave),
    arrivals: array(shape({ at: num, type: troop })),
    spawned: integer,
    delivered: integer,
  },
  {
    assaults: array(shape({ gap: num })),
    starts: array(nullable(num)),
    cleared: integer,
    levies: array(troops),
  },
);
const outpost = shape(
  {
    fort: cell,
    sites: array(
      shape({
        cell,
        progress: unitInterval,
        builtAt: nullable(num),
        active: bool,
      }),
    ),
    nextRaid: timer,
    nextReinforcement: timer,
    serial: integer,
    waves: integer,
    noticeUntil: timer,
    notice: str,
    towerDeploys: integer,
    recruitAt: timer,
    reserve: shape({ shield: integer, bow: integer, horse: integer }),
    arrivals: integer,
    supply: troops,
    supplyEvery: timer,
    raids: shape(
      {
        firstDelay: timer,
        interval: timer,
        waves: array(troops),
        strength: num,
        limit: timer,
      },
      { retry: bool },
    ),
    repelled: integer,
    turnedAway: integer,
    resolved: integer,
    fortSacked: integer,
    lostTowers: integer,
  },
  {
    noticeAt: cell,
    noticeTone: one("go", "info", "danger", "good"),
    lastArrival: shape({ type: troop, time: num }, { from: cell }),
    land: field(unitInterval),
    settled: field(unitInterval),
    burning: field(timer),
    tracks: field(num),
    trackDir: field(num),
    harvest: num,
    script,
    camp: shape({ cell, needs: num, progress: num, taken: bool }),
    foe: field(unitInterval),
    kits: integer,
    suggested: array(cell),
    nextScout: timer,
    map: one("llanura", "paso", "rio", "meseta", "bosque", "valles"),
    entries: array(cell),
    news: array(
      shape(
        { text: str, time: num, tone: one("good", "bad", "info") },
        { who: str },
      ),
    ),
    newsCount: record(integer),
    specials: array(kind),
    assaultOpen: bool,
    spoilsCount: integer,
    wagonGiven: bool,
  },
);
const lesson = shape(
  {
    index: (v) => integer(v) && (v as number) < missions.length,
    status: one("active", "won", "lost"),
    progress: num,
    target: cell,
  },
  {
    nextArrival: timer,
    arrivals: integer,
    deployed: bool,
    noticeUntil: timer,
    clearAt: timer,
  },
);
const battle = shape(
  {
    cells: field(
      shape(
        {
          id: cell,
          q: integer,
          r: integer,
          x: num,
          y: num,
          height: num,
          terrain: one("plain", "forest", "rock", "water", "ford"),
        },
        { place: one("fort", "village", "tower", "camp") },
      ),
    ),
    squads: array(squad),
    time: num,
  },
  {
    outpost,
    lesson,
    raid,
    raids: array(raid),
    fronts: array(
      shape({ troop: squad, home: cell, target: str, rethink: timer }),
    ),
    sectors: array(
      shape({
        id: str,
        name: str,
        cell,
        control: num,
        owner: one("ally", "enemy", "neutral"),
        allies: num,
        enemies: num,
      }),
    ),
    sectorCells: field(integer),
    pressure: field(shape({ ally: num, enemy: num })),
    controlClock: num,
    bases: shape({ allyReady: timer, enemyReady: timer, sequence: integer }),
    fallen: array(
      shape(
        { x: num, y: num, time: num, units: troops },
        { side: one("ally") },
      ),
    ),
    strikes: array(
      shape(
        { x: num, y: num, tx: num, ty: num, time: num, enemy: bool },
        { volley: bool },
      ),
    ),
  },
);
export function validReport(v: unknown): boolean {
  if (
    !shape(
      {
        game: one("marches"),
        version: one(1),
        savedAt: (v) => str(v) && Number.isFinite(Date.parse(v as string)),
        scenario: one("campaign", "outpost", "fronts", "village"),
        missionIndex: (v) => integer(v) && (v as number) < missions.length,
        battle,
      },
      { image: str, note: str },
    )(v) ||
    !obj(v) ||
    !obj(v.battle)
  )
    return false;
  const b = v.battle;
  const cells = b.cells as { id: number; q: number; r: number }[];
  if (
    !cells.every(
      (c, i) => c.id === i && c.q === i % COLS && c.r === Math.floor(i / COLS),
    )
  )
    return false;
  if ((v.scenario === "outpost" || v.scenario === "campaign") && !b.outpost)
    return false;
  if (
    v.scenario === "campaign" &&
    (!obj(b.lesson) || b.lesson.index !== v.missionIndex)
  )
    return false;
  if (v.scenario === "fronts") {
    if (
      !Array.isArray(b.fronts) ||
      !Array.isArray(b.sectors) ||
      !b.sectors.length ||
      !Array.isArray(b.sectorCells) ||
      !b.pressure ||
      !b.bases
    )
      return false;
    const count = b.sectors.length;
    if (!b.sectorCells.every((i) => i < count)) return false;
  }
  return true;
}
