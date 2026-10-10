import type { TroopType } from "./combat";
// One icon per troop type, shared by the map tokens (as vector paths) and the
// interface (as SVG): lance, bow, horse head. Drawn on a 20 × 20 box.
export const iconPaths: Record<TroopType, { d: string; fill?: boolean }[]> = {
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
  type: TroopType;
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
