import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Text } from "pixi.js";
import * as art from "./art";
import { TroopIcon } from "./icons";
import { troopTypes, troopNames } from "./combat";
// Development page (?sheet): every map asset drawn large on a hex, so the art
// can be reviewed and tuned in one place.
const R = 42;
const hex = (x: number, y: number, r = R) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 30) * Math.PI) / 180;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  }).flat();
type Entry = [string, (g: Graphics, x: number, y: number, t: number) => void];
const entries: Entry[] = [
  ["Roble", (g, x, y) => art.oak(g, x, y, 1.6, 4)],
  ["Tronco caído", (g, x, y) => art.fallenLog(g, x, y)],
  ["Frutales", (g, x, y) => art.orchard(g, x, y, 4)],
  ["Huerto", (g, x, y) => art.garden(g, x, y)],
  ["Almiares", (g, x, y) => art.haystacks(g, x, y)],
  ["Rebaño", (g, x, y) => art.sheep(g, x, y, 7)],
  ["Granero elevado", (g, x, y) => art.granary(g, x, y)],

  ["Fuerte", (g, x, y) => art.fort(g, x, y)],
  ["Torre", (g, x, y) => art.tower(g, x, y)],
  ["Obra 60 %", (g, x, y) => art.scaffold(g, x, y, 0.6)],
  ["Emplazamiento", (g, x, y) => art.emplacement(g, x, y)],
  ["Campamento", (g, x, y, t) => art.camp(g, x, y, t)],
  ["Torre rival", (g, x, y) => art.tower(g, x, y, art.P.enemy)],
  ["Bosque", (g, x, y) => art.forest(g, x, y, 3)],
  ["Pinar", (g, x, y) => art.forest(g, x, y, 5, true)],
  ["Rocas", (g, x, y) => art.rocks(g, x, y, 2)],
  ["Hierba", (g, x, y) => art.grass(g, x, y, 1)],
  ["Campo · trigo", (g, x, y) => art.field(g, x, y, 0)],
  ["Campo · verde", (g, x, y) => art.field(g, x, y, 1)],
  ["Campo · arado", (g, x, y) => art.field(g, x, y, 2)],
  ["Cabaña", (g, x, y) => art.house(g, x, y, 0)],
  ["Granero", (g, x, y) => art.house(g, x, y, 1)],
  ["Choza", (g, x, y) => art.house(g, x, y, 2)],
  ["Hogar", (g, x, y) => art.homestead(g, x, y, 4, 1, true, true)],
  ["Hogar 2", (g, x, y) => art.homestead(g, x, y, 11, 1, true, true)],
  [
    "Ardiendo",
    (g, x, y, t) => {
      art.homestead(g, x, y, 4, 0.5, true, false);
      art.fire(g, x, y, 0.9, t);
      art.smoke(g, x, y, t);
    },
  ],
  ["Calcinado", (g, x, y) => art.scorched(g, x, y, 1, 2)],
  ["Estandarte", (g, x, y, t) => art.clanBanner(g, x - 4, y + 14, 30, 1, t)],
  ["Campamento quieto", (g, x, y, t) => art.warCamp(g, x, y, 0.25, t)],
  ["Campamento 100 %", (g, x, y, t) => art.warCamp(g, x, y, 1, t)],
  ["Huellas", (g, x, y) => art.tracks(g, x, y, -0.4, 1, 5)],
  ["Incursión caída", (g, x, y) => art.fallen(g, x, y, 1, 3)],
  ["Desbandada", (g, x, y, t) => art.rout(g, x, y, (t % 1.5) / 1.5)],
  ["Botín", (g, x, y) => (art.sack(g, x - 8, y), art.sack(g, x + 8, y - 2))],
];
export default function Sheet() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  useEffect(() => {
    const app = new Application();
    let dead = false,
      cleanup = () => {};
    void (async () => {
      await app.init({
        width: window.innerWidth,
        height:
          Math.ceil(
            entries.length /
              Math.max(2, Math.floor(window.innerWidth / (100 * scale))),
          ) *
            110 *
            scale +
          50,
        background: 0xf5f3ec,
        antialias: true,
      });
      if (dead) return app.destroy(true);
      ref.current!.appendChild(app.canvas);
      cleanup = () => app.destroy(true, { children: true });
      const g = new Graphics();
      app.stage.addChild(g);
      const cols = Math.max(2, Math.floor(window.innerWidth / (100 * scale))),
        labels: Text[] = [];
      entries.forEach(([name], i) => {
        const t = new Text({
          text: name,
          style: { fontFamily: "Georgia", fontSize: 13, fill: 0x344750 },
        });
        t.anchor.set(0.5, 0);
        t.position.set(
          (i % cols) * 100 * scale + 50 * scale,
          Math.floor(i / cols) * 110 * scale + 100 * scale,
        );
        app.stage.addChild(t);
        labels.push(t);
      });
      app.ticker.add(() => {
        const time = performance.now() / 1000;
        g.clear();
        entries.forEach(([, draw], i) => {
          const cx = ((i % cols) * 100 + 50) / 1,
            cy = Math.floor(i / cols) * 110 + 50;
          g.poly(hex(cx, cy))
            .fill(0xefeadb)
            .stroke({ color: 0xaaa998, alpha: 0.5, width: 0.8 });
          draw(g, cx, cy, time);
        });
        g.scale.set(scale);
      });
    })();
    return () => {
      dead = true;
      cleanup();
    };
  }, [scale]);
  return (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto" }}>
      <div ref={ref} style={{ position: "relative" }} />
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          background: "#f8f6ef",
          padding: 10,
          borderRadius: 10,
          border: "1px solid #d7d7c9",
          fontFamily: "Arial",
          fontSize: 13,
        }}
      >
        {troopTypes.map((t) => (
          <span
            key={t}
            title={troopNames[t]}
            style={{ display: "flex", gap: 4 }}
          >
            <TroopIcon type={t} size={32} />
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 24,
                height: 24,
                background: "#326f97",
                borderRadius: 5,
                color: "#f4f0e3",
              }}
            >
              <TroopIcon type={t} size={18} className="on-token" />
            </span>
          </span>
        ))}
        <button onClick={() => setScale(scale === 2 ? 1 : 2)}>×{scale}</button>
      </div>
    </div>
  );
}
