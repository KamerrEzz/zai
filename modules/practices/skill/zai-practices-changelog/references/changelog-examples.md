# Changelog: ejemplos de referencia

Formato de referencia: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

## Ejemplo: de varios commits a un `[Unreleased]` coherente

Tres commits reales entre versiones:

```
fix(auth): rechazar tokens JWT con alg "none"
feat(orders): agregar filtro por rango de fechas en /api/orders
chore: actualizar dependencias de dev
```

El changelog no es una copia 1:1 del log de commits - traduce cada uno a
la pregunta de `zai-practices-changelog` (¿le importa a alguien que no
leyó el código?) y descarta el que no la pasa:

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
