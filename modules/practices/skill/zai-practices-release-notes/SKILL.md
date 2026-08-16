---
name: zai-practices-release-notes
description: Use ONLY when a project already publishes GitHub Releases (or is about to start) and you need to write release notes, or when turning a release into a social media announcement (Discord, X/Twitter). Do not use for CHANGELOG.md entries themselves (see zai-practices-changelog) - this skill is about translating those entries into reader-facing prose for a release page or a public post.
---

# Release notes y anuncios: traducir el changelog para quien no lo va a leer

`CHANGELOG.md` (ver `zai-practices-changelog`) es para alguien evaluando
si actualizar - denso, tecnico, una linea por cambio. Una release note o
un anuncio en redes es para alguien que **no** va a leer el changelog -
necesita el gancho antes que el detalle.

## Paso 0: confirmá si el proyecto ya usa releases antes de asumir que hace falta

No le impongas GitHub Releases a un proyecto que nunca los uso - eso es
una decision del dueño del repo, no algo que se activa solo. Antes de
escribir una release note, confirmá:

```sh
gh release list --limit 5
```

- **Si ya hay releases previos**: seguí el mismo tono/formato que los
  anteriores (mirá 2-3 recientes con `gh release view <tag>`) - consistencia
  entre releases importa mas que la version "ideal" de release note.
- **Si no hay ninguno**: no asumas que hay que crear uno. Es una decision
  del usuario, no algo que se infiere de que el changelog tiene una
  entrada nueva. Si el toolkit ZAI te esta orquestando esto via
  `/zai-fase-close`, `zai-scribe` chequea esta condicion explicitamente
  (ver `modules/phases/agents/zai-scribe.md`) y solo redacta una release
  note si el chequeo confirma que el proyecto ya las usa.

## De entrada tecnica a release note: el mismo cambio, dos audiencias

```markdown
Entrada de CHANGELOG.md (audiencia: quien decide si actualizar):
### Fixed
- Los tokens de sesion ahora expiran a los 15 minutos de inactividad
  (antes: nunca expiraban).
```

```markdown
Release note (audiencia: cualquiera que use el producto):
## 🔒 Sesiones más seguras

Ahora tu sesión se cierra sola después de 15 minutos sin actividad. Antes
podía quedar abierta para siempre en un dispositivo compartido - ya no.
```

La diferencia no es "mas simpático" superficialmente - es que la release
note lidera con **el beneficio para quien lee**, no con el mecanismo
tecnico. "Ahora tu sesión se cierra sola" es el titular; "expiran a los 15
minutos de inactividad" es el detalle que va despues, si va.

## Estructura de una release note completa

```markdown
# v1.2.0 - <título corto y humano, no "release 1.2.0">

<1-2 frases de qué es lo más importante de esta versión, si hay un
cambio que domina sobre los demás - no todas las releases lo necesitan>

## ✨ Novedades
- <beneficio para quien usa, no el nombre técnico del feature>

## 🐛 Arreglos
- <qué se sentía roto antes, ahora no>

## ⚠️ Cambios importantes
- <solo si hay breaking changes - decilo temprano y claro, no lo escondas
  al final esperando que nadie llegue ahí>
```

Omití secciones vacías - una release que solo trae fixes no necesita el
encabezado `## ✨ Novedades` vacío arriba.

## De release note a anuncio social: mismo contenido, otra forma

**Discord** (permite markdown, formato más largo, la audiencia ya sigue
el proyecto de cerca):

```markdown
**🚀 v1.2.0 ya está disponible**

Lo más importante: las sesiones ahora expiran solas después de 15
minutos sin actividad - más seguro si compartís el dispositivo con
alguien.

También:
• <otro punto breve>
• <otro punto breve>

Changelog completo: <link>
```

**X/Twitter** (límite de caracteres, audiencia que no sigue el proyecto de
cerca - necesita entender el gancho sin contexto previo):

```
v1.2.0: las sesiones ahora se cierran solas a los 15 min de inactividad.

Si compartís tu compu con alguien, esto es para vos.

<link al release>
```

Reglas para el recorte a X/Twitter: **un solo punto**, el más relevante
para alguien que no sabe qué es tu proyecto - no intentes meter los cinco
cambios del release en 280 caracteres, eso da un tuit ilegible que nadie
retiene. Si hay más de un cambio importante, son varios posts, no uno
comprimido.

## Publicar el release en sí

`zai-scribe` (subagente de este toolkit) no tiene `bash` - redacta el
contenido, pero quien lo invocó (`zai-planner`) es quien corre:

```sh
gh release create <tag> --title "<título>" --notes-file <archivo-con-el-contenido-de-arriba>
```

No uses `--generate-notes` de `gh` como reemplazo de esto - genera una
lista automática de PRs/commits, exactamente el formato técnico que este
skill existe para traducir. Sirve como punto de partida para no perder
ningún cambio, no como la release note final.
