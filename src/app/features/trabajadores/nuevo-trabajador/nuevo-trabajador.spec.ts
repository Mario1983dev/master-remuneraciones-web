import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoTrabajador } from './nuevo-trabajador';

describe('NuevoTrabajador', () => {
  let component: NuevoTrabajador;
  let fixture: ComponentFixture<NuevoTrabajador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoTrabajador],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevoTrabajador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
