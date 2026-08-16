---
name: zai-stack-auth
description: Use ONLY when choosing an authentication library for a new project - better-auth vs Passport.js. Do not use once auth is already implemented in a project, or for authorization/permissions logic (that's a separate concern from authentication).
---

# better-auth vs Passport.js

## Arbol de decision

- **El proyecto necesita SSO empresarial, SAML, o LDAP** -> **Passport.js**
  con la estrategia especifica que corresponda. better-auth no cubre estos
  protocolos.
- **Cualquier otro caso** (email+password, OAuth social - Google, GitHub,
  etc -, magic link, passkeys) -> **better-auth**.

## Default

**better-auth.** Es el caso por defecto real: la enorme mayoria de los
proyectos usan auth estandar, no SSO empresarial. Passport.js queda
reservado exclusivamente para cuando el protocolo especifico lo exige - no
lo seleccione "por las dudas" ni por familiaridad si el proyecto no lo
necesita.

## Si el proyecto no encaja claramente

Si el spec de la fase menciona integraciones de auth que no reconoces con
certeza (un proveedor SSO puntual, por ejemplo), pregúntale al usuario si
eso cuenta como "empresarial/SAML/LDAP" antes de elegir - no lo asumas
para no terminar migrando auth a mitad de proyecto.
