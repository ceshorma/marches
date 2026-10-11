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

test("malformed reports are rejected before replacing the current game", () => {
  const original = useTactics.getState().battle;
  const valid = JSON.parse(
    writeReport({
      scenario: "campaign",
      missionIndex: 0,
      battle: createMission(0),
    }),
  );
  const changes = [
    (r: any) => {
      r.version = 2;
    },
    (r: any) => {
      r.battle.cells = [];
    },
    (r: any) => {
      delete r.battle.squads;
    },
    (r: any) => {
      r.missionIndex = 100;
    },
    (r: any) => {
      r.battle.cells[0].id = 2;
    },
    (r: any) => {
      r.battle.outpost.land = [1];
    },
    (r: any) => {
      delete r.battle.outpost.reserve;
    },
    (r: any) => {
      r.battle.outpost.sites[0] = {
        cell: 999,
        progress: 0,
        active: false,
        builtAt: null,
      };
    },
    (r: any) => {
      r.battle.raids = [{ troop: { cell: -1 } }];
    },
  ];
  for (const change of changes) {
    const bad = structuredClone(valid);
    change(bad);
    assert.throws(() =>
      useTactics.getState().loadReport(readReport(JSON.stringify(bad))),
    );
    assert.equal(useTactics.getState().battle, original);
  }
  assert.throws(() => readReport('{"game":"marches","battle":{"cells":[]}}'));
});

test("reports round-trip every campaign mission and free-play map", async () => {
  const { missions } = await import("../src/tactics/campaign");
  const { createOutpost } = await import("../src/tactics/outpost");
  const { maps } = await import("../src/tactics/maps");
  const { createFrontsBattle } = await import("../src/tactics/fronts");
  const { createBattle } = await import("../src/tactics/model");
  const cases = [
    ...missions.map((_, i) => ({
      scenario: "campaign" as const,
      missionIndex: i,
      battle: createMission(i),
    })),
    ...Object.keys(maps).map((map) => ({
      scenario: "outpost" as const,
      missionIndex: 0,
      battle: createOutpost(map as keyof typeof maps),
    })),
    {
      scenario: "fronts" as const,
      missionIndex: 0,
      battle: createFrontsBattle(),
    },
    {
      scenario: "village" as const,
      missionIndex: 0,
      battle: createBattle(true),
    },
  ];
  for (const sample of cases) {
    assert.doesNotThrow(() => readReport(writeReport(sample)), sample.scenario);
  }
});
