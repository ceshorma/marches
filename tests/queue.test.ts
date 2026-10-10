import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import {
  FORT_CAP,
  GATHER,
  gathering,
  queue,
  updateOutpost,
  waiting,
} from "../src/tactics/outpost";
import { slotsOf } from "../src/tactics/combat";
import { advance } from "../src/tactics/model";
import { useTactics } from "../src/tactics/state";
const cell = (q: number, r: number) => r * 18 + q;
type B = ReturnType<typeof createMission>;
const run = (b: B, seconds: number) => {
  for (let i = 0; i < seconds * 20 && b.lesson!.status === "active"; i++) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
  }
};
test("troops wait at the fort and a full fort turns arrivals away", () => {
  const b = createMission(5);
  const o = b.outpost!;
  assert.equal(waiting(o), FORT_CAP);
  assert.deepEqual(queue(o), [
    "shield",
    "shield",
    "bow",
    "bow",
    "horse",
    "horse",
  ]);
  // The first arrival comes at 25 s with no room left.
  run(b, 26);
  assert.equal(waiting(o), FORT_CAP);
  // Both the timed arrival and the troop earned by the land are lost.
  assert.ok(o.turnedAway >= 1);
  assert.equal(o.noticeTone, "danger");
});
test("a wave gathers in view for its last seconds before setting out", () => {
  const b = createMission(2);
  // First wave sets out at 20 s.
  run(b, 20 - GATHER - 1);
  assert.deepEqual(gathering(b), []);
  run(b, 6);
  const [g] = gathering(b);
  assert.equal(g.from, cell(16, 8));
  assert.deepEqual(g.units, ["bow", "bow", "bow", "bow"]);
  assert.ok(g.progress > 0.3 && g.progress < 0.5);
  run(b, 11);
  assert.deepEqual(gathering(b), []);
  assert.equal(b.raids!.length, 1);
});
test("dropping a waiting troop on a slot reinforces that exact position", () => {
  useTactics.setState({ scenario: "campaign", missionIndex: 0, unlocked: 0 });
  useTactics.getState().reset();
  const g = useTactics.getState();
  g.dropTroop(cell(4, 8), "shield");
  const u = useTactics.getState().battle.squads[0];
  assert.deepEqual(slotsOf(u), [1]);
  g.dropTroop(cell(4, 8), "shield", 5);
  assert.deepEqual(slotsOf(u), [1, 5]);
  assert.equal(useTactics.getState().selected, u.id);
  assert.equal(waiting(useTactics.getState().battle.outpost!), 0);
});
