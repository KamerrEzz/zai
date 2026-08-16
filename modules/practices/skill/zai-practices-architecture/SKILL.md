---
name: zai-practices-architecture
description: Use ONLY when deciding how to organize a project's high-level structure - layering, dependency direction, monolith vs microservices, multi-client backends (web + mobile), or micro-frontends. Do not use for picking a specific design pattern inside a layer (see zai-practices-patterns), for literal folder layouts (see zai-practices-project-structure), or for choosing a library (see the zai-stack-* skills).
---

# Arquitectura: Hexagonal, Clean, Screaming - y cuando ninguna amerita

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
dentro de cada modulo de dominio.

## Backend multi-cliente: una API, varios frontends

Si el mismo backend va a servir una web (Next.js) **y** una app (React
Native), el backend no le pertenece a ninguno de los dos clientes - vive
como su propio servicio, con su propio ciclo de deploy, y ninguno de los
frontends le agrega lógica de negocio directamente (nada de escribir a la
base de datos desde Server Actions de Next.js si React Native también
necesita ese mismo dato/mutación - eso duplica la regla de negocio en dos
lugares que se van a desincronizar).

Esto es exactamente la condición que dispara `zai-stack-api-layer`
(tRPC vs Server Actions + Zod): con **un solo consumidor** (solo la web),
Server Actions alcanza y separar el backend es prematuro. En el momento
que React Native (o cualquier segundo cliente) entra en escena, ya hay
más de un consumidor tipado del mismo backend - ahí es cuando tRPC (o un
backend HTTP/REST explícito con Express/NestJS, ver `zai-stack-backend-framework`)
deja de ser una capa de más y pasa a ser la forma de no duplicar lógica.

### BFF (Backend For Frontend): cuándo un solo backend no alcanza

Con web + mobile compartiendo una API, hay dos formas de resolver que
cada cliente necesita datos con forma distinta (la web quiere un payload
grande con todo precargado para un dashboard; mobile quiere respuestas
chicas para no gastar datos móviles):

- **Una sola API genérica**, y cada cliente pide/filtra lo que necesita
  (query params, un endpoint GraphQL con selección de campos). Es lo más
  simple - úsalo mientras las necesidades de web y mobile no diverjan
  demasiado.
- **Un BFF por cliente** (`api-web/`, `api-mobile/`) - cada uno es una
  capa fina que llama a los mismos servicios de dominio pero arma la
  respuesta a la medida de su cliente. Se justifica cuando las
  necesidades de forma/agregación divergen tanto que la API genérica
  termina llena de flags (`?mobile=true`) o de campos que un cliente
  nunca usa - el BFF absorbe esa divergencia sin ensuciar el dominio
  compartido.

No arranques con BFFs separados "por si acaso" - es exactamente el mismo
error que separar microservicios sin la razón operacional concreta (ver
abajo). Empezá con una API, migrá a BFF cuando la divergencia sea real y
te esté doliendo.

## Monolito vs microservicios: la señal no es el tamaño, es el ciclo de vida

Separar algo en su propio servicio se justifica cuando ese algo tiene un
**ciclo de vida distinto** al resto de la app - escala distinto, se
despliega distinto, o falla de forma que no debería tirar abajo lo demás.
No se justifica solo porque "así se hace en sistemas grandes" - un
microservicio mal justificado agrega red, serialización, y un despliegue
extra a mantener, a cambio de nada.

Casos concretos, con el criterio aplicado:

- **Recordatorios / notificaciones programadas**: candidato real a
  servicio (o, más barato, a un worker dentro del mismo monorepo pero
  proceso separado) apenas necesitás *scheduling* - algo tiene que
  disparar en un momento futuro sin que un usuario esté haciendo una
  request en ese instante. Esto es precisamente el terreno de
  `zai-stack-queues` (BullMQ/pg-boss) - el "servicio" en la práctica
  suele ser: la API encola el job, un worker separado (mismo repo,
  proceso distinto) lo procesa. No hace falta que sea un repo/deploy
  separado desde el día uno.
- **Envío masivo de correos**: mismo patrón - encolar, no enviar sincrónico
  dentro del request que lo dispara (un envío masivo síncrono bloquea la
  respuesta y no tiene forma sana de reintentar fallos parciales). El
  candidato a separar en su propio servicio aparece cuando el volumen es
  alto y consistente (no un caso ocasional) y necesita su propio control
  de rate limiting/backoff frente al proveedor de email, independiente
  del resto de la app.
- **Tiempo real (websockets/SSE/pub-sub)**: conexiones long-lived tienen
  un perfil de recursos distinto al resto de una API HTTP request/response
  (mantener miles de conexiones abiertas escala distinto a servir
  requests cortas) - eso sí es una razón real de ciclo de vida distinto
  para separarlo en su propio proceso/servicio, aunque comparta el mismo
  dominio de datos que la API principal.

Lo que las tres tienen en común: ninguna se justifica por "es una buena
práctica separar servicios" en abstracto - se justifica porque cada una
tiene una razón operacional concreta (scheduling, rate limiting externo,
perfil de conexión distinto) que el monolito no resuelve bien. Si no
identificás esa razón concreta para tu caso, es una feature más dentro
del monolito, no un servicio nuevo.

**El costo que se paga al separar, y que hay que aceptar conscientemente**:
en cuanto una operación de negocio necesita tocar más de un servicio (un
pedido que reserva stock en un servicio Y cobra en otro), perdés la
transacción de base de datos que te daba consistencia gratis en el
monolito - necesitás un patrón explícito para eso (Saga, ver
`zai-practices-patterns`). Si tu operación principal cruza servicios todo
el tiempo, es una señal de que la línea de separación está mal trazada -
las cosas que cambian juntas deberían vivir juntas.

## Micro-frontends: casi nunca, para un equipo chico o solo

Micro-frontends resuelven un problema organizacional (equipos distintos,
con ciclos de release distintos, deployando partes independientes de la
misma UI sin coordinarse entre sí) - no un problema técnico. Si sos un
equipo chico o trabajás solo, ese problema no existe: coordinar tu propio
release con vos mismo no tiene costo. El costo de micro-frontends
(orquestación en runtime, duplicación de dependencias entre fragmentos,
complejidad de estado compartido entre apps independientes) es real y se
paga igual, exista o no el problema organizacional que lo justifica.

Señal real para considerarlo: más de un equipo *independiente*
desplegando partes de la misma superficie de UI en cadencias distintas.
Fuera de eso, un monolito de frontend bien modularizado internamente
(carpetas por dominio, ver `zai-practices-project-structure`) da el mismo
beneficio de organización sin el costo de runtime.

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
