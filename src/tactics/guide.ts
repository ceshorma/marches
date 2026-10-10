import { heightBonus, matchup, struck, zoneFrom } from "./combat";
import type { TroopType } from "./combat";
import { campSupported, deploymentError, towerError } from "./outpost";
import type { Item } from "./outpost";
import {
  activeRaids,
  adjacent,
  allTroops,
  DX,
  rise,
  squadPosition,
} from "./model";
import type { Battle, Squad } from "./model";
// Interaction signals: no words on the map. The board answers what the player
// does (selecting, hovering) and what just happened with marks on cells and
// readings on troops, derived only from the current state.
export type Tone = "go" | "danger" | "good";
export type Mark = { cell: number; tone: Tone; style: "pulse" | "ghost" };
// Advantage of the selected squad against a troop (or of a clash).
export type Reading = { id: string; tone: "good" | "danger" };
const total = (r: Record<TroopType, number>) =>
  Object.values(r).reduce((a, c) => a + c, 0);
// How a strike from `a` at `t` would go, from where they stand now.
export function edge(b: Battle, a: Squad, t: Squad): number {
  const p = squadPosition(b, a),
    q = squadPosition(b, t);
  return (
    matchup(a.members, struck(t, zoneFrom(t.facing, p, q)).members) *
    heightBonus(a.members, rise(b, a, t))
  );
}
// Why a strike from `a` at `t` goes well, read after the fact: the troop
// that beats whoever it hits, the higher ground, a blow on the flank or rear
// (harder still when that side is empty).
export type Reasons = {
  troop?: TroopType;
  height: boolean;
  side?: "flank" | "rear";
  exposed: boolean;
};
export function reasons(b: Battle, a: Squad, t: Squad): Reasons {
  const p = squadPosition(b, a),
    q = squadPosition(b, t),
    zone = zoneFrom(t.facing, p, q),
    hit = struck(t, zone);
  const best = [...new Set(a.members)]
    .map((type) => [type, matchup([type], hit.members)] as const)
    .sort((x, y) => y[1] - x[1])[0];
  return {
    troop: best && best[1] > 1.1 ? best[0] : undefined,
    height: heightBonus(a.members, rise(b, a, t)) > 1.05,
    side: zone === "front" ? undefined : zone === "rear" ? "rear" : "flank",
    exposed: hit.exposed,
  };
}
// How near (world units, about three cells) an enemy must be to be read.
export const READ_RANGE = DX * 3.2;
const tone = (value: number) =>
  value > 1.1 ? "good" : value < 0.9 ? "danger" : null;
// Who has the upper hand in a fight between one of yours and a foe.
export const clash = (b: Battle, ally: Squad, foe: Squad) =>
  tone(edge(b, ally, foe) / edge(b, foe, ally));
export function guide(
  b: Battle,
  ui: { selected: string | null; held: Item | null },
): { marks: Mark[]; readings: Reading[]; yard: boolean } {
  const o = b.outpost,
    marks: Mark[] = [],
    readings: Reading[] = [];
  // Deploying always starts at the yard: when it is the next step, it pulses.
  let yard = false;
  if (!o) return { marks, readings, yard };
  const raids = activeRaids(b).filter((r) => r.phase !== "retreat");
  const selected = b.squads.find((u) => u.id === ui.selected);

  // Readings: select a squad and enemies close by show whether you beat
  // them. Only close by: from afar you have to work it out yourself.
  if (selected)
    for (const r of raids) {
      const p = squadPosition(b, selected),
        q = squadPosition(b, r.troop);
      if (Math.hypot(p.x - q.x, p.y - q.y) > READ_RANGE) continue;
      const t = tone(edge(b, selected, r.troop) / edge(b, r.troop, selected));
      if (t) readings.push({ id: r.troop.id, tone: t });
    }
  for (const u of b.squads) {
    const foe = u.engaged
      ? allTroops(b).find((t) => t.id === u.engaged)
      : undefined;
    if (!foe) continue;
    const t = clash(b, u, foe);
    if (t) readings.push({ id: u.id, tone: t });
  }

  // Danger: the cell each raid is heading for, faster while being sacked.
  for (const r of raids) {
    if (r.target === undefined || r.guard) continue;
    const guarded = b.squads.some(
      (u) =>
        !u.routing &&
        (u.cell === r.target || adjacent(r.target!).includes(u.cell)),
    );
    if (r.phase === "loot" || !guarded)
      marks.push({ cell: r.target, tone: "danger", style: "pulse" });
  }
  // What just happened.
  if (o.noticeAt !== undefined && b.time < o.noticeUntil)
    marks.push({
      cell: o.noticeAt,
      tone: o.noticeTone === "danger" ? "danger" : "good",
      style: "pulse",
    });
  for (const s of o.sites)
    if (
      !s.active &&
      s.progress > 0 &&
      !b.squads.some((u) => u.cell === s.cell && !u.path.length)
    )
      marks.push({ cell: s.cell, tone: "danger", style: "pulse" });

  // The next step, only when nothing is under attack.
  // A tower in hand: the mission's suggested spots show its silhouette.
  if (ui.held === "tower")
    for (const id of o.suggested ?? [])
      if (!towerError(b, id))
        marks.push({ cell: id, tone: "go", style: "ghost" });
  // With something in hand the board shows where it can go instead.
  if (raids.length || ui.held) return { marks, readings, yard };
  const reserve = total(o.reserve);
  const deployNear = (anchor: number) =>
    adjacent(anchor)
      .filter(
        (id) => !deploymentError(b, id) && !b.squads.some((u) => u.cell === id),
      )
      .sort((a, c) => b.cells[c].x - b.cells[a].x);
  const heading = (id: number) =>
    b.squads.some((u) => u.cell === id || u.path.at(-1) === id);
  const pending = o.sites.filter((s) => !s.active);
  const fresh = o.sites.find(
    (s) =>
      s.active &&
      s.builtAt !== null &&
      s.builtAt > 0 &&
      b.time - s.builtAt < 10,
  );
  if ((!b.squads.length || fresh) && reserve > 0 && deployNear(o.fort).length)
    yard = true;
  else if (o.camp && !o.camp.taken && campSupported(b)) {
    if (!heading(o.camp.cell))
      marks.push({ cell: o.camp.cell, tone: "go", style: "pulse" });
  } else if (pending.length && !pending.some((s) => heading(s.cell))) {
    if (selected && !selected.routing) {
      const at = b.cells[selected.cell];
      const site = pending
        .slice()
        .sort(
          (a, c) =>
            Math.hypot(b.cells[a.cell].x - at.x, b.cells[a.cell].y - at.y) -
            Math.hypot(b.cells[c.cell].x - at.x, b.cells[c.cell].y - at.y),
        )[0];
      marks.push({ cell: site.cell, tone: "go", style: "ghost" });
    } else {
      const idle = b.squads.find((u) => !u.path.length && !u.routing);
      if (idle) marks.push({ cell: idle.cell, tone: "go", style: "pulse" });
    }
  } else if (!pending.length && (o.kits ?? 0) > 0 && b.squads.length)
    // A tower waits in the tray: placing it is the next step.
    yard = true;
  return { marks, readings, yard };
}
