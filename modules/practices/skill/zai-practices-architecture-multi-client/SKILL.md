---
name: zai-practices-architecture-multi-client
description: "Trigger: BFF, backend for frontend, multi-cliente, api-web, api-mobile. Decide entre una API generica y un BFF por cliente."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when the same backend serves more than one client app (e.g. a web app and a React Native app) and you must decide between one generic API or a BFF per client. Do not use for internal layering inside the backend (`zai-practices-architecture-layering`) or for whether to separate that backend into its own deployable service (`zai-practices-architecture-service-boundaries`).

## Hard Rules
- El backend no le pertenece a ningun cliente: ningun frontend escribe logica de negocio directamente (nada de mutar la DB desde Server Actions de Next.js si otro cliente necesita esa misma mutacion).
- Un BFF es una capa de agregacion/formato, no un segundo backend; si toma decisiones de negocio (precios, validaciones), esa logica se esta duplicando respecto al dominio compartido.
- No arranques con BFFs separados "por si acaso" — es el mismo error que separar microservicios sin razon operacional concreta.
- El contrato compartido entre clientes vive en un solo lugar (`packages/shared-types`, ver `zai-practices-project-structure`) y se testea como tal (`zai-practices-testing`).

## Decision Gates
| Situacion | Accion |
|---|---|
| Un solo consumidor (solo web) | Server Actions alcanza; no separar backend todavia |
| 2+ consumidores tipados (web + mobile) | Backend propio (tRPC o REST explicito, ver `zai-stack-api-layer` / `zai-stack-backend-framework`) |
| Necesidades de forma/agregacion no divergen mucho | Una API generica con query params / seleccion de campos |
| API generica llena de flags (`?mobile=true`) o campos no usados por un cliente | BFF por cliente (`api-web/`, `api-mobile/`) |

## Execution Steps
1. Confirmar cuantos clientes tipados consumen el mismo backend.
2. Si es uno solo, evitar separar backend o crear un BFF todavia.
3. Si son 2+, revisar si la API generica ya acumula flags o payloads que un cliente no usa.
4. Si diverge de verdad, diseñar un BFF fino por cliente que solo agrega/formatea, llamando a los mismos servicios de dominio compartidos.
5. Ver `references/bff-example.md` para el ejemplo de dos BFFs sobre el mismo dominio.

## Output Contract
Indicar si corresponde API unica o BFF por cliente, con la señal concreta (numero de consumidores, divergencia de payload, flags) que lo justifica, y marcar si el BFF propuesto esta agregando logica de negocio (anti-patron a corregir).

## References
- `references/bff-example.md` — dos implementaciones BFF (`api-web`/`api-mobile`) llamando al mismo dominio compartido.
- `references/multi-client-sources.md` — relacion con `zai-stack-api-layer` y fuentes (BFF pattern, caso SoundCloud).
