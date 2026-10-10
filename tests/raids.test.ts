import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import {
  CAMP_HOLD,
  placeTower,
  settleLand,
  updateOutpost,
  waiting,
} from "../src/tactics/outpost";
import { adjacent, advance, casualty } from "../src/tactics/model";
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
// A full squad of riders standing on a cell, ready to fight.
const riders = (at: number): Squad => ({
  id: "riders",
  name: "Jinetes",
  cell: at,
  facing: Math.PI,
  targetFacing: Math.PI,
  members: Array(6).fill("horse"),
  path: [],
  progress: 0,
  hold: true,
  cohesion: 100,
});
// Mission 3: four archers set out from (16, 8) at 20 s.
const waveInContact = () => {
  const b = createMission(2);
  run(b, 20.1);
  const r = b.raids![0];
  r.troop.cell = cell(13, 8);
  r.troop.path = [];
  r.troop.progress = 0;
  b.squads.push(riders(cell(12, 8)));
  return { b, r };
};
test("a raid broken in battle is destroyed, not sent home", () => {
  const { b, r } = waveInContact();
  run(b, 30);
  assert.equal(r.phase, "gone");
  assert.equal(r.outcome, "protected");
  assert.ok(b.fallen!.some((f) => f.units.length === 4));
  assert.equal(b.outpost!.repelled, 1);
});
test("a destroyed raid's arms equip a new troop who walks in from the field", () => {
  const { b, r } = waveInContact();
  const before = b.outpost!.arrivals;
  run(b, 30);
  assert.ok(r.spoils);
  assert.ok(b.outpost!.arrivals > before);
  const spoils = b.outpost!.lastArrival;
  assert.ok(spoils);
  // Archers leave bows behind; the troop sets out from where they fell.
  assert.ok(waiting(b.outpost!) > 0);
});
test("raiders who got their loot can still be caught on the way home", () => {
  const b = createMission(2);
  run(b, 20.1);
  const r = b.raids![0];
  r.supplies = 0.01;
  r.phase = "loot";
  r.troop.cell = r.target!;
  r.troop.path = [];
  r.troop.progress = 0;
  run(b, 0.2);
  assert.equal(r.phase, "retreat");
  assert.equal(r.outcome, "raided");
  // Riders block the road home.
  const next = r.troop.path[0];
  r.troop.path = [];
  r.troop.progress = 0;
  b.squads.push(riders(next));
  run(b, 30);
  assert.equal(r.phase, "gone");
  assert.ok(r.fell !== undefined);
});

test("a broken squad loses the member on the side that was struck", () => {
  const b = createMission(0);
  const u = {
    ...riders(cell(5, 5)),
    members: ["shield", "shield", "bow", "bow"],
  } as Squad;
  b.squads.push(u);
  // Lancers stand in front, archers behind: a blow from behind costs an archer.
  u.lastZone = "rear";
  assert.equal(casualty(b, u), false);
  assert.deepEqual(u.members, ["shield", "shield", "bow"]);
  u.lastZone = "front";
  casualty(b, u);
  assert.deepEqual(u.members, ["shield", "bow"]);
  assert.equal(b.fallen!.filter((f) => f.side === "ally").length, 2);
});
test("a squad that loses its last member is gone", () => {
  const b = createMission(0);
  const u = { ...riders(cell(5, 5)), members: ["horse"] } as Squad;
  b.squads.push(u);
  assert.equal(casualty(b, u), true);
  assert.ok(!b.squads.includes(u));
});
test("mission 6: the camp's garrison must fall before the camp can be taken", () => {
  const b = createMission(5);
  const o = b.outpost!;
  const garrison = b.raids!.find((r) => r.guard)!;
  assert.ok(garrison);
  // The southern tower stands and a full squad stands on the camp.
  placeTower(b, cell(11, 9));
  for (const s of o.sites)
    Object.assign(s, { active: true, progress: 1, builtAt: -10 });
  settleLand(b);
  b.squads.push({ ...riders(o.camp!.cell), id: "holder" });
  // No waves for a long while: only the garrison defends the camp.
  o.script!.waves = o.script!.waves.map((w) => ({ ...w, at: w.at + 1e4 }));
  // At full strength it holds: contested, the taking crawls.
  run(b, CAMP_HOLD + 5);
  assert.equal(o.camp!.taken, false);
  // It does not march, loot or eat land: it fights where it stands.
  assert.equal(garrison.troop.path.length, 0);
  assert.equal(garrison.stolen, 0);
  assert.notEqual(garrison.phase, "loot");
  // Worn down, it falls to a fresh squad, and then the camp can be taken.
  garrison.troop.cohesion = 3;
  b.squads = b.squads.filter((u) => u.id !== "holder");
  b.squads.push({ ...riders(o.camp!.cell), id: "fresh" });
  run(b, CAMP_HOLD * 3);
  assert.equal(garrison.phase, "gone");
  assert.equal(o.camp!.taken, true);
});
test("a held entry point does not stop a wave: it forms right beside it", () => {
  const b = createMission(2);
  b.squads.push(riders(cell(16, 8)));
  run(b, 20.1);
  const r = b.raids!.find((x) => !x.guard)!;
  assert.ok(r);
  assert.ok(adjacent(cell(16, 8)).includes(r.home!));
});
test("a broken squad whose way out gets blocked regroups where it stands", () => {
  const b = createMission(2);
  run(b, 20.1);
  const r = b.raids!.find((x) => !x.guard)!;
  const u = b.squads[0];
  // Broken and heading for a cell the raid then steps onto.
  u.routing = true;
  u.cohesion = 0;
  u.path = [cell(5, 8)];
  u.progress = 0;
  r.troop.cell = cell(5, 8);
  r.troop.path = [];
  r.troop.progress = 0;
  run(b, 15);
  assert.equal(u.routing, false);
  assert.equal(u.path.length, 0);
});
test("a raid that cannot reach its held target sacks the ground beside it", () => {
  const b = createMission(2);
  run(b, 20.1);
  const r = b.raids!.find((x) => !x.guard)!;
  const target = r.target!;
  // A broken squad holds the target; the raid stands next to it, idle.
  const u = b.squads[0];
  u.cell = target;
  u.path = [];
  u.routing = true;
  u.cohesion = 0;
  const beside = adjacent(target).find(
    (id) =>
      !b.squads.some((s) => s.cell === id) && b.cells[id].terrain !== "rock",
  )!;
  r.troop.cell = beside;
  r.troop.path = [];
  r.troop.progress = 0;
  run(b, 40);
  assert.notEqual(r.outcome, "active");
});
