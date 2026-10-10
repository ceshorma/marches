import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission } from "../src/tactics/campaign";
import { campSupported, placeTower, towerError } from "../src/tactics/outpost";
import { useTactics } from "../src/tactics/state";
const cell = (q: number, r: number) => r * 18 + q;
test("missions hand their unbuilt towers to the tray, with suggested spots", () => {
  const b = createMission(4);
  assert.equal(b.outpost!.kits, 2);
  assert.deepEqual(b.outpost!.suggested, [cell(9, 5), cell(11, 9)]);
  assert.equal(b.outpost!.sites.length, 1);
});
test("a tower goes near your land, apart from other towers, on open ground", () => {
  const b = createMission(0);
  // Next to the fort is too close; far out east is too far from the land.
  assert.equal(towerError(b, cell(4, 8)), "Demasiado cerca de otra torre");
  assert.equal(towerError(b, cell(13, 8)), "Lejos de tu tierra");
  // Any cell at the edge of the land will do, not only the suggested one.
  assert.equal(towerError(b, cell(6, 7)), null);
  assert.equal(placeTower(b, cell(6, 7)), null);
  assert.equal(b.outpost!.kits, 0);
  assert.equal(b.outpost!.sites[0].cell, cell(6, 7));
  assert.equal(b.outpost!.sites[0].active, false);
  assert.equal(towerError(b, cell(7, 8)), "No hay torres para colocar");
});
test("the rival camp needs one of your towers standing near it", () => {
  const b = createMission(5);
  assert.equal(campSupported(b), false);
  placeTower(b, cell(11, 9));
  b.outpost!.sites.at(-1)!.active = true;
  assert.equal(campSupported(b), true);
});
test("a tower picked up from the tray is placed by the next drop", () => {
  useTactics.setState({ scenario: "campaign", missionIndex: 0, unlocked: 0 });
  useTactics.getState().reset();
  const g = useTactics.getState();
  g.hold("tower");
  assert.equal(useTactics.getState().held, "tower");
  g.dropTower(cell(7, 8));
  assert.equal(useTactics.getState().held, null);
  assert.equal(useTactics.getState().battle.outpost!.sites.length, 1);
});
