# Panel de KPIs de operación

## Alcance real (leer antes de los números)

La idea original era medir tres cosas: **volumen**, **tasa de aprobación** y
**errores**. Solo la primera es calculable hoy con lo que hay disponible —
las otras dos requieren datos que el sistema, tal como está armado, no
registra en ningún lugar accesible:

- **Tasa de aprobación.** El flujo human-in-the-loop está diseñado a propósito
  para que el botón ❌ **no escriba nada en la hoja** (solo edita el mensaje
  de Telegram). Eso significa que la hoja únicamente tiene rastro de lo
  *aprobado* — no hay forma de saber cuántas fichas se propusieron y se
  descartaron sin mirar el historial de ejecuciones de Make directamente.
- **Errores.** Si Gemini falla, hoy "se pierde la fila" — no hay Error
  Handler todavía (ver pendiente en el README), así que tampoco queda
  registro de cuántas veces pasó.

Ambas quedan pendientes de una de dos cosas: (a) sumar un Error Handler +
un registro explícito de descartes en la hoja, o (b) pegar acá un snapshot
manual del historial de Make cuando haga falta. No están en este documento
para no mostrar un número inventado.

## Volumen — registros vía bot

Cuenta las filas de `catalogo_completo` con `fuente = "Bot Telegram"`
(las 1.280 filas migradas del historial previo al bot no cuentan, son de
antes de que existiera el registro automático). Se agrupa por `fecha_vista`
como proxy de fecha de registro, porque en la práctica se registra la
película el mismo día que se ve.

Calculado con `cerebro/kpis_operacion.js` (se puede volver a correr en
cualquier momento, lee la hoja en vivo):

```
node cerebro/kpis_operacion.js
```

**Snapshot al 2026-09-20:**

| Métrica | Valor |
|---|---|
| Registros vía bot | 15 |
| Rango | 2026-09-07 a 2026-09-20 (14 días) |
| Promedio | 1,07 / día |
| Pico | 4 en un mismo día (2026-09-13) |

```
2026-09-07  █ 1
2026-09-08  ██ 2
2026-09-10  █ 1
2026-09-12  █ 1
2026-09-13  ████ 4
2026-09-14  █ 1
2026-09-17  █ 1
2026-09-18  █ 1
2026-09-19  ██ 2
2026-09-20  █ 1
```

15 registros es una muestra chica (el bot lleva 2 semanas activo), así que
esto es más un punto de partida que una tendencia — vale la pena re-correr
el script dentro de un mes y comparar.
