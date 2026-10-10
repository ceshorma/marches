# Campaña 1 · «La Marca del Este»

Eres el oficial que recibe un cuartel aislado en la frontera. Cada misión es una **serie de oleadas** enemigas y **llegadas** de tropas propias sobre un mismo reloj. El objetivo cambia de una misión a otra; lo que hace distinta cada una es el mapa, de dónde vienen los enemigos y qué tropas traen.

## Principios

- **Lo propio es la tierra.** El cuartel y las torres proyectan tierra; los enemigos se la comen casilla a casilla y, si se comen la de una torre, la torre cae. La tierra trae tropas: más tierra, más llegadas. Los objetivos se miden en casillas.
- **El ritmo marca el progreso.** Cada cierto tiempo llega un enemigo que ataca y, entre medias, una tropa nueva. Una línea de tiempo bajo el objetivo lo muestra: incursiones en rojo con sus tropas, refuerzos en azul, y puntos que cuentan las oleadas resueltas.
- **Las señales salen de la interacción, no del texto.** Casillas que laten, la silueta de la torre al seleccionar un escuadrón, anillos verdes o rojos sobre los enemigos según si los vences. La cabecera solo dice el objetivo y, unos segundos, el contexto.
- **La formación importa** (y se ordena sola). Seis posiciones (frente/atrás × flanco izquierdo/centro/flanco derecho). El golpe cae en la zona por la que llega el enemigo; una zona vacía deja el escuadrón expuesto.
- **La presión se acumula a la vista.** Los refuerzos esperan en un patio junto al cuartel (máximo 6; si llega uno con el patio lleno, se pierde) y se despliegan arrastrándolos. Cada oleada se reúne 15 s a la vista en su entrada antes de salir.
- **Sin estados sin salida.** Si se acaban las oleadas sin cumplir el objetivo, la misión se pierde y se reintenta.

## Misiones

Entradas enemigas: este (16,8), noreste (15,0), sureste (16,11), sur (7,11). Emplazamientos sugeridos: oeste (7,8), norte (9,5), sur (11,9). Las torres sin construir de cada misión llegan a la bandeja y pueden ir en cualquier casilla válida; el campamento rival se puede tomar con una torre propia a 5 casillas o menos. L = lanceros, A = arqueros, C = caballería.

| # | Misión | Objetivo | Reloj | Oleadas | Llegadas | Qué enseña |
|---|---|---|---|---|---|---|
| 1 | La primera torre | Dominar 18 casillas | Empieza con el primer escuadrón | 25 s E [C C] · 65 s E [C C A] | 10 s A | Desplegar, construir, defender; el primer choque se gana (lanzas contra jinetes) |
| 2 | Dos caminos | Conservar 18 casillas | Inicio | 15 s E [L L] · 45 s S [C C] · 85 s E [L A] + S [C L] | C, L, L, A | Flancos: atacan por dos lados a la vez |
| 3 | Cada tropa su rival | Conservar 19 casillas | Inicio | 20 s [A×4] · 55 s [C×3] · 95 s [L×4], todas del E | L, L, A, A | Elegir la tropa que vence a cada oleada |
| 4 | La loma del norte | Dominar 28 casillas | Inicio | 45 s NE [L L C] · 80 s E [A×3] · 115 s NE [C×3] · 150 s E [L L A A] | C, A, L | Construir en altura; recibir cuesta arriba |
| 5 | La pinza | Dominar 32 casillas sin perder el cuartel | Inicio | De dos en dos: 30 s E+S · 75 s NE+SE · 125 s E+S | L, C, A, L | Repartir la defensa |
| 6 | La línea del este | Tomar el campamento rival | Inicio | Cada 22 s desde E, NE o SE, hasta que cae el campamento; una guarnición [L L A A C C] guarda el camino | Cada 35 s | Pasar al ataque: vencer la guarnición y sostener el campamento |

Entre oleadas separadas 40 s o más se intercala una escaramuza ligera (no come tierra). Las metas de tierra se comprueban al pasar la última oleada. Las oleadas con objetivo «torre» van rotando entre las torres en pie; si no queda ninguna, van al cuartel. Un cuartel saqueado es derrota. Además de las llegadas del guion, la tierra trae tropas (una cada 450/casillas segundos, como mucho una cada 18 s). Las tropas iniciales empiezan junto al cuartel: hay que llevarlas a defender.

## Combate y balance

- **Las bajas cuentan.** Un escuadrón que se quiebra pierde un integrante del lado por el que le golpearon (si ese lado está vacío, cualquiera) y queda en el suelo en azul. Sin integrantes, el escuadrón desaparece. Las incursiones se destruyen al quebrarse.
- **El enfrentamiento equivocado pierde.** Las incursiones golpean con 9 (tú con 7) y tienen 50–80 de cohesión: con la tropa que les gana las destruyes; con la que pierde, te quiebran.
- **El campamento rival (misión 6)** lo guarda una guarnición que no se mueve, no saquea ni come tierra: hay que vencerla. Después se toma sosteniéndolo 35 s; si el clan lo disputa avanza a un tercio, y si lo dejas la toma se pierde despacio. Mientras alguien lo ocupa, las oleadas van a por él, y una entrada ocupada no detiene una oleada: se forma al lado.
- `scripts/sim.ts` juega todas las misiones con tres jugadores (sencillo, solo lanceros, quieto) e imprime cómo fue cada una. Objetivo: el sencillo gana todas con alguna baja; solo lanceros pierde de la 3 en adelante; quieto pierde de la 2 en adelante; la misión 6 dura varios minutos.

## Implementación

- `src/tactics/campaign.ts`: `MissionConfig` con mapa, emplazamientos, tropas iniciales, reserva, guion (`waves`, `arrivals`, `trigger`) y `check`.
- `src/tactics/outpost.ts`: guion sobre el reloj, varias incursiones a la vez (`b.raids`), saqueo de torres y cuartel, `upcoming()` para la línea de tiempo, despliegue sobre un escuadrón (`addReserveTroop`) con formación automática y botín de las incursiones destruidas.
- `src/tactics/combat.ts`: posiciones, zonas de impacto (`zoneFrom`, `struck`) y rendimiento por posición (`slotWeight`).
- `src/tactics/guide.ts`: marcas sobre casillas y lecturas sobre tropas.
- `tests/campaign.test.ts`: cada misión se gana con el jugador sencillo de `tests/player.ts` (despliega lo que llega, construye, defiende; el escuadrón más fuerte al campamento), se pierde si no se hace nada, y la misión 3 se pierde solo con lanceros.

## Pendiente

- Probar en juego el ritmo de cada misión; los tiempos están ajustados con el bot, no con personas.
- Ataques por la retaguardia: hoy los escuadrones giran hacia su atacante; un segundo enemigo es lo que fuerza el flanco.
