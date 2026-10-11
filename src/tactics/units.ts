import type { TroopType } from "./combat";
import type { Squad } from "./model";
// Special units take several places in a squad, and their size is their
// life: every time the squad breaks they lose one place. A hero is born
// from a veteran squad's commander; knights and the scorpion come with the
// spoils; the war wagon comes from holding land.
export type SpecialKind = "hero" | "knights" | "scorpion" | "wagon";
export type Special = {
  kind: SpecialKind;
  // The troop it fights as, in the matchup and the formation.
  type: TroopType;
  // Places it still takes (its life).
  size: number;
  // Heroes have a name of their own.
  name?: string;
};
export const specials: Record<
  SpecialKind,
  { name: string; type: TroopType; size: number; text: string }
> = {
  hero: {
    name: "Héroe",
    type: "shield",
    size: 2,
    text: "Golpea como dos y anima a los escuadrones vecinos",
  },
  knights: {
    name: "Caballeros",
    type: "horse",
    size: 3,
    text: "Fila delantera: golpean fuerte, temen a los lanceros",
  },
  scorpion: {
    name: "Escorpión",
    type: "bow",
    size: 3,
    text: "Fila trasera: dispara a tres casillas, flojo de cerca",
  },
  wagon: {
    name: "Carreta fortificada",
    type: "shield",
    size: 6,
    text: "Muy lenta y muy dura; detenida, sostiene tierra como una torre",
  },
};
export const specialKinds = Object.keys(specials) as SpecialKind[];
export const isSpecial = (item: string): item is SpecialKind =>
  item in specials;
// The members a special takes: the first `size` of its type.
export function specialMembers(s: Pick<Squad, "members" | "special">) {
  const sp = s.special;
  if (!sp) return [];
  return s.members
    .flatMap((m, i) => (m === sp.type ? [i] : []))
    .slice(0, sp.size);
}
// Formation places a special prefers: knights the front row, the scorpion
// the back row, a hero its troop's row, the wagon everything.
export function specialSlots(sp: Special): number[] {
  if (sp.kind === "knights") return [1, 0, 2, 4, 3, 5];
  if (sp.kind === "scorpion") return [4, 3, 5, 1, 0, 2];
  if (sp.kind === "wagon") return [1, 0, 2, 4, 3, 5];
  return sp.type === "bow" ? [4, 3, 5, 1, 0, 2] : [1, 0, 2, 4, 3, 5];
}
export const heroNames = [
  "Irene",
  "Bastián",
  "Mencía",
  "Aldo",
  "Elvira",
  "Rodrigo",
  "Urraca",
  "Nuño",
];

// ── Tactical actions ───────────────────────────────────────────────────
// Every action gives something and costs mobility, time or exposure.
export type Stance = "hold" | "wall" | "charge" | "skirmish";
export const stances: Record<
  Stance,
  { name: string; gain: string; cost: string; needs?: TroopType }
> = {
  hold: {
    name: "Mantener terreno",
    gain: "Atrincherado (3 s): −30 % de daño de frente y gana tierra al clan",
    cost: "No se mueve; por el flanco no le sirve",
  },
  wall: {
    name: "Muro de escudos",
    gain: "−50 % de daño de frente",
    cost: "Marcha a la mitad y las flechas le hacen +30 %",
    needs: "shield",
  },
  charge: {
    name: "Cargar",
    gain: "El primer golpe cuerpo a cuerpo hace el doble",
    cost: "Después queda agotado 6 s (−40 % de daño)",
    needs: "horse",
  },
  skirmish: {
    name: "Hostigar",
    gain: "Retrocede para seguir disparando cuando se le acercan",
    cost: "Sus andanadas hacen −20 %",
    needs: "bow",
  },
};
export const stanceList = Object.keys(stances) as Stance[];
// The actions a squad can take, by the troops it has.
export const stancesFor = (s: Squad) =>
  stanceList.filter((k) => {
    const needs = stances[k].needs;
    return !needs || s.members.includes(needs);
  });
// Seconds a squad takes to dig in.
export const ENTRENCH = 3;
// How long a squad stays spent after a charge.
export const TIRED = 6;
