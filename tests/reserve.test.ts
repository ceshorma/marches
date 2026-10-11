import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createOutpost,
  addReserveTroop,
  deploymentError,
  updateOutpost,
} from "../src/tactics/outpost";
import { advance, order } from "../src/tactics/model";
test("reserve creates a squad at chosen cell and reinforces it up to capacity", () => {
  const b = createOutpost();
  assert.equal(addReserveTroop(b, 148, "shield"), null);
  assert.equal(b.outpost!.reserve.shield, 0);
  assert.equal(b.squads.length, 1);
  assert.ok(addReserveTroop(b, 148, "shield"));
  b.outpost!.reserve.bow = 6;
  for (let i = 0; i < 5; i++)
    assert.equal(addReserveTroop(b, 148, "bow"), null);
  assert.equal(b.squads.length, 1);
  assert.equal(b.squads[0].members.length, 6);
  assert.ok(addReserveTroop(b, 148, "bow"));
  assert.equal(b.outpost!.reserve.bow, 1);
});
test("remote cells and moving squads cannot consume reserve", () => {
  const b = createOutpost();
  assert.ok(addReserveTroop(b, 151, "shield"));
  assert.equal(b.outpost!.reserve.shield, 1);
  addReserveTroop(b, 148, "shield");
  b.outpost!.reserve.shield = 1;
  order(b, b.squads[0].id, 151);
  assert.ok(addReserveTroop(b, 148, "shield"));
  assert.equal(b.outpost!.reserve.shield, 1);
});
test("secured tower unlocks local deployment and destruction closes it", () => {
  const b = createOutpost(),
    site = b.outpost!.sites[0];
  assert.ok(deploymentError(b, site.cell));
  site.active = true;
  assert.equal(addReserveTroop(b, site.cell, "shield"), null);
  site.active = false;
  assert.ok(deploymentError(b, site.cell));
  assert.equal(b.squads.length, 1);
});
test("land yields troops that wait at the fort without forming squads", () => {
  const b = createOutpost();
  // The fort's own ring yields a levy of two troops every couple of minutes.
  for (let i = 0; i < 2600; i++) {
    advance(b, 0.05);
    updateOutpost(b, 0.05);
  }
  assert.equal(b.squads.length, 0);
  assert.deepEqual(b.outpost!.reserve, { shield: 2, bow: 1, horse: 0 });
});
