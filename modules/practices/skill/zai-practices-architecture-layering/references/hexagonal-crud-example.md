# Ejemplo: un CRUD que crece hasta que hexagonal se justifica

Ejemplo completo de referencia para `zai-practices-architecture-layering`: cuando un CRUD simple empieza a acumular una regla de negocio real y se vuelve el momento correcto de introducir un puerto/adapter.

## Fase 1 — CRUD simple, sin hexagonal, y esta bien asi

```ts
// route handler habla directo con Prisma - cero indireccion, cero costo
app.post("/orders", async (req, res) => {
  const order = await prisma.order.create({ data: req.body })
  res.json(order)
})
```

Con validaciones simples y sin reglas de negocio reales, esto es correcto — agregar un puerto/adapter aca es la sobre-arquitectura que el skill advierte.

## Fase 2 — aparece una regla de negocio real

Ejemplo: "un pedido no se puede confirmar si el usuario tiene una deuda pendiente de mas de 30 dias", y esa regla se evalua desde tres lugares distintos: al confirmar, al generar un reporte, y en un job nocturno. Ahora hay logica que se repetiria en cada lugar si sigue viviendo pegada a Prisma — este es el momento de introducir el puerto:

```ts
// domain/order.ts - la regla vive UNA vez, sin saber de Prisma
class Order {
  confirm(userDebt: Money) {
    if (userDebt.exceedsDays(30)) throw new OrderConfirmationBlockedError(this.id)
    this.status = "confirmed"
  }
}

// domain/order-repository.ts - el puerto
interface OrderRepository {
  findById(id: string): Promise<Order | null>
  save(order: Order): Promise<void>
}

// infrastructure/prisma-order-repository.ts - el adapter, afuera
class PrismaOrderRepository implements OrderRepository { /* ... */ }

// El route handler ahora orquesta, no decide:
app.post("/orders/:id/confirm", async (req, res) => {
  const order = await orderRepo.findById(req.params.id)
  const debt = await debtService.getDebt(order.userId)
  order.confirm(debt) // la regla vive en un solo lugar, sin import de Prisma
  await orderRepo.save(order)
  res.json({ status: "confirmed" })
})
```

La señal de que llego el momento no fue "el proyecto crecio" en abstracto — fue que la misma regla de negocio se necesitaba en mas de un lugar, y sin el puerto se hubiera duplicado o quedado acoplada a Prisma en los tres.
