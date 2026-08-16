# Factory — ejemplo completo

**Qué hace**: centraliza la lógica de construcción de un objeto cuando esa
construcción es no trivial.

```ts
function createNotificationChannel(user: User): NotificationChannel {
  if (user.preferences.channel === "push" && user.pushToken) return new PushChannel(user.pushToken)
  if (user.preferences.channel === "sms" && user.phone) return new SmsChannel(user.phone)
  return new EmailChannel(user.email) // fallback siempre disponible
}
```

**Cuándo SÍ**: construir el objeto correcto depende de lógica real (qué
implementación de Strategy usar según datos que solo se conocen en
runtime, con fallbacks).

**Cuándo NO**: es un constructor con nombre distinto. Si `new Cosa(args)`
alcanza y no hay lógica de decisión en la construcción, un factory
alrededor no agrega nada.
