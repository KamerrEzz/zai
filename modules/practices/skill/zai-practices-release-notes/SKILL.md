---
name: zai-practices-release-notes
description: "Trigger: GitHub release, release notes, gh release create, anuncio de Discord/X, traducir changelog. Traduce entradas de changelog a prose legible para releases y anuncios."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when a project already publishes GitHub Releases (or is about to start) and you need to write release notes, or turn a release into a Discord/X announcement. Do not use for `CHANGELOG.md` entries themselves (`zai-practices-changelog`) — this translates those entries into reader-facing prose.

## Hard Rules
- Nunca asumas que un proyecto necesita GitHub Releases — confirma primero con `gh release list --limit 5`; crear el primer release es decision del dueño del repo.
- Si ya hay releases previos, segui el tono/formato de los ultimos 2-3 (`gh release view <tag>`) por sobre cualquier formato "ideal".
- Lidera siempre con el beneficio para quien lee, no con el mecanismo tecnico.
- Los breaking changes se dicen temprano y claro, nunca al final esperando que nadie llegue ahi.
- Nunca uses `gh release create --generate-notes` como resultado final — es solo un punto de partida tecnico.
- `zai-scribe` no tiene `bash`; quien lo invoco corre `gh release create`, no el redactor.

## Decision Gates
| Audiencia | Formato |
|---|---|
| Pagina de release | Template completo: titulo, novedades, arreglos, cambios importantes |
| Discord | Markdown mas largo, punto principal + bullets + link al changelog |
| X/Twitter | Un solo punto, el mas relevante, sin lista de bullets |

## Execution Steps
1. Corre `gh release list --limit 5`; si esta vacio, confirma con el usuario antes de crear el primero.
2. Si hay releases previos, lee 2-3 con `gh release view` para igualar tono/formato.
3. Traduce cada entrada relevante de `CHANGELOG.md` de mecanismo tecnico a beneficio para el lector.
4. Completa el template de release note, omitiendo secciones vacias; breaking changes al frente si los hay.
5. Si tambien vas a publicar en Discord/X, reescribi el mismo contenido segun la tabla de audiencias - no reuses la release note tal cual.
6. Entrega el archivo final para `gh release create <tag> --title "..." --notes-file <archivo>` — no lo corras si no tenes bash.

## Output Contract
Devuelve el contenido de la release note (y cualquier variante Discord/X pedida), lista para pasar como `--notes-file`, mas la confirmacion de si `gh release list` mostro releases existentes.

## References
- `references/release-notes-examples.md` — ejemplo de traduccion changelog-a-release-note, template completo, y templates de Discord/X.
