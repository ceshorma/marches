import { deploymentError } from "./outpost";
import { missions, waveProgress } from "./campaign";
import { FormationGrid } from "./Formation";
import { TroopIcon } from "./icons";
import { activeRaids } from "./model";
import type { Battle } from "./model";
import { held, upcoming } from "./outpost";
import { composition, slotsOf, troopTypes, troopNames } from "./combat";
import type { TroopType } from "./combat";
import { useEffect, useState } from "react";
import {
  Pause,
  Play,
  Plus,
  Minus,
  Focus,
  Shield,
  X,
  RotateCcw,
  MousePointer2,
} from "lucide-react";
import Board from "./Board";
import { useTactics } from "./state";
import "./tactics.css";
export default function TacticalApp() {
  const s = useTactics(),
    [generation, setGeneration] = useState(0),
    [help, setHelp] = useState(false),
    [recruitType, setRecruitType] = useState<TroopType>("shield"),
    [picked, setPicked] = useState<number | null>(null);
  const outpost = s.battle.outpost;
  const lesson = s.battle.lesson,
    mission = lesson ? missions[lesson.index] : null;
  const unit = s.battle.squads.find((u) => u.id === s.selected);
  useEffect(() => {
    let last = performance.now(),
      acc = 0;
    const timer = setInterval(() => {
      const now = performance.now(),
        g = useTactics.getState();
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;
      if (g.paused) {
        acc = 0;
        return;
      }
      acc += dt * g.speed;
      while (acc >= 0.05) {
        g.tick(0.05);
        acc -= 0.05;
      }
    }, 25);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useTactics.getState().select(null);
        (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if ((e.target as HTMLElement).closest("button,input")) return;
      const g = useTactics.getState();
      if (e.code === "Space") {
        e.preventDefault();
        useTactics.setState({ paused: !g.paused });
      }
      if (e.key.toLowerCase() === "h")
        useTactics.setState({ focus: g.focus + 1, zoom: 1 });
      if (["1", "2", "4"].includes(e.key))
        useTactics.setState({ speed: Number(e.key) });
    };
    window.addEventListener("keydown", key);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (s.message) {
      const t = setTimeout(() => useTactics.setState({ message: null }), 3000);
      return () => clearTimeout(t);
    }
  }, [s.message]);
  return (
    <main className="tactical-game">
      <Board key={`${generation}-${s.scenario}-${s.missionIndex}`} />
      <header className="tactical-header">
        <div className="brand">
          MARCHES
          <span>
            {mission
              ? `${s.missionIndex + 1} / ${missions.length} · ${mission.name.toUpperCase()}`
              : outpost
                ? "LA FRONTERA"
                : s.scenario === "fronts"
                  ? "ESCENARIO AVANZADO"
                  : "VALLE CLARO"}
          </span>
        </div>
        <div className="region">
          {mission
            ? lesson?.status === "won"
              ? mission.success.toUpperCase()
              : lesson?.status === "lost"
                ? "REAGRUPA TUS FUERZAS"
                : mission.objective
            : outpost
              ? !s.battle.squads.length
                ? "FORMA TU PRIMER ESCUADRÓN"
                : activeRaids(s.battle).some((r) => r.phase !== "retreat")
                  ? "DEFIENDE TUS TORRES"
                  : outpost.sites.some((site) => site.active)
                    ? "EXTIENDE TU FRONTERA"
                    : "LEVANTA UNA TORRE"
              : s.scenario === "fronts"
                ? s.battle.sectors?.[4].owner === "ally"
                  ? "REFUERZOS RIVALES CORTADOS"
                  : s.battle.sectors?.[0].owner === "enemy"
                    ? "RECUPERA TU CUARTEL"
                    : "CORTA LOS REFUERZOS RIVALES"
                : s.battle.raid?.outcome === "protected"
                  ? "ALDEA PROTEGIDA"
                  : s.battle.raid?.outcome === "raided"
                    ? "ALDEA SAQUEADA"
                    : "PROTEGE LA ALDEA"}
          <span>
            {mission
              ? s.battle.time < 7
                ? mission.hint
                : ""
              : outpost
                ? !s.battle.squads.length
                  ? "Toca una celda azul junto al cuartel."
                  : !outpost.sites.some((site) => site.active)
                    ? "Lleva tu escuadrón a un emplazamiento marcado."
                    : "Las torres aseguran terreno. Tus tropas lo defienden."
                : s.scenario === "fronts"
                  ? `${s.battle.sectors?.filter((s) => s.owner === "ally").length} / 5 sectores · ${s.battle.squads.length} escuadrones`
                  : s.battle.raid?.outcome === "protected"
                    ? "La patrulla se retira"
                    : s.battle.raid?.outcome === "raided"
                      ? "Reinicia para intentarlo de nuevo"
                      : s.battle.raid?.phase === "loot"
                        ? "Están tomando los suministros"
                        : s.battle.raid?.phase === "fight"
                          ? "Combate · sostén la posición"
                          : "Una patrulla se aproxima"}
          </span>
          {outpost && <Timeline battle={s.battle} />}
        </div>
        <div className="clock">
          <span>
            {Math.floor(s.battle.time / 60)
              .toString()
              .padStart(2, "0")}
            :
            {Math.floor(s.battle.time % 60)
              .toString()
              .padStart(2, "0")}
          </span>
          <button
            aria-label={`Velocidad ${s.speed}×`}
            onClick={() =>
              useTactics.setState({
                speed: s.speed === 1 ? 2 : s.speed === 2 ? 4 : 1,
              })
            }
          >
            {s.speed}×
          </button>
          <button
            aria-label={s.paused ? "Reanudar" : "Pausar"}
            onClick={() => useTactics.setState({ paused: !s.paused })}
          >
            {s.paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </div>
      </header>
      <div
        className={`squad-list ${s.battle.squads.length > 3 ? "expanded" : ""}`}
      >
        {s.battle.squads.map((u, i) => (
          <button
            key={u.id}
            aria-label={`Seleccionar ${u.name}`}
            className={s.selected === u.id ? "chosen" : ""}
            onClick={() => {
              s.select(u.id);
              if (outpost && !deploymentError(s.battle, u.cell))
                useTactics.setState({ deployCell: u.cell });
            }}
          >
            <Shield size={17} />
            <span>
              {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][i]}
            </span>
            <small>{u.members.length}/6</small>
          </button>
        ))}
      </div>
      {unit ? (
        <section className="orders" aria-label="Órdenes de escuadrón">
          <div className="unit-title">
            <strong>{unit.name}</strong>
            {(unit.engaged || unit.routing) && (
              <span className="cohesion-readout">
                {unit.routing ? "Reagrupándose" : "Cohesión"} ·{" "}
                {Math.ceil(unit.cohesion ?? 100)}%
              </span>
            )}
            <span>{composition(unit)}</span>
          </div>
          <FormationGrid
            squad={unit}
            picked={picked}
            disabled={!!unit.engaged || unit.routing}
            onSlot={(slot) => {
              // Tap a member, then another slot, to reorder the formation.
              if (picked === null) {
                if (slotsOf(unit).includes(slot)) setPicked(slot);
              } else {
                if (slot !== picked) s.arrange(unit.id, picked, slot);
                setPicked(null);
              }
            }}
          />
          <button aria-label="Cerrar selección" onClick={() => s.select(null)}>
            <X size={17} />
          </button>
        </section>
      ) : (
        <div className="quiet-hint">
          {outpost
            ? ""
            : lesson
              ? ""
              : s.scenario === "fronts"
                ? ""
                : "Selecciona una tropa · intercepta la patrulla"}
        </div>
      )}
      {s.battle.sectors &&
        (!lesson || lesson.index >= 3) &&
        !unit &&
        !s.selectedBase && (
          <div className="sector-strip" aria-label="Control de sectores">
            {s.battle.sectors.map((sector) => (
              <div
                key={sector.id}
                title={`${sector.name}: ${sector.owner === "ally" ? "aliado" : sector.owner === "enemy" ? "enemigo" : "neutral"}`}
              >
                <span className={`sector-dot ${sector.owner}`} />
                <span>{sector.name}</span>
                <div className="sector-meter">
                  <i style={{ width: `${(sector.control + 1) * 50}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      {outpost && (
        // The waiting troops are drawn around the fort; this is for screen readers.
        <p className="sr-only" aria-live="polite">
          {`Esperando en el cuartel: ${troopTypes
            .map((t) => `${outpost.reserve[t]} ${troopNames[t].toLowerCase()}`)
            .join(", ")}`}
        </p>
      )}
      {s.selectedBase && s.battle.bases && (
        <section className="orders base-orders" aria-label="Cuartel">
          <div className="unit-title">
            <strong>
              {s.selectedBase === "ally"
                ? "Cuartel del Alba"
                : "Cuartel Carmesí"}
            </strong>
            <span>
              {s.selectedBase === "ally"
                ? s.battle.squads.length
                : s.battle.fronts!.length}{" "}
              / 9 escuadrones
            </span>
          </div>
          {s.battle.sectors![s.selectedBase === "ally" ? 0 : 4].owner !==
          s.selectedBase ? (
            <span>Salidas interrumpidas</span>
          ) : s.selectedBase === "ally" ? (
            <>
              <div className="recruit-types" aria-label="Tipo de refuerzo">
                {troopTypes.map((t) => (
                  <button
                    key={t}
                    aria-pressed={recruitType === t}
                    onClick={() => setRecruitType(t)}
                    className={recruitType === t ? "chosen" : ""}
                  >
                    {troopNames[t]}
                  </button>
                ))}
              </div>
              <button
                aria-label="Desplegar refuerzos"
                disabled={
                  s.battle.time < s.battle.bases.allyReady ||
                  s.battle.squads.length >= 9
                }
                onClick={() => s.deploy(recruitType)}
              >
                <Plus size={18} />
                <span>
                  {s.battle.time < s.battle.bases.allyReady
                    ? `${Math.ceil(s.battle.bases.allyReady - s.battle.time)} s`
                    : "Desplegar"}
                </span>
              </button>
            </>
          ) : (
            <span className="base-countdown">
              {s.battle.fronts!.length >= 9
                ? "Compañía completa"
                : `Próxima salida · ${Math.max(0, Math.ceil(s.battle.bases.enemyReady - s.battle.time))} s`}
            </span>
          )}
          <button
            aria-label="Cerrar cuartel"
            onClick={() => useTactics.setState({ selectedBase: null })}
          >
            <X size={17} />
          </button>
        </section>
      )}
      {lesson && lesson.status !== "active" && (
        <section className="mission-result" aria-label="Resultado de misión">
          <strong>
            {lesson.status === "won"
              ? mission!.success
              : outpost?.fortSacked
                ? "El cuartel ha sido saqueado"
                : mission!.failure}
          </strong>
          <button
            onClick={() => {
              if (lesson.status === "won") s.nextMission();
              else s.reset();
              setGeneration((g) => g + 1);
            }}
          >
            {lesson.status === "lost"
              ? "Reintentar"
              : lesson.index === missions.length - 1
                ? "Jugar La frontera"
                : "Siguiente misión"}{" "}
            →
          </button>
        </section>
      )}
      {lesson && (
        <nav className="campaign-steps" aria-label="Misiones">
          {missions.map((m, i) => (
            <button
              key={m.name}
              disabled={i > s.unlocked}
              aria-label={`Misión ${i + 1}: ${m.name}`}
              title={m.name}
              className={i === lesson.index ? "chosen" : ""}
              onClick={() => {
                s.startMission(i);
                setGeneration((g) => g + 1);
              }}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
      <div className="map-tools">
        <button
          aria-label="Centrar mapa"
          onClick={() => useTactics.setState({ focus: s.focus + 1, zoom: 1 })}
        >
          <Focus size={19} />
        </button>
        <button
          aria-label="Alejar mapa"
          onClick={() =>
            useTactics.setState({ zoom: Math.max(0.65, s.zoom / 1.2) })
          }
        >
          <Minus size={19} />
        </button>
        <button
          aria-label="Acercar mapa"
          onClick={() =>
            useTactics.setState({ zoom: Math.min(2.8, s.zoom * 1.2) })
          }
        >
          <Plus size={19} />
        </button>
      </div>
      <div className="utility">
        {s.battle.bases && (
          <button
            aria-label="Abrir cuartel aliado"
            onClick={() =>
              useTactics.setState({ selected: null, selectedBase: "ally" })
            }
          >
            <Plus size={17} />
          </button>
        )}
        {s.scenario !== "campaign" && (
          <button
            className="scenario-switch"
            aria-label="Abrir campaña"
            onClick={() => {
              s.openCampaign();
              setGeneration((g) => g + 1);
            }}
          >
            Campaña
          </button>
        )}
        <button
          className="scenario-switch"
          aria-label="Cambiar escenario"
          onClick={() => {
            s.switchScenario();
            setGeneration((g) => g + 1);
          }}
        >
          {s.scenario === "outpost" ? "Juego libre" : "La frontera"}
        </button>
        <button
          aria-label="Mostrar controles"
          className={help ? "chosen" : ""}
          onClick={() => setHelp(!help)}
        >
          <MousePointer2 size={17} />
        </button>
        <button
          aria-label="Reiniciar maniobras"
          title="Reiniciar maniobras"
          onClick={() => {
            s.reset();
            setGeneration((g) => g + 1);
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      {help && (
        <aside className="controls">
          <span>Arrastrar tropas del patio · desplegar</span>
          <span>Seleccionar + destino, o arrastrar escuadrón</span>
          <span>Arrastrar terreno · mover cámara</span>
          <span>Rueda · zoom</span>
          <span>
            Espacio · pausa &nbsp; H · centrar &nbsp; 1 2 4 · velocidad
          </span>
        </aside>
      )}
      {s.message && (
        <div className="tactical-toast" role="status">
          {s.message}
        </div>
      )}
    </main>
  );
}

// Upcoming enemy waves and friendly arrivals slide towards «now» on the left.
const SPAN = 60;
function Timeline({ battle }: { battle: Battle }) {
  const events = upcoming(battle).filter((e) => e.at <= SPAN);
  const progress = waveProgress(battle);
  const land = held(battle),
    goal = battle.lesson ? missions[battle.lesson.index].goal : undefined,
    // The bar runs a little past the goal so the mark sits inside it.
    scale = goal ? goal * 1.25 : Math.max(20, land);
  return (
    <div className="timeline" aria-label="Próximos eventos">
      <div
        className={`land-meter ${goal && land >= goal ? "met" : ""}`}
        aria-label={
          goal
            ? `Tierra ${land} de ${goal} casillas`
            : `Tierra ${land} casillas`
        }
      >
        <div className="bar">
          <i style={{ width: `${Math.min(1, land / scale) * 100}%` }} />
          {goal && <b style={{ left: `${(goal / scale) * 100}%` }} />}
        </div>
        <span>{goal ? `${land}/${goal}` : land}</span>
      </div>
      {progress && (
        <div
          className="wave-dots"
          aria-label={`Oleadas ${progress.done} de ${progress.total}`}
        >
          {Array.from({ length: Math.min(progress.total, 14) }, (_, i) => (
            <i key={i} className={i < progress.done ? "done" : ""} />
          ))}
        </div>
      )}
      <div className="track">
        <div className="now" />
        {events.map((e, i) => (
          <div
            key={i}
            className={`event ${e.kind}`}
            style={{ left: `${(e.at / SPAN) * 100}%` }}
            title={`${e.kind === "enemy" ? "Incursión" : "Refuerzo"} en ${Math.ceil(e.at)} s`}
          >
            {e.units.map((u, k) => (
              <TroopIcon key={k} type={u} size={13} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
