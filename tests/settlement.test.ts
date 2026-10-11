import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import {
  BURN,
  SETTLE,
  addReserveTroop,
  placeTower,
  hasHouse,
  updateOutpost,
} from "../src/tactics/outpost";
import { advance, order } from "../src/tactics/model";
const cell = (q: number, r: number) => r * 18 + q;
type B = ReturnType<typeof createMission>;
const run = (b: B, seconds: number) => {
  for (let i = 0; i < seconds * 20 && b.lesson!.status === "active"; i++) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
  }
};
test("land held from the start is already lived in", () => {
  const b = createMission(2);
  const settled = b.outpost!.settled!;
  assert.equal(settled[cell(7, 9)], 1);
  assert.equal(settled[cell(14, 2)], 0);
});
test("new land is settled over time once held", () => {
  const b = createMission(0);
  b.outpost!.reserve.shield = 1;
  addReserveTroop(b, cell(4, 8), "shield");
  placeTower(b, cell(7, 8));
  order(b, b.squads[0].id, cell(7, 8));
  // The first rider comes soon and holds up the building for a while.
  run(b, 45);
  assert.ok(b.outpost!.sites[0].active);
  // Peace from here on: no more assaults burn the ground being settled.
  b.raids = [];
  b.outpost!.script!.cleared = Infinity;
  const near = cell(8, 8);
  const before = b.outpost!.settled![near];
  // The rider ate this ground: it is held again first, then settled.
  run(b, SETTLE + 15);
  assert.ok(b.outpost!.settled![near] > before);
  assert.equal(b.outpost!.settled![near], 1);
});
test("enemies burn settled ground and troops walk in from houses", () => {
  const b = createMission(2);
  // Undefended: the first raid reaches the settled land around the tower.
  run(b, 70);
  const o = b.outpost!;
  const burnt = o.burning!.filter((t) => t > 0);
  assert.ok(burnt.length > 0);
  assert.ok(burnt.every((t) => t <= b.time));
  assert.ok(BURN > 0);
  // Arrivals set out from a settled house.
  assert.ok(o.lastArrival);
  const from = o.lastArrival!.from;
  assert.ok(from !== undefined && hasHouse(from));
  assert.ok(o.settled![from] > 0.7 || o.burning![from] > o.lastArrival!.time);
});
