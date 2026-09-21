import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Inicio } from './inicio';
import { ParametrosRemuneracionesService } from '../../shared/services/parametros-remuneraciones.service';

describe('Inicio por rol', () => {
  afterEach(() => localStorage.removeItem('token'));
  for (const rol of ['MASTER', 'OFFICE_ADMIN', 'OFFICE_USER']) {
    it(`muestra exclusivamente las tarjetas de ${rol}`, () => {
      localStorage.setItem('token', 'test.' + btoa(JSON.stringify({ role: rol })) + '.test');
      TestBed.configureTestingModule({ imports: [Inicio], providers: [provideRouter([]), { provide: ParametrosRemuneracionesService, useValue: { puedeAdministrar: () => of(rol === 'MASTER') } }] });
      const fixture = TestBed.createComponent(Inicio); fixture.detectChanges();
      const enlaces = Array.from(fixture.nativeElement.querySelectorAll('.dashboard-card') as NodeListOf<HTMLAnchorElement>).map(a => a.getAttribute('href'));
      expect(enlaces).toEqual(rol === 'MASTER' ? ['/parametros-remuneraciones', '/empresas', '/trabajadores', '/liquidaciones'] : ['/empresas', '/trabajadores', '/liquidaciones']);
    });
  }
});