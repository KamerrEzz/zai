# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Este archivo versiona ZAI mismo (el toolkit) — no los proyectos que lo usan,
esos tienen su propio `CHANGELOG.md` que mantiene `zai-scribe`.

## [0.3.0] - 2026-08-15

### Added
- Módulo `stack`: árbol de decisión de stack como skills on-demand
  (`zai-stack-backend-framework`, `zai-stack-queues`, `zai-stack-auth`,
  `zai-stack-api-layer`, `zai-stack-fresh-docs`) — se cargan solo cuando el
  modelo decide que aplican, no todo el tiempo.
- Gate E (`zai.stack`): exige haber consultado `context7` en la sesión
  antes de agregar una dependencia con menos de 2 años de vida o con un
  major reciente, vía `pnpm add`/`npm install`/`yarn add`.
- Gate D (`zai.phases`), apagado de fábrica: bloquea `git commit` si
  `phase_state != "documented"` o si `CHANGELOG.md` no cambió en el
  working tree. Se prende con `.zai/config.json`, se apaga puntualmente con
  `ZAI_ALLOW_COMMIT=1`.
- `zai-scribe` ahora genera ADRs (`docs/adr/`) cuando amerita, mantiene
  `CHANGELOG.md` en formato Keep a Changelog, y decide el bump de versión
  (`scripts/zai-bump-version.ts`) de los proyectos que gestiona.
- `modules/core/src/state`: extendido con `startNextPhase` (agrega una
  fase nueva, solo desde `documented`) y `recordBlockers` (registra
  blockers de auditoría sin transicionar), más la invariante de que
  `transitionPhaseState` rechaza pasar a `audited` con blockers
  pendientes.
- `scripts/install.ts` soporta un cuarto tipo de artefacto instalable,
  `skill` (directorios completos, no archivos sueltos).
- `README.md` real, y este `CHANGELOG.md`.

### Changed
- `docs/RESEARCH.md`, `docs/DECISIONS.md` y `docs/NAMESPACE.md`
  actualizados con lo verificado en esta sesión (mecanismo de skills,
  wiring real de `tool.execute.before`/`after`, IDs y args de tools
  confirmados por código fuente).
- **El repo deja de ser `~/.config/opencode`.** Vive donde lo clones;
  `scripts/install.ts` copia/enlaza hacia el directorio de config real de
  OpenCode (`~/.config/opencode` u `OPENCODE_CONFIG_DIR`) en vez de serlo.
  Motivo: OpenCode gestiona su propio `node_modules`/`package.json` (con
  Bun) directo en su directorio de config, y competía con el `pnpm` de
  este repo por los mismos nombres de archivo ahí — ver
  `docs/DECISIONS.md` punto 15. Nuevo archivo generado,
  `<config>/.zai-repo-path`, para que los comandos sepan desde dónde
  invocar `scripts/zai-*.ts` sin asumir una ubicación fija.

## [0.2.0] - 2026-08-15

### Added
- Módulo `phases`: agentes `zai-planner` (primary), `zai-test-author`,
  `zai-implementer`, `zai-auditor`, `zai-scribe` (subagents), cada uno con
  `tools`/`permission` restringidos por rol.
- Comandos `/zai-fase-start`, `/zai-fase-red`, `/zai-fase-green`,
  `/zai-fase-audit`, `/zai-fase-fix`, `/zai-fase-close`.
- Gate A (`zai.phases`): bloquea escrituras a archivos de test mientras
  `phase_state` es `green`, vía `tool.execute.before` + excepción —
  confirmado contra el código fuente real de OpenCode que esto impide la
  escritura, no es una convención asumida.
- Gate B (`zai.phases`): corre `tsc --noEmit` + `eslint` sobre el archivo
  recién escrito, filtra la salida para el agente.
- `scripts/zai-transition.ts`, `scripts/zai-start-next-phase.ts`,
  `scripts/zai-record-blockers.ts`.

## [0.1.0] - 2026-08-15

### Added
- Repo base (TypeScript, pnpm, estructura de módulos).
- Módulo `core`: `.zai/state.json` con schema Zod y máquina de transiciones
  de fase (`planning -> red -> green -> audited -> documented`), escritura
  atómica, plugin `zai.core` que inyecta el estado y el spec de la fase
  actual al contexto de cada sesión automáticamente.
- `AGENTS.md` base, comandos `/zai-estado` y `/zai-init`.
- `scripts/install.ts` / `pnpm uninstall:zai`, idempotente.
- `docs/RESEARCH.md` (contrato de API de OpenCode), `docs/NAMESPACE.md`,
  `docs/MODULES.md`, `docs/DECISIONS.md`, `docs/HANDOFF.md`.
