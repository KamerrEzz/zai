# Comentarios: ejemplos de referencia

## La prueba de una linea

```ts
✗ // suma el precio de todos los items
const total = items.reduce((acc, i) => acc + i.price, 0)

✓ const totalPrice = items.reduce((acc, item) => acc + item.price, 0)
```

El comentario de arriba no agrega informacion que el codigo no tenga ya -
es ruido que hay que mantener sincronizado a mano para siempre.

## Comentarios que envejecen mal

```ts
✗ // retorna el usuario activo (agregado en la v2, antes retornaba null)
✓ // ver ADR-0004: se decidio no soportar multiples sesiones activas
   //   por usuario, así que esto siempre devuelve una sola
```

Un comentario que describe el comportamiento actual tiene fecha de
vencimiento — el codigo cambia, el comentario se queda desactualizado, y
ahora miente activamente (peor que no tener nada). Los que sobreviven
bien describen por que, que normalmente no cambia aunque el como si.

## Docstrings en APIs publicas

Para una funcion/clase que otros van a llamar sin leer su implementacion
(una libreria, un modulo compartido entre equipos, una API publica): el
docstring documenta el contrato, no la implementacion - que recibe, que
devuelve, que excepciones tira y cuando, efectos secundarios. Para
codigo interno de una sola app donde quien lo llama tambien puede leer la
implementacion en dos segundos, un docstring completo es a menudo
sobre-documentacion - el tipo (ver `zai-practices-typing`) ya documenta la
forma, y el nombre ya documenta el que.

## Ejemplo: una eleccion que parece un error hasta que se explica

```ts
✗ // busca el usuario
  function findUser(id: string) {
    for (const user of allUsers) {
      if (user.id === id) return user
    }
    return null
  }
  // busqueda lineal sobre un array - alguien que lo lea va a asumir
  // que es descuido y lo va a "arreglar" a un Map, rompiendo el orden
  // de iteracion que otra parte del codigo depende

✓ // lineal a proposito: `allUsers` tiene <50 elementos en producción
  // (limite de negocio) y necesitamos el orden de inserción para el
  // desempate de "primer usuario creado" en resolveOwnership() - un
  // Map<id, user> pierde ese orden
  function findUser(id: string) {
    for (const user of allUsers) {
      if (user.id === id) return user
    }
    return null
  }
```

Sin el comentario, la próxima persona que optimiza "por las dudas" rompe
un invariante que no podía ver. El comentario no explica qué hace el
loop (eso ya lo dice el código) - explica por qué esta forma,
aparentemente subóptima, es la correcta.

## Codigo comentado

Codigo comentado ("por las dudas") no es documentacion, es basura que
el sistema de control de versiones ya resuelve mejor - `git log`/`git blame`
recuperan cualquier version anterior sin ensuciar el archivo actual. Si
borraste algo y lo dejaste comentado "por si hace falta despues", borralo
de verdad.
