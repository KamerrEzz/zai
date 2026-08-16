# El costo de separar, y casos reales

Referencia de apoyo para `zai-practices-architecture-service-boundaries`.

## El costo que se paga al separar, y que hay que aceptar conscientemente

En cuanto una operacion de negocio necesita tocar mas de un servicio (un pedido que reserva stock en un servicio Y cobra en otro), perdes la transaccion de base de datos que te daba consistencia gratis en el monolito — necesitas un patron explicito para eso (Saga, ver `zai-practices-patterns-distributed-data`). Si tu operacion principal cruza servicios todo el tiempo, es una señal de que la linea de separacion esta mal trazada — las cosas que cambian juntas deberian vivir juntas.

## Casos reales

Esto no es teorico: Segment (Twilio) publico que fusiono de vuelta mas de 140 microservicios en un monolito porque la coordinacion entre servicios que cambiaban juntos costaba mas que el beneficio de tenerlos separados. El caso inverso tambien es real — Shopify separo selectivamente el renderizado del storefront de su monolito principal, pero solo cuando la señal operacional (necesidad de escalar lectura de forma independiente) fue concreta, no preventiva.

## Fuentes

- [MonolithFirst - Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html) — por que empezar con el monolito casi siempre es la decision correcta.
- [Under Deconstruction: The State of Shopify's Monolith - Shopify Engineering](https://shopify.engineering/shopify-monolith) — separacion selectiva real, con la señal operacional concreta que la disparo.
- [Goodbye Microservices - Segment (Twilio)](https://segment.com/blog/goodbye-microservices/) — la señal inversa: cuando NO separar, con un caso real de haber vuelto atras.
