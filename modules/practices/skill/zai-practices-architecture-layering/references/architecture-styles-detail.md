# Clean Architecture, Screaming Architecture y el costo de la sobre-arquitectura

Detalle adicional de referencia para `zai-practices-architecture-layering`.

## La pregunta que va antes de elegir un estilo

¿Que parte de este sistema es cara de cambiar despues, y que parte es barata? La arquitectura sirve para poner las decisiones caras (el dominio: las reglas de negocio) en el centro, protegidas de las decisiones baratas y volatiles (que framework HTTP, que ORM, que proveedor de email). Si tu proyecto no tiene una parte cara de verdad — es un CRUD que expone una tabla con validaciones simples —, imponerle capas para "estar preparado" es pagar complejidad real por un beneficio hipotetico.

Señal observable para saber si aplica: ¿el dominio tiene reglas de negocio no triviales que sobrevivirian un cambio de framework, de base de datos, o de proveedor externo? Si la respuesta es "no, es basicamente CRUD", ningun estilo de arquitectura se justifica todavia — la sobre-arquitectura en un CRUD es tan real como la falta de arquitectura en un sistema complejo, y suele doler mas rapido (cada feature simple ahora cruza cuatro capas para llegar a la base de datos).

## Hexagonal / Ports & Adapters

El dominio define **puertos** (interfaces: `UserRepository`, `PaymentGateway`) sin saber nada de su implementacion. La infraestructura (Postgres, Stripe, SMTP) los implementa como **adapters**, afuera, y se inyecta hacia adentro.

Cuando amerita: necesitas poder cambiar o mockear infraestructura sin tocar reglas de negocio (tests unitarios rapidos del dominio sin DB real, o un proveedor externo que sabes que vas a migrar).

## Clean Architecture

Generaliza hexagonal a mas capas concentricas (entities, use cases, interface adapters, frameworks). Mismo principio de direccion de dependencias, mas capas explicitas para separar "reglas de negocio puras" (entities) de "orquestacion de un caso de uso especifico" (use cases/interactors).

Cuando amerita: sistemas grandes con multiples casos de uso que recombinan las mismas entidades de formas distintas, donde vale la pena nombrar esa capa de orquestacion aparte. Para un servicio chico, Clean Architecture completa suele ser mas capas de las que el dominio real necesita — hexagonal simple alcanza.

## Screaming Architecture

La estructura de carpetas de nivel superior tiene que gritar de que se trata el sistema (`orders/`, `billing/`, `shipping/`), no que framework usa (`controllers/`, `services/`, `models/` como primer nivel). Alguien que abre el repo por primera vez tiene que poder inferir el dominio del negocio mirando la raiz, no adivinar que hace la app leyendo nombres de framework.

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

Esto es ortogonal a hexagonal/clean — podes (y en general conviene) combinarlas: screaming a nivel de organizacion por dominio, hexagonal/clean dentro de cada modulo de dominio. El layout literal de carpetas para cada combinacion vive en `zai-practices-project-structure`.

## La sobre-arquitectura es un riesgo real, no una virtud por defecto

Cada capa que agregas tiene costo permanente: mas archivos para el mismo cambio, mas indireccion para seguir un flujo, mas ceremonia para alguien nuevo. Ese costo se paga en cada feature, para siempre, mientras que el beneficio (poder cambiar infraestructura sin tocar dominio) solo se cobra el dia que de verdad cambias esa infraestructura — que para muchos proyectos nunca llega. Arquitectura elegida "porque es lo correcto" sin mirar si el proyecto tiene la complejidad que la justifica es la misma clase de error que no tener ninguna estructura: los dos ignoran las señales reales del proyecto a favor de un default.

## Fuentes

- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/) — el writeup original de 2005 que acuño "Ports and Adapters".
- [node-typescript-architecture - jbreckmckye](https://github.com/jbreckmckye/node-typescript-architecture) — ejemplo real (aunque no de gran escala) de un repo Node/TS con split domain/infrastructure visible.
