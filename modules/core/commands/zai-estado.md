---
description: Muestra en que fase y estado esta el proyecto actual segun .zai/state.json
---
Lee `.zai/state.json` en la raiz de este proyecto (si el plugin `zai.core`
ya lo inyecto en tu contexto via `instructions`, usa esa version en vez de
releerlo).

Si el archivo no existe: decime en una linea que este proyecto no usa ZAI
todavia y sugerime correr `/zai-init` si quiero arrancarlo. No hagas nada mas.

Si existe, respondeme en un bloque corto, escaneable de un vistazo, con
exactamente este formato (sin explicaciones alrededor):

```
proyecto: <project>
fase: <current_phase> - <nombre de la fase actual>
estado: <phase_state>
spec: <ruta al spec de la fase actual>
blockers: <cantidad de blockers de la fase actual, o "ninguno">
proximo paso: <comando exacto>
```

`proximo paso` se calcula así, sin ambigüedad — es la única fuente de
verdad de "qué comando sigue", no lo repitas de memoria:

| `phase_state` | blockers de la fase actual | proximo paso |
|---|---|---|
| `planning` | — | `/zai-fase-red` |
| `red` | — | `/zai-fase-green` |
| `green` | 0 | `/zai-fase-audit` |
| `green` | > 0 | `/zai-fase-fix` |
| `audited` | — | `/zai-fase-close` |
| `documented` | — | ver abajo |

Si `phase_state` es `documented`: leé `docs/tasks.md`. Si hay una fase
siguiente listada después de la actual, `proximo paso` es `/zai-fase-start`.
Si la fase actual es la última de la lista, `proximo paso` es "ninguno -
proyecto completo".

Si el archivo existe pero no cumple el schema esperado (campos faltantes,
`current_phase` que no aparece en `phases[]`, etc), decime claramente que
`.zai/state.json` esta corrupto y en que consiste el problema — no intentes
adivinar o completar los datos que faltan.
