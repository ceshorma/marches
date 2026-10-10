import { test } from "node:test";
import assert from "node:assert/strict";
import { createMission, updateMission } from "../src/tactics/campaign";
import { updateOutpost } from "../src/tactics/outpost";
import { advance } from "../src/tactics/model";
import { readReport, writeReport } from "../src/tactics/report";
import { useTactics } from "../src/tactics/state";
type B = ReturnType<typeof createMission>;
const run = (b: B, seconds: number) => {
  for (let i = 0; i < seconds * 20 && b.lesson!.status === "active"; i++) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
  }
};
test("a report keeps the whole game, never-timers and unburnt cells included", () => {
  const b = createMission(4);
  run(b, 40);
  const text = writeReport({
    scenario: "campaign",
    missionIndex: 4,
    battle: b,
    note: "prueba",
  });
  const back = readReport(text);
  assert.equal(back.note, "prueba");
  assert.equal(back.battle.outpost!.nextRaid, Infinity);
  assert.equal(back.battle.outpost!.burning![0], -Infinity);
});
test("a loaded report plays on exactly like the original", () => {
  const a = createMission(4);
  run(a, 40);
  const b = readReport(
    writeReport({ scenario: "campaign", missionIndex: 4, battle: a }),
  ).battle as B;
  run(a, 30);
  run(b, 30);
  // Fields left undefined mean the same as absent, which is all JSON keeps.
  assert.deepEqual(
    JSON.parse(JSON.stringify(b)),
    JSON.parse(JSON.stringify(a)),
  );
});
test("loading a report puts that game on the board, paused", () => {
  const b = createMission(2);
  run(b, 25);
  useTactics
    .getState()
    .loadReport(
      readReport(
        writeReport({ scenario: "campaign", missionIndex: 2, battle: b }),
      ),
    );
  const g = useTactics.getState();
  assert.equal(g.missionIndex, 2);
  assert.equal(g.paused, true);
  assert.equal(g.battle.time, b.time);
});
test("anything else is refused", () => {
  assert.throws(() => readReport('{"hola": 1}'));
});
