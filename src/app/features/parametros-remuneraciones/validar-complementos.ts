import { FormularioParametros } from '../../shared/services/parametros-remuneraciones.service';
export function validarComplementos(datos: FormularioParametros, completo: boolean): void {
  const numero = (valor: unknown, nombre: string, enteros: number, decimales = 6, max?: number, requerido = completo) => {
    const texto = valor == null ? '' : String(valor).trim().replace(',', '.');
    if (!texto) { if (requerido) throw new Error('Completa ' + nombre + '.'); return null; }
    if (!new RegExp('^\\d{1,' + enteros + '}(?:\\.\\d{1,' + decimales + '})?$').test(texto) || (max !== undefined && Number(texto) > max)) throw new Error('Valor inválido: ' + nombre + '.');
    return texto;
  };
  datos.utm_valor_clp = numero(datos.utm_valor_clp, 'valor UTM', 12);
  if (datos.utm_valor_clp !== null && Number(datos.utm_valor_clp) <= 0) throw new Error('Valor UTM debe ser positivo.');
  datos.tope_cesantia_uf = numero(datos.tope_cesantia_uf, 'tope de cesantía', 6);
  const claves = new Set<string>();
  datos.cesantia = (datos.cesantia || []).map(r => {
    const tipo = r.tipo_contrato.trim().toUpperCase(), codigo = r.regla_codigo.trim();
    if (!tipo || tipo.length > 30 || !codigo || codigo.length > 60) throw new Error('Cada regla requiere tipo de contrato y código (30 y 60 caracteres máximo).');
    const clave = tipo + ':' + codigo.toUpperCase();
    if (claves.has(clave)) throw new Error('Regla de cesantía duplicada.'); claves.add(clave);
    const fila = { ...r, tipo_contrato: tipo, regla_codigo: codigo };
    for (const campo of ['trabajador_cic_pct', 'empleador_cic_pct', 'empleador_fcs_pct'] as const) fila[campo] = numero(r[campo], campo, 3, 6, 100);
    if (completo && ['PLAZO_FIJO', 'OBRA_FAENA'].includes(tipo) && Number(fila.trabajador_cic_pct) !== 0) throw new Error('Plazo fijo y obra/faena requieren tasa trabajador cero.');
    return fila;
  });
  if (completo && !datos.cesantia.length) throw new Error('Agrega las reglas de cesantía antes de publicar.');
  const tramos = new Set<number>();
  datos.iusc_tramos = (datos.iusc_tramos || []).map(t => {
    const n = t.numero_tramo;
    if (n === null || !Number.isInteger(n) || n < 1 || n > 65535 || tramos.has(n)) throw new Error('Cada tramo requiere un número único entre 1 y 65535.');
    tramos.add(n);
    const fila = { numero_tramo: n, desde_utm: numero(t.desde_utm, 'Desde UTM', 12), hasta_utm: numero(t.hasta_utm, 'Hasta UTM', 12, 6, undefined, false), factor: numero(t.factor, 'Factor IUSC', 3, 9, 1), rebaja_utm: numero(t.rebaja_utm, 'Rebaja UTM', 12) };
    if (fila.hasta_utm !== null && (fila.desde_utm === null || Number(fila.hasta_utm) <= Number(fila.desde_utm))) throw new Error('Hasta UTM debe ser mayor que Desde UTM.');
    return fila;
  });
  if (completo) {
    if (!datos.iusc_tramos.length) throw new Error('Agrega los tramos IUSC antes de publicar.');
    const filas = [...datos.iusc_tramos].sort((a,b) => a.numero_tramo! - b.numero_tramo!);
    let limite = 0;
    filas.forEach((t,i) => {
      if (Number(t.desde_utm) !== limite || (i === filas.length - 1 ? t.hasta_utm !== null : t.hasta_utm === null)) throw new Error('IUSC debe comenzar en 0, sin huecos ni solapamientos, y terminar sin límite superior.');
      limite = Number(t.hasta_utm);
    });
  }
}
