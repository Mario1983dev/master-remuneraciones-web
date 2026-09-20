import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ParametrosRemuneraciones } from './parametros-remuneraciones';
import { ParametrosRemuneracionesService, VersionParametros } from '../../shared/services/parametros-remuneraciones.service';

function version(estado: 'BORRADOR' | 'PUBLICADO' = 'BORRADOR'): VersionParametros {
  return { cesantia: [{ tipo_contrato: 'INDEFINIDO', regla_codigo: 'GENERAL', trabajador_cic_pct: '0', empleador_cic_pct: '1', empleador_fcs_pct: '1' }], iusc_tramos: [{ numero_tramo: 1, desde_utm: '0', hasta_utm: null, factor: '0', rebaja_utm: '0' }], parametros: { id: 8, version: 1, estado, utm_valor_clp: '1', tope_cesantia_uf: '1', pension_obligatoria_pct: null, uf_valor_clp: null, uf_fecha: null, tope_previsional_uf: null, salud_legal_pct: null }, afp: [{ afp_codigo: 'PRUEBA', afp_nombre: 'AFP de prueba', comision_pct: null, vigente: true }] };
}
describe('Parámetros de remuneraciones', () => {
  let servicio: { puedeAdministrar: ReturnType<typeof vi.fn>; listar: ReturnType<typeof vi.fn>; crear: ReturnType<typeof vi.fn>; guardar: ReturnType<typeof vi.fn>; publicar: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    servicio = { puedeAdministrar: vi.fn(() => of(true)), listar: vi.fn(() => of({ versiones: [version()] })), crear: vi.fn(() => of(version())), guardar: vi.fn(() => of(version())), publicar: vi.fn(() => of(version('PUBLICADO'))) };
    TestBed.configureTestingModule({ imports: [ParametrosRemuneraciones], providers: [provideRouter([]), { provide: ParametrosRemuneracionesService, useValue: servicio }] });
  });
  function iniciar() {
    const fixture = TestBed.createComponent(ParametrosRemuneraciones); fixture.detectChanges(); return fixture;
  }
  it('no consulta parámetros si no tiene autorización', () => {
    servicio.puedeAdministrar.mockReturnValue(of(false));
    const f = iniciar(); expect(servicio.listar).not.toHaveBeenCalled(); expect(f.nativeElement.textContent).toContain('solo para MASTER');
  });
  it('ofrece crear borrador sin crear ni publicar automáticamente', () => {
    servicio.listar.mockReturnValue(of({ versiones: [] }));
    const f = iniciar(); expect(f.nativeElement.textContent).toContain('Crear borrador');
    expect(servicio.crear).not.toHaveBeenCalled(); expect(servicio.publicar).not.toHaveBeenCalled();
  });
  it('envía vacíos como NULL, limita el payload al formulario y conserva cero explícito', () => {
    const c = iniciar().componentInstance;
    c.formulario.uf_valor_clp = ''; c.formulario.pension_obligatoria_pct = ' '; c.formulario.afp[0].comision_pct = '0';
    c.guardar(); const payload = servicio.guardar.mock.calls[0][3];
    expect(payload.uf_valor_clp).toBeNull(); expect(payload.pension_obligatoria_pct).toBeNull(); expect(payload.afp[0].comision_pct).toBe('0');
    expect(Object.keys(payload).sort()).toEqual(['afp', 'cesantia', 'iusc_tramos', 'pension_obligatoria_pct', 'salud_legal_pct', 'tope_cesantia_uf', 'tope_previsional_uf', 'uf_fecha', 'uf_valor_clp', 'utm_valor_clp']);
  });
  it('no permite editar publicada y copia usando su versión de origen', () => {
    servicio.listar.mockReturnValue(of({ versiones: [version('PUBLICADO')] }));
    const f = iniciar(); expect(f.nativeElement.querySelector('fieldset').disabled).toBe(true);
    f.componentInstance.guardar(); expect(servicio.guardar).not.toHaveBeenCalled();
    f.componentInstance.corregir(); expect(servicio.crear.mock.calls[0][2]).toBe(1);
  });
  it('bloquea dobles envíos mientras guarda', () => {
    const pendiente = new Subject<VersionParametros>(); servicio.guardar.mockReturnValue(pendiente);
    const c = iniciar().componentInstance; c.guardar(); c.guardar();
    expect(servicio.guardar).toHaveBeenCalledTimes(1); expect(c.ocupado()).toBe(true);
    pendiente.next(version()); pendiente.complete(); expect(c.ocupado()).toBe(false);
  });
  it('muestra conflictos 409 y conserva la edición', () => {
    servicio.guardar.mockReturnValue(throwError(() => ({ status: 409, error: { message: 'Versión publicada' } })));
    const c = iniciar().componentInstance; c.formulario.salud_legal_pct = '1'; c.editado(); c.guardar();
    expect(c.error()).toContain('Conflicto'); expect(c.formulario.salud_legal_pct).toBe('1'); expect(c.cambios()).toBe(true);
  });
  it('no publica datos incompletos ni cambios sin guardar', () => {
    const c = iniciar().componentInstance; c.prepararPublicacion(); c.publicar();
    expect(servicio.publicar).not.toHaveBeenCalled(); expect(c.error()).toContain('Completa');
    c.editado(); c.prepararPublicacion(); expect(c.confirmarPublicacion()).toBe(false);
  });
  it('publica únicamente tras confirmación explícita', () => {
    // Valores sintéticos, no corresponden a parámetros oficiales.
    const datos = version(); Object.assign(datos.parametros, { pension_obligatoria_pct: '1', uf_valor_clp: '1', uf_fecha: '2026-09-30', tope_previsional_uf: '1', salud_legal_pct: '1' });
    datos.afp.forEach(f => f.comision_pct = '1'); servicio.listar.mockReturnValue(of({ versiones: [datos] }));
    const c = iniciar().componentInstance; c.publicar(); expect(servicio.publicar).not.toHaveBeenCalled();
    c.prepararPublicacion(); expect(servicio.publicar).not.toHaveBeenCalled(); expect(c.confirmarPublicacion()).toBe(true);
    c.publicar(); expect(servicio.publicar).toHaveBeenCalledTimes(1);
  });
  it('acepta coma decimal y rechaza precisión inválida sin enviar', () => {
    const c = iniciar().componentInstance; c.formulario.salud_legal_pct = '1,123456'; c.guardar();
    expect(servicio.guardar.mock.calls[0][3].salud_legal_pct).toBe('1.123456');
    servicio.guardar.mockClear(); c.formulario.salud_legal_pct = '1.1234567'; c.guardar(); expect(servicio.guardar).not.toHaveBeenCalled();
  });
  it('agrega AFP arbitrarias, permite desactivar y reactivar sin perder su comisión', () => {
    const f = iniciar(), c = f.componentInstance;
    c.formulario.afp[0].comision_pct = '1.234567';
    c.cambiarVigenciaAfp(0);
    expect(c.formulario.afp[0]).toMatchObject({ vigente: false, comision_pct: '1.234567' });
    expect(c.formulario.afp).toHaveLength(1);
    expect(c.seleccionada()!.afp[0].vigente).toBe(true);
    c.cambiarVigenciaAfp(0);
    expect(c.formulario.afp[0].vigente).toBe(true);
    c.agregarAfp();
    expect(c.formulario.afp[1]).toMatchObject({ vigente: true, comision_pct: null });
    Object.assign(c.formulario.afp[1], { afp_codigo: 'nueva_2099', afp_nombre: 'AFP de prueba nueva' });
    c.guardar();
    expect(servicio.guardar.mock.calls[0][3].afp[1]).toEqual({ afp_codigo: 'NUEVA_2099', afp_nombre: 'AFP de prueba nueva', vigente: true, comision_pct: null });
  });
  it('muestra Tasa pendiente incluso en no vigentes; cero no es pendiente', async () => {
    const f = iniciar(), c = f.componentInstance;
    expect(f.nativeElement.textContent).toContain('Tasa pendiente');
    c.cambiarVigenciaAfp(0); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No vigente');
    expect(f.nativeElement.textContent).toContain('Tasa pendiente');
    await f.whenStable();
    const input: HTMLInputElement = f.nativeElement.querySelector('#afp-comision-0');
    input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true }));
    await f.whenStable(); f.detectChanges();
    expect(c.formulario.afp[0].comision_pct).toBe('0');
    expect(f.nativeElement.textContent).not.toContain('Tasa pendiente');
  });
  it('exige comisión solo a las AFP vigentes al publicar', () => {
    const datos = version();
    Object.assign(datos.parametros, { pension_obligatoria_pct: '1', uf_valor_clp: '1', uf_fecha: '2026-09-30', tope_previsional_uf: '1', salud_legal_pct: '1' });
    servicio.listar.mockReturnValue(of({ versiones: [datos] }));
    const c = iniciar().componentInstance;
    c.prepararPublicacion(); expect(c.confirmarPublicacion()).toBe(false);
    expect(c.error()).toContain('Tasa pendiente');
    c.formulario.afp[0].vigente = false;
    c.prepararPublicacion(); expect(c.confirmarPublicacion()).toBe(true);
    c.formulario.afp[0].vigente = true; c.formulario.afp[0].comision_pct = '0';
    c.prepararPublicacion(); expect(c.confirmarPublicacion()).toBe(true);
  });
  it('informa el origen al crear octubre y conserva las comisiones copiadas', () => {
    servicio.listar.mockReturnValue(of({ versiones: [] }));
    const datos = version(); datos.afp[0].comision_pct = '1.234567'; datos.afp[0].vigente = false;
    datos.origen_afp = { anio: 2026, mes: 9, version: 3 };
    servicio.crear.mockReturnValue(of(datos));
    const c = iniciar().componentInstance; c.anio = 2026; c.mes = 10; c.crear();
    expect(servicio.crear).toHaveBeenCalledWith(2026, 10);
    expect(c.mensaje()).toContain('Septiembre 2026, versión 3');
    expect(c.formulario.afp[0]).toMatchObject({ vigente: false, comision_pct: '1.234567' });
    c.formulario.afp[0].comision_pct = '2'; expect(datos.afp[0].comision_pct).toBe('1.234567');
  });
  it('informa cuando no existe período anterior y bloquea publicación sin AFP', () => {
    servicio.listar.mockReturnValue(of({ versiones: [] }));
    const datos = version(); datos.afp = []; datos.origen_afp = null;
    servicio.crear.mockReturnValue(of(datos));
    const c = iniciar().componentInstance; c.crear();
    expect(c.mensaje()).toContain('no existe un período anterior publicado');
    expect(c.formulario.afp).toEqual([]);
    Object.assign(c.formulario, { pension_obligatoria_pct: '1', uf_valor_clp: '1', uf_fecha: '2026-09-30', tope_previsional_uf: '1', salud_legal_pct: '1' });
    c.prepararPublicacion(); expect(c.confirmarPublicacion()).toBe(false);
    expect(c.error()).toContain('Agrega las AFP');
  });
  it('rechaza códigos duplicados y no cambia vigencias publicadas', () => {
    const c = iniciar().componentInstance; c.agregarAfp();
    Object.assign(c.formulario.afp[1], { afp_codigo: 'prueba', afp_nombre: 'Duplicada' });
    c.guardar(); expect(servicio.guardar).not.toHaveBeenCalled(); expect(c.error()).toContain('duplicado');
    c.seleccionada.set(version('PUBLICADO'));
    c.cambiarVigenciaAfp(0); c.agregarAfp();
    expect(c.formulario.afp[0].vigente).toBe(true); expect(c.formulario.afp).toHaveLength(2);
  });

  it('guarda nuevos campos vacios y factor con nueve decimales, sin alterar seleccionada', () => {
    const c = iniciar().componentInstance;
    c.formulario.utm_valor_clp = ''; c.formulario.tope_cesantia_uf = null;
    c.formulario.cesantia![0].trabajador_cic_pct = null;
    c.formulario.iusc_tramos![0].factor = '0,123456789';
    c.guardar();
    const payload = servicio.guardar.mock.calls[0][3];
    expect(payload.utm_valor_clp).toBeNull(); expect(payload.cesantia[0].trabajador_cic_pct).toBeNull();
    expect(payload.iusc_tramos[0].factor).toBe('0.123456789');
  });
  it('agrega y quita detalles solo en borrador', () => {
    const c = iniciar().componentInstance;
    c.agregarRegla(); c.agregarTramo(); expect(c.formulario.cesantia).toHaveLength(2); expect(c.formulario.iusc_tramos).toHaveLength(2);
    c.quitarDetalle('cesantia',1); c.quitarDetalle('iusc_tramos',1);
    c.seleccionada.set(version('PUBLICADO')); c.agregarRegla(); c.agregarTramo(); c.quitarDetalle('cesantia',0);
    expect(c.formulario.cesantia).toHaveLength(1); expect(c.formulario.iusc_tramos).toHaveLength(1);
  });
  it('bloquea publicacion con UTM ausente y tabla discontinua', () => {
    const datos = version(); Object.assign(datos.parametros,{pension_obligatoria_pct:'1',uf_valor_clp:'1',uf_fecha:'2026-09-30',tope_previsional_uf:'1',salud_legal_pct:'1'}); datos.afp[0].comision_pct='1';
    servicio.listar.mockReturnValue(of({versiones:[datos]})); const c = iniciar().componentInstance;
    c.formulario.utm_valor_clp=null; c.prepararPublicacion(); expect(c.error()).toContain('UTM'); expect(c.confirmarPublicacion()).toBe(false);
    c.formulario.utm_valor_clp='1'; c.formulario.iusc_tramos![0].desde_utm='1'; c.prepararPublicacion(); expect(c.error()).toContain('IUSC'); expect(c.confirmarPublicacion()).toBe(false);
  });

  it('octubre informa origen completo y permite editar copias independientes de septiembre', () => {
    servicio.listar.mockReturnValue(of({ versiones: [] }));
    const datos = version(); datos.origen_parametros = { anio: 2026, mes: 9, version: 2 };
    datos.parametros.utm_valor_clp = '70000.123456'; datos.parametros.tope_cesantia_uf = '135.2';
    const previo = structuredClone(datos); servicio.crear.mockReturnValue(of(datos));
    const c = iniciar().componentInstance; c.anio = 2026; c.mes = 10; c.crear();
    expect(c.mensaje()).toContain('Septiembre 2026'); expect(c.mensaje()).toContain('IUSC');
    expect(c.formulario.utm_valor_clp).toBe('70000.123456'); expect(c.formulario.tope_cesantia_uf).toBe('135.2');
    c.formulario.afp[0].comision_pct = '2'; c.formulario.utm_valor_clp = '71000';
    c.formulario.cesantia![0].trabajador_cic_pct = '0.6'; c.formulario.iusc_tramos![0].factor = '0.04';
    expect(datos).toEqual(previo);
  });
});
