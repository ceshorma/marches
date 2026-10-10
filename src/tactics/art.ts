import type { Graphics } from "pixi.js";
// Map art: a campaign map seen from above. Flat colours from one palette, a
// soft warm ink outline and a light shadow under anything that stands up.
// Every function draws around (x, y) at a scale where 1 = one hex of R 42.
export const P = {
  ink: 0x5a5244,
  shadow: 0x2f2a22,
  paper: 0xf3efe2,
  stone: 0xcbc5b1,
  stoneLight: 0xe4dfcd,
  stoneDark: 0x9f9884,
  wood: 0x8a6a45,
  woodDark: 0x6a5035,
  roof: 0xa65d3f,
  roofDark: 0x87482f,
  thatch: 0xcaa463,
  thatchDark: 0xa98546,
  wall: 0xeee4cc,
  wheat: 0xd9bb6c,
  crop: 0xaab97c,
  soil: 0xb79a6c,
  leaf: 0x7b9668,
  leafDark: 0x5f7a52,
  leafLight: 0xa8bb8c,
  pine: 0x5a7656,
  pineDark: 0x45603f,
  ally: 0x326f97,
  enemy: 0xb4544b,
  enemyDark: 0x8b3a33,
  // Clan del Humo: soot cloth, ash-white smoke, an ember at its root.
  soot: 0x4a423e,
  sootDark: 0x342e2b,
  ashLight: 0xd8d1c4,
  tent: 0xc79a82,
  tentDark: 0xa57461,
  flame: 0xe0682f,
  flameLight: 0xf2b33d,
  smoke: 0x6b6a63,
  ash: 0x4a4038,
};
// Deterministic jitter from a seed, in [0, 1).
export const rnd = (seed: number, k = 0) => {
  const v = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const line = (alpha = 1, width = 1.2) => ({
  color: P.ink,
  width,
  alpha: 0.75 * alpha,
});
export function shadow(
  g: Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha = 1,
) {
  g.ellipse(x + rx * 0.18, y + ry * 0.35, rx, ry).fill({
    color: P.shadow,
    alpha: 0.13 * alpha,
  });
}
function banner(
  g: Graphics,
  x: number,
  y: number,
  h: number,
  color: number,
  alpha = 1,
) {
  g.moveTo(x, y)
    .lineTo(x, y - h)
    .stroke({ color: P.woodDark, width: 1.6, alpha });
  g.poly([
    x,
    y - h,
    x + 13,
    y - h + 3,
    x + 9,
    y - h + 6,
    x + 13,
    y - h + 9,
    x,
    y - h + 10,
  ])
    .fill({ color, alpha })
    .stroke(line(alpha, 0.8));
}
// The Clan del Humo's standard: soot cloth with a curl of smoke rising
// from an ember. Long and ragged, unlike the neat pennants of the march.
export function clanBanner(
  g: Graphics,
  x: number,
  y: number,
  h = 26,
  alpha = 1,
  t = 0,
) {
  g.moveTo(x, y)
    .lineTo(x, y - h)
    .stroke({ color: P.woodDark, width: 1.6, alpha });
  const wave = Math.sin(t * 2.4) * 1.5;
  g.poly([
    x,
    y - h,
    x + 12,
    y - h + 1 + wave,
    x + 11,
    y - h + 14 + wave,
    x + 8,
    y - h + 11,
    x + 5,
    y - h + 15,
    x,
    y - h + 12,
  ])
    .fill({ color: P.soot, alpha })
    .stroke(line(alpha, 0.8));
  g.moveTo(x + 5, y - h + 10)
    .quadraticCurveTo(x + 2.5, y - h + 7, x + 5.5, y - h + 5)
    .quadraticCurveTo(x + 8.5, y - h + 3, x + 6, y - h + 1.8)
    .stroke({ color: P.ashLight, width: 1.3, alpha, cap: "round" });
  g.circle(x + 5, y - h + 11, 1.4).fill({ color: P.flame, alpha });
}

// ── Nature ────────────────────────────────────────────────────────────────
export function tree(g: Graphics, x: number, y: number, s = 1, seed = 0) {
  const r = (9 + rnd(seed) * 3) * s;
  shadow(g, x + 2 * s, y + 2 * s, r * 1.05, r * 0.75);
  g.circle(x, y, r).fill(P.leafDark).stroke(line(0.6, 1));
  g.circle(x - r * 0.18, y - r * 0.2, r * 0.78).fill(P.leaf);
  g.circle(x - r * 0.38, y - r * 0.42, r * 0.36).fill({
    color: P.leafLight,
    alpha: 0.8,
  });
}
// A conifer from above: a star of needles around a dark centre.
export function pine(g: Graphics, x: number, y: number, s = 1, seed = 0) {
  const r = (10 + rnd(seed, 1) * 2) * s,
    points: number[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 + rnd(seed, 2),
      d = i % 2 ? r * 0.62 : r;
    points.push(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  shadow(g, x + 2 * s, y + 2 * s, r, r * 0.7);
  g.poly(points).fill(P.pineDark).stroke(line(0.6, 0.9));
  g.circle(x - r * 0.15, y - r * 0.15, r * 0.45).fill(P.pine);
}
export function forest(
  g: Graphics,
  x: number,
  y: number,
  seed: number,
  conifer = false,
) {
  const spots = [
    [-13, -6],
    [12, -9],
    [0, 8],
    [-6, 17],
    [16, 10],
  ];
  const count = 3 + Math.floor(rnd(seed, 3) * 3);
  spots
    .slice(0, count)
    .sort((a, c) => a[1] - c[1])
    .forEach(([dx, dy], i) => {
      const px = x + dx + (rnd(seed, i) - 0.5) * 6,
        py = y + dy + (rnd(seed, i + 9) - 0.5) * 5;
      if (conifer || rnd(seed, i + 4) < 0.3) pine(g, px, py, 0.95, seed + i);
      else tree(g, px, py, 1, seed + i);
    });
}
export function boulder(g: Graphics, x: number, y: number, s = 1, seed = 0) {
  const points: number[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7 + rnd(seed, i) * 0.4,
      d = (9 + rnd(seed, i + 7) * 4) * s;
    points.push(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8);
  }
  shadow(g, x + 2, y + 2, 12 * s, 7 * s);
  g.poly(points).fill(P.stone).stroke(line(0.8, 1));
  // Lit top facet and a dark flank.
  g.poly([
    points[8],
    points[9],
    points[10],
    points[11],
    points[12],
    points[13],
    x,
    y - 1 * s,
  ]).fill(P.stoneLight);
  g.poly([points[0], points[1], points[2], points[3], x, y + 2 * s]).fill({
    color: P.stoneDark,
    alpha: 0.7,
  });
}
export function rocks(g: Graphics, x: number, y: number, seed: number) {
  boulder(g, x - 12, y - 4, 1.05, seed);
  boulder(g, x + 11, y - 8, 0.85, seed + 3);
  boulder(g, x + 2, y + 10, 0.95, seed + 7);
  g.circle(x - 16, y + 12, 2.2).fill(P.stoneDark);
  g.circle(x + 18, y + 6, 1.6).fill(P.stoneDark);
}
export function grass(g: Graphics, x: number, y: number, seed = 0) {
  for (let i = 0; i < 3; i++) {
    const bx = x + (i - 1) * 4 + rnd(seed, i) * 2,
      lean = (i - 1) * 1.5;
    g.moveTo(bx, y + 4)
      .lineTo(bx + lean, y - 3 - (i % 2) * 3)
      .stroke({ color: 0x9fa47c, width: 1, alpha: 0.8 });
  }
}

// ── Settlement ────────────────────────────────────────────────────────────
// A field patch with furrows; variant picks wheat, green crop or tilled soil.
export function field(
  g: Graphics,
  x: number,
  y: number,
  variant: number,
  alpha = 1,
) {
  const tones = [
      [P.wheat, 0xe3c983],
      [P.crop, 0xc2cd96],
      [P.soil, 0xcdb487],
    ][variant % 3],
    tilt = variant % 2 ? -0.3 : 0.22,
    c = Math.cos(tilt),
    d = Math.sin(tilt),
    at = (a: number, b: number) => [x + a * c - b * d, y + a * d + b * c];
  // Two adjoining plots, each with thin crop rows along its length.
  const plot = (a0: number, a1: number, tone: number, across: boolean) => {
    g.poly([...at(a0, -8), ...at(a1, -8.5), ...at(a1, 8), ...at(a0, 8.5)]).fill(
      {
        color: tone,
        alpha: 0.7 * alpha,
      },
    );
    for (let k = 1; k < 5; k++) {
      const [ax, ay] = across
          ? at(a0 + 1, -8 + k * 3.3)
          : at(a0 + ((a1 - a0) * k) / 5, -7),
        [bx, by] = across
          ? at(a1 - 1, -8 + k * 3.3)
          : at(a0 + ((a1 - a0) * k) / 5, 7);
      g.moveTo(ax, ay)
        .lineTo(bx, by)
        .stroke({ color: P.woodDark, width: 0.6, alpha: 0.3 * alpha });
    }
  };
  plot(-17, 3, tones[0], true);
  plot(3, 15, tones[1], false);
}
// House variants from above: gabled cottage, long thatched barn, round hut.
export function house(g: Graphics, x: number, y: number, variant: number) {
  const v = variant % 3;
  if (v === 0) {
    shadow(g, x + 1.5, y + 1.5, 12, 8);
    g.rect(x - 10, y - 7, 20, 14)
      .fill(P.roof)
      .stroke(line(1, 1.1));
    g.rect(x - 10, y - 7, 20, 7).fill(P.roofDark);
    g.moveTo(x - 10, y)
      .lineTo(x + 10, y)
      .stroke(line(0.8, 1.1));
    g.rect(x + 4, y - 10, 3.5, 4)
      .fill(P.stoneDark)
      .stroke(line(0.8, 0.7));
  } else if (v === 1) {
    shadow(g, x + 1.5, y + 1.5, 16, 8);
    g.rect(x - 14, y - 6.5, 28, 13)
      .fill(P.thatch)
      .stroke(line(1, 1.1));
    g.rect(x - 14, y - 6.5, 28, 6.5).fill(P.thatchDark);
    g.moveTo(x - 14, y)
      .lineTo(x + 14, y)
      .stroke(line(0.8, 1.1));
    g.rect(x - 3, y + 6.5, 6, 2).fill(P.woodDark);
  } else {
    shadow(g, x + 1.5, y + 1.5, 10, 8);
    g.circle(x, y, 8.5).fill(P.thatch).stroke(line(1, 1.1));
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      g.moveTo(x, y)
        .lineTo(x + Math.cos(a) * 8.5, y + Math.sin(a) * 8.5)
        .stroke({ color: P.thatchDark, width: 0.9 });
    }
    g.circle(x, y, 2).fill(P.woodDark);
  }
}
export function fence(g: Graphics, x: number, y: number, w: number) {
  g.moveTo(x - w / 2, y)
    .lineTo(x + w / 2, y)
    .stroke({ color: P.wood, width: 1, alpha: 0.8 });
  for (let i = 0; i <= 4; i++)
    g.circle(x - w / 2 + (w * i) / 4, y, 1).fill(P.woodDark);
}
export function well(g: Graphics, x: number, y: number) {
  shadow(g, x, y, 4, 3);
  g.circle(x, y, 3.6).fill(P.stone).stroke(line(1, 0.9));
  g.circle(x, y, 1.8).fill(0x4f6d78);
}
// Everything a lived-in cell can show, faded in by how settled it is.
export function homestead(
  g: Graphics,
  x: number,
  y: number,
  seed: number,
  settled: number,
  fields: boolean,
  houseHere: boolean,
) {
  if (fields && settled > 0.25)
    field(
      g,
      x - 8,
      y + 9,
      Math.floor(rnd(seed, 5) * 3),
      Math.min(1, (settled - 0.25) * 1.6),
    );
  if (settled > 0.7 && houseHere) {
    house(g, x + 11, y - 9, Math.floor(rnd(seed, 6) * 3));
    if (rnd(seed, 7) < 0.4) fence(g, x + 11, y + 2, 16);
    else if (rnd(seed, 8) < 0.3) well(g, x - 4, y - 12);
  }
}
// Charred ground: an irregular burnt patch, black stubble and dying embers.
export function scorched(
  g: Graphics,
  x: number,
  y: number,
  k: number,
  seed = 0,
) {
  const points: number[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI * 2) / 9,
      d = 13 + rnd(seed, i) * 6;
    points.push(x - 4 + Math.cos(a) * d, y + 4 + Math.sin(a) * d * 0.6);
  }
  g.poly(points).fill({ color: P.ash, alpha: 0.3 * k });
  for (let j = 0; j < 7; j++) {
    const sx = x - 15 + j * 4.5 + rnd(seed, j + 3) * 2,
      sy = y + 2 + rnd(seed, j + 9) * 6;
    g.moveTo(sx, sy + 2)
      .lineTo(sx + 1, sy - 2)
      .stroke({ color: 0x2a2520, width: 1.2, alpha: 0.6 * k });
  }
  if (k > 0.6)
    for (let j = 0; j < 3; j++)
      g.circle(x - 10 + j * 8, y + 4 + rnd(seed, j) * 4, 1.2).fill({
        color: P.flame,
        alpha: (k - 0.6) * 2,
      });
}
// Flames (k = how fresh the fire is) and smoke drifting up; t is game time.
export function fire(g: Graphics, x: number, y: number, k: number, t: number) {
  for (let j = 0; j < 3; j++) {
    const fx = x - 9 + j * 9,
      h = (11 + (j % 2) * 5) * k + Math.sin(t * 13 + j * 2) * 2.5;
    g.moveTo(fx - 4.5, y + 6)
      .quadraticCurveTo(fx - 5, y + 6 - h * 0.6, fx, y + 6 - h)
      .quadraticCurveTo(fx + 5, y + 6 - h * 0.6, fx + 4.5, y + 6)
      .closePath()
      .fill({ color: P.flame, alpha: 0.95 * k });
    g.moveTo(fx - 2.2, y + 6)
      .quadraticCurveTo(fx - 2.5, y + 6 - h * 0.35, fx, y + 6 - h * 0.6)
      .quadraticCurveTo(fx + 2.5, y + 6 - h * 0.35, fx + 2.2, y + 6)
      .closePath()
      .fill({ color: P.flameLight, alpha: k });
  }
}
export function smoke(g: Graphics, x: number, y: number, age: number, k = 1) {
  for (let j = 0; j < 4; j++) {
    const p = (age * 0.55 + j / 4) % 1;
    g.circle(x + Math.sin(j * 2.1 + age) * 6, y - 8 - p * 40, 3.5 + p * 8).fill(
      {
        color: P.smoke,
        alpha: 0.32 * (1 - p) * k,
      },
    );
  }
}

// ── Buildings ─────────────────────────────────────────────────────────────
function crenels(g: Graphics, x: number, y: number, r: number, n: number) {
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n;
    g.rect(x + Math.cos(a) * r - 1.6, y + Math.sin(a) * r - 1.6, 3.2, 3.2).fill(
      P.stoneDark,
    );
  }
}
// The fort: curtain wall, four round towers, a keep and the gate to the east.
export function fort(g: Graphics, x: number, y: number, colour = P.ally) {
  shadow(g, x + 1, y + 2, 25, 19, 0.8);
  g.roundRect(x - 22, y - 20, 44, 40, 3)
    .fill(P.stone)
    .stroke(line(1, 1.6));
  g.roundRect(x - 16, y - 14, 32, 28, 2).fill(P.paper);
  g.rect(x - 16, y - 14, 32, 3).fill({ color: P.stoneDark, alpha: 0.35 });
  // Gate.
  g.rect(x + 18, y - 5, 6, 10)
    .fill(P.woodDark)
    .stroke(line(1, 0.8));
  // Keep.
  g.rect(x - 9, y - 9, 16, 16)
    .fill(P.stoneLight)
    .stroke(line(1, 1.2));
  g.moveTo(x - 9, y - 9)
    .lineTo(x + 7, y + 7)
    .moveTo(x + 7, y - 9)
    .lineTo(x - 9, y + 7)
    .stroke({ color: P.stoneDark, width: 0.9, alpha: 0.7 });
  for (const [dx, dy] of [
    [-22, -20],
    [22, -20],
    [-22, 20],
    [22, 20],
  ]) {
    g.circle(x + dx, y + dy, 6.5)
      .fill(P.stoneLight)
      .stroke(line(1, 1.2));
    crenels(g, x + dx, y + dy, 4.4, 6);
  }
  banner(g, x - 1, y - 1, 26, colour);
}
// A round watchtower: notched parapet, inner floor, banner.
export function tower(
  g: Graphics,
  x: number,
  y: number,
  colour = P.ally,
  alpha = 1,
) {
  shadow(g, x + 2, y + 3, 15, 10, alpha);
  g.circle(x, y, 13).fill({ color: P.stone, alpha }).stroke(line(alpha, 1.4));
  g.circle(x, y, 8.5)
    .fill({ color: P.stoneLight, alpha })
    .stroke(line(alpha * 0.6, 0.9));
  // Embrasures cut the parapet into merlons.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    g.moveTo(x + Math.cos(a) * 8.5, y + Math.sin(a) * 8.5)
      .lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13)
      .stroke({ color: P.stoneDark, width: 2.2, alpha });
  }
  g.circle(x, y, 2.6).fill({ color: P.woodDark, alpha });
  banner(g, x, y - 2, 25, colour, alpha);
}
// A tower going up: stone ring rising with progress, wooden scaffold around.
export function scaffold(g: Graphics, x: number, y: number, progress: number) {
  g.circle(x, y, 12).stroke({ color: P.stoneDark, width: 1, alpha: 0.5 });
  g.moveTo(x, y - 12)
    .arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
    .stroke({ color: P.stone, width: 6 });
  for (const [a, b] of [
    [-15, -15],
    [15, -15],
    [-15, 15],
    [15, 15],
  ]) {
    g.moveTo(x + a, y + b)
      .lineTo(x + a * 0.55, y + b * 0.55)
      .stroke({ color: P.wood, width: 2 });
    g.circle(x + a, y + b, 1.6).fill(P.woodDark);
  }
  g.moveTo(x - 15, y - 15)
    .lineTo(x + 15, y - 15)
    .moveTo(x - 15, y + 15)
    .lineTo(x + 15, y + 15)
    .stroke({ color: P.wood, width: 1.2, alpha: 0.8 });
}
// An empty emplacement: a ring of marker stones and a stake with a pennant.
export function emplacement(
  g: Graphics,
  x: number,
  y: number,
  colour = P.ally,
) {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.circle(x + Math.cos(a) * 13, y + Math.sin(a) * 13, 2.8)
      .fill(P.stone)
      .stroke(line(0.8, 0.7));
  }
  g.moveTo(x, y + 3)
    .lineTo(x, y - 14)
    .stroke({ color: P.wood, width: 1.6 });
  g.poly([x, y - 14, x + 9, y - 11.5, x, y - 9]).fill(colour);
}
// The rival camp: a palisade arc, tents around a campfire and a red banner.
export function camp(g: Graphics, x: number, y: number, t = 0) {
  for (let i = 0; i < 15; i++) {
    const a = Math.PI * 0.5 + (i * Math.PI * 1.0) / 14;
    const px = x + Math.cos(a) * 26,
      py = y + Math.sin(a) * 22;
    g.moveTo(px, py + 3)
      .lineTo(px, py - 4)
      .stroke({ color: P.wood, width: 1.6, cap: "round" });
  }
  const tent = (tx: number, ty: number, s: number) => {
    shadow(g, tx + 1, ty + 2, 9 * s, 6 * s);
    g.poly([tx - 9 * s, ty + 6 * s, tx, ty - 8 * s, tx + 9 * s, ty + 6 * s])
      .fill(P.tent)
      .stroke(line(1, 1));
    g.poly([tx, ty - 8 * s, tx + 9 * s, ty + 6 * s, tx, ty + 6 * s]).fill(
      P.tentDark,
    );
    g.moveTo(tx, ty + 6 * s)
      .lineTo(tx, ty + 1 * s)
      .stroke({ color: P.ink, width: 1.2 });
  };
  tent(x - 11, y - 4, 1);
  tent(x + 12, y - 7, 0.9);
  tent(x + 2, y + 12, 0.85);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    g.circle(x + 2 + Math.cos(a) * 4, y + 2 + Math.sin(a) * 3, 1.2).fill(
      P.stoneDark,
    );
  }
  g.circle(x + 2, y + 2, 2.5).fill(P.flameLight);
  smoke(g, x + 2, y + 2, t, 0.5);
  clanBanner(g, x - 18, y + 6, 26, 1, t);
}
// A war camp of the Clan del Humo, where its waves set out. Always there and
// smouldering (k ≈ 0.25: a fire and a tent under the standard); as a wave
// gathers (k → 1) the smoke thickens, tents go up and the standard rises.
export function warCamp(
  g: Graphics,
  x: number,
  y: number,
  k: number,
  t: number,
) {
  const tent = (tx: number, ty: number, s: number, a: number) => {
    shadow(g, tx + 1, ty + 2, 9 * s, 6 * s, a);
    g.poly([tx - 9 * s, ty + 6 * s, tx, ty - 8 * s, tx + 9 * s, ty + 6 * s])
      .fill({ color: P.soot, alpha: a })
      .stroke(line(a, 1));
    g.poly([tx, ty - 8 * s, tx + 9 * s, ty + 6 * s, tx, ty + 6 * s]).fill({
      color: P.sootDark,
      alpha: a,
    });
  };
  const rise = (from: number) => Math.min(1, Math.max(0, (k - from) / 0.12));
  g.ellipse(x, y + 4, 30, 20).fill({ color: P.ash, alpha: 0.14 });
  // A low stockade of stakes around the back of the camp.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.15 + (i * Math.PI * 1.2) / 8,
      px = x + Math.cos(a + Math.PI) * 32,
      py = y + Math.sin(a + Math.PI) * 24;
    g.moveTo(px, py + 3)
      .lineTo(px, py - 4)
      .stroke({ color: P.woodDark, width: 1.6, cap: "round" });
  }
  tent(x - 20, y - 12, 0.9, 1);
  if (rise(0.3)) tent(x + 4, y - 18, 0.8, rise(0.3));
  if (rise(0.45)) tent(x + 20, y - 14, 0.85, rise(0.45));
  if (rise(0.7)) tent(x + 22, y + 14, 0.8, rise(0.7));
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    g.circle(x - 20 + Math.cos(a) * 4, y + 14 + Math.sin(a) * 3, 1.2).fill(
      P.stoneDark,
    );
  }
  g.circle(x - 20, y + 14, 2 + k * 1.5).fill(P.flame);
  g.circle(x - 20, y + 13, 1 + k).fill(P.flameLight);
  // The smoke thickens as the wave grows: seen from far before it sets out.
  smoke(g, x - 20, y + 12, t, 0.5 + k);
  smoke(g, x - 18, y + 6, t + 0.37, 0.3 + k * 0.7);
  clanBanner(g, x - 30, y + 2, 22 + 8 * rise(0.85), 1, t);
}
// Raiders' tracks across a cell, along the way they went (fades with k).
export function tracks(
  g: Graphics,
  x: number,
  y: number,
  dir: number,
  k: number,
  seed = 0,
) {
  const c = Math.cos(dir),
    d = Math.sin(dir);
  for (let i = -3; i <= 3; i++)
    for (const side of [-1, 1]) {
      const along = i * 9 + (side > 0 ? 4 : 0) + rnd(seed, i + 5) * 2,
        across = side * (4 + rnd(seed, i * side + 9) * 2),
        px = x + along * c - across * d,
        py = y + along * d + across * c;
      g.ellipse(px, py, 2, 1.4).fill({ color: P.ash, alpha: 0.5 * k });
    }
}

// ── Battle ────────────────────────────────────────────────────────────────
// Where a raid was destroyed: trampled ground, broken spears and bows, and
// its banner fallen in the dirt. k fades it out (1 = fresh).
export function fallen(g: Graphics, x: number, y: number, k: number, seed = 0) {
  g.ellipse(x, y + 3, 22, 13).fill({ color: P.soil, alpha: 0.35 * k });
  for (let j = 0; j < 6; j++) {
    const a = rnd(seed, j) * Math.PI,
      cx = x - 15 + rnd(seed, j + 7) * 30,
      cy = y - 7 + rnd(seed, j + 13) * 16,
      l = 6 + rnd(seed, j + 19) * 5;
    g.moveTo(cx - Math.cos(a) * l, cy - Math.sin(a) * l * 0.6)
      .lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l * 0.6)
      .stroke({ color: P.woodDark, width: 1.4, alpha: 0.8 * k });
  }
  // A round shield left on the ground.
  g.circle(x + 9, y + 5, 3.6)
    .fill({ color: P.enemyDark, alpha: 0.8 * k })
    .stroke(line(k, 0.8));
  // The banner, pole and cloth lying flat.
  g.moveTo(x - 16, y + 9)
    .lineTo(x + 2, y - 3)
    .stroke({ color: P.woodDark, width: 1.6, alpha: k });
  g.poly([
    x + 2,
    y - 3,
    x + 12,
    y - 9,
    x + 9,
    y - 2,
    x + 13,
    y + 1,
    x + 4,
    y + 2,
  ])
    .fill({ color: P.soot, alpha: 0.85 * k })
    .stroke(line(k, 0.8));
}
// The moment a raid breaks: its men scatter outward and fade (t = 0 → 1).
export function rout(g: Graphics, x: number, y: number, t: number, n = 6) {
  const e = 1 - (1 - t) * (1 - t);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4,
      d = 6 + e * 26;
    g.circle(x + Math.cos(a) * d, y + Math.sin(a) * d, 3.2 * (1 - t * 0.5))
      .fill({ color: P.soot, alpha: 1 - t })
      .stroke({ color: P.ink, width: 0.8, alpha: 0.7 * (1 - t) });
  }
  g.circle(x, y, 10 + e * 30).stroke({
    color: P.flameLight,
    width: 3 * (1 - t),
    alpha: 1 - t,
  });
}
// Loot carried home by raiders: a tied sack of grain.
export function sack(g: Graphics, x: number, y: number) {
  shadow(g, x, y + 4, 6, 2.5);
  g.moveTo(x - 5, y + 4)
    .quadraticCurveTo(x - 7, y - 3, x - 2, y - 4)
    .lineTo(x + 2, y - 4)
    .quadraticCurveTo(x + 7, y - 3, x + 5, y + 4)
    .closePath()
    .fill(P.wheat)
    .stroke(line(1, 1));
  g.moveTo(x - 2, y - 4)
    .lineTo(x - 3, y - 7)
    .moveTo(x + 2, y - 4)
    .lineTo(x + 3, y - 7)
    .stroke({ color: P.thatchDark, width: 1.2 });
}
