---
name: zai-practices-project-structure
description: "Trigger: estructura de carpetas, monorepo, layout de proyecto, App Router. Da el arbol de carpetas concreto para las 4 formas comunes de organizar un proyecto."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when laying out the literal folder/directory structure of a new project or package — monorepo vs single app, where routes/domain/shared code live. Do not use to decide WHETHER to split into services or how layers depend on each other (`zai-practices-architecture-layering`, `zai-practices-architecture-service-boundaries`) — this is the tree once that decision is made.

## Hard Rules
- `packages/shared-types` (monorepo) es el unico lugar donde vive el contrato API-clientes — nunca redefinir tipos de respuesta por cliente.
- Direccion de dependencia unica: `apps/*` -> `packages/*`, nunca `apps/*` -> `apps/*`.
- `app/` (Next.js App Router) es el punto de entrada, no donde vive la logica de negocio — eso va en `<dominio>/domain/`.
- Cada carpeta de dominio (`orders/`, `billing/`) es autocontenida; acceso cruzado pasa por el `domain/` publico del otro dominio, nunca por su `infrastructure/`.
- No promuevas un componente/hook a `shared/` hasta que un segundo lugar real lo necesite.

## Decision Gates
| Forma del proyecto | Layout |
|---|---|
| API + web + mobile, contrato compartido | Monorepo pnpm (`apps/*`, `packages/shared-types`) |
| Un solo Next.js, sin otro cliente | Monolito full-stack (`src/app` + `src/<dominio>/domain,infrastructure`) |
| Dentro de `app/` de Next.js especificamente | Convenciones App Router (colocacion, route groups, prefijo `_`) |
| Backend standalone (Express/NestJS) | `apps/api/src/<dominio>/domain,infrastructure` (hexagonal) |

## Execution Steps
1. Identifica cual de las cuatro formas coincide con el proyecto (consumidores: app unica vs web+mobile vs API standalone).
2. Aplica el arbol de carpetas correspondiente de `assets/folder-trees.md`.
3. Verifica que se cumple la regla de direccion de dependencia (sin imports cruzados entre apps, sin cruzar infrastructure entre dominios).
4. Confirma que los archivos de rutas/entry-point solo orquestan — mueve a `domain/` cualquier logica de negocio encontrada ahi.
5. Si agregar una feature chica exige tocar 3+ carpetas de capas para un solo concepto, reconsidera si el proyecto amerita ese nivel de separacion todavia.

## Output Contract
Devuelve el nombre del layout elegido, el arbol de carpetas concreto a crear/ajustar, y cualquier violacion de direccion de dependencia o de ubicacion de logica encontrada en la estructura existente.

## References
- `assets/folder-trees.md` — los cuatro arboles de carpetas literales (monorepo, monolito, convenciones App Router, backend standalone) como plantillas para copiar.
