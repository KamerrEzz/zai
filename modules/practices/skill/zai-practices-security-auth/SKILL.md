---
name: zai-practices-security-auth
description: "Trigger: JWT, token de autenticacion, jwt.verify, algoritmo none, refresh token. Evita los 6 errores mas comunes al emitir/validar JWT."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when writing or reviewing code that issues, verifies, or handles JWT tokens for authentication. Do not use for resource ownership checks (`zai-practices-security-injection`) or dependency risk (`zai-practices-security-supply-chain`).

## Hard Rules
- Fix the verification algorithm server-side (`jwt.verify(token, secret, { algorithms: ["HS256"] })`); never read `alg` from the token header.
- Never accept `alg: none`.
- Generate secrets with real entropy; never hardcode or reuse example secrets.
- Re-verify `role`/`isAdmin` claims against the source of truth; never trust them as-is from the payload.
- Sanitize the `kid` parameter before using it in a file path or query.

## Decision Gates
| Symptom in the code | Fix |
|---|---|
| `jwt.verify(token, secret)` without `algorithms` option | Add fixed `algorithms: [...]` |
| Long-lived token with no revocation path | Add revocation list or short-lived + refresh |
| `role`/`isAdmin` trusted straight from payload | Re-check against source of truth |

## Execution Steps
1. Locate every `jwt.verify`/`jwt.sign` call in the diff.
2. Confirm `algorithms` is passed explicitly and fixed server-side.
3. Confirm secrets are not literals; check they come from env/secret manager.
4. Confirm any `role`/`isAdmin` claim is re-validated, not trusted blindly.
5. If token lifetime > short-lived, confirm a revocation/refresh mechanism exists.

## Output Contract
Report each JWT-handling call site found, whether it passes/fails each Hard Rule above, and the exact line to fix if it fails.

## References
- `references/jwt-six-errors.md` — the six historical CVE patterns with full detail and sources.
