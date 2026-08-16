---
name: zai-stack-queues
description: Use ONLY when a project needs a background job / message queue system and must choose between BullMQ, pg-boss, or RabbitMQ. Do not use for synchronous request/response work, or for simple fire-and-forget work that fits in a setTimeout/cron without a real queue.
---

# BullMQ vs pg-boss vs RabbitMQ

## Arbol de decision

Reglas en orden - la primera que matchea gana:

1. **Ya hay Redis dedicado en el proyecto** (para cache u otro uso, no solo
   para esta cola) -> **BullMQ**. No sumes pg-boss si Redis ya esta ahi -
   seria infraestructura duplicada para el mismo problema.

2. **El spec de la fase ya pide, desde el diseño, jobs programados
   (cron-like), delayed, o con prioridad** -> **BullMQ**, aunque todavia no
   haya Redis en el proyecto. Justificacion: pg-boss puede hacer delayed
   jobs basicos, pero prioridad y scheduling recurrente son notablemente
   mas solidos en BullMQ - no vale la pena pelear contra la herramienta
   equivocada desde el arranque cuando ya se sabe que se va a necesitar
   eso. Esto significa sumar Redis al proyecto - es una decision consciente,
   no una que se tome en silencio: decíselo al usuario explicitamente
   cuando la apliques ("esta fase necesita jobs programados, voy a sumar
   Redis + BullMQ").

3. **Hay Postgres, no hay Redis dedicado, y los jobs son simples**
   (fire-and-forget o retry basico, sin scheduling recurrente ni
   prioridad) -> **pg-boss**. Menos infraestructura para correr.

4. **Hay consumidores en mas de un lenguaje, o se necesita routing por
   topic/exchange** -> **RabbitMQ**. Ni BullMQ ni pg-boss estan pensados
   para multi-lenguaje o topologias de routing complejas.

## Default si ninguna condicion aplica con claridad

**pg-boss** - es la opcion de menos infraestructura nueva dado que Postgres
ya es parte fija del stack. Sumar Redis (para BullMQ) o RabbitMQ es una
decision que hay que poder justificar con una de las condiciones de
arriba, no un default.

## Si el proyecto no encaja claramente

Pregúntale al usuario antes de asumir, en particular si no es claro si los
jobs van a necesitar scheduling/prioridad mas adelante - agregar Redis
despues de arrancar con pg-boss es una migracion real, no un cambio
gratis.
