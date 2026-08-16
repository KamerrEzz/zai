---
name: zai-practices-architecture-layering
description: "Trigger: hexagonal, clean architecture, screaming architecture, capas de un servicio. Decide si y como estructurar las capas internas de un servicio."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when deciding how to structure the internal layers of a single service (Hexagonal/Ports & Adapters, Clean Architecture, Screaming Architecture) or whether any layering is worth its cost yet. Do not use for splitting a system into multiple services (`zai-practices-architecture-service-boundaries`), serving multiple clients from one backend (`zai-practices-architecture-multi-client`), or picking a design pattern inside a layer (`zai-practices-patterns-structural`).

## Hard Rules
- La direccion de las dependencias siempre apunta hacia el dominio, nunca al reves: el dominio no importa nada de `infrastructure/`.
- No introduzcas un puerto/adapter si el dominio no tiene reglas de negocio no triviales (CRUD simple no lo justifica).
- Las carpetas de nivel superior tienen que nombrar el dominio del negocio (`orders/`, `billing/`), nunca el framework (`controllers/`, `services/`).
- Cada capa agregada es costo permanente (mas archivos, mas indireccion) que se paga en cada feature; no la agregues "por si acaso".

## Decision Gates
| Señal en el proyecto | Estilo / accion |
|---|---|
| CRUD simple, sin reglas de negocio no triviales | Ninguna arquitectura de capas todavia |
| La misma regla de negocio se necesita en 2+ lugares, acoplada a infra | Hexagonal: extraer puerto + adapter |
| Sistema grande, multiples casos de uso recombinando las mismas entidades | Clean Architecture (capas concentricas explicitas) |
| Carpetas raiz nombradas por framework (`controllers/`, `services/`) | Screaming: reorganizar por dominio |

## Execution Steps
1. Preguntar que parte del sistema es cara de cambiar (dominio) vs barata (framework/DB/proveedor); si no hay parte cara real, parar aca.
2. Revisar si una regla de negocio se repite en mas de un lugar del codigo; esa es la señal para extraer un puerto.
3. Verificar la direccion de los imports: el dominio nunca debe importar de `infrastructure/`.
4. Revisar el nombre de las carpetas de nivel superior; si gritan framework en vez de dominio, proponer reorganizacion screaming.
5. Ver `references/hexagonal-crud-example.md` si hace falta mostrar el ejemplo completo antes/despues.

## Output Contract
Indicar el estilo recomendado (o "ninguno todavia") con la señal concreta que lo justifica, y si corresponde, el punto exacto del codigo donde falta el puerto o donde la direccion de dependencias esta rota.

## References
- `references/hexagonal-crud-example.md` — CRUD que crece hasta justificar hexagonal (fase 1 sin capas, fase 2 con puerto/adapter).
- `references/architecture-styles-detail.md` — detalle de Clean Architecture, Screaming Architecture, el costo de la sobre-arquitectura, y fuentes.
