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
```

Si el archivo existe pero no cumple el schema esperado (campos faltantes,
`current_phase` que no aparece en `phases[]`, etc), decime claramente que
`.zai/state.json` esta corrupto y en que consiste el problema — no intentes
adivinar o completar los datos que faltan.
