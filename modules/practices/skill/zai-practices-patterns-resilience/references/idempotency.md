# Idempotencia — ejemplo completo

Un webhook de pago, un botón de "confirmar" que el usuario clickea dos
veces por ansiedad, un job de cola que se reprocesa porque el worker se
cayó antes de hacer ack - todos pueden ejecutar la misma operación más de
una vez. Si "cobrar $50" se ejecuta dos veces por el mismo evento, cobrás
$100.

**Patrón**: cada operación sensible lleva una **clave de idempotencia**
(un ID único del lado del cliente/evento) que se guarda la primera vez
que se procesa; si llega de nuevo la misma clave, devolvés el resultado
guardado sin volver a ejecutar el efecto.

```ts
async function chargeCard(idempotencyKey: string, amount: number) {
  const existing = await chargeRepo.findByIdempotencyKey(idempotencyKey)
  if (existing) return existing.result // ya se proceso, no repetir el efecto

  const result = await stripe.charge(amount)
  await chargeRepo.save({ idempotencyKey, result })
  return result
}
```

Cuándo SÍ: cualquier operación con efecto secundario real (dinero,
emails, creación de recursos) que se dispara desde un webhook, un job de
cola, o cualquier canal donde la garantía de "exactamente una vez" no
existe de forma nativa. Cuándo NO: operaciones de solo lectura, o
operaciones donde repetir el efecto es inofensivo por diseño (un
`PUT` que setea un valor absoluto, no lo incrementa).
