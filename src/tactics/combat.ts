import type { Squad } from "./model";
import { specialMembers, specialSlots } from "./units";
export type TroopType = "shield" | "bow" | "horse";
export const troopNames: Record<TroopType, string> = {
  shield: "Lanceros",
  bow: "Arqueros",
  horse: "Caballería",
};
export const troopTypes: TroopType[] = ["shield", "bow", "horse"];
// Rows attack columns. Advantage and resistance are reciprocal and composition-weighted.
export const damageTable: Record<TroopType, Record<TroopType, number>> = {
  shield: { shield: 1, bow: 0.65, horse: 1.5 },
  bow: { shield: 1.5, bow: 1, horse: 0.65 },
  horse: { shield: 0.65, bow: 1.5, horse: 1 },
};
export function matchup(
  attackers: TroopType[],
  defenders: TroopType[],
): number {
  if (!attackers.length || !defenders.length) return 0;
  return (
    attackers.reduce(
      (sum, a) =>
        sum +
        defenders.reduce((v, d) => v + damageTable[a][d], 0) / defenders.length,
      0,
    ) / attackers.length
  );
}
// Per level of height (15 m) between attacker and target. Archers gain the
// most from shooting down; cavalry loses its charge uphill.
export const heightTable: Record<TroopType, { down: number; up: number }> = {
  shield: { down: 0.1, up: 0 },
  bow: { down: 0.25, up: -0.2 },
  horse: { down: 0.1, up: -0.2 },
};
// rise: attacker levels above the target; negative attacks uphill.
export function heightBonus(attackers: TroopType[], rise: number): number {
  if (!attackers.length || !rise) return 1;
  return (
    attackers.reduce(
      (sum, a) =>
        sum +
        Math.max(
          0.4,
          1 +
            Math.abs(rise) *
              (rise > 0 ? heightTable[a].down : heightTable[a].up),
        ),
      0,
    ) / attackers.length
  );
}
// Formation slots, seen with the squad facing right:
//   3 0    back-left   front-left     (left flank: 0, 3)
//   4 1    back-centre front-centre
//   5 2    back-right  front-right    (right flank: 2, 5)
export type Zone = "front" | "left" | "right" | "rear";
export const zoneSlots: Record<Zone, number[]> = {
  front: [0, 1, 2],
  rear: [3, 4, 5],
  left: [0, 3],
  right: [2, 5],
};
export const isFront = (slot: number) => slot < 3;
// Preferred free slot for a new member: lancers hold the front centre,
// riders the flanks, archers shoot from behind.
const slotOrder: Record<TroopType, number[]> = {
  shield: [1, 0, 2, 4, 3, 5],
  horse: [0, 2, 3, 5, 1, 4],
  bow: [4, 3, 5, 1, 0, 2],
};
export function preferredSlot(type: TroopType, taken: number[]): number {
  return slotOrder[type].find((slot) => !taken.includes(slot)) ?? -1;
}
// Slot of each member. Formations are automatic: lancers pick first, then
// riders, then archers. Enemy waves may still carry an explicit layout.
const pickOrder: Record<TroopType, number> = { shield: 0, horse: 1, bow: 2 };
export function slotsOf(
  s: Pick<Squad, "members" | "layout" | "special">,
): number[] {
  if (s.layout && s.layout.length === s.members.length) return s.layout;
  const taken: number[] = [];
  const slots = Array<number>(s.members.length);
  // A special unit takes its row first (see units.ts).
  const special = specialMembers(s);
  for (const i of special) {
    slots[i] = specialSlots(s.special!).find((x) => !taken.includes(x)) ?? -1;
    taken.push(slots[i]);
  }
  const order = s.members
    .map((m, i) => [m, i] as const)
    .filter(([, i]) => !special.includes(i))
    .sort((a, c) => pickOrder[a[0]] - pickOrder[c[0]]);
  for (const [m, i] of order) {
    slots[i] = preferredSlot(m, taken);
    taken.push(slots[i]);
  }
  return slots;
}
// Which side of the defender an attack lands on, given the attacker position.
export function zoneFrom(
  facing: number,
  from: { x: number; y: number },
  at: { x: number; y: number },
): Zone {
  const a = Math.atan2(from.y - at.y, from.x - at.x) - facing,
    rel = Math.atan2(Math.sin(a), Math.cos(a));
  if (Math.abs(rel) <= Math.PI / 3) return "front";
  if (Math.abs(rel) >= (Math.PI * 2) / 3) return "rear";
  return rel > 0 ? "right" : "left";
}
// Melee fights best in front; archers shoot best from behind.
export const slotWeight = (type: TroopType, slot: number) =>
  type === "bow" ? (isFront(slot) ? 0.7 : 1) : isFront(slot) ? 1 : 0.85;
// Members a blow from this zone reaches; an empty zone leaves the whole
// squad exposed.
export function struck(s: Squad, zone: Zone) {
  const slots = slotsOf(s),
    hit = s.members.filter((_, i) => zoneSlots[zone].includes(slots[i]));
  return hit.length
    ? { members: hit, exposed: false }
    : { members: s.members, exposed: true };
}
export function attackDamage(
  source: Squad,
  target: Squad,
  base = 6,
  rise = 0,
  zone: Zone = "front",
) {
  const slots = slotsOf(source),
    hit = struck(target, zone);
  let weight = 0,
    sum = 0;
  source.members.forEach((m, i) => {
    const w = slotWeight(m, slots[i]);
    weight += w;
    sum += w * matchup([m], hit.members);
  });
  if (!weight) return 0;
  return (
    base *
    (weight / 6) *
    (sum / weight) *
    heightBonus(source.members, rise) *
    (hit.exposed ? 1.25 : 1)
  );
}
export function composition(s: Squad) {
  return troopTypes
    .filter((t) => s.members.includes(t))
    .map(
      (t) =>
        `${s.members.filter((m) => m === t).length} ${troopNames[t].toLowerCase()}`,
    )
    .join(" · ");
}
