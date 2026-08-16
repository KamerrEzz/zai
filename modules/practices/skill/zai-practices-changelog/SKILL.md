---
name: zai-practices-changelog
description: "Trigger: CHANGELOG.md, keep a changelog, unreleased, entrada de changelog. Define que entra y que no entra en un CHANGELOG.md, y en que seccion."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when writing or reviewing entries in a `CHANGELOG.md`. Do not use for commit messages (`zai-practices-commits`) or internal docs like ADRs — a changelog is for someone deciding whether to upgrade, not for someone debugging the implementation.

## Hard Rules
- Solo entra una linea si a alguien que no leyo el codigo le importa para decidir si actualiza.
- Nunca van: refactors internos sin efecto observable, "arreglado typo", "mejoras varias", nombres de autores.
- Los fixes de seguridad van en `Security`, nunca escondidos en `Fixed`.
- Cualquier `Changed`/`Removed` que rompe compatibilidad se marca explicito con "**BREAKING:**" al inicio de la linea.
- Mantene `[Unreleased]` actualizado en cada PR/commit, no lo reconstruyas de memoria al versionar.

## Decision Gates
| Categoria | Cuando | Semver |
|---|---|---|
| `Added` | Funcionalidad nueva (nombra la opcion/flag/endpoint) | minor |
| `Changed` | Comportamiento existente que cambio | minor, o major si rompe |
| `Deprecated` | Sigue funcionando pero va a desaparecer (decir reemplazo) | ninguno |
| `Removed` | Se saco de verdad (referenciar deprecacion previa) | major |
| `Fixed` | Bug corregido — describe el sintoma, no la causa interna | patch |
| `Security` | Vulnerabilidad corregida, seccion propia | patch |

## Execution Steps
1. Para cada commit/PR desde el ultimo release, aplica la pregunta de Hard Rules; descarta lo que no la pasa.
2. Clasifica lo que sobrevive en el minimo set de categorias correctas (nunca las seis llenas por defecto).
3. Escribe una linea por cambio, describiendo el efecto observable, no la implementacion.
4. Marca entradas breaking con "**BREAKING:**" y confirma el bump de semver correspondiente.
5. Agrega la entrada a `[Unreleased]` de inmediato, no al momento de versionar.

## Output Contract
Devuelve las entradas a agregar/editar bajo `[Unreleased]` (o la version destino), agrupadas por categoria, una linea por cambio, listas para pegar en `CHANGELOG.md`.

## References
- `references/changelog-examples.md` — ejemplo de granularidad, ejemplo de commits traducidos a `[Unreleased]`, y por que el cero-changelog es peor que uno imperfecto.
