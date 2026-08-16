---
name: zai-stack-api-layer
description: "Trigger: tRPC, Server Actions, Zod, API de Next.js App Router. Decide como una app Next.js expone su backend a su propio frontend."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Usar cuando haya que decidir como una app Next.js App Router debe exponer su logica de backend a su propio frontend: tRPC vs Server Actions + Zod. No usar para un servicio backend standalone (Express/NestJS, ver `zai-stack-backend-framework`) que expone una API a consumidores externos.

## Hard Rules
- Default: Server Actions + Zod. Solo cambiar a tRPC cuando exista, o este confirmado, un segundo consumidor tipado.
- Nunca adoptar tRPC como preferencia arquitectonica sola — debe justificarse con un segundo consumidor real.
- Si una futura app movil/integracion solo se menciona pero no esta confirmada, preguntale al usuario si conviene pagar la capa de tRPC ahora o migrar despues.

## Decision Gates
| Condicion | Eleccion |
|---|---|
| El unico consumidor es la propia app Next.js (sin app movil/integracion externa planeada) | Server Actions + Zod |
| Existe, o esta confirmado, otro consumidor tipado (app movil, otra SPA, integracion externa) | tRPC |

## Execution Steps
1. Chequear si hay algun consumidor ademas de la propia app Next.js que necesite acceso tipado a esta logica de backend.
2. Si no hay ninguno, default a Server Actions + Zod.
3. Si existe o esta confirmado un segundo consumidor real, elegir tRPC.
4. Si el segundo consumidor es solo especulativo, preguntar al usuario antes de comprometerse con tRPC.

## Output Contract
Indicar el enfoque elegido (Server Actions + Zod o tRPC) y la evidencia de consumidor que lo justifico.
