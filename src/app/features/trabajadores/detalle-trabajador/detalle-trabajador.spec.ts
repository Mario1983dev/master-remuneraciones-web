import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RemuneracionesService } from '../../../shared/services/remuneraciones.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleTrabajador } from './detalle-trabajador';

describe('DetalleTrabajador', () => {
  let component: DetalleTrabajador;
  let fixture: ComponentFixture<DetalleTrabajador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleTrabajador],
      providers: [provideRouter([]), { provide: RemuneracionesService, useValue: { getEmpresas: () => of({empresas: []}), getEmpresa: () => of({empresa: {status: "inactive"}, can_manage: false}) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleTrabajador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
