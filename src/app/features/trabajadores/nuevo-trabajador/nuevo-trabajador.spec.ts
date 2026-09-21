import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RemuneracionesService } from '../../../shared/services/remuneraciones.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoTrabajador } from './nuevo-trabajador';

describe('NuevoTrabajador', () => {
  let component: NuevoTrabajador;
  let fixture: ComponentFixture<NuevoTrabajador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoTrabajador],
      providers: [provideRouter([]), { provide: RemuneracionesService, useValue: { getEmpresas: () => of({empresas: []}), getEmpresa: () => of({empresa: {status: "inactive"}, can_manage: false}) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevoTrabajador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('bloquea guardado cuando la empresa no est? habilitada', () => {
    component.empresaHabilitada = false; component.guardar();
    expect(component.errorMessage).toContain('Empresa inactiva');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
