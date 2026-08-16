# HANDOFF.md — cierre de ZAI v0.3.0 (sesion 3, ultima)

No hay sesion 4 planeada — esto es el cierre del proyecto tal como se
concibio. Ver `docs/POSTMORTEM.md` para el balance completo. Esta seccion
es el detalle tecnico de que quedo probado y que no.

**Actualizacion post-cierre**: el repo se movio de `~/.config/opencode` a
una ubicacion separada (`D:\CODE\projects\zai` en esta maquina) — ver
`docs/DECISIONS.md` punto 15 para el motivo (un `node_modules`/`.gitignore`
propios de OpenCode, gestionados con Bun, compitiendo con nuestro pnpm por
los mismos nombres de archivo en el mismo directorio). Todo lo de abajo que
mencione `~/.config/opencode` como si fuera el repo es de antes de ese
cambio — sigue siendo el directorio de config **real** de OpenCode (el
destino de instalacion), pero ya no es donde vive el codigo fuente.

(Las secciones de sesion 1 y sesion 2 estan mas abajo, sin tocar, para no
perder ese historial.)

## Que quedo construido y funcionando (verificado, no supuesto)

- **Modulo `stack`**: 5 skills `zai-stack-*` — confirmado con el binario
  real (`opencode debug skill`) que se descubren y cargan on-demand.
  Verificado contra codigo fuente real (no solo la pagina de docs, que
  otra vez tenia detalles no confirmables) que el mecanismo es invocacion
  explicita del modelo, no auto-trigger — ver `docs/RESEARCH.md` seccion 11.
- **Gate E** (`zai.stack`, exige `context7` antes de dependencias jovenes):
  27 tests unitarios en verde, mas **probado contra el registro real de
  npm** en el proyecto de juguete (ver mas abajo) — bloqueo real sobre
  `next` (major 16, publicado hace menos de 12 meses a la fecha de esta
  sesion), permiso real sobre `lodash`, y el flujo completo de
  "bloqueado -> se consulta context7 -> permitido" funcionando de punta a
  punta contra la API real, no mockeada.
- **Gate D** (`zai.phases`, bloqueo de commit): 9 tests unitarios, mas
  probado contra un repo git real en el proyecto de juguete — bloquea sin
  `.zai/config.json`, bloquea con `commitGate:true` y fase no `documented`,
  bloquea con fase `documented` pero `CHANGELOG.md` sin cambios, permite
  cuando corresponde, y el escape hatch `ZAI_ALLOW_COMMIT` funciona.
- **`zai-scribe` extendido**: reglas de ADR, `CHANGELOG.md` en formato Keep
  a Changelog, `scripts/zai-bump-version.ts` (7 tests unitarios + probado
  a mano: `0.0.0 -> 0.1.0` con `minor`, tal como exige "la primera fase
  cerrada deja el proyecto en 0.1.0").
- **`scripts/install.ts` extendido** para el cuarto tipo de artefacto
  (`skill`, directorios completos) — probado instalando y reinstalando
  contra este mismo repo multiples veces sin dejar restos.
- **README.md, CHANGELOG.md propio de ZAI, version 0.3.0** — el toolkit
  mismo versionado por primera vez, con historial real de las tres
  sesiones.

## La prueba del proyecto de juguete — que se hizo y que NO se pudo hacer

Se armo `toy-auth-api`: un endpoint `GET /me` protegido por token bearer,
en Express + TypeScript + vitest + eslint (stack real del usuario, con un
ADR documentando por que el auth es un stub y no better-auth real — ver
mas abajo). Vive en el directorio de scratch de esta sesion, no en este
repo — es desechable, tal como pedia el brief.

**Lo que se corrio de verdad, mecanicamente, con las funciones reales
instaladas de ZAI (no simulado)**:

1. `/zai-init` equivalente: `zai-init-state.ts` genero un
   `.zai/state.json` valido.
2. Ciclo `planning -> red` con un test que fallaba de verdad (el modulo
   `./app.js` no existia todavia) — no un test que no compila, una
   aserción real fallando.
3. `red -> green`, e inmediatamente **se disparo Gate A de verdad** contra
   este proyecto real: un intento de `edit` sobre `src/app.spec.ts` fue
   rechazado por la funcion `gateA` instalada; un `write` sobre
   `src/app.ts` (codigo, no test) paso sin problema.
4. Implementacion real del endpoint, suite en verde de verdad
   (`pnpm test`, 3/3).
5. **Se encontro y arreglo un bug real en Gate B** (ver
   `docs/DECISIONS.md` punto 13): en Windows, nunca habia corrido de
   verdad — `execFile` no puede invocar un `.cmd` sin `shell: true`, y el
   error resultante (`EINVAL`, sin `stdout`) se interpretaba como "sin
   problemas". Se confirmo el bug metiendo un error de tipos y una
   variable sin usar deliberados, se arreglo el codigo, y se volvio a
   correr contra el mismo error real para confirmar que ahora si lo
   atrapa (tanto `tsc` como `eslint`, con la salida real del compilador).
6. Ciclo de auditoria simulado: `recordBlockers` con un blocker real,
   confirmado que `audited` se rechaza; `recordBlockers([])`, confirmado
   que ahora si transiciona.
7. **Gate E probado contra el registro real de npm** (no mockeado): ver
   arriba.
8. ADR real escrito (`0001-auth-stub-en-vez-de-better-auth.md`) siguiendo
   el criterio de `zai-scribe` — este proyecto se desvio del default de
   `zai-stack-auth` (better-auth) por ser un descartable, que es
   exactamente el caso que ese criterio dice que amerita ADR.
   `CHANGELOG.md` real, bump de version real (`0.0.0 -> 0.1.0`),
   transicion a `documented`.
9. **Gate D probado contra un repo git real**: bloqueo sin config,
   bloqueo con config pero sin cambios de changelog, permiso con cambios,
   permiso con el escape hatch.

**Lo que esto NO es, y no pretende ser**: un modelo real conversando,
interpretando los prompts de `/zai-fase-*`, delegando via `task` a los
subagentes, y generando un reporte de auditoria real. Eso necesita un
proveedor de modelo configurado, y esta sesion no lo consiguio — ver abajo.
Lo de arriba prueba que **la maquinaria** (estado, los cinco gates, el
flujo de cierre) funciona de verdad contra un proyecto real. No prueba que
un modelo, siguiendo los prompts en espanol de los comandos, lo use bien,
ni que `zai-auditor` produzca algo de valor. Esa es la pregunta mas
importante que pedia el brief de esta sesion, y queda sin responder.

### Por que no se pudo probar con un modelo real

Cero credenciales configuradas en esta maquina (`opencode providers list`
-> "0 credentials"), igual que en sesiones 1 y 2. A diferencia de esas
sesiones, esta vez se intento activamente resolverlo:

- `opencode providers login` (interactivo, con seleccion de proveedor por
  flechas) se cuelga sin producir ninguna salida, ni siquiera con
  `--print-logs --log-level DEBUG` — ni corrido desde esta sesion via
  `Bash`, ni corrido directamente por el usuario en su propia PowerShell.
- Se descarto que fuera un problema especifico de correr `opencode` parado
  en `~/.config/opencode`: el usuario confirmo que tampoco abre la TUI en
  otra carpeta cualquiera.
- El usuario no tenia una API key a mano para probar la via no interactiva
  (`opencode.json` con `options.apiKey: "{env:VAR}"`, documentada pero no
  verificada contra codigo fuente en esta sesion).

Es un problema de esta maquina/terminal con la TUI de OpenCode, ajeno a
ZAI. Ver `docs/DECISIONS.md` punto 14 para como retomarlo.

## Que quedo a medias o fragil (sesion 3)

- **La pregunta central del brief — auditor produce valor real o llena un
  formato — sigue sin respuesta.** No es una omision, es la consecuencia
  directa de no haber podido correr un modelo real. Es lo primero que hay
  que hacer apenas haya un proveedor configurado.
- **El hueco de permisos sin alcance de ruta** (sesion 2, `docs/DECISIONS.md`
  punto 10) sigue exactamente igual — no se toco en sesion 3.
- **La via no interactiva de autenticacion de proveedor** (`opencode.json`
  + `{env:VAR}`) esta documentada por una pagina de docs resumida, no
  verificada contra codigo fuente. Si la usas, tratala con la misma
  desconfianza que el resto de las paginas de docs resumidas de este
  proyecto — confirma contra el codigo fuente si algo no funciona como
  se espera.
- **El fix de Gate B no tiene test de regresion automatizado** (ver
  `docs/DECISIONS.md` punto 13 para por que, deliberado) — la garantia
  real es correrlo contra un proyecto real de vez en cuando, no un mock.

## Como verifico yo, a mano, que v0.3.0 funciona (adicional a sesion 1/2)

1. **Skills**: `opencode debug skill` en cualquier carpeta, confirma los 5
   `zai-stack-*`.
2. **Gate E con un paquete real**: en cualquier proyecto,
   ```
   cd tu-proyecto
   pnpm add next
   ```
   (o cualquier paquete con un major reciente) deberia fallar con un error
   que empieza "zai gate context7". `pnpm add lodash` no deberia fallar.
3. **Gate D**: en un proyecto con `.zai/state.json`, creá
   `.zai/config.json` con `{"commitGate": true}`, y probá `git commit` con
   la fase en un estado que no sea `documented` — deberia fallar. Con
   `ZAI_ALLOW_COMMIT=1 git commit ...` deberia pasar igual.
4. **El loop completo con un modelo real** — esto sigue pendiente, ver
   arriba. Cuando tengas un proveedor andando: `/zai-init`, despues las
   seis fases en orden, prestando atencion especial a si `zai-auditor`
   dice algo que un lector real encontraria util o si es generico.

## Que quedo construido y funcionando (verificado, no supuesto)

- **Extensiones de `modules/core/src/state`**: `startNextPhase` (agrega
  fase nueva, solo desde `documented`), `recordBlockers` (registra
  blockers sin transicionar, solo en `green`), y la invariante nueva en
  `transitionPhaseState` (no deja pasar a `audited` con blockers
  pendientes). 65 tests en verde en total (`pnpm test`), typecheck limpio.
- **`modules/phases/` completo y habilitado** (`module.json` con
  `enabled: true`): 5 agentes, 6 comandos, el plugin `zai.phases` con Gate
  A y Gate B.
- **Gate A (tests intocables en green): verificado en dos niveles.**
  1. Codigo fuente real de OpenCode (`docs/RESEARCH.md` seccion 9): tirar
     un error en `tool.execute.before` esta confirmado que impide que la
     escritura real ocurra — no es una suposicion.
  2. Tests directos de la funcion `gateA` (`modules/phases/plugins/__tests__/gate-a.test.ts`):
     bloquea `edit`/`write`/`apply_patch` sobre archivos que matchean
     `test_globs` cuando `phase_state` es `green`, no bloquea en otros
     estados, no bloquea otros tools, respeta los dos escape hatches
     (`ZAI_DISABLE_GATES`, `ZAI_PHASES_DISABLE_GATE_A`).
- **Gate B (verificacion post-escritura)**: probado que no rompe nada
  cuando el proyecto no tiene `tsc`/`eslint` instalados (se queda callado,
  no falla la escritura), que ignora archivos no-TypeScript, y que respeta
  sus escape hatches. **No probado con un `tsc`/`eslint` real reportando
  errores de verdad** — hacerlo hubiera significado armar un proyecto
  TypeScript de prueba completo con `node_modules`; quedo como hueco
  explicito abajo.
- **Los 5 agentes y las 8 configuraciones de tools/permission: confirmado
  con el binario real** (`opencode debug config` contra los agentes
  instalados, ver `docs/RESEARCH.md` seccion 9) que cada `tools: {}`
  declarado se resuelve tal cual se escribio, y que OpenCode ademas
  sintetiza automaticamente un `permission: { <tool>: "deny" }` por cada
  tool denegada — hallazgo nuevo, no documentado en ningun lado antes de
  esta sesion.
- **Los 6 comandos `/zai-fase-*` + los 3 scripts CLI que invocan**
  (`zai-transition.ts`, `zai-start-next-phase.ts`, `zai-record-blockers.ts`):
  probado el ciclo completo a mano
  (`planning -> red -> green -> [blockers -> green] -> audited -> documented -> nueva fase en planning`),
  incluida la falla esperada al intentar `audited` con blockers presentes.
  Confirmado que los 6 comandos se auto-descubren con su `agent: zai-planner`
  y template completo.

## Que quedo a medias o fragil

- **Gate B nunca vio un error real de `tsc` o `eslint`.** El filtrado de
  salida de `tsc` (busca lineas que mencionen el path del archivo) es
  logica no probada contra la salida real del compilador — solo contra el
  caso "no hay tsc instalado, no hace nada". Antes de confiar en este gate
  en un proyecto real, probalo a mano una vez con un error de tipos
  deliberado.
- **Ningun comando `/zai-fase-*` se probo con un modelo real conversando**,
  por la misma razon de sesion 1: cero proveedores configurados en esta
  maquina. Lo que se probo es: (a) que el codigo que los comandos invocan
  funciona end-to-end via CLI directa, y (b) que OpenCode carga y resuelve
  los comandos/agentes/plugin correctamente. Lo que **no** se probo: si un
  modelo real, siguiendo estos prompts, efectivamente delega bien, arma un
  diff limpio para el auditor, y no encuentra la forma de zafar del Gate A
  pidiendole a otro tool que lo haga por el.
- **El hueco de permisos sin alcance de ruta** (`docs/DECISIONS.md` punto
  10) es real y queda abierto: `zai-planner` y `zai-scribe` podrian, en
  teoria, escribir fuera de `docs/` si el modelo no sigue el prompt. Gate A
  no los protege de eso (solo protege tests en `green`).
- **`zai-auditor` sin ninguna herramienta de escritura** es una desviacion
  deliberada del brief literal (que pedia que pudiera escribir su propio
  reporte) — ver `docs/DECISIONS.md` punto 9 para revertirlo si no te
  convence.

## Hooks de `RESEARCH.md` usados vs libres (actualizado)

Usados hasta ahora: `config` (zai.core), `tool.execute.before` y
`tool.execute.after` (zai.phases).

Confirmado y descartado por no estar conectado en esta version:
`permission.ask` (declarado en el tipo, cero invocaciones reales en el
codigo fuente — ver `docs/RESEARCH.md` seccion 9).

Siguen libres: `dispose`, `event`, `tool`, `auth`, `provider`,
`chat.message`, `chat.params`, `chat.headers`, `command.execute.before`,
`shell.env`, y los `experimental.*`.

## Donde creo que el loop se va a romper en un proyecto real

1. **Gate B con proyectos grandes.** `tsc -p` corre sobre el proyecto
   entero en cada escritura de un archivo `.ts` (ver `docs/DECISIONS.md`
   punto 12) — en un monorepo grande esto puede volverse notoriamente
   lento y frustrar exactamente al usuario que este entorno queria ayudar.
   Si esto pasa, la salida es cachear con `--incremental` o acotar Gate B a
   proyectos por debajo de cierto tamano.
2. **El diff "limpio" para el auditor.** El comando `/zai-fase-audit` le
   pide al agente que calcule `git diff` "contra el punto donde arranco la
   fase" pero no hay ningun mecanismo que marque ese punto (un commit, un
   tag) — depende de que el agente lo infiera bien. En un proyecto con
   commits desprolijos esto puede traer un diff incorrecto (de mas o de
   menos) sin que nadie se de cuenta.
3. **`zai-planner` corriendo la suite de tests sin saber el runner.** Los
   comandos le piden que mire `package.json > scripts.test` o pregunte -
   funciona para proyectos Node, pero ZAI todavia no tiene noocion de stack
   (eso es sesion 3). En un proyecto no-Node esto va a fallar la primera
   vez, no en silencio, pero si con friccion.
4. **La ventana entre transicionar a `green` y que el implementer
   arranque** (`/zai-fase-green`, paso 2 vs paso 3): si el comando se corta
   ahi (el usuario cancela, se cae la sesion), el estado queda en `green`
   sin que el implementer haya tocado nada — no es un bug, pero puede
   confundir si alguien retoma la sesion sin releer el spec.

## Como se corren los tests del entorno (sin cambios respecto a sesion 1)

```
pnpm install
pnpm test          # vitest run, 65 tests
pnpm typecheck      # tsc --noEmit
```

## Como verifico yo, a mano, que el loop completo corre de punta a punta

Esto asume que ya corriste `pnpm install` y `pnpm install:zai` en este
repo (si no, hacelo primero).

1. **Confirmar que todo carga**: en cualquier carpeta,
   `opencode debug config` y confirma que `plugin` trae tanto
   `zai.core.ts` como `zai.phases.ts`, que `agent` trae los 5
   `zai-*`, y que `command` trae los 6 `zai-fase-*` mas `zai-init` y
   `zai-estado`.

2. **Ciclo completo sin modelo** (replica exactamente lo que se probo en
   esta sesion, para confirmar que el mecanismo funciona antes de confiarle
   un modelo real):
   ```
   mkdir -p /tmp/zai-e2e/docs/phases
   echo "# fase 1" > /tmp/zai-e2e/docs/phases/01-demo.md
   cd "<esta-repo>"
   echo '{"project":"e2e","firstPhase":{"n":1,"name":"demo","spec":"docs/phases/01-demo.md","test_globs":["**/*.spec.ts"]}}' | pnpm exec tsx scripts/zai-init-state.ts /tmp/zai-e2e
   pnpm exec tsx scripts/zai-transition.ts /tmp/zai-e2e red
   pnpm exec tsx scripts/zai-transition.ts /tmp/zai-e2e green
   echo '[]' | pnpm exec tsx scripts/zai-record-blockers.ts /tmp/zai-e2e
   pnpm exec tsx scripts/zai-transition.ts /tmp/zai-e2e audited
   pnpm exec tsx scripts/zai-transition.ts /tmp/zai-e2e documented
   cat /tmp/zai-e2e/.zai/state.json   # deberia mostrar phase_state: "documented"
   ```

3. **Confirmar el Gate A de verdad, sin modelo**: en un proyecto de
   prueba con `.zai/state.json` en `green` y `test_globs` apuntando a algun
   archivo, intentá que un agente (cualquiera, no hace falta que sea
   `zai-implementer`) edite ese archivo. Deberia devolver un error que
   empieza con "zai gate A". Si preferis no usar un modelo todavia,
   `pnpm test -- gate-a` corre exactamente esa logica de forma aislada.

4. **Probar el loop con un modelo real, de punta a punta** (esto es lo
   unico que esta sesion no pudo probar, por falta de proveedor
   configurado): en un proyecto de prueba real, corré `/zai-init`, despues
   `/zai-fase-red`, `/zai-fase-green`, `/zai-fase-audit`, y si hace falta
   `/zai-fase-fix` y `/zai-fase-audit` de nuevo, y finalmente
   `/zai-fase-close`. Prestale atencion especial a: si `zai-implementer`
   intenta tocar un test y el Gate A lo frena de verdad (no solo que el
   agente "decida" no hacerlo), y si `zai-auditor` devuelve la linea de
   veredicto en el formato exacto que pide su prompt.

---

# HANDOFF.md — de sesion 1 a sesion 2 (historial, sin cambios)

## Que quedo construido y funcionando (verificado, no supuesto)

Todo lo de abajo se probo de verdad, no solo se escribio:

- **`.zai/state.json`**: schema Zod (`modules/core/src/state/schema.ts`),
  lectura/escritura atomica (`io.ts`), unica funcion de transicion
  (`transition.ts`). 25 tests en verde (`pnpm test`), typecheck limpio
  (`pnpm typecheck`).
- **Instalador** (`scripts/install.ts`): probado con `pnpm install:zai` /
  `pnpm uninstall:zai` en este mismo repo. Confirmado: idempotente (correr
  dos veces da el mismo resultado), en Windows cae a copiar archivos en vez
  de symlinkear (sin admin/Developer Mode no hay symlinks — quedo anotado
  en el manifiesto que cada archivo instalado es `"strategy": "copy"`), y
  desinstala limpio (borra exactamente lo que instalo, nada mas).
- **Plugin `zai.core`** (el gate de inyeccion de estado): **probado con el
  binario real de OpenCode** (`opencode debug config` en tres escenarios
  distintos, ver detalle abajo). Funciona.
- **Comandos `/zai-estado` y `/zai-init`**: confirmado que OpenCode los
  auto-descubre y los expone con su template completo
  (`opencode debug config` los muestra en `command.*`).

## Prueba empirica del gate (la parte que mas importaba)

Se instalo ZAI de verdad en `~/.config/opencode` y se corrio
`opencode debug config` (que resuelve la configuracion completa, incluido
el hook `config` de los plugins, sin necesitar un proveedor de modelo
configurado) contra tres proyectos temporales:

1. **Proyecto con `.zai/state.json` valido**: `instructions` en la config
   resuelta trajo, en orden, la ruta a `.zai/.generated-context.md`
   (generado por el plugin, con el resumen del estado) y la ruta al spec de
   la fase actual (`docs/phases/01-auth.md`). Esto es exactamente el
   comportamiento pedido: "el estado y el spec de la fase actual entran
   solos al contexto".
2. **Proyecto sin `.zai/state.json`**: `instructions` no aparece en la
   config resuelta. Sin ruido, sin error.
3. **Proyecto con `.zai/state.json` corrupto** (JSON invalido): el plugin
   imprimio `[zai.core] .zai/state.json looks invalid, skipping context
   injection: ...` con el detalle exacto del error de parseo, y la sesion
   siguio resolviendose normal — no se cayo nada.
4. **`ZAI_DISABLE_GATES=1`** sobre el proyecto valido del punto 1: `instructions`
   vuelve a no aparecer. El escape hatch funciona.

## Que quedo a medias o fragil

- **El instalador cae siempre a "copy" en esta maquina** (no symlink), por
  falta de permisos de symlink en Windows sin Developer Mode. Efecto
  practico: editar un archivo en `modules/core/commands/*.md` (o cualquier
  otro modulo) **no se refleja** hasta correr `pnpm install:zai` de nuevo.
  Esta documentado en `docs/MODULES.md`, pero es friccion real en el dia a
  dia si lo olvidas.
- **`/zai-init` valida el `.zai/state.json` inicial con Zod solo si el
  comando de fallback (`scripts/zai-init-state.ts` via `pnpm --dir
  ~/.config/opencode exec tsx ...`) efectivamente corre.** Si esa
  invocacion cross-repo falla en la practica (rutas con `~` en Windows,
  ZAI instalado en otra ubicacion, etc.), el comando le pide al agente que
  escriba el JSON a mano, sin validacion real. Se probo el script en
  aislamiento (funciona), pero no se probo `/zai-init` de punta a punta
  con un modelo real conversando (no hay proveedor configurado en esta
  maquina para probarlo — ver seccion de verificacion manual, punto 4).
- **La discrepancia de `docs/DECISIONS.md` puntos 1 y 2** (`maxSteps` vs
  `steps`, y las claves de permiso no confirmadas) no bloquea nada de
  sesion 1 porque no se construyo ningun agente todavia, pero sesion 2 va
  a crear agentes (`zai-implementer`, `zai-auditor`) y va a pisar esa
  incertidumbre de lleno. (Actualizacion sesion 2: no se probo `maxSteps`
  porque ningun agente de esta sesion lo necesito - sigue sin confirmar.
  Las claves de permiso resultaron ser mas permisivas de lo que decia el
  tipo, ver `docs/RESEARCH.md` seccion 9 — no es un bloqueo, es al reves.)
- **El warning "background dependency install failed"** (ver
  `docs/DECISIONS.md` punto 8) aparece en cada invocacion de OpenCode sobre
  este repo. No rompio nada en las pruebas, pero no se investigo la causa
  raiz a fondo.

## Hooks de `RESEARCH.md` ya usados vs libres

Ver la seccion actualizada arriba (sesion 2).

## Riesgos detectados para el loop de fases (sesion 2)

1. **No hay mecanismo de retroceso en el FSM** (ver `docs/DECISIONS.md`
   punto 6). (Actualizacion: resuelto distinto de como se preveia -
   `audited` ahora exige `blockers.length === 0` como invariante del propio
   `transitionPhaseState`, asi que nunca hace falta "retroceder": un audit
   fallido simplemente nunca llega a transicionar. Ver
   `modules/core/src/state/blockers.ts`.)
2. **La estrategia "copy" en Windows** — confirmado que sigue siendo el
   caso en sesion 2 (los 12 archivos nuevos de `modules/phases/` tambien
   se instalaron via copy).
3. **El campo `tools` de `AgentConfig`** — confirmado en runtime en sesion
   2, ver arriba.
4. **El plugin es deliberadamente dependency-free** — se mantuvo la misma
   decision para `zai.phases.ts`. No se termino de probar si un plugin
   puede importar `node_modules` de este repo via pnpm; sigue siendo la
   unica pieza de la arquitectura que se evita probar por precaucion en
   vez de resolverse.

## Como se corren los tests del entorno

Ver la seccion actualizada arriba (sesion 2) — el comando no cambio, solo
crecio el numero de tests.

## Como verificar vos, a mano, que v0.1 funciona

Ver la seccion actualizada arriba (sesion 2) para el ciclo completo. Los
pasos especificos de sesion 1 (instalar, `opencode debug config`,
`/zai-estado`) siguen siendo validos tal cual.
