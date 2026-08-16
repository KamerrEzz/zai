---
name: zai-practices-architecture-realtime
description: Use ONLY when deciding HOW to push real-time updates to clients - WebSockets vs Server-Sent Events (SSE) vs polling - once you already know you need realtime at all. Do not use for whether realtime work should live in its own service (see zai-practices-architecture-service-boundaries, which covers WHY to separate it) or for choosing a specific pub/sub library (see zai-stack-queues).
---

# Tiempo real: WebSockets, SSE, o polling - y por qué no es solo "el más nuevo"

Las tres opciones no son un ranking de "mejor a peor" - resuelven formas
distintas del mismo problema, y elegir la equivocada paga un costo de
infraestructura que no hacía falta.

## El eje que decide: ¿necesitás que el cliente hable, o solo que escuche?

- **Solo el servidor empuja datos** (notificaciones, progreso de un job,
  un feed que se actualiza solo): **SSE**. Es HTTP normal (un solo
  request de larga duración, `Content-Type: text/event-stream`),
  reconexión automática incluida en el estándar, pasa proxies/balanceadores
  corporativos sin configuración especial porque es HTTP puro. La
  limitación real: es unidireccional (servidor → cliente) y los
  navegadores limitan conexiones HTTP/1.1 concurrentes por dominio
  (6 típico) - con HTTP/2 esto deja de ser un problema.
- **Cliente y servidor necesitan hablar en ambas direcciones con baja
  latencia** (chat, colaboración en tiempo real tipo Google Docs, un
  juego, control remoto): **WebSockets**. Full-duplex real, pero pagás
  más ceremonia: manejar reconexión vos mismo, y en producción con
  múltiples instancias del servidor necesitás sticky sessions o un
  message broker compartido (Redis pub/sub, etc.) para que un mensaje
  llegue a un cliente conectado a otra instancia.
- **La actualización no necesita ser instantánea** (un dashboard que se
  refresca cada 30 segundos, un estado que cambia pocas veces por hora):
  **polling** (o long-polling). Es la opción más simple de operar - sin
  conexiones persistentes que mantener, cachea bien, funciona con
  cualquier infraestructura HTTP existente sin cambios. El costo es
  latencia (nunca es instantáneo) y carga innecesaria si el intervalo es
  muy corto para lo que en realidad cambia poco.

```ts
✗ // WebSocket para un dashboard que muestra un contador que cambia
  // una vez cada 10 minutos - ceremonia de conexión persistente para
  // datos que no lo necesitan
  const ws = new WebSocket("wss://api.example.com/dashboard-count")

✓ // polling cada 60s alcanza y sobra para este caso
  setInterval(() => fetch("/api/dashboard-count").then(updateUI), 60_000)
```

```ts
✗ // SSE para un chat bidireccional - el cliente no puede enviar mensajes
  // por el mismo canal, necesita un POST aparte por cada mensaje que
  // manda, perdiendo la ventaja de tener un solo canal
  const sse = new EventSource("/api/chat-updates")

✓ // WebSocket: un solo canal para ambas direcciones
  const ws = new WebSocket("wss://api.example.com/chat")
  ws.send(JSON.stringify({ type: "message", text: "hola" }))
```

## El costo operacional que ninguna de las tres opciones esconde

Todas las conexiones long-lived (WebSockets y SSE) comparten el mismo
problema de escala: mantener miles de conexiones abiertas simultáneas
consume memoria y file descriptors de forma distinta a servir requests
HTTP cortas - es exactamente la razón operacional por la que este trabajo
suele terminar en su propio proceso/servicio (ver
`zai-practices-architecture-service-boundaries`), no una decisión de
"cuál tecnología es mejor" en el vacío.

Discord, con millones de usuarios conectados simultáneamente, construyó
un gateway WebSocket dedicado separado del resto de su API precisamente
por este perfil de recursos distinto (ver fuentes) - la escala de tu
proyecto probablemente no es esa, pero la razón de fondo (conexiones
persistentes ≠ requests HTTP cortas) es la misma en cualquier escala,
solo que el punto donde duele aparece más tarde.

## Cuando cualquiera de las tres deja de alcanzar

- **Fan-out a muchos clientes del mismo evento** (todos los usuarios de
  una sala de chat reciben el mismo mensaje): con más de una instancia
  del servidor, necesitás un mecanismo para que el mensaje llegue a
  clientes conectados a instancias distintas - un pub/sub (Redis, o lo
  que ya estés usando para colas, ver `zai-stack-queues`) atrás de
  WebSockets/SSE, no algo que WebSockets resuelva solo.
- **El servidor necesita saber si el cliente sigue conectado para tomar
  una decisión de negocio** (marcar a alguien como "en línea"): ninguna
  de las tres lo da gratis - heartbeats/pings explícitos y un timeout de
  "última señal vista" son necesarios en cualquiera de las tres opciones.

## Fuentes

- [WebSocket vs SSE - WebSocket.org](https://websocket.org/comparisons/sse/) - comparación técnica neutral de overhead, límites de conexión, y cuándo la bidireccionalidad justifica WebSockets.
- [WebSockets vs Polling vs SSE: Cost at Scale - Formation](https://formation.dev/blog/websockets-vs-polling-vs-sse) - costos de infraestructura reales a escala (sticky sessions, brokers, memoria de conexiones idle).
- [How Discord Handles Two and Half Million Concurrent Voice Users - Discord Engineering](https://discord.com/blog/how-discord-handles-two-and-half-million-concurrent-voice-users-using-webrtc) - caso real con números concretos de por qué un gateway WebSocket dedicado.
