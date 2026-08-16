---
name: zai-practices-comments
description: "Trigger: comentario de codigo, docstring, TODO, FIXME, codigo comentado. Decide si un comentario vale la pena y exige que documente el por que, nunca el que."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when deciding whether to write a code comment, writing a docstring for a public API, or reviewing existing comments. Do not use for commit messages, changelogs, or ADRs — different artifacts, different audiences.

## Hard Rules
- Si un mejor nombre haria innecesario el comentario, arregla el nombre en vez de comentar.
- Nunca escribas un comentario que solo repite lo que el codigo ya dice (el WHAT).
- Un comentario que describe el comportamiento actual en vez de una restriccion permanente envejece mal — escribe el WHY.
- Un `TODO`/`FIXME` sin dueño ni issue linkeado es deshonesto — borralo o convertilo en issue.
- Nunca dejes codigo comentado "por las dudas" — `git log`/`git blame` ya lo recuperan.

## Decision Gates
| Situacion | Accion |
|---|---|
| Restriccion no obvia detras de una decision de diseño | Comentario explicando el por que |
| Workaround de un bug ajeno/dependencia | Comentario con referencia al bug |
| Invariante que el compilador no puede verificar | Comentario que declara el invariante |
| API publica que otros llaman sin leer la implementacion | Docstring documentando el contrato (input/output/excepciones/side effects) |
| Codigo interno, quien lo llama puede leer la implementacion en segundos | Sin docstring — el tipo y el nombre ya documentan |

## Execution Steps
1. Aplica la prueba de una linea: ¿un mejor nombre eliminaria este comentario? Si es si, renombra.
2. Contrasta la situacion contra la tabla de Decision Gates antes de escribir nada.
3. En APIs publicas, redacta el docstring contra el contrato, no contra la implementacion.
4. En cualquier `TODO`/`FIXME` existente, verifica que tenga dueño + issue, o borralo.
5. Al revisar codigo, trata comentarios viejos con la misma sospecha que codigo muerto — un comentario desactualizado desinforma activamente.

## Output Contract
Reporta que comentarios/docstrings agregar, que renombrar en vez de comentar, y que borrar (TODOs huerfanos, codigo comentado, comentarios que repiten el WHAT), con la razon de una linea en cada caso.

## References
- `references/comments-examples.md` — ejemplos completos antes/despues (nombre vs comentario, ADR vs comentario que envejece, findUser con busqueda lineal a proposito).
