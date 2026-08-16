---
description: Interroga al usuario para inicializar ZAI en este proyecto (documento de la verdad, plan de fases, .zai/state.json, docs/tasks.md)
---
Vas a inicializar ZAI en este proyecto. Esto se hace **una sola vez** por
proyecto. Si ya existe `.zai/state.json`, decime que ya esta inicializado,
mostrame el estado actual (equivalente a `/zai-estado`) y preguntame si de
verdad quiero reinicializar (esto reescribe el archivo) antes de tocar nada.

No asumas nada de lo que sigue. Una pregunta por vez, esperá mi respuesta
antes de la siguiente.

## Paso 1 - documento de la verdad

Preguntame, en este orden, una por vez:
1. Nombre del proyecto.
2. Que problema resuelve / para quien (2-3 lineas, no un ensayo).
3. Que queda explicitamente fuera de alcance por ahora.
4. Cualquier restriccion no negociable que ya sepas (stack impuesto, deadline,
   integraciones obligatorias).

Con eso, escribi `docs/VISION.md` (creá `docs/` si no existe). Mostrame el
contenido antes de seguir y esperá mi confirmacion o correccion.

## Paso 2 - plan de fases

Preguntame en que fases pensas dividir el trabajo. Para cada fase pedime:
nombre corto, que incluye, que test_globs (patrones de archivos de test) le
van a corresponder. No propongas vos la lista de fases de entrada — la
armamos juntos, vos preguntando, yo respondiendo. Si te pido tu opinion,
dala, pero no la impongas como si ya estuviera decidida.

Con eso, escribi `docs/tasks.md`: una lista de fases en orden, cada una con
su nombre, un resumen de una linea, y su estado inicial (todas `planning`
salvo la primera, que es la que vamos a arrancar).

Tambien creá el archivo de spec de la primera fase en
`docs/phases/01-<nombre-corto>.md` (numeracion con cero a la izquierda) con
lo que ya charlamos sobre esa fase. Las fases siguientes no llevan spec
todavia — eso se escribe cuando les toque (sesion 2, `/zai-fase-start`).

## Paso 3 - `.zai/state.json`

Con los datos de la fase 1 (nombre, ruta al spec que acabas de escribir,
test_globs), generá el payload:

```json
{
  "project": "<nombre del proyecto>",
  "firstPhase": {
    "n": 1,
    "name": "<nombre corto de la fase 1>",
    "spec": "docs/phases/01-<nombre-corto>.md",
    "test_globs": ["<patron1>", "<patron2>"]
  }
}
```

Intenta escribir el estado de forma validada corriendo esto desde la raiz
de este proyecto (`~/.config/opencode/.zai-repo-path` es un archivo que el
instalador de ZAI genera con la ruta real de su repo — no asumas que ZAI
vive en `~/.config/opencode`, ese archivo es justamente lo que evita
tener que asumirlo):

```
echo '<payload de arriba, en una sola linea>' | pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-init-state.ts "$(pwd)"
```

Si ese comando falla (por ejemplo, no existe ese archivo porque nunca se
corrió `pnpm install:zai`, o estas en Windows y `~` no expande), como
ultimo recurso
escribi `.zai/state.json` vos mismo con exactamente esta forma (respeta
tipos y el enum de `state`: solo `planning` es valido aca porque es una fase
recien creada):

```json
{
  "project": "<nombre>",
  "schema_version": "0.1.0",
  "current_phase": 1,
  "phase_state": "planning",
  "phases": [
    {
      "n": 1,
      "name": "<nombre>",
      "spec": "docs/phases/01-<nombre>.md",
      "state": "planning",
      "test_globs": ["..."],
      "audit": null,
      "blockers": []
    }
  ]
}
```

En ese caso avisame explicitamente que la escritura fue manual (sin
validacion zod) para que yo lo sepa.

## Cierre

Mostrame un resumen corto: que archivos creaste, que `/zai-estado` ya
refleja la fase 1 en `planning`, y que el proximo paso es `/zai-fase-red`.
