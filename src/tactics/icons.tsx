import type { TroopType } from "./combat";
// One icon per troop type, shared by the map tokens (as vector paths) and the
// interface (as SVG): lance, bow, horse head. Drawn on a 20 × 20 box.
export const iconPaths: Record<TroopType, { d: string; fill?: boolean }[]> = {
  // A spear with a leaf-shaped head.
  shield: [
    { d: "M5 17 L14 8" },
    { d: "M13 4 L17 3 L16 7 L12.5 9.5 L10.5 7.5 Z", fill: true },
  ],
  // A bow with its string and an arrow.
  bow: [
    { d: "M6 3 Q17 10 6 17" },
    { d: "M6 3 L6 17" },
    { d: "M3 10 L15 10" },
    { d: "M15 10 L12.5 8 M15 10 L12.5 12" },
  ],
  // A horse head in profile.
  horse: [
    {
      d: "M5 17 L6 10 Q6 5 10 3.5 L11 2 L12 4 Q15 5 16.5 9 L16.5 11 L13.5 11 L12 9.5 L11 12 L11.5 17 Z",
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
