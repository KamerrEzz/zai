---
name: zai-practices-patterns-structural
description: "Trigger: Repository, Strategy, Factory, Adapter, Decorator, DI, composicion vs herencia, Container/Presentational. Da criterio de cuando aplicar cada patron estructural, con ejemplo de codigo."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when considering a structural/creational pattern (Repository, Strategy, Factory, Adapter, Decorator, DI, composition vs inheritance, Container/Presentational) for a piece of code. Not for notifications (`zai-practices-patterns-notifications`), external-call resilience (`zai-practices-patterns-resilience`), distributed transactions (`zai-practices-patterns-distributed-data`), or layering (`zai-practices-architecture-layering`).

## Hard Rules
- No envuelvas un ORM ya abstracto en otra interfaz Repository idéntica; el ORM ya es el "port".
- No uses Strategy para un `if/else` de dos ramas fijas que no van a crecer.
- No uses Factory si `new Cosa(args)` alcanza sin lógica de decisión real.
- No uses Adapter si la librería externa ya tiene exactamente la interfaz que necesitás.
- No uses Decorator para comportamiento fijo y único; va directo en la función/clase.
- No inyectes (DI) utilidades puras sin estado; ya son testeables sin inyección.
- Preferí composición sobre herencia salvo jerarquía genuina de tipo ("X ES-UN Y").

## Decision Gates
| Patrón | Usar cuando |
|---|---|
| Repository | Más de una implementación real (prod + in-memory tests) o acceso a datos no trivial |
| Strategy | Más de una implementación activa del mismo contrato |
| Factory | Construcción no trivial con lógica de decisión en runtime |
| Adapter | Integrás algo externo cuya interfaz no controlás |
| Decorator | Combinás comportamientos independientes (retry+logging+cache) |
| DI | Dependencia que en tests querés reemplazar (red, reloj, IDs) |
| Composición | Reuso de comportamiento sin acoplarte al padre |
| Container/Presentational | Separar fetch/estado de render en frontend |

## Execution Steps
1. Identificar el problema concreto del código antes de elegir un patrón.
2. Ubicar el patrón candidato en Decision Gates y verificar contra Hard Rules.
3. Leer el `references/<patrón>.md` correspondiente para la forma exacta del código.
4. Aplicar el patrón mínimo necesario, sin capas extra no usadas.

## Output Contract
Reportar qué patrón se aplicó (o por qué ninguno aplica), la condición "Cuándo SÍ" que lo justificó, y el archivo de `references/` usado como base del código.

## References
- `references/repository.md` — Repository, ejemplo completo
- `references/strategy.md` — Strategy, ejemplo completo
- `references/factory.md` — Factory, ejemplo completo
- `references/adapter.md` — Adapter, ejemplo completo
- `references/decorator.md` — Decorator, ejemplo completo
- `references/composition-di-container.md` — DI, composición vs herencia, Container/Presentational
