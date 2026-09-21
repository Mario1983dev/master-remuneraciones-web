# PDF histórico de liquidaciones

La revisión de contenido campo por campo y la validación con la liquidación real N.º 2 están en [pdf-liquidaciones-contenido.md](pdf-liquidaciones-contenido.md).

## Implementación

Se reutilizan PDFKit y `GET /api/remuneraciones/liquidaciones/:id/pdf`. El endpoint exige autenticación, permiso de Remuneraciones y acceso a la empresa/oficina antes de leer o servir cualquier archivo. Responde `application/pdf`, `Content-Disposition: inline` y `Cache-Control: no-store`.

El botón **Ver PDF** abre una pestaña durante el clic y obtiene el archivo mediante la petición HTTP autenticada existente. El visor del navegador permite visualizar, imprimir y descargar. El Blob permanece disponible hasta cerrar la pestaña, incluso si se abandona la lista de liquidaciones. Los errores cierran la pestaña pendiente y se muestran en la lista; el bloqueo de ventanas emergentes tiene un mensaje específico.

## Patrón visual

Referencia localizada en `C:/Users/mario/OneDrive/Escritorio/lquidacion.pdf` (el Escritorio de Windows está redirigido a OneDrive).

- Tamaño carta: 612 x 792 puntos (21,59 x 27,94 cm), según el ajuste solicitado.
- Geometría basada en la referencia, con borde exterior continuo y líneas interiores suaves. Sin cuadrícula en márgenes, título ni firma.
- Fuentes Libre Franklin Regular y Bold incrustadas, con licencia OFL incluida.
- Distribución del encabezado, columnas, totales, declaración final y firma conservada; formulario centrado en carta.
- Haberes adicionales se insertan dentro del bloque disponible reduciendo su altura; no agregan páginas.
- Nombres y textos extraordinariamente largos reducen su tamaño para no desbordar.
- El importe en letras representa el líquido almacenado; no calcula remuneraciones.

Las fuentes proceden de `https://github.com/impallari/Libre-Franklin/tree/master/fonts/TTF`.

## Datos históricos y diferencias necesarias

La generación solo recibe la fila guardada y valida su snapshot. No consulta fichas, parámetros vigentes ni funciones de cálculo. La consulta a `companies` del servicio existente se conserva únicamente para delimitar permisos.

Todos los importes se leen directamente de `snapshot.datos` o `snapshot.resultados`. Se conserva el sueldo proporcional guardado, sin volver a calcularlo desde días/sueldo. `base_imponible`, `base_tributable` y `descuento_afp` se usan cuando están guardados. Si falta el descuento AFP agregado, se muestran pensión y comisión separadas; no se suman para imprimirlo. Cuando se muestran juntas las tasas, se expresan como componentes (`10% + 1.44%`) sin recalcular una tasa agregada.

Los renglones de la referencia sin un valor histórico equivalente indican No guardado: diferencia de sueldo, asignación familiar en pesos, bono no imponible, subtotal de descuentos previsionales y alcance líquido antes de anticipos. El número de cargas familiares se muestra como cantidad junto al rótulo y no se interpreta como dinero. Otros descuentos se muestra también cuando vale cero. Los anticipos se muestran con su importe guardado; no se vuelven a restar del líquido, que ya los incluye. Los descuentos APV, préstamos y otros se presentan junto a OTROS DESCUENTOS.

La fecha de firma/pago solo se imprime si existe `snapshot.fecha_pago` o `snapshot.datos.fecha_pago`. El guardado actual no incluye esa fecha, por lo que se indica No guardada: no se usa la fecha actual ni se inventa el último día del período. No se modifica el contrato de guardado ni la base de datos para completar este dato.

Los snapshots ausentes, incompletos o de versión no admitida siguen devolviendo 409, incluso si existe un archivo previo.

## Almacenamiento y asociación

Raíz predeterminada del backend:

`C:/PROYECTOS ANGULAR/ERP/master api/storage/liquidaciones/`

Estructura:

`<empresa_id>/<liquidacion_id>/<sha256>.pdf`

La huella identifica la versión de plantilla y el snapshot. Los identificadores de empresa y liquidación forman la asociación persistente sin añadir tablas ni columnas. Las solicitudes posteriores reutilizan el archivo. Si cambia la versión de plantilla, debe incrementarse `carta-contenido-v3` en el servicio de almacenamiento.

La raíz se puede configurar con `LIQUIDACIONES_PDF_DIR`. Está fuera de `public` y excluida de Git. El servidor debe conservarla en sus respaldos y usar almacenamiento persistente en despliegues con contenedores. La publicación del archivo es atómica mediante un archivo temporal y un enlace; no se sirve un PDF parcialmente escrito. Los errores de escritura no se sustituyen por una respuesta PDF en memoria.

## Archivos de este cambio

Frontend:

- `src/app/features/liquidaciones/liquidaciones.ts`
- `src/app/features/liquidaciones/liquidaciones.html`
- `src/app/features/liquidaciones/liquidaciones.spec.ts`
- `docs/pdf-liquidaciones.md`

Backend (`C:/PROYECTOS ANGULAR/ERP/master api`):

- `src/services/remuneraciones-liquidaciones-pdf.js`
- `src/services/remuneraciones-liquidaciones-pdf.storage.js`
- `src/services/assets/liquidacion-pdf/` (geometría, fuentes y licencia)
- `src/routes/remuneraciones-liquidaciones.routes.js`
- `test/remuneraciones-liquidaciones-pdf.test.js`
- `.gitignore` (solo exclusión de copias PDF)

Se respetaron los cambios previos del repositorio. No se modificaron cálculo, guardado, edición, parámetros, Contabilidad ni esquemas.

## Validación de esta revisión (21-09-2026)

- 30 pruebas frontend aprobadas: liquidaciones, nueva liquidación y servicio HTTP.
- 56 pruebas backend aprobadas: PDF, guardado y parámetros. Incluyen una página, conservación de resultados inconsistentes intencionales sin recalcular, snapshot inválido, permisos, almacenamiento físico, reutilización y concurrencia.
- Prueba HTTP verifica que los bytes servidos coinciden exactamente con el archivo físico y que una segunda petición entrega el mismo archivo.
- `npm run build` frontend correcto.
- Backend JavaScript sin script de compilación: `node --check` correcto para los tres módulos modificados; carga y ejecución verificadas por las pruebas.
- PDFs de la fixture existente renderizados con Poppler y comparados visualmente con la referencia. Ajustes iterativos de gris, posiciones y filas. Confirmada una página con pdfplumber, incluida la variante con nombres largos y todos los conceptos.
- La validación real que estaba pendiente se completó en la revisión de contenido: PDF generado desde el snapshot guardado N.º 2, copia física verificada y reutilizada.
- **Pendiente:** comprobación manual en el visor del navegador. El entorno no tiene navegadores conectados. El clic de Ver PDF sí se probó en el componente Angular y el endpoint se probó por HTTP.

Reiniciar la API si no usa recarga automática. Resta la comprobación manual del visor: entrar a la empresa/período de la liquidación N.º 2, pulsar Ver PDF y verificar impresión/descarga.

## Ajuste a carta

9 pruebas PDF aprobadas y verificación sintáctica correcta. PDF renderizado y revisado: una página de 612 x 792 puntos. La extracción de texto coincide exactamente con el PDF anterior: mismos conceptos y valores. La nueva versión de plantilla `carta-contenido-v3` genera una copia carta al volver a pulsar Ver PDF, sin reutilizar la copia A4 anterior. No hubo cambios frontend.
