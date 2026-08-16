# DECISIONS.md — supuestos, no confirmados en docs oficiales, y como verificarlos

## 1. Campo `steps` vs `maxSteps` en agentes markdown

`https://opencode.ai/docs/agents` (resumen) dice que el campo de frontmatter
es `steps`. El tipo fuente real `AgentConfig`
(`packages/sdk/js/src/gen/types.gen.ts`, tag `v1.18.18`) dice `maxSteps`.
No construimos ningun agente en esta sesion (eso es sesion 2), asi que esto
no se probo en la practica todavia.

**Como verificarlo**: cuando en sesion 2 se cree el primer agente con limite
de steps, probar ambos nombres de campo con `opencode debug agent <name>` y
ver cual efectivamente lo aplica.

## 2. Claves de permiso fuera del tipo fuente (`read`, `glob`, `grep`, `task`, `skill`, `lsp`, `question`, `websearch`)

`https://opencode.ai/docs/permissions` (resumen) las menciona. El tipo fuente
`Config.permission`/`AgentConfig.permission` solo tiene `edit`, `bash`,
`webfetch`, `doom_loop`, `external_directory`. No se uso ninguna de las
claves en conflicto en esta sesion.

**Como verificarlo**: `opencode debug config` con un `permission.read: "ask"`
de prueba en `opencode.json` y ver si aparece en la config resuelta o si se
descarta silenciosamente.

## 3. Semantica de "primer match" entre `AGENTS.md` global y `~/.claude/CLAUDE.md`

`https://opencode.ai/docs/rules` (resumen) sugiere que un `AGENTS.md` global
propio evita el fallback a `~/.claude/CLAUDE.md`. No lo probamos: esta
maquina ya tenia (y sigue teniendo) un `~/.claude/CLAUDE.md` real y extenso,
y `AGENTS.md` de este repo ya existe desde esta sesion.

**Como verificarlo**: correr una sesion real de OpenCode TUI en un proyecto
cualquiera y revisar el system prompt efectivo (o `opencode debug config`)
para confirmar si el contenido de `~/.claude/CLAUDE.md` aparece mezclado.
Si aparece, activar `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1` (env var
confirmada en `docs/RESEARCH.md` seccion 7) en tu perfil de shell.

## 4. Renombre de `version` a `schema_version` en `.zai/state.json`

El brief proponia `"version": "0.1.0"` junto a `"project": "nombre"`, sin
aclarar si es la version del proyecto o del formato del archivo. Se renombro
a `schema_version` para eliminar la ambiguedad — es la version del FORMATO
de `.zai/state.json`, para futuras migraciones del archivo en si, no la
version del proyecto consumidor (esa vive en su propio `package.json` o
donde corresponda). Esto es una decision de diseno, no un dato de OpenCode
— se las marco separado por si preferis el nombre original.

**Como revertirlo si no te gusta**: renombrar el campo en
`modules/core/src/state/schema.ts` (`ZaiStateSchema`) y en
`modules/core/src/state/io.ts` (`createInitialState`), correr `pnpm test`.

## 5. `state` duplicado por fase (`phases[].state`) ademas de `phase_state` a nivel raiz

El brief solo tenia `phase_state` a nivel raiz. Se agrego `state` a cada
entrada de `phases[]`, sincronizado por `transitionPhaseState` y validado
cruzado por el schema, para que `/zai-estado` (y el futuro loop de fases)
puedan mostrar el historial de fases pasadas sin inferirlo. Es redundante
por diseno — `transitionPhaseState` es el unico escritor y los mantiene
consistentes; el schema rechaza un archivo donde no coincidan.

## 6. FSM estrictamente sin retrocesos ni saltos, incluso para auditorias fallidas

`transitionPhaseState` solo permite el siguiente paso exacto del FSM. No
hay forma de volver de `audited` a `green` si una auditoria encuentra
problemas despues de haber marcado `audited` por error, ni de que una
auditoria fallida dispare un retroceso automatico. Es una limitacion
conocida, no un olvido — ver `docs/HANDOFF.md`, es responsabilidad del
agente auditor de sesion 2 decidir esa semantica (que hacer con
`blockers[]` cuando la auditoria falla).

## 7. Sin `opencode.json` en la raiz del repo

Confirmado empiricamente (ver `docs/HANDOFF.md`) que agentes, comandos y
plugins se auto-descubren por convencion de carpeta sin necesitar
`opencode.json`. No se creo ninguno para v0.1 porque nada lo necesita
todavia. El dia que haga falta (por ejemplo, para fijar `permission`
globales), agregarlo es un archivo nuevo, no una migracion.

## 8. Warning "background dependency install failed" al cargar el config

Al correr `opencode debug config` sobre este repo, OpenCode emite:

```
level=WARN message="background dependency install failed" dir="...\.config\opencode" error="Cause([Fail(NpmInstallFailedError (cause: Error: could not resolve))])"
```

No bloqueo nada en las pruebas de esta sesion (el config se resolvio bien
en los tres casos probados). Hipotesis mas probable: OpenCode ve el
`package.json` real de este repo (que ahora es tambien su propio directorio
de config) y trata de instalarle dependencias con su propio instalador
interno, sin entender el layout de `pnpm-workspace.yaml`. No se investigo
mas a fondo por alcance de sesion.

**Como verificarlo**: `opencode debug startup` con `--log-level DEBUG` y
revisar si el installer interno de OpenCode intenta correr contra
`package.json`/`pnpm-lock.yaml` de este repo. Si es asi, evaluar en sesion 2
si conviene mover `package.json` fuera de la raiz visible para OpenCode o
si es inofensivo y se puede ignorar.

(Actualizacion sesion 2: sigue apareciendo, sigue sin bloquear nada. No se
investigo mas — no afecto ninguna de las pruebas de esta sesion tampoco.)

## 9. `zai-auditor` no tiene NINGUNA herramienta de escritura, ni siquiera para su propio reporte

El brief de sesion 2 pedia que `zai-auditor` pudiera "escribir su reporte"
ademas de ser de solo lectura — dos cosas en tension. Se resolvio a favor de
la version mas segura: `zai-auditor` tiene `tools: { edit: false, write:
false, apply_patch: false, task: false }` — cero capacidad de escritura,
punto. El flujo real (ver `modules/phases/commands/zai-fase-audit.md`) es:
`zai-planner` delega en `zai-auditor` via `task`, recibe su respuesta como
texto, y **`zai-planner`** persiste `docs/audits/fase-NN.md`.

**Por que:** un auditor que puede escribir, aunque sea "solo su reporte",
tecnicamente puede escribir cualquier archivo (no hay permisos con alcance
de ruta en esta version — ver punto 10) y ademas puede reescribirse su
propio veredicto si algo sale mal a mitad de un turno largo. Sacarle toda
herramienta de escritura es una garantia mas fuerte que "confiar en que
solo toque `docs/audits/`", y no le cuesta nada al usuario: el reporte se
sigue escribiendo, solo que lo persiste quien lo invoco.

**Si preferis la version literal del brief** (el auditor escribe su propio
archivo): sacale `write: false` del frontmatter de `modules/phases/agents/zai-auditor.md`
y ajustá `modules/phases/commands/zai-fase-audit.md` para que no lo haga
`zai-planner`. Lo marco separado porque es una desviacion deliberada, no un
error.

## 10. No existe permiso de escritura con alcance de ruta (path) en esta version

Pedido explicito del brief: "si OpenCode soporta permisos con patrones de
archivo por agente, usalos. Si no, dime que es lo mas cerca que se puede
llegar y cual es el hueco real que queda."

Confirmado por tipo fuente (`docs/RESEARCH.md` seccion 9): `bash` admite
`{ patron: "ask"|"allow"|"deny" }`, pero **`edit` no** — es
`"ask"|"allow"|"deny"` para el agente entero, sin variante por patron.
`tools: { edit: boolean }` tampoco distingue rutas — es todo o nada por
tool, no por archivo.

**Lo mas cerca que se puede llegar, en esta version:**
1. Negar la tool entera cuando el rol no necesita ningun tipo de escritura
   (`zai-test-author`, `zai-implementer`, `zai-auditor`, `zai-scribe` -
   cada uno con `apply_patch`/`task`/`bash` denegados segun corresponda).
2. Para roles que **si** necesitan escribir pero solo en cierta carpeta
   (`zai-planner` en `docs/`, `zai-scribe` en `docs/` + `CHANGELOG.md`): no
   hay enforcement de herramienta. Queda en el prompt del agente
   (`modules/phases/agents/zai-planner.md`, `zai-scribe.md` dicen
   explicitamente que no toquen codigo) mas Gate A, que protege
   especificamente los archivos de test en `green` — pero Gate A no protege
   el resto de `src/` de un `zai-planner` que decida escribir ahi por error.

**El hueco real:** un `zai-planner` o `zai-scribe` con un prompt mal seguido
(o un modelo que alucina) puede escribir fuera de `docs/`, en cualquier
archivo del proyecto que no sea un test protegido por Gate A. No hay barrera
tecnica para eso en esta version de OpenCode. Si esto te importa lo
suficiente, la opcion real seria extender `zai.phases` con un tercer gate
(mismo mecanismo que Gate A: `tool.execute.before` + tirar error, pero
filtrando por agente en vez de por `phase_state`) — no se construyo en esta
sesion porque no estaba pedido explicitamente y `tool.execute.before` no
trae que agente esta llamando (solo `sessionID`/`callID`, ver
`docs/RESEARCH.md` seccion 9) — habria que resolver el agente activo
consultando `client` por `sessionID`, lo cual no se verifico que sea
posible. Si lo queres para sesion 3, es un buen candidato a investigar
primero.

## 11. Gate C: sin hook real, resuelto en `/zai-fase-close`

Ver `docs/RESEARCH.md` seccion 9 para la confirmacion de que no existe, en
la lista completa y verificada de hooks, ninguno que bloquee el fin de
turno de un agente. La resolucion, tal como preveia el brief: la validacion
dura vive en `/zai-fase-close` (corre la suite completa, si el exit code no
es 0 el comando le dice explicitamente al agente que pare y no transicione).
No hay proteccion equivalente **dentro** de un turno de `/zai-fase-green` —
si el agente se da por terminado con tests todavia en rojo a mitad de la
fase, nada lo detiene ahi mismo; se detecta recien en `/zai-fase-audit`
(el diff no cumple el spec) o en `/zai-fase-close` (la suite no pasa). Es
una limitacion real del entorno, no solo de esta implementacion.

## 12. Gate B corre `tsc --noEmit` sobre el proyecto completo, no solo el archivo editado

El brief pedia "corre tsc --noEmit... sobre ese archivo" y en la misma
frase "cuida el costo: no corras el proyecto completo en cada edicion" —
dos pedidos en tension. `tsc` no tiene un modo de verificacion de un solo
archivo *dentro del contexto de tipos del proyecto* sin alguna forma de
correr sobre el proyecto entero (o usar la API del language service, que
es mucho mas trabajo del que entra en esta sesion). La resolucion elegida:
`zai.phases` corre `tsc --noEmit -p <tsconfig.json mas cercano>` (si existe
uno, si no, no corre nada) pero **filtra la salida** para mostrarle al
agente solo las lineas que mencionan el archivo que toco. El costo de
computo de `tsc` sigue siendo el del proyecto completo — lo que se acoto es
el *feedback*, no el trabajo. ESLint si tiene modo de archivo unico real
(`eslint <archivo>`), asi que ese lado del gate cumple el pedido tal cual.

**Si el proyecto es grande y esto resulta lento en la practica**, la
alternativa (no construida) seria usar `tsc --incremental` con un
`.tsbuildinfo` cacheado entre corridas, o la API del language service para
diagnosticos de un solo archivo. Anotado para revisar si se vuelve un
problema real de uso.

## 13. Bug real encontrado en sesion 3: Gate B no funcionaba en Windows (silencioso)

Verificado con un proyecto de juguete real (`docs/HANDOFF.md`, seccion de
sesion 3): `execFileAsync(tsc, [...])` y `execFileAsync(eslint, [...])`
tiraban `spawn EINVAL` en Windows porque `child_process.execFile` no puede
invocar un shim `.cmd` (`node_modules/.bin/tsc.cmd`) sin `{ shell: true }`.
El error `EINVAL` no trae `stdout`/`stderr`, asi que el `catch` de
`runTypecheck`/`runLint` interpretaba `err.stdout` como `undefined`, lo
convertia en `""`, y el gate concluia "sin problemas" — un falso negativo
total. Gate B nunca habia corrido de verdad en esta maquina hasta que se
probo contra un proyecto real con un error de tipos deliberado.

**Por que ningun test lo detecto**: los tests de `gate-b.test.ts` de sesion
2 solo cubrian "no hay tsc/eslint instalado" (retorna `null` sin correr
nada) — nunca ejercitaban el camino de invocar el binario real. Ese hueco
de cobertura es exactamente lo que la sesion 3 pedia explicitamente probar
con un proyecto de verdad, y es exactamente lo que encontro.

**Fix**: `{ shell: process.platform === "win32" }` en ambas llamadas.
Acotado a Windows (POSIX no lo necesita). Node advierte que `shell: true`
con un array de argumentos no los escapa — aceptado deliberadamente porque
ambos argumentos (`tsconfigPath`, `filePath`) son rutas que el propio gate
ya confirmo que existen en disco (via `findUp`/`touchedPaths`), no texto
arbitrario de un tercero. Ver el comentario en
`modules/phases/plugins/zai.phases.ts` para el detalle.

**No se agrego un test unitario de regresion para esto** — reproducir el
bug exacto (comportamiento de spawn de Windows ante un `.cmd`) en un test
rapido y determinista hubiera significado mockear `child_process`, que es
precisamente el nivel de abstraccion donde vivia el bug: un mock lo hubiera
vuelto a esconder. La cobertura real para esto es correr el gate contra un
proyecto real con `tsc`/`eslint` instalados de verdad — que es lo que se
hizo, a mano, en sesion 3, y lo que se recomienda repetir si este archivo
se vuelve a tocar.

## 14. La TUI de OpenCode no renderiza en esta maquina/terminal

Intentando la prueba de punta a punta con un modelo real (sesion 3), tanto
`opencode providers login` (via `Bash` de esta sesion) como `opencode`
directo (corrido por el usuario en su propia PowerShell) se cuelgan sin
mostrar nada — ni siquiera logs con `--print-logs --log-level DEBUG`. Se
descarto que fuera especifico de correr parado en `~/.config/opencode`: el
usuario confirmo que tampoco abre en otra carpeta. Es un problema de esta
maquina/terminal con la TUI de OpenCode, no de ZAI ni de esta sesion en
particular.

**No resuelto.** La via alternativa no interactiva (documentada en
`https://opencode.ai/docs/providers`, no verificada contra codigo fuente
en esta sesion por falta de tiempo): un provider custom en `opencode.json`
con `options.apiKey: "{env:VAR}"` apuntando a una variable de entorno,
saltando el flujo de login interactivo por completo. El usuario no tenia
una API key a mano para probarla en esta sesion.

**Como retomarlo**: cuando haya una API key disponible, o en una maquina
donde la TUI renderice bien, correr `opencode providers login -p <proveedor>`
(interactivo) o armar el `opencode.json` con `{env:VAR}` (no interactivo,
sin verificar) y despues seguir los pasos de `docs/HANDOFF.md` para el loop
completo con modelo real.

## 15. El repo dejo de ser `~/.config/opencode` (post v0.3.0)

El usuario planteo la hipotesis de que el punto 14 (la TUI sin renderizar)
tenia que ver con que este repo **fuera** literalmente el directorio de
config de OpenCode. Se ejecuto la migracion: el repo ahora vive donde se
clone (en esta maquina, `D:\CODE\projects\zai`), y `scripts/install.ts`
copia/enlaza hacia `~/.config/opencode` (o `OPENCODE_CONFIG_DIR`) en vez de
ser esa carpeta.

**Hallazgo real durante la migracion, mas preciso que la hipotesis
original**: al inspeccionar `~/.config/opencode` despues de mover el repo,
aparecio un `node_modules/` y un `.gitignore` (listando
`node_modules`/`package.json`/`package-lock.json`/`bun.lock`/`.gitignore`)
que **no son de ZAI** — son de OpenCode mismo: `node_modules` tiene
paquetes como `@opencode-ai`, `effect`, `@ai-sdk`, que son las propias
dependencias internas de OpenCode. El `bun.lock` en la lista sugiere que
OpenCode gestiona ese `node_modules` con Bun, no con npm/pnpm. Esto pasa
**independientemente** de si ZAI vive ahi o no — no es un efecto de ZAI, es
un comportamiento propio de OpenCode al arrancar contra ese directorio de
config (relacionado con, pero mas amplio que, el warning de "background
dependency install failed" del punto 8).

Esto cambia el diagnostico: no es (solo) "el repo de ZAI no deberia vivir
en el directorio de config", es que **dos gestores de paquetes distintos
(nuestro pnpm y lo que sea que use OpenCode internamente) competian por
los mismos nombres de archivo (`package.json`, `node_modules`,
`pnpm-lock.yaml`/`bun.lock`) en la misma carpeta**. Eso es un conflicto
real y plausible como causa de comportamiento roto, mas alla de si "vive
ahi" en un sentido mas vago. La migracion sigue siendo la correccion
correcta — solo que el motivo preciso es mas especifico de lo que se
sospechaba.

**No confirmado todavia**: si esto efectivamente arregla el problema de la
TUI del punto 14 — eso requiere que el usuario pruebe `opencode` de nuevo
despues de la migracion. `opencode debug config` (que no usa la TUI) sigue
resolviendo todo correctamente despues de mover el repo — eso confirma que
la migracion no rompio nada de ZAI, pero no confirma ni descarta que haya
arreglado la TUI.

**Cambios tecnicos de la migracion**:
- `scripts/install.ts`: `REPO_ROOT` (donde vive el codigo fuente, derivado
  de la ubicacion del propio script) separado de `CONFIG_ROOT`
  (`OPENCODE_CONFIG_DIR` o `~/.config/opencode`, confirmado por codigo
  fuente en `docs/RESEARCH.md` seccion 2). El manifiesto
  (`.zai-install-manifest.json`) ahora vive en `CONFIG_ROOT`, no en el repo.
- Nuevo archivo generado, `<CONFIG_ROOT>/.zai-repo-path`: la ruta absoluta
  del repo, para que los comandos (`/zai-fase-*`, `/zai-init`) sepan desde
  donde invocar `scripts/zai-*.ts` sin asumir una ubicacion fija — ver los
  comandos actualizados (`pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" ...`).
- `AGENTS.md` pasa a ser un tipo de item instalable nuevo (`kind: "root"`
  en el manifiesto): un archivo suelto en la raiz del repo que se instala
  directo en la raiz de `CONFIG_ROOT`, distinto de los items por-modulo.
- `.gitignore` y `tsconfig.json` simplificados: ya no excluyen
  `agents/commands/plugins/skill` porque esas carpetas nunca vuelven a
  aparecer dentro de este repo (se generan enteramente en `CONFIG_ROOT`).
