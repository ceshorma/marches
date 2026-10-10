import { test } from "node:test";
import assert from "node:assert/strict";
import { guide } from "../src/tactics/guide";
import { createMission, updateMission } from "../src/tactics/campaign";
import { addReserveTroop, updateOutpost } from "../src/tactics/outpost";
import { advance, order } from "../src/tactics/model";
const cell = (q: number, r: number) => r * 18 + q;
type B = ReturnType<typeof createMission>;
const idle = { selected: null, held: null };
const run = (b: B, seconds: number) => {
  for (let i = 0; i < seconds * 20; i++) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
  }
};
test("signals answer each step of the first mission without words", () => {
  const b = createMission(0);
  // Nothing on the map: deploying starts at the yard, which pulses.
  assert.deepEqual(guide(b, idle).marks, []);
  assert.equal(guide(b, idle).yard, true);
  // A troop in hand: the board lights its targets instead.
  assert.equal(guide(b, { selected: null, held: "shield" }).yard, false);
  addReserveTroop(b, cell(4, 8), "shield");
  const id = b.squads[0].id;
  // A squad waits: pulse it; once selected, show the tower it could build.
  assert.deepEqual(guide(b, idle).marks, [
    { cell: cell(4, 8), tone: "go", style: "pulse" },
  ]);
  assert.equal(guide(b, idle).yard, false);
  assert.deepEqual(guide(b, { selected: id, held: null }).marks, [
    { cell: cell(7, 8), tone: "go", style: "ghost" },
  ]);
  order(b, id, cell(7, 8));
  assert.deepEqual(guide(b, { selected: id, held: null }).marks, []);
});
test("a finished tower sends the player back to the yard", () => {
  const b = createMission(0);
  b.outpost!.reserve.shield = 2;
  addReserveTroop(b, cell(4, 8), "shield");
  order(b, b.squads[0].id, cell(7, 8));
  for (let i = 0; i < 600 && !b.outpost!.sites[0].active; i++) run(b, 0.05);
  run(b, 1);
  assert.equal(guide(b, idle).yard, true);
});
test("selecting a squad reads every enemy as beaten or beating", () => {
  const b = createMission(2);
  run(b, 24);
  const archers = b.raids![0].troop;
  assert.deepEqual(archers.members, ["bow", "bow", "bow", "bow"]);
  const lancers = b.squads[0].id;
  assert.deepEqual(guide(b, { selected: lancers, held: null }).readings, [
    { id: archers.id, tone: "danger" },
  ]);
  addReserveTroop(b, cell(4, 8), "horse");
  const cavalry = b.squads.at(-1)!.id;
  assert.deepEqual(guide(b, { selected: cavalry, held: null }).readings, [
    { id: archers.id, tone: "good" },
  ]);
});
test("an unguarded target pulses red while a raid approaches", () => {
  const b = createMission(2);
  run(b, 24);
  const marks = guide(b, idle).marks;
  assert.ok(marks.some((m) => m.cell === cell(7, 8) && m.tone === "danger"));
});
