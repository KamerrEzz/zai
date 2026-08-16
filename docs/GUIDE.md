# GUIDE.md — instalación y uso de ZAI, paso a paso

Esta guía asume que no tocaste ZAI nunca. Si ya lo tenés instalado y solo
querés el resumen, `README.md` alcanza — esto es la versión larga, con
salidas de ejemplo reales (no inventadas: son las que se vieron corriendo
`opencode debug config` y un proyecto de prueba real durante el desarrollo
de ZAI).

## 1. Requisitos

- **Node 18 o superior.** `node --version`.
- **pnpm.** `pnpm --version`. Si no lo tenés: `npm i -g pnpm`.
- **`opencode-ai`** instalado global: `npm i -g opencode-ai`, después
  `opencode --version` (si el comando no aparece en tu PATH en Windows,
  usá la ruta completa al `.exe` dentro de tu carpeta global de npm — ver
  la sección de troubleshooting más abajo).

## 2. Instalar

Este repo **no es** el directorio de config de OpenCode — es código fuente
normal, cloná donde tengas tus otros repos:

```sh
git clone <este-repo> ~/projects/zai   # o donde prefieras
cd ~/projects/zai
pnpm install
```

Salida esperada de `pnpm install`: resuelve las dependencias (`zod`, `tsx`,
`typescript`, `vitest`) y termina sin errores. Si ves un warning sobre
`esbuild` y build scripts ignorados, ya está resuelto en
`pnpm-workspace.yaml` (`onlyBuiltDependencies`/`allowBuilds`) — no debería
pasarte, pero si pasa, `pnpm approve-builds` lo resuelve a mano.

Ahora instalá ZAI en OpenCode:

```sh
pnpm install:zai
```

Salida esperada:

```
- zai: 1 root file(s) installed
- core: 3 item(s) installed
- phases: 12 item(s) installed
- stack: 6 item(s) installed

done. 22 item(s) tracked in <tu-config>/.zai-install-manifest.json
```

(El número exacto de items puede cambiar si desactivaste algún módulo.)

## 3. Verificar que quedó instalado

```sh
opencode debug config
```

Buscá estas claves en la salida:

- `"plugin"`: tiene que listar `zai.core.ts`, `zai.phases.ts`, `zai.stack.ts`
  (salvo que hayas desactivado `phases` o `stack`).
- `"agent"`: `zai-planner`, `zai-test-author`, `zai-implementer`,
  `zai-auditor`, `zai-scribe`.
- `"command"`: `zai-init`, `zai-estado`, `zai-fase-start`, `zai-fase-red`,
  `zai-fase-green`, `zai-fase-audit`, `zai-fase-fix`, `zai-fase-close`.

```sh
opencode debug skill
```

Tiene que listar `zai-stack-backend-framework`, `zai-stack-queues`,
`zai-stack-auth`, `zai-stack-api-layer`, `zai-stack-fresh-docs`, y los
ocho `zai-practices-*` (`commits`, `changelog`, `comments`, `typing`,
`architecture`, `patterns`, `security`, `testing`).

Si algo de esto falta, corré `pnpm install:zai` de nuevo desde el repo y
revisá la salida por errores — el instalador falla fuerte (no en silencio)
si un archivo ya existe y no lo puso él.

## 4. Primer uso: `/zai-init`

Parado en la raíz de **tu** proyecto (no de ZAI), con OpenCode corriendo:

```
/zai-init
```

Te interroga, una pregunta por vez — no vas a ver una lista de preguntas
de una, va esperando cada respuesta:

1. Nombre del proyecto.
2. Qué problema resuelve / para quién.
3. Qué queda fuera de alcance por ahora.
4. Restricciones no negociables (stack impuesto, deadline, integraciones).

Con eso escribe `docs/VISION.md` y te lo muestra antes de seguir. Después
te pregunta en qué fases pensás dividir el trabajo — vos las proponés, no
el agente — y arma `docs/tasks.md` más el spec de la fase 1 en
`docs/phases/01-<nombre>.md`. Al final, `.zai/state.json` queda escrito
con la fase 1 en `planning`.

Confirmalo:

```
/zai-estado
```

```
proyecto: <tu proyecto>
fase: 1 - <nombre de fase 1>
estado: planning
spec: docs/phases/01-<nombre>.md
blockers: ninguno
```

## 5. El loop de una fase

### `/zai-fase-red`

Delega en `zai-test-author`, que escribe los tests del spec — **antes** de
que exista implementación. Es correcto y esperado que fallen. El comando
verifica que efectivamente fallan (no que "no compilan", una aserción real
fallando) antes de transicionar a `red`.

### `/zai-fase-green`

Transiciona a `green` primero (así el gate de tests intocables ya está
activo cuando arranca la implementación), y delega en `zai-implementer`.
Si el implementador intenta tocar un archivo de test, el gate lo frena en
seco — este es el mensaje real que vas a ver (verificado corriendo el gate
contra un proyecto real durante el desarrollo de ZAI):

```
zai gate A: tests are locked while phase_state is "green". Refusing to
write to: src\app.spec.ts. If the test itself is genuinely wrong, say so
explicitly and ask the user before touching it - don't edit around this
gate.
```

No es un mensaje de la IA "decidiendo" no tocarlo — la escritura nunca
llega a ocurrir.

### `/zai-fase-audit`

Arma un diff limpio (sin el historial de quién escribió qué) y se lo pasa
a `zai-auditor`, que es de **solo lectura** — ni siquiera puede escribir su
propio reporte. Quien lo invocó (`zai-planner`) persiste
`docs/audits/fase-NN.md` con lo que devolvió, sin resumir. Si hay
blockers, la fase se queda en `green` (no hace falta "retroceder" — nunca
llegó a transicionar) y el siguiente paso es:

### `/zai-fase-fix`

Toma los `blocker`/`mayor` del último reporte (los `menor` quedan
anotados, no se atienden en este ciclo), delega en `zai-implementer`, y
te dice que corras `/zai-fase-audit` de nuevo — no se reauditoría solo.

### `/zai-fase-close`

La validación dura de cierre: corre la suite **completa** (no solo la de
esta fase), y si el exit code no es 0 **para ahí** — no hay hook que
bloquee esto a nivel de herramienta (investigado y documentado en
`docs/RESEARCH.md`), así que este comando es la barrera real. Si pasa,
delega en `zai-scribe` para el ADR (solo si amerita — ver
`modules/phases/agents/zai-scribe.md` para el criterio exacto), el
`CHANGELOG.md`, y decide el bump de versión (`scripts/zai-bump-version.ts`
hace la aritmética semver real, no lo estima el modelo). Recién ahí
transiciona a `documented`.

Para la fase siguiente: `/zai-fase-start`.

## 6. Cuando un gate te bloquea, no es un bug

Los cuatro gates (A, B, D, E) tiran errores reales, verificados contra el
código fuente de OpenCode y — en el caso de A, D y E — contra proyectos
reales durante el desarrollo. Ejemplos reales de cada uno:

**Gate E** (dependencia joven sin consultar `context7`):

```
zai gate context7: about to add next (major version 16 first published
2025-10-10, under 12 months ago) without consulting context7 in this
session. See the zai-stack-fresh-docs skill: call context7
(resolve-library-id + query-docs) for this library first, then retry.
```

**Gate D** (commit bloqueado):

```
zai gate D: commit blocked - CHANGELOG.md has no changes in the working
tree. Escape hatch: set ZAI_ALLOW_COMMIT=1 if you need to commit anyway.
```

Si un gate te frena y de verdad necesitás pasar igual (estás con prisa,
estás depurando algo puntual), cada uno tiene su variable `ZAI_*` — ver la
tabla en `README.md`. Usalos a propósito, no porque el gate "molesta".

## 7. Troubleshooting

**`opencode` no está en el PATH (Windows/PowerShell)**: el paquete
`opencode-ai` a veces no genera el shim `opencode.cmd` si el postinstall
no corrió. Usá la ruta completa:
`& "$env:APPDATA\npm\node_modules\opencode-ai\bin\opencode.exe" <comando>`,
o corré `npm i -g opencode-ai` de nuevo para que regenere los shims.

**`opencode debug config` tarda ~20 segundos y muestra un warning de
"background dependency install failed"**: es un comportamiento propio de
OpenCode (gestiona sus propias dependencias internas con Bun en su
directorio de config) — no es de ZAI, no bloquea nada. Ver
`docs/DECISIONS.md` puntos 8 y 15.

**La TUI de OpenCode (`opencode` sin subcomando) no abre nada, ni con
`--print-logs --log-level DEBUG`**: es un problema visto en algunas
combinaciones de máquina/terminal, no reproducido de forma concluyente. Si
te pasa, `opencode debug config` y los demás subcomandos no-interactivos
siguen funcionando igual — podés seguir usando ZAI por ahí mientras se
investiga. Ver `docs/DECISIONS.md` puntos 14 y 15 para el detalle de qué
se probó.

**En Windows, el instalador dice `"strategy": "copy"` en vez de `"symlink"`
en el manifiesto**: normal sin permisos de symlink (Developer Mode o
admin). Funciona igual, pero un cambio en `modules/<nombre>/...` no se
refleja hasta que corras `pnpm install:zai` de nuevo — no hay hot-reload
con copias.

## 8. Actualizar y desinstalar

Después de `git pull` (o de editar algo vos mismo en `modules/`):

```sh
pnpm install:zai
```

Es idempotente — re-sincroniza todo desde cero cada vez, así que correrlo
de más nunca rompe nada.

Para sacar ZAI de tu máquina:

```sh
pnpm uninstall:zai
```

Y si además querés borrar el repo: `rm -rf <donde lo hayas clonado>`.
