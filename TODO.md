# TODO

## Siguiente

- [ ] Usar los mapas en la campaña (hoy solo en La frontera) y elegir mapa al azar en el modo sin fin.
- [ ] Rendimiento: la ruta de los caminos tarda en arrancar en mapas con varias entradas.
- [ ] Obras desde el botín (empalizada, estacas, atalaya), modo sin fin con dificultad ligada a la tierra: ver `docs/territorio.md`.
- [ ] Tomar los campamentos del Clan del Humo en todas las misiones (hoy solo en la 6, con guarnición): sostener uno junto a una torre lo toma, arde y pasa a ser tierra propia; ese lado deja de mandar oleadas.
- [ ] Probar con personas el nuevo balance (bajas, golpe de las incursiones 9, cosecha más lenta, misión 6 con guarnición): está ajustado con `scripts/sim.ts`, no jugando.
- [ ] Vista previa al arrastrar una tropa sobre un escuadrón (mismas insignias del choque, sin veredicto).
- [x] Marca de veterano: el escuadrón que destruye dos incursiones lleva una estrella y golpea un 15 % más.
- [ ] Más líneas para la crónica (hoy 2–6 por suceso) y sucesos nuevos: la tierra del clan crece, un escuadrón toma altura, un veterano cae.
- [ ] ¿Las incursiones también al paso de su miembro más lento? (hoy todas a 4,5 s por casilla).
- [ ] Acción Construir y obras (empalizada, estacas, trampas, atalaya), con su misión de campaña.
- [ ] Ajustar las especiales jugando: hoy solo el balance simulado (caballeros/escorpión cada 3 incursiones, carreta con 30 casillas en La frontera).
- [ ] La carreta en la campaña (hoy solo en La frontera) y un aviso visual del aura del héroe.
- [ ] Objetivos variados por mapa (sostener el paso, que no crucen el vado, proteger una aldea en cada valle, tomar la meseta).

## Assets pendientes

Mismo estilo que `src/tactics/art.ts`: mapa de campaña visto desde arriba, colores planos de la paleta `P`, trazo de tinta suave y sombra ligera. Cada asset nuevo se añade también a la hoja `?sheet` para revisarlo.

### Tamaño y lectura
- [ ] Revisar casas y torres a zoom de teléfono (Z Fold cerrado): si no se leen, escalar según el zoom como el patio del cuartel.

### Asentamiento
- [ ] Molino de viento: aparece en tierra muy poblada (varias casillas vecinas asentadas).
- [ ] Huertos y frutales junto a las casas.
- [ ] Almiares y gavillas sobre los campos de trigo.
- [ ] Ganado (ovejas) en pastos fuera de los campos.
- [ ] Caminos de tierra que unan las casas con el cuartel.

### Terreno y obras
- [ ] Camino principal con bordes de piedra y marcas de rodadas (hoy es una línea).
- [ ] Puentes y vados donde un camino cruza agua.
- [x] Ríos y vados (mapa El río).
- [ ] Bosque más variado: claros, tocones y árboles caídos.
- [ ] Curvas de nivel con más carácter en las lomas.

### Fortificación
- [ ] Muro o empalizada entre torres cercanas.
- [ ] Evolución visual del fuerte según la tierra que sostiene.
- [ ] Torre dañada antes de caer (grietas, almenas rotas).

### Enemigo
- [x] Estandarte e identidad propia del Clan del Humo (color ceniza, emblema).
- [x] Campamento que crece mientras se reúne una oleada.
- [x] Huellas o rastro de las incursiones sobre el terreno.

### Ambiente
- [ ] Pájaros que levantan el vuelo cuando se acerca una incursión.
- [ ] Estaciones: el color de los campos cambia a lo largo de la campaña.
- [ ] Nubes con sombra que cruzan el mapa despacio.
