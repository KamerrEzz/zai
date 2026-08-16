---
name: zai-practices-architecture-frontend-composition
description: Use ONLY when considering micro-frontends - splitting a UI into independently deployable fragments owned by different teams. Do not use for splitting backend services (see zai-practices-architecture-service-boundaries) or for folder organization within a single frontend app (see zai-practices-project-structure).
---

# Micro-frontends: casi nunca, para un equipo chico o solo

Micro-frontends resuelven un problema organizacional (equipos distintos,
con ciclos de release distintos, deployando partes independientes de la
misma UI sin coordinarse entre sí) - no un problema técnico. Si sos un
equipo chico o trabajás solo, ese problema no existe: coordinar tu propio
release con vos mismo no tiene costo. El costo de micro-frontends
(orquestación en runtime, duplicación de dependencias entre fragmentos,
complejidad de estado compartido entre apps independientes) es real y se
paga igual, exista o no el problema organizacional que lo justifica.

## Señal real para considerarlo

Más de un equipo *independiente* desplegando partes de la misma
superficie de UI en cadencias distintas - por ejemplo, un equipo de
checkout que necesita deployar cambios varias veces por semana sin
coordinar con el equipo que mantiene el catálogo de productos, y ambos
comparten la misma página. Fuera de eso, un monolito de frontend bien
modularizado internamente (carpetas por dominio, ver
`zai-practices-project-structure`) da el mismo beneficio de organización
sin el costo de runtime.

## Lo que en realidad se está pagando

- **Duplicación de dependencias**: cada fragmento suele traer su propia
  copia de React/framework si no se coordina el runtime compartido -
  más peso para quien carga la página, no menos.
- **Estado compartido entre apps independientes** se vuelve un problema
  de integración en sí mismo (eventos custom, un bus compartido, o un
  store global que ahora cruza límites de deploy) - algo que dentro de
  un solo frontend es trivial (un store, un contexto).
- **Testing end-to-end** ahora cruza límites de deploy independientes -
  un cambio en un fragmento puede romper la integración visual con otro
  sin que ningún test de ninguno de los dos lo detecte solo.

Ningún de estos costos es hipotético - son el precio de tener equipos que
no necesitan coordinarse. Si ese beneficio no existe para vos (porque sos
el único equipo), estás pagando el costo sin el beneficio.
