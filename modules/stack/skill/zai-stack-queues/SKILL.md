---
name: zai-stack-queues
description: "Trigger: jobs en background, cola de mensajes, BullMQ, pg-boss, RabbitMQ. Elige el sistema de colas entre BullMQ, pg-boss o RabbitMQ."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Usar cuando un proyecto necesite un sistema de jobs en background / cola de mensajes y haya que elegir entre BullMQ, pg-boss o RabbitMQ. No usar para trabajo sincrono request/response, ni para trabajo simple fire-and-forget que entra en un setTimeout/cron sin cola real.

## Hard Rules
- Evaluar las reglas en orden de arriba hacia abajo — la primera que matchea gana, no saltar directo al default.
- Nunca sumar pg-boss si ya hay Redis dedicado — seria infraestructura duplicada para el mismo problema.
- Sumar Redis para BullMQ es una decision consciente: comunicasela explicitamente al usuario al aplicar la regla 2 (ej. "esta fase necesita jobs programados, voy a sumar Redis + BullMQ").
- Si el proyecto no encaja claramente en una regla, pregunta al usuario antes de asumir — migrar desde pg-boss despues es una migracion real, no gratis.

## Decision Gates
| Condicion (la primera que matchea gana) | Eleccion |
|---|---|
| Ya hay Redis dedicado en el proyecto (cache u otro uso) | BullMQ |
| El spec pide desde el diseño jobs programados (cron-like), delayed, o con prioridad | BullMQ (+ sumar Redis, avisar al usuario) |
| Hay Postgres, no hay Redis dedicado, y los jobs son simples (fire-and-forget/retry basico) | pg-boss |
| Hay consumidores en mas de un lenguaje, o se necesita routing por topic/exchange | RabbitMQ |
| Ninguna de las anteriores aplica con claridad | pg-boss (default — menos infra nueva) |

## Execution Steps
1. Chequear si ya hay una instancia de Redis dedicada.
2. Revisar el spec de la fase por requisitos de scheduling/prioridad.
3. Chequear presencia de Postgres y complejidad de los jobs.
4. Chequear consumidores multi-lenguaje o necesidad de routing.
5. Aplicar la primera regla que matchea en orden; si ninguna aplica, default a pg-boss.
6. Si se suma Redis, comunicarselo explicitamente al usuario.

## Output Contract
Indicar el sistema de colas elegido, la regla exacta (o el default) que lo disparo, y — si se eligio BullMQ por la regla 2 — confirmar que se le aviso al usuario sobre sumar Redis.
