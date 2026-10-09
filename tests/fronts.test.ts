import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFrontsBattle,
  updateControl,
  spawnReinforcement,
} from "../src/tactics/fronts";
import { advance, allTroops, order } from "../src/tactics/model";
const run = (b: ReturnType<typeof createFrontsBattle>, seconds: number) => {
  for (let i = 0; i < seconds * 20; i++) {
    advance(b, 0.05);
    assert.equal(
      new Set(allTroops(b).map((u) => u.cell)).size,
      allTroops(b).length,
      "no overlapping squads",
    );
  }
};
test("advanced scenario has deterministic multiple fronts and unique squads", () => {
  const b = createFrontsBattle();
  assert.deepEqual(b, createFrontsBattle());
  assert.equal(b.squads.length, 7);
  assert.equal(b.fronts!.length, 6);
  assert.equal(new Set(b.fronts!.map((f) => f.target)).size, 3);
});
test("world moves and sector pressure evolves without player orders", () => {
  const b = createFrontsBattle(),
    cells = b.fronts!.map((f) => f.troop.cell),
    initial = b.sectors!.map((s) => s.control);
  run(b, 30);
  assert.ok(b.fronts!.some((f, i) => f.troop.cell !== cells[i]));
  assert.ok(b.sectors!.some((s, i) => Math.abs(s.control - initial[i]) > 0.05));
  run(b, 150);
  assert.ok(b.sectors!.some((s) => s.control < 0 && s.id !== "east"));
});
test("uncontested presence captures and ownership persists after troops leave", () => {
  const b = createFrontsBattle();
  b.fronts = [];
  const target = b.sectors![2];
  b.squads = b.squads.slice(0, 1);
  b.squads[0].cell = target.cell;
  target.control = 0;
  target.owner = "neutral";
  for (let i = 0; i < 120; i++) updateControl(b, 0.5);
  assert.equal(target.owner, "ally");
  b.squads = [];
  updateControl(b, 60);
  assert.equal(target.owner, "ally");
  assert.equal(target.control, 1);
});
test("player can redirect a reserve and simulation is deterministic", () => {
  const a = createFrontsBattle(),
    b = createFrontsBattle();
  assert.equal(order(a, "s5", 8 * 18 + 10), null);
  assert.equal(order(b, "s5", 8 * 18 + 10), null);
  run(a, 30);
  run(b, 30);
  assert.deepEqual(a, b);
});

test("reinforcing the northern sector changes its outcome", () => {
  const idle = createFrontsBattle(),
    reinforced = createFrontsBattle();
  assert.equal(order(reinforced, "s5", 3 * 18 + 7), null);
  assert.equal(order(reinforced, "s7", 2 * 18 + 6), null);
  run(idle, 120);
  run(reinforced, 120);
  assert.equal(idle.sectors![1].owner, "enemy");
  assert.equal(reinforced.sectors![1].owner, "ally");
});

test("bases spawn in free adjacent cells and respect preparation time and capacity", () => {
  const b = createFrontsBattle();
  assert.equal(spawnReinforcement(b), null);
  assert.equal(b.squads.length, 8);
  assert.ok(spawnReinforcement(b));
  b.time += 30;
  assert.equal(spawnReinforcement(b), null);
  b.time += 30;
  assert.ok(spawnReinforcement(b));
  assert.equal(b.squads.length, 9);
  assert.equal(
    new Set(allTroops(b).map((u) => u.cell)).size,
    allTroops(b).length,
  );
});
test("capturing either base disables only its reinforcements", () => {
  const b = createFrontsBattle();
  b.sectors![4].owner = "ally";
  b.time = b.bases!.enemyReady;
  assert.ok(spawnReinforcement(b, true));
  assert.equal(b.fronts!.length, 6);
  assert.equal(spawnReinforcement(b), null);
  b.sectors![0].owner = "enemy";
  b.time += 40;
  assert.ok(spawnReinforcement(b));
});
test("enemy reinforcement comes from its base and receives a front order", () => {
  const b = createFrontsBattle();
  run(b, 13);
  assert.equal(b.fronts!.length, 7);
  const u = b.fronts!.at(-1)!.troop;
  assert.ok(u.path.length > 0);
  assert.ok(Math.abs(b.cells[u.cell].q - 15) <= 1);
});
