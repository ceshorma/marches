import { test } from "node:test";
import assert from "node:assert/strict";
import { attackDamage, matchup } from "../src/tactics/combat";
import type { TroopType } from "../src/tactics/combat";
import { createFrontsBattle, spawnReinforcement } from "../src/tactics/fronts";
import { advance } from "../src/tactics/model";
const cycle: [TroopType, TroopType][] = [
  ["shield", "horse"],
  ["horse", "bow"],
  ["bow", "shield"],
];
for (const [winner, loser] of cycle)
  test(`${winner} counters ${loser} in an actual exchange`, () => {
    const b = createFrontsBattle();
    b.bases = undefined;
    b.squads = b.squads.slice(0, 1);
    b.fronts = b.fronts!.slice(0, 1);
    const a = b.squads[0],
      e = b.fronts[0].troop;
    a.cell = 108 + 8;
    e.cell = 108 + 9;
    a.path = [];
    e.path = [];
    a.members = Array(6).fill(winner);
    e.members = Array(6).fill(loser);
    advance(b, 0.05);
    assert.equal(a.cohesion, 96.1);
    assert.equal(e.cohesion, 91);
    assert.equal(attackDamage(a, e), 9);
  });
test("mixed formations average their strengths and vulnerabilities", () => {
  assert.equal(matchup(["shield", "bow"], ["horse"]), 1.075);
  assert.equal(matchup(["bow"], ["shield", "bow"]), 1.25);
  assert.equal(matchup(["horse"], ["horse"]), 1);
});
test("reinforcement choice creates the requested six-member type", () => {
  for (const type of ["shield", "bow", "horse"] as TroopType[]) {
    const b = createFrontsBattle();
    assert.equal(spawnReinforcement(b, false, type), null);
    assert.deepEqual(b.squads.at(-1)!.members, Array(6).fill(type));
  }
});
