import { aporteCesantia, impuestoMensual, TramoIusc } from './calculo-previsional';
const tabla = (): TramoIusc[] => [
  { numero_tramo: 1, desde_utm: '0', hasta_utm: '13.5', factor: '0', rebaja_utm: '0' },
  { numero_tramo: 2, desde_utm: '13.5', hasta_utm: null, factor: '0.04', rebaja_utm: '0.54' }
];
describe('Cesantia e IUSC publicados', () => {
  it('distingue cero explicito de datos ausentes y conserva precision', () => {
    expect(aporteCesantia(null, '0').monto).toBe(0);
    expect(aporteCesantia(1000000, null).monto).toBeNull();
    expect(aporteCesantia(4000012.3456, '1.234567').monto).toBe(49383);
  });
  it('resuelve exencion, limite inclusivo y tramo superior sin limite', () => {
    expect(impuestoMensual(0, 70000, tabla()).monto).toBe(0);
    expect(impuestoMensual(945000, 70000, tabla()).monto).toBe(0);
    expect(impuestoMensual(945100, 70000, tabla()).monto).toBe(4);
    expect(impuestoMensual(1619200, 70000, tabla()).monto).toBe(26968);
  });
  it('no presume exencion sin UTM o tramos validos', () => {
    expect(impuestoMensual(0, null, tabla()).monto).toBeNull();
    expect(impuestoMensual(0, 70000, []).monto).toBeNull();
    for (const desde of ['13', '14', null]) {
      const t = tabla(); t[1].desde_utm = desde; expect(impuestoMensual(900000, 70000, t).monto).toBeNull();
    }
    const t = tabla(); t[1].factor = null; expect(impuestoMensual(900000, 70000, t).monto).toBeNull();
  });
});
