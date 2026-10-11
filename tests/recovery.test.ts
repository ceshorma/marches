import { test } from "node:test";
import assert from "node:assert/strict";
import { createOutpost, createScout, launch } from "../src/tactics/outpost";
import { advance } from "../src/tactics/model";
function quiet(count: number) {
  const b = createOutpost();
  createScout(b);
  b.squads[0].cohesion = 50;
  for (let i = 0; i < count; i++)
    launch(
      b,
      {
        from: 16 + 18 * i,
        target: 16 + 18 * i,
        units: ["shield"],
        strength: 100,
      },
      undefined,
      true,
    );
  return b;
}
test("cohesion recovers once per tick, including the lull without enemies", () => {
  for (const enemies of [0, 1, 2, 4]) {
    const b = quiet(enemies);
    for (let i = 0; i < 20; i++) advance(b, 0.05);
    assert.ok(Math.abs(b.squads[0].cohesion! - 53) < 1e-8);
  }
});
test("recent damage prevents recovery and heroes boost it only once", () => {
  const b = quiet(3),
    u = b.squads[0];
  u.lastHit = 0;
  advance(b, 1);
  assert.equal(u.cohesion, 50);
  b.time = 3;
  u.special = { kind: "hero", type: "shield", size: 1 };
  advance(b, 1);
  assert.equal(u.cohesion, 56);
  u.cohesion = 99;
  advance(b, 1);
  assert.equal(u.cohesion, 100);
});
