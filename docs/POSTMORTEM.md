# POSTMORTEM.md — balance al cierre de ZAI v0.3.0

Tres sesiones, sin sesión 4 planeada. Esto es el balance honesto, no el
resumen de marketing del `README.md`.

## Qué del diseño original resultó no servir

- **Confiar en que "verificado contra el código fuente" era suficiente
  garantía.** Fue necesario y evitó varios errores reales (`permission.ask`
  no conectado, IDs de tools equivocados, la lista de hooks mezclada con
  eventos del bus). Pero **no fue suficiente**: Gate B estuvo roto en
  Windows durante toda la sesión 2 y la primera mitad de la sesión 3 —
  `execFile` no puede invocar un shim `.cmd` sin `shell: true`, y el error
  resultante se interpretaba como "sin problemas de tipos". Ningún test
  unitario lo detectó porque los tests mockeaban justo el nivel donde
  vivía el bug. Se encontró recién al correr el gate contra un proyecto de
  juguete real con un error de tipos deliberado. Leer código fuente prueba
  que el mecanismo *debería* funcionar; correrlo contra herramientas reales
  prueba que *efectivamente* funciona. Son dos verificaciones distintas, y
  esta sesión solo hizo la segunda al final, cuando el brief obligó a
  construir el proyecto de juguete.

- **El patrón de comandos invocando scripts via `pnpm --dir ~/.config/opencode
  exec tsx scripts/zai-*.ts ...` desde bash.** Funciona — se probó a mano
  repetidas veces — pero es mucho más frágil de lo que parecía al
  diseñarlo: depende de que el agente escriba rutas y flags largos
  correctamente cada vez, de que `~` expanda bien en la shell del momento,
  y de que ZAI esté instalado como repo pnpm accesible. `/zai-init` y
  `/zai-fase-start` ya tienen un fallback manual documentado para cuando
  esto falla (que renuncia a la validación Zod) — un parche sobre un
  problema de diseño, no una solución.

## Qué gate quitaría (o rediseñaría primero)

**Gate E (context7)**, tal como está. No por el criterio de "es viejo o
joven" — eso funcionó bien contra el registro real de npm. El problema es
el **tracking a nivel de sesión, no a nivel de librería**: alcanza con que
el modelo consulte `context7` una sola vez, para cualquier librería, al
principio de la sesión, para que el gate quede satisfecho el resto de la
sesión — incluso para dependencias completamente distintas que nunca se
consultaron. Es una garantía mucho más débil de lo que su mensaje de error
sugiere. Se documentó esta limitación desde que se escribió el gate
(`docs/RESEARCH.md`/comentarios en `zai.stack.ts`), pero en retrospectiva
debería haber sido motivo para no construirlo así de entrada, o para
invertir el esfuerzo en el tracking por librería en vez de aceptar la
versión débil por simplicidad.

## Qué le falta al entorno que no vimos al diseñarlo

- **El hook `tool`** (`Hooks.tool?: { [key: string]: ToolDefinition }`,
  confirmado en `docs/RESEARCH.md` desde la sesión 2) permite que un
  plugin defina **tools completamente nuevas** para el agente. Nunca se
  usó. En cambio, cada operación de estado (transicionar, registrar
  blockers, bumpear versión) se expuso como un script de CLI que el agente
  tiene que invocar via `bash` con la sintaxis exacta. Un tool nativo
  (`zai_transition({ toState: "green" })`, con argumentos estructurados y
  validados por el propio framework de tools, no por texto de shell) habría
  sido mucho más robusto que lo que se construyó. Es la brecha de diseño
  más grande de las tres sesiones, y se descubre recién ahora porque nunca
  hizo falta mirar ese hook de cerca hasta escribir este postmortem.

- **Resolución de agente por sesión.** `tool.execute.before` solo trae
  `sessionID`/`callID`, no qué agente está llamando (`docs/DECISIONS.md`
  punto 10, sesión 2). Esto bloqueó construir un gate que restrinja
  escritura por rol con alcance de ruta (`zai-planner` solo en `docs/`,
  por ejemplo). Quedó como hueco documentado en dos sesiones seguidas sin
  que nadie lo investigara a fondo — `PluginInput.client` podría tener la
  respuesta (consultar la sesión activa por ID), pero no se verificó.

- **Cuánto contexto consume una fase completa.** El brief de sesión 3 lo
  pedía explícitamente. No hay forma de medirlo sin una corrida real con
  modelo, que esta sesión no consiguió. Sigue siendo una incógnita total.

- **Que pasa en un proyecto que no es Node.** Los comandos `/zai-fase-*`
  asumen `package.json` > `scripts.test` (con fallback a preguntar). Las
  skills `zai-stack-*` son explícitamente del stack Node/TS del usuario.
  Nadie diseñó qué pasa en un proyecto Python o Go — probablemente
  funciona peor de lo que se nota porque nunca se probó.

## Las tres cosas que haría distinto si empezara de cero

1. **Conseguir un proveedor de modelo configurado antes de la sesión 1**,
   no al final de la sesión 3. Las tres sesiones acumularon "verificado
   contra código fuente, no contra una corrida real" como una lista
   creciente de supuestos sin probar. Un solo turno de configuración al
   principio hubiera evitado eso.
2. **Usar el hook `tool` para las operaciones de estado**, no scripts de
   CLI invocados por bash. Ver arriba.
3. **Resolver el gate de escritura con alcance por rol en la sesión 2**,
   cuando se diseñaron los agentes, en vez de documentar el hueco y
   seguir de largo. Es la pieza que más se acerca a romper la premisa
   central del entorno ("un agente que puede hacer algo, tarde o temprano
   lo hace") si alguna vez importa de verdad.

## Estado real del entorno

**Sólido** (verificado con código fuente real, tests, y al menos una
corrida contra un proyecto/registro/repo real, no solo unitarios
mockeados):

- `modules/core/src/state` — la máquina de estados en sí. 108 tests,
  corrida real de punta a punta múltiples veces.
- Gate A, Gate D, Gate E — cada uno probado contra un proyecto de juguete
  real (archivos reales, git real, registro de npm real).
- El instalador/desinstalador — idempotente, probado repetidas veces.
- El mecanismo de skills — confirmado con el binario real.

**Frágil**:

- Gate B — recién arreglado, sin test de regresión automatizado (ver
  `docs/DECISIONS.md` punto 13 para por qué), y sigue corriendo `tsc`
  sobre el proyecto entero en cada escritura.
- Todo el patrón de comandos invocando scripts por bash — funciona, pero
  es el punto más propenso a que un agente real se equivoque de sintaxis.
- El hueco de permisos sin alcance de ruta — real, documentado, nunca
  resuelto.

**Completamente sin verificar**:

- Todo lo que depende de juicio de un modelo real: si los agentes delegan
  bien, si `zai-auditor` produce valor o llena un formato, si los prompts
  en español generan fricción, cuánto contexto consume una fase. Esta es
  la pregunta que el brief de sesión 3 marcó como la más importante, y
  sigue exactamente así de abierta.

## Qué recomiendo construir después

1. **Lo primero, antes que cualquier otra cosa**: correr el loop completo
   con un modelo real, apenas haya un proveedor configurado en esta
   máquina (o en otra donde la TUI de OpenCode renderice bien — ver
   `docs/DECISIONS.md` punto 14). Todo lo demás en esta lista depende de
   lo que salga de esa corrida.
2. Si el auditor resulta débil o genérico en esa corrida real: rediseñar
   su prompt y su contexto en base a la transcripción real, no en base a
   más suposiciones.
3. Migrar el patrón de scripts-por-bash a tools nativas via el hook
   `tool`, si la fricción de sintaxis resulta ser un problema real y no
   solo teórico.
4. Si en algún momento un agente termina escribiendo fuera de donde
   debería (el hueco de permisos sin alcance de ruta se manifiesta de
   verdad): construir el gate de escritura por rol, resolviendo agente por
   `sessionID` via `client`.
