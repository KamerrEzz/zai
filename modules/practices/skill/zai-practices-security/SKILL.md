---
name: zai-practices-security
description: Use ONLY when writing code that handles authentication, authorization, user input, external dependencies, or network requests - or when reviewing code for security issues. This is defensive knowledge (how to not introduce vulnerabilities), not an offensive playbook. Do not use for generic code review unrelated to security-sensitive surfaces.
---

# Seguridad defensiva: lo que hay que saber en 2026, no en 2021

Este skill es conocimiento **defensivo**: como no introducir las
vulnerabilidades que ya se sabe que se explotan en la practica. No es una
guia de como explotar nada. Si el gate `zai.stack` (`Gate E`, ver
`docs/RESEARCH.md`) te bloqueo por una dependencia joven, la razon de
fondo es exactamente esta: tu conocimiento de entrenamiento tiene fecha de
corte, y en seguridad eso importa mas que en casi cualquier otro tema —
las fuentes de abajo son de 2025-2026, no supuestos viejos.

## OWASP Top 10:2025 - que cambio y por que importa

El Top 10 se reordeno de forma significativa respecto a la version 2021,
no es solo un refresh cosmetico:

1. **Broken Access Control** sigue en el puesto #1 - la falla mas comun
   sigue siendo "el usuario A puede acceder/modificar datos del usuario
   B" en cualquiera de sus formas (IDOR, falta de chequeo de ownership,
   endpoints admin sin verificar rol).
2. **Security Misconfiguration** subio del puesto #5 al #2 - defaults
   inseguros, headers faltantes, permisos de cloud/storage demasiado
   abiertos, CORS mal configurado.
3. **Software Supply Chain Failures** es una categoria **nueva** que
   cubre todo el ciclo de vida: dependencias, build systems, pipelines de
   CI/CD, plataformas de terceros - no solo "libreria con CVE conocido"
   como antes. Ver la seccion de supply chain mas abajo, es la que mas
   cambio el terreno en los ultimos dos años.
4. **Mishandling of Exceptional Conditions** es otra categoria nueva:
   timeouts, sobrecarga, inputs raros que la app no esperaba y que abren
   una puerta cuando el manejo de errores es descuidado (stack traces
   expuestos, estados inconsistentes tras una excepcion no controlada).
5. SSRF se fusiono dentro de Broken Access Control como sub-caso (seguí
   tratandolo como su propio problema tecnico, ver mas abajo - la fusion
   es de categorizacion, no de relevancia).

(Fuente: OWASP Top 10:2025, owasp.org/Top10/2025/.)

## Supply chain: el riesgo que mas creció, y por que te toca a vos como usuario de un agente de codigo

2025 fue el año donde los ataques de supply chain en npm pasaron de
"molestia ocasional" a amenaza de alto impacto:

- **Shai-Hulud** (septiembre 2025): el primer **worm auto-propagante** en
  el registro de npm. Robaba tokens de npm/cloud y los usaba para
  publicarse solo en mas paquetes. Primera ola: 180+ paquetes. Shai-Hulud
  2.0 llego a casi 800, tocando proyectos vinculados a Zapier, PostHog y
  Postman.
- **`debug`/`chalk` y otros 16 paquetes** (septiembre 2025): librerias con
  millones de descargas semanales secuestradas, con codigo malicioso
  apuntado a robar wallets de criptomonedas.
- **Compromiso de `axios`** (marzo 2026): dos versiones maliciosas
  publicadas y removidas en ~3 horas, pero con ~100M de descargas
  semanales el paquete, la ventana de exposicion importa igual.
- **`@redhat-cloud-services`** (junio 2026): el atacante bypasseo la
  revision de codigo por completo, publicando 32+ paquetes comprometidos.

**Lo especifico a un toolkit de agentes de codigo (como este)**: los
ataques a herramientas de IA para codear ya no son hipoteticos. En
febrero 2026 un issue malicioso en GitHub disparo un compromiso de
supply chain en el paquete npm de la herramienta de codigo Cline. En
marzo 2025, un compromiso de `tj-actions/changed-files` (una GitHub
Action, no un paquete npm, pero el mismo vector de confianza transitiva)
afecto ~23.000 repositorios. El patron de fondo: un agente con permisos
de escritura y capacidad de correr `bash` (como los que este mismo
toolkit orquesta) es, si se compromete una dependencia que usa, un vector
de propagacion — no solo una app comprometida.

Mitigaciones concretas, no genericas:

- **Pineá versiones exactas** de dependencias criticas (no `^`/`~`) para
  las que la superficie de riesgo importa, y revisá el lockfile en el
  diff de cada PR que lo toque - un lockfile que cambia sin que
  `package.json` cambie es una señal de alerta.
- **Auditá antes de actualizar**, no solo despues: `pnpm audit` /
  `npm audit`, y considerá herramientas de deteccion de comportamiento
  malicioso en postinstall scripts (Socket.dev y similares) si el
  proyecto lo justifica.
- **Nunca corras `postinstall` scripts de paquetes que no revisaste** en
  un entorno con credenciales reales (tokens de CI, claves cloud) -
  exactamente el vector que uso Shai-Hulud para auto-propagarse.
- Si este toolkit (ZAI) te bloquea con el Gate E de contexto7 en una
  dependencia joven: es exactamente esta clase de riesgo la que la regla
  intenta mitigar, no burocracia porque si.

## Prompt injection y agentes de codigo: el riesgo especifico de 2026

Con agentes de IA que tienen `bash`, escritura de archivos, y acceso a
credenciales, **prompt injection** paso a ser la vulnerabilidad mas citada
en despliegues de IA agentica en produccion durante 2025-2026. El cambio
de superficie de ataque es clave: antes, un atacante necesitaba acceso de
escritura a un repo de confianza; ahora, alcanza con poder **crear un
issue o un PR** que un agente vaya a leer - el agente hace de puente hacia
acciones con permisos reales.

Si construis o usas herramientas que le dan a un agente de IA acceso a
`bash`/escritura de archivos/credenciales (como hace este mismo toolkit
con `zai-implementer`, `zai-planner`):

- **Nunca le des a un agente credenciales de mas alcance del que su tarea
  puntual necesita** - es el mismo principio de permisos minimos que
  `modules/phases/agents/` ya aplica por diseño (cada agente de ZAI solo
  tiene las tools que su rol necesita, ver `docs/DECISIONS.md`).
- **Contenido externo que un agente lee (issues, PRs, resultados de
  busqueda web, contenido de paginas) es input no confiable** - tratalo
  con la misma sospecha que el input de un usuario en un formulario web.
  Un agente que ejecuta instrucciones encontradas dentro de un archivo que
  se supone que solo tenia que *leer* es exactamente el patron de
  explotacion.
- Los gates de este toolkit (`tool.execute.before`, ver
  `docs/RESEARCH.md` seccion 9) son un ejemplo concreto de mitigacion:
  interceptar la accion antes de que ocurra, no confiar en que el modelo
  "decida bien".

## JWT: los mismos seis errores, todavia en 2025

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

## SSRF: no confíes en blacklists ni regex para validar URLs

Node y la mayoria de las librerias HTTP aceptan URLs provistas por el
usuario sin validar DNS/IP de destino. Blacklists y regex fallan
sistematicamente (DNS rebinding, redirects, IPs representadas de formas
no obvias como decimal/octal). La defensa real: **allowlist de destinos
conocidos** cuando sea posible, y si no, resolver el DNS vos mismo y
validar que la IP resuelta no caiga en rangos privados/loopback/link-local
antes de conectar - no confiar en que la libreria HTTP lo haga por vos.

## Prototype pollution (JS/TS especifico)

Mezclar un objeto controlado por el usuario dentro de otro (`Object.assign`,
merges recursivos, algunas libs de parsing de query strings) puede
contaminar `Object.prototype` si no se filtran las claves `__proto__`,
`constructor`, `prototype`. Mitigaciones concretas: `Object.create(null)`
para diccionarios que reciben claves externas, validar/filtrar esas
claves explicitamente antes de cualquier merge, y mantener actualizadas
las librerias de parsing (varias CVEs de este tipo salen de libs de
merge/parse, no de código propio).

## Mantené las dependencias del framework al día - no es opcional

En diciembre 2025, React Server Components tuvo una vulnerabilidad de
deserializacion insegura (CVE-2025-55182, CVSS 10.0) que permitia RCE no
autenticado - **una app de Next.js recien creada con `create-next-app`,
sin ningun codigo propio, ya era vulnerable en produccion**. Esto no es un
caso hipotetico de "hay que actualizar dependencias" en abstracto: es la
prueba de que el framework en si, no solo tu código, es superficie de
ataque, y que la ventana entre "CVE publicado" y "explotacion activa en
el mundo real" puede ser de dias.

## El principio detras de todo esto

Ningun patron de arriba se defiende con una sola linea de codigo aislada
- se defiende con **input no confiable tratado como no confiable en todos
lados** (payloads de JWT, URLs, claves de objetos, contenido que un
agente de IA lee), **permisos minimos por default** (JWT, agentes de IA,
dependencias con acceso a postinstall), y **dependencias/frameworks al
dia**, verificados contra fuentes actuales - no contra lo que sabias hace
dos años.

Sources: [OWASP Top 10:2025](https://owasp.org/Top10/2025/), [npm Supply Chain Attacks 2026](https://shattered.io/npm-supply-chain-attacks-2026/), [Shai-Hulud 2.0 - Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2025/12/09/shai-hulud-2-0-guidance-for-detecting-investigating-and-defending-against-the-supply-chain-attack/), [Axios compromise - Upwind](https://www.upwind.io/feed/npm-supply-chain-attack-massive-compromise-of-debug-chalk-and-16-other-packages), [AI Agent Prompt Injection - Cloud Security Alliance](https://labs.cloudsecurityalliance.org/research/csa-research-note-claude-code-github-action-prompt-injection/), [JWT Vulnerabilities Testing Guide](https://blog.intelligencex.org/jwt-vulnerabilities-testing-guide-2025-algorithm-confusion), [SSRF Prevention in Node.js - OWASP](https://owasp.org/www-community/pages/controls/SSRF_Prevention_in_Nodejs), [Critical Security Vulnerability in React Server Components](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components).
