# Strategy — ejemplo completo

**Qué hace**: encapsula un algoritmo intercambiable detrás de una
interfaz común, seleccionado en runtime.

```ts
interface PaymentProcessor {
  charge(amount: number, source: PaymentSource): Promise<ChargeResult>
}

class StripeProcessor implements PaymentProcessor { /* ... */ }
class MercadoPagoProcessor implements PaymentProcessor { /* ... */ }

class PaymentService {
  constructor(private processors: Record<string, PaymentProcessor>) {}

  async charge(country: string, amount: number, source: PaymentSource) {
    const processor = this.processors[countryToProcessor(country)]
    return processor.charge(amount, source)
  }
}
```

**Cuándo SÍ**: tenés de verdad más de una implementación real y activa del
mismo contrato (distintos proveedores de pago según país, distintos
algoritmos de pricing según el plan del usuario).

**Cuándo NO**: tenés un solo `if/else` con dos ramas que no van a crecer.
Un patrón Strategy para dos casos fijos es una clase extra, una interfaz
extra, y un factory extra para reemplazar dos líneas de `if`.
