---
name: zai-practices-architecture-service-boundaries
description: Use ONLY when deciding whether something should be split out of the monolith into its own service or worker - reminders/scheduled notifications, mass email, realtime, or any feature that "feels big enough". Do not use for internal layering of a single service (see zai-practices-architecture-layering) or for serving multiple client apps (see zai-practices-architecture-multi-client).
---

# Monolito vs microservicios: la señal no es el tamaño, es el ciclo de vida

Separar algo en su propio servicio se justifica cuando ese algo tiene un
**ciclo de vida distinto** al resto de la app - escala distinto, se
despliega distinto, o falla de forma que no debería tirar abajo lo demás.
No se justifica solo porque "así se hace en sistemas grandes" - un
microservicio mal justificado agrega red, serialización, y un despliegue
extra a mantener, a cambio de nada.

## Empezá con el monolito, no al revés

Salvo que ya tengas evidencia operacional concreta de que algo necesita
separarse (ver los casos de abajo), arrancar con un monolito modularizado
internamente (screaming architecture, ver `zai-practices-architecture-layering`)
es la opción por defecto correcta - separar después, cuando la señal
aparece de verdad, es más barato que pagar el costo de red/deploy/
consistencia desde el día uno sin necesitarlo todavía.

## Casos concretos, con el criterio aplicado

- **Recordatorios / notificaciones programadas**: candidato real a
  servicio (o, más barato, a un worker dentro del mismo monorepo pero
  proceso separado) apenas necesitás *scheduling* - algo tiene que
  disparar en un momento futuro sin que un usuario esté haciendo una
  request en ese instante. Esto es precisamente el terreno de
  `zai-stack-queues` (BullMQ/pg-boss) - el "servicio" en la práctica
  suele ser: la API encola el job, un worker separado (mismo repo,
  proceso distinto) lo procesa. No hace falta que sea un repo/deploy
  separado desde el día uno. El patrón de encolado en sí (single-event
  vs alto volumen) vive en `zai-practices-patterns-notifications`.
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
  dominio de datos que la API principal. El criterio de qué tecnología
  usar para esas conexiones (WebSockets vs SSE vs polling) vive en
  `zai-practices-architecture-realtime`.

Lo que las tres tienen en común: ninguna se justifica por "es una buena
práctica separar servicios" en abstracto - se justifica porque cada una
tiene una razón operacional concreta (scheduling, rate limiting externo,
perfil de conexión distinto) que el monolito no resuelve bien. Si no
identificás esa razón concreta para tu caso, es una feature más dentro
del monolito, no un servicio nuevo.

## El costo que se paga al separar, y que hay que aceptar conscientemente

En cuanto una operación de negocio necesita tocar más de un servicio (un
pedido que reserva stock en un servicio Y cobra en otro), perdés la
transacción de base de datos que te daba consistencia gratis en el
monolito - necesitás un patrón explícito para eso (Saga, ver
`zai-practices-patterns-distributed-data`). Si tu operación principal
cruza servicios todo el tiempo, es una señal de que la línea de
separación está mal trazada - las cosas que cambian juntas deberían vivir
juntas.

Esto no es teórico: Segment (Twilio) publicó públicamente que fusionó de
vuelta más de 140 microservicios en un monolito porque la coordinación
entre servicios que cambiaban juntos costaba más que el beneficio de
tenerlos separados (ver fuentes). El caso inverso también es real -
Shopify separó selectivamente el renderizado del storefront de su
monolito principal, pero solo cuando la señal operacional (necesidad de
escalar lectura de forma independiente) fue concreta, no preventiva.

## Fuentes

- [MonolithFirst - Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html) - por qué empezar con el monolito casi siempre es la decisión correcta.
- [Under Deconstruction: The State of Shopify's Monolith - Shopify Engineering](https://shopify.engineering/shopify-monolith) - separación selectiva real, con la señal operacional concreta que la disparó.
- [Goodbye Microservices - Segment (Twilio)](https://segment.com/blog/goodbye-microservices/) - la señal inversa: cuándo NO separar, con un caso real de haber vuelto atrás.
