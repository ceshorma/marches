# MARCHES

Prototipo táctico en React, TypeScript, Vite, PixiJS y Zustand. Sin backend, cuentas ni assets externos.

## Iniciar

Node.js 20.19+ o 22.12+.

```bash
npm install
npm run dev
```

Abre http://localhost:5173, o la dirección que indique Vite.

```bash
npm test
npm run build
npm run preview
```

## Un comienzo pequeño

La expedición comienza con un fuerte, una unidad, 35 de oro y un pequeño territorio conocido. Una aldea cercana ofrece la primera expansión. El resto del mundo continúa su simulación, oculto hasta explorarlo.

- Arrastra la unidad hacia un destino: aparece su recorrido y empieza a caminar.
- También puedes seleccionar la unidad y pulsar un destino.
- Arrastra el terreno para mover la cámara; rueda o +/− para acercarte.
- Mantener una unidad junto a una posición neutral durante unos 13 segundos la captura si no hay enemigos cerca. El anillo indica el progreso.
- La primera captura de cada posición aporta 45 de oro y extiende la influencia.
- Selecciona el fuerte para reclutar. Empiezas con infantería; dos posiciones aliadas habilitan arqueros y tres, caballería.
- La barra de compañía aparece al tener más de una unidad. Las posturas se muestran cuando crecen la compañía o el territorio.
- Espacio pausa o reanuda; H centra la compañía; 1, 2 y 4 cambian la velocidad. Escape cierra la selección.
- El menú de tres puntos contiene los gestos, la capa de influencia y el reinicio.

No hay misión escrita, panel lateral permanente ni diario abierto por defecto. Descubrimientos, capturas y amenazas se muestran principalmente mediante cambios en el mapa; la campana conserva un registro opcional de acontecimientos.

## Sistemas

Mundo determinista de 50 × 40 hexágonos, semilla 24300, cinco regiones. Una sola cámara con zoom continuo, agregación de destacamentos a distancia y grilla táctica al acercarse. Movimiento A*, terreno infranqueable y caminos; exploración permanente; influencia gradual con resistencia por terreno; patrullas, combate automático, cobertura, guarniciones, posturas, capturas y reclutamiento secuencial.

La simulación avanza en pasos fijos de 100 ms. Un día equivale a 60 segundos. Las posiciones aliadas aportan oro cada 30 segundos. Las provisiones permanecen como dato interno del prototipo, sin interfaz ni gasto.

## Código

- `src/world.ts`: generación, tipos, geometría y rutas.
- `src/simulation.ts`: reglas, avance temporal y progresión.
- `src/store.ts`: estado y comandos.
- `src/Map.tsx`: PixiJS, cámara y gestos directos.
- `src/App.tsx`: controles contextuales y HUD reducido.
- `src/style.css`: presentación adaptable.
- `tests/simulation.test.ts`: determinismo, reglas y progresión inicial.

## Límites

Partida en memoria: recargar la reinicia. Requiere WebGL; el zoom táctil utiliza botones. Las unidades pueden compartir hexágono. Combate y economía son sencillos; no hay inventarios, habilidades ni multijugador. La exploración revela terreno permanentemente, sin visibilidad táctica transitoria.
