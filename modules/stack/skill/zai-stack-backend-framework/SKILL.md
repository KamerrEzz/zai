---
name: zai-stack-backend-framework
description: Use ONLY when deciding whether a new backend service or API layer should be built with Express or NestJS. Do not use for Next.js route handlers or Server Actions living inside the Next.js app itself - those are not a "backend framework" decision.
---

# Express vs NestJS

## Paso 0 - hace falta un backend standalone en primer lugar?

Si todo lo que necesitas es exponer datos al propio frontend Next.js (App
Router), esto no aplica: usa route handlers / Server Actions dentro de
Next.js (ver `zai-stack-api-layer`). Express y NestJS son para un servicio
backend que existe como proceso separado - workers, APIs consumidas por
mas de un cliente, servicios de larga duracion, etc.

Si no hace falta un backend separado, no sigas leyendo este skill.

## Arbol de decision (si SI hace falta un backend separado)

**Default: Express.**

Usa **NestJS** en cambio si se cumple **cualquiera** de estas condiciones
observables:

1. Vas a trabajar este backend con mas de una persona (no es tu caso por
   defecto - la mayoria de tus proyectos son en solitario - pero si este
   proyecto puntual va a tener colaboradores, la estructura impuesta de
   Nest paga mejor que en un proyecto solo tuyo).
2. El backend ya tiene, o vas a disenar desde el arranque, mas de
   aproximadamente 8-10 recursos/dominios distintos (controllers/modulos).
   Por debajo de ese numero, la ceremonia de Nest (modules, providers,
   decorators) cuesta mas de lo que ordena.
3. El usuario lo pide explicitamente para este proyecto puntual.

Si ninguna de las tres aplica: Express, sin mas vueltas.

## Si el proyecto no encaja claramente

Si no es obvio en cual rama cae el proyecto (por ejemplo, arranca chico
pero el spec de la fase ya prevé crecer mucho), pregúntale al usuario en
vez de asumir - no es una decision que valga la pena adivinar mal.
