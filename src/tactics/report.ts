import { validReport } from "./report-validation";
import type { Battle } from "./model";
// A game report: everything needed to see and reload a game exactly as it
// was, in one file the player can send. The board adds a picture of the map.
export type Report = {
  game: "marches";
  version: 1;
  savedAt: string;
  scenario: "fronts" | "village" | "campaign" | "outpost";
  missionIndex: number;
  battle: Battle;
  // The map as the player saw it (PNG data URL), when available.
  image?: string;
  // What the player says happened.
  note?: string;
};
// JSON drops ±Infinity (used for "never" timers and "never burnt" cells).
const encode = (_: string, v: unknown) =>
  v === Infinity ? "∞" : v === -Infinity ? "-∞" : v;
const decode = (_: string, v: unknown) =>
  v === "∞" ? Infinity : v === "-∞" ? -Infinity : v;
export function writeReport(r: Omit<Report, "game" | "version" | "savedAt">) {
  const report: Report = {
    game: "marches",
    version: 1,
    savedAt: new Date().toISOString(),
    ...r,
  };
  return JSON.stringify(report, encode);
}
export function readReport(text: string): Report {
  const report = JSON.parse(text, decode) as Report;
  if (!validReport(report)) throw new Error("No es un informe de MARCHES");
  return report;
}
// The map picture, provided by the board while it is mounted.
let snapshot: (() => Promise<string>) | null = null;
export const setSnapshot = (take: (() => Promise<string>) | null) => {
  snapshot = take;
};
export const takeSnapshot = async () => {
  try {
    return snapshot ? await snapshot() : undefined;
  } catch {
    return undefined;
  }
};
