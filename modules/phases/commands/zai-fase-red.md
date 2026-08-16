---
description: Delega en zai-test-author para escribir los tests de la fase, y verifica que fallan antes de avanzar el estado
agent: zai-planner
---
## Paso 1 - validar que se puede

Leé `.zai/state.json`. Si la fase actual no esta en `planning`, PARÁ ACÁ y
decime en que estado esta - este comando solo tiene sentido desde
`planning`.

## Paso 2 - delegar

Invocá `zai-test-author` via la tool `task`, con el spec de la fase
(`docs/phases/NN-nombre.md`) como contexto. Que escriba los tests que
describen el comportamiento esperado.

## Paso 3 - verificar que efectivamente fallan

Esto es lo que le da sentido al nombre "red": corré la suite de tests del
proyecto (mirá `package.json` > `scripts.test`, o preguntame si no es
evidente cual es el comando), filtrando por los `test_globs` de la fase si
el runner lo soporta.

- Si los tests **pasan**: PARÁ ACÁ. Un test que pasa antes de que exista la
  implementacion no esta probando nada real - no avances el estado, decime
  que test es y por que sospechas que no esta probando lo que deberia.
- Si los tests **fallan** por un error de sintaxis o de import roto (no por
  una aserción real): tampoco avances. Eso no es "red", es un test que no
  compila.
- Si fallan por una aserción real contra codigo que todavia no existe: esto
  es lo esperado, segui al paso 4.

## Paso 4 - transicionar

```
pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-transition.ts "$(pwd)" red
```

## Cierre

Confirmame que tests se escribieron, que efectivamente fallan (pegame la
salida relevante, no todo el log), que el estado quedo en `red`, y que el
proximo paso es `/zai-fase-green`.
