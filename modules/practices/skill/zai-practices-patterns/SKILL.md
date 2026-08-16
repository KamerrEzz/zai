---
name: zai-practices-patterns
description: Use ONLY when considering a specific design pattern (Repository, Strategy, Factory, Adapter, Decorator, Dependency Injection) for a piece of code. Do not use for high-level system layering (see zai-practices-architecture) or for framework-specific component patterns unless explicitly noted.
---

# Patrones de diseño: criterio de cuando SI y cuando NO

No es un catalogo enciclopedico - para eso esta el libro de GoF. Esto es
el criterio de aplicacion: un patron mal aplicado (donde no hace falta)
es peor que no usar ninguno, porque le agrega indireccion a cambio de
nada. Cada patron de abajo tiene su condicion observable de cuando se
justifica.

## Repository

**Que hace**: abstrae el acceso a datos detras de una interfaz
(`findById`, `save`) para que el dominio no sepa si hay Postgres, un
archivo, o una API remota atras.

**Cuando SI**: vas a tener mas de una implementacion real (produccion +
in-memory para tests), o el acceso a datos tiene logica no trivial que no
queres repetida en cada lugar que consulta.

**Cuando NO**: es un wrapper de una linea sobre un ORM que ya te da esa
abstraccion (`prisma.user.findUnique(...)`). Envolver un ORM ya
abstracto en otra interfaz identica es una capa que no protege de nada
real - el ORM en si ya es el "port".

## Strategy

**Que hace**: encapsula un algoritmo intercambiable detras de una
interfaz comun, seleccionado en runtime.

**Cuando SI**: tenes de verdad mas de una implementacion real y activa
del mismo contrato (distintos proveedores de pago, distintos algoritmos
de pricing segun el plan del usuario).

**Cuando NO**: tenes un solo `if/else` con dos ramas que no van a crecer.
Un patron Strategy para dos casos fijos es una clase extra, una interfaz
extra, y un factory extra para reemplazar dos lineas de `if`.

## Factory

**Que hace**: centraliza la logica de construccion de un objeto cuando esa
construccion es no trivial (depende de configuracion, de un tipo
discriminado, de pasos condicionales).

**Cuando SI**: construir el objeto correcto depende de logica real (que
implementacion de Strategy usar segun el tipo de usuario, por ejemplo).

**Cuando NO**: es un constructor con nombre distinto. Si `new Cosa(args)`
alcanza y no hay logica de decision en la construccion, un factory
alrededor no agrega nada — mas indireccion sin comportamiento nuevo.

## Adapter

**Que hace**: traduce la interfaz de algo externo (una libreria de
terceros, una API legacy) a la interfaz que tu dominio espera.

**Cuando SI**: siempre que integres algo externo cuya interfaz no
controlas y no queres que el dominio dependa de su forma especifica -
este es, en la practica, el mismo mecanismo que un "port" de arquitectura
hexagonal (ver `zai-practices-architecture`) aplicado a una libreria
puntual en vez de a toda la infraestructura.

**Cuando NO**: la libreria externa ya tiene exactamente la interfaz que
necesitas y no hay ninguna razon concreta para pensar que vas a
cambiarla. Adaptar "por las dudas" es la misma trampa que Strategy/Factory
sin necesidad real.

## Decorator

**Que hace**: agrega comportamiento a un objeto envolviendolo, sin tocar
su clase original ni las de otros objetos de la misma clase.

**Cuando SI**: necesitas combinar comportamientos de forma independiente
(logging + retry + cache alrededor de una llamada, cada uno opcional y
combinable) sin una explosion de subclases para cada combinacion.

**Cuando NO**: el comportamiento extra es fijo y unico - ahi va adentro de
la funcion/clase directamente, envolver agrega una capa para separar algo
que nunca se va a usar por separado.

## Dependency Injection

**Que hace**: un objeto recibe sus dependencias desde afuera (constructor,
parametros) en vez de construirlas el mismo internamente.

**Cuando SI**: casi siempre que una dependencia sea algo que en tests
queres reemplazar (una llamada de red, el reloj del sistema, un
generador de IDs) o que varia segun el contexto de ejecucion.

**Cuando NO**: DI para *todo*, incluidas utilidades puras sin estado
(un formateador de fechas sin dependencias externas) — inyectar algo que
no tiene ningun motivo para variar solo agrega parametros a cada
constructor de la cadena, sin beneficio de testeo real (una funcion pura
ya es trivialmente testeable sin inyectarla).

## Composicion antes que herencia, casi siempre

La herencia acopla fuerte: una subclase depende de los detalles internos
de su padre de una forma que un cambio en el padre puede romper
silenciosamente (el problema clasico de la "clase base fragil"). La
composicion (un objeto que *usa* a otro via una interfaz, no que
*extiende* de el) da el mismo reuso de comportamiento sin ese
acoplamiento. Reservá herencia para jerarquias genuinas de tipo ("un
`AdminUser` ES-UN `User`"), no para reusar codigo entre cosas que no son
la misma cosa.

## Container/Presentational (frontend)

Separa **que datos y logica** (container: fetch, estado, handlers) de
**como se ve** (presentational: recibe props, solo renderiza). El
componente presentacional es trivial de testear/storybookear en
aislamiento porque no tiene efectos secundarios.

Con hooks maduros (`useQuery`, custom hooks) esta separacion muchas veces
ya vive naturalmente en el hook en vez de en un componente Container
dedicado - el patron sigue siendo el mismo (separar estado/efectos de
presentacion), el vehiculo cambio. No fuerces el nombre "Container" si el
hook ya cumple ese rol con menos ceremonia.
