# Defensa de territorio

MARCHES es un *tower defense* de **territorio**, no de camino: no defiendes una ruta, defiendes un área, y esa área es tu economía. Regla para cada pieza nueva: **tiene que tratar de tierra.**

## De dónde sale cada cosa

| Qué | De dónde | Cómo se ve |
|---|---|---|
| Tropas | La tierra que sostienes | Salen de las casas y caminan hasta la bandeja |
| Torres | El guion (campaña) o sostener una región un tiempo (sin fin) | Llegan a la bandeja; se colocan en el borde de tu tierra |
| Obras (empalizada, estacas, atalaya) | El botín de las incursiones destruidas | Sus lanzas rotas se vuelven tus estacas |

**Construir cuesta tiempo y presencia, no moneda.** Una torre o una obra se coloca desde la bandeja, pero solo se levanta con un escuadrón encima durante unos segundos: mientras construye no defiende, y está expuesto. Lo escaso no es el material, es cuándo lo tienes y quién puede construirlo sin dejar un hueco.

## Bandeja

La bandeja es fija en la pantalla, no pegada al cuartel: lo que espera se acumula a la vista como en Mini Metro (borde ámbar con un sitio libre, rojo latiendo lleno) y se arrastra al mapa. Las tropas se sueltan junto al cuartel o a una torre en pie; una torre, en cualquier casilla de tu tierra lejos de otras torres.

## La tierra del clan

El clan domina terreno en hollín: el que rodea sus campamentos y el que sus incursiones se comen. El mapa es un tira y afloja visible entre azul y hollín; tomar un campamento borra su fuente. Otras facciones serían otros colores disputando el mismo mapa.

## Lenguaje visual

- **El brillo es la altura.** Cada nivel tiene su banda de luminosidad; el tipo de suelo (pradera, tierra, seco, húmedo) solo cambia el matiz dentro de ella.
- **Los bordes de casilla son reglas.** Solo se dibuja sobre un borde lo que hace algo: tu frontera, la del clan y, más adelante, las empalizadas. La decoración va dentro de las casillas.
- **El color fuerte es lo que juegas.** Tu azul, el hollín y el rojo del clan, edificios y tropas. La naturaleza va apagada y clara, cerca del suelo.

## Escuadrones con nombre

Cada escuadrón nace con un nombre y un banderín de color (Halcón, Tortuga, Garza…; nunca el rojo del clan). Va al paso de su miembro más lento: la caballería pura es rápida y frágil ante los lanceros; uno mixto aguanta pero llega tarde. Destruir dos incursiones lo hace veterano (estrella, golpea un 15 % más): perderlo duele.

**La crónica.** Lo que pasa llega abajo como noticias de la marcha: quién destruyó qué, quién se replegó, qué incursión sale y hacia dónde, y algo de vida cotidiana cuando no pasa nada. Varias líneas por suceso, por turnos, para que no se repita.

**La oleada se anuncia.** Mientras se reúne en su campamento, una estela de hollín marca su camino y un anillo rojo su objetivo: no se ve quién ganará, sí dónde será el choque, y se puede preparar a quién lo recibe.

## Alcance y altura

Los arqueros disparan a dos casillas, por encima de quien tengan delante; solo disparan los arqueros del escuadrón, y una andanada hace un 75 % de lo que hace el cuerpo a cuerpo. Las incursiones con arqueros disparan mientras se acercan. Bajo fuego nadie se recupera.

Al elegir destino se ve, antes de decidir, lo que alcanza el escuadrón desde allí y cómo queda el terreno hacia el camino del enemigo: ▲ si golpearía desde arriba, ▼ desde abajo. La crónica cierra el ciclo diciendo por qué se ganó: desde la loma, por el flanco, con flechas o con el rival adecuado.

## Dificultad ligada al territorio

El nivel del ataque crece con la tierra que tienes: cuanta más frontera, más fuertes y más seguidas vienen las incursiones. Crecer da tropas y torres, pero también atrae al clan. En la campaña los niveles los fija cada misión; en el modo sin fin la fuerza de cada oleada se calcula de la tierra sostenida.

## Orden de trabajo

1. ✅ **Bandeja fija** en la pantalla, con las tropas que esperan.
2. ✅ **Torre colocable**: llega a la bandeja y se suelta en tu tierra; un escuadrón la levanta. En la campaña los emplazamientos pasan a ser sugerencias.
3. **Obras** desde el botín: empalizada primero (corta el paso y se puede derribar), luego estacas (castigan a la caballería) y atalaya (altura para los arqueros).
4. **Modo sin fin**: sostener una región gana una torre; la fuerza de las oleadas sigue a la tierra; tomar campamentos abre su lado.
5. **Campaña**: una misión que enseñe cada obra, sobre los mapas de `src/tactics/maps.ts`.

Hecho además: tierra del clan en hollín, seis mapas (llanura, paso, río, meseta, bosque, dos valles) e informes de partida.
