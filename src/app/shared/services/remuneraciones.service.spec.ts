import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RemuneracionesService } from './remuneraciones.service';
import { CrearLiquidacion } from './liquidacion.model';

describe('API liquidaciones', () => {
  it('descarga el PDF como Blob y conserva la autenticacion', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    localStorage.setItem('token', 'prueba-pdf');
    const api = TestBed.inject(RemuneracionesService), http = TestBed.inject(HttpTestingController);
    const pdf = new Blob(['%PDF-1.3'], { type: 'application/pdf' });
    api.descargarLiquidacionPdf(17).subscribe(resultado => expect(resultado).toBe(pdf));
    const req = http.expectOne('http://localhost:3001/api/remuneraciones/liquidaciones/17/pdf');
    expect(req.request.method).toBe('GET'); expect(req.request.responseType).toBe('blob');
    expect(req.request.headers.get('Authorization')).toBe('Bearer prueba-pdf');
    req.flush(pdf); http.verify(); localStorage.removeItem('token');
  });
  it('envia snapshot de entrada autenticado y consulta el periodo exacto', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    localStorage.setItem('token', 'prueba');
    const api = TestBed.inject(RemuneracionesService), http = TestBed.inject(HttpTestingController);
    const payload = { empresa_id: 1, trabajador_id: 2, anio: 2026, mes: 9 } as CrearLiquidacion;
    api.crearLiquidacion(payload).subscribe(r => expect(r.id).toBe(8));
    const post = http.expectOne('http://localhost:3001/api/remuneraciones/liquidaciones');
    expect(post.request.method).toBe('POST'); expect(post.request.body).toEqual(payload);
    expect(post.request.headers.get('Authorization')).toBe('Bearer prueba'); post.flush({ id: 8 });
    api.getLiquidaciones(1, 2026, 9).subscribe();
    const get = http.expectOne(r => r.method === 'GET' && r.params.get('empresa_id') === '1' && r.params.get('anio') === '2026' && r.params.get('mes') === '9');
    get.flush({ liquidaciones: [] }); http.verify(); localStorage.removeItem('token');
  });
});

  describe('Empresas propias API', () => {
    it('usa únicamente rutas Remuneraciones, filtra activas y envía credenciales', () => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
      const api = TestBed.inject(RemuneracionesService), http = TestBed.inject(HttpTestingController);
      localStorage.setItem('token', 'empresas-token');
      api.getEmpresas(true).subscribe();
      const list = http.expectOne('http://localhost:3001/api/remuneraciones/empresas?status=active');
      expect(list.request.headers.get('Authorization')).toBe('Bearer empresas-token');list.flush({empresas:[]});
      api.crearEmpresa({rut:'76123456-0',name:'Propia'}).subscribe();
      const create=http.expectOne('http://localhost:3001/api/remuneraciones/empresas');expect(create.request.method).toBe('POST');create.flush({id:10});
      api.getEmpresa(10).subscribe();http.expectOne('http://localhost:3001/api/remuneraciones/empresas/10').flush({empresa:{id:10}});
      api.actualizarEmpresa(10,{name:'Editada'}).subscribe();const edit=http.expectOne('http://localhost:3001/api/remuneraciones/empresas/10');expect(edit.request.method).toBe('PUT');edit.flush({id:10});
      api.cambiarEstadoEmpresa(10,'inactive').subscribe();const state=http.expectOne('http://localhost:3001/api/remuneraciones/empresas/10/estado');expect(state.request.method).toBe('PATCH');expect(state.request.body).toEqual({status:'inactive'});state.flush({id:10});
      http.verify();localStorage.removeItem('token');
    });
  });
