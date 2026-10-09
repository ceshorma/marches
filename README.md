# MARCHES

Prototipo jugable de estrategia territorial y RPG táctico. React 19, TypeScript, Vite 6, PixiJS 8 y Zustand. Toda la simulación se ejecuta en el navegador: no hay backend, cuentas ni recursos gráficos externos.

## Iniciar localmente

Requiere Node.js 20.19+ o 22.12+.

```bash
cd /workspace/marches
npm install
npm run dev
```

Abre la dirección que imprime Vite (normalmente http://localhost:5173). En otra máquina, entra en el directorio donde hayas copiado el proyecto.

```bash
npm test        # Pruebas deterministas de las reglas de simulación
npm run build  # Comprobación TypeScript y compilación de producción
npm run preview # Servir la compilación de producción
```

## Escenario de prueba

1. Observa cómo la patrulla roja se acerca al Puente del Vado.
2. Selecciona la Guardia del Alba en el mapa o en la barra de compañía.
3. Pulsa **Mover tropas** y selecciona un hexágono junto al puente; también funciona el clic derecho sobre el destino.
4. Envía arqueros y caballería para apoyar a la infantería.
5. Selecciona el Fuerte del Alba o el botón **+** de la compañía para reclutar refuerzos. Cada unidad consume oro y ocupa un turno en la cola.
6. Mantén unidades a menos de dos hexágonos del puente durante unos 13 segundos, sin enemigos en la zona. Aparece un anillo de captura; el color y la influencia cambian al completarse.
7. Acerca el mapa para ver la grilla, cobertura, área local de movimiento y alcance de combate. Aleja para observar territorios y compañías agregadas.
8. Selecciona señales, posiciones o entradas del diario para interpretar lo ocurrido.

## Controles

| Acción                      | Control                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| Desplazar cámara            | Arrastrar con ratón o dedo                                         |
| Zoom continuo               | Rueda o botones + / −                                              |
| Seleccionar                 | Clic / toque en unidad, edificio o hexágono                        |
| Movimiento                  | Botón Mover tropas, tecla M o clic derecho con unidad seleccionada |
| Pausar / reanudar           | Espacio o botón de pausa                                           |
| Velocidad                   | Botones 1×, 2×, 4× o teclas 1, 2, 4                                |
| Centrar compañía            | H o control de enfoque                                             |
| Cerrar selección / cancelar | Escape                                                             |
| Alternar influencia         | Botón Influencia / Terreno                                         |
| Reiniciar                   | Botón de reinicio, con confirmación                                |

## Reglas implementadas

- Mundo de 50 × 40 hexágonos generado con semilla `24300`, cinco regiones, río, caminos, bosques, montañas y pasos.
- Un mundo y una cámara: el detalle cambia progresivamente con la escala. A gran distancia, unidades aliadas cercanas se agregan visualmente.
- Tiempo fijo de simulación de 100 ms; velocidades 1×, 2× y 4×. Un día equivale a 60 segundos de simulación.
- Movimiento por A* sobre seis vecinos, con mayor coste en bosques. Agua y montañas impiden el movimiento; los puentes permiten cruzar.
- Tres unidades iniciales aliadas, patrullas enemigas automáticas y una unidad enemiga oculta en el bosque.
- Combate automático sencillo, alcance mayor para arqueros, cobertura en bosque y daño de guarnición en fortalezas.
- Defender mantiene la posición; avanzar busca enemigos próximos cuando termina la ruta; patrullar recorre un circuito local.
- Reclutamiento secuencial de infantería, arqueros y caballería, con un máximo de tres órdenes en cola. Perder el fuerte cancela su cola.
- Capturas disputadas por presencia, progresos visibles e influencia que converge gradualmente y se extiende por hexágonos conectados, con resistencia del terreno y del enemigo.
- Exploración permanente: caballería revela un radio mayor. Una vez revelada una zona, los enemigos que la atraviesan son visibles.
- Amenazas, descubrimientos, unidades aisladas, llegadas de refuerzos y combates generan señales a partir de estados reales.
- Las posiciones aliadas producen oro y provisiones cada 30 segundos. Las provisiones son un contador de suministros en esta primera versión; el reclutamiento consume oro.

## Arquitectura

- `src/world.ts`: tipos, geometría hexagonal, semilla, generación, vecinos y búsqueda de rutas.
- `src/simulation.ts`: avance temporal, combate, capturas, reclutamiento, exploración, influencia y acontecimientos.
- `src/store.ts`: estado Zustand y comandos de la interfaz.
- `src/Map.tsx`: capas PixiJS, símbolos vectoriales, cámara, zoom, selección y rutas.
- `src/App.tsx`: controles, paneles contextuales, diario y manual de campaña.
- `src/style.css`: interfaz adaptable.
- `tests/simulation.test.ts`: comprobaciones de reglas y determinismo.

## Alcance y limitaciones

Es un prototipo inicial: combate y economía deliberadamente sencillos, sin inventario, habilidades, diálogos ni multijugador. La partida vive en memoria y se reinicia al recargar. El mapa necesita WebGL en el navegador; en dispositivos táctiles se usan los botones para el zoom. Las unidades pueden compartir un hexágono y el campo `occupant` indica la última unidad registrada en él; no hay bloqueo físico entre unidades. El área táctica indica proximidad de movimiento y alcance, no puntos de acción de un sistema por turnos.

## Validación realizada

- Compilación de producción y comprobación de tipos.
- Pruebas de semilla, conectividad, patrullas, reclutamiento, movimiento, capturas disputadas, expansión de influencia, guarniciones y determinismo.
- Revisión en Chromium a 1440 × 960 y 390 × 844: lienzo, selección, órdenes, reclutamiento, pausa y ausencia de desbordamiento horizontal.
