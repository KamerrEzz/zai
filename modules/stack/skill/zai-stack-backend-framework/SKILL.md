---
name: zai-stack-backend-framework
description: "Trigger: Express vs NestJS, backend standalone, framework de API. Decide si un nuevo backend standalone debe construirse con Express o NestJS."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Usar cuando haya que decidir si un nuevo servicio backend standalone / capa de API debe construirse con Express o NestJS. No usar para route handlers o Server Actions de Next.js dentro de la propia app (ver `zai-stack-api-layer`) — eso no es una decision de "backend framework".

## Hard Rules
- Default: Express. Solo cambiar a NestJS si se cumple una condicion observable de Decision Gates.
- Nunca elegir NestJS "por las dudas" o por familiaridad — debe justificarse con una condicion concreta.
- Si el proyecto no encaja claramente en una rama, preguntale al usuario en vez de asumir.

## Decision Gates
| Condicion | Framework |
|---|---|
| No hace falta backend standalone (Next.js habla solo con si mismo) | N/A — usar `zai-stack-api-layer` |
| Vas a trabajar este backend con mas de una persona | NestJS |
| ~8-10+ recursos/dominios distintos (controllers/modulos) planeados o existentes | NestJS |
| El usuario lo pide explicitamente para este proyecto | NestJS |
| Ninguna de las anteriores | Express |

## Execution Steps
1. Confirmar que realmente hace falta un backend standalone (no que Next.js se sirva a si mismo).
2. Revisar cada condicion de Decision Gates contra el proyecto/spec.
3. Si alguna condicion aplica, elegir NestJS; si no, default a Express.
4. Si el proyecto no encaja claramente en ninguna rama, preguntarle al usuario antes de decidir.

## Output Contract
Indicar el framework elegido (Express o NestJS) y que condicion (o el default) motivo la eleccion.
