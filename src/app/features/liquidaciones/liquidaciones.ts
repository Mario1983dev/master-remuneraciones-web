import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import { catchError, finalize, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
export class Liquidaciones implements OnInit, OnDestroy {
  private consulta?: Subscription;
  private descarga?: Subscription;
  private destruido = false;
  descargandoPdfId: number | null = null;

  empresas: any[] = [];
  puedeAdministrar = false;
  get permiteNueva(): boolean { return this.puedeAdministrar && this.empresas.some(e => Number(e.id) === Number(this.empresaSeleccionada) && e.status === 'active'); }

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
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.empresaSeleccionada = q.get('companyId') || '';
    const anio = Number(q.get('anio')), mes = Number(q.get('mes'));
    if (Number.isInteger(anio) && anio >= 1000 && anio <= 9999) this.anioSeleccionado = anio;
    if (Number.isInteger(mes) && mes >= 1 && mes <= 12) this.mesSeleccionado = mes;
    this.generarAnios();
    if (!this.anios.includes(this.anioSeleccionado)) this.anios.unshift(this.anioSeleccionado);
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

        this.puedeAdministrar = response?.can_manage === true;
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
        if (this.empresas.some(e => String(e.id) === this.empresaSeleccionada)) {
          this.cargarLiquidaciones();
        } else if (this.empresas.length === 1) {
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
    this.consulta?.unsubscribe();
    this.cargandoLiquidaciones = false;
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

    this.consulta?.unsubscribe();
    this.consulta = this.remuneracionesService.getLiquidaciones(Number(this.empresaSeleccionada), this.anioSeleccionado, this.mesSeleccionado)
      .subscribe({
        next: response => {
          this.liquidaciones = response.liquidaciones;
          this.cargandoLiquidaciones = false;
          this.cdr.detectChanges();
        },
        error: error => {
          this.liquidaciones = [];
          this.cargandoLiquidaciones = false;
          this.errorMessage = error?.error?.message || 'No fue posible cargar las liquidaciones.';
          this.cdr.detectChanges();
        }
      });
  }

  verPdf(liquidacion: { id: number; anio: number; mes: number }): void {
    if (this.descargandoPdfId !== null || !Number.isSafeInteger(liquidacion.id) || liquidacion.id <= 0) return;
    // Abrir durante el clic, antes de la petición autenticada, evita el bloqueo de ventanas.
    const visor = window.open('', '_blank');
    if (!visor) {
      this.errorMessage = 'Permite las ventanas emergentes para ver el PDF.';
      this.cdr.detectChanges();
      return;
    }
    visor.opener = null;
    visor.document.title = 'Cargando liquidación…';
    visor.document.body.textContent = 'Cargando PDF de la liquidación…';
    let abierto = false;
    this.descargandoPdfId = liquidacion.id;
    this.errorMessage = '';
    this.cdr.detectChanges();
    this.descarga = this.remuneracionesService.descargarLiquidacionPdf(liquidacion.id).pipe(
      catchError(async error => {
        let mensaje = 'No fue posible abrir el PDF. Intente nuevamente.';
        try {
          const cuerpo = error.error instanceof Blob ? JSON.parse(await error.error.text()) : error.error;
          if (typeof cuerpo?.message === 'string') mensaje = cuerpo.message;
        } catch { /* Conservar mensaje legible ante respuestas no JSON. */ }
        if (!this.destruido) this.errorMessage = mensaje;
        return null;
      }),
      finalize(() => {
        if (!abierto && !visor.closed) visor.close();
        this.descargandoPdfId = null;
        if (!this.destruido) this.cdr.detectChanges();
      })
    ).subscribe(blob => {
      if (!blob || this.destruido || visor.closed) return;
      if (blob.type !== 'application/pdf' || blob.size === 0) {
        this.errorMessage = 'El servidor no devolvió un PDF válido.';
        return;
      }
      const nombre = `liquidacion-${liquidacion.id}-${liquidacion.anio}-${String(liquidacion.mes).padStart(2, '0')}.pdf`;
      const url = URL.createObjectURL(new File([blob], nombre, { type: 'application/pdf' }));
      try {
        visor.location.replace(url);
        abierto = true;
        // Mantener el archivo disponible para imprimir/descargar incluso al salir de la lista.
        const limpieza = setInterval(() => {
          if (visor.closed) { URL.revokeObjectURL(url); clearInterval(limpieza); }
        }, 1000);
      } catch {
        URL.revokeObjectURL(url);
        this.errorMessage = 'No fue posible abrir el visor PDF. Intente nuevamente.';
      }
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.consulta?.unsubscribe();
    this.descarga?.unsubscribe();
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
