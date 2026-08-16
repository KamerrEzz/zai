# NAMESPACE.md — convencion de nombres de ZAI

ZAI no es "el loop de fases". El loop de fases es el primer modulo. ZAI es el
namespace del toolkit completo, y dentro de seis meses va a tener modulos que
no tienen nada que ver entre si. Esta convencion existe para que, cuando
llegue ese dia, sepas donde va cada cosa sin tener que releer todo esto —
solo la regla de decision.

## La regla de decision

Antes de nombrar o ubicar cualquier archivo nuevo, hacete una sola pregunta:

> **¿Esto tiene sentido si desinstalo ZAI?**

- Si la respuesta es **si** (el archivo sigue siendo util, legible y correcto
  aunque la herramienta que lo genero ya no exista) -> **no lleva prefijo**,
  vive en `docs/`, `CHANGELOG.md`, `README.md`, etc. Son artefactos *del
  proyecto*. Un spec de fase, un ADR, un changelog: eso le pertenece al
  proyecto, no a la herramienta que lo ayudo a escribir.
- Si la respuesta es **no** (el archivo es mecanismo interno de ZAI: como
  sabe en que fase estas, que agente invocar, que plugin corre) -> **lleva
  prefijo `zai`**, y vive en el namespace de configuracion de OpenCode
  (`~/.config/opencode/{agents,commands,plugins}/`) o en `.zai/` dentro del
  proyecto consumidor.

Esta pregunta importa porque los comandos, agentes y plugins de OpenCode
viven en un **namespace global plano**: si dos herramientas instalan un
agente llamado `planner.md`, una pisa a la otra. `docs/`, en cambio, es tuyo,
no de la herramienta — ahi no hay colision posible, asi que no hace falta
ensuciarlo con prefijos.

## La tabla

| Cosa | Convencion | Ejemplo | Vive en |
|---|---|---|---|
| Comando del core | `/zai-<accion>` | `/zai-estado` | `~/.config/opencode/commands/` |
| Comando de un modulo | `/zai-<modulo>-<accion>` | `/zai-fase-start` | `~/.config/opencode/commands/` |
| Agente | `zai-<rol>` | `zai-planner`, `zai-auditor` | `~/.config/opencode/agents/` |
| Plugin | `zai.<modulo>` | `zai.core`, `zai.phases` | `~/.config/opencode/plugins/` |
| Skill | `zai-<modulo>-<tema>` | `zai-stack-queues` | `~/.config/opencode/skill/` |
| Variable de entorno | `ZAI_*` | `ZAI_DISABLE_GATES` | proceso |
| Estado de proyecto | `.zai/` | `.zai/state.json` | raiz del proyecto consumidor |
| Artefacto de proyecto | sin prefijo | `docs/phases/`, `docs/adr/`, `docs/audits/`, `docs/tasks.md`, `CHANGELOG.md`, `README.md` | raiz del proyecto consumidor |

## Por que `/zai-<modulo>-<accion>` y no `/zai-<accion>-<modulo>`

Porque en un namespace plano de comandos, queres que los comandos del mismo
modulo aparezcan juntos alfabeticamente al autocompletar. `/zai-fase-start`,
`/zai-fase-audit`, `/zai-fase-doc` quedan agrupados. Si fuera
`/zai-start-fase` se mezclarian con comandos de otros modulos que tambien
empiecen con una accion generica como "start".

## Por que el core no lleva `<modulo>` en el nombre

`modules/core/` es el unico modulo que no es opcional — sin el no hay
`.zai/state.json`, no hay registro de modulos, no hay nada. Sus comandos
(`/zai-estado`, `/zai-init`) representan al toolkit en si, no a una
funcionalidad instalable/desinstalable, asi que no cargan el segmento de
modulo. El dia que `core` deje de ser especial (no deberia pasar, pero por
las dudas), esta regla se revisa explicitamente, no se infiere.

## Por que los skills llevan el segmento de modulo (a diferencia de los agentes)

Los agentes se llaman `zai-<rol>` sin modulo porque un rol ("auditor",
"planner") ya suena especifico y poco propenso a colisionar. Los skills, en
cambio, tienden a tener nombres de tema genericos ("queues", "auth",
"api-layer") — exactamente el tipo de nombre que otra herramienta
instalada en la misma maquina tambien podria elegir. Por eso llevan
`zai-<modulo>-<tema>`, igual que los comandos, y no solo `zai-<tema>`.

## Que hacer cuando agregues un modulo nuevo

1. Elegi un nombre corto de modulo (una palabra, minusculas): `phases`,
   `deploy`, `review`, lo que sea.
2. Todo lo que ese modulo instale en el namespace global de OpenCode lleva
   ese nombre en su prefijo: `zai.<modulo>` para el plugin,
   `/zai-<modulo>-<accion>` para sus comandos, `zai-<rol>` para sus agentes
   (el rol ya es suficientemente especifico como identificador — no hace
   falta repetir el nombre del modulo ahi tambien, ver `docs/MODULES.md`).
3. Si el modulo necesita persistir estado propio dentro de `.zai/`, usa una
   subclave con su nombre (por ejemplo, un futuro modulo `deploy` no toca
   `phase_state`, agrega su propia seccion). El schema de `.zai/state.json`
   es del core; un modulo no le agrega campos al nivel raiz sin pasar por
   `modules/core/src/state/schema.ts`.
4. Si el modulo genera artefactos que le importan al proyecto y no a la
   herramienta, van sin prefijo en `docs/` — aplicá la regla de decision de
   arriba.

Ver `docs/MODULES.md` para el mecanismo tecnico de instalar/desinstalar un
modulo (no solo la convencion de nombres).
