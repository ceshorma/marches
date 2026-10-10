// Balance check: plays every campaign mission with simple scripted players
// and prints how each went. Run with `npx tsx scripts/sim.ts`.
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
      minCohesion = 100;
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
      ].join(" · "),
    );
  }
}
