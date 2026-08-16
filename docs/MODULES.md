# MODULES.md — como agregar un modulo a ZAI

Este repo es el **codigo fuente** de ZAI — vive donde lo hayas clonado
(`~/.config/opencode/.zai-repo-path`, generado por el instalador, tiene la
ruta real). No es lo mismo que el directorio de config real de OpenCode
(`~/.config/opencode`, o lo que apunte `OPENCODE_CONFIG_DIR`): ahi es
donde `scripts/install.ts` **genera** una carpeta plana
`agents/`, `commands/`, `plugins/`, `skill/` (mas `AGENTS.md` suelto en la
raiz) a partir de `modules/<nombre>/{agents,commands,plugins,skill}/` de
este repo — es lo que OpenCode realmente lee en runtime (confirmado en
`docs/RESEARCH.md` secciones 3, 4, 5, 7 y 11). Esas carpetas generadas
**no se editan a mano ni viven en este repo** — las crea
`scripts/install.ts` directamente en el directorio de config, y ahi quedan
gitignoreadas si algun dia se prueban dentro de este mismo repo por error.

Hasta la sesion 3 este repo *era* literalmente `~/.config/opencode` — se
separaron porque OpenCode detectaba el `package.json`/`pnpm-lock.yaml` de
este repo en su propio directorio de config e intentaba instalarle
dependencias con su instalador interno (`docs/DECISIONS.md` punto 8),
sospechoso de interferir con el arranque de la TUI en algunas maquinas
(punto 14). Si encontras documentacion vieja o comentarios que todavia
asuman "este repo ES el config", es un resabio de esa epoca — avisa para
corregirlo.

## Contrato de un modulo

```
modules/<nombre>/
  module.json       <- obligatorio, ver abajo
  agents/*.md        <- opcional, un archivo por agente
  commands/*.md       <- opcional, un archivo por comando
  plugins/*.ts        <- opcional, un archivo por plugin
  skill/<skill-name>/SKILL.md   <- opcional, una CARPETA por skill (a
                          diferencia de agents/commands/plugins, que son
                          archivos sueltos, un skill se instala como
                          directorio completo porque puede traer archivos
                          de referencia junto al SKILL.md — ver
                          `docs/RESEARCH.md` seccion 11)
  src/                 <- opcional, codigo propio del modulo (no se instala,
                          solo lo usan los agents/commands/plugins de ese
                          mismo modulo o sus tests)
```

`module.json`:

```json
{
  "name": "core",
  "description": "una linea, para que sirve este modulo",
  "enabled": true
}
```

- `name`: el nombre corto del modulo (minusculas, una palabra). Se usa para
  el prefijo de convencion (`zai.<name>` para plugins, `/zai-<name>-<accion>`
  para comandos) — ver `docs/NAMESPACE.md`. El instalador no lo fuerza
  automaticamente, es responsabilidad tuya nombrar los archivos siguiendo la
  convencion al crearlos.
- `enabled`: si es `false`, `scripts/install.ts` ignora el modulo por
  completo (no instala nada de el, y si estaba instalado de una corrida
  anterior, lo desinstala en la siguiente corrida). Si el campo no esta,
  se asume `true`.

## Que hace `scripts/install.ts`

En cada corrida (`pnpm install:zai`):

0. Escribe `<config-root>/.zai-repo-path` con la ruta absoluta de este
   repo — es como los comandos (`/zai-fase-*`, `/zai-init`) saben desde
   donde invocar `scripts/zai-*.ts`, ya que este repo puede vivir en
   cualquier lado.
1. Borra todo lo que instalo la corrida anterior (lee su propio manifiesto
   en `<config-root>/.zai-install-manifest.json` — no en este repo).
2. Recorre `modules/*/module.json`. Modulos sin `module.json` se ignoran con
   un warning (no rompen la instalacion de los demas).
3. Instala `AGENTS.md` (raiz de este repo) directo en la raiz del
   directorio de config — es el unico archivo que no pertenece a ningun
   modulo puntual.
4. Para cada modulo con `enabled !== false`: por cada subcarpeta de archivo
   suelto (`agents/`, `commands/`, `plugins/`) que exista, instala cada
   archivo en la carpeta plana equivalente del directorio de config; por
   `skill/`, instala cada subcarpeta (`skill/<nombre>/`) completa, no
   archivo por archivo.
5. En Windows sin privilegios de symlink, cae a copiar (archivo o carpeta
   segun corresponda) en vez de enlazar (y lo deja anotado en el
   manifiesto). Si tu instalacion usa copias, un cambio en
   `modules/<nombre>/...` no se refleja hasta que corras `pnpm install:zai`
   de nuevo — no es hot-reload.
6. Si dos modulos (o un modulo y un archivo que no es de ZAI) quieren el
   mismo nombre de archivo en la misma carpeta plana, la instalacion falla
   con un error explicito en vez de pisar nada. Es un choque de namespace
   real — resolvelo renombrando, no lo silencies.

`pnpm uninstall:zai` hace el paso 1 (mas borrar `.zai-repo-path`) y para
ahi: borra todo lo que ZAI instalo en el directorio de config, borra el
manifiesto, y si `agents/`, `commands/`, `plugins/` o `skill/` quedaron
vacias las borra tambien. No toca nada que no este en el manifiesto — y no
toca nada de este repo, porque este repo nunca fue el directorio de config.

## Pasos para agregar un modulo nuevo

1. `modules/<nombre>/module.json` con `enabled: true`.
2. Los `agents/`, `commands/`, `plugins/` que necesite, ya nombrados segun
   `docs/NAMESPACE.md`.
3. Si el modulo necesita logica propia con tests, esa logica va en
   `modules/<nombre>/src/`, con sus tests en
   `modules/<nombre>/src/**/__tests__/*.test.ts` (vitest ya esta configurado
   para levantar cualquier `.test.ts` bajo `modules/`, no hace falta tocar
   `vitest.config.ts`).
4. Si el modulo necesita agregarle campos a `.zai/state.json`, no lo hagas
   editando `modules/core/src/state/schema.ts` libremente — ese schema es
   del core. Coordina el cambio ahi mismo, con sus propios tests de
   transicion, no lo dupliques en otro lado.
5. Corre `pnpm install:zai` y confirma con `pnpm test` que nada se rompio.

## Que NO debe hacer un modulo

Estas reglas existen porque romperlas hace que desactivar o desinstalar un
modulo (la promesa central de `docs/NAMESPACE.md`) deje de ser cierto en la
practica:

- **No asumas que otro modulo esta instalado.** `modules/stack/` (el gate
  de context7, ver mas abajo) no depende de que `modules/phases/` este
  habilitado, ni lo consulta. Si tu modulo necesita otro modulo si o si,
  decilo explicitamente en su `module.json` (campo libre, no hay
  `requires` formal todavia) y fallá con un mensaje claro en vez de
  romperte en silencio si falta.
- **No toques el estado de otro modulo.** `.zai/state.json` es del core
  (`modules/core/src/state/`, unico escritor real). Si tu modulo necesita
  persistir algo propio ahi, es una subclave nueva coordinada con el
  schema del core, nunca un campo que otro modulo ya usa para otra cosa.
- **No pises el namespace global sin el prefijo de tu modulo.** Ver
  `docs/NAMESPACE.md` — un agente, comando, plugin o skill sin el prefijo
  correcto puede chocar con el de otra herramienta instalada en la misma
  maquina, no solo con otro modulo de ZAI.
- **No dejes un gate sin escape hatch.** Todo mecanismo que bloquee una
  accion del agente (Gate A/B en `phases`, el gate de context7 en `stack`)
  tiene que poder apagarse por variable de entorno `ZAI_*`, documentada. Un
  gate sin salida es de los que el usuario termina desinstalando.
- **No falles duro por un problema de infraestructura ajeno a tu logica.**
  Si tu gate depende de red, de un binario externo, o de un archivo que
  puede no existir, esos casos degradan (avisan y siguen) — no tiran la
  sesion abajo. Ver como lo hacen `zai.core`, `zai.phases` y `zai.stack`
  para el patron exacto.

## Desactivar un modulo sin borrarlo

Flipeá `enabled` a `false` en su `module.json` y corre `pnpm install:zai`.
El codigo fuente sigue en el repo (y en git), pero deja de estar instalado
en `~/.config/opencode`. Es la forma de probar "que pasa si esto no esta"
sin perder el trabajo.
