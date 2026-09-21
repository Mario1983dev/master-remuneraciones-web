# Empresas independientes de Remuneraciones

Implementado y verificado el 21-09-2026.

## Resultado

Registro `remuneraciones_empresas`, listado, alta, detalle, edición y activación/inactivación en `/empresas`. Flujo Empresa → Trabajadores → Liquidaciones. No hay eliminación física ni endpoint DELETE. Oficina e ID son inmutables en la API. RUT validado y normalizado; índice único por oficina.

MASTER administra todas las oficinas y especifica el ID de oficina al crear. OFFICE_ADMIN administra su oficina. OFFICE_USER solo consulta. Todos requieren acceso explícito en `remuneraciones_access`. El servidor aplica permisos, independientemente de los controles visuales.

Empresa inactiva impide nuevos trabajadores y nuevas liquidaciones. Los trabajadores existentes (incluidos inactivos), liquidaciones y PDFs siguen disponibles. La creación de trabajador bloquea la fila de empresa dentro de una transacción; el guardado de liquidación también usa lectura bloqueante de empresa activa. No se cambiaron cálculos ni parámetros publicados.

## Migración aplicada a MySQL local

Backend: `C:/PROYECTOS ANGULAR/ERP/master api`.

- `sql/migrations/004_remuneraciones_empresas.sql`: definición del registro propio.
- `sql/migrations/004_remuneraciones_empresas.js`: ejecutor obligatorio de prevalidación, copia y cambio de FK.
- Prevalidación: `node sql/migrations/004_remuneraciones_empresas.js`.
- Aplicación: `node sql/migrations/004_remuneraciones_empresas.js --apply`.
- Aplicada en esta sesión. No es necesario volver a aplicarla.

Se copió **una empresa, ID 2**, de las tres existentes en `companies`. Es la única usada por trabajadores/liquidaciones. Las otras dos no se copiaron. Se preservaron los campos de origen y exactamente el ID; no se actualizó ningún `company_id`.

Prevalidaciones: empresas faltantes, integridad trabajador/liquidación, oficina existente, RUT y dígito verificador, RUT duplicado por oficina, referencias FK esperadas y copia parcial compatible. Todas pasaron. Las pruebas incluyen escenarios negativos que abortan antes de cualquier DDL o escritura.

Solo cambiaron las FK de empresa de `remuneraciones_trabajadores` y `remuneraciones_liquidaciones`, ahora dirigidas a `remuneraciones_empresas.id`, con RESTRICT. MySQL rechazó inicialmente reutilizar el nombre de una FK en el ALTER; el ejecutor se corrigió para usar nombres con sufijo `_propia` y se reanudó sin recopiado ni alteración de IDs. MySQL hace commit implícito de DDL: el ejecutor es reanudable y debe ejecutarse sin escrituras concurrentes de Remuneraciones.

AUTO_INCREMENT se ajustó inicialmente a 3. Después de las pruebas transaccionales su siguiente valor es 9; los saltos corresponden a INSERT revertidos (MySQL no revierte los contadores). No quedan empresas, trabajadores ni liquidaciones ficticias.

## Evidencia de integridad

Se compararon recuentos y SHA-256 de todas las filas de las 26 tablas preexistentes antes/después de migrar y al finalizar, incluso tras reiniciar la API. Coincidieron exactamente.

- `companies`: 3 registros, sin cambios; SHA-256 `54b4e9af13540865d53bd8f1453f2a7dc65817d4c47154e2cf6abd6dadcb550c`.
- Trabajadores: 1 registro existente, misma asociación `company_id=2`.
- Liquidaciones: 1 registro existente, mismo `company_id=2`, snapshot intacto.
- Detalle de liquidación: 18 registros, intactos.
- Períodos contables, cuentas, asientos, líneas, libros, oficinas, accesos y parámetros: mismas huellas y recuentos.
- Comparación de código backend contra la línea base de esta sesión: únicamente archivos de Remuneraciones y sus pruebas cambiaron. No se modificó `src/app.js` ni las rutas/servicios contables.

**Contabilidad y `companies` no fueron modificados: ni código, ni estructura de `companies`, ni sus registros.** La migración solo lee `companies`; la API nueva no lo consulta.

## Pruebas y compilación

- Backend: `REM_EMPRESAS_INTEGRATION=1`, `node --test --test-isolation=none test/remuneraciones-empresas.test.js test/remuneraciones-parametros.test.js test/remuneraciones-liquidaciones.test.js test/remuneraciones-liquidaciones-pdf.test.js`: **62 aprobadas, 0 fallos, 0 omitidas**.
- MySQL real: crear empresa, rechazar RUT duplicado formateado, editar sin mover oficina, negar otra oficina, crear/asociar trabajador, guardar liquidación con los resultados históricos de fixture, inactivar/activar, bloquear nuevas altas, consultar histórico y PDF. Una transacción exterior revirtió todas las escrituras de prueba y comprobó huellas iguales al inicio.
- Se comprobó por SQL que la empresa creada no existe en `companies`; por tanto no forma parte del registro que lista Contabilidad.
- Frontend: `npm test -- --watch=false`: **73 aprobadas en 13 archivos**. Incluye empresas, endpoints propios, permisos, selección exclusiva de activas en Nueva Liquidación, bloqueo de trabajador, guardado, cálculos y PDF.
- Se corrigieron pruebas previas de trabajadores que carecían de proveedores y la expectativa obsoleta de un título en App (el componente contiene un router-outlet).
- `npm run build`: **correcto**, sin advertencias de presupuesto; bundle inicial 448,15 kB, transferencia estimada 106,44 kB. Salida: `dist/master-remuneraciones-web`.
- `node --check`: **correcto en los 7 archivos JS backend nuevos/modificados**.
- `git diff --check`: correcto; Git solo informó normalización de finales de línea.

No se hizo automatización visual de navegador. Los controles frontend se verificaron con pruebas Angular de componentes, plantillas y HTTP; el flujo de persistencia se verificó con Express y MySQL reales.

## API activa

Se reinició exclusivamente el proceso local que escuchaba en el puerto 3001 para cargar las rutas nuevas. Requirió conservar `PORT=3001` por entorno; no se cambió `.env`. El servicio del puerto 3000 no se reinició.

Verificaciones finales contra `http://localhost:3001/api/remuneraciones`, con autenticación real de prueba y sin exponer tokens:

- `/empresas`: 200, registro propio cargado, lista `[2]` y permisos de administración.
- `/empresas/2`: 200.
- `/empresas/2/trabajadores`: 200.
- `/liquidaciones?empresa_id=2&anio=2026&mes=9`: 200.
- `/liquidaciones/2/pdf`: 200.

## Archivos de esta implementación

Frontend, relativos a `master-remuneraciones-web`:

- `src/app/features/empresas/empresas.ts`, `.html`, `.scss`, `.spec.ts` (nuevos).
- `src/app/app.routes.ts`, `src/app/app.spec.ts`.
- `src/app/shared/services/remuneraciones.service.ts`, `.spec.ts`.
- `src/app/features/inicio/inicio.ts`, `.html`, `.spec.ts`.
- `src/app/features/trabajadores/trabajadores.ts`, `.html`, `.spec.ts`.
- `src/app/features/trabajadores/nuevo-trabajador/nuevo-trabajador.ts`, `.html`, `.spec.ts`.
- `src/app/features/trabajadores/detalle-trabajador/detalle-trabajador.spec.ts`.
- `src/app/features/trabajadores/editar-trabajador/editar-trabajador.spec.ts`.
- `src/app/features/liquidaciones/liquidaciones.ts`, `.html`.
- `src/app/features/liquidaciones/nueva-liquidacion/nueva-liquidacion.ts`, `.spec.ts`.
- `docs/empresas-remuneraciones.md` (este informe).

Backend, relativos a `ERP/master api`:

- Nuevos: `src/routes/remuneraciones-empresas.routes.js`, `sql/migrations/004_remuneraciones_empresas.sql`, `sql/migrations/004_remuneraciones_empresas.js`, `test/remuneraciones-empresas.test.js`.
- Modificados: `src/routes/remuneraciones.routes.js`, `src/routes/remuneraciones-liquidaciones.routes.js`, `src/services/remuneraciones-liquidaciones.service.js`, `test/remuneraciones-liquidaciones.test.js`.

Los cambios previos del usuario en liquidaciones, snapshots, PDFs y otros archivos se conservaron. Esta sesión no cambió las fórmulas ni los archivos de cálculo/PDF. No se editó Notion.
