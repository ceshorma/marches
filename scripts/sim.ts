// Balance check: plays every campaign mission with simple scripted players
// and prints how each went, and its rhythm: decisions per minute (weighty
// ones: a wave sets out, a special or a tower to place; chores: a troop or
// levy arriving), the longest quiet stretch and the most threats at once.
// Targets (docs/territorio.md): 2–4 weighty and 6–10 in all per minute, a
// valley of 25–40 s after each assault, at most 3 threats at once.
// Run with `npx tsx scripts/sim.ts`.
import {
  createMission,
  updateMission,
  missions,
} from "../src/tactics/campaign";
import { held, updateOutpost, waiting } from "../src/tactics/outpost";
import { advance } from "../src/tactics/model";
import { plain } from "../tests/player";
import type { Player } from "../tests/player";
const players: [string, Player | null][] = [
  ["simple", plain()],
  ["solo lanceros", plain(["shield"])],
  ["quieto", null],
];
for (const [label, player] of players) {
  console.log(`--- ${label}`);
  for (let i = 0; i < missions.length; i++) {
    const b = createMission(i);
    const seen = new Set<string>();
    let destroyed = 0,
      casualties = 0,
      looted = 0,
      maxYard = 0,
      minCohesion = 100,
      weighty = 0,
      chores = 0,
      peak = 0,
      lastEvent = 0,
      quiet = 0,
      arrivals = b.outpost!.arrivals,
      spawned = 0,
      specials = 0;
    const event = (weight: boolean) => {
      if (weight) weighty++;
      else chores++;
      quiet = Math.max(quiet, b.time - lastEvent);
      lastEvent = b.time;
    };
    for (let k = 0; k < 900 * 20 && b.lesson!.status === "active"; k++) {
      advance(b, 0.05);
      updateMission(b);
      updateOutpost(b, 0.05);
      if (player && k % 10 === 0) player(b);
      for (const f of b.fallen ?? []) {
        const key = `${f.side ?? "enemy"}${f.time}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (f.side === "ally") casualties++;
        else destroyed++;
      }
      for (const r of b.raids ?? [])
        if (r.outcome === "raided" && !seen.has(r.troop.id)) {
          seen.add(r.troop.id);
          looted++;
        }
      for (const u of b.squads)
        if (u.engaged) minCohesion = Math.min(minCohesion, u.cohesion ?? 100);
      maxYard = Math.max(maxYard, waiting(b.outpost!));
      const o = b.outpost!;
      // A levy is one decision, however many troops it brings.
      if (o.arrivals > arrivals) event(false);
      arrivals = o.arrivals;
      if (o.script!.spawned > spawned) event(true);
      spawned = o.script!.spawned;
      if ((o.specials?.length ?? 0) > specials) event(true);
      specials = o.specials?.length ?? 0;
      for (const r of b.raids ?? [])
        if (r.troop.engaged && !seen.has(`c${r.troop.id}`)) {
          seen.add(`c${r.troop.id}`);
          event(true);
        }
      peak = Math.max(
        peak,
        (b.raids ?? []).filter((r) => !r.slow && !r.guard).length,
      );
    }
    const o = b.outpost!;
    console.log(
      [
        `M${i + 1} ${b.lesson!.status.padEnd(6)} ${b.time.toFixed(0).padStart(3)}s`,
        `tierra ${held(b)}/${missions[i].goal ?? "-"}`,
        `oleadas ${o.script!.spawned}/${o.script!.waves.length}`,
        `destruidas ${destroyed} saqueos ${looted} bajas ${casualties}`,
        `torres caídas ${o.lostTowers} rechazadas ${o.turnedAway} patio máx ${maxYard}`,
        `cohesión mín ${minCohesion.toFixed(0)}`,
        `ritmo ${((weighty + chores) / (b.time / 60)).toFixed(1)}/min (peso ${(weighty / (b.time / 60)).toFixed(1)}) silencio ${Math.max(quiet, b.time - lastEvent).toFixed(0)}s amenazas ${peak}`,
      ].join(" · "),
    );
  }
}
