---
name: zai-practices-architecture-service-boundaries
description: "Trigger: microservicios, monolito, service boundaries, worker separado. Decide si una feature debe separarse en su propio servicio o worker."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when deciding whether something should be split out of the monolith into its own service or worker — reminders/scheduled notifications, mass email, realtime, or any feature that "feels big enough". Do not use for internal layering of a single service (`zai-practices-architecture-layering`) or for serving multiple client apps (`zai-practices-architecture-multi-client`).

## Hard Rules
- Separar en servicio se justifica por un ciclo de vida distinto (escala, deploy, o falla independiente), nunca solo porque "asi se hace en sistemas grandes".
- Empeza con el monolito modularizado internamente (screaming architecture, `zai-practices-architecture-layering`); separar despues es mas barato que pagar costo de red/deploy/consistencia desde el dia uno sin necesitarlo.
- Si una operacion de negocio cruza servicios todo el tiempo, la linea de separacion esta mal trazada — las cosas que cambian juntas deberian vivir juntas.

## Decision Gates
| Caso | Señal real | Accion |
|---|---|---|
| Recordatorios / notificaciones programadas | Necesita *scheduling* (dispara sin request activa) | Worker separado (mismo repo, proceso distinto); ver `zai-stack-queues` |
| Envio masivo de emails | Volumen alto y consistente, necesita rate limiting/backoff propio | Servicio propio si el volumen lo justifica; si no, encolar dentro del monolito |
| Tiempo real (websockets/SSE/pub-sub) | Conexiones long-lived, perfil de recursos distinto a request/response HTTP | Proceso/servicio separado; ver `zai-practices-architecture-realtime` para la tecnologia |
| Operacion de negocio cruza servicios constantemente | Linea de separacion mal trazada | Revisar el boundary; Saga (`zai-practices-patterns-distributed-data`) no es un parche para un mal corte |

## Execution Steps
1. Identificar si la feature tiene una razon operacional concreta (scheduling, rate limiting externo, perfil de conexion) para tener ciclo de vida distinto.
2. Si no hay razon concreta, mantenerla como feature dentro del monolito.
3. Si la hay, evaluar primero un worker/proceso separado en el mismo repo antes de un servicio con deploy propio.
4. Si la operacion de negocio va a cruzar el nuevo boundary constantemente, aplicar un patron explicito (Saga) o reconsiderar el corte antes de separar.

## Output Contract
Indicar si corresponde separar (servicio o worker) o mantener en el monolito, citando la razon operacional concreta encontrada, y advertir si la separacion propuesta generaria transacciones cross-servicio frecuentes.

## References
- `references/service-boundaries-case-studies.md` — casos reales Segment (vuelta a monolito) y Shopify (separacion selectiva), con fuentes y el costo de perder la transaccion de base de datos al separar.
