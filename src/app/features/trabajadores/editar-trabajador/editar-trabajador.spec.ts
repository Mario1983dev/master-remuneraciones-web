import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RemuneracionesService } from '../../../shared/services/remuneraciones.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarTrabajador } from './editar-trabajador';

describe('EditarTrabajador', () => {
  let component: EditarTrabajador;
  let fixture: ComponentFixture<EditarTrabajador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarTrabajador],
      providers: [provideRouter([]), { provide: RemuneracionesService, useValue: { getEmpresas: () => of({empresas: []}), getEmpresa: () => of({empresa: {status: "inactive"}, can_manage: false}) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(EditarTrabajador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
