---
name: zai-practices-commits
description: Use ONLY when writing or splitting git commits - message format, atomicity, what belongs in one commit vs many. Do not use for PR descriptions (that's a different artifact with a different audience) or for the changelog (see zai-practices-changelog).
---

# Commits: atomicidad y formato

## El criterio de atomicidad, antes que el formato

Un commit tiene que poder revertirse solo, sin arrastrar nada mas, y tiene
que dejar el repo en un estado que compila y pasa tests (si el proyecto
usa CI, cada commit individual - no solo el HEAD final - deberia poder
pasarla). Si para explicar un commit necesitas la palabra "y" mas de una
vez ("arregla el bug de auth y refactoriza el logger y actualiza deps"),
son commits separados.

Señales de que un commit deberia partirse:
- Toca archivos de mas de un modulo/dominio sin relacion causal entre si.
- Mezcla un cambio de comportamiento con un cambio de formato/estilo (el
  reformateo masivo hace ilegible el diff del cambio real - separalos
  siempre, sin excepcion).
- El mensaje que estas por escribir tiene una lista con bullets de cosas
  no relacionadas.

Señal de que estas partiendo de mas: cada commit individual no compila o
no pasa la suite por si solo. Atomico no es "lo mas chico posible", es
"lo mas chico que sigue siendo un cambio completo y coherente".

## Formato: Conventional Commits

```
<tipo>(<scope opcional>): <descripcion en imperativo, minuscula, sin punto final>

<cuerpo opcional - el POR QUE, no el que (el diff ya dice el que)>

<footer opcional - BREAKING CHANGE: ..., Closes #123>
```

Tipos y que implican para el changelog/version (ver `zai-practices-changelog`
para el detalle de como esto mapea a Keep a Changelog, y a `zai-scribe` en
`modules/phases/` para como este toolkit automatiza el bump de version):

| Tipo | Cuando | Bump semver implicado |
|---|---|---|
| `feat` | Funcionalidad nueva visible para quien usa el codigo | minor |
| `fix` | Corrige un comportamiento roto | patch |
| `docs` | Solo documentacion, cero cambio de codigo | ninguno |
| `refactor` | Cambia estructura interna, mismo comportamiento observable | ninguno (si de verdad no cambia comportamiento) |
| `perf` | Mejora de performance sin cambiar comportamiento | patch, salvo que cambie una API |
| `test` | Solo tests, cero cambio de codigo de produccion | ninguno |
| `chore` | Tareas de mantenimiento (deps, config, tooling) | ninguno |
| `build` / `ci` | Build system o pipelines | ninguno |
| `BREAKING CHANGE:` en el footer | Rompe compatibilidad hacia atras | major |

**El tipo tiene que ser honesto, no optimista.** Si `refactor` en realidad
cambio un edge case de comportamiento, es `fix` o `feat`, no `refactor` -
etiquetar mal esto rompe la automatizacion de changelog/version que
depende del tipo.

## Ejemplos

Mal (vago, no dice el por que, mezcla cosas):

```
fix: arreglos varios
```

```
update stuff
```

Bien:

```
fix(auth): rechazar tokens JWT con alg "none"

El middleware aceptaba el header alg sin validarlo contra una lista
fija, permitiendo bypass de la verificacion de firma. Ver
zai-practices-security-auth para el patron completo.
```

```
feat(queues): agregar soporte para jobs delayed en BullMQ
```

## Cuerpo del commit: cuando se justifica

No todo commit necesita cuerpo. Se justifica cuando:
- La razon del cambio no es obvia mirando el diff (un fix de seguridad,
  una decision que parece rara sin contexto).
- Hay una alternativa obvia que alguien podria proponer despues sin saber
  que ya se descarto - decila y por que se descarto (evita que se
  re-discuta lo mismo en cada PR).

No la uses para repetir en prosa lo que el diff ya muestra literal.

## Ejemplo: de un diff desordenado a commits atomicos

Trabajaste dos horas y `git status` muestra: un fix real en `auth.ts`, un
`console.log` de debug que quedó en `orders.ts`, una dependencia nueva en
`package.json` que necesitaba el fix, y un reformateo automático de
Prettier que corrió sobre `utils.ts` sin que lo pidieras.

```
✗ git add -A && git commit -m "fixes"
  # un solo commit que mezcla: el fix real, deuda de debug, una
  # dependencia sin explicar por qué, y ruido de formato - revertir
  # el fix real ahora también revierte el reformateo de utils.ts
```

Separado por causa, no por archivo:

```
✓ git add package.json pnpm-lock.yaml
  git commit -m "chore(auth): agregar jose para validación de JWT"

✓ git add auth.ts
  git commit -m "fix(auth): rechazar tokens con algoritmo no permitido"

✓ git add utils.ts
  git commit -m "style: aplicar formato de Prettier a utils.ts"

  # el console.log de debug en orders.ts no se commitea - no pertenece
  # a ningún cambio real, se descarta
```

Cuatro cambios físicamente en el mismo `git status`, tres causas reales
(la dependencia es un pre-requisito del fix, así que va antes) y un
descarte. La pregunta que ordena esto no es "¿qué archivos toqué?" sino
"¿cuántas razones distintas tengo para haber tocado algo?".

## Relacion con PRs y con `git commit` en este toolkit

Si estas en un proyecto que usa el loop de fases de ZAI (`modules/phases/`),
el Gate D (bloqueo de commit) puede exigir que `CHANGELOG.md` haya
cambiado antes de dejarte commitear - ver `docs/GUIDE.md` en la raiz del
repo de ZAI. Esto es intencional: un commit sin la entrada de changelog
correspondiente es, la mayoria de las veces, un commit que se olvido de
documentar su propio impacto.
