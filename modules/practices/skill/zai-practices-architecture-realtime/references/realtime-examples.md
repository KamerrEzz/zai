# Ejemplos: eligiendo el mecanismo correcto

Ejemplos de referencia para `zai-practices-architecture-realtime`.

```ts
✗ // WebSocket para un dashboard que muestra un contador que cambia
  // una vez cada 10 minutos - ceremonia de conexion persistente para
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

## Cuando cualquiera de las tres deja de alcanzar

- **Fan-out a muchos clientes del mismo evento** (todos los usuarios de una sala de chat reciben el mismo mensaje): con mas de una instancia del servidor, necesitas un mecanismo para que el mensaje llegue a clientes conectados a instancias distintas — un pub/sub (Redis, o lo que ya estes usando para colas, ver `zai-stack-queues`) atras de WebSockets/SSE, no algo que WebSockets resuelva solo.
- **El servidor necesita saber si el cliente sigue conectado** para tomar una decision de negocio (marcar a alguien como "en linea"): ninguna de las tres lo da gratis — heartbeats/pings explicitos y un timeout de "ultima señal vista" son necesarios en cualquiera de las tres opciones.
