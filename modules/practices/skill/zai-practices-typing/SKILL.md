---
name: zai-practices-typing
description: Use ONLY when writing or reviewing TypeScript type definitions - interfaces, generics, unions, type assertions. Do not use for runtime validation logic itself (that's Zod/application code, not type design) or for non-TypeScript languages.
---

# Tipado en TypeScript: precision sin sobre-ingenieria

## `any` es una promesa que le hacés al compilador de que no va a mirar

`any` no es "sin tipo" - es "confio en mi, no me chequees", y el compilador
te toma la palabra en todo lo que fluye desde ahi, silenciosamente, cascada
abajo. Un solo `any` mal puesto puede apagar el chequeo de tipos de todo un
arbol de llamadas sin que se vea en ningun lado.

- **Si el tipo es genuinamente desconocido** (un `JSON.parse`, un input
  externo, una respuesta HTTP sin validar): `unknown`, no `any`. `unknown`
  te obliga a angostar (`typeof`, `instanceof`, un type guard, o - mejor -
  un parse de Zod) antes de poder usarlo. Es la diferencia entre "no se que
  es, así que no te dejo tocarlo hasta que lo confirmes" (`unknown`, seguro)
  y "no se que es, hace lo que quieras" (`any`, inseguro).
- Si terminaste escribiendo `any` porque el tipo real es complicado de
  expresar, es una señal de que el tipo describe mal el dominio - antes de
  rendirte a `any`, probá un union discriminado o un generic acotado.

## Uniones discriminadas en vez de "sopa de opcionales"

```ts
✗ type Response = {
    status: "ok" | "error"
    data?: User
    errorMessage?: string
  }
  // nada impide { status: "ok", errorMessage: "..." } - el tipo permite
  // estados que no deberian existir

✓ type Response =
    | { status: "ok"; data: User }
    | { status: "error"; errorMessage: string }
  // TypeScript angosta automaticamente: dentro de un `if (r.status === "ok")`,
  // `r.data` existe y `r.errorMessage` ni siquiera es accesible
```

Cuando un objeto tiene campos que solo tienen sentido juntos segun algun
"modo", esa es la señal de que necesitas una union discriminada, no mas
campos opcionales. Los opcionales sueltos permiten combinaciones invalidas
que despues hay que validar a mano en runtime - el union discriminado hace
esas combinaciones irrepresentables desde el tipo.

## `as` es un escape hatch, no una herramienta de todos los dias

Cada `as` es una afirmacion tuya de "confia en mi" que el compilador no
verifica - exactamente el mismo problema que `any`, mas localizado. Un
`as` ocasional para un caso que el compilador genuinamente no puede
inferir (y que vos SI podes garantizar por otro medio) esta bien. Un
proyecto lleno de `as` en cada archivo es un proyecto que dejo de confiar
en su propio sistema de tipos.

`satisfies` es casi siempre lo que buscabas en vez de `as`: valida que un
valor cumple un tipo **sin** ensanchar su tipo inferido al tipo declarado
- seguis teniendo el tipo mas preciso disponible, pero con el chequeo.

```ts
const config = {
  retries: 3,
  backoff: "exponential",
} satisfies RetryConfig
// config.backoff sigue siendo el literal "exponential", no el union
// ancho RetryConfig["backoff"] - autocompletado mas preciso mas abajo
```

## Genéricos: cuando sirven y cuando son ceremonia

Un generic sirve cuando **preserva** una relacion de tipos entre la
entrada y la salida (`function first<T>(arr: T[]): T | undefined`). Si tu
generic tiene un solo uso, con un solo tipo concreto real en todo el
codebase, no es un generic - es un tipo concreto disfrazado de flexible
"por si algun dia hace falta". Ese "por si algun dia" no llega casi nunca,
y mientras tanto el generic le agrega una capa de indireccion a cada
lector.

## `readonly` como señal de intencion

`readonly` en un array/tupla/propiedad no es solo defensivo - documenta
que ese dato no se muta desde aca, lo cual es informacion real para quien
lee la firma sin abrir la implementacion. `noUncheckedIndexedAccess` en
`tsconfig.json` (que este mismo toolkit usa, ver `tsconfig.json` en la
raiz del repo de ZAI) hace que `array[i]` sea `T | undefined` en vez de
`T` - mas verboso, pero elimina una clase entera de bugs de "asumi que el
indice existia".

## Branded types para primitive obsession

Si tu codigo pasa `string` para representar `UserId`, `Email`, y
`ProductSku` en la misma firma de funcion, el compilador no te va a
avisar si los invertis por accidente - los tres son "solo" `string`. Un
branded type le agrega una marca fantasma que solo existe en tiempo de
compilacion:

```ts
type UserId = string & { readonly __brand: "UserId" }
type Email = string & { readonly __brand: "Email" }

function sendWelcomeEmail(to: Email, userId: UserId) { /* ... */ }
// sendWelcomeEmail(userId, email) ahora es un error de tipos, no un bug
// que aparece en produccion
```

No lo uses para todo - agrega ceremonia real (necesitas una funcion
constructora que valide y castee). Reservalo para identificadores/valores
que se pasan mucho y donde confundirlos tiene costo real (IDs, dinero,
unidades de medida).

## Utility types: `Pick`/`Omit`/`Partial` esconden intención tan fácil como la revelan

```ts
type CreateUserInput = Omit<User, "id" | "createdAt">
```

Esto es correcto **mientras `User` no cambie de forma que rompa la
intención** - si mañana `User` gana un campo `lastLoginAt` que tampoco
debería pedirse al crear, `Omit<User, "id" | "createdAt">` lo va a
incluir igual, silenciosamente, porque el `Omit` no sabe cuál era tu
intención original, solo excluye lo que le dijiste explícitamente. Para
tipos que reflejan un contrato real (el body de un endpoint, un formulario)
y no un derivado mecánico de otro tipo, declararlo explícito
(`type CreateUserInput = { name: string; email: string }`) es más
verboso pero no depende de que nadie olvide actualizar el `Omit` cuando
`User` cambia.

Usa `Pick`/`Omit`/`Partial` cuando el derivado es genuinamente mecánico y
te interesa que siga la forma de la fuente automáticamente (un tipo de
"parche" para un `PATCH` que por definición son todos los campos de
`User` opcionales: `Partial<User>` ahí sí expresa la intención real, no
la esconde).

## Template literal types para strings con estructura

Cuando un `string` en realidad tiene una forma fija (una ruta de API, una
clave de i18n, un evento con namespace), un template literal type
convierte errores de tipeo en errores de compilación en vez de bugs en
runtime:

```ts
type ApiRoute = `/api/${"users" | "orders" | "billing"}/${string}`
type DomainEvent = `${"order" | "user"}.${"created" | "updated" | "deleted"}`

function emit(event: DomainEvent) { /* ... */ }
emit("order.created")   // ok
emit("order.creatd")    // error de tipos, no un evento que nadie escucha nunca
```

No lo uses para strings genuinamente libres (nombres de usuario, texto
libre) - solo para strings que de verdad tienen una gramática fija que
vale la pena capturar.

## Ejemplo combinado: validar un formulario de punta a punta

Uniones discriminadas + Zod (para el límite runtime) + `satisfies`
combinados, no elegís uno solo:

```ts
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// El resultado de validar SIEMPRE es una unión discriminada -
// el caller no puede leer `data` sin haber chequeado `success`
type LoginResult =
  | { success: true; data: z.infer<typeof LoginSchema> }
  | { success: false; errors: string[] }

function validateLogin(input: unknown): LoginResult {
  const result = LoginSchema.safeParse(input)
  if (!result.success) {
    return { success: false, errors: result.error.issues.map((i) => i.message) }
  }
  return { success: true, data: result.data }
}

// satisfies para configuración estática relacionada, con el tipo más preciso conservado
const loginFormDefaults = {
  email: "",
  password: "",
  rememberMe: false,
} satisfies Partial<z.infer<typeof LoginSchema> & { rememberMe: boolean }>
```

`unknown` en el input (nunca confiar en la forma de algo que llega de
afuera), Zod hace el chequeo real en runtime (los tipos de TypeScript no
existen en runtime, no protegen contra un payload malicioso o mal
formado), la unión discriminada hace que el caller no pueda "olvidarse"
de chequear `success` antes de leer `data`, y `satisfies` mantiene el
tipo más preciso posible en los defaults sin perder el chequeo contra la
forma esperada.
