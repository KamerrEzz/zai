---
name: zai-practices-architecture-frontend-composition
description: "Trigger: micro-frontends, microfrontends, fragmentos de UI independientes. Decide si conviene splitear el frontend en fragmentos deployados aparte."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when considering micro-frontends — splitting a UI into independently deployable fragments owned by different teams. Do not use for splitting backend services (`zai-practices-architecture-service-boundaries`) or for folder organization within a single frontend app (`zai-practices-project-structure`).

## Hard Rules
- Micro-frontends resuelven un problema organizacional (equipos independientes, cadencias de release distintas), no un problema tecnico; no los uses sin ese problema real.
- Con un equipo unico o chico, coordinar tu propio release con vos mismo no tiene costo — no hay problema que resolver.
- La duplicacion de dependencias, el estado compartido entre apps independientes, y el testing E2E cross-fragmento son costos reales y se pagan igual, exista o no el beneficio organizacional.

## Decision Gates
| Situacion | Accion |
|---|---|
| Equipo unico o chico | No usar micro-frontends; monolito de frontend modularizado por dominio (`zai-practices-project-structure`) |
| 2+ equipos independientes deployando la misma superficie de UI en cadencias distintas | Candidato real a micro-frontends |
| Un solo deploy de frontend, sin necesidad real de coordinacion entre equipos | Monolito de frontend, mismo beneficio de organizacion sin costo de runtime |

## Execution Steps
1. Confirmar si existen 2+ equipos independientes que necesitan deployar partes de la misma UI sin coordinarse entre si.
2. Si no existen, recomendar modularizacion interna (carpetas por dominio) en vez de micro-frontends.
3. Si existen, señalar explicitamente los tres costos que el equipo va a pagar: duplicacion de dependencias (cada fragmento trae su propio framework), estado compartido cross-deploy (eventos custom, bus, store global), y testing end-to-end que ahora cruza limites de deploy independientes.

## Output Contract
Indicar si micro-frontends esta justificado (con la señal organizacional concreta de 2+ equipos independientes) o si conviene un monolito de frontend modularizado, listando los costos de runtime aplicables cuando se recomiende micro-frontends.
