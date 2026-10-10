import { test } from "node:test";
import assert from "node:assert/strict";
import { mapNames, maps } from "../src/tactics/maps";
import {
  createOutpost,
  enemyCamps,
  foeHeld,
  updateOutpost,
} from "../src/tactics/outpost";
import { advance, route, solid } from "../src/tactics/model";
import type { Squad } from "../src/tactics/model";
const cell = (q: number, r: number) => r * 18 + q;
const walker = (at: number) =>
  ({ id: "w", cell: at, path: [], progress: 0 }) as unknown as Squad;
for (const name of mapNames)
  test(`map ${maps[name].name}: every site and camp can be reached from the fort`, () => {
    const b = createOutpost(name);
    const o = b.outpost!;
    assert.deepEqual(enemyCamps(b), maps[name].entries);
    for (const id of [...maps[name].sites, ...maps[name].entries]) {
      assert.ok(!solid(b.cells[id]));
      assert.ok(route(b, walker(o.fort), id).length > 0, `${id} unreachable`);
    }
  });
test("the river is crossed only at its fords", () => {
  const b = createOutpost("rio");
  const path = route(b, walker(cell(4, 8)), cell(14, 3));
  assert.ok(path.some((id) => b.cells[id].terrain === "ford"));
  assert.ok(!path.some((id) => b.cells[id].terrain === "water"));
});
test("the clan holds the ground around its camps from the start", () => {
  const b = createOutpost("valles");
  const foe = b.outpost!.foe!;
  for (const camp of maps.valles.entries) assert.equal(foe[camp], 1);
  assert.equal(foe[b.outpost!.fort], 0);
  assert.ok(foeHeld(b) > 10);
});
test("raiders stain what they eat; your squads tread it back", () => {
  const b = createOutpost();
  const o = b.outpost!;
  const spot = cell(5, 8);
  b.raids = [
    {
      troop: {
        id: "r",
        name: "r",
        cell: spot,
        facing: 0,
        targetFacing: 0,
        members: ["shield"],
        path: [],
        progress: 0,
        hold: true,
        cohesion: 50,
      },
      target: spot,
      phase: "loot",
      pressure: 0,
      supplies: 1e9,
      stolen: 0,
      outcome: "active",
      resolvedAt: 0,
      strength: 50,
    },
  ];
  for (let i = 0; i < 100; i++) updateOutpost(b, 0.05);
  assert.ok(o.foe![spot] >= 0.5);
  b.raids = [];
  b.squads.push({
    ...walker(spot),
    name: "s",
    facing: 0,
    targetFacing: 0,
    members: ["shield"],
    hold: true,
  } as Squad);
  for (let i = 0; i < 100; i++) {
    advance(b, 0.05);
    updateOutpost(b, 0.05);
  }
  assert.ok(o.foe![spot] < 0.5);
});
