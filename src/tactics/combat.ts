import type { Squad } from "./model";
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
export function attackDamage(source: Squad, target: Squad, base = 6) {
  return (
    base * (source.members.length / 6) * matchup(source.members, target.members)
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
