---
name: zai-stack-fresh-docs
description: "Trigger: dependencia nueva, libreria <2 años, major version reciente, context7. Exige consultar context7 antes de codear con librerias jovenes o recien actualizadas."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Usar antes de escribir codigo que importe o configure una dependencia que podria tener menos de 2 años, o que tuvo un major version bump en el ultimo año (ejemplos: React 19, Next.js 16, Tailwind, base-ui, dnd-kit — verificar contra la realidad actual, esta lista envejece y no es exhaustiva). No usar para APIs estables y bien establecidas (built-ins de Node, librerias maduras sin breaking changes recientes).

## Hard Rules
- Hay un gate real (`zai.stack`, ver `docs/RESEARCH.md`) que bloquea escribir codigo que agrega/usa una dependencia joven sin haber consultado `context7` antes, en la misma sesion — esto no es opcional.
- Nunca escribir codigo para esquivar el gate; resolver el bloqueo consultando `context7`.
- Si no estas seguro de si una libreria califica como "joven", chequealo (`context7` o `npm view <pkg> time`) en vez de asumir que tu conocimiento esta al dia.
- La lista de ejemplos de arriba envejece — no confies en ella ciegamente, verifica por libreria.

## Decision Gates
| Situacion | Accion |
|---|---|
| No estas seguro si la libreria califica como joven/recien actualizada | Chequear con `context7` o `npm view <pkg> time` |
| La libreria califica (< 2 años o major bump en el ultimo año) | Correr `context7` resolve-library-id + query-docs antes de escribir codigo |
| La libreria es estable/bien establecida (built-ins de Node, sin breaking changes recientes) | Este skill no aplica |
| La escritura se bloquea con un error "zai gate context7" | Consultar `context7` para la libreria mencionada y reintentar |

## Execution Steps
1. Identificar cualquier dependencia que este por importarse/configurarse en el codigo a escribir.
2. Si no estas seguro de su antiguedad/estabilidad, chequealo en vez de asumir.
3. Si califica como joven o recien actualizada, llamar a `context7` resolve-library-id y despues query-docs para esa libreria.
4. Recien ahi escribir el codigo.
5. Si una escritura se bloquea por el gate, consultar `context7` para la libreria senalada y reintentar — no buscar la vuelta.

## Output Contract
Confirmar que dependencias se chequearon via `context7` (o se encontraron ya estables) antes de escribir codigo, y citar el library id resuelto usado.
