---
name: zai-practices-changelog
description: Use ONLY when writing or reviewing entries in a CHANGELOG.md file. Do not use for commit messages (see zai-practices-commits) or for internal engineering docs like ADRs - a changelog is written for someone deciding whether to upgrade, not for someone debugging the implementation.
---

# Changelog: Keep a Changelog en profundidad

Formato de referencia: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Este skill es el criterio de **que va adentro y que no** - el formato en si
es simple, el criterio es lo que se hace mal en la practica.

## La pregunta que decide cada linea

**¿A alguien que no leyo el codigo le importa esto para decidir si
actualiza?** Si la respuesta es no, no va en el changelog - va, como mucho,
en el mensaje de commit.

No van: refactors internos sin efecto observable, "arreglado typo",
"mejoras varias", detalles de implementacion que no cambian ningun
comportamiento ni API publica, el nombre de quien lo hizo (eso es lo que
es `git blame`, no el changelog).

Si van: cualquier cambio de comportamiento observable, cualquier cambio de
API publica (agregado, cambiado, o roto), fixes de seguridad (con la
seccion `Security` dedicada - no los escondas en `Fixed`), deprecaciones
(con que las reemplaza).

## Las seis categorias, con criterio real de cuando usar cada una

```markdown
## [1.2.0] - 2026-08-15

### Added
- Funcionalidad nueva. Si agrega una opcion/flag/endpoint, nombralo.

### Changed
- Comportamiento existente que cambio - no algo nuevo, algo que ya
  estaba y ahora se comporta distinto.

### Deprecated
- Algo que sigue funcionando pero va a dejar de existir. Decí desde
  cuando y que usar en su lugar, no solo "deprecated".

### Removed
- Lo que efectivamente se saco. Si estaba deprecado antes, referencialo.

### Fixed
- Bugs corregidos. Describe el sintoma que el usuario veia, no la causa
  interna ("el listado no cargaba pasadas 100 filas", no "se corrigio
  el indice del loop").

### Security
- Vulnerabilidades corregidas. Esta seccion existe separada de `Fixed`
  a proposito - alguien evaluando si actualizar por motivos de seguridad
  necesita encontrarla sin leer las otras cinco secciones primero.
```

No uses las seis en cada release - una release que solo arregla un bug
tiene solo `### Fixed`, no las seis con la mayoria vacias.

## Granularidad: una linea, no un parrafo

```markdown
✗ Se hicieron mejoras al sistema de autenticacion para hacerlo mas
  robusto y seguro, incluyendo varios cambios en como se manejan los
  tokens y las sesiones de los usuarios.

✓ Los tokens de sesion ahora expiran a los 15 minutos de inactividad
  (antes: nunca expiraban).
```

La primera versión no le permite a nadie decidir nada - no dice que
cambio de verdad. La segunda es accionable: alguien que dependia del
comportamiento viejo (sesiones eternas) sabe exactamente que se rompe.

## `[Unreleased]`

Mantené una seccion `[Unreleased]` al tope mientras se acumulan cambios
entre versiones — no esperes al momento de versionar para reconstruir de
memoria que cambio. Cada PR/commit que amerita entrada la agrega ahi;
`zai-scribe` (`modules/phases/agents/zai-scribe.md` en este toolkit) hace
esto en `/zai-fase-close`.

## Relacion con semver

`Added` sin romper nada -> minor. `Fixed`/`Security` sin romper nada ->
patch. Cualquier entrada bajo `Changed` o `Removed` que rompe compatibilidad
-> major, y tiene que decirlo explicito ("**BREAKING:**" al inicio de la
linea) - no dejes que alguien se entere de un breaking change leyendo el
codigo fuente porque el changelog lo redacto como si fuera un cambio
cualquiera.

## Ejemplo: de varios commits a un `[Unreleased]` coherente

Tres commits reales entre versiones:

```
fix(auth): rechazar tokens JWT con alg "none"
feat(orders): agregar filtro por rango de fechas en /api/orders
chore: actualizar dependencias de dev
```

El changelog no es una copia 1:1 del log de commits - traduce cada uno a
la pregunta de `zai-practices-changelog` de arriba (¿le importa a alguien
que no leyó el código?) y descarta el que no la pasa:

```markdown
## [Unreleased]

### Added
- Filtro por rango de fechas en el listado de órdenes (`/api/orders?from=&to=`).

### Security
- Los tokens JWT con `alg: none` ahora se rechazan en vez de aceptarse
  sin validar firma.
```

El `chore` de dependencias de dev no aparece - no cambia nada observable
para quien usa el paquete. El `fix` de seguridad va en `Security`, no en
`Fixed`, aunque el commit haya usado el tipo `fix` (el tipo de commit y
la categoría de changelog no son el mismo eje: `fix` en Conventional
Commits es sobre el impacto en semver, `Security` en Keep a Changelog es
sobre visibilidad para quien decide actualizar por motivos de seguridad).
Si el proyecto además publica GitHub Releases, esta misma entrada es la
materia prima que `zai-practices-release-notes` traduce a un anuncio
legible para gente que nunca vio un changelog.

## El cero-changelog es peor que un changelog imperfecto

Un proyecto sin `CHANGELOG.md` obliga a quien lo consume a leer el log de
commits (que mezcla ruido interno con lo que de verdad importa) o el
diff completo entre versiones. Si estas arrancando un proyecto nuevo,
`CHANGELOG.md` desde el primer commit, aunque las primeras entradas sean
minimas - es mucho mas facil mantener la disciplina desde el dia uno que
reconstruir el historial despues.
