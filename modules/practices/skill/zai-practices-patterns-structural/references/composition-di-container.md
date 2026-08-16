# Dependency Injection, composición vs herencia, Container/Presentational

## Dependency Injection

**Qué hace**: un objeto recibe sus dependencias desde afuera en vez de
construirlas él mismo internamente.

**Cuándo SÍ**: casi siempre que una dependencia sea algo que en tests
querés reemplazar (una llamada de red, el reloj del sistema, un
generador de IDs) o que varía según el contexto de ejecución.

**Cuándo NO**: DI para *todo*, incluidas utilidades puras sin estado - una
función pura ya es trivialmente testeable sin inyectarla.

## Composición antes que herencia, casi siempre

La herencia acopla fuerte: una subclase depende de los detalles internos
de su padre de una forma que un cambio en el padre puede romper
silenciosamente. La composición (un objeto que *usa* a otro vía una
interfaz, no que *extiende* de él) da el mismo reuso de comportamiento
sin ese acoplamiento. Reservá herencia para jerarquías genuinas de tipo
("un `AdminUser` ES-UN `User`"), no para reusar código entre cosas que no
son la misma cosa.

## Container/Presentational (frontend)

Separa **qué datos y lógica** (container: fetch, estado, handlers) de
**cómo se ve** (presentational: recibe props, solo renderiza). Con hooks
maduros (`useQuery`, custom hooks) esta separación muchas veces ya vive
naturalmente en el hook en vez de en un componente Container dedicado -
no fuerces el nombre "Container" si el hook ya cumple ese rol.
