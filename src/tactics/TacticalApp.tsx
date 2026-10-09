import { useEffect, useState } from "react";
import {
  Pause,
  Play,
  Plus,
  Minus,
  Focus,
  RotateCw,
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
    [help, setHelp] = useState(false);
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
      if ((e.target as HTMLElement).closest("button,input")) return;
      const g = useTactics.getState();
      if (e.code === "Space") {
        e.preventDefault();
        useTactics.setState({ paused: !g.paused });
      }
      if (e.key === "Escape") g.select(null);
      if (e.key.toLowerCase() === "r" && g.selected)
        useTactics.setState({ orienting: !g.orienting });
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
      <Board key={generation} />
      <header className="tactical-header">
        <div className="brand">
          MARCHES
          <span>
            {s.scenario === "fronts" ? "ESCENARIO AVANZADO" : "VALLE CLARO"}
          </span>
        </div>
        <div className="region">
          {s.scenario === "fronts"
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
            {s.scenario === "fronts"
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
      <div className="compass" aria-hidden="true">
        N<span>↑</span>
      </div>
      <div
        className={`squad-list ${s.scenario === "fronts" ? "expanded" : ""}`}
      >
        {s.battle.squads.map((u, i) => (
          <button
            key={u.id}
            aria-label={`Seleccionar ${u.name}`}
            className={s.selected === u.id ? "chosen" : ""}
            onClick={() => s.select(u.id)}
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
            <span>
              {unit.members.filter((m) => m === "shield").length} infantería ·{" "}
              {unit.members.filter((m) => m === "bow").length} arqueros
            </span>
          </div>
          <div
            className="mini-formation"
            aria-label="Formación orientada hacia la derecha"
          >
            {unit.members.map((m, i) => (
              <i
                key={i}
                className={m}
                style={{ gridColumn: i < 3 ? 2 : 1, gridRow: (i % 3) + 1 }}
              />
            ))}
          </div>
          <button
            disabled={unit.routing}
            aria-label="Orientar escuadrón"
            title="Orientar · R"
            className={s.orienting ? "chosen" : ""}
            onClick={() => useTactics.setState({ orienting: !s.orienting })}
          >
            <RotateCw size={20} />
            <span>Orientar</span>
          </button>
          <button
            disabled={unit.routing}
            aria-label="Mantener posición"
            className={unit.hold ? "chosen" : ""}
            onClick={() => s.stop()}
          >
            <Shield size={20} />
            <span>Mantener</span>
          </button>
          <button aria-label="Cerrar selección" onClick={() => s.select(null)}>
            <X size={17} />
          </button>
        </section>
      ) : (
        <div className="quiet-hint">
          {s.scenario === "fronts"
            ? ""
            : "Selecciona una tropa · intercepta la patrulla"}
        </div>
      )}
      {s.battle.sectors && !unit && !s.selectedBase && (
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
            <button
              aria-label="Desplegar refuerzos"
              disabled={
                s.battle.time < s.battle.bases.allyReady ||
                s.battle.squads.length >= 9
              }
              onClick={() => s.deploy()}
            >
              <Plus size={18} />
              <span>
                {s.battle.time < s.battle.bases.allyReady
                  ? `${Math.ceil(s.battle.bases.allyReady - s.battle.time)} s`
                  : "Desplegar"}
              </span>
            </button>
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
      {s.orienting && (
        <div className="orientation-hint">
          Señala hacia dónde mirar <span>Esc para cancelar</span>
        </div>
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
        {s.scenario === "fronts" && (
          <button
            aria-label="Abrir cuartel aliado"
            onClick={() =>
              useTactics.setState({ selected: null, selectedBase: "ally" })
            }
          >
            <Plus size={17} />
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
          {s.scenario === "fronts" ? "Ver inicio" : "Tres frentes"}
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
          <span>Seleccionar + destino, o arrastrar escuadrón</span>
          <span>Arrastrar terreno · mover cámara</span>
          <span>Rueda · zoom</span>
          <span>R · orientar &nbsp; Espacio · pausa &nbsp; H · centrar</span>
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
