# MARCHES · Tres frentes

Prototipo de apertura: protege una aldea aliada de una patrulla visible en un tablero cenital de 18 × 12 hexágonos. React, TypeScript, PixiJS, Zustand y Vite; sin backend ni recursos gráficos externos.

## Escenario avanzado (inicio por defecto)

Una situación ya en marcha, con siete escuadrones aliados, seis rivales y cinco sectores. El reloj empieza en 04:00 para representar ese estado preparado. Hay dos órdenes aliadas iniciales; puedes reemplazarlas y movilizar las reservas.

- Norte: dos columnas presionan la altura defendida por un escuadrón.
- Centro: disputa del Paso del Roble, con apoyos de ambos bandos.
- Sur: avance sobre los campos y la aldea.
- Las columnas enemigas atacan, se repliegan, recuperan cohesión y vuelven a avanzar. Tras capturar una posición buscan otra.
- El color suave indica el balance de control; el color local más intenso muestra presencia. Tramas rojas señalan presión enemiga en territorio aliado o celdas disputadas.
- La bandera y el borde identifican al dueño del sector. Solo cambian al completar la captura, y persisten si se marchan las tropas.
- El control depende de presencia conectada alrededor de cada posición, limitada por rocas, bosque y desnivel. La transición del color es gradual dentro de cinco sectores prefijados; aún no es una campaña ni expansión libre celda por celda.
- Los cuarteles son puntos de despliegue. Selecciona el azul (o el botón + inferior) y despliega un escuadrón completo en una celda vecina libre; tarda 30 segundos en preparar el siguiente. El rojo envía su primer refuerzo a los 12 segundos y los siguientes cada 35. Cada bando tiene un máximo de nueve escuadrones en esta demostración.
- Capturar el sector del cuartel rival corta sus siguientes salidas; sus tropas existentes siguen activas. Si capturan el tuyo tampoco puedes desplegar.
- «Ver inicio» vuelve a la defensa de la aldea. «Tres frentes» recupera esta escena. Cambiar de escenario o reiniciarlo restablece su estado.

El módulo `src/tactics/fronts.ts` contiene este escenario, su IA y las reglas de presión/captura; `tests/fronts.test.ts` verifica evolución autónoma, exclusión de celdas, intervención y persistencia del control.

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

Tres alturas (0, +15, +30), un fuerte, una aldea y una torre. Los edificios son referencias del escenario; no tienen acciones todavía. La partida comienza con «Protege la aldea». Una patrulla avanza, toma suministros si llega sin oposición y se retira cuando pierde cohesión durante un enfrentamiento. Puedes interceptarla o interrumpir el saqueo. La bandera azul permanece: una incursión no cambia la propiedad. El resultado distingue aldea protegida y saqueada; reiniciar permite repetir la prueba. El contacto inicia ataques cada 1,35 segundos y desgaste de cohesión de ambos bandos. Las flechas y destellos corresponden a esos ataques. Un segundo escuadrón acelera el repliegue rival; retirar a los defensores permite que el enemigo continúe. Los aliados quebrados buscan una celda segura y se recuperan antes de aceptar nuevas órdenes. Este enfrentamiento simplificado aún no incluye bajas permanentes, ventajas de flanqueo, reclutamiento, captura ni influencia territorial.

## Organización

- `src/tactics/model.ts`: escenario determinista, rutas, ocupación y simulación a pasos fijos.
- `src/tactics/state.ts`: selección, órdenes y estado de interfaz.
- `src/tactics/Board.tsx`: render vectorial PixiJS, cámara y gestos.
- `src/tactics/TacticalApp.tsx`: controles React y reloj de simulación.
- `src/tactics/tactics.css`: interfaz responsive.
- `tests/tactics.test.ts`: diecisiete pruebas de reglas del nuevo modelo y la incursión.

El prototipo anterior se conserva en `src/App.tsx`, `src/Map.tsx`, `src/world.ts`, `src/store.ts` y `src/simulation.ts`; no se carga en la entrada actual. Su documentación está en `README-legacy.md` y sus doce pruebas siguen ejecutándose.

## Próximas entregas

2. Preparación en celdas del fuerte, composición y coste, despliegue temporizado, incursiones y saqueo con retirada.
3. Control persistente, presión militar transitoria, captura y ventajas de altura/frente/flanqueo.

Antes de ampliar el sistema, revisar tamaño de celda, lectura de composición y facilidad de orientación jugando con esta entrega.
