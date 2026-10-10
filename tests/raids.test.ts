import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import { updateOutpost, waiting } from "../src/tactics/outpost";
import { advance } from "../src/tactics/model";
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
