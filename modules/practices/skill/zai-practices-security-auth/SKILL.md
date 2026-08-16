---
name: zai-practices-security-auth
description: Use ONLY when writing or reviewing code that issues, verifies, or handles JWT tokens for authentication. Do not use for authorization/ownership checks on resources (see zai-practices-security-injection) or for dependency/supply-chain risk (see zai-practices-security-supply-chain).
---

# JWT: los mismos seis errores, todavia en 2025

Este skill es conocimiento **defensivo**: como no introducir las
vulnerabilidades que ya se sabe que se explotan en la practica (ver
`zai-practices-security-injection` para el contexto completo de OWASP
Top 10:2025, donde Broken Access Control - la categoría a la que muchos
de estos errores de JWT terminan escalando - sigue en el puesto #1).

Seis CVEs criticos en implementaciones JWT se reportaron solo en 2025.
Los patrones se repiten:

1. **Algoritmo `none`**: aceptar un token sin firma si el header dice
   `alg: none`. Fijá el algoritmo esperado del lado del servidor,
   **nunca** lo leas del token para decidir como validarlo.
2. **Confusion de algoritmo** (RS256 vs HS256): si el servidor usa el
   algoritmo que el token dice tener en vez de uno fijo, un atacante
   puede firmar con la clave publica RSA (conocida) como si fuera un
   secreto HMAC. Mismo fix: algoritmo fijo del lado servidor.
3. **Secretos hardcodeados o debiles** (`"secret"`, `"password"`, vacios,
   copiados de un ejemplo de documentacion). Generá secretos con entropia
   real y gestionalos como cualquier otro credential.
4. **Tokens que nunca se invalidan**: sin revocacion server-side, un
   token robado sirve hasta que expira (default tipico: 30 dias). Si tu
   amenaza incluye robo de token, necesitas una lista de revocacion o
   tokens de vida corta + refresh.
5. **Claims sin validar**: si el payload trae `role`/`isAdmin` y el
   servidor confia en eso sin volver a verificar contra la fuente de
   verdad, cualquiera que pueda modificar (o forjar) el payload escala
   privilegios.
6. **Inyeccion via el parametro `kid`**: si `kid` se usa directo en una
   ruta de archivo o query sin sanitizar, es path traversal o SQL
   injection con pasos extra.

## El fix de los errores #1 y #2: algoritmo fijo del lado servidor

```ts
✗ const payload = jwt.verify(token, secret) // usa el alg que diga el header

✓ const payload = jwt.verify(token, secret, { algorithms: ["HS256"] })
  // el servidor decide el algoritmo, el token no puede elegir por él -
  // esto es lo que cierra la confusion RS256/HS256 y el ataque alg:none
```

## Fuentes

- [JWT Vulnerabilities Testing Guide 2025](https://blog.intelligencex.org/jwt-vulnerabilities-testing-guide-2025-algorithm-confusion) - los seis patrones con detalle técnico.
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/) - donde Broken Access Control (el destino final de un JWT mal validado) sigue siendo #1.
