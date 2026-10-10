import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import {
  addReserveTroop,
  gathering,
  updateOutpost,
} from "../src/tactics/outpost";
import { squadNames, veteran, VETERAN } from "../src/tactics/chronicle";
import { advance, pace, PACE, trail, VETERAN_HIT } from "../src/tactics/model";
import type { Squad } from "../src/tactics/model";
const cell = (q: number, r: number) => r * 18 + q;
type B = ReturnType<typeof createMission>;
const run = (b: B, seconds: number) => {
  for (let i = 0; i < seconds * 20 && b.lesson!.status === "active"; i++) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
  }
};
const squad = (members: Squad["members"], feats = 0): Squad => ({
  id: "s",
  name: "Halcón",
  cell: 0,
  facing: 0,
  targetFacing: 0,
  members,
  path: [],
  progress: 0,
  hold: true,
  feats,
});
test("a squad marches at the pace of its slowest member", () => {
  assert.equal(pace(squad(["horse", "horse"])), PACE.horse);
  assert.equal(pace(squad(["horse", "bow"])), PACE.bow);
  assert.equal(pace(squad(["horse", "shield", "bow"])), PACE.shield);
  assert.ok(PACE.horse < PACE.bow && PACE.bow < PACE.shield);
});
test("new squads take a name and pennant no other squad carries", () => {
  const b = createMission(1);
  b.outpost!.reserve = { shield: 3, bow: 0, horse: 0 };
  const names = b.squads.map((s) => s.name);
  for (const at of [cell(4, 8), cell(2, 8), cell(3, 7)]) {
    const before = b.squads.length;
    addReserveTroop(b, at, "shield");
    if (b.squads.length > before) names.push(b.squads.at(-1)!.name);
  }
  assert.ok(names.length >= 3);
  assert.equal(new Set(names).size, names.length);
  for (const n of names)
    assert.ok(
      squadNames.some((s) => s.name === n),
      `${n} has a pennant`,
    );
});
test("the chronicle tells of a squad formed and of a raid setting out", () => {
  const b = createMission(0);
  addReserveTroop(b, cell(4, 8), "shield");
  const name = b.squads[0].name;
  assert.ok(b.outpost!.news!.some((n) => n.who === name));
  run(b, 30);
  assert.ok(b.outpost!.news!.some((n) => n.tone === "bad"));
  // Lines of the same kind take turns: never the same line twice in a row.
  const texts = b.outpost!.news!.map((n) => n.text);
  for (let i = 1; i < texts.length; i++)
    assert.notEqual(texts[i], texts[i - 1]);
});
test("a veteran squad hits harder", () => {
  assert.ok(!veteran(squad(["shield"], VETERAN - 1)));
  assert.ok(veteran(squad(["shield"], VETERAN)));
  assert.ok(VETERAN_HIT > 1);
});
test("a gathering wave shows where it will march", () => {
  const b = createMission(2);
  run(b, 10);
  const g = gathering(b)[0];
  assert.ok(g, "a wave is gathering");
  // Mission 3 aims at your towers in turn.
  const o = b.outpost!;
  assert.ok(o.sites.some((s) => s.active && s.cell === g.target));
  const path = trail(b, g.from, g.target!);
  assert.equal(path.at(-1), g.target);
});
