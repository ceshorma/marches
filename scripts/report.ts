// Reads a game report (saved from the pause menu) and prints what was on the
// board; with a number of seconds, plays on and prints it again.
// Usage: npx tsx scripts/report.ts informe.json [seconds]
import { readFileSync, writeFileSync } from "node:fs";
import { updateMission } from "../src/tactics/campaign";
import { held, updateOutpost } from "../src/tactics/outpost";
import { advance } from "../src/tactics/model";
import type { Battle } from "../src/tactics/model";
import { readReport } from "../src/tactics/report";
const [file, seconds] = process.argv.slice(2);
if (!file)
  throw new Error("Uso: npx tsx scripts/report.ts informe.json [segundos]");
const report = readReport(readFileSync(file, "utf8"));
const at = (b: Battle, id: number) => `(${id % 18},${Math.floor(id / 18)})`;
const show = (b: Battle) => {
  const o = b.outpost;
  console.log(
    `t=${b.time.toFixed(1)}s · ${report.scenario} ${report.missionIndex + 1} · ${b.lesson?.status ?? "-"}` +
      (o
        ? ` · tierra ${held(b)} · oleadas ${o.script?.spawned ?? "-"}/${o.script?.waves.length ?? "-"} resueltas ${o.resolved}`
        : ""),
  );
  for (const u of b.squads)
    console.log(
      `  ${u.name} ${at(b, u.cell)} [${u.members.join(" ")}] cohesión ${Math.round(u.cohesion ?? 100)}` +
        `${u.routing ? " ROUTING" : ""}${u.engaged ? ` vs ${u.engaged}` : ""}${u.path.length ? ` → ${u.path.map((p) => at(b, p)).join(" ")}` : ""}`,
    );
  for (const r of b.raids ?? [])
    console.log(
      `  ${r.troop.id} ${at(b, r.troop.cell)} ${r.phase}${r.guard ? " guarnición" : ""} objetivo ${r.target !== undefined ? at(b, r.target) : "-"} ` +
        `cohesión ${Math.round(r.troop.cohesion ?? 0)} botín ${Math.round(r.stolen)}${r.troop.path.length ? ` → ${r.troop.path.map((p) => at(b, p)).join(" ")}` : ""}`,
    );
  if (o?.sites.length)
    console.log(
      `  torres ${o.sites.map((s) => `${at(b, s.cell)}${s.active ? "" : ` ${Math.round(s.progress * 100)}%`}`).join(" ")} · en bandeja ${o.kits ?? 0}`,
    );
};
if (report.note) console.log(`Nota: ${report.note}`);
const b = report.battle;
show(b);
if (report.image) {
  const png = file.replace(/\.json$/, ".png");
  writeFileSync(png, Buffer.from(report.image.split(",")[1], "base64"));
  console.log(`Imagen: ${png}`);
}
if (seconds) {
  for (
    let i = 0;
    i < Number(seconds) * 20 && (!b.lesson || b.lesson.status === "active");
    i++
  ) {
    advance(b, 0.05);
    updateMission(b);
    updateOutpost(b, 0.05);
  }
  show(b);
}
