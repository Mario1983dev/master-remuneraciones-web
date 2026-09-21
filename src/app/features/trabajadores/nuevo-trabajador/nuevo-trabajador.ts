import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { RemuneracionesService } from '../../../shared/services/remuneraciones.service';

@Component({
  selector: 'app-nuevo-trabajador',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './nuevo-trabajador.html',
  styleUrl: './nuevo-trabajador.scss'
})
export class NuevoTrabajador implements OnInit {

  companyId = 0;

  empresaHabilitada = false;
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
    sueldo_base: null,
    afp_nombre: '',
    salud_tipo: '',
    salud_institucion: '',
    salud_valor: null as number | null,
    salud_tipo_valor: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private remuneracionesService: RemuneracionesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.companyId = Number(
      this.route.snapshot.queryParamMap.get('companyId')
    );

    if (this.companyId) this.remuneracionesService.getEmpresa(this.companyId).subscribe({
      next: response => { this.empresaHabilitada = response.can_manage === true && response.empresa?.status === 'active';
        if (!this.empresaHabilitada) this.errorMessage = 'Empresa inactiva o acceso de solo consulta'; this.cdr.markForCheck(); },
      error: () => { this.errorMessage = 'Empresa no disponible'; this.cdr.markForCheck(); }
    });

    if (!this.companyId) {
      this.errorMessage = 'No se recibió una empresa válida';
    }
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
    if (!this.empresaHabilitada) { this.errorMessage = 'Empresa inactiva o acceso de solo consulta'; return; }
    this.errorMessage = '';
    this.aplicarDatosFonasa();

    if (!this.companyId) {
      this.errorMessage = 'Debe seleccionar una empresa';
      return;
    }

    if (
      !this.trabajador.rut ||
      !this.trabajador.nombres ||
      !this.trabajador.apellido_paterno ||
      !this.trabajador.fecha_ingreso
    ) {
      this.errorMessage =
        'RUT, nombres, apellido paterno y fecha de ingreso son obligatorios';
      return;
    }

    this.guardando = true;

    this.remuneracionesService
      .crearTrabajador(this.companyId, this.trabajador)
      .subscribe({
        next: () => {
          this.guardando = false;

          this.router.navigate(['/trabajadores'], {
            queryParams: {
              companyId: this.companyId
            }
          });
        },
        error: (error) => {
          console.error('Error creando trabajador:', error);

          this.errorMessage =
            error?.error?.message || 'No fue posible crear el trabajador';

          this.guardando = false;
        }
      });
  }
}
