---
description: Delega en zai-implementer para hacer pasar los tests de la fase
agent: zai-planner
---
## Paso 1 - validar que se puede

Leé `.zai/state.json`. Si la fase actual no esta en `red`, PARÁ ACÁ y decime
en que estado esta.

## Paso 2 - transicionar primero

A diferencia de los otros comandos, acá transicionamos **antes** de
delegar, porque el gate de tests intocables (`zai.phases`, Gate A) se activa
recien cuando `phase_state` es `green` - si delegaras primero, el
implementer tendria una ventana sin proteccion.

```
pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-transition.ts "$(pwd)" green
```

## Paso 3 - delegar

Invocá `zai-implementer` via `task`, con el spec de la fase y los tests en
rojo como contexto. Que implemente hasta hacerlos pasar.

Si te llega un error de la herramienta de escritura mencionando "zai gate
A", es el gate bloqueando una escritura a un archivo de test - no es un bug,
es el comportamiento esperado. No busques la vuelta para esquivarlo.

## Paso 4 - verificar

Corré la suite de tests filtrada por los `test_globs` de la fase. Si no
pasan todos, no cierres el turno como si hubieras terminado - seguí
iterando con `zai-implementer` o decime explicitamente que te trabaste y en
que.

## Cierre

Confirmame que los tests de la fase pasan (pegame la salida), que el
estado ya esta en `green` (lo transicionaste en el paso 2, no hace falta
transicionar de nuevo), y que el proximo paso es `/zai-fase-audit`.
