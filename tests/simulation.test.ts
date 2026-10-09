import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  findPath,
  neighbors,
  walkable,
  distance,
  cellId,
} from "../src/world";
import {
  initialWorld,
  moveUnit,
  recruit,
  tick,
  projectInfluence,
} from "../src/simulation";
const advance = (w: ReturnType<typeof initialWorld>, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) tick(w, 0.1);
};
test("seed produces identical terrain and different seeds vary geography", () => {
  assert.deepEqual(createWorld(24300), createWorld(24300));
  assert.notDeepEqual(
    createWorld(24300).cells.map((c) => c.variation),
    createWorld(7).cells.map((c) => c.variation),
  );
  assert.equal(createWorld().cells.length, 2000);
});
test("routes are connected and avoid mountains and water", () => {
  const w = initialWorld();
  for (const p of w.places) {
    const path = findPath(w.cells, w.units[0].cell, p.cell);
    assert.ok(path.length, `Reachable: ${p.name}`);
    let previous = w.units[0].cell;
    for (const id of path) {
      assert.ok(neighbors(previous).includes(id));
      assert.ok(walkable(w.cells[id]));
      previous = id;
    }
  }
});
test("enemy patrol moves during 30 seconds of observation", () => {
  const w = initialWorld(),
    u = w.units.find((u) => u.id === "e1")!,
    x = u.x;
  advance(w, 30);
  assert.ok(Math.abs(x - u.x) > 70);
  assert.ok(w.events.some((e) => e.title === "Llegan suministros"));
});
test("recruitment charges once, respects time and spawns allies", () => {
  const w = initialWorld();
  assert.equal(recruit(w, "fort", "infantry"), null);
  assert.equal(w.gold, 0);
  advance(w, 10);
  assert.equal(w.units.filter((u) => u.faction === "ally").length, 1);
  advance(w, 3);
  assert.equal(w.units.filter((u) => u.faction === "ally").length, 2);
  assert.equal(w.places[0].queue.length, 0);
  w.gold = 0;
  assert.ok(recruit(w, "fort", "cavalry"));
});
test("capturing a strategic position grows influence", () => {
  const w = initialWorld();
  w.units = w.units.filter((u) => u.faction === "ally");
  const bridge = w.places.find((p) => p.id === "bridge")!,
    c = w.cells[bridge.cell],
    u = w.units[0];
  const initial = w.cells.filter((c) => c.owner === "ally").length;
  u.posture = "defend";
  u.cell = c.id;
  u.x = c.x;
  u.y = c.y;
  advance(w, 14);
  assert.equal(bridge.faction, "ally");
  assert.equal(w.objectiveComplete, true);
  advance(w, 10);
  assert.ok(w.cells.filter((c) => c.owner === "ally").length > initial);
  assert.ok(w.events.some((e) => e.title === "Posición asegurada"));
});
test("enemy presence blocks capture and fort garrison repels intruders", () => {
  const w = initialWorld(),
    p = w.places.find((p) => p.id === "bridge")!,
    c = w.cells[p.cell];
  for (const u of w.units.slice(0, 1).concat(w.units.slice(3, 4))) {
    u.cell = c.id;
    u.x = c.x;
    u.y = c.y;
    u.posture = "defend";
    u.path = [];
  }
  advance(w, 2);
  assert.equal(p.faction, "neutral");
  assert.equal(p.capture, 0);
  const enemy = w.units.find((u) => u.id === "e2")!,
    fort = w.cells[w.places[0].cell];
  enemy.cell = fort.id;
  enemy.x = fort.x;
  enemy.y = fort.y;
  enemy.posture = "defend";
  enemy.path = [];
  const hp = enemy.hp;
  tick(w, 0.1);
  assert.ok(enemy.hp < hp);
});
test("orders animate movement and reject impassable destinations", () => {
  const w = initialWorld(),
    u = w.units[0],
    p = w.places[2];
  w.units = w.units.filter((u) => u.faction === "ally");
  assert.equal(moveUnit(w, u.id, p.cell), null);
  advance(w, 35);
  assert.ok(distance(u, w.cells[p.cell]) < 0.2);
  const water = w.cells.find((c) => c.terrain === "water")!;
  assert.ok(moveUnit(w, u.id, water.id));
});
test("same sequence of commands and ticks is deterministic", () => {
  const a = initialWorld(),
    b = initialWorld();
  for (const w of [a, b]) {
    moveUnit(w, "u1", w.places[2].cell);
    recruit(w, "fort", "archer");
    advance(w, 40);
  }
  assert.deepEqual(a, b);
});
test("influence cannot propagate across impassable river", () => {
  const w = initialWorld();
  w.units = [];
  w.places = w.places.slice(0, 1);
  projectInfluence(w, true);
  assert.equal(w.cells[cellId(49, 39)].ally, 0);
});

test("hidden enemy captures do not leak through the campaign journal", () => {
  const w = initialWorld();
  const p = w.places.find((p) => p.id === "forest")!;
  assert.equal(p.discovered, false);
  advance(w, 20);
  assert.equal(p.faction, "enemy");
  assert.equal(
    w.events.some((e) => e.cell === p.cell),
    false,
  );
});

test("losing the bridge reopens the active objective", () => {
  const w = initialWorld();
  const p = w.places.find((p) => p.id === "bridge")!;
  p.faction = "ally";
  w.objectiveComplete = true;
  const u = w.units.find((u) => u.id === "e1")!;
  w.units = [u];
  u.cell = p.cell;
  u.x = w.cells[p.cell].x;
  u.y = w.cells[p.cell].y;
  u.path = [];
  u.posture = "defend";
  advance(w, 14);
  assert.equal(p.faction, "enemy");
  assert.equal(w.objectiveComplete, false);
});

test("opening starts small and expansion unlocks options through play", () => {
  const w = initialWorld();
  assert.equal(w.units.filter((u) => u.faction === "ally").length, 1);
  assert.equal(w.places.filter((p) => p.faction === "ally").length, 1);
  assert.ok(w.cells.filter((c) => c.explored).length < 140);
  assert.equal(w.events.length, 0);
  assert.ok(recruit(w, "fort", "archer"));
  const known = w.cells.filter((c) => c.explored).length;
  const village = w.places.find((p) => p.id === "village")!;
  assert.equal(moveUnit(w, "u1", village.cell), null);
  advance(w, 26);
  assert.equal(village.faction, "ally");
  assert.ok(w.cells.filter((c) => c.explored).length > known);
  assert.equal(recruit(w, "fort", "archer"), null);
});
