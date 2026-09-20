import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  RemuneracionesService
} from '../../shared/services/remuneraciones.service';

@Component({
  selector: 'app-trabajadores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './trabajadores.html',
  styleUrl: './trabajadores.scss'
})
export class Trabajadores implements OnInit {

  empresas: any[] = [];
  trabajadores: any[] = [];

  empresaSeleccionada = '';

  cargandoEmpresas = false;
  cargandoTrabajadores = false;

  errorMessage = '';

  constructor(
    private remuneracionesService: RemuneracionesService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarEmpresas();
  }


  // =========================================================
  // CARGAR EMPRESAS
  // =========================================================
  cargarEmpresas(): void {

    this.cargandoEmpresas = true;
    this.errorMessage = '';

    this.remuneracionesService
      .getEmpresas()
      .subscribe({

        next: (response: any) => {

          console.log(
            'RESPUESTA EMPRESAS:',
            response
          );

          this.empresas =
            response?.empresas || [];

          this.cargandoEmpresas = false;

          const companyIdUrl = Number(
            this.route.snapshot
              .queryParamMap
              .get('companyId')
          );

          if (companyIdUrl) {

            const existeEmpresa =
              this.empresas.some(
                empresa =>
                  Number(empresa.id) ===
                  companyIdUrl
              );

            if (existeEmpresa) {

              this.empresaSeleccionada =
                String(companyIdUrl);

              this.onEmpresaChange();
            }
          }

          // Forzar actualización visual
          this.cdr.detectChanges();
        },


        error: (error) => {

          console.error(
            'ERROR CARGANDO EMPRESAS:',
            error
          );

          this.empresas = [];

          this.errorMessage =
            'No fue posible cargar las empresas';

          this.cargandoEmpresas = false;

          // Forzar actualización visual
          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // CAMBIAR EMPRESA
  // =========================================================
  onEmpresaChange(): void {

    this.trabajadores = [];
    this.errorMessage = '';

    const companyId = Number(
      this.empresaSeleccionada
    );

    if (!companyId) {

      this.cargandoTrabajadores = false;

      this.cdr.detectChanges();

      return;
    }

    this.cargandoTrabajadores = true;

    this.remuneracionesService
      .getTrabajadores(companyId)
      .subscribe({

        next: (response: any) => {

          console.log(
            'RESPUESTA TRABAJADORES:',
            response
          );

          this.trabajadores =
            response?.trabajadores || [];

          this.cargandoTrabajadores = false;

          // Forzar actualización visual
          this.cdr.detectChanges();
        },


        error: (error) => {

          console.error(
            'ERROR CARGANDO TRABAJADORES:',
            error
          );

          this.trabajadores = [];

          this.errorMessage =
            'No fue posible cargar los trabajadores';

          this.cargandoTrabajadores = false;

          // Forzar actualización visual
          this.cdr.detectChanges();
        }

      });
  }
}