---
name: zai-practices-comments
description: Use ONLY when deciding whether to write a code comment, writing a docstring for a public API, or reviewing existing comments. Do not use for commit messages, changelogs, or ADRs - those are different artifacts for different audiences.
---

# Comentarios: el WHY, nunca el WHAT

## La prueba de una linea

Antes de escribir un comentario, preguntate: **¿este comentario dejaria de
hacer falta si el codigo tuviera mejores nombres?** Si la respuesta es si,
el problema es el nombre, no la falta de comentario - arreglá el nombre.

```ts
✗ // suma el precio de todos los items
const total = items.reduce((acc, i) => acc + i.price, 0)

✓ const totalPrice = items.reduce((acc, item) => acc + item.price, 0)
```

El comentario de arriba no agrega informacion que el codigo no tenga ya -
es ruido que hay que mantener sincronizado a mano para siempre.

## Cuando un comentario SI vale la pena

Solo cuando el codigo, por mas bien nombrado que este, no puede expresar
el **por que**:

- **Una restriccion no obvia**: por que se eligio este approach y no el
  obvio. "Usamos polling en vez de websockets porque el proxy corporativo
  del cliente bloquea conexiones long-lived" - eso no se deduce leyendo el
  codigo del polling.
- **Un workaround de un bug ajeno**: "Bug de Node 22: `fs.watch` no
  dispara en macOS bajo Docker Desktop, ver nodejs/node#XXXXX. Usamos
  polling con `fs.stat` como fallback." Sin esto, alguien va a "limpiar"
  el workaround en seis meses y reintroducir el bug.
- **Un invariante que el compilador no puede verificar**: "Este array
  siempre tiene al menos un elemento porque `validate()` ya lo garantizo
  mas arriba" - explica por que un `array[0]` sin chequeo es seguro.
- **Comportamiento que sorprende**: algo que hace exactamente lo que dice
  pero de una forma que no es la que alguien esperaria a primera vista.

## Comentarios que envejecen mal (y por que)

Un comentario que describe **el comportamiento actual** en vez de una
restriccion permanente tiene fecha de vencimiento — el codigo cambia, el
comentario se queda desactualizado, y ahora miente activamente (peor que
no tener nada). Los que sobreviven bien describen **por que**, que
normalmente no cambia aunque el como si.

```ts
✗ // retorna el usuario activo (agregado en la v2, antes retornaba null)
✓ // ver ADR-0004: se decidio no soportar multiples sesiones activas
   //   por usuario, así que esto siempre devuelve una sola
```

Revisá comentarios viejos con la misma sospecha que revisarias codigo
muerto - un comentario desactualizado no es inofensivo, activamente
desinforma a quien lo lee confiando en que sigue siendo cierto.

## Docstrings en APIs publicas

Para una funcion/clase que otros van a llamar sin leer su implementacion
(una libreria, un modulo compartido entre equipos, una API publica): el
docstring documenta el **contrato**, no la implementacion - que recibe,
que devuelve, que excepciones tira y cuando, efectos secundarios. Para
codigo interno de una sola app donde quien lo llama tambien puede leer la
implementacion en dos segundos, un docstring completo es a menudo
sobre-documentacion - el tipo (ver `zai-practices-typing`) ya documenta la
forma, y el nombre ya documenta el que.

## `TODO`/`FIXME`

Un `TODO` sin dueño ni fecha es un comentario que miente por omision -
implica que alguien va a volver, pero no dice quien ni cuando, asi que en
la practica nadie vuelve. Si el trabajo pendiente importa de verdad, es un
issue con dueño, no un comentario. Si no importa lo suficiente como para
ser un issue, tampoco importa lo suficiente como para quedar como TODO
permanente en el codigo - borralo.

## Codigo comentado

Codigo comentado ("por las dudas") no es documentacion, es basura que
el sistema de control de versiones ya resuelve mejor - `git log`/`git blame`
recuperan cualquier version anterior sin ensuciar el archivo actual. Si
borraste algo y lo dejaste comentado "por si hace falta despues", borralo
de verdad.
