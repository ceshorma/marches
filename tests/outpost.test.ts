import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createOutpost,
  createScout,
  updateOutpost,
} from "../src/tactics/outpost";
import { advance, order, allTroops } from "../src/tactics/model";
const run = (b: ReturnType<typeof createOutpost>, seconds: number) => {
  for (let i = 0; i < seconds * 20; i++) {
    advance(b, 0.05);
    updateOutpost(b, 0.05);
    assert.equal(
      new Set(allTroops(b).map((u) => u.cell)).size,
      allTroops(b).length,
    );
  }
};
function built() {
  const b = createOutpost();
  assert.equal(createScout(b), null);
  assert.equal(order(b, b.squads[0].id, b.outpost!.sites[0].cell), null);
  for (let i = 0; i < 600 && !b.outpost!.sites[0].active; i++) run(b, 0.05);
  assert.equal(b.outpost!.sites[0].active, true);
  return b;
}
test("start empty and build a tower by issuing a movement order", () => {
  const b = createOutpost();
  assert.equal(b.squads.length, 0);
  assert.equal(b.raids!.length, 0);
  createScout(b);
  assert.equal(b.squads[0].members.length, 1);
  order(b, b.squads[0].id, b.outpost!.sites[0].cell);
  run(b, 18);
  assert.ok(b.outpost!.sites[0].active);
  assert.equal(b.lesson, undefined);
});
test("enemy arrives only after construction; periodic reinforcements come from home", () => {
  const b = createOutpost();
  run(b, 50);
  assert.equal(b.raids!.length, 0);
  assert.equal(b.squads.length, 0);
  createScout(b);
  order(b, b.squads[0].id, b.outpost!.sites[0].cell);
  run(b, 40);
  assert.ok(b.raids![0]);
  assert.ok(b.raids![0].troop.path.length > 0 || b.raids![0].phase === "fight");
  assert.equal(b.squads.length, 1);
  assert.ok(Object.values(b.outpost!.reserve).reduce((a, c) => a + c, 0) >= 2);
});
test("defending the tower repels a patrol and the same world continues", () => {
  const b = built();
  run(b, 160);
  assert.ok(b.outpost!.waves >= 2);
  assert.ok(b.outpost!.sites[0].active);
  assert.equal(b.lesson, undefined);
  assert.ok(b.time > 140);
});
test("abandoning the tower permits destruction and later rebuilding", () => {
  const b = built();
  order(b, b.squads[0].id, 8 * 18 + 4);
  run(b, 100);
  assert.equal(b.outpost!.sites[0].active, false);
  run(b, 50);
  assert.equal(order(b, b.squads[0].id, b.outpost!.sites[0].cell), null);
  run(b, 20);
  assert.equal(b.outpost!.sites[0].active, true);
});
