# Guardado mensual de liquidaciones

Implementado el 20-09-2026. Backend: `C:/PROYECTOS ANGULAR/ERP/master api`.

## Estructura reutilizada

Se inspeccionó el esquema MySQL real antes de modificarlo:

- `remuneraciones_liquidaciones`: empresa (`company_id`), trabajador, año/mes, sueldo base, días, AFP, salud, totales, estado y fechas. FK a `companies` y `remuneraciones_trabajadores`; UNIQUE por trabajador/año/mes.
- `remuneraciones_liquidacion_detalle`: conceptos HABER/DESCUENTO, código, descripción, cantidad, porcentaje, monto, imponible/tributable y orden; FK a liquidación.
- No existía POST de liquidaciones. Se reutilizaron Express, pool MySQL, autenticación, permisos de Remuneraciones y servicio de parámetros publicados.
- Frontend: se amplió `RemuneracionesService` y se conectó la lista existente.

La migración `sql/migrations/003_liquidaciones_snapshot.sql` **ya se aplicó** a la base local configurada por el backend. Agrega solamente `snapshot JSON` y `parametros_version_id` con FK restrictiva. No crea tablas ni modifica parámetros publicados. Las liquidaciones anteriores conservan NULL en esos campos; no se reconstruye historia desde fichas actuales.

## Comportamiento

`POST /api/remuneraciones/liquidaciones` recibe empresa, trabajador, período, versión exacta de parámetros, selección AFP/cesantía, datos mensuales y resultados mostrados. Valida acceso al módulo y empresa, pertenencia del trabajador activo, vigencia de la versión publicada y coherencia de resultados. Guarda cabecera y detalle en una transacción; duplicados devuelven 409. No existe endpoint de edición.

El snapshot conserva datos mensuales, identidad histórica, sueldo proporcional, bases y resultados desglosados, AFP y comisión exacta, salud y plan, APV/régimen, cargas familiares, todos los haberes/descuentos, UF/UTM, topes, tasas, regla de cesantía, tramos IUSC y versión de parámetros. No depende de consultas futuras a la ficha ni de recalcular con parámetros actuales. Las tasas se conservan en JSON con la precisión de origen, sin usar la columna de cuatro decimales del detalle.

Anticipos y préstamos tienen campos propios y se suman a descuentos; las fórmulas previsionales vigentes se mantienen. Isapre UF, APV con cálculo tributario pendiente y cualquier resultado pendiente siguen bloqueados para guardar. El backend reproduce las fórmulas actuales para verificar los resultados, sin introducir reglas previsionales nuevas.

`GET /api/remuneraciones/liquidaciones?empresa_id=...&anio=...&mes=...` utiliza identidad histórica y totales guardados, sin JOIN a la ficha mutable. Al guardar, la pantalla vuelve a la lista manteniendo empresa y período.

La tabla actual de trabajadores no contiene APV/régimen ni cargas familiares: la pantalla conserva sus valores iniciales existentes (cero/vacío cuando faltan), y el snapshot guarda lo efectivamente utilizado. No se amplió la ficha del trabajador en este trabajo.

## Archivos

Frontend, relativos a este repositorio:

- `src/app/features/liquidaciones/nueva-liquidacion/nueva-liquidacion.ts`, `.html`, `.scss`, `.spec.ts`.
- `src/app/features/liquidaciones/liquidaciones.ts` y `liquidaciones.spec.ts`.
- `src/app/shared/services/remuneraciones.service.ts`, `remuneraciones.service.spec.ts` y `liquidacion.model.ts`.

Backend, relativos a `ERP/master api`:

- `src/routes/remuneraciones.routes.js`: montaje del router.
- `src/routes/remuneraciones-liquidaciones.routes.js`.
- `src/services/remuneraciones-liquidaciones.service.js`.
- `src/services/remuneraciones-liquidaciones-calculo.js`.
- `test/remuneraciones-liquidaciones.test.js`.
- `sql/migrations/003_liquidaciones_snapshot.sql`.

## Verificación

- `npm run build`: correcto.
- `npm test -- --watch=false --include='src/app/features/liquidaciones/**/*.spec.ts' --include='src/app/shared/services/remuneraciones.service.spec.ts'`: 21 aprobadas.
- Backend: `node --test --test-isolation=none test/remuneraciones-parametros.test.js test/remuneraciones-liquidaciones.test.js`: 47 aprobadas.
- Prueba con MySQL real: INSERT cabecera/detalle, lectura del snapshot y listado verificados dentro de una transacción finalmente revertida. No quedó una liquidación de prueba persistida.
- La suite general detectó cinco fallos fuera del guardado: App espera un título inicial inexistente y cuatro pruebas de Trabajadores carecen de proveedor ActivatedRoute. Esos archivos no se modificaron. El fallo adicional detectado durante el desarrollo del guardado se corrigió y su suite específica pasó.

## Inicio

El proceso que estaba escuchando en `localhost:3001` aún devolvía 404 para la ruta nueva al finalizar. Reiniciar la API desde su terminal habitual (`npm run dev` o `npm start`) para cargar los archivos actualizados. No volver a ejecutar la migración ya aplicada. No se modificó Contabilidad ni se agregaron PDF o edición de liquidaciones.
