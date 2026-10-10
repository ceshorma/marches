import type { Battle, Squad } from "./model";
// The chronicle: your squads have names and colours, and what they do
// reaches the bottom of the screen as news from the march. Lines are picked
// in turn from several per event, so they do not repeat back to back.

// Squad names, each with its own pennant colour (never the clan's red).
export const squadNames: { name: string; color: number }[] = [
  { name: "Halcón", color: 0xd9a441 },
  { name: "Tortuga", color: 0x5f9e6e },
  { name: "Garza", color: 0x4fa3a5 },
  { name: "Lobo", color: 0x8a8fa8 },
  { name: "Ciervo", color: 0x9a73b5 },
  { name: "Oso", color: 0x9c7a55 },
  { name: "Zorro", color: 0xd98a3b },
  { name: "Búho", color: 0x6f86c4 },
];
export const squadColor = (name: string) =>
  squadNames.find((n) => n.name === name)?.color;
// A free name for a new squad: the next in turn that no squad carries.
export function nameSquad(b: Battle): string {
  const o = b.outpost!,
    used = new Set(b.squads.map((s) => s.name)),
    start = o.serial - 1;
  for (let k = 0; k < squadNames.length; k++) {
    const n = squadNames[(start + k) % squadNames.length].name;
    if (!used.has(n)) return n;
  }
  return `Escuadrón ${o.serial}`;
}
// A squad that destroys this many raids is a veteran: it hits a little harder.
export const VETERAN = 2;
export const veteran = (s: Squad) => (s.feats ?? 0) >= VETERAN;

export type News = {
  time: number;
  text: string;
  tone: "good" | "bad" | "info";
  // The squad the news is about, drawn in its colour.
  who?: string;
};
// How many lines the chronicle keeps.
const KEEP = 6;
// Quiet stretches get a line of everyday life every so often.
export const QUIET = 40;
const lines = {
  formed: [
    "Se forma el escuadrón {s}.",
    "{s} levanta su estandarte junto al cuartel.",
    "Nace el escuadrón {s}: aún no ha visto al clan.",
  ],
  joined: [
    "Un {t} se une a {s}.",
    "{s} suma un {t} a sus filas.",
    "Un {t} pide un sitio en {s}.",
  ],
  destroyed: [
    "{s} destruye una incursión de {e}.",
    "{s} entrega un prisionero de guerra.",
    "{s} vuelve con las armas del clan.",
    "Cantan en la aldea: {s} rompió a los {e}.",
  ],
  // Why it was won, when one reason stands out.
  fromAbove: [
    "{s} ganó desde la loma.",
    "Desde lo alto, {s} rompió a los {e}.",
    "Los {e} subieron la cuesta; {s} los esperaba arriba.",
  ],
  flank: [
    "{s} los cogió por el flanco.",
    "{s} cayó sobre el costado de los {e}.",
  ],
  arrows: [
    "Las flechas de {s} los rompieron antes de llegar.",
    "Los {e} no llegaron a tocar a {s}.",
  ],
  rival: [
    "{s} supo a quién enfrentar: los {e} no tenían respuesta.",
    "Los {e} se toparon con el rival que temían: {s}.",
  ],
  veteran: [
    "Los de {s} están orgullosos de su comandante.",
    "{s} ya es un escuadrón veterano.",
    "Ya nadie llama novatos a los de {s}.",
  ],
  broke: [
    "{s} se repliega: ha perdido un {t}.",
    "{s} cede terreno y deja un caído.",
    "Un {t} de {s} no volverá a casa.",
  ],
  wiped: [
    "No queda nadie del escuadrón {s}.",
    "El escuadrón {s} ha caído entero.",
    "Su estandarte quedó en el campo: {s} ya no existe.",
  ],
  tower: [
    "{s} termina la torre y queda libre.",
    "Se alza una torre. {s} deja el andamio.",
  ],
  towerLost: [
    "Cae una torre. El humo se ve desde el cuartel.",
    "El clan derriba una torre.",
  ],
  raid: [
    "Sale una incursión de {e} hacia {g}.",
    "Humo en el campamento: {e} marchan hacia {g}.",
    "Los vigías avisan: {e} van a por {g}.",
  ],
  scout: [
    "Un explorador del clan merodea por el este.",
    "Se ve a un explorador del clan, solo y sin prisa.",
  ],
  arrival: [
    "Llega un {t} de la aldea.",
    "Un {t} se presenta en el cuartel.",
    "La tierra da otro {t}.",
  ],
  spoils: [
    "Un {t} toma las armas que dejó el clan.",
    "Con el botín se arma un {t}.",
  ],
  turnedAway: [
    "Un {t} se marcha: el cuartel está lleno.",
    "No hay sitio en el cuartel; un {t} vuelve a su casa.",
  ],
  camp: [
    "El campamento del clan arde.",
    "Cae el campamento: el humo ya no es suyo.",
  ],
  quiet: [
    "En la aldea se celebra la cosecha.",
    "Los vigías no ven humo en el horizonte.",
    "Huele a pan en el cuartel.",
    "Un pastor cuenta que el clan teme a las torres.",
    "Llueve un poco; nadie se queja.",
    "Se reparan las lanzas a la luz del fuego.",
  ],
} satisfies Record<string, string[]>;
export type NewsEvent = keyof typeof lines;
const tones: Partial<Record<NewsEvent, News["tone"]>> = {
  destroyed: "good",
  fromAbove: "good",
  flank: "good",
  arrows: "good",
  rival: "good",
  veteran: "good",
  tower: "good",
  camp: "good",
  spoils: "good",
  broke: "bad",
  wiped: "bad",
  towerLost: "bad",
  raid: "bad",
  turnedAway: "bad",
};
// Adds a line of news. `s` is the squad's name, `t` a troop, `e` the enemy
// and `g` where they are going.
export function news(
  b: Battle,
  event: NewsEvent,
  vars: { s?: string; t?: string; e?: string; g?: string } = {},
) {
  const o = b.outpost;
  if (!o) return;
  const count = (o.newsCount ??= {});
  const n = count[event] ?? 0;
  count[event] = n + 1;
  const options = lines[event];
  const text = options[n % options.length].replace(
    /\{(\w)\}/g,
    (_, k: keyof typeof vars) => vars[k] ?? "",
  );
  o.news = [
    ...(o.news ?? []),
    { time: b.time, text, tone: tones[event] ?? "info", who: vars.s },
  ].slice(-KEEP);
}
// Everyday life while nothing happens, once you hold some land.
export function quietNews(b: Battle) {
  const o = b.outpost;
  if (!o || !b.squads.length) return;
  const last = o.news?.at(-1)?.time ?? 0;
  if (b.time - last >= QUIET) news(b, "quiet");
}
// Plural names of the enemy's troops, for the news.
export const enemyNames = {
  shield: "lanceros",
  bow: "arqueros",
  horse: "jinetes",
} as const;
export const troopName = {
  shield: "lancero",
  bow: "arquero",
  horse: "jinete",
} as const;
