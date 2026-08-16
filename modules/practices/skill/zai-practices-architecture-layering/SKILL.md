---
name: zai-practices-architecture-layering
description: Use ONLY when deciding how to structure the internal layers of a single service - Hexagonal/Ports & Adapters, Clean Architecture, or Screaming Architecture, and whether any of them is worth the cost yet. Do not use for splitting a system into multiple services (see zai-practices-architecture-service-boundaries), for serving multiple client apps from one backend (see zai-practices-architecture-multi-client), or for picking a design pattern inside a layer (see zai-practices-patterns-structural).
---

# Capas dentro de un servicio: Hexagonal, Clean, Screaming - y cuando ninguna amerita

## La pregunta que va antes de elegir un estilo

**¿Que parte de este sistema es cara de cambiar despues, y que parte es
barata?** La arquitectura sirve para poner las decisiones caras (el
dominio: las reglas de negocio) en el centro, protegidas de las decisiones
baratas y volatiles (que framework HTTP, que ORM, que proveedor de email).
Si tu proyecto no tiene una parte cara de verdad - es un CRUD que expone
una tabla con validaciones simples -, imponerle capas para "estar
preparado" es pagar complejidad real por un beneficio hipotetico.

Señal observable para saber si aplica: ¿el dominio tiene reglas de negocio
no triviales que sobrevivirian un cambio de framework, de base de datos, o
de proveedor externo? Si la respuesta es "no, es basicamente CRUD", ningun
estilo de arquitectura de los de abajo se justifica todavia - la
sobre-arquitectura en un CRUD es tan real como la falta de arquitectura en
un sistema complejo, y suele doler mas rapido (cada feature simple ahora
cruza cuatro capas para llegar a la base de datos).

## Hexagonal / Ports & Adapters

El dominio define **puertos** (interfaces: `UserRepository`,
`PaymentGateway`) sin saber nada de su implementacion. La infraestructura
(Postgres, Stripe, SMTP) los implementa como **adapters**, afuera, y se
inyecta hacia adentro.

La regla que no se negocia: **la direccion de las dependencias siempre
apunta hacia el dominio, nunca al reves.** El dominio no importa nada de
`infrastructure/`; `infrastructure/` importa del dominio. Si ves un
`import` desde el dominio hacia un driver de base de datos especifico, la
hexagonal ya se rompio, aunque las carpetas se sigan llamando `domain/` e
`infrastructure/`.

Cuando amerita: necesitas poder cambiar o mockear infraestructura sin
tocar reglas de negocio (tests unitarios rapidos del dominio sin DB real,
o un proveedor externo que sabes que vas a migrar).

### Ejemplo: un CRUD que crece hasta que hexagonal se justifica

**Fase 1 - CRUD simple, sin hexagonal, y está bien así:**

```ts
// route handler habla directo con Prisma - cero indireccion, cero costo
app.post("/orders", async (req, res) => {
  const order = await prisma.order.create({ data: req.body })
  res.json(order)
})
```

Con validaciones simples y sin reglas de negocio reales, esto es
correcto - agregar un puerto/adapter acá es la sobre-arquitectura que la
seccion de arriba advierte.

**Fase 2 - aparece una regla de negocio real** ("un pedido no se puede
confirmar si el usuario tiene una deuda pendiente de más de 30 días", y
esa regla se evalúa desde tres lugares distintos: al confirmar, al
generar un reporte, y en un job nocturno). Ahora hay lógica que se
repetiría en cada lugar si sigue viviendo pegada a Prisma - **este es el
momento** de introducir el puerto:

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

La señal de que llegó el momento no fue "el proyecto creció" en
abstracto - fue que **la misma regla de negocio se necesitaba en más de
un lugar**, y sin el puerto se hubiera duplicado o quedado acoplada a
Prisma en los tres.

## Clean Architecture

Generaliza hexagonal a mas capas concentricas (entities, use cases,
interface adapters, frameworks). Mismo principio de direccion de
dependencias, mas capas explicitas para separar "reglas de negocio
puras" (entities) de "orquestacion de un caso de uso especifico"
(use cases/interactors).

Cuando amerita: sistemas grandes con multiples casos de uso que
recombinan las mismas entidades de formas distintas, donde vale la pena
nombrar esa capa de orquestacion aparte. Para un servicio chico, Clean
Architecture completa suele ser mas capas de las que el dominio real
necesita - hexagonal simple alcanza.

## Screaming Architecture

La estructura de carpetas de nivel superior tiene que gritar **de que se
trata el sistema** (`orders/`, `billing/`, `shipping/`), no **que
framework usa** (`controllers/`, `services/`, `models/` como primer
nivel). Alguien que abre el repo por primera vez tiene que poder inferir
el dominio del negocio mirando la raiz, no adivinar que hace la app
leyendo nombres de framework.

```
✗ src/
    controllers/
    services/
    models/
    routes/

✓ src/
    orders/
      domain/
      infrastructure/
    billing/
      domain/
      infrastructure/
    shipping/
      domain/
      infrastructure/
```

Esto es ortogonal a hexagonal/clean - podes (y en general conviene)
combinarlas: screaming a nivel de organizacion por dominio, hexagonal/clean
dentro de cada modulo de dominio. El layout literal de carpetas para cada
combinación vive en `zai-practices-project-structure`.

## La sobre-arquitectura es un riesgo real, no una virtud por defecto

Cada capa que agregas tiene costo permanente: mas archivos para el mismo
cambio, mas indireccion para seguir un flujo, mas ceremonia para alguien
nuevo. Ese costo se paga en **cada** feature, para siempre, mientras que
el beneficio (poder cambiar infraestructura sin tocar dominio) solo se
cobra el dia que de verdad cambias esa infraestructura - que para muchos
proyectos nunca llega. Arquitectura elegida "porque es lo correcto" sin
mirar si el proyecto tiene la complejidad que la justifica es la misma
clase de error que no tener ninguna estructura: los dos ignoran las
señales reales del proyecto a favor de un default.

## Fuentes

- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/) - el writeup original de 2005 que acuñó "Ports and Adapters".
- [node-typescript-architecture - jbreckmckye](https://github.com/jbreckmckye/node-typescript-architecture) - ejemplo real (aunque no de gran escala) de un repo Node/TS con split domain/infrastructure visible.
