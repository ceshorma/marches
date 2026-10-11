import {
  createOutpost,
  createScout,
  updateOutpost,
  addReserveTroop,
  addSpecial,
  callAssault,
  placeTower,
  setStance,
} from "./outpost";
import type { SpecialKind, Stance } from "./units";
import {
  createMission,
  updateMission,
  readProgress,
  saveProgress,
  missions,
} from "./campaign";
import type { TroopType } from "./combat";
import type { Item } from "./outpost";
import type { Report } from "./report";
import type { MapName } from "./maps";
import { createFrontsBattle, spawnReinforcement } from "./fronts";
import { create } from "zustand";
import { createBattle, advance, order } from "./model";
import type { Battle } from "./model";
type State = {
  battle: Battle;
  revision: number;
  selected: string | null;
  // A waiting troop or tower picked up from the tray: the next tap places it.
  held: Item | null;
  hold: (item: Item | null) => void;
  dropTroop: (cell: number, type: TroopType) => void;
  dropTower: (cell: number) => void;
  dropSpecial: (cell: number, kind: SpecialKind) => void;
  // The selected squad's tactical action (none to stop it).
  act: (stance: Stance | null) => void;
  // Calls the next assault early, from a quiet valley.
  call: () => void;
  // Time runs slow while deciding: a troop in hand (dragged or held) or a
  // squad just selected (see SLOW).
  aiming: boolean;
  selectedAt: number;
  selectedBase: "ally" | "enemy" | null;
  deploy: (type?: TroopType) => void;
  paused: boolean;
  speed: number;
  zoom: number;
  focus: number;
  message: string | null;
  select: (id: string | null) => void;
  move: (cell: number) => void;
  tick: (dt: number) => void;

  reset: () => void;
  scenario: "fronts" | "village" | "campaign" | "outpost";
  missionIndex: number;
  unlocked: number;
  startMission: (index: number) => void;
  nextMission: () => void;
  switchScenario: () => void;
  openCampaign: () => void;
  // Map template for La frontera.
  mapName: MapName;
  setMap: (map: MapName) => void;
  // Puts a reported game back on the board, paused.
  loadReport: (report: Report) => void;
};
const progress = readProgress(),
  finished = progress >= missions.length,
  firstMission = Math.min(progress, missions.length - 1);
export const useTactics = create<State>((set, get) => ({
  battle: finished ? createOutpost() : createMission(firstMission),
  scenario: finished ? "outpost" : "campaign",
  missionIndex: firstMission,
  unlocked: progress,
  startMission: (index) => {
    if (index < 0 || index > get().unlocked || index >= missions.length) return;
    set({ scenario: "campaign", missionIndex: index });
    get().reset();
  },
  nextMission: () => {
    const s = get();
    if (s.battle.lesson?.status !== "won") return;
    if (s.missionIndex < missions.length - 1)
      s.startMission(s.missionIndex + 1);
    else {
      set({ scenario: "outpost" });
      get().reset();
    }
  },
  revision: 0,
  selected: null,
  held: null,
  selectedBase: null,
  paused: false,
  speed: 1,
  zoom: 1,
  focus: 0,
  message: null,
  select: (selected) =>
    set({
      selected,
      selectedAt: performance.now(),
      held: null,
      selectedBase: null,
      message: null,
    }),
  hold: (held) => set({ held, selected: null, selectedBase: null }),
  dropTroop: (cell, type) => {
    const s = get(),
      message = addReserveTroop(s.battle, cell, type);
    set({
      message,
      held: null,
      revision: s.revision + 1,
      ...(!message
        ? {
            selected: s.battle.squads.find((u) => u.cell === cell)!.id,
            selectedAt: performance.now(),
          }
        : {}),
    });
  },
  dropSpecial: (cell, kind) => {
    const s = get(),
      message = addSpecial(s.battle, cell, kind);
    set({
      message,
      held: null,
      revision: s.revision + 1,
      ...(!message
        ? {
            selected: s.battle.squads.find((u) => u.cell === cell)!.id,
            selectedAt: performance.now(),
          }
        : {}),
    });
  },
  call: () => {
    const s = get();
    set({ message: callAssault(s.battle), revision: s.revision + 1 });
  },
  aiming: false,
  selectedAt: 0,
  act: (stance) => {
    const s = get();
    if (!s.selected) return;
    set({
      message: setStance(s.battle, s.selected, stance),
      revision: s.revision + 1,
    });
  },
  dropTower: (cell) => {
    const s = get(),
      message = placeTower(s.battle, cell);
    set({ message, held: null, revision: s.revision + 1 });
  },
  deploy: (type = "shield") => {
    const s = get();
    const message = s.battle.outpost
      ? createScout(s.battle)
      : spawnReinforcement(s.battle, false, type);
    if (!message && s.battle.outpost)
      set({ selected: s.battle.squads.at(-1)!.id, selectedBase: null });
    if (!message && s.battle.lesson) s.battle.lesson.deployed = true;
    set({ message, revision: s.revision + 1 });
  },
  move: (cell) => {
    const s = get();
    if (s.selected)
      set({
        message: order(s.battle, s.selected, cell),
        revision: s.revision + 1,
      });
  },
  tick: (dt) => {
    const s = get();
    if (
      !s.paused &&
      (!s.battle.lesson || s.battle.lesson.status === "active")
    ) {
      advance(s.battle, dt);
      updateMission(s.battle);
      updateOutpost(s.battle, dt);
      if (s.battle.lesson?.status === "won") {
        const unlocked = Math.max(s.unlocked, s.missionIndex + 1);
        saveProgress(unlocked);
        set({ unlocked, paused: true, selected: null, selectedBase: null });
      }
      if (s.battle.lesson?.status === "lost")
        set({ paused: true, selected: null, selectedBase: null });
      set({ revision: s.revision + 1 });
    }
  },
  switchScenario: () => {
    const scenario = get().scenario === "fronts" ? "outpost" : "fronts";
    set({ scenario });
    get().reset();
  },
  openCampaign: () => {
    set({
      scenario: "campaign",
      missionIndex: Math.min(get().unlocked, missions.length - 1),
    });
    get().reset();
  },
  mapName: "llanura",
  setMap: (mapName) => {
    set({ mapName, scenario: "outpost" });
    get().reset();
  },
  loadReport: (report) =>
    set({
      battle: report.battle,
      scenario: report.scenario,
      missionIndex: report.missionIndex,
      selected: null,
      held: null,
      selectedBase: null,
      paused: true,
      zoom: 1,
      focus: get().focus + 1,
      message: null,
      revision: get().revision + 1,
    }),
  reset: () =>
    set({
      battle:
        get().scenario === "outpost"
          ? createOutpost(get().mapName)
          : get().scenario === "fronts"
            ? createFrontsBattle()
            : get().scenario === "campaign"
              ? createMission(get().missionIndex)
              : createBattle(true),
      selected: null,
      held: null,
      selectedBase: null,
      paused: false,
      speed: 1,
      zoom: 1,
      focus: get().focus + 1,
      message: null,
      revision: 0,
    }),
}));

// Slow time: how slow, and for how long after selecting a squad (ms).
export const SLOW = 0.3,
  SLOW_FOR = 3000;
export const slowed = (
  s: Pick<State, "aiming" | "held" | "selected" | "selectedAt">,
  now: number,
) => s.aiming || !!s.held || (!!s.selected && now - s.selectedAt < SLOW_FOR);
