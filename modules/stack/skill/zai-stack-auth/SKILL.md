---
name: zai-stack-auth
description: "Trigger: libreria de autenticacion, better-auth, Passport.js, SSO, SAML, LDAP. Elige entre better-auth y Passport.js para un proyecto nuevo."
license: MIT
metadata:
  author: KamerrEzz
  version: "1.0"
---

## Activation Contract
Usar cuando haya que elegir una libreria de autenticacion para un proyecto nuevo: better-auth vs Passport.js. No usar una vez que el auth ya esta implementado, ni para logica de autorizacion/permisos (un concern separado de la autenticacion).

## Hard Rules
- Default: better-auth. Solo cambiar a Passport.js cuando se necesite SSO empresarial, SAML o LDAP.
- Nunca elegir Passport.js "por las dudas" o por familiaridad si el proyecto no necesita esos protocolos.
- Si una integracion SSO mencionada en el spec no es claramente empresarial/SAML/LDAP, pregunta al usuario antes de elegir — migrar auth a mitad de proyecto sale caro.

## Decision Gates
| Condicion | Libreria |
|---|---|
| El proyecto necesita SSO empresarial, SAML, o LDAP | Passport.js (con la estrategia especifica) |
| Cualquier otro caso (email+password, OAuth social, magic link, passkeys) | better-auth |

## Execution Steps
1. Revisar el spec por requisitos de SSO empresarial/SAML/LDAP.
2. Si estan presentes, elegir Passport.js con la estrategia especifica necesaria.
3. Si no, default a better-auth.
4. Si la mencion de SSO es ambigua, preguntar al usuario antes de decidir.

## Output Contract
Indicar la libreria elegida (better-auth o Passport.js), la condicion que la motivo, y la estrategia especifica de Passport si aplica.
