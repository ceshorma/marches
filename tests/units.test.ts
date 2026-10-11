import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import {
  addReserveTroop,
  addSpecial,
  createOutpost,
  giveSpecial,
  held,
  setStance,
  updateOutpost,
} from "../src/tactics/outpost";
import { slotsOf } from "../src/tactics/combat";
import {
  advance,
  casualty,
  pace,
  PACE,
  WAGON_PACE,
} from "../src/tactics/model";
import type { Squad } from "../src/tactics/model";
import { stancesFor } from "../src/tactics/units";
const cell = (q: number, r: number) => r * 18 + q;
type B = ReturnType<typeof createMission>;
const run = (b: B, seconds: number) => {
  for (let i = 0; i < seconds * 20 && b.lesson!.status === "active"; i++) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
  }
};
// Mission 3: four archers set out from (16, 8) at 20 s; a squad of ours
// stands in their way at (12, 8).
const meeting = (members: Squad["members"], setup?: (u: Squad) => void) => {
  const b = createMission(2);
  run(b, 20.1);
  const r = b.raids![0];
  r.troop.cell = cell(13, 8);
  r.troop.path = [];
  r.troop.progress = 0;
  const u: Squad = {
    id: "u",
    name: "Halcón",
    cell: cell(12, 8),
    facing: 0,
    targetFacing: 0,
    members,
    path: [],
    progress: 0,
    hold: true,
    cohesion: 100,
  };
  b.squads.push(u);
  setup?.(u);
  return { b, r, u };
};

test("a special unit takes its row and its size is its life", () => {
  const b = createOutpost();
  giveSpecial(b, "knights");
  assert.equal(addSpecial(b, cell(4, 8), "knights"), null);
  const u = b.squads[0];
  assert.deepEqual(u.members, ["horse", "horse", "horse"]);
  // Knights ride in the front row.
  assert.deepEqual(slotsOf(u).sort(), [0, 1, 2]);
  u.lastZone = "front";
  casualty(b, u);
  assert.equal(u.special!.size, 2);
  casualty(b, u);
  casualty(b, u);
  assert.ok(!b.squads.includes(u));
});
test("a special unit needs room for all its places", () => {
  const b = createOutpost();
  b.outpost!.reserve = { shield: 4, bow: 0, horse: 0 };
  for (let i = 0; i < 4; i++) addReserveTroop(b, cell(4, 8), "shield");
  giveSpecial(b, "scorpion");
  assert.ok(addSpecial(b, cell(4, 8), "scorpion"));
  assert.equal(b.outpost!.specials!.length, 1);
  assert.equal(addSpecial(b, cell(2, 8), "scorpion"), null);
});
test("the war wagon crawls and, standing still, holds land like a tower", () => {
  const b = createOutpost();
  giveSpecial(b, "wagon");
  addSpecial(b, cell(4, 8), "wagon");
  const u = b.squads[0];
  assert.equal(pace(u), WAGON_PACE);
  assert.ok(pace(u) > PACE.shield);
  const before = held(b);
  u.cell = cell(7, 8);
  for (let i = 0; i < 40 * 20; i++) {
    advance(b, 0.05);
    updateOutpost(b, 0.05);
  }
  assert.ok(held(b) > before, `${held(b)} > ${before}`);
});
test("a veteran squad's commander becomes a hero", () => {
  const { b, u } = meeting(["horse", "horse", "horse", "horse"], (u) => {
    u.feats = 1;
  });
  run(b, 40);
  assert.equal(u.feats, 2);
  assert.equal(u.special?.kind, "hero");
  assert.ok(u.special?.name);
  assert.equal(b.outpost!.newsCount!.hero, 1);
});
test("each squad is offered the actions its troops can take", () => {
  const u = { members: ["shield", "bow"] } as Squad;
  assert.deepEqual(stancesFor(u), ["hold", "wall", "skirmish"]);
});
test("holding the ground: dug in, it loses less cohesion in front", () => {
  const plain = meeting(["shield", "shield", "shield"]),
    dug = meeting(["shield", "shield", "shield"], (u) => {
      u.stance = "hold";
      u.stanceAt = -10;
    });
  run(plain.b, 4);
  run(dug.b, 4);
  assert.ok(dug.u.cohesion! > plain.u.cohesion!);
  // Moving gives it up.
  setStance(dug.b, "u", "hold");
  assert.equal(dug.u.stance, "hold");
});
test("a charge strikes hard once, then the squad is spent", () => {
  const { b, u } = meeting(["horse", "horse", "horse"], (u) => {
    u.stance = "charge";
  });
  run(b, 1);
  assert.equal(u.stance, undefined);
  assert.ok((u.tiredUntil ?? 0) > b.time);
  assert.ok(setStance(b, "u", "charge"), "spent: no charge yet");
});
test("skirmishing archers step back from a foe at arm's length", () => {
  const { b, u } = meeting(["bow", "bow", "bow"], (u) => {
    u.stance = "skirmish";
  });
  const start = u.cell;
  run(b, 3);
  assert.notEqual(u.cell, start);
});
