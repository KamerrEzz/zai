---
name: zai-practices-patterns-notifications
description: "Trigger: notificaciones, email, push, in-app, cola de mensajes, Observer, Outbox. Da criterio de que patron de envio usar segun volumen, canales y garantia de entrega."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when designing how to send notifications/messages (email, push, in-app) and deciding between direct send, queue+worker, multi-channel Observer, or Outbox. Do not use for choosing a queue library (`zai-stack-queues`), for why notification work might live in its own service (`zai-practices-architecture-service-boundaries`), or for realtime push tech like WebSockets/SSE (`zai-practices-architecture-realtime`).

## Hard Rules
- No agregues una cola para un evento único a una sola persona no crítico; mandalo directo desde el caso de uso.
- Alto volumen (newsletter, alerta masiva) siempre va con Queue + Worker y rate limiting explícito contra el proveedor.
- Multi-canal (mismo evento dispara varios canales) va con Observer/Event-driven; el caso de uso no debe saber cuántos ni cuáles canales hay.
- Si no podés perder una notificación cuando el proceso se cae, usá Outbox: el insert a `outbox` debe estar en la misma transacción que el cambio de negocio.
- No migres de envío directo a cola antes de que el envío síncrono se acerque al timeout o el proveedor empiece a rate-limitear.

## Decision Gates
| Escenario | Patrón |
|---|---|
| Un evento, un destinatario, no crítico | Envío directo (sync/await) |
| Alto volumen, muchos destinatarios | Queue + Worker (ver `zai-stack-queues`) + rate limiting |
| Mismo evento dispara varios canales | Observer/Event-driven |
| No se puede perder la notificación si el proceso se cae | Outbox pattern |

## Execution Steps
1. Identificar volumen, cantidad de canales, y si hay garantía de entrega requerida.
2. Ubicar el escenario en Decision Gates.
3. Si es Observer, combinar con Strategy (canal por preferencia) y Decorator (retry/logging) — ver `zai-practices-patterns-structural`.
4. Si requiere garantía de entrega, confirmar que el insert a `outbox` está en la misma transacción DB que el cambio de negocio.
5. Ver `references/examples.md` para el código completo de cada escenario.

## Output Contract
Reportar qué patrón de notificación se eligió, la señal concreta que lo justificó (volumen/canales/garantía), y si aplica, confirmar que el outbox insert está en la misma transacción.

## References
- `references/examples.md` — ejemplos de código de los 4 escenarios y fuentes (transactional outbox, Debezium)
