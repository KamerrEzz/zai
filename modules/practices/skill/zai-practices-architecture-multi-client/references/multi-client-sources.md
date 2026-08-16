# Contexto adicional y fuentes

Referencia de apoyo para `zai-practices-architecture-multi-client`.

## Relacion con zai-stack-api-layer

Si el mismo backend va a servir una web (Next.js) y una app (React Native), el backend no le pertenece a ninguno de los dos clientes — vive como su propio servicio, con su propio ciclo de deploy, y ninguno de los frontends le agrega logica de negocio directamente.

Esto es exactamente la condicion que dispara `zai-stack-api-layer` (tRPC vs Server Actions + Zod): con un solo consumidor (solo la web), Server Actions alcanza y separar el backend es prematuro. En el momento en que React Native (o cualquier segundo cliente) entra en escena, ya hay mas de un consumidor tipado del mismo backend — ahi es cuando tRPC (o un backend HTTP/REST explicito con Express/NestJS, ver `zai-stack-backend-framework`) deja de ser una capa de mas y pasa a ser la forma de no duplicar logica. El contrato compartido entre ambos clientes vive en un solo lugar (ver `zai-practices-project-structure`, `packages/shared-types`) y se testea como tal (ver `zai-practices-testing`, seccion de testing de contrato).

## Fuentes

- [Backends For Frontends - Sam Newman](https://samnewman.io/patterns/architectural/bff/) — el writeup original que acuño el patron BFF.
- [BFF @ SoundCloud - ThoughtWorks](https://www.thoughtworks.com/insights/blog/bff-soundcloud) — implementacion real de BFF para web + mobile en una empresa real.
