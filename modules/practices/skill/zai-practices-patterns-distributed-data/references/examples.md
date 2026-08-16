# CQRS, Event Sourcing, Saga — detalle completo

Los tres patrones de este skill comparten algo: son significativamente
más complejos que CRUD + una base relacional con transacciones, y existen
para resolver un problema concreto que **la mayoría de los proyectos no
tiene todavía**. Mencionarlos acá es para que sepas que existen y qué
problema resuelven cada uno - no para que los adoptes por default.

## CQRS y Event Sourcing: mencionados porque existen, no porque casi nunca amerita

**CQRS** (separar el modelo de escritura del modelo de lectura) sirve
cuando las necesidades de lectura y escritura divergen tanto que un solo
modelo compromete a ambas (escrituras que necesitan consistencia fuerte y
normalización, lecturas que necesitan datos desnormalizados para
dashboards pesados). **Event Sourcing** (guardar la secuencia de eventos
en vez del estado final) sirve cuando el historial completo de cambios es
en sí mismo un requisito de negocio (auditoría regulatoria, poder
reconstruir el estado en cualquier punto del pasado).

Ambos son significativamente más complejos que CRUD + una base relacional
- eventual consistency que hay que manejar en cada lugar que lee,
proyecciones que hay que mantener y reconstruir. Para la enorme mayoría
de proyectos (incluido casi cualquier SaaS de tamaño chico/mediano),
ninguno de los dos se justifica. No los selecciones por default sin una
razón de negocio concreta y ya identificada.

## Transacciones que cruzan más de un servicio: Saga

Si separaste en microservicios (ver
`zai-practices-architecture-service-boundaries`) y una operación de
negocio necesita tocar más de uno (crear un pedido reserva stock en el
servicio de inventario Y cobra en el servicio de pagos), ya no tenés una
transacción de base de datos que cubra ambos.

**Saga**: la operación se modela como una secuencia de pasos locales, cada
uno con su **acción de compensación** si un paso posterior falla (si el
cobro falla después de reservar el stock, se dispara la compensación
"liberar stock reservado"). No es una transacción real (no hay rollback
atómico) - es consistencia eventual con un plan explícito de qué hacer
si algo a mitad de camino falla.

Cuándo SÍ: ya tenés microservicios genuinamente separados (ver el
criterio de ciclo de vida distinto en
`zai-practices-architecture-service-boundaries`) y una operación de
negocio cruza más de uno. Cuándo NO: es la razón más común para NO
separar algo en microservicios en primer lugar - si una operación
necesita consistencia transaccional fuerte entre dos partes, mantenerlas
en el mismo servicio (con una transacción de base de datos real) es más
simple que una Saga.

## Fuentes

- [bliki: CQRS - Martin Fowler](https://martinfowler.com/bliki/CQRS.html) - writeup original, advierte explícitamente que CQRS "agrega complejidad riesgosa".
- [Don't Let the Internet Dupe You, Event Sourcing is Hard - Chris Kiehl](https://chriskiehl.com/article/event-sourcing-is-hard) - un contrapeso real sobre el costo de Event Sourcing, no solo la versión promocional.
- [Pattern: Saga - microservices.io (Chris Richardson)](https://microservices.io/patterns/data/saga.html) - la referencia canónica.
- [Saga Design Pattern - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga) - ejemplo concreto de implementación por orquestación vs coreografía.
