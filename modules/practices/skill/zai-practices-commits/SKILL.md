---
name: zai-practices-commits
description: "Trigger: git commit, conventional commits, atomicidad, mensaje de commit, dividir commits. Define cuando un commit es atomico y el formato Conventional Commits a usar."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when writing or splitting git commits — message format, atomicity, what belongs in one commit vs many. Do not use for PR descriptions or for the changelog (`zai-practices-changelog`).

## Hard Rules
- Un commit tiene que poder revertirse solo y dejar el repo compilando y pasando tests (cada commit, no solo el HEAD final).
- Nunca mezclar un cambio de comportamiento con un cambio de formato/estilo en el mismo commit.
- El tipo Conventional Commits tiene que ser honesto, no optimista — etiquetar mal rompe la automatizacion de changelog/version.
- El cuerpo del commit no repite en prosa lo que el diff ya muestra literal.

## Decision Gates
| Tipo | Cuando | Bump semver |
|---|---|---|
| `feat` | Funcionalidad nueva visible | minor |
| `fix` | Corrige comportamiento roto | patch |
| `docs`/`test`/`chore`/`build`/`ci` | Sin cambio de codigo de produccion | ninguno |
| `refactor` | Cambia estructura interna, mismo comportamiento | ninguno (si de verdad no cambia comportamiento) |
| `perf` | Mejora performance sin cambiar comportamiento | patch, salvo que cambie API |
| `BREAKING CHANGE:` en footer | Rompe compatibilidad | major |

## Execution Steps
1. Revisa `git status`/diff y agrupa cambios por causa, no por archivo.
2. Separa cualquier cambio que necesite "y" mas de una vez para explicarse, o que mezcle formato con comportamiento.
3. Elige el tipo Conventional Commits honesto segun la tabla.
4. Escribe el subject en imperativo, minuscula, sin punto final; agrega cuerpo solo si el por que no es obvio en el diff.
5. Ordena commits dependientes antes de lo que depende de ellos (ej: una dependencia nueva antes del fix que la necesita).

## Output Contract
Devuelve la lista de commits atomicos a crear (archivos a stagear + `tipo(scope): mensaje` de cada uno), en el orden correcto, con cuerpo solo cuando se justifique.

## References
- `references/commit-splitting-example.md` — ejemplo completo de un diff desordenado dividido en commits atomicos, ejemplos de mensajes buenos/malos, y la relacion con Gate D de este toolkit.
