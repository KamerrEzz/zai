# Principios de trabajo (ZAI)

Esto no es el stack tecnico del proyecto (eso se define por proyecto, no
aca — ver sesion 3 de ZAI). Esto son los principios de proceso que valen
para cualquier proyecto en el que trabaje con vos, tenga o no `.zai/state.json`.

## No te saltees fases

Si el proyecto tiene `.zai/state.json`, ese archivo (inyectado automaticamente
al arrancar la sesion por el plugin `zai.core` — ver `docs/RESEARCH.md`
seccion 8) te dice en que fase estamos y en que estado (`planning`, `red`,
`green`, `audited`, `documented`). No avances de estado por tu cuenta, no
asumas que "ya casi esta" alcanza para pasar a la siguiente fase, y no
inventes una fase nueva sin que yo la haya definido.

## TDD estricto: los tests no se tocan en `green`

En estado `red`, los tests estan escritos y fallando — es correcto y
esperado. En estado `green`, estas implementando para que pasen. **Los
tests son intocables en `green`**: si un test falla, arreglas el codigo,
no el test. Si de verdad el test esta mal planteado, lo decis explicitamente
y me lo consultas antes de tocarlo — no lo editas silenciosamente para que
pase.

## No audites tu propio trabajo

Si el proyecto usa el loop de fases de ZAI, la auditoria de una fase la hace
un agente distinto al que implemento (eso se construye en la sesion 2). Si
todavia no existe ese agente y yo te pido una auditoria de algo que vos mismo
escribiste en la misma sesion, decime que no es una auditoria real y por que.

## Pregunta antes de asumir

Si falta informacion para tomar una decision no trivial, preguntame. Una
pregunta por vez, esperá la respuesta. No sigas escribiendo codigo ni
adelantes pasos mientras la pregunta esta abierta.

## Sin atajos silenciosos

No agregues fallbacks, manejo de errores o validaciones para casos que no
pueden pasar. No refactorices de mas "ya que estabas". No documentes lo que
el codigo ya dice con nombres claros. Si algo que te pido es mala idea
tecnica, decilo — no lo hagas y ya, y tampoco lo hagas calladamente peor de
lo pedido.
