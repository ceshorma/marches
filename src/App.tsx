import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Castle,
  ChevronDown,
  CircleHelp,
  Coins,
  Compass,
  Flag,
  Focus,
  Footprints,
  Layers,
  MapPin,
  MousePointer2,
  MoveUpRight,
  Pause,
  Play,
  Plus,
  Minus,
  RotateCcw,
  Shield,
  Swords,
  Wheat,
  X,
  Eye,
  TriangleAlert,
  Check,
  Clock3,
  Route,
  ChevronRight,
} from "lucide-react";
import Map from "./Map";
import { useGame } from "./store";
import { costs, recruitTime, typeNames } from "./world";
import type { UnitType, Posture, GameEvent } from "./world";
const terrainNames = {
  plain: "Pradera",
  forest: "Bosque · cobertura",
  mountain: "Montaña · infranqueable",
  water: "Río · infranqueable",
  bridge: "Paso transitable",
};
const factionNames = {
  ally: "Control aliado",
  enemy: "Control enemigo",
  neutral: "Territorio neutral",
};
const postureNames = {
  defend: "Defender",
  advance: "Avanzar",
  patrol: "Patrullar",
};
function UnitMark({
  type,
  enemy = false,
}: {
  type: UnitType;
  enemy?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`unit-mark ${type} ${enemy ? "enemy" : ""}`}
    />
  );
}
function MiniMap() {
  const w = useGame((s) => s.world);
  useGame((s) => s.version);
  return (
    <button
      className="minimap"
      aria-label="Centrar mapa completo"
      onClick={() => {
        useGame.getState().center(780, 540);
        useGame.getState().setZoom(0.6);
      }}
    >
      <svg viewBox="0 0 200 110" aria-hidden="true">
        <rect width="200" height="110" fill="#e7e6d8" />
        {w.cells
          .filter((c) => c.q % 2 === 0 && c.r % 2 === 0)
          .map((c) => (
            <rect
              key={c.id}
              x={c.x / 8}
              y={c.y / 10}
              width="8"
              height="6"
              fill={
                c.terrain === "water"
                  ? "#a8cedd"
                  : !c.explored
                    ? "#f2f0e7"
                    : c.owner === "ally"
                      ? "#aac4cb"
                      : c.owner === "enemy"
                        ? "#dcb6a6"
                        : c.terrain === "forest"
                          ? "#c2ceb5"
                          : "#dedecd"
              }
            />
          ))}
        {w.places
          .filter((p) => p.discovered)
          .map((p) => (
            <circle
              key={p.id}
              cx={w.cells[p.cell].x / 8}
              cy={w.cells[p.cell].y / 10}
              r="2.7"
              fill={
                p.faction === "ally"
                  ? "#397cac"
                  : p.faction === "enemy"
                    ? "#c8615a"
                    : "#737d70"
              }
            />
          ))}
      </svg>
      <span>LAS TIERRAS DE FRONTERA</span>
    </button>
  );
}
function App() {
  const s = useGame(),
    w = s.world;
  const [help, setHelp] = useState(false),
    [eventsOpen, setEventsOpen] = useState(false),
    [resetOpen, setResetOpen] = useState(false);
  const allies = w.units.filter((u) => u.faction === "ally"),
    controlled = w.cells.filter((c) => c.owner === "ally").length;
  const unit =
    s.selection?.kind === "unit"
      ? w.units.find((u) => u.id === s.selection?.id)
      : undefined;
  const place =
    s.selection?.kind === "place"
      ? w.places.find((p) => p.id === s.selection?.id)
      : undefined;
  const cell =
    s.selection?.kind === "cell" ? w.cells[Number(s.selection.id)] : undefined;
  const selectedEvent =
    s.selection?.kind === "event"
      ? w.events.find((e) => e.id === s.selection?.id)
      : undefined;
  const bridge = w.places.find((p) => p.id === "bridge")!;
  const detected = w.units.find((u) => u.faction === "enemy" && u.revealed);
  const day = 1 + Math.floor(w.time / 60);
  const zoomLabel =
    s.zoom < 0.7 ? "Estratégica" : s.zoom < 1.3 ? "Regional" : "Táctica";
  useEffect(() => {
    let last = performance.now(),
      acc = 0;
    const timer = setInterval(() => {
      const now = performance.now(),
        g = useGame.getState();
      const elapsed = Math.min((now - last) / 1000, 0.25);
      last = now;
      if (g.paused) {
        acc = 0;
        return;
      }
      acc += elapsed * g.speed;
      while (acc >= 0.1) {
        g.advance(0.1);
        acc -= 0.1;
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA"
      )
        return;
      const g = useGame.getState();
      if (e.code === "Space") {
        e.preventDefault();
        g.setPaused(!g.paused);
      }
      if (e.key === "Escape") {
        g.select(null);
        setHelp(false);
        setResetOpen(false);
      }
      if (["1", "2", "4"].includes(e.key)) g.setSpeed(Number(e.key));
      if (e.key.toLowerCase() === "h") {
        const u = g.world.units.find((u) => u.faction === "ally");
        if (u) g.center(u.x, u.y);
      }
      if (e.key.toLowerCase() === "m" && g.selection?.kind === "unit")
        g.setMode("move");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!s.toast) return;
    const t = setTimeout(() => s.notify(null), 4200);
    return () => clearTimeout(t);
  }, [s.toast]);
  const focusEvent = (e: GameEvent) => {
    s.select({ kind: "event", id: e.id });
    s.center(w.cells[e.cell].x, w.cells[e.cell].y);
    setEventsOpen(false);
  };
  const centerCompany = () => {
    const u = allies[0];
    if (u) {
      s.center(u.x, u.y);
      s.setZoom(1.15);
    }
  };
  const panel = !!(unit || place || cell || selectedEvent);
  return (
    <div className="game-shell">
      <header className="main-header">
        <div className="brand">
          <span className="brand-icon">
            <Flag size={19} strokeWidth={1.5} />
          </span>
          <h1>MARCHES</h1>
          <span className="prototype">ALPHA 0.1</span>
        </div>
        <div className="campaign">
          <span className="tiny-rule" />
          LAS TIERRAS DE FRONTERA
          <span className="tiny-rule" />
        </div>
        <div className="header-actions">
          <span className="season">Primavera, año I</span>
          <button
            className="icon-button"
            title="Cómo jugar"
            aria-label="Cómo jugar"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={19} />
          </button>
          <button
            className="icon-button"
            title="Reiniciar expedición"
            aria-label="Reiniciar expedición"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </header>
      <div className="command-bar">
        <div className="time-controls">
          <span className={`live-dot ${s.paused ? "paused" : ""}`} />
          <strong>Día {String(day).padStart(2, "0")}</strong>
          <span className="time-separator" />
          <button
            className={`icon-button pause ${s.paused ? "selected" : ""}`}
            title="Pausar o reanudar · Espacio"
            aria-label={s.paused ? "Reanudar" : "Pausar"}
            onClick={() => s.setPaused(!s.paused)}
          >
            {s.paused ? (
              <Play size={15} fill="currentColor" />
            ) : (
              <Pause size={15} fill="currentColor" />
            )}
          </button>
          {[1, 2, 4].map((n) => (
            <button
              key={n}
              className={`speed-button ${s.speed === n && !s.paused ? "active" : ""}`}
              onClick={() => s.setSpeed(n)}
            >
              {n}×
            </button>
          ))}
        </div>
        <div className="resources">
          <span title="Oro disponible para reclutar">
            <Coins size={16} />
            <strong>{w.gold}</strong>
            <small>oro</small>
          </span>
          <span title="Provisiones acumuladas">
            <Wheat size={17} />
            <strong>{w.supplies}</strong>
            <small>provisiones</small>
          </span>
          <i />
          <span>
            <Swords size={16} />
            <strong>{allies.length}</strong>
            <small>unidades</small>
          </span>
          <span title="Hexágonos bajo control aliado">
            <Flag size={16} />
            <strong>{controlled}</strong>
            <small>territorios</small>
          </span>
        </div>
        <button
          className={`layer-button ${s.layer === "influence" ? "active" : ""}`}
          onClick={s.setLayer}
        >
          <Layers size={15} />
          <span>{s.layer === "influence" ? "Influencia" : "Terreno"}</span>
          <ChevronDown size={13} />
        </button>
      </div>
      <main className={`map-area ${panel ? "has-panel" : ""}`}>
        <Map />
        <div className="map-vignette" />
        <section className="mission-card">
          <div className="eyebrow">
            <span className="chapter">01</span>LA PRIMERA MARCHA
          </div>
          <h2>
            {w.objectiveComplete ? "Un paso hacia el este" : "Asegura el paso"}
          </h2>
          <p>
            {w.objectiveComplete
              ? "El puente lleva tu estandarte. Mantén la posición y explora nuevas fronteras."
              : "El río divide la frontera. Toma el puente y abre el camino hacia el este."}
          </p>
          <button
            className={`mission-objective ${w.objectiveComplete ? "complete" : ""}`}
            onClick={() => {
              s.center(w.cells[bridge.cell].x, w.cells[bridge.cell].y);
              s.select({ kind: "place", id: "bridge" });
            }}
          >
            {w.objectiveComplete ? (
              <Check size={15} />
            ) : (
              <span className="objective-circle" />
            )}
            <span>
              {w.objectiveComplete
                ? "Puente del Vado asegurado"
                : "Controla el Puente del Vado"}
            </span>
            <ArrowUpRight size={14} />
          </button>
        </section>
        <div className="map-toolbox">
          <button
            className={s.mode === "select" ? "active" : ""}
            aria-label="Seleccionar"
            title="Seleccionar"
            onClick={() => s.setMode("select")}
          >
            <MousePointer2 size={18} />
          </button>
          <button
            className={s.mode === "move" ? "active" : ""}
            aria-label="Ordenar movimiento"
            title="Mover unidad seleccionada · M"
            onClick={() =>
              unit?.faction === "ally"
                ? s.setMode("move")
                : s.notify("Selecciona primero una unidad azul de tu compañía.")
            }
          >
            <Footprints size={20} />
          </button>
          <span />
          <button
            aria-label="Centrar en la compañía"
            title="Centrar en la compañía · H"
            onClick={centerCompany}
          >
            <Focus size={19} />
          </button>
        </div>
        <div className="compass-rose" aria-hidden="true">
          <span>N</span>
          <svg width="40" height="52" viewBox="0 0 40 52">
            <path d="M20 4L27 39L20 32L13 39Z" fill="#6c786e" />
            <path d="M20 4V32L13 39Z" fill="#f5f3ec" />
            <path d="M7 27H33M20 17V47" stroke="#6c786e" strokeWidth=".65" />
          </svg>
        </div>
        {!panel && detected && (
          <button
            className="world-signal"
            onClick={() => {
              s.select({ kind: "unit", id: detected.id });
              s.center(detected.x, detected.y);
            }}
          >
            <span className="signal-icon">
              <Eye size={17} />
            </span>
            <span>
              <strong>Movimiento al este</strong>
              <small>Patrulla enemiga detectada</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        )}
        {s.paused && (
          <div className="pause-banner">
            <Pause size={12} /> TIEMPO EN PAUSA
          </div>
        )}
        {s.mode === "move" && (
          <div className="order-banner">
            <MapPin size={16} />
            Elige un hexágono de destino
            <button
              onClick={() => s.setMode("select")}
              aria-label="Cancelar movimiento"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {panel && (
          <aside className="context-panel">
            <button
              className="panel-close icon-button"
              aria-label="Cerrar panel"
              onClick={() => s.select(null)}
            >
              <X size={18} />
            </button>
            {unit && (
              <>
                <div
                  className={`panel-emblem ${unit.faction === "enemy" ? "red" : ""}`}
                >
                  <UnitMark type={unit.type} enemy={unit.faction === "enemy"} />
                </div>
                <div className="eyebrow">
                  {unit.faction === "ally" ? "TU COMPAÑÍA" : "FUERZAS DEL ESTE"}
                </div>
                <h2>{unit.name}</h2>
                <div
                  className={`status-label ${unit.faction === "enemy" ? "red-text" : ""}`}
                >
                  <span />
                  {typeNames[unit.type]} ·{" "}
                  {unit.path.length
                    ? "En marcha"
                    : unit.attackCooldown > 0
                      ? "En combate"
                      : "En posición"}
                </div>
                <div className="health-row">
                  <span>Efectivos</span>
                  <strong>{Math.max(0, Math.ceil(unit.hp))}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${unit.hp}%` }} />
                </div>
                <div className="detail-row">
                  <span>Terreno</span>
                  <strong>{terrainNames[w.cells[unit.cell].terrain]}</strong>
                </div>
                <div className="detail-row">
                  <span>Región</span>
                  <strong>{w.cells[unit.cell].region}</strong>
                </div>
                {unit.isolated && (
                  <div className="warning">
                    <TriangleAlert size={16} />
                    Unidad aislada. Necesita apoyo.
                  </div>
                )}
                {unit.faction === "ally" ? (
                  <>
                    <div className="panel-divider" />
                    <h3>ÓRDENES</h3>
                    <button
                      className="primary-button"
                      onClick={() => s.setMode("move")}
                    >
                      <MoveUpRight size={17} />
                      Mover tropas<span>M</span>
                    </button>
                    <h3>POSTURA</h3>
                    <div className="postures">
                      {(["defend", "advance", "patrol"] as Posture[]).map(
                        (p) => (
                          <button
                            key={p}
                            className={unit.posture === p ? "active" : ""}
                            onClick={() => s.posture(unit.id, p)}
                          >
                            {p === "defend" ? (
                              <Shield size={18} />
                            ) : p === "advance" ? (
                              <Swords size={18} />
                            ) : (
                              <Route size={18} />
                            )}
                            <span>{postureNames[p]}</span>
                          </button>
                        ),
                      )}
                    </div>
                    <p className="panel-note">
                      {unit.posture === "defend"
                        ? "Mantiene su posición y ataca amenazas cercanas."
                        : unit.posture === "advance"
                          ? "Avanza hacia el objetivo y busca enemigos próximos."
                          : "Recorre los alrededores y vigila el territorio."}
                    </p>
                  </>
                ) : (
                  <p className="panel-note">
                    Esta patrulla sigue las rutas del este. Intercepta su avance
                    o protege el puente con tus tropas.
                  </p>
                )}
              </>
            )}
            {place && (
              <>
                <div className="panel-emblem">
                  <Castle size={30} strokeWidth={1.5} />
                </div>
                <div className="eyebrow">POSICIÓN ESTRATÉGICA</div>
                <h2>{place.name}</h2>
                <div
                  className={`status-label ${place.faction === "enemy" ? "red-text" : ""}`}
                >
                  <span />
                  {factionNames[place.faction]}
                </div>
                <p className="panel-description">
                  {place.kind === "bridge"
                    ? "El único cruce del río en esta región. Quien controla el vado decide el rumbo de la frontera."
                    : place.kind === "fort"
                      ? "Un punto de apoyo para tu compañía. Proyecta influencia y permite desplegar refuerzos."
                      : place.kind === "tower"
                        ? "Domina las alturas del norte y extiende tu influencia."
                        : "Un refugio que aporta recursos y afianza tu presencia en la región."}
                </p>
                {place.capture > 0 && (
                  <>
                    <div className="health-row">
                      <span>
                        {place.capturing === "ally"
                          ? "Asegurando posición"
                          : "Captura enemiga"}
                      </span>
                      <strong>{Math.floor(place.capture)}%</strong>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${place.capture}%`,
                          background:
                            place.capturing === "enemy"
                              ? "var(--red)"
                              : undefined,
                        }}
                      />
                    </div>
                  </>
                )}
                {place.threatened && (
                  <div className="warning">
                    <TriangleAlert size={17} />
                    Enemigos se aproximan a la posición.
                  </div>
                )}
                <div className="panel-divider" />
                {place.faction === "ally" && place.kind === "fort" ? (
                  <>
                    <h3>
                      DESPLEGAR REFUERZOS <span>{place.queue.length}/3</span>
                    </h3>
                    {(["infantry", "archer", "cavalry"] as UnitType[]).map(
                      (type) => (
                        <button
                          className="recruit-button"
                          key={type}
                          disabled={
                            w.gold < costs[type] || place.queue.length >= 3
                          }
                          onClick={() => s.recruit(place.id, type)}
                        >
                          <UnitMark type={type} />
                          <span>
                            <strong>{typeNames[type]}</strong>
                            <small>
                              {recruitTime[type]} s de reclutamiento
                            </small>
                          </span>
                          <span className="cost">
                            <Coins size={13} />
                            {costs[type]}
                          </span>
                          <Plus size={16} />
                        </button>
                      ),
                    )}
                    {place.queue.map((j, i) => (
                      <div className="recruit-job" key={`${i}-${j.type}`}>
                        <Clock3 size={13} />
                        <span>{typeNames[j.type]}</span>
                        <strong>
                          {i === 0 ? `${Math.ceil(j.remaining)} s` : "En cola"}
                        </strong>
                        <div
                          style={{
                            width: `${100 * (1 - j.remaining / j.total)}%`,
                          }}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <h3>
                      {place.faction === "ally"
                        ? "POSICIÓN ASEGURADA"
                        : "CÓMO CAPTURAR"}
                    </h3>
                    <p className="panel-note">
                      {place.faction === "ally"
                        ? "Esta posición expande tu influencia y aporta recursos cada 30 segundos."
                        : "Acerca una unidad aliada y mantén la zona libre de enemigos durante 13 segundos."}
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        if (allies[0]) {
                          s.select({ kind: "unit", id: allies[0].id });
                          s.setMode("move");
                        }
                      }}
                    >
                      <Footprints size={16} />
                      Dar una orden a la compañía
                    </button>
                  </>
                )}
              </>
            )}
            {cell && (
              <>
                <div className="panel-emblem">
                  <Layers size={28} />
                </div>
                <div className="eyebrow">LECTURA DEL TERRITORIO</div>
                <h2>{cell.region}</h2>
                <div className="status-label">
                  <span />
                  {cell.explored ? factionNames[cell.owner] : "Sin explorar"}
                </div>
                <div className="detail-row">
                  <span>Terreno</span>
                  <strong>{terrainNames[cell.terrain]}</strong>
                </div>
                <div className="detail-row">
                  <span>Coordenadas</span>
                  <strong>
                    {cell.q}, {cell.r}
                  </strong>
                </div>
                <div className="panel-divider" />
                <h3>INFLUENCIA</h3>
                <div className="influence-comparison">
                  <span style={{ flex: cell.ally + 0.1 }} />
                  <span style={{ flex: cell.enemy + 0.1 }} />
                </div>
                <div className="health-row">
                  <span>Aliada {cell.ally.toFixed(1)}</span>
                  <span>Enemiga {cell.enemy.toFixed(1)}</span>
                </div>
                <p className="panel-note">
                  La influencia se extiende desde posiciones y tropas cercanas.
                  Los bosques y las montañas ralentizan su avance.
                </p>
              </>
            )}
            {selectedEvent && (
              <>
                <div className="panel-emblem">
                  <Flag size={27} />
                </div>
                <div className="eyebrow">SEÑAL DEL MUNDO</div>
                <h2>{selectedEvent.title}</h2>
                <div className="status-label">
                  Día {1 + Math.floor(selectedEvent.time / 60)} ·{" "}
                  {Math.floor(selectedEvent.time % 60)} s
                </div>
                <p className="panel-description">{selectedEvent.detail}</p>
                <div className="panel-divider" />
                <button
                  className="secondary-button"
                  onClick={() =>
                    s.select({ kind: "cell", id: selectedEvent.cell })
                  }
                >
                  <Eye size={16} />
                  Inspeccionar territorio
                </button>
              </>
            )}
            <div className="panel-footer">
              <span className="blue-dot" />
              La frontera responde a tus decisiones.
            </div>
          </aside>
        )}
        <div className="map-bottom-left">
          <div className="legend">
            <span>
              <i className="ally" />
              Aliado
            </span>
            <span>
              <i className="enemy" />
              Enemigo
            </span>
            <span>
              <i className="neutral" />
              Neutral
            </span>
            <span>
              <i className="unknown" />
              Sin explorar
            </span>
          </div>
          <p>
            <MousePointer2 size={12} />
            Arrastra para explorar<span>·</span>Rueda para acercar
          </p>
        </div>
        <div className="company-dock">
          <button
            className="company-label"
            title="Centrar compañía"
            onClick={centerCompany}
          >
            <Flag size={17} />
            <span>
              TU COMPAÑÍA<small>{allies.length} unidades en campaña</small>
            </span>
          </button>
          <div className="unit-buttons">
            {allies.map((u, i) => (
              <button
                key={u.id}
                className={`unit-button ${unit?.id === u.id ? "selected" : ""}`}
                title={`${u.name} · ${Math.ceil(u.hp)}%`}
                aria-label={`Seleccionar ${u.name}`}
                onClick={() => {
                  s.select({ kind: "unit", id: u.id });
                  s.center(u.x, u.y);
                }}
              >
                <UnitMark type={u.type} />
                <small>{String(i + 1).padStart(2, "0")}</small>
                <span
                  className="unit-health"
                  style={{ width: `${u.hp * 0.65}%` }}
                />
              </button>
            ))}
          </div>
          <button
            className="recruit-shortcut"
            title="Reclutar en el fuerte"
            aria-label="Reclutar refuerzos"
            onClick={() => {
              s.select({ kind: "place", id: "fort" });
              s.center(
                w.cells[w.places[0].cell].x,
                w.cells[w.places[0].cell].y,
              );
            }}
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="navigation-cluster">
          <MiniMap />
          <div className="zoom-controls">
            <span>
              {zoomLabel}
              <small>{Math.round(s.zoom * 100)}%</small>
            </span>
            <button
              aria-label="Alejar mapa"
              onClick={() => s.setZoom(s.zoom / 1.25)}
            >
              <Minus size={16} />
            </button>
            <button
              aria-label="Acercar mapa"
              onClick={() => s.setZoom(s.zoom * 1.25)}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        {s.toast && (
          <div className="toast" role="status">
            <Compass size={16} />
            {s.toast}
            <button onClick={() => s.notify(null)} aria-label="Cerrar aviso">
              <X size={14} />
            </button>
          </div>
        )}
      </main>
      <footer className="event-bar">
        <button
          className="event-toggle"
          onClick={() => setEventsOpen(!eventsOpen)}
        >
          <span className="event-count">{w.events.length}</span>DIARIO DE
          CAMPAÑA
          <ChevronDown size={13} className={eventsOpen ? "rotated" : ""} />
        </button>
        <button
          className="latest-event"
          onClick={() => focusEvent(w.events[0])}
        >
          <span className={`event-dot ${w.events[0].kind}`} />
          <span>{w.events[0].title}</span>
          <small>{w.events[0].detail}</small>
          <ArrowUpRight size={14} />
        </button>
        <span className="seed-label">
          SEMILLA {w.seed}
          <span>·</span>UN MUNDO EN TUS DECISIONES
        </span>
      </footer>
      {eventsOpen && (
        <section className="event-log">
          <div>
            <h3>Diario de campaña</h3>
            <button
              className="icon-button"
              onClick={() => setEventsOpen(false)}
              aria-label="Cerrar diario"
            >
              <X size={16} />
            </button>
          </div>
          {w.events.map((e) => (
            <button key={e.id} onClick={() => focusEvent(e)}>
              <span className={`event-dot ${e.kind}`} />
              <span>
                <strong>{e.title}</strong>
                <small>{e.detail}</small>
              </span>
              <time>
                D{1 + Math.floor(e.time / 60)} ·{" "}
                {String(Math.floor(e.time % 60)).padStart(2, "0")}s
              </time>
              <ChevronRight size={15} />
            </button>
          ))}
        </section>
      )}
      {(help || resetOpen) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setHelp(false);
            setResetOpen(false);
          }}
        >
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="panel-close icon-button"
              aria-label="Cerrar"
              onClick={() => {
                setHelp(false);
                setResetOpen(false);
              }}
            >
              <X size={20} />
            </button>
            <Compass size={32} strokeWidth={1.2} />
            <div className="eyebrow">MANUAL DE CAMPAÑA</div>
            <h2 id="modal-title">
              {resetOpen
                ? "Una nueva expedición"
                : "Observa. Interpreta. Intervén."}
            </h2>
            {resetOpen ? (
              <>
                <p>
                  Volverás al comienzo de Valle Claro. Se perderán las órdenes y
                  los avances de esta expedición.
                </p>
                <button
                  className="primary-button"
                  onClick={() => {
                    s.reset();
                    setResetOpen(false);
                  }}
                >
                  Reiniciar expedición
                </button>
              </>
            ) : (
              <>
                <p>
                  La frontera está viva. Tus tropas y tus posiciones proyectan
                  influencia; el enemigo también avanza.
                </p>
                <ol>
                  <li>
                    <strong>Explora el mapa</strong>
                    <span>
                      Arrastra para desplazarte. Usa la rueda o +/− para pasar
                      de estrategia a táctica.
                    </span>
                  </li>
                  <li>
                    <strong>Da una orden</strong>
                    <span>
                      Selecciona una unidad azul, pulsa Mover tropas y elige un
                      hexágono. También puedes usar clic derecho.
                    </span>
                  </li>
                  <li>
                    <strong>Asegura el puente</strong>
                    <span>
                      Mantén tropas junto al Puente del Vado durante 13
                      segundos, sin enemigos próximos.
                    </span>
                  </li>
                  <li>
                    <strong>Refuerza la compañía</strong>
                    <span>
                      Selecciona el Fuerte del Alba y recluta unidades con tu
                      oro. Cambia su postura según la situación.
                    </span>
                  </li>
                </ol>
                <div className="shortcuts">
                  <span>
                    <kbd>Espacio</kbd>Pausar
                  </span>
                  <span>
                    <kbd>H</kbd>Compañía
                  </span>
                  <span>
                    <kbd>Esc</kbd>Cerrar
                  </span>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setHelp(false)}
                >
                  Volver a la frontera
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
export default App;
