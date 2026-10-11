import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import {
  callable,
  callAssault,
  CALL_SOON,
  createOutpost,
  updateOutpost,
  waiting,
} from "../src/tactics/outpost";
import { advance } from "../src/tactics/model";
import { slowed, SLOW_FOR } from "../src/tactics/state";
import { plain } from "./player";
type B = ReturnType<typeof createMission>;
const run = (b: B, seconds: number, player?: (b: B) => void) => {
  for (let i = 0; i < seconds * 20 && b.lesson!.status === "active"; i++) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
    if (player && i % 10 === 0) player(b);
  }
};
// Plays mission 3 until its first assault is over.
const firstValley = () => {
  const b = createMission(2),
    p = plain();
  for (let i = 0; i < 300 * 20 && !(b.outpost!.script!.cleared ?? 0); i++)
    run(b, 0.05, p);
  return b;
};

test("after each assault comes a valley, with a levy of troops", () => {
  const b = firstValley(),
    sc = b.outpost!.script!;
  assert.equal(sc.cleared, 1);
  const now = b.time - sc.clock!;
  // The next assault opens a gap after this one was over, not on a clock.
  assert.ok(sc.starts![1]! >= now + sc.assaults![1].gap - 0.1);
  assert.ok(b.outpost!.newsCount!.levy >= 1);
});
test("in a valley the next assault can be called early, for one more troop", () => {
  const b = firstValley(),
    sc = b.outpost!.script!;
  assert.ok(callable(b));
  const before = b.outpost!.arrivals;
  assert.equal(callAssault(b), null);
  assert.equal(b.outpost!.arrivals, before + 1);
  assert.ok(Math.abs(sc.starts![1]! - (b.time - sc.clock! + CALL_SOON)) < 0.01);
  // Not while an assault is on the map.
  run(b, CALL_SOON + 1);
  assert.ok(!callable(b));
});
test("free play sends assaults whose size follows the land", () => {
  const b = createOutpost(),
    o = b.outpost!;
  b.squads.push({
    id: "s",
    name: "Halcón",
    cell: 8 * 18 + 4,
    facing: 0,
    targetFacing: 0,
    members: ["shield"],
    path: [],
    progress: 0,
    hold: true,
    cohesion: 100,
  });
  for (let i = 0; i < 20 * 20; i++) {
    advance(b, 0.05);
    updateOutpost(b, 0.05);
  }
  assert.ok(o.assaultOpen);
  assert.ok((b.raids ?? []).filter((r) => !r.slow).length >= 1);
  assert.ok(waiting(o) >= 0);
});
test("time runs slow while a troop is in hand or a squad was just selected", () => {
  const idle = { aiming: false, held: null, selected: null, selectedAt: 0 };
  assert.ok(!slowed(idle, 1e6));
  assert.ok(slowed({ ...idle, aiming: true }, 1e6));
  assert.ok(slowed({ ...idle, held: "shield" }, 1e6));
  assert.ok(slowed({ ...idle, selected: "s", selectedAt: 1e6 }, 1e6 + 100));
  assert.ok(!slowed({ ...idle, selected: "s", selectedAt: 0 }, SLOW_FOR + 1));
});
