import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ParametrosRemuneracionesService } from './parametros-remuneraciones.service';

describe('Servicio de administración de parámetros', () => {
  let servicio: ParametrosRemuneracionesService;
  let http: HttpTestingController;
  const base = 'http://localhost:3001/api/remuneraciones';
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ParametrosRemuneracionesService); http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });
  afterEach(() => { http.verify(); localStorage.clear(); });
  it('oculta administración sin token o con rol de oficina', () => {
    servicio.puedeAdministrar().subscribe(permitido => expect(permitido).toBe(false));
    localStorage.setItem('token', 'test.' + btoa(JSON.stringify({ role: 'OFFICE_ADMIN' })) + '.test');
    servicio.puedeAdministrar().subscribe(permitido => expect(permitido).toBe(false));
    http.expectNone(base + '/access');
  });
  it('MASTER debe además tener acceso a Remuneraciones', () => {
    localStorage.setItem('token', 'test.' + btoa(JSON.stringify({ role: 'MASTER' })) + '.test');
    servicio.puedeAdministrar().subscribe(permitido => expect(permitido).toBe(true));
    http.expectOne(base + '/access').flush({ allowed: true });
    servicio.puedeAdministrar().subscribe(permitido => expect(permitido).toBe(false));
    http.expectOne(base + '/access').flush({}, { status: 403, statusText: 'Forbidden' });
  });
  it('usa los cuatro endpoints, origen explícito y autorización Bearer', () => {
    localStorage.setItem('token', 'token-prueba');
    const url = base + '/parametros/2026/9/versiones';
    servicio.listar(2026, 9).subscribe();
    const listado = http.expectOne(url); expect(listado.request.method).toBe('GET'); expect(listado.request.headers.get('Authorization')).toBe('Bearer token-prueba'); listado.flush({ versiones: [] });
    servicio.crear(2026, 9).subscribe();
    const inicial = http.expectOne(url); expect(inicial.request.method).toBe('POST'); expect(inicial.request.body).toEqual({}); inicial.flush({});
    servicio.crear(2026, 9, 2).subscribe();
    const copia = http.expectOne(url); expect(copia.request.body).toEqual({ version_origen: 2 }); copia.flush({});
    const datos = { pension_obligatoria_pct: null, uf_valor_clp: null, uf_fecha: null, tope_previsional_uf: null, salud_legal_pct: null, afp: [{ afp_codigo: 'PRUEBA', afp_nombre: 'AFP de prueba', comision_pct: null, vigente: true }] };
    servicio.guardar(2026, 9, 3, datos).subscribe();
    const guardado = http.expectOne(url + '/3'); expect(guardado.request.method).toBe('PUT'); expect(guardado.request.body).toEqual(datos); guardado.flush({});
    servicio.publicar(2026, 9, 3).subscribe();
    const publicado = http.expectOne(url + '/3/publicar'); expect(publicado.request.method).toBe('POST'); expect(publicado.request.body).toEqual({}); publicado.flush({});
  });
});