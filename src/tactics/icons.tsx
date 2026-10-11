import type { TroopType } from "./combat";
import type { SpecialKind } from "./units";
// One icon per troop type, shared by the map tokens (as vector paths) and the
// interface (as SVG): lance, bow, horse head; and a tower for the ones that
// wait in the tray to be placed. Drawn on a 20 × 20 box.
export const iconPaths: Record<
  TroopType | "tower" | SpecialKind,
  { d: string; fill?: boolean }[]
> = {
  // A knight's great helm with a plume.
  knights: [
    { d: "M5 18 L5 9 Q5 4 10 4 Q15 4 15 9 L15 18 Z", fill: true },
    { d: "M10 4 Q12 1 16 1.5" },
  ],
  // A scorpion: a heavy bow laid flat, its bolt pointing ahead.
  scorpion: [
    { d: "M2.5 8 Q10 14 17.5 8" },
    { d: "M10 18 L10 4" },
    { d: "M10 1.5 L7.6 5.5 L12.4 5.5 Z", fill: true },
    { d: "M6 18 L14 18" },
  ],
  // A war wagon: a boarded cart on two wheels.
  wagon: [
    { d: "M2 5 L18 5 L18 13 L2 13 Z", fill: true },
    {
      d: "M3.5 16 Q3.5 13.5 6 13.5 Q8.5 13.5 8.5 16 Q8.5 18.5 6 18.5 Q3.5 18.5 3.5 16 Z",
      fill: true,
    },
    {
      d: "M11.5 16 Q11.5 13.5 14 13.5 Q16.5 13.5 16.5 16 Q16.5 18.5 14 18.5 Q11.5 18.5 11.5 16 Z",
      fill: true,
    },
  ],
  // A hero: a crown.
  hero: [{ d: "M3 16 L3 6 L7 10 L10 3.5 L13 10 L17 6 L17 16 Z", fill: true }],
  // A spear behind a heater shield.
  shield: [
    { d: "M3 18 L16 5" },
    { d: "M16.2 4.8 L18.5 1.5 L15.2 3.8 Z", fill: true },
    {
      d: "M5.5 5.5 L14 5.5 L14 10.5 Q14 15 9.75 17.5 Q5.5 15 5.5 10.5 Z",
      fill: true,
    },
  ],
  // A bow drawn with an arrow nocked.
  bow: [
    { d: "M7 2.5 Q18 10 7 17.5" },
    { d: "M7 2.5 L4.5 10 L7 17.5" },
    { d: "M4.5 10 L16 10" },
    { d: "M18 10 L14.5 7.8 L14.5 12.2 Z", fill: true },
  ],
  // A tower with merlons and a dark door.
  tower: [
    {
      d: "M5 18.5 L5.6 7 L4 7 L4 2.5 L6.6 2.5 L6.6 4.5 L8.7 4.5 L8.7 2.5 L11.3 2.5 L11.3 4.5 L13.4 4.5 L13.4 2.5 L16 2.5 L16 7 L14.4 7 L15 18.5 Z",
      fill: true,
    },
  ],
  // A horse head in profile, ears up, facing right.
  horse: [
    {
      d: "M5 18.5 L6 12 Q6 7.5 9 5 L9.3 2 L11 4 L12 2.6 L12.8 4.6 Q15.8 6 17.6 9.6 Q18.4 11.4 16.8 12.2 L14.4 12.4 Q13 12.4 12.4 13.6 L12 15.4 L13.4 18.5 Z",
      fill: true,
    },
  ],
};
export function TroopIcon({
  type,
  size = 18,
  className,
}: {
  type: TroopType | "tower" | SpecialKind;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      className={`troop-icon ${type} ${className ?? ""}`}
      aria-hidden="true"
    >
      {iconPaths[type].map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={p.fill ? 1 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
