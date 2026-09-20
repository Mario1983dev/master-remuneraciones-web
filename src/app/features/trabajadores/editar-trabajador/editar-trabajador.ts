import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  RemuneracionesService
} from '../../../shared/services/remuneraciones.service';

@Component({
  selector: 'app-editar-trabajador',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './editar-trabajador.html',
  styleUrl: './editar-trabajador.scss'
})
export class EditarTrabajador implements OnInit {

  trabajadorId = 0;
  companyId = 0;

  cargando = false;
  guardando = false;
  errorMessage = '';

  trabajador = {
    rut: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_ingreso: '',
    fecha_termino: '',
    tipo_contrato: '',
    cargo: '',
    sueldo_base: null as number | null,
    afp_nombre: '',
    salud_tipo: '',
    salud_institucion: '',
    salud_valor: null as number | null,
    salud_tipo_valor: '',
    estado: 1
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private remuneracionesService: RemuneracionesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.trabajadorId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!this.trabajadorId) {
      this.errorMessage = 'Trabajador inválido';
      return;
    }

    this.cargarTrabajador();
  }

  cargarTrabajador(): void {

    this.cargando = true;
    this.errorMessage = '';

    this.remuneracionesService
      .getTrabajador(this.trabajadorId)
      .subscribe({

        next: (response: any) => {

          console.log(
            'RESPUESTA EDITAR TRABAJADOR:',
            response
          );

          const trabajador =
            response?.trabajador || response;

          if (!trabajador) {
            this.errorMessage =
              'No se encontró información del trabajador';

            this.cargando = false;
            this.cdr.detectChanges();
            return;
          }

          this.companyId = Number(
            trabajador.company_id || 0
          );

          this.trabajador = {
            rut:
              trabajador.rut || '',

            nombres:
              trabajador.nombres || '',

            apellido_paterno:
              trabajador.apellido_paterno || '',

            apellido_materno:
              trabajador.apellido_materno || '',

            fecha_ingreso:
              this.formatearFecha(
                trabajador.fecha_ingreso
              ),

            fecha_termino:
              this.formatearFecha(
                trabajador.fecha_termino
              ),

            tipo_contrato:
              trabajador.tipo_contrato || '',

            cargo:
              trabajador.cargo || '',

            sueldo_base:
              trabajador.sueldo_base !== null &&
              trabajador.sueldo_base !== undefined
                ? Number(trabajador.sueldo_base)
                : null,

            afp_nombre:
              trabajador.afp_nombre || '',

            salud_tipo:
              trabajador.salud_tipo || '',

            salud_institucion:
              trabajador.salud_institucion || '',

            salud_valor:
              trabajador.salud_valor !== null &&
              trabajador.salud_valor !== undefined
                ? Number(trabajador.salud_valor)
                : null,

            salud_tipo_valor:
              trabajador.salud_tipo_valor || '',

            estado:
              Number(trabajador.estado ?? 1)
          };

          this.aplicarDatosFonasa();

          this.cargando = false;

          console.log(
            'TRABAJADOR PARA EDICIÓN:',
            this.trabajador
          );

          this.cdr.detectChanges();
        },

        error: (error: any) => {

          console.error(
            'ERROR CARGANDO TRABAJADOR:',
            error
          );

          this.errorMessage =
            error?.error?.message ||
            'No fue posible cargar el trabajador';

          this.cargando = false;

          this.cdr.detectChanges();
        }

      });
  }

  cambiarTipoSalud(): void {
    if (this.trabajador.salud_tipo === 'FONASA') {
      this.aplicarDatosFonasa();
    } else {
      this.trabajador.salud_institucion = '';
      this.trabajador.salud_valor = null;
      this.trabajador.salud_tipo_valor = '';
    }
  }

  private aplicarDatosFonasa(): void {
    if (this.trabajador.salud_tipo === 'FONASA') {
      this.trabajador.salud_institucion = 'FONASA';
      this.trabajador.salud_valor = 7;
      this.trabajador.salud_tipo_valor = 'PORCENTAJE';
    }
  }

  guardar(): void {

    this.errorMessage = '';
    this.aplicarDatosFonasa();

    if (
      !this.trabajador.rut.trim() ||
      !this.trabajador.nombres.trim() ||
      !this.trabajador.apellido_paterno.trim() ||
      !this.trabajador.fecha_ingreso
    ) {

      this.errorMessage =
        'RUT, nombres, apellido paterno y fecha de ingreso son obligatorios';

      return;
    }

    this.guardando = true;

    const datosActualizar = {
      ...this.trabajador,
      estado: Number(this.trabajador.estado)
    };

    console.log(
      'DATOS ACTUALIZAR TRABAJADOR:',
      datosActualizar
    );

    this.remuneracionesService
      .actualizarTrabajador(
        this.trabajadorId,
        datosActualizar
      )
      .subscribe({

        next: () => {

          this.guardando = false;

          this.router.navigate(
            ['/trabajadores'],
            {
              queryParams: {
                companyId: this.companyId
              }
            }
          );
        },

        error: (error: any) => {

          console.error(
            'ERROR ACTUALIZANDO TRABAJADOR:',
            error
          );

          this.errorMessage =
            error?.error?.message ||
            'No fue posible actualizar el trabajador';

          this.guardando = false;

          this.cdr.detectChanges();
        }

      });
  }

  private formatearFecha(
    fecha: string | null | undefined
  ): string {

    if (!fecha) {
      return '';
    }

    return String(fecha).substring(0, 10);
  }
}
