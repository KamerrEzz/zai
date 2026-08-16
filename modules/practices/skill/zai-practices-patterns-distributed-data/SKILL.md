---
name: zai-practices-patterns-distributed-data
description: "Trigger: CQRS, Event Sourcing, Saga, transacciones distribuidas, microservicios. Da criterio de cuando estos patrones de datos cross-servicio se justifican."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when considering CQRS, Event Sourcing, or Saga — patterns for data/transactions that cross service or read/write-model boundaries. Do not use for a single service's internal data access (`zai-practices-patterns-structural`, Repository) or for resilience against external call failures (`zai-practices-patterns-resilience`).

## Hard Rules
- No adoptes CQRS ni Event Sourcing por default; ambos son más complejos que CRUD + relacional y casi ningún proyecto chico/mediano los necesita todavía.
- CQRS solo si lectura y escritura divergen tanto que un solo modelo compromete a ambas.
- Event Sourcing solo si el historial completo de cambios es un requisito de negocio real (auditoría regulatoria, reconstrucción de estado pasado).
- Saga solo si ya hay microservicios genuinamente separados y una operación de negocio cruza más de uno.
- Si una operación necesita consistencia transaccional fuerte entre dos partes, mantenelas en el mismo servicio con una transacción real en vez de usar Saga.

## Decision Gates
| Situación | Patrón |
|---|---|
| Lectura/escritura con necesidades muy distintas (dashboards pesados vs escritura normalizada) | CQRS |
| Historial de cambios es requisito de negocio (auditoría, reconstrucción de estado) | Event Sourcing |
| Operación de negocio cruza microservicios ya separados | Saga (con acción de compensación por paso) |
| Duda, o proyecto sin razón de negocio ya identificada | Ninguno; CRUD + transacción relacional |

## Execution Steps
1. Confirmar que ya existe una razón de negocio concreta e identificada, no solo "podría servir a futuro".
2. Si es lectura/escritura divergente → evaluar CQRS; si es historial/auditoría → evaluar Event Sourcing.
3. Si cruza microservicios → confirmar que están genuinamente separados (ver `zai-practices-architecture-service-boundaries`) antes de diseñar la Saga.
4. Para Saga, definir la acción de compensación de cada paso antes de implementar.
5. Ver `references/examples.md` para el detalle de cada patrón y las fuentes.

## Output Contract
Reportar qué patrón (si alguno) se recomienda, la razón de negocio concreta que lo justifica, y si es Saga, listar los pasos y sus compensaciones.

## References
- `references/examples.md` — CQRS/Event Sourcing (advertencia de complejidad), detalle de Saga, y fuentes
