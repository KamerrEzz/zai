---
name: zai-practices-testing
description: "Trigger: escribir tests, mockear, AAA, test flaky, cobertura, stub, spy, mock, fake. Define que hace que un test valga algo: comportamiento y mocks en el limite justo."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when writing, reviewing, or debugging tests — what to assert, how to structure a test, whether to mock something. Do not use for choosing a test runner/framework (`zai-stack-*`) or this toolkit's own red/green loop mechanics (`modules/phases/`).

## Hard Rules
- Un test tiene que seguir pasando si reescribis la implementacion entera manteniendo el mismo comportamiento externo — nunca assert sobre llamadas privadas/internas.
- Un solo comportamiento por test; el nombre se lee como oracion que describe lo esperado.
- Mockea solo en bordes que no controlas o son costosos/no deterministas (red, tiempo, IDs random, servicios externos) — nunca mockees tu propio dominio para simplificar.
- Cubri casos limite (vacio, valor de borde, falla de dependencia) ademas del happy path.
- Nunca arregles un test flaky con retry — diagnostica dependencia de tiempo real, de orden, o red real primero.
- Cobertura es señal para encontrar codigo sin testear, nunca un numero a maximizar.
- Para codigo que invoca herramientas/procesos/FS especificos de plataforma, al menos un test corre contra lo real, no una simulacion en el limite exacto del riesgo.

## Decision Gates
| Double | Usalo cuando |
|---|---|
| Stub | Solo importa el dato que devuelve |
| Spy | El comportamiento que importa es "llamo a X con estos argumentos" |
| Mock (estricto) | El hecho-de-haber-llamado con expectativas exactas ES el comportamiento probado |
| Fake | Necesitas logica real simplificada sin pagar el costo de la dependencia real |

| Sintoma flaky | Causa real | Fix |
|---|---|---|
| Pasa/falla segun velocidad de la maquina | `setTimeout`/`Date.now()` sin mockear | Mockear el reloj |
| Solo pasa despues de otro test | Estado global/DB compartido | Aislar estado, no reordenar |
| Lento/inconsistente en CI | Red real en test unitario | Mover a test de integracion |

## Execution Steps
1. Aplica el test de reescritura: ¿sobrevive a un refactor interno? Si no, reescribi para assertar comportamiento observable.
2. Estructura en Arrange-Act-Assert, un comportamiento por `it`.
3. Identifica los bordes del codigo bajo test; mockea solo esos, con el double correcto de la tabla.
4. Agrega casos limite deliberados: vacio/null, valor de borde, falla de dependencia.
5. Si el codigo invoca una herramienta/proceso/FS externo, asegura que al menos una variante corra contra lo real.
6. Revisa gaps de cobertura solo para encontrar codigo totalmente sin testear, no para perseguir el ultimo porcentaje.

## Output Contract
Reporta cada test revisado/escrito, que Hard Rule cumple o viola, que tipo de double usa y por que, y cualquier caso limite faltante o borde sobre-mockeado encontrado.

## References
- `references/testing-examples.md` — ejemplo AAA completo, caso real de mock que escondio un bug (Gate B, `child_process.execFile` en Windows), ejemplos de vocabulario de test doubles, testing de contrato compartido (web+mobile), y testing de trabajo asincrono (colas/workers).
