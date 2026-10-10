import { adjacent } from "./model";
import type { Cell } from "./model";
// Map templates: each one is laid out to suggest a way of fighting. The fort
// stays at (3, 8) in the west; the enemy comes in from the eastern edge.
const COLS = 18,
  ROWS = 12;
const cell = (q: number, r: number) => r * COLS + q;
export type MapName =
  "llanura" | "paso" | "rio" | "meseta" | "bosque" | "valles";
export type MapTemplate = {
  name: string;
  // The tactic the map invites, in a few words.
  idea: string;
  // Suggested tower spots and enemy entry points (camps).
  sites: number[];
  entries: number[];
  // Paints terrain and height on a blank, flat map.
  paint?: (at: (q: number, r: number) => Cell) => void;
};
const each = (f: (q: number, r: number) => void) => {
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) f(q, r);
};
// Distance in cells between two offset coordinates (odd rows shifted right).
const apart = (q1: number, r1: number, q2: number, r2: number) =>
  Math.hypot(q1 + (r1 % 2) * 0.5 - q2 - (r2 % 2) * 0.5, (r1 - r2) * 0.866);
export const maps: Record<MapName, MapTemplate> = {
  llanura: {
    name: "Llanura",
    idea: "Una loma al norte y una línea de rocas: el mapa de siempre.",
    sites: [cell(7, 8), cell(9, 5), cell(11, 9)],
    entries: [cell(16, 8)],
  },
  paso: {
    name: "El paso",
    idea: "Una cordillera con un único paso: pocos lanceros lo sostienen.",
    sites: [cell(7, 8), cell(8, 5), cell(13, 8)],
    entries: [cell(16, 8), cell(16, 11)],
    paint: (at) => {
      each((q, r) => {
        // The ridge, two cells thick, open only at rows 7–8.
        if ((q === 10 || q === 11) && r !== 7 && r !== 8)
          at(q, r).terrain = "rock";
        // High ground on both sides overlooks the pass.
        const d = Math.min(apart(q, r, 8, 5), apart(q, r, 13, 5));
        if (d < 1.2) at(q, r).height = 30;
        else if (d < 2.4) at(q, r).height = 15;
      });
    },
  },
  rio: {
    name: "El río",
    idea: "Un río que solo se cruza por dos vados: se defienden los cruces.",
    sites: [cell(7, 8), cell(7, 3), cell(12, 6)],
    entries: [cell(16, 8), cell(15, 0)],
    paint: (at) => {
      each((q, r) => {
        const river = 9 + (r % 4 < 2 ? 0 : 1);
        if (q === river)
          at(q, r).terrain = r === 2 || r === 8 ? "ford" : "water";
        // A little bank of woods upstream.
        if ((q === 11 || q === 12) && r >= 1 && r <= 3)
          at(q, r).terrain = "forest";
      });
    },
  },
  meseta: {
    name: "La meseta",
    idea: "Una meseta en el centro: quien tiene la altura gana a los arqueros.",
    sites: [cell(9, 6), cell(6, 9), cell(13, 9)],
    entries: [cell(16, 8), cell(15, 0), cell(16, 11)],
    paint: (at) => {
      each((q, r) => {
        const d = apart(q, r, 9, 6);
        if (d < 1.6) at(q, r).height = 30;
        else if (d < 2.8) {
          at(q, r).height = 15;
          // Cliffs on the north and south faces; ramps east and west.
          if (Math.abs(r - 6) >= 2 && d > 2.1 && r !== 8)
            at(q, r).terrain = "rock";
        }
      });
    },
  },
  bosque: {
    name: "El bosque",
    idea: "Un bosque cerrado al norte: el flanco por donde no se les ve venir.",
    sites: [cell(7, 8), cell(10, 6), cell(13, 9)],
    entries: [cell(16, 8), cell(15, 0)],
    paint: (at) => {
      each((q, r) => {
        const clearing = apart(q, r, 11, 2) < 1.1;
        if (r >= 0 && r <= 5 && q >= 5 && !clearing)
          at(q, r).terrain = "forest";
      });
    },
  },
  valles: {
    name: "Dos valles",
    idea: "Una sierra parte el mapa en dos valles: hay que repartir la defensa.",
    sites: [cell(8, 3), cell(8, 10), cell(12, 2)],
    entries: [cell(16, 2), cell(16, 10)],
    paint: (at) => {
      each((q, r) => {
        if (q >= 6 && (r === 5 || (r === 6 && q >= 8)))
          at(q, r).terrain = "rock";
        if (q >= 7 && (r === 4 || r === 7)) at(q, r).height = 15;
      });
    },
  },
};
export const mapNames = Object.keys(maps) as MapName[];
// Lays a template over a battle's cells (the plain map keeps its own).
export function applyMap(cells: Cell[], name: MapName, fort: number) {
  const t = maps[name];
  if (!t.paint) return;
  for (const c of cells) {
    c.terrain = "plain";
    c.height = 0;
  }
  t.paint((q, r) => cells[cell(q, r)]);
  // The fort, its ring, the suggested sites and the entries stay open.
  for (const id of [fort, ...adjacent(fort), ...t.sites, ...t.entries]) {
    cells[id].terrain = "plain";
  }
}
