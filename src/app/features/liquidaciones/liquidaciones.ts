import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { RemuneracionesService } from '../../shared/services/remuneraciones.service';

@Component({
  selector: 'app-liquidaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './liquidaciones.html',
  styleUrl: './liquidaciones.scss',
})
export class Liquidaciones implements OnInit {

  empresas: any[] = [];
  liquidaciones: any[] = [];

  empresaSeleccionada = '';

  mesSeleccionado = new Date().getMonth() + 1;
  anioSeleccionado = new Date().getFullYear();

  cargandoEmpresas = false;
  cargandoLiquidaciones = false;

  errorMessage = '';

  meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  anios: number[] = [];

  constructor(
    private remuneracionesService: RemuneracionesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.generarAnios();
    this.cargarEmpresas();
  }

  generarAnios(): void {
    const anioActual = new Date().getFullYear();

    this.anios = [
      anioActual,
      anioActual - 1,
      anioActual - 2,
      anioActual - 3,
      anioActual - 4
    ];
  }

  cargarEmpresas(): void {
    this.cargandoEmpresas = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    this.remuneracionesService.getEmpresas().subscribe({
      next: (response: any) => {

        if (Array.isArray(response)) {
          this.empresas = response;

        } else if (Array.isArray(response?.empresas)) {
          this.empresas = response.empresas;

        } else if (response?.id) {
          this.empresas = [response];

        } else {
          this.empresas = [];
        }

        console.log('Empresas cargadas:', this.empresas);

        this.cargandoEmpresas = false;

        // Si solo existe una empresa, seleccionarla automáticamente
        if (this.empresas.length === 1) {
          this.empresaSeleccionada =
            String(this.empresas[0].id);

          this.cargarLiquidaciones();
        }

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Error al cargar empresas:', error);

        this.empresas = [];
        this.errorMessage =
          'No fue posible cargar las empresas.';

        this.cargandoEmpresas = false;

        this.cdr.detectChanges();
      }
    });
  }

  cambiarEmpresa(): void {
    this.liquidaciones = [];
    this.errorMessage = '';

    if (!this.empresaSeleccionada) {
      this.cdr.detectChanges();
      return;
    }

    this.cargarLiquidaciones();
  }

  cambiarPeriodo(): void {
    if (!this.empresaSeleccionada) {
      return;
    }

    this.cargarLiquidaciones();
  }

  cargarLiquidaciones(): void {
    if (!this.empresaSeleccionada) {
      return;
    }

    this.cargandoLiquidaciones = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    /*
      Más adelante conectaremos aquí la API
      para obtener las liquidaciones de:

      empresaSeleccionada
      mesSeleccionado
      anioSeleccionado
    */

    this.liquidaciones = [];

    this.cargandoLiquidaciones = false;

    this.cdr.detectChanges();
  }

  obtenerNombreMes(mes: number): string {
    return this.meses.find(
      item => item.valor === Number(mes)
    )?.nombre ?? '';
  }

  tieneEmpresaSeleccionada(): boolean {
    return this.empresaSeleccionada !== '';
  }
}