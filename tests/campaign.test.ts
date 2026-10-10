import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMission,
  updateMission,
  missions,
  waveProgress,
} from "../src/tactics/campaign";
import { troopTypes } from "../src/tactics/combat";
import {
  addReserveTroop,
  deploymentError,
  updateOutpost,
  upcoming,
} from "../src/tactics/outpost";
import { adjacent, advance, allTroops, order } from "../src/tactics/model";
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
// squad on each post and sends the rest to the tower under attack.
function bot(b: B) {
  const o = b.outpost!;
  const posts = [
    ...o.sites.filter((s) => s.active).map((s) => s.cell),
    ...o.sites.filter((s) => !s.active).map((s) => s.cell),
  ];
  // Once the camp can be taken, the first (strongest) squad goes for it.
  if (o.camp && o.sites.some((s) => s.cell === o.camp!.needs && s.active))
    posts.unshift(o.camp.cell);
  for (const type of troopTypes)
    while (o.reserve[type] > 0) {
      const host = b.squads.find(
        (u) => u.members.length < 6 && !deploymentError(b, u.cell),
      );
      const free =
        b.squads.length <= posts.length
          ? adjacent(o.fort).find(
              (id) =>
                !deploymentError(b, id) && !b.squads.some((u) => u.cell === id),
            )
          : undefined;
      const at = free ?? host?.cell;
      if (at === undefined || addReserveTroop(b, at, type)) break;
    }
  const threatened = (b.raids ?? []).find(
    (r) => r.phase === "approach",
  )?.target;
  b.squads.forEach((u, i) => {
    if (u.path.length || u.engaged || u.routing) return;
    const post =
      i >= posts.length && threatened !== undefined
        ? threatened
        : posts[i % posts.length];
    if (u.cell === post || adjacent(post).includes(u.cell)) return;
    if (order(b, u.id, post))
      for (const n of adjacent(post)) if (!order(b, u.id, n)) break;
  });
}
test("campaign has six wave missions on the frontier map", () => {
  assert.equal(missions.length, 6);
  for (let i = 0; i < missions.length; i++) {
    const b = createMission(i);
    assert.ok(b.outpost!.script);
    assert.equal(b.lesson!.index, i);
    assert.equal(b.raids!.length, 0);
    assert.ok(waveProgress(b)!.total >= 2);
  }
});
test("the first mission's clock waits for the tower, then shows what comes", () => {
  const b = createMission(0);
  run(b, 40);
  assert.equal(b.outpost!.script!.clock, null);
  assert.deepEqual(upcoming(b), []);
  addReserveTroop(b, cell(4, 8), "shield");
  order(b, b.squads[0].id, cell(7, 8));
  run(b, 20);
  assert.ok(b.outpost!.sites[0].active);
  const next = upcoming(b);
  assert.equal(next[0].kind, "ally");
  const wave = next.find((e) => e.kind === "enemy")!;
  assert.deepEqual(wave.units, ["shield", "shield"]);
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
