# MARCHES · La frontera

Prototipo de apertura: protege una aldea aliada de una patrulla visible en un tablero cenital de 18 × 12 hexágonos. React, TypeScript, PixiJS, Zustand y Vite; sin backend ni recursos gráficos externos.

## Campaña 1 · «La Marca del Este»

El juego comienza en la campaña: seis misiones sobre el mapa de La frontera. Cada misión es una serie de **oleadas** enemigas y **llegadas** de tropas propias sobre un mismo reloj, con un objetivo de tierra (dominar o conservar cierto número de casillas al pasar la última oleada) o, en la última, tomar el campamento rival. Lo que cambia entre misiones es el mapa, de dónde vienen los enemigos y qué tropas traen. Una línea de tiempo bajo el objetivo muestra lo que viene: incursiones en rojo con sus tropas, refuerzos en azul; los puntos rojos cuentan las oleadas resueltas. La cabecera muestra además tus casillas frente a la meta. Si se acaban las oleadas sin la tierra pedida, la misión se pierde.

Al completarla, el juego arranca en «La frontera». El diseño está en [docs/campana-1.md](docs/campana-1.md); el código, en `src/tactics/campaign.ts` (misiones) y `src/tactics/outpost.ts` (guion de oleadas, incursiones simultáneas). Se guarda el desbloqueo en localStorage (`marches-campaign-1`), no la partida.

## Tierra: lo propio

Lo que es tuyo es la tierra, en azul con una frontera continua.

- **Se gana:** el cuartel sostiene su anillo y cada torre en pie proyecta tierra a su alrededor (las rocas la cortan; bosque y desnivel consumen alcance). Crece poco a poco desde la torre.
- **Se pierde:** una tropa enemiga se come la tierra que pisa y la de al lado; las casillas que se están perdiendo se tiñen de rojo. Si se come la casilla de una torre, la torre cae y su tierra se apaga poco a poco.
- **Rinde:** la tierra que tienes trae tropas al patio: cuanta más, más rápido (como mucho, una cada 12 s). Expandirte da más tropas y más frontera que defender.
- **Objetivos:** las misiones piden casillas («Domina 18 casillas», «Conserva 18 casillas») al pasar la última oleada. La cabecera muestra una barra con tus casillas y la meta marcada. Saquear el cuartel sigue siendo derrota inmediata.

- **Se ve vivida:** la tierra que sostienes se va poblando: primero campos arados, después casas en algunas casillas. Cuando el enemigo se come una casilla poblada, arde (llamas y humo) y queda calcinada hasta que vuelva a poblarse. Cada tropa que llega sale de una de esas casas y camina hasta el patio. La tierra con la que empieza una misión ya está poblada.

El modelo está en `src/tactics/outpost.ts` (`updateLand`, `held`, `eaten`, `settled`, `burning`).

## Presión visible: cuartel y oleadas

Como en Mini Metro, la presión se acumula en el mapa donde ocurre:

- **Tropas esperando.** Los refuerzos llegan a una bandeja fija en el borde izquierdo de la pantalla (no se mueve con la cámara) y esperan ahí, a la vista. Caben seis: el borde del patio pasa de azul a ámbar cuando queda un sitio y a rojo, latiendo, cuando está lleno. Una tropa que llega con el patio lleno se retira y se pierde.
- **Lo que tocas primero decide el verbo.** Desplegar empieza siempre en el patio: arrastra una tropa a una casilla azul libre (escuadrón nuevo) o sobre un escuadrón que puede reforzarse donde está (se ilumina entero); o tócala para tomarla en la mano (anillo ámbar) y toca después el destino. Con una tropa en la mano se iluminan los destinos válidos; tocar otro sitio la devuelve. Mover empieza siempre en un escuadrón: selecciónalo y toca cualquier casilla, azul o no. En reposo las casillas azules apenas se marcan, y el patio late cuando desplegar es el siguiente paso.
- **Torres desde la bandeja.** Las torres que la misión te da esperan en la bandeja, bajo las tropas. Se arrastran a cualquier casilla abierta cerca de tu tierra y lejos de otras torres (con una en la mano se iluminan todas las válidas, y la que sugiere la misión lleva la silueta de la torre); después un escuadrón encima la levanta. Ver `docs/territorio.md`.
- **Huecos visibles.** Las posiciones vacías de cada escuadrón se dibujan como casillas con borde.
- **Ritmo.** Mientras no tienes ningún escuadrón solo llega un explorador solitario, cada 45 s y muy despacio, para darte tiempo; con tu primer escuadrón empieza el ritmo normal. Después, el clan ataca en asaltos cada vez mayores con un valle de unos 20 s tras cada uno; las tropas llegan en levas durante los valles, y desde un valle se puede llamar el siguiente asalto a cambio de una tropa más. Con una tropa en la mano o un escuadrón recién elegido, el tiempo va lento. En La frontera cada asalto trae una incursión por cada 15 casillas de tu tierra (hasta tres). Ver «Ritmo» en `docs/territorio.md`.
- **El enemigo no huye.** Una incursión que pierde la cohesión en combate queda destruida donde está: sus hombres se dispersan y en el suelo quedan lanzas rotas y su estandarte caído durante un rato. Sus armas equipan una tropa más del tipo que más traía, que camina desde el campo de batalla hasta el patio. Solo vuelven a casa los que ya saquearon, cargando sacos de botín, y aún se les puede dar alcance por el camino.
- **El Clan del Humo.** El enemigo tiene cara: fichas de hollín con el frente y la cohesión en rojo brasa, y cada incursión marcha bajo su estandarte (tela negra con una voluta de humo que nace de una brasa).
- **Su tierra.** El clan también domina terreno, en hollín y con su propia frontera: alrededor de sus campamentos (donde no llega la tuya) y en todo lo que sus incursiones se comen. Tu tierra lo recupera despacio donde llegan tus torres, y rápido bajo los pies de tus escuadrones; mientras el clan tiene una casilla, tu tierra crece ahí más lenta. Tomar un campamento deja de alimentarla.
- **Sus campamentos.** Cada punto por el que entran oleadas es un campamento del clan, siempre a la vista: una casilla de hollín (como la tuya es azul) con empalizada, una tienda, un fuego que humea y su estandarte. Ahí vive el enemigo. La cámara encuadra al empezar el cuartel, los emplazamientos y los campamentos; en el teléfono, los que quedan fuera se señalan con una marca de hollín quieta en el borde.
- **Las bajas cuentan.** Un escuadrón que se quiebra pierde un integrante del lado por el que le golpearon, que queda caído en azul; si se queda sin nadie, desaparece. Con la tropa equivocada, el choque se pierde.
- **El campamento rival** (misión 6) lo guarda una guarnición inmóvil que hay que vencer. Después se toma sosteniéndolo; si el clan lo disputa, la toma avanza más despacio, y mientras lo ocupas, sus oleadas van a por ti.
- **La oleada se reúne.** Durante sus últimos 15 segundos, la próxima incursión hace crecer su campamento: el humo se espesa, se levantan más tiendas y el estandarte se alza; al completarse, sale. Si está fuera de la pantalla, una flecha en el borde lo indica.
- **Huellas.** Las incursiones dejan rastro en las casillas por las que pasan, orientado según su marcha, y tarda un par de minutos en borrarse: el mapa recuerda por dónde vienen.

## Mapas

En La frontera, el menú deja elegir el mapa. Cada uno invita a una forma de pelear (`src/tactics/maps.ts`):

- **Llanura:** el mapa de siempre, una loma al norte y una línea de rocas.
- **El paso:** una cordillera con un único paso; pocos lanceros lo sostienen.
- **El río:** solo se cruza por dos vados (agua con piedras); se defienden los cruces.
- **La meseta:** una meseta central con acantilados al norte y al sur y rampas al este y oeste; quien tiene la altura gana a los arqueros.
- **El bosque:** un bosque cerrado al norte, el flanco por donde no se les ve venir.
- **Dos valles:** una sierra parte el mapa; las incursiones llegan por dos valles a la vez.

Las incursiones salen por turnos de los campamentos de cada mapa, y un camino de tierra une el cuartel con cada uno.

## Construir

Un emplazamiento vacío muestra en discontinuo el escuadrón que espera; con un escuadrón encima saltan astillas y avanza el anillo de obra; al terminar, la torre se alza con una onda y unas flechas indican que el escuadrón queda libre.

## Informes

El menú de pausa guarda un informe (el estado completo de la partida y una imagen del mapa, con una nota opcional) y carga uno; también se puede soltar el archivo sobre el juego. `npx tsx scripts/report.ts informe.json [segundos]` lo lee, lo describe y puede seguir jugándolo para reproducir un error.

## Formación

Cada escuadrón tiene seis posiciones: dos columnas (frente y atrás) por tres filas (flanco izquierdo, centro, flanco derecho). La formación es automática: los lanceros ocupan el frente desde el centro, la caballería los flancos y los arqueros la retaguardia. Basta con soltar la tropa sobre el escuadrón.

- **Dónde cae el golpe:** un ataque de frente golpea la columna del frente; uno lateral, el flanco de ese lado; uno por detrás, la retaguardia. El tipo de tropa en esa zona decide la ventaja. Si la zona está vacía, el escuadrón queda expuesto y recibe un 25 % más.
- **Dónde rinde cada tropa:** lanceros y caballería pelean al 100 % al frente y al 85 % atrás; los arqueros al 100 % atrás y al 70 % al frente.
- En el mapa, la ficha muestra la formación orientada hacia su frente, con un icono por integrante (lanza, arco, caballo); la zona golpeada destella.

## La frontera (nuevo inicio)

Un ciclo continuo sobre el mismo mapa:

1. Arrastrar (o tocar y luego colocar) una tropa del patio del cuartel en una casilla azul para crear un escuadrón.
2. Ordenarle llegar a uno de tres emplazamientos. Permanecer quieto allí construye una torre en seis segundos; salir pausa la construcción. Una torre en pie es un nuevo punto de despliegue.
3. Doce segundos después de la primera torre se reúne una incursión visible en el este. Puedes interceptarla, defender o abandonar la posición.
4. Si la patrulla completa el saqueo, la torre cae. El emplazamiento se puede reconstruir.

Las tropas llegan al patio según la tierra que tienes, alternando lanceros, arqueros y caballería. El patio admite seis tropas. Se pueden formar hasta cinco escuadrones o añadir miembros a uno detenido (máximo seis), junto al cuartel o a una torre y fuera de combate. Los refuerzos no se despliegan automáticamente. Las patrullas vuelven tras retirarse, con una pausa de 28 segundos. No hay pantallas de victoria, salto de misión ni final automático: puedes seguir expandiendo y defendiendo.

El menú (☰) pausa la partida y reúne los modos (Campaña, La frontera y Juego libre, el escenario avanzado de tres frentes), las misiones desbloqueadas, reiniciar y la ayuda. El módulo `src/tactics/outpost.ts` contiene construcción, llegadas y ciclo de incursiones.

## Escenario avanzado

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
- Los escuadrones giran solos hacia el enemigo. Para detener uno, toca su propia casilla.
- Es posible cambiar destino en marcha. El nuevo recorrido empieza al finalizar el paso actual, sin saltos.
- Arrastrar terreno desplaza la cámara. Pellizcar (táctil), la rueda o los botones +/− (solo con ratón) hacen zoom.
- Espacio pausa; 1, 2 y 4 cambian velocidad; H encuadra el mapa; Escape cierra selección.
- En móvil se muestra un sector ampliado para poder tocar las tropas; arrastrar terreno permite recorrer el tablero.

## Reglas de esta entrega

Dos escuadrones con seis integrantes cada uno; composición fija para validar movimiento y orientación. Las rocas bloquean; el bosque y la subida ralentizan. Destinos, celdas ocupadas y siguientes pasos se reservan para impedir solapamientos. Ante un bloqueo dinámico se busca un desvío; si no existe, se espera.

Tres alturas (0, +15, +30), un fuerte, una aldea y una torre. Los edificios son referencias del escenario; no tienen acciones todavía. La partida comienza con «Protege la aldea». Una patrulla avanza, toma suministros si llega sin oposición y se retira cuando pierde cohesión durante un enfrentamiento. Puedes interceptarla o interrumpir el saqueo. La bandera azul permanece: una incursión no cambia la propiedad. El resultado distingue aldea protegida y saqueada; reiniciar permite repetir la prueba. El contacto inicia ataques cada 1,35 segundos y desgaste de cohesión de ambos bandos. Las flechas y destellos corresponden a esos ataques. Un segundo escuadrón acelera el repliegue rival; retirar a los defensores permite que el enemigo continúe. Los aliados quebrados buscan una celda segura y se recuperan antes de aceptar nuevas órdenes. Este enfrentamiento simplificado aún no incluye bajas permanentes, ventajas de flanqueo, reclutamiento, captura ni influencia territorial.

## Arte

Todo el arte del mapa se dibuja con vectores desde `src/tactics/art.ts`: un mapa de campaña visto desde arriba, con colores planos de una sola paleta, un trazo de tinta suave y una sombra ligera bajo lo que se levanta (fuerte, torres, obra, emplazamientos, campamento rival, casas de tres tipos, campos, vallas, pozos, bosques de frondosas y coníferas, rocas, hierba, fuego, humo y tierra calcinada). Los iconos de tropa (escudo con lanza, arco, cabeza de caballo) están en `src/tactics/icons.tsx` y se usan igual en el mapa y en la interfaz. Abriendo el juego con `?sheet` se ve una hoja con todos los elementos en grande, para revisarlos.

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

## Tres tipos y afinidades de daño

Lanceros superan a caballería; caballería supera a arqueros; arqueros superan a lanceros. Cada ventaja aplica ×1,5 al daño a cohesión, el enfrentamiento desfavorable ×0,65 y el mismo tipo ×1. Las mezclas ponderan cada combinación por la proporción de integrantes; menos soldados infligen menos daño total. El panel de selección muestra las modificaciones a daño infligido y recibido frente a cada tipo puro. El cuartel permite elegir cuál desplegar. Esta iteración modifica daño y representación; alcance específico, carga y bonificaciones por flanqueo siguen pendientes.

## Altura

El relieve tiene tres niveles (llano, ▲15 y ▲30) y modifica el daño a cohesión por cada nivel de diferencia entre atacante y objetivo:

| Tropa | Desde arriba | Cuesta arriba |
|---|---|---|
| Arqueros | +25 % | −20 % |
| Lanceros | +10 % | — |
| Caballería | +10 % | −20 % (pierde la carga) |

Las mezclas promedian por integrante. En combate, un chevrón verde sobre la ficha marca la ventaja de altura y uno naranja la desventaja. Al seleccionar un escuadrón, el anillo verde o rojo sobre cada enemigo ya incluye la altura. La misión 3 de la campaña la enseña: la torre está en una loma y la incursión sube desde el camino. Código: `heightBonus` en `src/tactics/combat.ts`.

## Lectura del mapa

- Cada escuadrón es un bloque de seis casillas en formación, azul propio y hollín enemigo, con un icono por integrante. La muesca indica el frente; el anillo exterior, la cohesión.
- Un choque tiñe las dos casillas y muestra unas espadas cruzadas entre los contendientes, del color de quien va ganando: verde si tú, rojo si ellos, neutras si está parejo. A cada lado, en el color de cada bando, aparece por qué: el icono de la tropa que vence a quien golpea (ventaja de tropa), ▲ si ataca desde más alto y una flecha curva si golpea por el flanco o la retaguardia (más gruesa si ese lado está vacío). Como el «súper eficaz» de los RPG: se ve como consecuencia, no como instrucción. Cada golpe deja un impacto y hace destellar la zona alcanzada.
- Una incursión fuera de la vista aparece como flecha roja en el borde de la pantalla.
- La tierra propia tiene un borde azul continuo; las casillas que un enemigo se está comiendo se ven en rojo. Las rocas forman una barrera visible.

## Señales por interacción

El mapa no usa textos para guiar: responde a lo que haces y a lo que ocurre (`src/tactics/guide.ts`).

- **Siguiente paso:** late el patio cuando toca desplegar; luego, el escuadrón que espera; al seleccionarlo aparece la silueta de la torre que podría levantar. Al terminar una torre vuelve a latir el patio: ya se puede desplegar también junto a ella.
- **Lectura del enemigo:** al seleccionar un escuadrón, cada enemigo cercano (a unas tres casillas) muestra un anillo verde con chevrones hacia arriba si lo vences, o rojo hacia abajo si te vence, según el tipo que golpearías, el lado por el que llegarías y la altura. En combate, el mismo anillo indica cómo va el choque.
- **Peligro:** la torre o el cuartel al que se dirige una incursión late en rojo si nadie lo cubre, y más rápido mientras lo saquean.
- **Acontecimientos:** el panel de reserva destella al llegar una tropa; una torre que cae, o una obra abandonada, laten en rojo.

