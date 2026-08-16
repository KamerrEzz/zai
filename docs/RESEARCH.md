# RESEARCH.md — Contrato de API de OpenCode para ZAI

Este documento es el contrato. Todo el codigo de las sesiones 1, 2 y 3 sale de aqui.
Si un dato no esta aqui, no se usa.

Fecha de consulta: 2026-08-15.

---

## 1. Version detectada

- Binario: `opencode-ai` (npm), instalado global (`npm ls -g`).
- Version: **1.18.18** (`opencode --version`, ejecucion real del binario tras
  correr `postinstall.mjs` a mano porque el postinstall no se habia ejecutado
  en la instalacion existente).
- `opencode2` no existe como comando ni como paquete.
- Fuente: ejecucion directa del binario en esta maquina
  (`C:\Users\kamer\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe --version`).

### Conclusion sobre API v1 vs V2 beta

Esta version usa la **API de plugins v1 (estable)**, no la V2 beta.

Verificado leyendo el codigo fuente real del tag `v1.18.18` en GitHub
(`sst/opencode`, `packages/plugin/src/index.ts`):

```ts
export type Plugin = (input: PluginInput, options?: PluginOptions) => Promise<Hooks>
```

Esto es el patron "funcion que recibe contexto y devuelve un objeto de hooks",
exactamente el patron v1 descrito en el prompt de la sesion. La firma V2
(`Plugin.define({ id, setup })`) existe en `https://opencode.ai/v2/docs/build/plugins`,
pero esa pagina dice explicitamente: *"The V2 plugin API is beta. Entrypoints,
hooks, draft shapes, and configuration may change before the stable release."*
No aplica a esta instalacion. **No se usa nada de esa pagina en este proyecto.**

Fuente: `https://raw.githubusercontent.com/sst/opencode/v1.18.18/packages/plugin/src/index.ts`
(codigo fuente real, no resumen de marketing) + `https://opencode.ai/v2/docs/build/plugins`
(para confirmar que es beta y no aplica).

---

## 2. Config: rutas y precedencia

- Config global: `~/.config/opencode/opencode.json` (mas `tui.json` para el TUI).
- Config de proyecto: `opencode.json` en la raiz del proyecto (mas `tui.json` opcional).
- Precedencia (de menor a mayor prioridad, la ultima gana):
  1. Config remota (`.well-known/opencode`)
  2. Config global
  3. Config custom (`OPENCODE_CONFIG` env var)
  4. Config de proyecto
  5. Directorios `.opencode`
  6. Config inline (`OPENCODE_CONFIG_CONTENT` env var)
  7. Managed config files
  8. macOS managed preferences (maxima prioridad)
- Formato: JSON o JSONC. Schema: `https://opencode.ai/config.json`.

Fuente: `https://opencode.ai/docs/config` (pagina de docs, resumen — no fuente
verbatim). Nivel de confianza: alto para las rutas (coinciden con el patron
estandar del proyecto y con lo que usan `agents/` y `commands/` mas abajo),
medio para el orden exacto de precedencia entre pasos intermedios (remote/managed).
Para este proyecto solo importan los pasos 2 y 4 (global y proyecto), que son
solidos.

---

## 3. Agentes: formato exacto

Ubicacion en disco:
- Global: `~/.config/opencode/agents/`
- Proyecto: `.opencode/agents/`

El nombre del archivo es el id del agente (`review.md` -> agente `review`).

Campos de frontmatter confirmados por **dos fuentes cruzadas**:

1. Pagina de docs (`https://opencode.ai/docs/agents`, resumen), que dio este ejemplo:

```markdown
---
description: Reviews code for quality and best practices
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.1
permission:
  edit: deny
  bash: deny
---
You are in code review mode. Focus on:
- Code quality and best practices
...
```

2. Codigo fuente real del tipo `AgentConfig` (tag `v1.18.18`,
   `packages/sdk/js/src/gen/types.gen.ts`), que es la fuente autoritativa
   porque es lo que el binario realmente parsea:

```ts
export type AgentConfig = {
  model?: string
  temperature?: number
  top_p?: number
  prompt?: string
  tools?: { [key: string]: boolean }
  disable?: boolean
  description?: string
  mode?: "subagent" | "primary" | "all"
  color?: string
  maxSteps?: number
  permission?: {
    edit?: "ask" | "allow" | "deny"
    bash?: ("ask" | "allow" | "deny") | { [key: string]: "ask" | "allow" | "deny" }
    webfetch?: "ask" | "allow" | "deny"
    doom_loop?: "ask" | "allow" | "deny"
    external_directory?: "ask" | "allow" | "deny"
  }
}
```

### Discrepancia detectada (importante)

La pagina de docs (resumen) dice que el campo se llama `steps`. El tipo fuente
real dice `maxSteps`. **Uso `maxSteps`** porque sale del codigo fuente, no de
un resumen. Marcado tambien en `docs/DECISIONS.md` para verificacion empirica
(`opencode agent` en runtime).

`tools` es un mapa `{ nombreDeHerramienta: boolean }` para permitir/denegar
herramientas por agente — confirmado solo por el tipo fuente, la pagina de
docs (resumen) no lo menciono explicitamente.

Fuente primaria (autoritativa): `https://raw.githubusercontent.com/sst/opencode/v1.18.18/packages/sdk/js/src/gen/types.gen.ts`.
Fuente secundaria (ejemplo de uso): `https://opencode.ai/docs/agents`.

---

## 4. Comandos custom: formato exacto

Ubicacion en disco:
- Global: `~/.config/opencode/commands/`
- Proyecto: `.opencode/commands/`

El nombre del archivo es el nombre del comando (`test.md` -> `/test`).

```markdown
---
description: Run tests with coverage
agent: build
model: anthropic/claude-3-5-sonnet-20241022
---
Run the full test suite with coverage report and show any failures.
Focus on the failing tests and suggest fixes.
```

El contenido debajo del frontmatter es el prompt/template enviado al agente
cuando se invoca el comando.

Fuente: `https://opencode.ai/docs/commands` (pagina de docs, resumen). No
verificado contra tipo fuente — riesgo bajo porque el formato es simple y
consistente con el resto del sistema (mismo patron de frontmatter que agentes).

---

## 5. Plugins: firma exacta y lista literal de hooks

Ubicacion en disco:
- Global: `~/.config/opencode/plugins/` (o registrados via config `plugin`)
- Proyecto: `.opencode/plugins/`

Firma (v1, confirmada por codigo fuente real, tag `v1.18.18`,
`packages/plugin/src/index.ts`):

```ts
export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>
  project: Project
  directory: string
  worktree: string
  experimental_workspace: { register(type: string, adapter: WorkspaceAdapter): void }
  serverUrl: URL
  $: BunShell
}

export type Plugin = (input: PluginInput, options?: PluginOptions) => Promise<Hooks>
```

### Lista literal de hooks disponibles (interfaz `Hooks`, fuente real)

```ts
export interface Hooks {
  dispose?: () => Promise<void>
  event?: (input: { event: Event }) => Promise<void>
  config?: (input: Config) => Promise<void>
  tool?: { [key: string]: ToolDefinition }
  auth?: AuthHook
  provider?: ProviderHook
  "chat.message"?: (input: {...}, output: { message: UserMessage; parts: Part[] }) => Promise<void>
  "chat.params"?: (input: {...}, output: {...}) => Promise<void>
  "chat.headers"?: (input: {...}, output: { headers: Record<string,string> }) => Promise<void>
  "permission.ask"?: (input: Permission, output: { status: "ask" | "deny" | "allow" }) => Promise<void>
  "command.execute.before"?: (input: { command: string; sessionID: string; arguments: string }, output: { parts: Part[] }) => Promise<void>
  "tool.execute.before"?: (input: { tool: string; sessionID: string; callID: string }, output: { args: any }) => Promise<void>
  "shell.env"?: (input: {...}, output: { env: Record<string,string> }) => Promise<void>
  "tool.execute.after"?: (input: {...}, output: { title: string; output: string; metadata: any }) => Promise<void>
  "experimental.chat.messages.transform"?: (input: {}, output: {...}) => Promise<void>
  "experimental.chat.system.transform"?: (input: { sessionID?: string; model: Model }, output: { system: string[] }) => Promise<void>
  "experimental.provider.small_model"?: (input: {...}, output: {...}) => Promise<void>
  "experimental.session.compacting"?: (input: { sessionID: string }, output: { context: string[]; prompt?: string }) => Promise<void>
  "experimental.compaction.autocontinue"?: (input: {...}, output: { enabled: boolean }) => Promise<void>
  "experimental.text.complete"?: (input: {...}, output: { text: string }) => Promise<void>
  "tool.definition"?: (input: { toolID: string }, output: { description: string; parameters: any }) => Promise<void>
}
```

### Aviso critico sobre la pagina de docs de plugins

La pagina `https://opencode.ai/docs/plugins` (resumida por el fetch) listo
nombres de hooks que **no existen** como propiedades de `Hooks` en el codigo
fuente: `session.created`, `session.idle`, `file.edited`, `message.updated`,
etc. Esos son en realidad **valores de `event.type`** que llegan todos juntos
a traves del unico hook `event`, no hooks separados. El ejemplo de la propia
pagina de docs lo confirma:

```js
export const NotificationPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") { ... }
    },
  }
}
```

Es decir: **un solo hook `event`**, y adentro se filtra por `event.type`.
La pagina de docs mezclo el catalogo de eventos del bus interno con la lista
de hooks del plugin, lo cual es enganoso. **Para esta sesion, la fuente de
verdad es el codigo fuente (`Hooks` interface de arriba), no el resumen de
la pagina de docs.**

Fuente primaria (autoritativa): `https://raw.githubusercontent.com/sst/opencode/v1.18.18/packages/plugin/src/index.ts`.
Fuente secundaria (ejemplo de uso del hook `event`): `https://opencode.ai/docs/plugins`.

---

## 6. Como se restringen herramientas y permisos por agente

Confirmado por tipo fuente (`AgentConfig`, ver seccion 3):

- `tools: { [nombreHerramienta: string]: boolean }` — permite/deniega
  herramientas especificas por agente.
- `permission: { edit, bash, webfetch, doom_loop, external_directory }`, cada
  uno con valor `"ask" | "allow" | "deny"`. `bash` admite ademas un mapa
  `{ patron: "ask"|"allow"|"deny" }` para reglas granulares por comando.

A nivel global/config (`Config`, mismo archivo fuente):

```ts
permission?: {
  edit?: "ask" | "allow" | "deny"
  bash?: ("ask" | "allow" | "deny") | { [key: string]: "ask" | "allow" | "deny" }
  webfetch?: "ask" | "allow" | "deny"
  doom_loop?: "ask" | "allow" | "deny"
  external_directory?: "ask" | "allow" | "deny"
}
```

### Discrepancia detectada (importante)

La pagina de docs de permisos (`https://opencode.ai/docs/permissions`, resumen)
dice que existen ademas las claves `read`, `glob`, `grep`, `task`, `skill`,
`lsp`, `question`, `websearch`. **Ninguna de esas aparece en el tipo fuente
`Config.permission` ni en `AgentConfig.permission`** del tag `v1.18.18`. Puede
ser que la pagina de docs describa una version mas nueva, o que ese tipo
generado (`types.gen.ts`) no capture el 100% del schema real de runtime.
**No lo uso hasta confirmarlo en runtime** (ver `docs/DECISIONS.md`). Para
esta sesion, solo controlo permisos con las claves confirmadas por el tipo
fuente: `edit`, `bash`, `webfetch`, `doom_loop`, `external_directory`.

Fuente primaria (autoritativa): tipo fuente `Config`/`AgentConfig`,
`https://raw.githubusercontent.com/sst/opencode/v1.18.18/packages/sdk/js/src/gen/types.gen.ts`.
Fuente secundaria (con discrepancia sin resolver): `https://opencode.ai/docs/permissions`.

---

## 7. Reglas — `AGENTS.md` e `instructions`

- `AGENTS.md` en la raiz del proyecto (busqueda hacia arriba desde el cwd) se
  carga automaticamente.
- `AGENTS.md` global: `~/.config/opencode/AGENTS.md`.
- Fallback de compatibilidad con Claude Code: `~/.claude/CLAUDE.md`, si no se
  desactiva.
- Env vars de escape confirmadas por la pagina de docs (resumen):
  - `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1` — desactiva solo el fallback de
    `~/.claude/CLAUDE.md`.
  - `OPENCODE_DISABLE_CLAUDE_CODE=1` — desactiva toda la compatibilidad con
    `.claude`.
- Config `instructions` (confirmado por tipo fuente `Config.instructions?: Array<string>`):
  lista de archivos/patrones adicionales que se combinan con los `AGENTS.md`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "CONTRIBUTING.md",
    "docs/guidelines.md",
    ".cursor/rules/*.md",
    "https://raw.githubusercontent.com/my-org/shared-rules/main/style.md"
  ]
}
```

### Riesgo detectado, relevante para esta maquina

Esta maquina tiene un `~/.claude/CLAUDE.md` global enorme (reglas de otro
sistema, Claude Code, con su propio protocolo de memoria, sus propios agentes
`sdd-*`, su propia convencion de nombres). Si el fallback de Claude Code esta
activo, **ese archivo se inyectaria en cada sesion de OpenCode**, mezclando
convenciones de dos sistemas distintos. Documentado como decision pendiente
en `docs/DECISIONS.md` — no lo resuelvo en esta sesion sin tu visto bueno.

Fuente: `https://opencode.ai/docs/rules` (pagina de docs, resumen) para rutas
y env vars; `Config.instructions` confirmado por tipo fuente (ver seccion 6)
para el mecanismo de merge.

---

## 8. Mecanismo elegido para el gate de inyeccion de estado (propuesta, sujeta a tu aprobacion)

Con los datos de arriba, el mecanismo mas solido para "al arrancar una sesion,
el estado de `.zai/state.json` y el spec de la fase actual entran solos al
contexto" es:

- Un plugin (`zai.core`) que implementa el hook `config` (no experimental,
  confirmado por fuente real, seccion 5).
- En `config(input)`, el plugin:
  1. Busca `.zai/state.json` en el directorio del proyecto (`directory`/`worktree`
     del `PluginInput`).
  2. Si no existe: no hace nada (`return`).
  3. Si existe pero es invalido (falla Zod): loguea un aviso claro (via
     `client` o `event`, a confirmar en sesion 2/3 como se expone al usuario)
     y no hace nada mas — no revienta la sesion.
  4. Si es valido: genera un archivo markdown corto (no versionado, por
     ejemplo `.zai/.generated-context.md`) con el resumen del estado y la
     ruta al spec de la fase actual, y hace `input.instructions.push(esa ruta)`.
  5. Respeta `ZAI_DISABLE_GATES` (o el nombre exacto que se defina): si esta
     seteada, el hook retorna inmediatamente sin tocar `instructions`.

Alternativa descartada por ahora: el hook `"experimental.chat.system.transform"`
tambien podria inyectar contexto (`output.system`), pero esta marcado
`experimental` en el codigo fuente — mas riesgo de romperse entre versiones
menores. `config` no tiene ese marcador. Prefiero la opcion mas estable salvo
que me digas lo contrario.

Esto es una **propuesta de diseno**, no algo ya construido. Si la apruebas,
la implemento en el resto de esta sesion.

---

## 9. Como se invocan `tool.execute.before`/`after` en runtime, y si tirar un error bloquea la escritura

Verificado clonando el tag `v1.18.18` completo (`git clone --depth 1 --branch v1.18.18
https://github.com/sst/opencode.git`) y leyendo el codigo real, no un resumen.

### `plugin.trigger` no atrapa errores de los hooks

`packages/opencode/src/plugin/index.ts`:

```ts
const trigger = Effect.fn("Plugin.trigger")(function* (name, input, output) {
  if (!name) return output
  const s = yield* InstanceState.get(state)
  for (const hook of s.hooks) {
    const fn = hook[name] as any
    if (!fn) continue
    yield* Effect.promise(async () => fn(input, output))
  }
  return output
})
```

Sin try/catch. Si un hook tira, el error se propaga sin atenuar a quien llamo
`trigger(...)`.

### El sitio de invocacion en las herramientas de escritura

`packages/opencode/src/session/tools.ts` (dentro del `execute()` de cada
tool):

```ts
yield* plugin.trigger(
  "tool.execute.before",
  { tool: item.id, sessionID: ctx.sessionID, callID: ctx.callID },
  { args },
)
const result = yield* item.execute(args, ctx)   // <- nunca se llega aca si el hook tiro
```

**Confirmado: tirar un `Error` dentro de `tool.execute.before` impide que
`item.execute` (la escritura real del archivo) se ejecute.** No es una
suposicion de convencion de otros sistemas de plugins — es lo que dice el
codigo que efectivamente corre. `tool.execute.after` se invoca simetricamente
despues de `item.execute`, tambien sin try/catch, asi que en ese punto el
archivo YA se escribio (tirar ahi no deshace la escritura, solo hace fallar
la llamada a la tool de cara al agente).

### `permission` acepta claves de tool arbitrarias en runtime (no solo las del tipo generado)

Verificado empiricamente con `opencode debug config` sobre un agente real:
declarar `tools: { apply_patch: false, task: false, bash: false }` en el
frontmatter de un agente hace que la config resuelta traiga, sola,

```json
"permission": { "apply_patch": "deny", "task": "deny", "bash": "deny" }
```

`task` no es una clave del tipo `AgentConfig.permission` confirmado en la
seccion 6 (`edit`, `bash`, `webfetch`, `doom_loop`, `external_directory`).
Esto confirma la sospecha de `docs/DECISIONS.md` punto 2: el tipo generado
(`types.gen.ts`) no es el techo real de lo que `permission` acepta en
runtime — parece aceptar cualquier id de tool como clave. No cambia el
diseño de los agentes de esta sesion (ya usabamos `tools`, que es la parte
confirmada por partida doble), pero es un dato a favor de confiar mas en
`tools: {}` que en armar un `permission: {}` con claves no confirmadas a
mano.

Fuente: `opencode debug config` corrido contra los agentes reales de
`modules/phases/agents/`, instalados via `scripts/install.ts`, en esta
maquina. Fecha: 2026-08-15.

Lo unico que sigue sin confirmar (nivel de detalle menor, no bloqueante): si
el SDK de IA que consume esa promesa rechazada la superficie al modelo como
un resultado de tool recuperable (`tool-error`, puede reintentar) o como un
corte mas duro del turno. Se infiere lo primero por la convencion estandar
del Vercel AI SDK (`tool()` es literalmente el helper de ese SDK, importado
en `tools.ts`), pero no se leyo el codigo del SDK en si. No cambia el diseño
de los gates: lo que importa (que la escritura no ocurra) esta confirmado.

### IDs de las tools de escritura y forma de sus argumentos

De `packages/opencode/src/tool/{edit,write,apply_patch}.ts`:

- `"edit"`: `Tool.define("edit", ...)`. Args: `{ filePath: string, ... }`
  (camelCase).
- `"write"`: `Tool.define("write", ...)`. Args: `{ filePath: string, content: string }`.
- `"apply_patch"`: `Tool.define("apply_patch", ...)`. Args: `{ patchText: string }`
  — **no** trae una lista de paths ya parseada en `tool.execute.before`; es
  texto plano en un formato propio. `packages/opencode/src/patch/index.ts`
  reconoce estos marcadores de linea (verificado leyendo el parser):
  `*** Add File: <path>`, `*** Delete File: <path>`, `*** Update File: <path>`,
  `*** Move to: <path>`. Un gate que necesite saber que archivos toca un
  `apply_patch` tiene que escanear `patchText` buscando esas lineas — no hay
  forma mas simple confirmada.

### `"permission.ask"` esta declarado en el tipo pero NO esta conectado en v1.18.18

Busque `plugin.trigger("permission.ask"` (y variantes) en todo
`packages/opencode/src` y `packages/core/src`: **cero resultados fuera de la
propia definicion del tipo en `packages/plugin/src/index.ts`.** El flujo real
de permisos (`packages/opencode/src/permission/index.ts`, `session/processor.ts`
linea ~372, `yield* permission.ask({...})`) no dispara ningun hook de plugin.
Lo que si existe es el **evento** de bus `"permission.asked"` (distinto,
observable via el hook generico `event`, no interactivo — no permite decidir
allow/deny, solo mirar que se pidio permiso).

**Conclusion practica: no se puede implementar el Gate A a traves de
`"permission.ask"` en esta version, aunque el tipo lo sugiera.** El mecanismo
real y verificado es `tool.execute.before` + tirar un error. Esto es
exactamente el tipo de discrepancia que esta sesion pidio prevenir.

Fuente primaria (autoritativa) para toda esta seccion: clon local del tag
`v1.18.18` de `https://github.com/sst/opencode`, archivos
`packages/opencode/src/plugin/index.ts`,
`packages/opencode/src/session/tools.ts`,
`packages/opencode/src/tool/{edit,write,apply_patch}.ts`,
`packages/opencode/src/patch/index.ts`,
`packages/opencode/src/permission/index.ts`,
`packages/opencode/src/session/processor.ts`.
Fecha de consulta: 2026-08-15.

### Tabla de IDs de tools (para usar en `AgentConfig.tools`)

Cada uno confirmado con `grep` sobre `Tool.define("<id>", ...)` en el codigo
fuente real del tag `v1.18.18`, archivo por archivo bajo
`packages/opencode/src/tool/`:

| Tool id | Archivo | Que hace |
|---|---|---|
| `edit` | `edit.ts` | modifica un archivo existente |
| `write` | `write.ts` | crea/sobreescribe un archivo |
| `apply_patch` | `apply_patch.ts` | aplica un patch multi-archivo |
| `read` | `read.ts` | lee un archivo |
| `grep` | `grep.ts` | busca contenido |
| `glob` | `glob.ts` | busca por patron de nombre |
| `bash` | `shell.ts` (via `ShellID.ToolID`, `tool/shell/id.ts`) | corre shell |
| `task` | `task.ts` (via `const id = "task"`) | delega en un subagente |
| `todowrite` | `todo.ts` | lista de tareas (no `todo`) |
| `webfetch` | `webfetch.ts` | trae una URL |
| `websearch` | `websearch.ts` | busca en la web |
| `lsp` | `lsp.ts` | consultas de LSP |
| `skill` | `skill.ts` | invoca un skill |
| `plan_exit` | `plan.ts` | sale de modo plan |

Args de `bash` (confirmado por fuente, `packages/opencode/src/tool/shell/prompt.ts`):
`{ command: string, timeout?: number, workdir?: string }` — el campo del
comando en si se llama `command`, no `cmd` ni `script`.

### Limitacion confirmada: `permission.edit` no tiene variante por patron de archivo

El tipo fuente (`Config.permission` y `AgentConfig.permission`, seccion 6) da
a `bash` una variante `{ [patron]: "ask"|"allow"|"deny" }`, pero a `edit`
**no** — `edit` es unicamente `"ask" | "allow" | "deny"` para el agente
entero, no por ruta. Tampoco `tools: { edit: boolean }` distingue rutas: es
todo-o-nada por tool. **No existe, en esta version, una forma nativa de
decir "este agente puede escribir pero solo bajo docs/audits/".** Es el
hueco real que pedia el brief de esta sesion — ver `docs/DECISIONS.md` para
como se lo esquiva en el diseno de `zai-auditor`.

### Gate C: no existe un hook de "fin de turno, bloqueante"

La lista completa de `Hooks` (seccion 5, ya extraida del codigo fuente real,
no de un resumen) no tiene ningun hook que se dispare al terminar el turno
del agente y pueda bloquear ese fin de turno. Los candidatos mas cercanos:

- `"chat.message"`: se dispara "cuando se recibe un mensaje nuevo" — es
  observacional/aditivo (`output: { message, parts }`), no da forma de negar
  que el turno termine.
- `event` con `event.type === "session.idle"`: llega **despues** de que el
  turno ya termino y el control volvio al usuario. Como mucho serviria para
  inyectar un mensaje de aviso para la proxima vuelta, no para bloquear la
  actual.

No hay mas hooks nuevos que investigar aca: la seccion 5 ya es la lista
completa y verificada por codigo fuente, no una enumeracion parcial. Ver
`docs/DECISIONS.md` para la resolucion (mover la validacion dura a
`/zai-fase-close`, tal como preveia el brief de esta sesion).

---

## 11. Skills: mecanismo de carga condicional (sesion 3)

Necesario para decidir donde vive el arbol de decision de stack sin llenar
el contexto con contenido que no aplica al proyecto actual. Verificado
clonando el tag `v1.18.18` de nuevo y leyendo
`packages/opencode/src/skill/{index,discovery}.ts` y
`packages/opencode/src/tool/{skill.ts,skill.txt}` — no la pagina de docs
sola, aunque el resumen de `https://opencode.ai/docs/skills` coincidio en
lo grueso.

### Carga: on-demand, invocacion explicita del modelo, no auto-trigger

`packages/opencode/src/tool/skill.txt` (texto literal de la descripcion de
la tool `skill`):

```
Load a specialized skill when the task at hand matches one of the skills
listed in the system prompt.

Use this tool to inject the skill's instructions and resources into
current conversation. ...

The skill name must match one of the skills listed in your system prompt.
```

Es decir: **el nombre y la `description` de cada skill descubierta se
inyectan siempre en el system prompt** (costo de tokens chico, fijo), pero
el **contenido completo** del `SKILL.md` solo entra al contexto si el
modelo decide llamar `skill({ name: "..." })`. No hay matching automatico
por parte de OpenCode — la decision de invocar es del modelo, guiada por
que tan bien escrita esta la `description` (ver el patron "Use ONLY when...
Do not use for..." del skill built-in `customize-opencode`,
`packages/opencode/src/skill/index.ts` lineas 32-34 — es la referencia de
estilo del propio equipo de OpenCode, y es el mismo patron que uso el resto
de este toolkit).

### Rutas de descubrimiento (confirmadas por codigo fuente, no por el resumen de la pagina de docs)

`packages/opencode/src/skill/index.ts`:

```ts
const CLAUDE_EXTERNAL_DIR = ".claude"
const AGENTS_EXTERNAL_DIR = ".agents"
const EXTERNAL_SKILL_PATTERN = "skills/**/SKILL.md"
const OPENCODE_SKILL_PATTERN = "{skill,skills}/**/SKILL.md"
```

- Directorios de config de OpenCode (los mismos que agentes/comandos/
  plugins — confirmado via `ConfigPaths.directories()`,
  `packages/opencode/src/config/paths.ts`: incluye `Global.Path.config`
  == `~/.config/opencode`, y `.opencode/` subiendo desde el cwd del
  proyecto): patron `{skill,skills}/**/SKILL.md` — **el nombre de carpeta
  admite singular O plural**, ambos funcionan. Para ZAI, `skill/` (singular)
  es el elegido, documentado en `docs/NAMESPACE.md`.
- Compatibilidad externa (deshabilitable): `~/.claude/skills/**/SKILL.md` y
  `~/.agents/skills/**/SKILL.md` (global), mas los mismos dos nombres
  buscados subiendo desde el proyecto. Es el mismo tipo de fallback de
  compatibilidad que `~/.claude/CLAUDE.md` para `AGENTS.md` (seccion 7) —
  no lo usamos, ZAI pone sus skills bajo `~/.config/opencode/skill/`.

### Formato de `SKILL.md`: minimo verificado mas estricto que sugiere la pagina de docs

`packages/opencode/src/skill/index.ts`, el type guard real que se usa para
validar el frontmatter:

```ts
function isSkillFrontmatter(data: unknown): data is { name: string; description?: string } {
  return (
    isRecord(data) &&
    typeof data.name === "string" &&
    (data.description === undefined || typeof data.description === "string")
  )
}
```

**Solo `name` es obligatorio.** `description` es opcional segun este type
guard — aunque en la practica, sin `description` el modelo no tiene forma
de saber cuando conviene invocar el skill (es lo unico que ve en el system
prompt), asi que es opcional solo en el sentido tecnico. La pagina de docs
(resumen) afirmaba validacion estricta adicional (`name` con regex
`^[a-z0-9]+(-[a-z0-9]+)*$`, 1-64 caracteres; `description` 1-1024
caracteres) — **no se verifico esa validacion en este archivo**, puede
vivir en el parser de frontmatter (`ConfigMarkdown`,
`@opencode-ai/core/v1/config/error`) que no se leyo. No es bloqueante: los
nombres de skill de ZAI van a ser cortos y en minusculas de todas formas
por la convencion propia del proyecto, asi que cumplirian ese regex aunque
no se confirmo que exista.

Fuente primaria (autoritativa): clon local del tag `v1.18.18`,
`packages/opencode/src/skill/index.ts`,
`packages/opencode/src/skill/discovery.ts`,
`packages/opencode/src/tool/skill.ts`, `packages/opencode/src/tool/skill.txt`,
`packages/opencode/src/config/paths.ts`.
Fuente secundaria: `https://opencode.ai/docs/skills` (resumen, coincide en
lo grueso, difiere en el detalle de validacion de frontmatter).
Fecha de consulta: 2026-08-15.

---

## 12. Fuentes usadas (fecha de consulta: 2026-08-15)

| Dato | URL | Tipo de fuente |
|---|---|---|
| Version del binario | ejecucion local | primaria (real) |
| `tool.execute.before`/`after`, `plugin.trigger`, IDs y args de `edit`/`write`/`apply_patch`, formato del parser de patch, `permission.ask` no conectado | clon local de `https://github.com/sst/opencode` tag `v1.18.18` (`packages/opencode/src/{plugin,session,tool,patch,permission}/...`) | primaria (codigo fuente real) |
| Firma de plugin v1 + lista de hooks | `https://raw.githubusercontent.com/sst/opencode/v1.18.18/packages/plugin/src/index.ts` | primaria (codigo fuente) |
| `AgentConfig` / `Config` (tools, permission, instructions, maxSteps) | `https://raw.githubusercontent.com/sst/opencode/v1.18.18/packages/sdk/js/src/gen/types.gen.ts` | primaria (codigo fuente) |
| V2 es beta y no aplica | `https://opencode.ai/v2/docs/build/plugins` | secundaria (docs, resumen) |
| Rutas de config y precedencia | `https://opencode.ai/docs/config` | secundaria (docs, resumen) |
| Ejemplo de frontmatter de agente | `https://opencode.ai/docs/agents` | secundaria (docs, resumen) |
| Formato de comando custom | `https://opencode.ai/docs/commands` | secundaria (docs, resumen) |
| Ejemplo de uso del hook `event` | `https://opencode.ai/docs/plugins` | secundaria (docs, resumen, con error detectado) |
| Claves de permisos (con discrepancia sin resolver) | `https://opencode.ai/docs/permissions` | secundaria (docs, resumen, en conflicto con fuente) |
| `AGENTS.md`, fallback Claude Code, env vars | `https://opencode.ai/docs/rules` | secundaria (docs, resumen) |
| CLI real (`opencode --help`) | ejecucion local | primaria (real) |
| Mecanismo de skills (carga on-demand, rutas de descubrimiento, formato minimo) | clon local de `https://github.com/sst/opencode` tag `v1.18.18` (`packages/opencode/src/skill/*.ts`, `packages/opencode/src/tool/skill.{ts,txt}`) | primaria (codigo fuente real) |
| Skills, resumen de docs | `https://opencode.ai/docs/skills` | secundaria (docs, resumen, con detalle de validacion sin confirmar) |
