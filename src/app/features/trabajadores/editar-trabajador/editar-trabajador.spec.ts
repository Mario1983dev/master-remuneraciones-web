import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarTrabajador } from './editar-trabajador';

describe('EditarTrabajador', () => {
  let component: EditarTrabajador;
  let fixture: ComponentFixture<EditarTrabajador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarTrabajador],
    }).compileComponents();

    fixture = TestBed.createComponent(EditarTrabajador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
