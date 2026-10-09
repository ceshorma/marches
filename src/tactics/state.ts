import {
  createOutpost,
  createScout,
  updateOutpost,
  addReserveTroop,
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
import { createBattle, advance, order, hold } from "./model";
import type { Battle } from "./model";
type State = {
  battle: Battle;
  revision: number;
  selected: string | null;
  deployCell: number | null;
  placeTroop: (type: TroopType) => void;
  selectedBase: "ally" | "enemy" | null;
  deploy: (type?: TroopType) => void;
  paused: boolean;
  speed: number;
  zoom: number;
  focus: number;
  orienting: boolean;
  message: string | null;
  select: (id: string | null) => void;
  move: (cell: number) => void;
  rotate: (angle: number) => void;
  stop: () => void;
  tick: (dt: number) => void;

  reset: () => void;
  scenario: "fronts" | "village" | "campaign" | "outpost";
  missionIndex: number;
  unlocked: number;
  startMission: (index: number) => void;
  nextMission: () => void;
  switchScenario: () => void;
};
export const useTactics = create<State>((set, get) => ({
  battle: createOutpost(),
  scenario: "outpost",
  missionIndex: readProgress(),
  unlocked: readProgress(),
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
      set({ scenario: "fronts" });
      get().reset();
    }
  },
  revision: 0,
  selected: null,
  deployCell: null,
  selectedBase: null,
  paused: false,
  speed: 1,
  zoom: 1,
  focus: 0,
  orienting: false,
  message: null,
  select: (selected) =>
    set({
      selected,
      deployCell: null,
      selectedBase: null,
      orienting: false,
      message: null,
    }),
  placeTroop: (type) => {
    const s = get();
    if (s.deployCell === null) return;
    const message = addReserveTroop(s.battle, s.deployCell, type);
    set({
      message,
      revision: s.revision + 1,
      ...(!message
        ? { selected: s.battle.squads.find((u) => u.cell === s.deployCell)!.id }
        : {}),
    });
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
        deployCell: null,
        revision: s.revision + 1,
      });
  },
  rotate: (angle) => {
    const s = get(),
      u = s.battle.squads.find((u) => u.id === s.selected);
    if (u && !u.routing) {
      hold(u);
      if (u.progress > 0) u.pendingFacing = angle;
      else u.targetFacing = angle;
      set({ orienting: false, revision: s.revision + 1 });
    }
  },
  stop: () => {
    const s = get(),
      u = s.battle.squads.find((u) => u.id === s.selected);
    if (u && !u.routing) {
      hold(u);
      set({ revision: s.revision + 1 });
    }
  },
  tick: (dt) => {
    const s = get();
    if (
      !s.paused &&
      (!s.battle.lesson || s.battle.lesson.status === "active")
    ) {
      advance(s.battle, dt);
      updateMission(s.battle, dt);
      updateOutpost(s.battle, dt);
      if (s.battle.lesson?.status === "won") {
        const unlocked = Math.max(s.unlocked, Math.min(4, s.missionIndex + 1));
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
      deployCell: null,
      selectedBase: null,
      paused: false,
      speed: 1,
      zoom: 1,
      focus: get().focus + 1,
      orienting: false,
      message: null,
      revision: 0,
    }),
}));
