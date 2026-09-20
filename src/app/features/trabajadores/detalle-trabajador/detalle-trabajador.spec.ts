import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleTrabajador } from './detalle-trabajador';

describe('DetalleTrabajador', () => {
  let component: DetalleTrabajador;
  let fixture: ComponentFixture<DetalleTrabajador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleTrabajador],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleTrabajador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
