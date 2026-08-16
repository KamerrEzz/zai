---
description: Inicializa ZAI en este proyecto a partir de una idea ya completa - volcado libre, no interrogatorio de a una pregunta
---
Vas a inicializar ZAI en este proyecto. Esto se hace **una sola vez** por
proyecto. Si ya existe `.zai/state.json`, decime que ya esta inicializado,
mostrame el estado actual (equivalente a `/zai-estado`) y preguntame si de
verdad quiero reinicializar (esto reescribe el archivo) antes de tocar nada.

Este comando es para cuando **ya tengo la idea completa** y no quiero
contestar de a una pregunta - para eso existe `/zai-init`. Acá el trato es
distinto: yo cuento todo de una, vos analizas, y separas explícitamente lo
que entendiste de lo que necesitas que te confirme - **no me tomes la
palabra en todo hasta que quede claro**. Agrupá tus preguntas en un solo
mensaje, no me interrogues de a una.

## Paso 1 - Volcado libre

Pedime que te cuente la idea completa, en el formato que quiera, en un
solo mensaje. No hagas preguntas todavía. Esperá mi respuesta.

## Paso 2 - Separar lo entendido de lo pendiente

Antes de escribir ningún archivo, respondeme con dos listas separadas y
explícitas:

**"Esto entendí"** - tu resumen de la idea, en tus propias palabras. No
repitas lo que dije textualmente, mostrame que lo procesaste.

**"Esto necesito que confirmes"** - únicamente lo que genuinamente no
podés inferir de lo que conté. Ejemplos típicos (no una lista fija, depende
de la idea): ¿web, mobile, o ambas? ¿un solo usuario o multi-usuario?
¿alguna restricción de stack, plazo, o integración obligatoria que ya
tengas decidida? Si algo de lo que conté es ambiguo o se contradice, marcalo
acá también - no lo resuelvas adivinando.

Todas las preguntas van juntas en este único mensaje. Esperá mi respuesta
antes de seguir. Si te digo "seguí, ya te dije lo esencial", avanzá con lo
que tengas y dejá anotado en `docs/VISION.md` (paso siguiente) qué quedó
sin confirmar, en vez de inventarlo.

## Paso 3 - `docs/VISION.md` completo

Con mis respuestas (o con lo ya dicho, si pedí seguir sin contestar todo),
escribí `docs/VISION.md` (creá `docs/` si no existe) con esta forma:

```markdown
# <Nombre> - v0.1

## Qué es / para quién

## Principios de diseño
(solo si dejé alguno claro en la idea - reglas que van a guiar decisiones
futuras, tipo "cada tarjeta es dueña de sus propias fechas". Si no dije
nada de esto, omití la sección entera, no la inventes.)

## <Desglose por área funcional>
Una sección por cada pieza grande de la idea, no un párrafo único que
mezcle todo. El número y nombre de las áreas depende de la idea, no hay
lista fija.

## Fuera de alcance
Lo que explícitamente no entra en esta primera versión.

## Roadmap tentativo por fases
Una propuesta inicial de en qué orden construir esto - ver Paso 4, es la
misma lista.

## Decisiones abiertas
Lo que quedó anotado pero no resuelto (si algo no confirmé en el Paso 2 y
pedí seguir igual, va acá, no se pierde).
```

Mostrame el documento completo y preguntame por ajustes **en bloque**:
"¿algo para corregir, o seguimos?" - no lo revises sección por sección
conmigo, mostralo entero.

## Paso 4 - Plan de fases

A diferencia de `/zai-init`, acá SÍ podés proponer vos el roadmap tentativo
del Paso 3 como punto de partida - yo ajusto encima, no arranco de cero.
Con eso confirmado, escribí `docs/tasks.md`: una lista de fases en orden,
cada una con su nombre, un resumen de una línea, y su estado inicial
(todas `planning` salvo la primera).

También creá el archivo de spec de la primera fase en
`docs/phases/01-<nombre-corto>.md` (numeracion con cero a la izquierda) con
lo que ya quedó claro de esa fase. Las fases siguientes no llevan spec
todavía - eso se escribe cuando les toque (`/zai-fase-start`).

## Paso 5 - `.zai/state.json`

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
instalador de ZAI genera con la ruta real de su repo - no asumas que ZAI
vive en `~/.config/opencode`, ese archivo es justamente lo que evita
tener que asumirlo):

```
echo '<payload de arriba, en una sola linea>' | pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-init-state.ts "$(pwd)"
```

Si ese comando falla (por ejemplo, no existe ese archivo porque nunca se
corrió `pnpm install:zai`, o estas en Windows y `~` no expande), como
ultimo recurso escribi `.zai/state.json` vos mismo con exactamente esta
forma (respeta tipos y el enum de `state`: solo `planning` es valido aca
porque es una fase recien creada):

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

Mostrame un resumen corto: que archivos creaste, que quedo en "Decisiones
abiertas" de `docs/VISION.md` (si algo quedo), y confirmame que
`/zai-estado` ya refleja la fase 1 en `planning`.
