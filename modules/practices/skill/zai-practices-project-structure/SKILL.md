---
name: zai-practices-project-structure
description: Use ONLY when laying out the actual folder/directory structure of a new project or package - monorepo vs single app, where routes/domain/shared code live. Do not use for deciding WHETHER to split into services or how layers depend on each other (see zai-practices-architecture-layering and zai-practices-architecture-service-boundaries) - this is the literal folder tree once that decision is made.
---

# Estructura de carpetas: el layout concreto, no la teoría

Este skill da el arbol de carpetas real para las cuatro formas mas
comunes de organizar un proyecto. La decision de *si* separar en
servicios/monorepo vive en `zai-practices-architecture-service-boundaries`
- esto es *como* se ve una vez decidido.

## Monorepo pnpm (API + web + mobile + paquetes compartidos)

El caso tipico cuando mantenes una API consumida por una web Next.js **y**
una app React Native (ver `zai-practices-architecture-multi-client`):

```
mi-proyecto/
  apps/
    api/              # backend (Express/NestJS, ver zai-stack-backend-framework)
    web/              # Next.js
    mobile/           # React Native / Expo
  packages/
    shared-types/      # tipos/schemas Zod compartidos entre api y los clientes
    ui/                 # componentes compartidos SOLO si web y mobile
                          # realmente comparten UI (React Native Web, Tamagui,
                          # etc.) - si no comparten runtime de UI, no fuerces
                          # este paquete, cada app tiene la suya
    config/              # eslint/tsconfig compartido
  pnpm-workspace.yaml
  package.json
```

Reglas de esta estructura, no solo la forma:

- **`packages/shared-types` es el unico lugar donde vive el contrato**
  entre `api` y los clientes (tipos de Zod, tipos de tRPC si corresponde).
  Ni `web` ni `mobile` redefinen sus propios tipos de la respuesta de la
  API - los importan de ahi. Redefinirlos en cada cliente es exactamente
  el tipo de duplicacion que `zai-practices-architecture-multi-client` advierte que
  pasa cuando el backend "le pertenece" a un cliente en vez de ser su
  propio servicio.
- **Nada dentro de `apps/api` importa de `apps/web` ni `apps/mobile`**, ni
  al reves entre `web` y `mobile`. La unica direccion de dependencia
  permitida es `apps/*` -> `packages/*`, nunca `apps/*` -> `apps/*`.
- Cada `apps/*` tiene su propio `package.json`, su propio deploy, y puede
  vivir en un estado "roto" temporalmente sin tumbar a los demas (si
  `mobile` esta a mitad de un cambio grande, `web` sigue deployable).

## Monolito full-stack (un solo Next.js, sin backend separado)

Cuando el unico consumidor es la propia app Next.js (sin mobile, sin
segundo cliente - la condicion de default de `zai-stack-api-layer`):

```
mi-proyecto/
  src/
    app/                    # App Router: rutas y layouts, casi sin logica
      (marketing)/
      dashboard/
        orders/
          page.tsx
          actions.ts         # Server Actions de este feature especifico
    orders/                  # dominio "orders", screaming architecture
      domain/                 # reglas de negocio puras, sin imports de Next
      infrastructure/          # Prisma/queries especificas de este dominio
    billing/
      domain/
      infrastructure/
    shared/
      ui/                      # componentes de UI genericos, sin logica de dominio
      lib/                      # utilidades sin estado
```

La regla clave: **`app/` es el punto de entrada, no donde vive la logica.**
Un `page.tsx`/`actions.ts` orquesta (llama al dominio, arma la respuesta) -
no contiene reglas de negocio el mismo. Si `actions.ts` tiene mas de
"validar input, llamar al dominio, devolver resultado", esa logica
deberia estar en `orders/domain/`, no en la carpeta de rutas.

## Next.js App Router - convenciones especificas

Dentro de `app/`, ademas de lo de arriba:

- **Colocacion por feature dentro de rutas**: si un componente/hook solo
  lo usa una ruta especifica, vive junto a esa ruta (`app/dashboard/orders/_components/`),
  no en `shared/` "por si acaso" se reusa despues. Promove a `shared/`
  recien cuando un segundo lugar real lo necesita - no antes.
- **Route groups** (`(marketing)`, `(dashboard)`) para compartir layout
  entre rutas sin que el nombre del grupo aparezca en la URL - usalos
  para layouts genuinamente distintos (publico vs autenticado), no para
  organizar por gusto cuando el layout es el mismo.
- `_components`, `_lib` (prefijo `_`) para carpetas que Next.js no debe
  tratar como rutas dentro de `app/`.

## Backend standalone (Express/NestJS)

Combinando screaming + hexagonal (ver `zai-practices-architecture-layering`):

```
apps/api/
  src/
    orders/
      domain/
        order.entity.ts
        order.repository.ts     # interfaz (puerto), no implementacion
      infrastructure/
        prisma-order.repository.ts  # implementa el puerto de arriba
        order.controller.ts          # HTTP: mapea request -> caso de uso
      order.module.ts               # (NestJS) o order.routes.ts (Express)
    billing/
      domain/
      infrastructure/
    shared/
      middleware/
      config/
```

Cada dominio (`orders/`, `billing/`) es autocontenido: su propio
`domain/` e `infrastructure/`, sin depender de la `infrastructure/` de
otro dominio. Si `billing` necesita datos de `orders`, lo hace a traves
del `domain/` publico de `orders` (su interfaz), no importando directo
su capa de infraestructura.

## La regla que cruza las cuatro formas

En cualquiera de estos layouts, si para agregar una feature chica tenes
que tocar archivos en tres carpetas de "capas" distintas para algo que es
conceptualmente una sola cosa, la estructura esta peleando contra vos, no
ayudando - revisá si el nivel de separacion (monorepo, capas
domain/infrastructure) de verdad lo justifica tu proyecto ahora, no el
que te gustaria tener en un año. Ver `zai-practices-architecture-layering`
y `zai-practices-architecture-service-boundaries` para el criterio de
cuando cada nivel de separacion amerita.
