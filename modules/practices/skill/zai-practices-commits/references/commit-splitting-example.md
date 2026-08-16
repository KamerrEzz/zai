# Commits: ejemplos de referencia

## Mensajes malos vs buenos

Mal (vago, no dice el por que, mezcla cosas):

```
fix: arreglos varios
```

```
update stuff
```

Bien:

```
fix(auth): rechazar tokens JWT con alg "none"

El middleware aceptaba el header alg sin validarlo contra una lista
fija, permitiendo bypass de la verificacion de firma. Ver
zai-practices-security-auth para el patron completo.
```

```
feat(queues): agregar soporte para jobs delayed en BullMQ
```

## Cuerpo del commit: cuando se justifica

No todo commit necesita cuerpo. Se justifica cuando:
- La razon del cambio no es obvia mirando el diff (un fix de seguridad,
  una decision que parece rara sin contexto).
- Hay una alternativa obvia que alguien podria proponer despues sin saber
  que ya se descarto - decila y por que se descarto (evita que se
  re-discuta lo mismo en cada PR).

No la uses para repetir en prosa lo que el diff ya muestra literal.

## Ejemplo: de un diff desordenado a commits atomicos

Trabajaste dos horas y `git status` muestra: un fix real en `auth.ts`, un
`console.log` de debug que quedó en `orders.ts`, una dependencia nueva en
`package.json` que necesitaba el fix, y un reformateo automático de
Prettier que corrió sobre `utils.ts` sin que lo pidieras.

```
✗ git add -A && git commit -m "fixes"
  # un solo commit que mezcla: el fix real, deuda de debug, una
  # dependencia sin explicar por qué, y ruido de formato - revertir
  # el fix real ahora también revierte el reformateo de utils.ts
```

Separado por causa, no por archivo:

```
✓ git add package.json pnpm-lock.yaml
  git commit -m "chore(auth): agregar jose para validación de JWT"

✓ git add auth.ts
  git commit -m "fix(auth): rechazar tokens con algoritmo no permitido"

✓ git add utils.ts
  git commit -m "style: aplicar formato de Prettier a utils.ts"

  # el console.log de debug en orders.ts no se commitea - no pertenece
  # a ningún cambio real, se descarta
```

Cuatro cambios físicamente en el mismo `git status`, tres causas reales
(la dependencia es un pre-requisito del fix, así que va antes) y un
descarte. La pregunta que ordena esto no es "¿qué archivos toqué?" sino
"¿cuántas razones distintas tengo para haber tocado algo?".

## Relacion con PRs y con `git commit` en este toolkit

Si estas en un proyecto que usa el loop de fases de ZAI (`modules/phases/`),
el Gate D (bloqueo de commit) puede exigir que `CHANGELOG.md` haya
cambiado antes de dejarte commitear - ver `docs/GUIDE.md` en la raiz del
repo de ZAI. Esto es intencional: un commit sin la entrada de changelog
correspondiente es, la mayoria de las veces, un commit que se olvido de
documentar su propio impacto.
