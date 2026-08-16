---
description: Abre la siguiente fase en planning y genera su spec en docs/phases/NN-nombre.md
agent: zai-planner
---
Vas a abrir una fase nueva. Esto asume que `.zai/state.json` ya existe
(si no existe, decime que corra `/zai-init` primero y no hagas nada mas).

## Paso 1 - validar que se puede

Leé `.zai/state.json`. Si la fase actual **no** esta en `documented`, PARÁ
ACÁ: decime en que estado esta realmente, y decime el comando correcto para
avanzarla desde ahi - **no asumas que es `/zai-fase-close`**, ese solo es
correcto si ya esta en `audited`. Usa esta misma tabla que ya usa
`/zai-estado` (no la repitas de memoria, es la unica fuente de verdad):

| esta en... | el proximo paso real es... |
|---|---|
| `planning` | `/zai-fase-red` |
| `red` | `/zai-fase-green` |
| `green`, sin blockers | `/zai-fase-audit` |
| `green`, con blockers | `/zai-fase-fix` |
| `audited` | `/zai-fase-close` |

No lo intentes igual - el script de abajo lo va a rechazar de todas formas,
pero quiero que me lo digas vos primero, con tus palabras y el comando
correcto, no como un stack trace ni una suposicion generica.

## Paso 2 - definir la fase

Preguntame, una cosa por vez: nombre corto de la fase, que incluye, que
`test_globs` le corresponden. Con eso escribi
`docs/phases/NN-nombre.md` (NN = numero de fase con cero a la izquierda) con
el spec.

## Paso 3 - escribir el estado

Corré (`~/.config/opencode/.zai-repo-path` trae la ruta real del repo de
ZAI en esta maquina, generada por el instalador):

```
echo '{"name":"<nombre>","spec":"docs/phases/NN-nombre.md","test_globs":["<patron>"]}' | pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-start-next-phase.ts "$(pwd)"
```

Si el comando falla, mostrame el error tal cual - no lo escribas a mano como
fallback (a diferencia de `/zai-init`, esto no es la primera vez que se
inicializa el proyecto, asi que no hay excusa para no tener ZAI instalado
como repo).

## Cierre

Confirmame el numero de fase, su nombre, y que quedo en `planning`.
