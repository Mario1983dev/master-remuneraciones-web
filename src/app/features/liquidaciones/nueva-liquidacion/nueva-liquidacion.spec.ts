import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NuevaLiquidacion } from './nueva-liquidacion';
import { RemuneracionesService } from '../../../shared/services/remuneraciones.service';

const publicado = () => ({ parametros: { id: 42, version: 3, estado: 'PUBLICADO', pension_obligatoria_pct: '10', salud_legal_pct: '7', uf_valor_clp: '40000', tope_previsional_uf: '25', uf_fecha: '2026-09-30', utm_valor_clp: '70000', tope_cesantia_uf: '40' }, afp: [{ afp_codigo: 'A', afp_nombre: 'AFP Prueba', comision_pct: '1.234567', vigente: true }], cesantia: [{ tipo_contrato: 'INDEFINIDO', regla_codigo: 'GENERAL', trabajador_cic_pct: '0', empleador_cic_pct: '2', empleador_fcs_pct: '1' }], iusc_tramos: [{ numero_tramo: 1, desde_utm: '0', hasta_utm: null, factor: '0', rebaja_utm: '0' }] });
const ficha = () => ({ trabajador: { afp_nombre: '  afp   prueba ', sueldo_base: 1200000, salud_tipo: 'FONASA', tipo_contrato: 'INDEFINIDO' } });

describe('Nueva Liquidaci\u00f3n con parámetros publicados', () => {
  let servicio: any;
  beforeEach(() => {
    servicio = { getEmpresas: vi.fn(() => of([])), getTrabajadores: vi.fn(() => of([])), getTrabajador: vi.fn(() => of(ficha())), getParametrosPeriodo: vi.fn(() => of(publicado())) };
    TestBed.configureTestingModule({ imports: [NuevaLiquidacion], providers: [provideRouter([]), { provide: RemuneracionesService, useValue: servicio }] });
  });
  function iniciar() {
    const f = TestBed.createComponent(NuevaLiquidacion); f.detectChanges();
    const c = f.componentInstance; c.empresaSeleccionada = '1'; c.trabajadorSeleccionado = '2'; c.anioSeleccionado = 2026; c.mesSeleccionado = 9; c.continuar();
    f.detectChanges(); return { f, c };
  }

  it('Nueva Liquidaci?n usa solo empresas activas y bloquea guardado de consulta', () => {
    servicio.getEmpresas.mockReturnValue(of({empresas:[{id:9,status:'inactive'},{id:10,status:'active'}],can_manage:false}));
    const f=TestBed.createComponent(NuevaLiquidacion);f.detectChanges();const c=f.componentInstance;
    expect(servicio.getEmpresas).toHaveBeenCalledWith(true);expect(c.empresas.map(e=>e.id)).toEqual([10]);
    expect(c.empresaSeleccionada).toBe('10');expect(c.puedeGuardar).toBe(false);
  });
  it('resuelve al cargar la regla unica del contrato y todos los resultados sin seleccion manual', () => {
    const p = publicado(); p.cesantia[0].regla_codigo = 'INDEFINIDO';
    p.cesantia[0].trabajador_cic_pct = '0.6';
    servicio.getParametrosPeriodo.mockReturnValue(of(p));
    const { c, f } = iniciar();
    expect(c.reglaCesantiaCodigo).toBe('INDEFINIDO');
    expect(f.nativeElement.querySelector('#regla-cesantia')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Regla aplicada automáticamente: INDEFINIDO');
    expect(c.cesantia('trabajador_cic_pct').monto).toBe(7200);
    expect(c.baseTributable().monto).toBe(1010454);
    expect(c.iusc().monto).toBe(0);
    expect(c.calcularTotalDescuentos()).toBe(189546);
    expect(c.calcularLiquidoEstimado()).toBe(1010454);
    expect(c.calcularDescuentoAfp()).toBe(112346);
    expect(c.calcularDescuentoSalud()).toBe(70000);
    expect(p.cesantia[0].regla_codigo).toBe('INDEFINIDO');
  });
  it('normaliza el tipo de contrato e ignora reglas de otros contratos', () => {
    const p = publicado();
    p.cesantia.push({ ...p.cesantia[0], tipo_contrato: 'PLAZO_FIJO', regla_codigo: 'PLAZO_FIJO' });
    servicio.getParametrosPeriodo.mockReturnValue(of(p));
    servicio.getTrabajador.mockReturnValue(of({ trabajador: { ...ficha().trabajador, tipo_contrato: ' indefinido ' } }));
    const { c } = iniciar();
    expect(c.reglaCesantiaCodigo).toBe('GENERAL'); expect(c.requiereSeleccionCesantia).toBe(false);
  });
  it('varias reglas conservan el selector y actualizan resultados al elegir', async () => {
    const p = publicado(); p.cesantia.push({ ...p.cesantia[0], regla_codigo: 'ESPECIAL', trabajador_cic_pct: '0.6' });
    servicio.getParametrosPeriodo.mockReturnValue(of(p));
    const { c, f } = iniciar();
    expect(c.reglaCesantiaCodigo).toBe(''); expect(c.calcularTotalDescuentos()).toBeNull();
    const selector = f.nativeElement.querySelector('#regla-cesantia') as HTMLSelectElement;
    expect(selector).not.toBeNull();
    await f.whenStable(); selector.value = 'ESPECIAL'; selector.dispatchEvent(new Event('change'));
    await f.whenStable();
    expect(c.reglaCesantiaCodigo).toBe('ESPECIAL');
    expect(c.cesantia('trabajador_cic_pct').monto).toBe(7200);
    expect(c.baseTributable().monto).toBe(1010454);
    expect(c.iusc().monto).toBe(0); expect(c.calcularTotalDescuentos()).toBe(189546);
    expect(c.calcularLiquidoEstimado()).toBe(1010454);
    expect(f.nativeElement.querySelector('#regla-cesantia')).not.toBeNull();
  });
  it('una regla especial no deduce condiciones ausentes de la ficha', () => {
    const p = publicado(); p.cesantia[0].regla_codigo = 'CESE_CIC_11_ANIOS';
    servicio.getParametrosPeriodo.mockReturnValue(of(p));
    const { c, f } = iniciar();
    expect(c.reglaCesantiaCodigo).toBe(''); expect(c.calcularLiquidoEstimado()).toBeNull();
    expect(f.nativeElement.querySelector('#regla-cesantia')).not.toBeNull();
  });
  it('sin regla coincidente o sin contrato conserva pendiente sin selector vacio', () => {
    servicio.getTrabajador.mockReturnValue(of({ trabajador: { ...ficha().trabajador, tipo_contrato: '' } }));
    const { c, f } = iniciar();
    expect(c.reglaCesantiaCodigo).toBe(''); expect(c.calcularLiquidoEstimado()).toBeNull();
    expect(f.nativeElement.querySelector('#regla-cesantia')).toBeNull();
    expect(c.cesantia('trabajador_cic_pct').pendiente).toContain('Falta el tipo');
    c.trabajador.tipo_contrato = 'PLAZO_FIJO';
    expect(c.reglasContrato).toHaveLength(0);
    expect(c.cesantia('trabajador_cic_pct').pendiente).toContain('No hay reglas');
  });
  it('cambiar periodo descarta la seleccion anterior y resuelve con las nuevas reglas', () => {
    const { c } = iniciar(); expect(c.reglaCesantiaCodigo).toBe('GENERAL');
    c.mesSeleccionado = 10; c.cambiarTrabajador(); expect(c.reglaCesantiaCodigo).toBe('');
    const p = publicado(); p.cesantia[0].regla_codigo = 'ESPECIAL';
    servicio.getParametrosPeriodo.mockReturnValue(of(p)); c.continuar();
    expect(c.reglaCesantiaCodigo).toBe(''); expect(c.requiereSeleccionCesantia).toBe(true);
    c.cambiarTrabajador(); servicio.getParametrosPeriodo.mockReturnValue(of(publicado())); c.continuar();
    expect(c.reglaCesantiaCodigo).toBe('GENERAL');
  });
  it('usa el período exacto, conserva versión y calcula conceptos con tope y seis decimales', () => {
    const { c, f } = iniciar();
    expect(servicio.getParametrosPeriodo).toHaveBeenCalledWith(2026, 9);
    expect(c.parametros).toMatchObject({ id: 42, version: 3 });
    expect(c.afpCodigo).toBe('A'); expect(c.resolverAfp).toBe(false);
    expect(c.afpAplicada?.comision_pct).toBe('1.234567');
    expect(c.calcularBaseImponible()).toBe(1200000); expect(c.calcularBasePrevisional()).toBe(1000000);
    expect(c.calcularPensionObligatoria()).toBe(100000); expect(c.calcularComisionAfp()).toBe(12346);
    expect(c.calcularDescuentoAfp()).toBe(112346); expect(c.calcularDescuentoSalud()).toBe(70000);
    c.liquidacion.apv_monto = 10000; c.liquidacion.apv_regimen = 'A'; c.liquidacion.otros_descuentos = 5000;
    expect(c.calcularTotalDescuentos()).toBe(197346); expect(c.calcularLiquidoEstimado()).toBe(1002654);
    expect(f.nativeElement.textContent).toContain('Base previsional utilizada');
  });
  it('no redondea una tasa a cuatro decimales ni la base antes de los conceptos', () => {
    const { c } = iniciar(); c.parametros!.uf_valor_clp = '40000.123456'; c.parametros!.tope_previsional_uf = '100';
    c.liquidacion.sueldo_base = 5000000;
    expect(c.calcularBasePrevisional()).toBeCloseTo(4000012.3456, 6);
    expect(c.calcularComisionAfp()).toBe(49383);
  });
  it('sin coincidencia exacta no elige AFP y permite resolver solo en esta liquidación', () => {
    servicio.getTrabajador.mockReturnValue(of({ trabajador: { ...ficha().trabajador, afp_nombre: 'Prueba' } }));
    const { c, f } = iniciar(); expect(c.afpCodigo).toBe(''); expect(c.resolverAfp).toBe(true);
    expect(f.nativeElement.querySelector('#afp-periodo')).not.toBeNull();
    expect(c.calcularTotalDescuentos()).toBeNull(); expect(c.calcularLiquidoEstimado()).toBeNull();
    c.afpCodigo = 'A'; expect(c.calcularDescuentoAfp()).toBe(112346);
    expect(c.trabajador.afp_nombre).toBe('Prueba');
  });
  it('no resuelve automáticamente nombres ambiguos y excluye AFP no vigentes', () => {
    const p = publicado(); p.afp.push({ ...p.afp[0], afp_codigo: 'B' });
    p.afp.push({ ...p.afp[0], afp_codigo: 'C', vigente: false });
    servicio.getParametrosPeriodo.mockReturnValue(of(p));
    const { c } = iniciar(); expect(c.afpCodigo).toBe(''); expect(c.afpsVigentes).toHaveLength(2);
  });
  it('comisión NULL queda pendiente, cero expl?cito es v?lido, y salud usa la tasa publicada', () => {
    const { c } = iniciar(); c.afpsVigentes[0].comision_pct = null;
    expect(c.calcularComisionAfp()).toBeNull(); expect(c.calcularTotalDescuentos()).toBeNull();
    c.afpsVigentes[0].comision_pct = '0'; expect(c.calcularComisionAfp()).toBe(0);
    c.parametros!.salud_legal_pct = '6.123456'; expect(c.calcularDescuentoSalud()).toBe(61235);
    c.parametros!.uf_valor_clp = null; expect(c.calcularBasePrevisional()).toBeNull(); expect(c.calcularLiquidoEstimado()).toBeNull();
  });
  it('mantiene Isapre pesos y pendientes UF o plan ausente sin convertirlos en cero', () => {
    const { c } = iniciar(); c.liquidacion.salud_tipo = 'ISAPRE'; c.liquidacion.salud_tipo_valor = 'PESOS';
    expect(c.liquidacion.salud_valor).toBeNull(); expect(c.calcularDescuentoSalud()).toBeNull();
    c.liquidacion.salud_valor = 54321; expect(c.calcularDescuentoSalud()).toBe(54321);
    c.liquidacion.salud_tipo_valor = 'UF'; expect(c.calcularDescuentoSalud()).toBeNull(); expect(c.calcularLiquidoEstimado()).toBeNull();
  });
  it('sin publicación no muestra un cálculo y permite reintentar', () => {
    servicio.getParametrosPeriodo.mockReturnValue(throwError(() => ({ error: { message: 'No existe una version publicada disponible' } })));
    const { c } = iniciar(); expect(c.parametros).toBeNull(); expect(c.mostrarFormularioLiquidacion).toBe(false);
    expect(c.errorMessage).toContain('publicada'); expect(c.cargandoTrabajador).toBe(false);
  });
  it('cambiar período cancela respuestas tardías y exige cargar nuevamente', () => {
    const pendiente = new Subject<any>(); servicio.getParametrosPeriodo.mockReturnValue(pendiente);
    const { c } = iniciar(); c.mesSeleccionado = 10; c.cambiarTrabajador();
    pendiente.next(publicado()); pendiente.complete();
    expect(c.parametros).toBeNull(); expect(c.trabajador).toBeNull(); expect(c.mostrarFormularioLiquidacion).toBe(false);
    servicio.getParametrosPeriodo.mockReturnValue(of(publicado())); c.continuar();
    expect(servicio.getParametrosPeriodo).toHaveBeenLastCalledWith(2026, 10); expect(c.parametros?.id).toBe(42);
    c.cambiarEmpresa(); expect(c.parametros).toBeNull(); expect(c.afpCodigo).toBe(''); expect(c.calcularLiquidoEstimado()).toBeNull();
  });

  it('incluye solo cesantia trabajador e IUSC y conserva los aportes empleador separados', () => {
    const { c } = iniciar(); c.liquidacion.sueldo_base = 2000000;
    c.parametros!.tope_previsional_uf = '90'; c.afpsVigentes[0].comision_pct = '1.44';
    c.parametros!.tope_cesantia_uf = '135';
    c.reglasCesantia[0].trabajador_cic_pct = '0.6'; c.reglasCesantia[0].empleador_cic_pct = '1.6'; c.reglasCesantia[0].empleador_fcs_pct = '0.8';
    c.tramosIusc = [
      { numero_tramo: 1, desde_utm: '0', hasta_utm: '13.5', factor: '0', rebaja_utm: '0' },
      { numero_tramo: 2, desde_utm: '13.5', hasta_utm: null, factor: '0.04', rebaja_utm: '0.54' }
    ];
    expect(c.calcularDescuentoAfp()).toBe(228800); expect(c.calcularDescuentoSalud()).toBe(140000);
    expect(c.cesantia('trabajador_cic_pct').monto).toBe(12000);
    expect(c.cesantia('empleador_cic_pct').monto).toBe(32000); expect(c.cesantia('empleador_fcs_pct').monto).toBe(16000);
    expect(c.baseTributable().monto).toBe(1619200); expect(c.iusc().monto).toBe(26968);
    expect(c.calcularTotalDescuentos()).toBe(407768); expect(c.calcularLiquidoEstimado()).toBe(1592232);
    c.reglasCesantia[0].empleador_cic_pct = null; expect(c.calcularLiquidoEstimado()).toBe(1592232);
  });
  it('plazo fijo exige cero publicado para trabajador y no toma aportes empleador', () => {
    const { c } = iniciar(); c.trabajador.tipo_contrato = 'PLAZO_FIJO'; c.reglasCesantia[0].tipo_contrato = 'PLAZO_FIJO';
    expect(c.cesantia('trabajador_cic_pct').monto).toBe(0);
    c.reglasCesantia[0].trabajador_cic_pct = '0.6'; expect(c.cesantia('trabajador_cic_pct').monto).toBeNull();
    c.reglasCesantia[0].trabajador_cic_pct = null; expect(c.cesantia('trabajador_cic_pct').monto).toBeNull();
  });
  it('exige regla confirmada, topes y tabla; invalida tambien la regla al cambiar periodo', () => {
    const { c } = iniciar(); c.reglaCesantiaCodigo = ''; expect(c.calcularLiquidoEstimado()).toBeNull();
    c.reglaCesantiaCodigo = 'GENERAL'; c.reglasCesantia[0].trabajador_cic_pct = '0.6';
    c.parametros!.tope_cesantia_uf = null; expect(c.cesantia('trabajador_cic_pct').monto).toBeNull();
    c.parametros!.tope_cesantia_uf = '10'; expect(c.cesantia('trabajador_cic_pct').monto).toBe(2400);
    c.tramosIusc = []; expect(c.iusc().pendiente).toContain('tramos');
    c.cambiarTrabajador(); expect(c.reglasCesantia).toEqual([]); expect(c.tramosIusc).toEqual([]); expect(c.reglaCesantiaCodigo).toBe('');
  });
  it('APV A no rebaja impuesto; B o desconocido queda pendiente sin limite parametrizado', () => {
    const { c } = iniciar(); const base = c.baseTributable().monto;
    c.liquidacion.apv_monto = 50000; c.liquidacion.apv_regimen = 'A'; expect(c.baseTributable().monto).toBe(base);
    c.liquidacion.apv_regimen = 'B'; expect(c.iusc().pendiente).toContain('APV'); expect(c.calcularLiquidoEstimado()).toBeNull();
  });
  it('rebaja salud adicional solo hasta el tope legal publicado sin alterar descuento Isapre', () => {
    const { c } = iniciar(); c.liquidacion.sueldo_base = 500000;
    c.liquidacion.salud_tipo = 'ISAPRE'; c.liquidacion.salud_tipo_valor = 'PESOS'; c.liquidacion.salud_valor = 80000;
    expect(c.calcularDescuentoSalud()).toBe(80000);
    expect(c.baseTributable().monto).toBe(500000 - c.calcularDescuentoAfp()! - 70000);
  });
});


describe('Guardado mensual', () => {
  let servicio: any;
  let respuesta: Subject<any>;
  beforeEach(() => {
    respuesta = new Subject();
    servicio = {
      getEmpresas: vi.fn(() => of({ empresas: [{ id: 1, status: 'active' }], can_manage: true })), getTrabajadores: vi.fn(() => of([{ id: 2 }])),
      getTrabajador: vi.fn(() => of({ trabajador: { ...ficha().trabajador, id: 2, company_id: 1 } })),
      getParametrosPeriodo: vi.fn(() => of(publicado())), crearLiquidacion: vi.fn(() => respuesta)
    };
    TestBed.configureTestingModule({ imports: [NuevaLiquidacion], providers: [provideRouter([]), { provide: RemuneracionesService, useValue: servicio }] });
  });
  function preparar() {
    const f = TestBed.createComponent(NuevaLiquidacion); f.detectChanges();
    const c = f.componentInstance; c.trabajadorSeleccionado = '2'; c.anioSeleccionado = 2026; c.mesSeleccionado = 9;
    c.continuar(); f.detectChanges();
    return { c, f };
  }
  it('conserva entrada, version y resultados, evita doble envio y vuelve al periodo guardado', () => {
    const { c, f } = preparar(); const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.liquidacion.anticipos = 15000; c.liquidacion.prestamos = 20000;
    expect(c.calcularTotalDescuentos()).toBe(217346);
    expect(c.puedeGuardar).toBe(true); c.guardarLiquidacion(); c.guardarLiquidacion(); f.detectChanges();
    expect(servicio.crearLiquidacion).toHaveBeenCalledTimes(1); expect(c.guardando).toBe(true);
    expect(f.nativeElement.textContent).toContain('Guardando...');
    expect(f.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const payload = servicio.crearLiquidacion.mock.calls[0][0];
    expect(payload).toMatchObject({ empresa_id: 1, trabajador_id: 2, anio: 2026, mes: 9, parametros_version_id: 42,
      parametros_version: 3, afp_codigo: 'A', datos: { anticipos: 15000, prestamos: 20000 },
      resultados: { pension_obligatoria: 100000, comision_afp: 12346, total_descuentos: 217346 } });
    c.liquidacion.bonos = 999; expect(payload.datos.bonos).toBe(0);
    respuesta.next({ id: 8 }); respuesta.complete();
    expect(navegar).toHaveBeenCalledWith(['/liquidaciones'], { queryParams: { companyId: 1, anio: 2026, mes: 9 } });
    c.guardarLiquidacion(); expect(servicio.crearLiquidacion).toHaveBeenCalledTimes(1);
  });
  it('bloquea resultados pendientes, periodo cambiado y trabajador ajeno', () => {
    const { c } = preparar(); c.afpCodigo = ''; c.guardarLiquidacion(); expect(c.puedeGuardar).toBe(false);
    c.afpCodigo = 'A'; c.mesSeleccionado = 10; c.guardarLiquidacion();
    c.mesSeleccionado = 9; c.trabajador.company_id = 3; c.guardarLiquidacion();
    expect(servicio.crearLiquidacion).not.toHaveBeenCalled();
  });
  it('muestra error del servidor, libera el bloqueo y permite reintentar', () => {
    const { c } = preparar(); c.guardarLiquidacion();
    respuesta.error({ error: { message: 'Ya existe una liquidación para este período.' } });
    expect(c.guardando).toBe(false); expect(c.guardada).toBe(false); expect(c.errorMessage).toContain('Ya existe');
    servicio.crearLiquidacion.mockReturnValue(new Subject()); c.guardarLiquidacion();
    expect(servicio.crearLiquidacion).toHaveBeenCalledTimes(2);
  });
});
