# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Este archivo versiona ZAI mismo (el toolkit) — no los proyectos que lo usan,
esos tienen su propio `CHANGELOG.md` que mantiene `zai-scribe`.

## [0.11.0] - 2026-08-16

### Added
- Gate nuevo en `zai.core.ts`: bloquea la escritura directa de
  `.zai/state.json` con `edit`/`write`/`apply_patch` (mismo mecanismo que
  Gate A) - fuerza a pasar por los scripts validados
  (`zai-init-state.ts`, `zai-transition.ts`, `zai-record-blockers.ts`,
  `zai-start-next-phase.ts`). Escape hatch:
  `ZAI_CORE_DISABLE_STATE_PROTECTION`.
- `scripts/zai-transition.ts` corre la suite de tests del proyecto por su
  cuenta antes de aceptar una transicion a `red`, y rechaza la transicion
  si exit code es `0` - ya no confia en que el agente la corrio de
  verdad. Escape hatch: `ZAI_PHASES_SKIP_RED_VERIFICATION` (para
  bootstrapping sin test runner configurado todavia).

### Why
Con un modelo mas debil que no sigue instrucciones de prompt con
disciplina (Qwen 3.6, primera prueba real del loop de fases), ningun
texto de instruccion evita que el agente escriba el estado a mano o
afirme sin verificar - hacia falta que fuera mecanicamente imposible, no
solo pedido. Ver `docs/DECISIONS.md` punto 17.

## [0.10.0] - 2026-08-16

### Changed
- `/zai-vision` exige ahora la misma profundidad que un spec funcional
  real (indice cuando el documento crece, seccion de "Entidades
  principales" que cubre el sistema completo -no solo la fase 1-,
  principios de diseño formulados como reglas accionables, y desglose
  funcional con ejemplos concretos con numeros reales). Encontrado en la
  primera prueba real: el `docs/VISION.md` que generaba para MisEconomía
  se quedaba corto comparado con un documento equivalente que el usuario
  ya habia escrito sin ZAI (`panel.neenbyss.com/docs/PROJECTO.md`) - ese
  documento fue la referencia concreta usada para subir la vara.
- `/zai-estado` ahora siempre calcula y muestra `proximo paso: <comando
  exacto>` a partir de `phase_state` + blockers, con una tabla explicita
  de estado -> comando como unica fuente de verdad. `/zai-init`,
  `/zai-vision`, `/zai-fase-red`, `/zai-fase-green` y `/zai-fase-audit`
  ahora tambien lo dicen en su cierre (los demas ya lo hacian). Motivo:
  prueba real mostro varios turnos perdidos porque no era obvio que
  comando seguia despues de cada paso.

### Fixed
- `/zai-fase-start` sugeria siempre `/zai-fase-close` como el paso
  correcto cuando la fase actual no estaba en `documented`, sin importar
  en que estado real estuviera - falso en la mayoria de los casos (solo
  es correcto si ya esta en `audited`). Encontrado en la misma prueba
  real: una fase recien creada en `planning` (por `/zai-vision`) recibio
  la sugerencia incorrecta de "cerrala con `/zai-fase-close`" en vez de
  "avanzala con `/zai-fase-red`".

## [0.9.0] - 2026-08-16

### Fixed
- **Bug critico que rompia la TUI de OpenCode y `providers list` en
  cualquier proyecto con ZAI instalado.** `zai.stack.ts` y `zai.phases.ts`
  exportaban sus funciones internas ademas del plugin "para que los tests
  las importaran" - OpenCode trata cualquier export nombrado/default de un
  archivo de plugin como un candidato a `Plugin` e intenta invocarlo, asi
  que llamaba a `extractAddedPackages`/`extractPatchPaths` con el objeto
  interno de OpenCode en vez de un string, tiraba `TypeError`, y esa falla
  en cascada dejaba el bootstrap de config (y el listado de providers) en
  null. Encontrado recien al correr `opencode` de verdad de forma
  interactiva - la sospecha anterior (que el repo viviera dentro de
  `~/.config/opencode`) no era la causa real. Los dos archivos ahora
  exportan unicamente el plugin (mismo patron que `zai.core.ts`, que nunca
  fallo); los helpers quedan privados y se exponen a los tests via
  `Plugin.testHelpers` (una propiedad, no un export nuevo). Se agrego un
  test de regresion por archivo que falla si se vuelve a exportar algo de
  mas.

### Added
- Comando nuevo `/zai-vision`: alternativa a `/zai-init` para cuando la
  idea del proyecto ya esta completa. En vez de interrogar de a una
  pregunta, recibe el volcado completo de una, separa explicitamente "esto
  entendi" de "esto necesito que confirmes" (preguntas agrupadas en un
  solo mensaje), y propone un `docs/VISION.md` desglosado por area
  funcional junto con un roadmap de fases tentativo para ajustar en
  bloque. `/zai-init` sigue igual, sin cambios.

## [0.8.0] - 2026-08-16

### Changed
- Los 24 skills de ZAI (`zai-stack-*` y `zai-practices-*`) se retrofitearon
  al formato LLM-first que exige nuestro propio `skill-creator`: frontmatter
  completo (`license: MIT`, `metadata.author`, `metadata.version`),
  `description` en formato `"Trigger: {keywords}. {que hace}."`, y cuerpo
  reestructurado en las 7 secciones (Activation Contract, Hard Rules,
  Decision Gates, Execution Steps, Output Contract, References). El
  contenido largo (ejemplos de código, escenarios worked, fuentes) se
  movió a `references/`/`assets/` propios de cada skill — se cargan bajo
  demanda en vez de vivir siempre en el `SKILL.md`. Verificado con
  `skill-improver` (auditoría) y con el binario real de OpenCode
  (`opencode debug skill`) que las 24 cargan con el frontmatter nuevo y
  ningún cross-referencia entre skills quedó rota.
- Repo licenciado explícitamente bajo MIT (`LICENSE` nuevo,
  `package.json` con `"license": "MIT"`) — antes no tenía licencia
  declarada pese a ser público.

## [0.7.0] - 2026-08-16

### Changed
- Los skills `zai-practices-architecture`, `zai-practices-patterns`, y
  `zai-practices-security` — cada uno mezclando varios temas no
  relacionados en un solo archivo — se partieron en 12 skills chicos y
  específicos, con el mismo criterio de granularidad que ya usaba
  `zai-stack-*`: `architecture-layering` (hexagonal/clean/screaming),
  `architecture-multi-client` (BFF), `architecture-service-boundaries`
  (monolito vs microservicios), `architecture-frontend-composition`
  (micro-frontends), `patterns-structural` (Repository/Strategy/Factory/
  Adapter/Decorator/DI), `patterns-notifications` (escenarios de
  notificaciones), `patterns-resilience` (Circuit Breaker/Idempotencia),
  `patterns-distributed-data` (CQRS/Event Sourcing/Saga),
  `security-auth` (JWT), `security-supply-chain` (npm supply chain,
  prompt injection en agentes de IA), `security-injection` (IDOR, SSRF,
  prototype pollution). Cada uno cita fuentes reales (papers/writeups
  originales de los patrones, proyectos open source que los implementan,
  o casos de empresas reales) en vez de solo criterio propio.

### Added
- Skill nuevo `zai-practices-architecture-realtime`: criterio concreto de
  WebSockets vs Server-Sent Events vs polling, con código y el caso real
  de Discord como referencia de escala.

## [0.6.0] - 2026-08-16

### Changed
- Los 10 skills `zai-practices-*` se enriquecieron con escenarios reales,
  ejemplos de código, y guías de "qué patrón según el caso" en vez de
  solo tablas de "cuándo sí, cuándo no": `patterns` (notificaciones a
  escala, Circuit Breaker, Idempotencia, CQRS/Event Sourcing, Saga, con
  código), `architecture` (ejemplo hexagonal antes/después, BFF, costo
  real de separar en microservicios), `typing` (utility types que
  esconden intención, template literal types, un ejemplo combinado de
  validación con Zod + unión discriminada + `satisfies`), `testing`
  (vocabulario stub/spy/mock/fake, testing de contrato compartido entre
  clientes web+mobile, testing de workers de cola), `security` (código
  concreto para IDOR, JWT con algoritmo fijo, SSRF con allowlist,
  prototype pollution), `commits` (ejemplo de separar un diff desordenado
  en commits atómicos), `changelog` (ejemplo de traducir varios commits a
  una entrada `[Unreleased]` coherente), `comments` (ejemplo de una
  elección de código que parece un error hasta que se explica el porqué).

## [0.5.0] - 2026-08-16

### Added
- `zai-practices-architecture` extendido con criterio de monolito vs
  microservicios (con los casos concretos de recordatorios/notificaciones,
  envío masivo de correo, y tiempo real), backends multi-cliente
  (web + React Native), y cuándo micro-frontends amerita (casi nunca para
  un equipo chico).
- Skill nuevo `zai-practices-project-structure`: layouts concretos de
  carpetas para monorepo pnpm, monolito full-stack, Next.js App Router, y
  backend standalone.
- Skill nuevo `zai-practices-release-notes`: cómo detectar si un proyecto
  ya usa GitHub Releases antes de asumirlo, cómo traducir el changelog
  técnico a release notes user-friendly, y cómo adaptarlas a anuncios de
  Discord/X.
- `zai-scribe` y `/zai-fase-close` ahora chequean (`gh release list`) si
  el proyecto ya publica releases y, solo si es así, redactan y publican
  una release note al cerrar una fase.

## [0.4.0] - 2026-08-16

### Added
- Módulo `practices`: 8 skills `zai-practices-*` de ingeniería general,
  cargadas on-demand — `commits` (Conventional Commits, atomicidad),
  `changelog` (Keep a Changelog en profundidad, criterio de granularidad),
  `comments` (el WHY no el WHAT, cuándo un comentario envejece mal),
  `typing` (TypeScript: `any` vs `unknown`, uniones discriminadas,
  `satisfies`, branded types), `architecture` (Hexagonal/Clean/Screaming,
  y cuándo ninguna amerita), `patterns` (Repository/Strategy/Factory/
  Adapter/Decorator/DI con criterio de cuándo SI y cuándo NO),
  `security` (defensivo: OWASP Top 10:2025, supply chain — Shai-Hulud,
  compromiso de axios —, prompt injection en agentes de código, JWT,
  SSRF, prototype pollution; investigado con fuentes de 2025-2026, no
  solo conocimiento de entrenamiento), y `testing` (comportamiento vs
  implementación, mocking en los bordes, con el bug real de Gate B de
  esta misma sesión como caso de estudio).

### Changed
- `README.md` y `docs/GUIDE.md` actualizados con el módulo nuevo.

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
