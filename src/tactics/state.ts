import {
  createOutpost,
  createScout,
  updateOutpost,
  addReserveTroop,
  moveMember,
} from "./outpost";
import {
  createMission,
  updateMission,
  readProgress,
  saveProgress,
  missions,
} from "./campaign";
import type { TroopType } from "./combat";
import { createFrontsBattle, spawnReinforcement } from "./fronts";
import { create } from "zustand";
import { createBattle, advance, order } from "./model";
import type { Battle } from "./model";
type State = {
  battle: Battle;
  revision: number;
  selected: string | null;
  // A waiting troop picked up from the yard: the next tap places it.
  held: TroopType | null;
  hold: (type: TroopType | null) => void;
  arrange: (squad: string, from: number, to: number) => void;
  dropTroop: (cell: number, type: TroopType, slot?: number) => void;
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
      held: null,
      selectedBase: null,
      message: null,
    }),
  hold: (held) => set({ held, selected: null, selectedBase: null }),
  dropTroop: (cell, type, slot) => {
    const s = get(),
      message = addReserveTroop(s.battle, cell, type, slot);
    set({
      message,
      held: null,
      revision: s.revision + 1,
      ...(!message
        ? { selected: s.battle.squads.find((u) => u.cell === cell)!.id }
        : {}),
    });
  },
  arrange: (id, from, to) => {
    const s = get(),
      u = s.battle.squads.find((u) => u.id === id);
    if (!u) return;
    set({ message: moveMember(u, from, to), revision: s.revision + 1 });
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
  reset: () =>
    set({
      battle:
        get().scenario === "outpost"
          ? createOutpost()
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
