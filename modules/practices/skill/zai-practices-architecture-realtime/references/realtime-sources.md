# Costo operacional y fuentes

Referencia de apoyo para `zai-practices-architecture-realtime`.

## El costo operacional que ninguna de las tres opciones esconde

Todas las conexiones long-lived (WebSockets y SSE) comparten el mismo problema de escala: mantener miles de conexiones abiertas simultaneas consume memoria y file descriptors de forma distinta a servir requests HTTP cortas — es exactamente la razon operacional por la que este trabajo suele terminar en su propio proceso/servicio (ver `zai-practices-architecture-service-boundaries`), no una decision de "cual tecnologia es mejor" en el vacio.

Discord, con millones de usuarios conectados simultaneamente, construyo un gateway WebSocket dedicado separado del resto de su API precisamente por este perfil de recursos distinto — la escala de tu proyecto probablemente no es esa, pero la razon de fondo (conexiones persistentes ≠ requests HTTP cortas) es la misma en cualquier escala, solo que el punto donde duele aparece mas tarde.

## Fuentes

- [WebSocket vs SSE - WebSocket.org](https://websocket.org/comparisons/sse/) — comparacion tecnica neutral de overhead, limites de conexion, y cuando la bidireccionalidad justifica WebSockets.
- [WebSockets vs Polling vs SSE: Cost at Scale - Formation](https://formation.dev/blog/websockets-vs-polling-vs-sse) — costos de infraestructura reales a escala (sticky sessions, brokers, memoria de conexiones idle).
- [How Discord Handles Two and Half Million Concurrent Voice Users - Discord Engineering](https://discord.com/blog/how-discord-handles-two-and-half-million-concurrent-voice-users-using-webrtc) — caso real con numeros concretos de por que un gateway WebSocket dedicado.
