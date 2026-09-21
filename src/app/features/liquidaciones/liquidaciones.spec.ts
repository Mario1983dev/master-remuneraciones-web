import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Liquidaciones } from './liquidaciones';
import { RemuneracionesService } from '../../shared/services/remuneraciones.service';

describe('Lista de liquidaciones guardadas', () => {
  it('recupera empresa y periodo de retorno, muestra datos y descarta respuestas anteriores', () => {
    const pendiente = new Subject<any>();
    const api = { getEmpresas: () => of([{ id: 1 }, { id: 2 }]), getLiquidaciones: vi.fn(() => pendiente) };
    TestBed.configureTestingModule({ imports: [Liquidaciones], providers: [provideRouter([]),
      { provide: RemuneracionesService, useValue: api },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map([['companyId', '2'], ['anio', '2025'], ['mes', '3']]) } } }
    ] });
    const f = TestBed.createComponent(Liquidaciones); f.detectChanges();
    expect(api.getLiquidaciones).toHaveBeenCalledWith(2, 2025, 3);
    const actual = new Subject<any>(); api.getLiquidaciones.mockReturnValue(actual);
    const c = f.componentInstance; c.mesSeleccionado = 4; c.cambiarPeriodo();
    pendiente.next({ liquidaciones: [{ trabajador: 'Respuesta antigua' }] });
    expect(c.liquidaciones).toEqual([]);
    actual.next({ liquidaciones: [{ trabajador: 'Ana Prueba', anio: 2025, mes: 4, total_haberes: 100, total_descuentos: 10, liquido: 90 }] });
    expect(f.nativeElement.textContent).toContain('Ana Prueba');
    expect(c.cargandoLiquidaciones).toBe(false);
  });
});

describe('Visor del PDF histórico', () => {
  const fila = { id: 17, anio: 2026, mes: 9, trabajador: 'Ana' };
  function preparar(respuesta: any) {
    const visor = { closed: false, opener: {}, document: { title: '', body: { textContent: '' } },
      location: { replace: vi.fn() }, close: vi.fn() };
    const abrir = vi.spyOn(window, 'open').mockReturnValue(visor as unknown as Window);
    const crearUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:prueba');
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const api = { getEmpresas: () => of([]), descargarLiquidacionPdf: vi.fn(() => respuesta) };
    TestBed.configureTestingModule({ imports: [Liquidaciones], providers: [provideRouter([]),
      { provide: RemuneracionesService, useValue: api }] });
    const f = TestBed.createComponent(Liquidaciones); f.detectChanges();
    f.componentInstance.liquidaciones = [fila]; f.componentInstance['cdr'].detectChanges();
    return { f, c: f.componentInstance, api, visor, abrir, crearUrl, revocar };
  }
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
  it('Ver PDF abre durante el clic, evita duplicados y mantiene el archivo hasta cerrar el visor', () => {
    vi.useFakeTimers();
    const respuesta = new Subject<Blob>(); const { c, f, api, visor, abrir, revocar } = preparar(respuesta);
    const boton = f.nativeElement.querySelector('.btn-ver') as HTMLButtonElement;
    expect(boton.textContent).toContain('Ver PDF'); boton.click();
    expect(abrir).toHaveBeenCalledExactlyOnceWith('', '_blank');
    expect(visor.location.replace).not.toHaveBeenCalled();
    c.verPdf(fila);
    expect(api.descargarLiquidacionPdf).toHaveBeenCalledExactlyOnceWith(17);
    expect(boton.disabled).toBe(true); expect(boton.textContent).toContain('Abriendo...');
    respuesta.next(new Blob(['%PDF'], { type: 'application/pdf' })); respuesta.complete();
    expect(visor.location.replace).toHaveBeenCalledWith('blob:prueba');
    expect(visor.opener).toBeNull(); expect(visor.close).not.toHaveBeenCalled();
    expect(c.descargandoPdfId).toBeNull();
    f.destroy(); vi.advanceTimersByTime(60000); expect(revocar).not.toHaveBeenCalled();
    visor.closed = true; vi.advanceTimersByTime(1000);
    expect(revocar).toHaveBeenCalledExactlyOnceWith('blob:prueba');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('explica el bloqueo de ventanas sin solicitar el PDF', () => {
    const { c, api, abrir } = preparar(of(null)); abrir.mockReturnValue(null); c.verPdf(fila);
    expect(c.errorMessage).toContain('ventanas emergentes'); expect(api.descargarLiquidacionPdf).not.toHaveBeenCalled();
  });
  it('muestra el error JSON y cierra la ventana pendiente', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    Object.defineProperty(blob, 'text', { value: async () => JSON.stringify({ message: 'Snapshot histórico incompleto.' }) });
    const { c, visor } = preparar(throwError(() => ({ error: blob }))); c.verPdf(fila);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(c.errorMessage).toBe('Snapshot histórico incompleto.');
    expect(c.descargandoPdfId).toBeNull(); expect(visor.close).toHaveBeenCalledOnce();
  });
  it('rechaza respuestas inválidas y cancela la petición al salir', () => {
    const { c, f, api, visor } = preparar(of(new Blob(['error'], { type: 'text/html' })));
    c.verPdf(fila); expect(c.errorMessage).toContain('PDF válido'); expect(visor.close).toHaveBeenCalledOnce();
    const respuesta = new Subject<Blob>(); api.descargarLiquidacionPdf.mockReturnValue(respuesta);
    c.verPdf(fila); expect(respuesta.observed).toBe(true);
    f.destroy(); expect(respuesta.observed).toBe(false); expect(visor.close).toHaveBeenCalledTimes(2);
  });
  it('no crea un Blob si el usuario cierra la ventana durante la petición', () => {
    const respuesta = new Subject<Blob>(); const { c, visor, crearUrl } = preparar(respuesta);
    c.verPdf(fila); visor.closed = true;
    respuesta.next(new Blob(['%PDF'], { type: 'application/pdf' })); respuesta.complete();
    expect(crearUrl).not.toHaveBeenCalled(); expect(c.descargandoPdfId).toBeNull();
  });
});
