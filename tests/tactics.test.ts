import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBattle,
  route,
  order,
  advance,
  hold,
  adjacent,
  squadPosition,
} from "../src/tactics/model";
import { useTactics } from "../src/tactics/state";
const run = (b: ReturnType<typeof createBattle>, seconds = 60) => {
  for (let i = 0; i < seconds * 20; i++) {
    advance(b, 0.05);
    assert.equal(
      new Set(b.squads.map((s) => s.cell)).size,
      b.squads.length,
      "unique occupied cells",
    );
  }
};
test("scenario is deterministic and formations fit six slots", () => {
  const a = createBattle();
  assert.deepEqual(a, createBattle());
  assert.equal(a.cells.length, 216);
  assert.ok(a.squads.every((s) => s.members.length <= 6));
  assert.deepEqual(new Set(a.cells.map((c) => c.height)), new Set([0, 15, 30]));
});
test("path detours around rocks with adjacent steps", () => {
  const b = createBattle(),
    s = b.squads[0],
    p = route(b, s, 6 * 18 + 14);
  assert.ok(p.length);
  let from = s.cell;
  for (const id of p) {
    assert.ok(adjacent(from).includes(id));
    assert.notEqual(b.cells[id].terrain, "rock");
    from = id;
  }
  assert.equal(p.at(-1), 122);
});
test("occupied and reserved destinations reject second squad", () => {
  const b = createBattle();
  assert.ok(order(b, "s1", b.squads[1].cell));
  assert.equal(order(b, "s1", 125), null);
  assert.ok(order(b, "s2", 125));
});
test("squad reaches its destination with no overlap", () => {
  const b = createBattle();
  assert.equal(order(b, "s1", 125), null);
  run(b);
  assert.equal(b.squads[0].cell, 125);
});
test("redirect during movement preserves continuous position", () => {
  const b = createBattle(),
    s = b.squads[0];
  order(b, s.id, 125);
  advance(b, 0.3);
  const p = squadPosition(b, s),
    next = s.path[0];
  assert.equal(order(b, s.id, 150), null);
  assert.equal(s.path[0], next);
  assert.deepEqual(squadPosition(b, s), p);
  run(b);
  assert.equal(s.cell, 150);
});
test("hold finishes only the current edge", () => {
  const b = createBattle(),
    s = b.squads[0];
  order(b, s.id, 125);
  advance(b, 0.3);
  const next = s.path[0];
  hold(s);
  run(b);
  assert.equal(s.cell, next);
  assert.equal(s.path.length, 0);
  assert.equal(s.progress, 0);
});
test("intersecting routes remain exclusive and both finish", () => {
  const b = createBattle();
  order(b, "s1", 160);
  order(b, "s2", 104);
  run(b, 120);
  assert.equal(b.squads[0].cell, 160);
  assert.equal(b.squads[1].cell, 104);
});
test("unreachable destination does not erase current order", () => {
  const b = createBattle(),
    s = b.squads[0];
  order(b, s.id, 125);
  const path = [...s.path];
  assert.ok(order(b, s.id, b.cells.find((c) => c.terrain === "rock")!.id));
  assert.deepEqual(s.path, path);
});
test("pause stops time and movement", () => {
  useTactics.getState().reset();
  useTactics.getState().select("s1");
  useTactics.getState().move(125);
  useTactics.setState({ paused: true });
  const old = JSON.stringify(useTactics.getState().battle);
  useTactics.getState().tick(1);
  assert.equal(JSON.stringify(useTactics.getState().battle), old);
});
test("orientation issued during movement persists after reaching cell", () => {
  useTactics.getState().reset();
  const g = useTactics.getState();
  g.select("s1");
  g.move(125);
  g.tick(0.3);
  g.rotate(Math.PI);
  for (let i = 0; i < 200; i++) g.tick(0.05);
  const u = g.battle.squads[0];
  assert.equal(u.path.length, 0);
  assert.ok(Math.abs(Math.cos(u.facing) + 1) < 0.001);
});

test("opening raid visibly advances and loots if ignored", () => {
  const b = createBattle(true),
    start = b.raid!.troop.cell;
  run(b, 15);
  assert.notEqual(b.raid!.troop.cell, start);
  run(b, 45);
  assert.ok(b.raid!.stolen > 0);
  assert.equal(b.raid!.outcome, "raided");
  assert.equal(b.raid!.supplies, 0);
});
test("intercepting the patrol protects village and triggers withdrawal", () => {
  const b = createBattle(true);
  order(b, "s1", 7 * 18 + 15);
  run(b, 50);
  assert.equal(b.raid!.outcome, "protected");
  assert.equal(b.raid!.stolen, 0);
  assert.equal(b.raid!.phase, "gone");
});
test("defenders can interrupt an ongoing raid", () => {
  const b = createBattle(true);
  run(b, 34);
  assert.ok(b.raid!.stolen > 0);
  order(b, "s1", 8 * 18 + 13);
  run(b, 40);
  assert.equal(b.raid!.outcome, "protected");
  assert.ok(b.raid!.supplies > 0 && b.raid!.supplies < 100);
});
