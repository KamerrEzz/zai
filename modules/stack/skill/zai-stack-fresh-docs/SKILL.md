---
name: zai-stack-fresh-docs
description: Use ONLY when about to write code that imports or configures a dependency that might be less than 2 years old, or that had a major version bump in the last year (examples in this stack - React 19, Next.js 16, Tailwind, base-ui, dnd-kit - verify, do not assume this list is exhaustive or still accurate). Do not use for stable, long-established APIs (Node built-ins, well-established libraries with no recent breaking changes).
---

# Regla obligatoria: documentacion actualizada antes de codigo en dependencias jovenes

Tu conocimiento de una libreria con menos de 2 años de vida, o que cambio
de major en el ultimo año, puede estar desactualizado o directamente
equivocado - las APIs de este tipo de librerias cambian mas rapido que tu
fecha de corte de entrenamiento. Esto no es una sugerencia: hay un gate
real (`zai.stack`, ver `docs/RESEARCH.md`) que **bloquea** la escritura de
codigo que agrega o usa una dependencia de este tipo si no consultaste
`context7` antes, en esta misma sesion.

## Que hacer

Antes de escribir codigo que importe o configure una libreria de la que no
estas seguro de la vigencia:

1. Si no sabes si la libreria entra en esta categoria, chequealo (via
   `context7` o `npm view <paquete> time`) en vez de asumir que tu
   conocimiento esta al dia.
2. Si entra en la categoria: usa `context7` (resolve-library-id +
   query-docs) para esa libreria especifica **antes** de escribir el
   codigo que la usa, no despues.
3. Recien ahi escribi el codigo.

## Si el gate te bloquea

Si una escritura te devuelve un error que menciona "zai gate context7" (o
similar), es el gate real, no un bug - consulta `context7` para la
libreria que menciona el error y volve a intentar. No busques la vuelta
escribiendo el codigo de otra forma para esquivar el gate.

## Nota sobre la lista de ejemplos de arriba

La lista de librerias jovenes en la descripcion de este skill (React 19,
Next.js 16, etc) es la que valia a la fecha en que se escribio este skill
- no la des por buena sin chequear: las librerias envejecen y dejan de
calificar, y aparecen otras nuevas que si califican. Si tenes dudas sobre
si algo sigue calificando, chequealo en vez de guiarte solo por esta lista.
