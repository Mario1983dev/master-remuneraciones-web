import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { RemuneracionesService } from '../../../shared/services/remuneraciones.service';

@Component({
  selector: 'app-detalle-trabajador',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './detalle-trabajador.html',
  styleUrl: './detalle-trabajador.scss'
})
export class DetalleTrabajador implements OnInit {

  trabajadorId = 0;
  companyId = '';

  trabajador: any = null;

  cargando = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private remuneracionesService: RemuneracionesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.obtenerParametros();
    this.cargarTrabajador();
  }

  private obtenerParametros(): void {

    this.trabajadorId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    this.companyId =
      this.route.snapshot.queryParamMap.get('companyId') || '';

    console.log('TRABAJADOR ID:', this.trabajadorId);
    console.log('COMPANY ID:', this.companyId);
  }

  cargarTrabajador(): void {

    if (!this.trabajadorId) {
      this.errorMessage = 'Trabajador no válido';
      this.cargando = false;
      return;
    }

    this.cargando = true;
    this.errorMessage = '';
    this.trabajador = null;

    this.remuneracionesService
      .getTrabajador(this.trabajadorId)
      .subscribe({

        next: (response: any) => {

          console.log(
            'RESPUESTA DETALLE TRABAJADOR:',
            response
          );

          this.trabajador =
            response?.trabajador ?? response ?? null;

          this.cargando = false;

          console.log(
            'TRABAJADOR CARGADO:',
            this.trabajador
          );

          this.cdr.detectChanges();
        },

        error: (error: any) => {

          console.error(
            'ERROR CARGANDO TRABAJADOR:',
            error
          );

          this.trabajador = null;

          this.errorMessage =
            error?.error?.message ||
            'No fue posible cargar el trabajador';

          this.cargando = false;

          this.cdr.detectChanges();
        }

      });
  }
}