---
name: zai-practices-testing
description: Use ONLY when writing, reviewing, or debugging tests - what to assert, how to structure a test, whether to mock something. Do not use for setting up a test runner/framework (that's a zai-stack-* decision) or for the red/green phase mechanics of this toolkit's own loop (see modules/phases/).
---

# Testing: qué hace que un test valga algo

## Un test prueba comportamiento, no implementación

La pregunta que decide si un test es bueno: **¿sigue pasando si reescribo
la implementación entera pero mantengo el mismo comportamiento externo?**
Si la respuesta es no - si el test se rompe porque cambiaste un nombre de
variable interno, el orden de llamadas privadas, o la estructura de una
clase sin que el resultado observable cambiara - el test esta acoplado a
la implementacion, no verificando comportamiento. Eso hace que refactorizar
duela (los tests se rompen sin que haya un bug real) y que bugs reales
pasen (el test nunca miro el resultado que de verdad importa).

```ts
✗ // acoplado a implementacion: sabe que internamente se llama a un
  // metodo privado especifico
  expect(service._validateInternal).toHaveBeenCalledWith(input)

✓ // prueba comportamiento: el resultado observable
  expect(() => service.process(invalidInput)).toThrow("invalid input")
```

## Arrange-Act-Assert, y un solo comportamiento por test

```ts
it("rejects a login with an expired token", async () => {
  // Arrange
  const expiredToken = createToken({ expiresAt: pastDate })

  // Act
  const result = await login(expiredToken)

  // Assert
  expect(result.status).toBe(401)
})
```

Un test que verifica dos comportamientos no relacionados en el mismo
bloque hace mas dificil saber cual de los dos rompio cuando falla, y
tienta a poner un nombre vago porque no hay un solo comportamiento que
describir. El nombre del test tiene que poder leerse como una oracion que
describe el comportamiento esperado (`it("rejects...")`, no
`it("test login")`).

## Mockeá en los bordes, no lo que es tuyo

Mockeá lo que cruza un limite que no controlas o que es costoso/no
determinista de verdad: red, tiempo (`Date.now`), IDs aleatorios,
llamadas a servicios externos. **No mockees tu propio dominio** para
simplificar el test - si necesitas mockear tres colaboradores internos
para poder testear una funcion, la señal real es que esa funcion hace
demasiado, no que el test necesita mas mocks.

Un mock que reemplaza el comportamiento real por una suposicion tuya de
como se comporta puede divergir de la realidad sin que nada te avise -
ese es exactamente el motivo por el que `docs/DECISIONS.md` (en este
mismo toolkit) marca como regla explicita "integration tests must hit a
real database, not mocks" en los lugares donde ya paso: un mock que
quedo desincronizado de lo real dejo pasar un bug que recien aparecio en
produccion. Cuanto mas critico el path, menos apropiado mockearlo del
todo - preferí un entorno real (una DB de test real, un contenedor) sobre
un mock, cuando el costo de tenerlo lo justifica.

## Casos límite, no solo el happy path

Un test que solo cubre la entrada esperada prueba que el código funciona
cuando todo sale bien - que es la parte que menos falla en produccion.
Los bugs reales viven en los bordes: string vacio, array vacio, null/
undefined donde el tipo permite pero nadie penso el caso, el limite exacto
de un rango (`>=` vs `>`), la segunda llamada cuando el estado ya cambio
por la primera, el error que la dependencia externa puede tirar.

Para código que maneja input externo, agregá deliberadamente: el caso
vacio, el caso con el tipo "correcto" pero el valor limite, y el caso de
falla de la dependencia (¿que pasa si la llamada de red que mockeaste
tira un error real?).

## Anti-patrones de tests flaky (antes de silenciarlos con retry)

- **Dependencia de tiempo real**: `setTimeout`/`Date.now()` sin mockear
  hace que el test pase o falle segun que tan rapido corrio la maquina.
  Mockeá el reloj, no agregues margenes de tiempo cada vez mas generosos.
- **Dependencia de orden**: un test que solo pasa si corrio despues de
  otro (estado global compartido, una base de datos no limpiada entre
  tests) va a fallar en paralelo o si alguien reordena el archivo.
- **Red real en tests unitarios**: ademas de lento, es no determinista
  (el servicio externo puede estar caido, lento, o rate-limiteando) - la
  cobertura real de "esto funciona contra el servicio de verdad" es un
  test de integracion aparte, no el default de cada test unitario.

Si un test es flaky, la respuesta casi nunca es reintentarlo hasta que
pase - es encontrar cual de estos tres problemas tiene.

## Cobertura es una señal, no un objetivo

100% de cobertura con asserts debiles (`expect(result).toBeDefined()`)
prueba menos que 70% de cobertura con asserts que realmente verifican el
valor y la forma del resultado. Usa la cobertura para encontrar codigo
que **nadie** esta probando, no como numero a maximizar - perseguir el
ultimo 5% suele significar testear getters triviales y ramas de manejo de
errores que nunca ocurren, mientras el 70% que si importa tiene asserts
flojos.

## Un caso real: por qué "el mock esconde el bug" no es teórico

Durante el desarrollo de este mismo toolkit (ZAI, ver
`docs/DECISIONS.md` punto 13), un gate que corria `tsc`/`eslint` via
`child_process.execFile` tenia tests unitarios que pasaban ✓ - pero el
gate estaba completamente roto en Windows: `execFile` no puede invocar un
shim `.cmd` sin `{ shell: true }`, fallaba con un error sin `stdout`, y el
codigo lo interpretaba como "sin problemas encontrados" (falso negativo
total). Los tests nunca lo detectaron porque mockeaban `child_process`
- exactamente el nivel donde vivia el bug. Se encontro recien corriendo
el gate contra un proyecto real con un error de tipos deliberado.

La leccion no es "no mockees nunca" - es que **mockear el limite exacto
donde vive el riesgo real elimina la posibilidad de detectarlo**. Para
código que invoca herramientas externas, procesos, o el sistema de
archivos de formas especificas de la plataforma, al menos un test tiene
que correr contra lo real, no contra una simulacion de lo real.

## Vocabulario de test doubles: no todos los "mocks" son mocks

Usar "mock" para todo esconde una decisión real - cada tipo cumple un rol
distinto y elegir el equivocado hace el test más frágil de lo necesario:

- **Stub**: devuelve una respuesta fija, no verifica que lo hayan llamado.
  Úsalo cuando solo te importa el dato de vuelta.
  `const getRates = () => ({ USD: 1, EUR: 0.92 })`
- **Spy**: como un stub, pero además registra cómo lo llamaron - úsalo
  cuando el comportamiento que importa es "llamó a X con estos argumentos",
  no solo el resultado. `vi.spyOn(emailer, "send")`
- **Mock** (en sentido estricto): pre-programado con expectativas exactas
  de llamada, y el test falla si no se cumplen exactamente. Es el más
  acoplado a la implementación de los cuatro - reservalo para cuando el
  *hecho de haber llamado* es literalmente el comportamiento a probar
  (ej: "al fallar el pago, se debe notificar a soporte").
- **Fake**: una implementación real pero simplificada (un repositorio en
  memoria en vez de Postgres). Es el más caro de escribir y el que menos
  miente - un `InMemoryOrderRepository` que respeta la misma interfaz que
  el real detecta bugs de lógica que un stub jamás detectaría, sin pagar
  el costo de una base de datos real en cada test.

```ts
✗ // "mock" que en realidad es un stub disfrazado - no verifica nada,
  // solo esconde que el test no sabe qué está probando
  const mockDb = { findUser: vi.fn().mockResolvedValue(fakeUser) }

✓ // spy: el comportamiento que importa es que se llamó a `send`
  // con el destinatario correcto, no solo que el resultado fue "ok"
  const sendSpy = vi.spyOn(emailer, "send")
  await notifyPasswordReset(user)
  expect(sendSpy).toHaveBeenCalledWith(user.email, expect.objectContaining({ template: "reset" }))
```

## Testear un contrato compartido entre clientes (web + mobile)

Si el mismo backend sirve una app web y una app React Native (ver
`zai-practices-architecture`, sección de backends multi-cliente), el
riesgo real no es "¿la función hace lo que dice?" sino "¿el contrato que
ambos clientes asumen sigue siendo el que el backend expone?" - un campo
renombrado en la respuesta de `/api/orders` rompe silenciosamente al
cliente que nadie está mirando en ese momento.

```ts
// El contrato vive una sola vez (ver zai-practices-project-structure,
// packages/shared-types) y el test de contrato lo valida contra la
// respuesta REAL del handler, no contra lo que el handler "debería" hacer
const OrderResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "shipped", "delivered"]),
  total: z.number(),
})

it("responde con la forma que ambos clientes esperan", async () => {
  const response = await request(app).get("/api/orders/123")
  expect(() => OrderResponseSchema.parse(response.body)).not.toThrow()
})
```

Esto no reemplaza los tests de comportamiento del handler - es una capa
extra que existe específicamente porque hay más de un consumidor que no
se entera si el contrato cambia hasta que falla en producción, en el
cliente que menos se probó manualmente.

## Testear trabajo asíncrono (colas, workers)

Un worker que consume de una cola (ver `zai-practices-patterns`, sección
de notificaciones en alto volumen) no se testea disparando la cola real -
se testea la función del worker de forma aislada, con la cola como
frontera mockeada, y por separado se verifica que el job se encoló con
el payload correcto:

```ts
it("encola un job de envío por cada destinatario", async () => {
  const enqueueSpy = vi.spyOn(emailQueue, "add")
  await scheduleDigestEmails(recipients)
  expect(enqueueSpy).toHaveBeenCalledTimes(recipients.length)
})

it("el worker marca el job como fallido sin reintentar en errores de validación", async () => {
  const job = { data: { email: "no-es-un-email" } }
  await expect(processEmailJob(job)).rejects.toThrow("invalid email")
  // un error de validación no es transitorio - reintentarlo no lo arregla,
  // así que el test también documenta que NO debe ir a la cola de retry
})
```

La pregunta que separa un buen test de worker de uno inútil: **¿este test
distingue un error que vale la pena reintentar (la red falló) de uno que
nunca va a andar aunque reintentes mil veces (el dato de entrada es
inválido)?** Si no distingue eso, el worker real va a reintentar basura
para siempre.
