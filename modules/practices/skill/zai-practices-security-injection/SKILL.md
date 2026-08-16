---
name: zai-practices-security-injection
description: "Trigger: IDOR, ownership check, SSRF, URL de usuario, prototype pollution, __proto__, broken access control. Previene input no confiable segun OWASP Top 10:2025."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Load when writing code that checks resource ownership/access control, makes outbound HTTP requests to a possibly user-influenced URL, or merges externally-controlled objects. Do not use for JWT/token handling (`zai-practices-security-auth`) or dependency/supply-chain risk (`zai-practices-security-supply-chain`).

## Hard Rules
- Always compare `resource.userId === requestingUserId` before returning a resource fetched by ID; never treat "exists" as "is yours".
- On ownership failure return 404, never 403 (don't confirm the ID exists).
- Never validate outbound URLs with a blacklist or regex; always allowlist known hosts and resolve DNS yourself, rejecting private/loopback/link-local resolved IPs.
- Never merge an externally-controlled object into another without filtering `__proto__`, `constructor`, `prototype` keys first.

## Decision Gates
| Symptom in the code | Fix |
|---|---|
| `findUnique`/`findById` fetch with no ownership check after | Compare `resource.userId` vs `requestingUserId`, 404 if mismatch |
| `!url.includes("localhost")`-style blacklist/regex URL check | Allowlist of hosts + self-resolved DNS + private/loopback IP check |
| `Object.assign(base, userInput)` or recursive merge on user input | Filter `__proto__`/`constructor`/`prototype` before merge |

## Execution Steps
1. Find every fetch-by-ID (`findUnique`, `findById`, etc.) and confirm it checks ownership against the authenticated user.
2. Find every outbound HTTP request whose URL/host can come from user input; confirm allowlist + self-resolved DNS.
3. Find every `Object.assign`/spread/recursive merge over an object with externally-controlled keys; confirm dangerous keys are filtered.
4. Confirm ownership failures return 404, not 403.
5. Report any finding with no fix, citing the exact line.

## Output Contract
Report each site found (ownership check, outbound URL, object merge), whether it passes/fails each Hard Rule above, and the exact line to fix if it fails.

## References
- `references/injection-examples.md` — full ✗/✓ code for IDOR, SSRF, and prototype pollution, the OWASP Top 10:2025 reshuffle context, and sources.
