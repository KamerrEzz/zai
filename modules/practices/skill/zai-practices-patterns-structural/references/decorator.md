# Decorator — ejemplo completo

**Qué hace**: agrega comportamiento a un objeto envolviéndolo, sin tocar
su clase original.

```ts
function withRetry(sender: EmailSender, maxAttempts = 3): EmailSender {
  return {
    async send(to, subject, body) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try { return await sender.send(to, subject, body) }
        catch (err) {
          if (attempt === maxAttempts) throw err
          await sleep(2 ** attempt * 100) // backoff exponencial
        }
      }
    },
  }
}

function withLogging(sender: EmailSender): EmailSender {
  return {
    async send(to, subject, body) {
      console.log(`enviando email a ${to}: ${subject}`)
      return sender.send(to, subject, body)
    },
  }
}

// Combinables, cada uno independiente:
const sender = withLogging(withRetry(new SendGridEmailSender()))
```

**Cuándo SÍ**: necesitás combinar comportamientos de forma independiente
(logging + retry + cache alrededor de una llamada, cada uno opcional y
combinable) sin una explosión de subclases para cada combinación.

**Cuándo NO**: el comportamiento extra es fijo y único - ahí va adentro de
la función/clase directamente.
