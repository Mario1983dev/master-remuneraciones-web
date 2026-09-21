# Comparación de contenido: referencia y PDF histórico

Revisión de `C:/Users/mario/OneDrive/Escritorio/lquidacion.pdf` frente al PDF anterior y al revisado de la liquidación guardada N.º 2. Se extrajo el texto de los tres PDF y se verificó visualmente el resultado. Las rutas de datos siguientes son relativas al snapshot. El contrato de guardado y el cálculo se leyeron para identificar equivalencias; no se modificaron ni ejecutaron para generar el PDF.

| Orden | Campo de la referencia | Fuente histórica / equivalencia | Resultado de la revisión |
|---|---|---|---|
| 1 | LIQUIDACION DE SUELDOS Y REMUNERACIONES | Texto fijo | Ya estaba. |
| 2 | Nombre del trabajador | trabajador.nombres, apellido_paterno, apellido_materno | Ya estaba. |
| 3 | RUT N° | trabajador.rut | Ya estaba; se conserva tal como fue guardado. |
| 4 | sueldo base del mes + mes/año | resultados.sueldo_proporcional; mes, anio | Ya estaba. Corresponde al sueldo del período guardado, sin recalcular desde sueldo_base y días. |
| 5 | Diferencia sueldo mes | No existe en el contrato actual | Ahora indica No guardado. No se resta sueldo_base de sueldo_proporcional. |
| 6 | Anticipo de Gratificación | datos.gratificacion | Ya estaba, también cuando vale cero. |
| 7 | TOTAL REMUNERACIONES IMPONIBLES | resultados.base_imponible | Ya estaba y aparece en la liquidación real. La fixture anterior carecía de este campo. |
| 8 | Cargas familiares | datos.cargas_familiares (cantidad) | Agregada la cantidad, incluso cero, junto al rótulo. El importe de asignación familiar NO está guardado y se indica No guardado en la columna monetaria. |
| 9 | Bono No Imponible | No existe en el contrato actual | No guardado. datos.bonos y datos.otros_haberes son imponibles y no son equivalentes. |
| 10 | Movilizacion | datos.movilizacion | Ya estaba. |
| 11 | Colacion | datos.colacion | Ya estaba. |
| 12 | TOTAL HABERES | resultados.total_haberes | Ya estaba. |
| 13 | DESCUENTOS DE CARGO DEL TRABAJADOR | Texto fijo | Ya estaba. |
| 14 | Cot. (INP): tasa e importe | No existen en el contrato actual | No guardado. No se usa pension_obligatoria como si fuera una cotización INP. |
| 15 | Cot. AFP + institución, tasa e importe | afp.afp_nombre; parametros.pension_obligatoria_pct, afp.comision_pct; resultados.descuento_afp | Ya estaba. La tasa agregada no está guardada: se conservan los componentes separados con “+”, sin sumarlos. Si falta descuento_afp, se muestran pension_obligatoria y comision_afp por separado. |
| 16 | Isapre | datos.salud_tipo, datos.salud_institucion; resultados.descuento_salud | Ya estaba cuando corresponde a ISAPRE. Con FONASA, ahora indica No aplica, sin inventar cero. |
| 17 | Cot. Fonasa: tasa e importe | datos.salud_tipo; parametros.salud_legal_pct; resultados.descuento_salud | Ya estaba cuando corresponde a FONASA. Con ISAPRE indica No aplica. |
| 18 | Descto. Seguro Ctia.: tasa e importe | regla_cesantia.trabajador_cic_pct; resultados.cesantia_trabajador | Ya estaba. La tasa de la liquidación real se imprime directamente; no se copia el porcentaje del ejemplo. |
| 19 | Impuesto Unico a Trab. | resultados.iusc | Ya estaba, también cero. |
| 20 | CALCULO IMPTO. RENTA | Texto fijo | Ya estaba. El bloque muestra resultados almacenados, no ejecuta un cálculo nuevo. |
| 21 | Remuneracion | resultados.base_imponible | Ya estaba. |
| 22 | Destos. Prev.(-) | No hay un subtotal histórico guardado | No guardado. No se suman AFP, salud y cesantía, ni se restan bases. |
| 23 | Remunr. Neta (=) | resultados.base_tributable | Ya estaba. Es la base tributaria del bloque de impuesto; no es el líquido final ni la base previsional. |
| 24 | Remuner. Adic. | No existe como concepto tributario separado | No guardado. No se sustituyen bonos, aguinaldo u otros haberes por este concepto. |
| 25 | TOTAL IMPTO.S/TABLA | resultados.iusc | Ya estaba. No se consulta ni aplica nuevamente la tabla IUSC. |
| 26 | OTROS DESCUENTOS: | datos.otros_descuentos; datos.apv_monto/apv_regimen y datos.prestamos cuando corresponden | Se conservó el detalle existente y se agregó la visualización de Otros: 0 cuando el importe guardado es cero. No se calcula un subtotal nuevo. |
| 27 | TOTAL DESCUENTOS | resultados.total_descuentos | Ya estaba. |
| 28 | ALCANCE LIQUIDO | No está guardado el subtotal anterior a anticipos | No guardado. No se suma el anticipo al líquido final, aunque en un caso particular puedan coincidir. |
| 29 | MENOS ANTICIPOS | datos.anticipos | Ya estaba, también cero. No se vuelve a descontar del líquido. |
| 30 | SALDO LIQ. A PAGAR | resultados.liquido_pagar | Ya estaba. |
| 31 | SON + monto en palabras | Representación textual de resultados.liquido_pagar | Ya estaba. No altera el monto. |
| 32 | Certifico que he recibido de ; + empresa | Texto fijo y empresa.name | Ya estaba. |
| 33 | Declaración final de conformidad | Texto fijo de la referencia | Ya estaba, con sus cuatro líneas. |
| 34 | Firma del Empleado | Rótulo y espacio de firma | Ya estaba. La referencia tampoco contiene una firma manuscrita; no se inventa una. |
| 35 | Fecha al pie | El contrato actual no guarda fecha de pago/firma | No guardada. Si un snapshot contiene fecha_pago (directamente o en datos), se conserva su lectura histórica. No se usa created_at, la fecha actual ni el cierre de mes. |

La cantidad de cargas familiares y su importe son datos distintos. Del mismo modo, una tasa AFP combinada no equivale a una de sus tasas componentes. No se calcularon los valores ausentes para completar casillas.

Los haberes adicionales que existen en SoluPrime se conservan en su sección (horas extra, bonos, comisiones, aguinaldo y otros haberes), sin alterar el orden relativo de los campos de la referencia.

## Cambios aplicados

Backend real: `C:/PROYECTOS ANGULAR/ERP/master api/`.

- `src/services/remuneraciones-liquidaciones-pdf.js`: cantidad de cargas, otros descuentos cero y estados explícitos de ausencia/no aplicación.
- `src/services/remuneraciones-liquidaciones-pdf.storage.js`: versión `carta-contenido-v3`, para servir el documento actualizado sin reutilizar la copia anterior.
- `test/remuneraciones-liquidaciones-pdf.test.js`: orden de todos los campos, equivalencias, ceros, ausencias y conservación de valores históricos.

No se modificó el snapshot, el guardado, los cálculos, Contabilidad, parámetros publicados, edición ni frontend.

## Validación

- 11 pruebas PDF aprobadas; verificación sintáctica de los dos módulos correcta.
- Generación real desde el snapshot guardado de la liquidación N.º 2, empresa N.º 2.
- Comparación con el PDF anterior: los importes monetarios ya impresos se conservan sin cambios.
- Una página carta de 612 x 792 puntos, renderizada con Poppler e inspeccionada visualmente.
- Archivo físico verificado y reutilizado en una segunda solicitud al servicio de almacenamiento:
  `C:/PROYECTOS ANGULAR/ERP/master api/storage/liquidaciones/2/2/ef0f19f2b2575f98837be8428b5b736d121a5ffebe79cecf034733c1fbe50b12.pdf`.
- Copia para revisión: `output/pdf/liquidacion-2-contenido.pdf`.
