# modules/phases

Segundo modulo de ZAI. El loop de fases: agentes especializados con
herramientas minimas por rol, los comandos `/zai-fase-*`, y los gates que
hacen que el loop sea dificil de saltear en vez de solo sugerido.

- `agents/`: `zai-planner`, `zai-test-author`, `zai-implementer`,
  `zai-auditor`, `zai-scribe`. Cada uno restringido por `tools`/`permission`
  segun su rol — no por prompt. Ver `docs/RESEARCH.md` seccion 9 para el
  hueco real que queda (no hay permisos de escritura por patron de archivo
  en esta version de OpenCode) y como se lo esquiva.
- `commands/`: `zai-fase-start`, `zai-fase-red`, `zai-fase-green`,
  `zai-fase-audit`, `zai-fase-fix`, `zai-fase-close`. Cada uno valida el
  estado actual contra `modules/core/src/state` antes de delegar en un
  agente — la validacion no se duplica en cada comando.
- `plugins/zai.phases.ts`: Gate A (tests intocables en `green`, via
  `tool.execute.before`) y Gate B (verificacion post-escritura, via
  `tool.execute.after`). Ver `docs/RESEARCH.md` seccion 9 para la
  confirmacion en codigo fuente de que ambos hooks realmente bloquean/
  reportan lo que dicen bloquear/reportar.
- `src/`: logica pura de los gates (matching de `test_globs`, extraccion de
  paths de un `apply_patch`), con sus tests — separada del archivo de
  plugin para poder testear sin necesitar el runtime de OpenCode.
