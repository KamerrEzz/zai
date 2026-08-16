---
description: Corre la suite completa, exige audited sin blockers, delega en zai-scribe, y avanza a documented
agent: zai-planner
---
Este comando es la validacion dura de fin de fase. No existe, en esta
version de OpenCode, un hook que bloquee el fin de turno de un agente con
tests en rojo (investigado y confirmado en `docs/RESEARCH.md` seccion 9) -
este comando es la alternativa real: la fase no cierra si esto no pasa.

## Paso 1 - validar que se puede

Leé `.zai/state.json`. Si la fase actual no esta en `audited`, PARÁ ACÁ y
decime en que estado esta. No hay forma de llegar a `documented` sin pasar
por `audited` - la maquina de estados lo rechaza igual, pero quiero que lo
detectes vos antes de intentarlo.

## Paso 2 - correr la suite completa

No filtres por `test_globs` de la fase esta vez - corré **toda** la suite
del proyecto. El objetivo es detectar que cerrar esta fase no rompio otra
cosa.

- Si el exit code no es 0: PARÁ ACÁ. No sigas al paso 3. Decime
  exactamente que fallo. Esto es intencional - es el punto de todo este
  comando.
- Si es 0: segui.

## Paso 3 - chequear si el proyecto ya usa GitHub Releases

```
gh release list --limit 1
```

Si el comando falla porque no hay repo remoto en GitHub, o la lista viene
vacia, el proyecto **no** usa releases - no es tu decision activarlos
ahora (ver `zai-practices-release-notes`). Guardate el resultado (usa/no
usa) para el paso siguiente.

## Paso 4 - delegar en zai-scribe

Invocá `zai-scribe` via `task` con: que fase se cierra, el spec de la fase,
un resumen del diff, y el resultado del paso 3 (si el proyecto ya usa
releases o no). `zai-scribe` no toca codigo y no tiene `bash` - si te
devuelve algo que no sea contenido para `docs/adr/`, `CHANGELOG.md`, la
decision de bump, o (solo si corresponde) una release note, algo esta
mal, no lo apliques.

Su respuesta te tiene que traer, explicito:
- Si escribio un ADR o no, y por que (ver `modules/phases/agents/zai-scribe.md`
  para el criterio - no lo reevalues vos, es su criterio a aplicar, pero si
  no te lo justifica, pediselo de nuevo).
- La entrada de `CHANGELOG.md` ya escrita.
- El tipo de bump (`major`/`minor`/`patch`) con su razon.
- Si el paso 3 confirmo que el proyecto usa releases: el contenido
  completo de la release note.

## Paso 5 - bump de version

Con el tipo de bump que te devolvio `zai-scribe`:

```
pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-bump-version.ts "$(pwd)" <major|minor|patch>
```

## Paso 6 - publicar el release, solo si el paso 3 confirmo que el proyecto ya los usa

```
gh release create <version-nueva> --title "<titulo que te dio zai-scribe>" --notes-file <archivo con el contenido que te dio zai-scribe>
```

Si el paso 3 dijo que el proyecto no usa releases, saltate este paso
entero - no crees el primer release de un proyecto sin que te lo hayan
pedido explicitamente.

## Paso 7 - transicionar

```
pnpm --dir "$(cat ~/.config/opencode/.zai-repo-path)" exec tsx scripts/zai-transition.ts "$(pwd)" documented
```

## Cierre

Confirmame: que la suite completa paso (pegame el resumen, no el log
entero), si se escribio un ADR (y cual, o por que no), la entrada del
changelog, la version nueva, si se publico un release (o por que no
correspondia), y que la fase cerro en `documented`. Si hay una fase
siguiente planeada en `docs/tasks.md`, avisame que el proximo paso es
`/zai-fase-start`.
