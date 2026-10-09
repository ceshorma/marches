import { create } from "zustand";
import { createBattle, advance, order, hold } from "./model";
import type { Battle } from "./model";
type State = {
  battle: Battle;
  revision: number;
  selected: string | null;
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
};
export const useTactics = create<State>((set, get) => ({
  battle: createBattle(true),
  revision: 0,
  selected: null,
  paused: false,
  speed: 1,
  zoom: 1,
  focus: 0,
  orienting: false,
  message: null,
  select: (selected) => set({ selected, orienting: false, message: null }),
  move: (cell) => {
    const s = get();
    if (s.selected)
      set({
        message: order(s.battle, s.selected, cell),
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
    if (!s.paused) {
      advance(s.battle, dt);
      set({ revision: s.revision + 1 });
    }
  },
  reset: () =>
    set({
      battle: createBattle(true),
      selected: null,
      paused: false,
      speed: 1,
      zoom: 1,
      focus: get().focus + 1,
      orienting: false,
      message: null,
      revision: 0,
    }),
}));
