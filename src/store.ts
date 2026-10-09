import { create } from "zustand";
import {
  initialWorld,
  moveUnit,
  patrolUnit,
  recruit,
  tick,
} from "./simulation";
import type { World, UnitType, Posture } from "./world";
export type Selection = {
  kind: "unit" | "place" | "cell" | "event";
  id: string | number;
} | null;
interface State {
  world: World;
  version: number;
  paused: boolean;
  speed: number;
  selection: Selection;
  mode: "select" | "move";
  layer: "influence" | "terrain";
  zoom: number;
  focus: { x: number; y: number; nonce: number } | null;
  toast: string | null;
  select: (s: Selection) => void;
  setPaused: (v: boolean) => void;
  setSpeed: (n: number) => void;
  setMode: (m: "select" | "move") => void;
  setLayer: () => void;
  setZoom: (z: number) => void;
  center: (x: number, y: number) => void;
  notify: (s: string | null) => void;
  advance: (dt: number) => void;
  move: (id: string, target: number) => void;
  recruit: (id: string, type: UnitType) => void;
  posture: (id: string, p: Posture) => void;
  reset: () => void;
}
export const useGame = create<State>((set, get) => ({
  world: initialWorld(),
  version: 0,
  paused: false,
  speed: 1,
  selection: null,
  mode: "select",
  layer: "influence",
  zoom: 0.85,
  focus: null,
  toast: null,
  select: (s) => set({ selection: s, mode: "select" }),
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed, paused: false }),
  setMode: (mode) => set({ mode }),
  setLayer: () =>
    set({ layer: get().layer === "influence" ? "terrain" : "influence" }),
  setZoom: (zoom) => set({ zoom: Math.max(0.42, Math.min(2.8, zoom)) }),
  center: (x, y) => set({ focus: { x, y, nonce: Date.now() } }),
  notify: (toast) => set({ toast }),
  advance: (dt) => {
    if (get().paused) return;
    tick(get().world, dt);
    set({ version: get().version + 1 });
  },
  move: (id, target) => {
    const error = moveUnit(get().world, id, target);
    set({
      version: get().version + 1,
      toast: error ?? "Orden recibida. La unidad se dirige al destino.",
      mode: "select",
    });
  },
  recruit: (id, type) => {
    const error = recruit(get().world, id, type);
    set({
      version: get().version + 1,
      toast: error ?? "Reclutamiento iniciado.",
    });
  },
  posture: (id, p) => {
    const w = get().world,
      u = w.units.find((u) => u.id === id);
    if (!u) return;
    if (p === "patrol") patrolUnit(w, u);
    else {
      u.posture = p;
      if (p === "defend") u.path = [];
    }
    set({ version: get().version + 1 });
  },
  reset: () =>
    set({
      world: initialWorld(),
      version: 0,
      paused: false,
      speed: 1,
      selection: null,
      mode: "select",
      focus: { x: 780, y: 570, nonce: Date.now() },
      toast: "Nueva expedición. La misma semilla, nuevas decisiones.",
    }),
}));
