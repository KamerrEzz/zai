---
name: zai-practices-patterns-resilience
description: "Trigger: Circuit Breaker, idempotencia, servicio externo que falla, opossum, clave de idempotencia. Da criterio de resiliencia ante fallas externas y ejecucion duplicada."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when handling calls to external services that can fail or retry unexpectedly — Circuit Breaker for cascading failures, idempotency keys for operations that might execute twice. Do not use for the retry/backoff mechanism itself as a decorator (`zai-practices-patterns-structural`), or for distributed transactions across services (`zai-practices-patterns-distributed-data`).

## Hard Rules
- Circuit Breaker solo si el servicio externo se llama con frecuencia y su fallo puede degradar tu disponibilidad; no para llamadas puntuales poco frecuentes.
- Configurá siempre `timeout`, `errorThresholdPercentage` y `resetTimeout` (half-open) explícitos; usá una librería real (opossum en Node.js), no reinventes el breaker.
- Definí un `fallback` explícito para cuando el breaker está abierto.
- Toda operación con efecto secundario real (dinero, emails, creación de recursos) disparada desde webhook/job/cola necesita clave de idempotencia.
- No apliques idempotencia a operaciones de solo lectura o donde repetir el efecto es inofensivo (ej. `PUT` que setea un valor absoluto).

## Decision Gates
| Síntoma | Patrón |
|---|---|
| Llamada externa frecuente, fallo puede cascadear | Circuit Breaker |
| Llamada externa puntual, timeout ocasional sin efecto cascada | Ninguno (solo el retry/backoff del Decorator) |
| Operación con efecto secundario disparada por webhook/job/cola | Idempotencia |
| Operación de solo lectura o efecto inofensivo repetido | Ninguno |

## Execution Steps
1. Identificar si el problema es "llamada externa que puede fallar en cascada" o "operación que puede ejecutarse dos veces".
2. Para cascada: confirmar la frecuencia de la llamada y configurar timeout/errorThreshold/resetTimeout con la librería real (`references/circuit-breaker.md`).
3. Para duplicación: confirmar que el canal (webhook/cola) no garantiza "exactamente una vez" y agregar clave de idempotencia (`references/idempotency.md`).
4. Verificar contra Hard Rules que el patrón no es overkill para el caso.

## Output Contract
Reportar qué patrón se aplicó (Circuit Breaker, Idempotencia, o ninguno), la configuración clave usada (timeout/threshold/reset o el origen de la idempotency key), y el archivo de referencia consultado.

## References
- `references/circuit-breaker.md` — ejemplo con opossum y fuente (Martin Fowler)
- `references/idempotency.md` — ejemplo de código y cuándo SÍ/NO
