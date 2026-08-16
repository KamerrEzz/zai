---
name: zai-practices-architecture-realtime
description: "Trigger: websockets, SSE, server-sent events, polling, tiempo real. Decide que mecanismo usar para push de datos en tiempo real."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when deciding HOW to push real-time updates to clients — WebSockets vs Server-Sent Events (SSE) vs polling — once realtime is already needed. Do not use for whether realtime work should live in its own service (`zai-practices-architecture-service-boundaries`, covers WHY to separate it) or for choosing a specific pub/sub library (`zai-stack-queues`).

## Hard Rules
- Elegi segun si el cliente necesita hablar (bidireccional) o solo escuchar (unidireccional), nunca por "cual es mas nuevo".
- Solo el servidor empuja datos → SSE (HTTP puro, reconexion automatica en el estandar, pasa proxies sin configuracion especial).
- Cliente y servidor hablan en ambas direcciones con baja latencia → WebSockets (full-duplex, pero manejar reconexion y sticky sessions/broker compartido vos mismo en multi-instancia).
- La actualizacion tolera demora → polling/long-polling (mas simple de operar, sin conexiones persistentes).
- Fan-out del mismo evento a clientes conectados a distintas instancias siempre necesita un pub/sub (Redis u otro) detras de WebSockets/SSE — ninguna de las tres lo resuelve sola.

## Decision Gates
| Necesidad | Mecanismo |
|---|---|
| Servidor empuja, cliente no responde por el mismo canal | SSE |
| Ambas direcciones, baja latencia (chat, colaboracion, juego) | WebSockets |
| Actualizacion tolera demora (dashboard cada 30-60s) | Polling / long-polling |
| Multiples instancias del servidor + mismo evento a muchos clientes | Pub/sub (Redis) detras de WS/SSE |
| Necesitas saber si el cliente sigue conectado | Heartbeat/ping + timeout explicito — ninguna opcion lo da gratis |

## Execution Steps
1. Determinar si el cliente necesita enviar datos por el mismo canal (bidireccional) o solo recibir (unidireccional).
2. Si es unidireccional y tolera algo de latencia, evaluar polling primero.
3. Si es unidireccional y necesita push inmediato, usar SSE.
4. Si es bidireccional con baja latencia, usar WebSockets y planear reconexion + sticky sessions/broker para multi-instancia.
5. Si hay fan-out a muchos clientes, agregar pub/sub explicito; no asumir que WebSockets lo resuelve solo.
6. Recordar que conexiones long-lived probablemente pertenecen a su propio proceso/servicio (`zai-practices-architecture-service-boundaries`), no a esta decision.

## Output Contract
Indicar el mecanismo recomendado (SSE/WebSockets/polling) con la razon basada en direccionalidad y latencia tolerada, y señalar si hace falta pub/sub para fan-out o si el trabajo deberia vivir en su propio proceso.

## References
- `references/realtime-examples.md` — ejemplos de codigo (mal/bien) polling vs WebSocket y SSE vs WebSocket.
- `references/realtime-sources.md` — caso Discord (gateway WebSocket dedicado) y fuentes.
