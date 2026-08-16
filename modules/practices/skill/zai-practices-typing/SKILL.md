---
name: zai-practices-typing
description: "Trigger: any vs unknown, union discriminada, as vs satisfies, generics, branded types. Guia de precision de tipos en TypeScript sin sobre-ingenieria."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when writing or reviewing TypeScript type definitions — interfaces, generics, unions, type assertions. Do not use for runtime validation logic itself (Zod/application code) or non-TypeScript languages.

## Hard Rules
- Nunca uses `any` para un tipo genuinamente desconocido — usa `unknown` y angosta antes de usarlo.
- Reemplaza "sopa de opcionales" por una union discriminada cuando los campos solo tienen sentido juntos segun un modo.
- Preferi `satisfies` sobre `as`; reserva `as` para lo que el compilador de verdad no puede inferir y vos podes garantizar.
- No crees un generic con un solo uso concreto real en el codebase — es un tipo concreto disfrazado.
- `readonly` documenta intencion de no-mutacion, no es solo defensivo.
- Usa branded types solo para identificadores/valores de paso frecuente donde confundirlos tiene costo real (IDs, dinero, unidades) — no para todo.

## Decision Gates
| Situacion | Eleccion |
|---|---|
| Tipo genuinamente desconocido (JSON.parse, input externo) | `unknown` + angostar |
| Campos de un objeto validos solo en combinacion (por "modo") | Union discriminada, no mas opcionales |
| Config estatica validada contra un tipo | `satisfies`, no `as` |
| Generic usado con un solo tipo concreto en todo el codebase | Eliminar el generic |
| String con estructura fija (ruta, clave i18n, nombre de evento) | Template literal type |
| Derivado debe seguir mecanicamente a la fuente (body de un PATCH) | `Partial`/`Pick`/`Omit` |
| Tipo refleja un contrato real fijo (body de un endpoint) | Declararlo explicito, no derivarlo |

## Execution Steps
1. Busca usos de `any`; reemplaza por `unknown` + angostamiento o por una union discriminada/generic.
2. Revisa cada `as` — mantenelo solo si el compilador no puede inferirlo y es demostrablemente seguro; el resto pasa a `satisfies`.
3. Revisa tipos con muchos opcionales buscando "modos" implicitos que deberian ser union discriminada.
4. Verifica que cada generic se use con mas de un tipo real distinto; aplana los de uso unico.
5. En tipos publicos/compartidos, confirma que los derivados con `Pick`/`Omit`/`Partial` siguen reflejando la intencion, no solo la mecanica.

## Output Contract
Reporta cada problema de diseño de tipos encontrado (archivo:linea), que Hard Rule/Decision Gate viola, y el tipo corregido propuesto.

## References
- `references/typing-examples.md` — ejemplos completos: union discriminada, `satisfies` vs `as`, generics, branded types, riesgo de `Omit` silencioso, template literal types, y el ejemplo combinado de validacion de formulario (Zod + union + `satisfies`).
