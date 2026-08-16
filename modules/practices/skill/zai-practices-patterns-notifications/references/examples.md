# Notificaciones — ejemplos por escenario

## Un evento, una sola persona, no crítico

("tu pedido fue confirmado"): mandala directo desde el caso de uso,
síncrono o con un `await` simple a una cola liviana. No necesitás
infraestructura de mensajería para esto - agregar una cola acá es pagar
complejidad operacional (un worker más para mantener, un punto más de
falla) por un problema que no tenés.

```ts
async function confirmOrder(orderId: string) {
  const order = await orderRepo.findById(orderId)
  order.confirm()
  await orderRepo.save(order)
  await notificationChannel.send(order.userEmail, "Pedido confirmado", ...) // directo
}
```

## Alto volumen, muchos destinatarios

(newsletter, alerta masiva a toda la base de usuarios): acá sí, **Queue +
Worker** (ver `zai-stack-queues` para BullMQ/pg-boss/RabbitMQ) - encolás
un job por batch o por destinatario, un worker separado los procesa con
**rate limiting** explícito contra el proveedor de email (la mayoría cobra
o banea por excederte de su límite de envíos/segundo). Enviar 100.000
emails en un loop síncrono dentro de un request HTTP no solo bloquea la
respuesta - timeoutea mucho antes de terminar.

Esta es también la respuesta al caso típico de "empezamos con 3 personas y
funcionaba mandando directo, ¿y ahora?": el punto donde conviene migrar de
"envío directo" a "cola + worker" no es un número mágico de usuarios - es
el momento en que el envío síncrono empieza a acercarse al timeout del
request, o en que el proveedor de email empieza a devolver errores de rate
limit. Migrar antes de esa señal es pagar la complejidad operacional sin
necesitarla todavía; migrar después de que ya duele es tarde pero sigue
siendo el mismo cambio, no uno más grande.

## Multi-canal

(el mismo evento tiene que disparar email + push + un registro in-app, y
mañana puede sumarse Slack): **Observer/Event-driven** - el caso de uso
emite un evento de dominio (`OrderConfirmed`), y cada canal es un
subscriber independiente que reacciona a ese evento sin que el caso de uso
sepa cuántos ni cuáles hay:

```ts
// El dominio solo emite el evento, no sabe quién escucha
class Order {
  confirm() {
    this.status = "confirmed"
    this.recordEvent(new OrderConfirmed(this.id, this.userId))
  }
}

// Cada canal es independiente, se puede agregar/sacar sin tocar el dominio
eventBus.subscribe(OrderConfirmed, async (e) => emailChannel.send(e.userId, "..."))
eventBus.subscribe(OrderConfirmed, async (e) => pushChannel.send(e.userId, "..."))
eventBus.subscribe(OrderConfirmed, async (e) => activityLog.record(e.userId, "order_confirmed"))
```

Esto además es donde `Strategy` (seleccionar canal según preferencia del
usuario) y `Decorator` (retry/logging alrededor de cada envío, ver
`zai-practices-patterns-structural`) se combinan naturalmente con el
Observer - cada subscriber puede tener su propio canal seleccionado por
Strategy, envuelto en Decorator para reintentos.

## Con garantía de entrega

(no podés permitirte perder una notificación si el proceso se cae justo
después de confirmar el pedido pero antes de encolar el email): **patrón
Outbox** - en la misma transacción de base de datos que confirma el
pedido, insertás una fila en una tabla `outbox` con el evento a publicar.
Un proceso separado (polling o CDC) lee esa tabla y publica a la cola
real, marcando como enviado. Como el insert a `outbox` está en la misma
transacción que el cambio de negocio, es imposible que uno pase sin el
otro - a diferencia de "guardo el pedido y *después* encolo el email" (dos
pasos separados, sin garantía si el proceso muere entre medio).

Debezium (proyecto real de captura de cambios de datos, muy usado en
producción) implementa exactamente este patrón como un transformador de
eventos de Kafka - ver fuentes, si necesitás una referencia de una
implementación real y no solo la idea en abstracto.

## Fuentes

- [Pattern: Transactional outbox - microservices.io (Chris Richardson)](https://microservices.io/patterns/data/transactional-outbox.html) - la referencia canónica del patrón.
- [Outbox Event Router - Debezium](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html) - implementación real del patrón en un proyecto ampliamente usado.
