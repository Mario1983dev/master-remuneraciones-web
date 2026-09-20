export type DecimalPublicado = number | string | null;
export interface ReglaCesantia {
  tipo_contrato: string; regla_codigo: string;
  trabajador_cic_pct: DecimalPublicado; empleador_cic_pct: DecimalPublicado; empleador_fcs_pct: DecimalPublicado;
}
export interface TramoIusc {
  numero_tramo: number; desde_utm: DecimalPublicado; hasta_utm: DecimalPublicado;
  factor: DecimalPublicado; rebaja_utm: DecimalPublicado;
}
export interface ResultadoMonto { monto: number | null; pendiente: string; }
export const pendiente = (mensaje: string): ResultadoMonto => ({ monto: null, pendiente: mensaje });
export const monto = (valor: number): ResultadoMonto => ({ monto: valor, pendiente: '' });
export function decimal(valor: unknown): number | null {
  if (valor == null || String(valor).trim() === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function aporteCesantia(base: number | null, tasa: DecimalPublicado | undefined): ResultadoMonto {
  const pct = decimal(tasa);
  if (pct === null || pct > 100) return pendiente('Falta una tasa válida en la regla publicada de cesantía.');
  // Una tasa cero publicada expresa que este concepto no corresponde.
  if (pct === 0) return monto(0);
  if (base === null) return pendiente('Falta UF o tope de cesantía publicado.');
  return monto(Math.round(base * pct / 100));
}
export function impuestoMensual(base: number, utmValor: DecimalPublicado | undefined, tabla: TramoIusc[]): ResultadoMonto {
  const utm = decimal(utmValor);
  if (utm === null || utm <= 0) return pendiente('Falta el valor UTM publicado del período.');
  if (!tabla.length) return pendiente('No hay tramos IUSC publicados para el período.');
  const tramos = [...tabla].sort((a,b) => a.numero_tramo - b.numero_tramo);
  let anterior = 0;
  const numeros = new Set<number>();
  for (let i = 0; i < tramos.length; i++) {
    const t = tramos[i], desde = decimal(t.desde_utm), hasta = decimal(t.hasta_utm);
    const factor = decimal(t.factor), rebaja = decimal(t.rebaja_utm);
    if (!Number.isInteger(t.numero_tramo) || t.numero_tramo <= 0 || numeros.has(t.numero_tramo) ||
        desde === null || desde !== anterior || factor === null || factor > 1 || rebaja === null ||
        (i === tramos.length - 1 ? t.hasta_utm !== null : hasta === null || hasta <= desde)) {
      return pendiente('Tabla IUSC incompleta o inválida: revise rangos, factores y rebajas publicados.');
    }
    numeros.add(t.numero_tramo); anterior = hasta ?? Infinity;
  }
  // Inferior exclusivo y superior inclusivo; la base cero pertenece al primer tramo.
  const tramo = tramos.find(t => (base > Number(t.desde_utm) * utm || (base === 0 && Number(t.desde_utm) === 0)) &&
    (t.hasta_utm === null || base <= Number(t.hasta_utm) * utm));
  if (!tramo) return pendiente('No existe un tramo IUSC aplicable a esta base.');
  return monto(Math.round(Math.max(0, base * Number(tramo.factor) - Number(tramo.rebaja_utm) * utm)));
}
