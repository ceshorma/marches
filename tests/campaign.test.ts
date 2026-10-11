import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMission,
  updateMission,
  missions,
  waveProgress,
} from "../src/tactics/campaign";
import {
  addReserveTroop,
  placeTower,
  updateOutpost,
  upcoming,
} from "../src/tactics/outpost";
import { advance, allTroops, order } from "../src/tactics/model";
import { plain } from "./player";
import { useTactics } from "../src/tactics/state";
type B = ReturnType<typeof createMission>;
const cell = (q: number, r: number) => r * 18 + q;
const run = (b: B, seconds: number, bot?: (b: B) => void) => {
  for (let i = 0; i < seconds * 20 && b.lesson!.status === "active"; i++) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
    if (bot && i % 10 === 0) bot(b);
    assert.equal(
      new Set(allTroops(b).map((u) => u.cell)).size,
      allTroops(b).length,
    );
  }
};
// A plain player: deploys whatever arrives, builds pending sites, keeps one
// squad on each post (the strongest on the camp) and sends the rest to the
// tower under attack.
const bot = plain();
test("campaign has six wave missions on the frontier map", () => {
  assert.equal(missions.length, 6);
  for (let i = 0; i < missions.length; i++) {
    const b = createMission(i);
    assert.ok(b.outpost!.script);
    assert.equal(b.lesson!.index, i);
    // Only the camp's garrison (mission 6) is on the map at the start.
    assert.equal(b.raids!.filter((r) => !r.guard).length, 0);
    assert.ok(waveProgress(b)!.total >= 2);
  }
});
test("the first mission's clock waits for the first squad, then shows what comes", () => {
  const b = createMission(0);
  run(b, 40);
  assert.equal(b.outpost!.script!.clock, null);
  assert.deepEqual(upcoming(b), []);
  // Meanwhile a lone scout walks in, very slowly.
  assert.ok(b.raids!.some((r) => r.slow));
  addReserveTroop(b, cell(4, 8), "shield");
  // The tower waits in the tray: place it, then the squad builds it.
  assert.equal(placeTower(b, cell(7, 8)), null);
  order(b, b.squads[0].id, cell(7, 8));
  run(b, 20);
  assert.ok(b.outpost!.sites[0].active);
  // The clock runs from the first squad: the waves are on their way.
  assert.ok(b.outpost!.script!.clock !== null);
  // A lone rider first: the starting lancers beat it.
  assert.ok(
    b.raids!.some((r) => !r.slow && r.troop.members.join() === "horse"),
  );
});
for (let i = 0; i < 6; i++)
  test(`mission ${i + 1} · a plain defence wins it`, () => {
    const b = createMission(i);
    run(b, 600, bot);
    assert.equal(
      b.lesson!.status,
      "won",
      `t=${b.time.toFixed(0)} resolved=${b.outpost!.resolved} lost=${b.outpost!.lostTowers} sacked=${b.outpost!.fortSacked}`,
    );
  });
for (const i of [1, 2, 3, 4, 5])
  test(`mission ${i + 1} · doing nothing loses it`, () => {
    const b = createMission(i);
    run(b, 600);
    assert.equal(b.lesson!.status, "lost");
  });
// Enemy archers shoot from two cells: lancers alone never reach them in time.
test("the wrong troops lose: lancers alone fall to the archers of mission 3", () => {
  const b = createMission(2);
  run(b, 600, plain(["shield"]));
  assert.equal(b.lesson!.status, "lost");
});
test("simultaneous waves arrive from opposite sides", () => {
  const b = createMission(4);
  run(b, 32);
  const froms = b.raids!.map((r) => r.home);
  assert.equal(b.raids!.length, 2);
  assert.notEqual(froms[0], froms[1]);
});
test("progress unlocks the next mission and finishing opens La frontera", () => {
  useTactics.setState({ scenario: "campaign", missionIndex: 0, unlocked: 0 });
  useTactics.getState().reset();
  useTactics.getState().nextMission();
  assert.equal(useTactics.getState().missionIndex, 0);
  useTactics.getState().startMission(2);
  assert.equal(useTactics.getState().missionIndex, 0);
  const g = useTactics.getState();
  for (let i = 0; i < 600 * 20 && g.battle.lesson!.status === "active"; i++) {
    g.tick(0.05);
    if (i % 10 === 0) bot(useTactics.getState().battle);
  }
  assert.equal(useTactics.getState().battle.lesson!.status, "won");
  assert.equal(useTactics.getState().unlocked, 1);
  g.nextMission();
  assert.equal(useTactics.getState().missionIndex, 1);
  assert.equal(useTactics.getState().paused, false);
  useTactics.setState({ missionIndex: 5, unlocked: 5 });
  useTactics.getState().reset();
  useTactics.getState().battle.lesson!.status = "won";
  useTactics.getState().nextMission();
  assert.equal(useTactics.getState().scenario, "outpost");
});
