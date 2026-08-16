# Repository — ejemplo completo

**Qué hace**: abstrae el acceso a datos detrás de una interfaz para que el
dominio no sepa si hay Postgres, un archivo, o una API remota atrás.

```ts
// El dominio define el contrato (puerto), sin saber cómo se implementa
interface OrderRepository {
  findById(id: string): Promise<Order | null>
  save(order: Order): Promise<void>
}

// La infraestructura lo implementa
class PrismaOrderRepository implements OrderRepository {
  async findById(id: string) {
    const row = await prisma.order.findUnique({ where: { id } })
    return row ? Order.fromPersistence(row) : null
  }
  async save(order: Order) {
    await prisma.order.upsert({ where: { id: order.id }, ...order.toPersistence() })
  }
}

// Para tests: una implementación en memoria, mismo contrato
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>()
  async findById(id: string) { return this.orders.get(id) ?? null }
  async save(order: Order) { this.orders.set(order.id, order) }
}
```

**Cuándo SÍ**: vas a tener más de una implementación real (producción +
in-memory para tests), o el acceso a datos tiene lógica no trivial que no
querés repetida en cada lugar que consulta (joins complejos, mapeo entre
el modelo de persistencia y el modelo de dominio).

**Cuándo NO**: es un wrapper de una línea sobre un ORM que ya te da esa
abstracción (`prisma.user.findUnique(...)`). Envolver un ORM ya abstracto
en otra interfaz idéntica es una capa que no protege de nada real - el
ORM en sí ya es el "port".
