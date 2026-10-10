import { slotsOf, troopNames } from "./combat";
import type { TroopType } from "./combat";
import { TroopIcon } from "./icons";
import type { Squad } from "./model";
// The squad seen facing right: back column on the left, front on the right.
// Rows top to bottom: left flank, centre, right flank.
const rows = [
  [3, 0],
  [4, 1],
  [5, 2],
];
const place = (slot: number) =>
  `${slot < 3 ? "Frente" : "Atrás"}, ${["flanco izquierdo", "centro", "flanco derecho"][slot % 3]}`;
export function FormationGrid({
  squad,
  picked,
  ghost,
  onSlot,
  disabled,
}: {
  squad?: Squad;
  picked: number | null;
  // Troop type an empty slot would receive, previewed on hover.
  ghost?: TroopType | null;
  onSlot: (slot: number) => void;
  disabled?: boolean;
}) {
  const slots = squad ? slotsOf(squad) : [];
  return (
    <div className="formation" role="group" aria-label="Formación">
      <span className="formation-head">Atrás</span>
      <span className="formation-head">Frente ▸</span>
      {rows.flat().map((slot) => {
        const i = slots.indexOf(slot),
          type = i >= 0 ? squad!.members[i] : null;
        return (
          <button
            key={slot}
            disabled={disabled}
            className={`slot ${type ? `filled ${type}` : "empty"} ${picked === slot ? "chosen" : ""}`}
            aria-label={`${place(slot)}: ${type ? troopNames[type] : "libre"}`}
            onClick={() => onSlot(slot)}
          >
            {type ? (
              <TroopIcon type={type} size={20} />
            ) : ghost ? (
              <TroopIcon type={ghost} size={20} className="ghost" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
