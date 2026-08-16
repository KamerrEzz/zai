---
description: Delega en zai-auditor con contexto limpio (spec + diff), escribe el reporte, y transiciona si no hay blockers
agent: zai-planner
---
## Paso 1 - validar que se puede

Leé `.zai/state.json`. Si la fase actual no esta en `green`, PARÁ ACÁ y
decime en que estado esta.

## Paso 2 - armar el contexto limpio

Corré `git diff` contra el punto donde arranco la fase (si no tenes claro
cual es ese punto, preguntame). Ese diff, mas el spec de la fase
(`docs/phases/NN-nombre.md`), es **todo** lo que le vas a mandar a
`zai-auditor`. No le mandes tu propia opinion sobre el codigo, ni quien lo
escribio, ni el resto de esta conversacion.

## Paso 3 - delegar

Invocá `zai-auditor` via `task` con ese contexto. `zai-auditor` no tiene
ninguna herramienta de escritura - su respuesta final es texto, y sos vos
quien la persiste.

Si la respuesta no trae la linea `VEREDICTO: cumple el spec (si/no)`, no es
un reporte valido - volvé a pedirsela, no la completes vos por tu cuenta.

## Paso 4 - persistir el reporte

Escribi exactamente lo que devolvio `zai-auditor` (sin resumir, sin
suavizar) en `docs/audits/fase-NN.md`.

## Paso 5 - blockers y transicion

Extraé la lista de blockers del reporte (puede estar vacia).

```
echo '["blocker uno", "blocker dos"]' | pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-record-blockers.ts "$(pwd)"
```

(mandá `[]` si no hay blockers - esto limpia blockers de una auditoria
anterior, no lo saltees).

- Si la lista **no** esta vacia: el estado se queda en `green`, tal cual
  quedo grabado. No intentes transicionar a `audited` - `transitionPhaseState`
  lo va a rechazar de todas formas (esa invariante vive en
  `modules/core/src/state`, no en este comando).
- Si la lista esta vacia:

```
pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-transition.ts "$(pwd)" audited
```

## Cierre

Decime el veredicto del auditor, cuantos blockers quedaron (si quedaron), y
si el estado avanzo a `audited` o se quedo en `green`. El proximo paso es
`/zai-fase-close` si avanzo a `audited`, o `/zai-fase-fix` si se quedo en
`green` con blockers.
