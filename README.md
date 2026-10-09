# MARCHES · Campo de maniobras

Prototipo de apertura: protege una aldea aliada de una patrulla visible en un tablero cenital de 18 × 12 hexágonos. React, TypeScript, PixiJS, Zustand y Vite; sin backend ni recursos gráficos externos.

## Ejecutar

Node.js 20.19+ o 22.12+.

```bash
npm install
npm run dev
```

Abrir http://localhost:5173. Para validar y compilar:

```bash
npm test
npm run build
npm run preview
```

## Interacción

- Seleccionar un escuadrón y pulsar una celda, o arrastrarlo al destino.
- La formación completa ocupa una celda. La punta azul indica el frente; escudos y lanzas están delante, arcos detrás.
- Orientar (R): pulsar una dirección del mapa. La formación gira gradualmente.
- Mantener: detiene las órdenes, terminando primero el paso en curso.
- Es posible cambiar destino en marcha. El nuevo recorrido empieza al finalizar el paso actual, sin saltos.
- Arrastrar terreno desplaza la cámara. Rueda y botones +/− hacen zoom.
- Espacio pausa; 1, 2 y 4 cambian velocidad; H encuadra el mapa; Escape cierra selección.
- En móvil se muestra un sector ampliado para poder tocar las tropas; arrastrar terreno permite recorrer el tablero.

## Reglas de esta entrega

Dos escuadrones con seis integrantes cada uno; composición fija para validar movimiento y orientación. Las rocas bloquean; el bosque y la subida ralentizan. Destinos, celdas ocupadas y siguientes pasos se reservan para impedir solapamientos. Ante un bloqueo dinámico se busca un desvío; si no existe, se espera.

Tres alturas (0, +15, +30), un fuerte, una aldea y una torre. Los edificios son referencias del escenario; no tienen acciones todavía. La partida comienza con «Protege la aldea». Una patrulla avanza, toma suministros si llega sin oposición y se retira cuando la presencia aliada acumula suficiente presión. Puedes interceptarla o interrumpir el saqueo. La bandera azul permanece: una incursión no cambia la propiedad. El resultado distingue aldea protegida y saqueada; reiniciar permite repetir la prueba. Este primer enfrentamiento simplificado aún no incluye bajas, ventajas de flanqueo, reclutamiento, captura ni influencia territorial.

## Organización

- `src/tactics/model.ts`: escenario determinista, rutas, ocupación y simulación a pasos fijos.
- `src/tactics/state.ts`: selección, órdenes y estado de interfaz.
- `src/tactics/Board.tsx`: render vectorial PixiJS, cámara y gestos.
- `src/tactics/TacticalApp.tsx`: controles React y reloj de simulación.
- `src/tactics/tactics.css`: interfaz responsive.
- `tests/tactics.test.ts`: trece pruebas de reglas del nuevo modelo y la incursión.

El prototipo anterior se conserva en `src/App.tsx`, `src/Map.tsx`, `src/world.ts`, `src/store.ts` y `src/simulation.ts`; no se carga en la entrada actual. Su documentación está en `README-legacy.md` y sus doce pruebas siguen ejecutándose.

## Próximas entregas

2. Preparación en celdas del fuerte, composición y coste, despliegue temporizado, incursiones y saqueo con retirada.
3. Control persistente, presión militar transitoria, captura y ventajas de altura/frente/flanqueo.

Antes de ampliar el sistema, revisar tamaño de celda, lectura de composición y facilidad de orientación jugando con esta entrega.
