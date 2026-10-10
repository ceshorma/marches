import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attackDamage,
  heightBonus,
  matchup,
  preferredSlot,
  slotsOf,
  struck,
  zoneFrom,
} from "../src/tactics/combat";
import type { Squad } from "../src/tactics/model";
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
    b.cells[a.cell].height = b.cells[e.cell].height = 0;
    a.path = [];
    e.path = [];
    a.members = Array(6).fill(winner);
    e.members = Array(6).fill(loser);
    advance(b, 0.05);
    // The favoured side takes far less and deals more than twice as much.
    assert.ok(e.cohesion! < a.cohesion!);
    assert.ok(attackDamage(a, e) / attackDamage(e, a) > 2);
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

test("height favours archers shooting down and blunts cavalry charging up", () => {
  assert.equal(heightBonus(["bow"], 1), 1.25);
  assert.equal(heightBonus(["bow"], -1), 0.8);
  assert.equal(heightBonus(["horse"], -1), 0.8);
  assert.equal(heightBonus(["shield"], -2), 1);
  assert.equal(heightBonus(["shield"], 1), 1.1);
  assert.equal(heightBonus(["bow", "shield"], 0), 1);
  const archers = { members: Array(6).fill("bow") } as never,
    target = { members: Array(6).fill("bow") } as never;
  assert.equal(
    attackDamage(archers, target, 6, 2) / attackDamage(archers, target, 6, 0),
    1.5,
  );
});
test("defending the high ground changes a real exchange", () => {
  const exchange = (archerHeight: number) => {
    const b = createFrontsBattle();
    b.bases = undefined;
    b.squads = b.squads.slice(0, 1);
    b.fronts = b.fronts!.slice(0, 1);
    const a = b.squads[0],
      e = b.fronts[0].troop;
    a.cell = 108 + 8;
    e.cell = 108 + 9;
    a.path = e.path = [];
    a.members = Array(6).fill("bow");
    e.members = Array(6).fill("shield");
    b.cells[a.cell].height = archerHeight;
    b.cells[e.cell].height = 0;
    advance(b, 0.05);
    return 100 - e.cohesion!;
  };
  assert.ok(exchange(30) > exchange(0) * 1.4);
});

const squad = (members: TroopType[], layout?: number[]) =>
  ({ members, layout, facing: 0 }) as unknown as Squad;
test("new members fill front with melee and back with archers", () => {
  assert.equal(preferredSlot("bow", []), 4);
  assert.equal(preferredSlot("shield", []), 1);
  assert.deepEqual(slotsOf(squad(["bow", "shield", "shield"])), [4, 1, 0]);
});
test("attacks land on the zone they come from", () => {
  const at = { x: 0, y: 0 };
  assert.equal(zoneFrom(0, { x: 10, y: 0 }, at), "front");
  assert.equal(zoneFrom(0, { x: -10, y: 0 }, at), "rear");
  assert.equal(zoneFrom(0, { x: 0, y: 10 }, at), "right");
  assert.equal(zoneFrom(0, { x: 0, y: -10 }, at), "left");
});
test("the struck zone decides the matchup; an empty zone is exposed", () => {
  // Lancers in front, archers behind.
  const s = squad(["shield", "shield", "bow", "bow"], [0, 2, 3, 5]);
  assert.deepEqual(struck(s, "front").members, ["shield", "shield"]);
  assert.deepEqual(struck(s, "left").members, ["shield", "bow"]);
  const cavalry = squad(Array(6).fill("horse"));
  // Cavalry charging the front meets lancers; from behind it meets archers.
  assert.ok(
    attackDamage(cavalry, s, 6, 0, "rear") >
      attackDamage(cavalry, s, 6, 0, "front") * 2,
  );
  const thin = squad(["shield"], [1]);
  assert.equal(struck(thin, "rear").exposed, true);
  assert.equal(
    attackDamage(cavalry, thin, 6, 0, "rear") /
      attackDamage(cavalry, thin, 6, 0, "front"),
    1.25,
  );
});
test("archers shoot best from the back rank, melee from the front", () => {
  const target = squad(Array(6).fill("bow"));
  assert.ok(
    attackDamage(squad(["bow"], [4]), target) >
      attackDamage(squad(["bow"], [1]), target),
  );
  assert.ok(
    attackDamage(squad(["shield"], [1]), target) >
      attackDamage(squad(["shield"], [4]), target),
  );
});
