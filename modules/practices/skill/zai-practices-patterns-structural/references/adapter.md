# Adapter — ejemplo completo

**Qué hace**: traduce la interfaz de algo externo a la interfaz que tu
dominio espera.

```ts
// Tu dominio espera esto:
interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>
}

// SendGrid tiene su propia forma de API - el adapter la esconde
class SendGridEmailSender implements EmailSender {
  async send(to: string, subject: string, body: string) {
    await this.client.send({ to, from: FROM_ADDRESS, subject, html: body })
  }
}
```

**Cuándo SÍ**: siempre que integres algo externo cuya interfaz no
controlás y no querés que el dominio dependa de su forma específica - es,
en la práctica, el mismo mecanismo que un "port" de arquitectura
hexagonal (ver `zai-practices-architecture-layering`) aplicado a una
librería puntual.

**Cuándo NO**: la librería externa ya tiene exactamente la interfaz que
necesitás y no hay ninguna razón concreta para pensar que vas a
cambiarla.
