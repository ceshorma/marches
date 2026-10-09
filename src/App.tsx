import { useEffect, useRef, useState } from "react";
import {
  Coins,
  Pause,
  Play,
  Plus,
  Minus,
  Focus,
  Shield,
  Swords,
  Route,
  X,
  MoreHorizontal,
  RotateCcw,
  CircleHelp,
  Layers,
  Flag,
  Heart,
  Castle,
  Footprints,
  Bell,
  Check,
  Hand,
  Square,
  ChevronRight,
} from "lucide-react";
import Map from "./Map";
import { useGame } from "./store";
import { costs, typeNames } from "./world";
import type { UnitType, Posture, GameEvent } from "./world";
import { availableTroops } from "./simulation";
function Mark({ type, enemy = false }: { type: UnitType; enemy?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mark ${type} ${enemy ? "enemy" : ""}`}
    />
  );
}
export default function App() {
  const s = useGame(),
    w = s.world;
  const [menu, setMenu] = useState(false),
    [help, setHelp] = useState(false),
    [reset, setReset] = useState(false),
    [journal, setJournal] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const allies = w.units.filter((u) => u.faction === "ally"),
    holdings = w.places.filter((p) => p.faction === "ally");
  const unit =
    s.selection?.kind === "unit"
      ? w.units.find((u) => u.id === s.selection?.id)
      : undefined;
  const place =
    s.selection?.kind === "place"
      ? w.places.find((p) => p.id === s.selection?.id)
      : undefined;
  const signal =
    s.selection?.kind === "event"
      ? w.events.find((e) => e.id === s.selection?.id)
      : undefined;
  const recent = w.events.filter(
    (e) =>
      e.kind === "capture" ||
      e.kind === "danger" ||
      e.title === "Refuerzos disponibles",
  );
  const last = recent[0];
  const center = () => {
    const u = allies[0] ?? w.cells[w.places[0].cell];
    s.center(u.x, u.y);
  };
  const locate = (e: GameEvent) => {
    const c = w.cells[e.cell];
    s.center(c.x, c.y);
    s.select({ kind: "event", id: e.id });
    setJournal(false);
  };
  useEffect(() => {
    let last = performance.now(),
      acc = 0;
    const timer = setInterval(() => {
      const now = performance.now(),
        g = useGame.getState(),
        dt = Math.min((now - last) / 1000, 0.25);
      last = now;
      if (g.paused) {
        acc = 0;
        return;
      }
      acc += dt * g.speed;
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
        ["INPUT", "TEXTAREA", "BUTTON"].includes(
          (e.target as HTMLElement).tagName,
        ) &&
        e.code === "Space"
      )
        return;
      const g = useGame.getState();
      if (e.code === "Space") {
        e.preventDefault();
        g.setPaused(!g.paused);
      }
      if (e.key === "Escape") {
        g.select(null);
        setMenu(false);
        setHelp(false);
        setReset(false);
        setJournal(false);
      }
      if (["1", "2", "4"].includes(e.key)) g.setSpeed(Number(e.key));
      if (e.key.toLowerCase() === "h") {
        const u = g.world.units.find((u) => u.faction === "ally");
        if (u) g.center(u.x, u.y);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!s.toast) return;
    const id = setTimeout(() => s.notify(null), 3200);
    return () => clearTimeout(id);
  }, [s.toast, s.notify]);
  useEffect(() => {
    if (!help && !reset) return;
    const previous = document.activeElement as HTMLElement;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, [help, reset]);
  return (
    <div className="game">
      <Map />
      <header className="hud">
        <div className="wordmark">MARCHES</div>
        <div className="time">
          <span>Día {1 + Math.floor(w.time / 60)}</span>
          <button
            aria-label={s.paused ? "Reanudar" : "Pausar"}
            title="Espacio"
            onClick={() => s.setPaused(!s.paused)}
          >
            {s.paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            className="speed"
            aria-label={`Velocidad ${s.speed}×`}
            title="Cambiar velocidad"
            onClick={() =>
              s.setSpeed(s.speed === 1 ? 2 : s.speed === 2 ? 4 : 1)
            }
          >
            {s.speed}×
          </button>
        </div>
        <div className="resources">
          <span title="Oro">
            <Coins size={16} />
            {w.gold}
          </span>
          {allies.length > 1 && (
            <span title="Unidades">
              <Swords size={16} />
              {allies.length}
            </span>
          )}
          <button aria-label="Opciones" onClick={() => setMenu(!menu)}>
            <MoreHorizontal size={20} />
          </button>
        </div>
      </header>
      {menu && (
        <nav className="menu">
          <button
            onClick={() => {
              s.setLayer();
              setMenu(false);
            }}
          >
            <Layers size={16} />
            {s.layer === "influence"
              ? "Ocultar influencia"
              : "Mostrar influencia"}
          </button>
          <button
            onClick={() => {
              setHelp(true);
              setMenu(false);
            }}
          >
            <CircleHelp size={16} />
            Gestos
          </button>
          <button
            onClick={() => {
              setReset(true);
              setMenu(false);
            }}
          >
            <RotateCcw size={16} />
            Volver a empezar
          </button>
        </nav>
      )}
      <div className="north" aria-hidden="true">
        N<span>↑</span>
      </div>
      {last && w.time - last.time < 8 && !s.selection && (
        <button className={`moment ${last.kind}`} onClick={() => locate(last)}>
          {last.kind === "capture" ? (
            <Flag size={16} />
          ) : last.kind === "danger" ? (
            <Swords size={16} />
          ) : (
            <Plus size={16} />
          )}
          <span>{last.title}</span>
        </button>
      )}
      {!s.hasMoved && !s.selection && w.time < 18 && (
        <div className="first-gesture">
          <Hand size={17} />
          <span>Traza un camino</span>
        </div>
      )}
      {allies.length > 1 && (
        <div className="company" aria-label="Tu compañía">
          {allies.map((u) => (
            <button
              key={u.id}
              aria-label={`Seleccionar ${u.name}`}
              title={u.name}
              className={unit?.id === u.id ? "active" : ""}
              onClick={() => {
                s.select({ kind: "unit", id: u.id });
                s.center(u.x, u.y);
              }}
            >
              <Mark type={u.type} />
              <i style={{ width: `${u.hp * 0.6}%` }} />
            </button>
          ))}
        </div>
      )}
      {(unit || place || signal) && (
        <section className="selection" aria-label="Selección">
          {unit && (
            <>
              <div className="selected-object">
                <Mark type={unit.type} enemy={unit.faction === "enemy"} />
                <span>{typeNames[unit.type]}</span>
                <small>
                  <Heart size={12} />
                  {Math.max(0, Math.ceil(unit.hp))}
                </small>
              </div>
              {unit.faction === "ally" && (
                <div className="actions">
                  {(holdings.length > 1 || allies.length > 1) &&
                    (["defend", "advance", "patrol"] as Posture[]).map((p) => (
                      <button
                        key={p}
                        aria-label={
                          p === "defend"
                            ? "Defender"
                            : p === "advance"
                              ? "Avanzar"
                              : "Patrullar"
                        }
                        title={
                          p === "defend"
                            ? "Defender"
                            : p === "advance"
                              ? "Avanzar"
                              : "Patrullar"
                        }
                        className={unit.posture === p ? "active" : ""}
                        onClick={() => s.posture(unit.id, p)}
                      >
                        {p === "defend" ? (
                          <Shield size={17} />
                        ) : p === "advance" ? (
                          <Swords size={17} />
                        ) : (
                          <Route size={17} />
                        )}
                      </button>
                    ))}
                  <button
                    aria-label="Detener unidad"
                    title="Detener"
                    onClick={() => s.posture(unit.id, "defend")}
                  >
                    <Square size={13} />
                  </button>
                </div>
              )}
            </>
          )}
          {place && (
            <>
              <div
                className={`selected-object ${place.faction === "enemy" ? "hostile" : ""}`}
              >
                <Castle size={19} />
                <span>{place.name}</span>
                {place.faction === "ally" && <Check size={14} />}
              </div>
              {place.capture > 0 && (
                <div
                  className="capture-progress"
                  role="progressbar"
                  aria-label="Captura"
                  aria-valuenow={Math.round(place.capture)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${place.capture}%` }} />
                </div>
              )}
              {place.faction === "ally" && place.kind === "fort" ? (
                <div className="recruitment">
                  {availableTroops(w).map((type) => (
                    <button
                      key={type}
                      aria-label={`Reclutar ${typeNames[type]}`}
                      title={`${typeNames[type]} · ${costs[type]} de oro`}
                      disabled={w.gold < costs[type] || place.queue.length >= 3}
                      onClick={() => s.recruit(place.id, type)}
                    >
                      <Mark type={type} />
                      <Plus size={13} />
                      <small>
                        <Coins size={11} />
                        {costs[type]}
                      </small>
                    </button>
                  ))}
                  {place.queue.length > 0 && (
                    <span
                      className="recruit-clock"
                      style={
                        {
                          "--progress": `${(1 - place.queue[0].remaining / place.queue[0].total) * 360}deg`,
                        } as React.CSSProperties
                      }
                      aria-label={`Reclutando, ${Math.ceil(place.queue[0].remaining)} segundos`}
                    >
                      <span>{Math.ceil(place.queue[0].remaining)}</span>
                    </span>
                  )}
                </div>
              ) : (
                place.faction !== "ally" &&
                allies[0] && (
                  <button
                    className="send-unit"
                    aria-label="Enviar unidad a esta posición"
                    title="Enviar unidad"
                    onClick={() => {
                      s.select({ kind: "unit", id: allies[0].id });
                      s.move(allies[0].id, place.cell);
                    }}
                  >
                    <Footprints size={18} />
                    <ChevronRight size={14} />
                  </button>
                )
              )}
            </>
          )}
          {signal && (
            <div className="selected-object">
              <Flag size={18} />
              <span>{signal.title}</span>
            </div>
          )}
          <button
            className="dismiss"
            aria-label="Cerrar selección"
            onClick={() => s.select(null)}
          >
            <X size={16} />
          </button>
        </section>
      )}
      <div className="navigation">
        <button
          aria-label="Centrar compañía"
          title="Centrar · H"
          onClick={center}
        >
          <Focus size={18} />
        </button>
        <span />
        <button
          aria-label="Acercar mapa"
          onClick={() => s.setZoom(s.zoom * 1.25)}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label="Alejar mapa"
          onClick={() => s.setZoom(s.zoom / 1.25)}
        >
          <Minus size={18} />
        </button>
      </div>
      {recent.length > 0 && (
        <button
          className={`journal-button ${journal ? "active" : ""}`}
          aria-label="Acontecimientos"
          title="Acontecimientos"
          onClick={() => setJournal(!journal)}
        >
          <Bell size={16} />
          {last && w.time - last.time < 10 && <i />}
        </button>
      )}
      {journal && (
        <div className="journal">
          {recent.slice(0, 6).map((e) => (
            <button key={e.id} onClick={() => locate(e)}>
              <span className={`event-dot ${e.kind}`} />
              <span>{e.title}</span>
              <small>{1 + Math.floor(e.time / 60)}</small>
            </button>
          ))}
        </div>
      )}
      {s.toast && (
        <div className="toast" role="status">
          {s.toast}
          <button aria-label="Cerrar aviso" onClick={() => s.notify(null)}>
            <X size={14} />
          </button>
        </div>
      )}
      {(help || reset) && (
        <div
          className="veil"
          onClick={() => {
            setHelp(false);
            setReset(false);
          }}
        >
          <section
            className="dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const buttons =
                  dialogRef.current?.querySelectorAll<HTMLButtonElement>(
                    "button",
                  );
                if (!buttons?.length) return;
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <button
              className="dialog-close"
              aria-label="Cerrar"
              onClick={() => {
                setHelp(false);
                setReset(false);
              }}
            >
              <X size={18} />
            </button>
            <h2 id="dialog-title">
              {reset ? "¿Volver al principio?" : "Gestos"}
            </h2>
            {reset ? (
              <>
                <p>Esta expedición se perderá.</p>
                <button
                  className="restart"
                  onClick={() => {
                    s.reset();
                    setReset(false);
                    setJournal(false);
                  }}
                >
                  Empezar de nuevo
                </button>
              </>
            ) : (
              <div className="gestures">
                <span>
                  <Route size={19} />
                  <span>Arrastra una unidad para moverla.</span>
                </span>
                <span>
                  <Hand size={19} />
                  <span>Arrastra el terreno para explorar.</span>
                </span>
                <span>
                  <Focus size={19} />
                  <span>Rueda para acercar. Espacio para pausar.</span>
                </span>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
