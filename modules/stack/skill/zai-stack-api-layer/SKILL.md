---
name: zai-stack-api-layer
description: Use ONLY when deciding how a Next.js App Router app should expose its backend logic to its own frontend - tRPC vs Server Actions + Zod. Do not use for a standalone backend service (Express/NestJS) exposing a REST/RPC API to external consumers - that's a different decision, not covered here.
---

# tRPC vs Server Actions + Zod

## Arbol de decision

- **El unico consumidor de esta logica es el propio Next.js app** (no hay,
  ni se planea, una app movil u otra integracion externa consumiendo el
  mismo backend de forma tipada) -> **Server Actions + Zod**. Es menos
  capas, se integra nativo con formularios y progressive enhancement, y no
  agrega una abstraccion que nadie mas que ese mismo Next.js va a usar.

- **Hay, o se sabe que va a haber, mas de un consumidor tipado del mismo
  backend** (app movil, otra SPA, integraciones externas que consumen la
  API con el mismo nivel de type-safety) -> **tRPC**.

## Default

**Server Actions + Zod.** Es el caso real la enorme mayoria de las veces -
un Next.js hablando solo con su propio backend. tRPC es la excepcion
justificada por un segundo consumidor real, no una preferencia de
arquitectura por si sola.

## Si el proyecto no encaja claramente

Si el spec de la fase menciona una futura app movil o integracion externa
pero todavia no existe, pregúntale al usuario si vale la pena pagar la
capa de tRPC desde ahora o si conviene arrancar con Server Actions y migrar
cuando el segundo consumidor sea real - no lo decidas por tu cuenta,
migrar mas adelante tiene costo real de reescritura.
