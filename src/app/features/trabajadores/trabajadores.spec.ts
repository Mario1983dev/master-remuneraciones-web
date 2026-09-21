import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RemuneracionesService } from '../../shared/services/remuneraciones.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Trabajadores } from './trabajadores';

describe('Trabajadores', () => {
  let component: Trabajadores;
  let fixture: ComponentFixture<Trabajadores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trabajadores],
      providers: [provideRouter([]), { provide: RemuneracionesService, useValue: { getEmpresas: () => of({empresas: []}), getEmpresa: () => of({empresa: {status: "inactive"}, can_manage: false}) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Trabajadores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
