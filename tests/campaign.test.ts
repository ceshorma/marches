import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import { advance, allTroops, order } from "../src/tactics/model";
import { spawnReinforcement } from "../src/tactics/fronts";
import { useTactics } from "../src/tactics/state";
const run = (b: ReturnType<typeof createMission>, seconds: number) => {
  for (let i = 0; i < seconds * 20 && b.lesson!.status === "active"; i++) {
    advance(b, 0.05);
    updateMission(b, 0.05);
    assert.equal(
      new Set(allTroops(b).map((u) => u.cell)).size,
      allTroops(b).length,
    );
  }
};
test("first lesson is quiet, receives a reinforcement, and requires a player order", () => {
  const b = createMission(0);
  assert.equal(b.squads.length, 1);
  assert.equal(b.raid, undefined);
  run(b, 20);
  assert.equal(b.squads.length, 2);
  assert.equal(b.lesson!.status, "active");
  assert.equal(order(b, "s1", b.lesson!.target), null);
  run(b, 30);
  assert.equal(b.lesson!.status, "won");
});
test("village lesson can fail and succeeds when intercepted", () => {
  const a = createMission(1),
    b = createMission(1);
  run(a, 90);
  assert.equal(a.lesson!.status, "lost");
  order(b, "s1", 141);
  run(b, 65);
  assert.equal(b.lesson!.status, "won");
});
test("counter lesson can be won by moving cavalry against archers", () => {
  const b = createMission(2);
  assert.equal(order(b, "s3", 135), null);
  run(b, 90);
  assert.equal(b.lesson!.status, "won");
});
test("reinforcement lesson requires deployment and actual control", () => {
  const b = createMission(3);
  assert.equal(spawnReinforcement(b, false, "bow"), null);
  b.lesson!.deployed = true;
  assert.equal(order(b, b.squads.at(-1)!.id, 116), null);
  assert.equal(order(b, "s1", 98), null);
  run(b, 180);
  assert.equal(b.lesson!.status, "won");
});
test("next mission is locked before success and reset clears transient orders", () => {
  useTactics.setState({ scenario: "campaign", missionIndex: 0, unlocked: 0 });
  useTactics.getState().reset();
  useTactics.getState().nextMission();
  assert.equal(useTactics.getState().missionIndex, 0);
  useTactics.getState().startMission(2);
  assert.equal(useTactics.getState().missionIndex, 0);
  const g = useTactics.getState();
  g.select("s1");
  g.move(g.battle.lesson!.target);
  for (let i = 0; i < 800; i++) g.tick(0.05);
  assert.equal(useTactics.getState().battle.lesson!.status, "won");
  assert.equal(useTactics.getState().unlocked, 1);
  g.nextMission();
  assert.equal(useTactics.getState().missionIndex, 1);
  assert.equal(useTactics.getState().selected, null);
  assert.equal(useTactics.getState().paused, false);
});
test("final mission resolves on enemy base capture, not merely pressure", () => {
  const b = createMission(4);
  b.sectors![4].control = 0.8;
  updateMission(b, 0.1);
  assert.equal(b.lesson!.status, "active");
  b.sectors![4].owner = "ally";
  updateMission(b, 0.1);
  assert.equal(b.lesson!.status, "won");
});
