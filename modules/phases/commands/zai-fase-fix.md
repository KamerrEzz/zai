---
description: Toma el reporte de auditoria y delega en zai-implementer solo los blockers y mayores
agent: zai-planner
---
## Paso 1 - validar que se puede

Leé `.zai/state.json`. Si la fase actual no esta en `green`, PARÁ ACÁ - este
comando existe para cuando `/zai-fase-audit` dejo blockers pendientes, y eso
solo pasa quedandose en `green`.

Leé `docs/audits/fase-NN.md` (el ultimo reporte). Si no existe, decime que
corra `/zai-fase-audit` primero.

## Paso 2 - filtrar

De los hallazgos del reporte, tomá **solo** los `blocker` y `mayor`. Los
`menor` no son parte de este ciclo - anotalos para que no se pierdan, pero
no se los mandes al implementer ahora (si lo haces, le diluis el foco a lo
que de verdad bloquea la fase).

## Paso 3 - delegar

Invocá `zai-implementer` via `task` con esa lista filtrada (blocker + mayor)
y el spec de la fase. Los mismos limites de siempre aplican: no toca tests,
el Gate A lo hace cumplir.

## Paso 4 - verificar y volver a auditar

Corré la suite de tests. Si pasa, el siguiente paso **no** es transicionar
por tu cuenta - es correr `/zai-fase-audit` de nuevo, con contexto limpio,
para confirmar que los blockers efectivamente se resolvieron. No te
autoapruebes vos mismo con la palabra de que "ya deberia estar bien".

## Cierre

Decime que blockers/mayores se atendieron, que la suite sigue en verde, y
que el proximo paso es correr `/zai-fase-audit` de nuevo (no lo corras vos
automaticamente dentro de este mismo comando - dejá que yo lo pida).
