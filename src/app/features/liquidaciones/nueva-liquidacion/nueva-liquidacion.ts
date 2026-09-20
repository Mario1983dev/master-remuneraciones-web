import { ReglaCesantia, TramoIusc, ResultadoMonto, decimal, aporteCesantia, impuestoMensual, pendiente, monto } from './calculo-previsional';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { AfpParametros, ParametrosFormulario } from '../../../shared/services/parametros-remuneraciones.service';

import { RemuneracionesService } from '../../../shared/services/remuneraciones.service';


type CampoMontoClp = 'sueldo_base' | 'apv_monto' | 'horas_extra' | 'bonos' |
  'comisiones' | 'gratificacion' | 'aguinaldo' | 'colacion' | 'movilizacion' |
  'otros_haberes' | 'otros_descuentos';

@Component({
  selector: 'app-nueva-liquidacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './nueva-liquidacion.html',
  styleUrl: './nueva-liquidacion.scss'
})
export class NuevaLiquidacion implements OnInit, OnDestroy {
  parametros: (ParametrosFormulario & { id: number; version: number; estado: string; utm_valor_clp?: string | number | null; tope_cesantia_uf?: string | number | null }) | null = null;
  afpsVigentes: AfpParametros[] = [];
  afpCodigo = '';
  resolverAfp = false;
  reglasCesantia: ReglaCesantia[] = [];
  tramosIusc: TramoIusc[] = [];
  reglaCesantiaCodigo = '';

  private cargaTrabajador?: Subscription;
  private cargaTrabajadores?: Subscription;

  // =====================================================
  // EMPRESAS Y TRABAJADORES
  // =====================================================

  empresas: any[] = [];
  trabajadores: any[] = [];

  empresaSeleccionada = '';
  trabajadorSeleccionado = '';

  trabajador: any = null;


  // =====================================================
  // PERÍODO
  // =====================================================

  mesSeleccionado = new Date().getMonth() + 1;
  anioSeleccionado = new Date().getFullYear();

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


  // =====================================================
  // ESTADOS DE CARGA
  // =====================================================

  cargandoEmpresas = false;
  cargandoTrabajadores = false;
  cargandoTrabajador = false;

  errorMessage = '';

  mostrarFormularioLiquidacion = false;


  // =====================================================
  // DATOS DE LA LIQUIDACIÓN
  // =====================================================

  liquidacion = {

    sueldo_base: 0,

    afp_nombre: '',

    salud_tipo: '',
    salud_institucion: '',
    salud_valor: null as number | null,
    salud_tipo_valor: '',

    apv_monto: 0,
    apv_regimen: '',

    cargas_familiares: 0,


    // DATOS VARIABLES DEL MES

    dias_trabajados: 30,

    horas_extra: 0,

    bonos: 0,

    comisiones: 0,

    gratificacion: 0,
    aguinaldo: 0,
    colacion: 0,
    movilizacion: 0,

    otros_haberes: 0,

    otros_descuentos: 0

  };


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  // Clasificación provisional de esta etapa; no aplica topes imponibles.
  private readonly haberesImponibles = [
    'horas_extra', 'bonos', 'comisiones', 'gratificacion', 'aguinaldo', 'otros_haberes'
  ] as const;

  private readonly haberesNoImponibles = ['colacion', 'movilizacion'] as const;

  readonly haberesPrincipales = [
    { campo: 'horas_extra', nombre: 'Monto horas extra' },
    { campo: 'bonos', nombre: 'Bonos' },
    { campo: 'gratificacion', nombre: 'Gratificación' }
  ] as const;

  readonly haberesOcasionales = [
    { campo: 'comisiones', nombre: 'Comisiones' },
    { campo: 'otros_haberes', nombre: 'Otros haberes imponibles' },
    { campo: 'aguinaldo', nombre: 'Aguinaldo' },
    { campo: 'colacion', nombre: 'Colación' },
    { campo: 'movilizacion', nombre: 'Movilización' }
  ] as const;

  readonly haberesResumen = [...this.haberesPrincipales, ...this.haberesOcasionales];

  private readonly liquidacionInicial = { ...this.liquidacion };

  constructor(
    private remuneracionesService: RemuneracionesService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }


  // =====================================================
  // INICIO
  // =====================================================

  ngOnInit(): void {

    this.generarAnios();



    this.cargarEmpresas();

  }


  // =====================================================
  // GENERAR AÑOS
  // =====================================================

  generarAnios(): void {

    const anioActual =
      new Date().getFullYear();

    this.anios = [
      anioActual,
      anioActual - 1,
      anioActual - 2,
      anioActual - 3,
      anioActual - 4
    ];

  }


  // =====================================================
  // CARGAR EMPRESAS
  // =====================================================

  cargarEmpresas(): void {

    this.cargandoEmpresas = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    this.remuneracionesService
      .getEmpresas()
      .pipe(
        finalize(() => {

          this.cargandoEmpresas = false;

          this.cdr.detectChanges();

        })
      )
      .subscribe({

        next: (response: any) => {

          this.empresas =
            this.normalizarEmpresas(response);


          const companyId =
            this.route.snapshot.queryParamMap.get(
              'companyId'
            );


          // Si viene companyId por URL
          if (companyId) {

            this.empresaSeleccionada =
              String(companyId);

            this.cdr.detectChanges();

            this.cargarTrabajadores();

            return;

          }


          // Si existe solamente una empresa,
          // la seleccionamos automáticamente
          if (this.empresas.length === 1) {

            this.empresaSeleccionada =
              String(this.empresas[0].id);

            this.cdr.detectChanges();

            this.cargarTrabajadores();

            return;

          }


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Error al cargar empresas:',
            error
          );

          this.empresas = [];

          this.errorMessage =
            'No fue posible cargar las empresas.';

        }

      });

  }


  // =====================================================
  // NORMALIZAR EMPRESAS
  // =====================================================

  normalizarEmpresas(response: any): any[] {

    if (Array.isArray(response)) {

      return response;

    }


    if (Array.isArray(response?.empresas)) {

      return response.empresas;

    }


    if (Array.isArray(response?.data)) {

      return response.data;

    }


    if (response?.id) {

      return [response];

    }


    return [];

  }


  // =====================================================
  // CAMBIAR EMPRESA
  // =====================================================

  cambiarEmpresa(): void {

    this.cargaTrabajadores?.unsubscribe();

    this.trabajadores = [];

    this.trabajadorSeleccionado = '';

    this.cambiarTrabajador();


    if (!this.empresaSeleccionada) {

      this.cdr.detectChanges();

      return;

    }


    this.cdr.detectChanges();

    this.cargarTrabajadores();

  }


  // =====================================================
  // CARGAR TRABAJADORES
  // =====================================================

  cargarTrabajadores(): void {

    const companyId =
      Number(this.empresaSeleccionada);


    if (!companyId) {

      return;

    }


    this.cargandoTrabajadores = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    this.cargaTrabajadores = this.remuneracionesService
      .getTrabajadores(companyId)
      .pipe(
        finalize(() => {

          this.cargandoTrabajadores = false;

          this.cdr.detectChanges();

        })
      )
      .subscribe({

        next: (response: any) => {

          this.trabajadores =
            this.normalizarTrabajadores(response);

          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Error al cargar trabajadores:',
            error
          );

          this.trabajadores = [];

          this.errorMessage =
            'No fue posible cargar los trabajadores.';

        }

      });

  }


  // =====================================================
  // NORMALIZAR TRABAJADORES
  // =====================================================

  normalizarTrabajadores(response: any): any[] {

    if (Array.isArray(response)) {

      return response;

    }


    if (Array.isArray(response?.trabajadores)) {

      return response.trabajadores;

    }


    if (Array.isArray(response?.data)) {

      return response.data;

    }


    if (response?.id) {

      return [response];

    }


    return [];

  }


  // =====================================================
  // CONTINUAR
  // =====================================================

  cambiarTrabajador(): void {
    // Cancelar la consulta anterior evita que una respuesta tardía restaure sus datos.
    this.cargaTrabajador?.unsubscribe();
    this.trabajador = null;
    this.parametros = null;
    this.reglasCesantia = [];
    this.tramosIusc = [];
    this.reglaCesantiaCodigo = '';
    this.afpsVigentes = [];
    this.afpCodigo = '';
    this.resolverAfp = false;
    this.mostrarFormularioLiquidacion = false;
    this.cargandoTrabajador = false;
    this.errorMessage = '';
    this.liquidacion = { ...this.liquidacionInicial };
  }

  ngOnDestroy(): void {

    this.cargaTrabajador?.unsubscribe();
    this.cargaTrabajadores?.unsubscribe();
  }

  continuar(): void {
    if (this.mostrarFormularioLiquidacion || this.cargandoTrabajador) return;

    const trabajadorId =
      Number(this.trabajadorSeleccionado);


    if (!trabajadorId) {

      this.errorMessage =
        'Debe seleccionar un trabajador.';

      return;

    }


    this.cambiarTrabajador();

    this.cargandoTrabajador = true;
    this.cdr.detectChanges();


    this.cargaTrabajador = forkJoin({
      ficha: this.remuneracionesService.getTrabajador(trabajadorId),
      publicados: this.remuneracionesService.getParametrosPeriodo(this.anioSeleccionado, this.mesSeleccionado)
    })
      .pipe(

        finalize(() => {

          // MUY IMPORTANTE
          // siempre se ejecuta al terminar la petición

          this.cargandoTrabajador = false;

          this.cdr.detectChanges();

        })

      )
      .subscribe({

        next: ({ ficha: response, publicados }) => {
          if (publicados?.parametros?.estado !== 'PUBLICADO') {
            this.errorMessage = 'El período no tiene una versión PUBLICADA de parámetros. No es posible calcular.';
            return;
          }
          this.parametros = publicados.parametros;
          this.reglasCesantia = publicados.cesantia || [];
          this.tramosIusc = publicados.iusc_tramos || [];
          this.afpsVigentes = (publicados.afp || []).filter((afp: AfpParametros) => afp.vigente === true);
          this.trabajador =
            response?.trabajador ??
            response?.data ??
            response;


          if (!this.trabajador) {

            this.errorMessage =
              'No se encontraron datos del trabajador.';

            this.mostrarFormularioLiquidacion = false;

            return;

          }


          // Cargar datos permanentes
          // del trabajador en la liquidación
          this.cargarDatosLiquidacion();
          const nombre = this.normalizarNombreAfp(this.liquidacion.afp_nombre);
          const coincidencias = this.afpsVigentes.filter(afp => nombre !== '' && this.normalizarNombreAfp(afp.afp_nombre) === nombre);
          this.afpCodigo = coincidencias.length === 1 ? coincidencias[0].afp_codigo : '';
          this.resolverAfp = coincidencias.length !== 1;


          // Mostrar formulario
          this.mostrarFormularioLiquidacion = true;



          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Error al cargar trabajador:',
            error
          );


          this.trabajador = null;

          this.mostrarFormularioLiquidacion = false;


          this.errorMessage =
            error?.error?.message || 'No fue posible cargar el trabajador o los parámetros PUBLICADOS del período. No es posible calcular.';

        }

      });

  }


  // =====================================================
  // CARGAR DATOS DEL TRABAJADOR
  // A LA LIQUIDACIÓN
  // =====================================================

  cargarDatosLiquidacion(): void {

    if (!this.trabajador) {

      return;

    }


    this.liquidacion = {

      sueldo_base:
        this.normalizarMonto(this.trabajador.sueldo_base),


      afp_nombre:
        this.trabajador.afp_nombre || '',



      salud_tipo:
        this.trabajador.salud_tipo || '',


      salud_institucion:
        this.trabajador.salud_institucion || '',


      salud_valor:
        this.valorParametro(this.trabajador.salud_valor),


      salud_tipo_valor:
        this.trabajador.salud_tipo_valor || '',


      apv_monto:
        this.normalizarMonto(this.trabajador.apv_monto),


      apv_regimen:
        this.trabajador.apv_regimen || '',


      cargas_familiares:
        Number(
          this.trabajador.cargas_familiares
        ) || 0,


      // ===============================================
      // DATOS VARIABLES DEL MES
      // ===============================================

      dias_trabajados: 30,

      horas_extra: 0,

      bonos: 0,

      comisiones: 0,

      gratificacion: 0,
      aguinaldo: 0,
      colacion: 0,
      movilizacion: 0,

      otros_haberes: 0,

      otros_descuentos: 0

    };

  }


  // =====================================================
  // SUELDO PROPORCIONAL
  // =====================================================

  actualizarDiasTrabajados(valor: number | null, input: HTMLInputElement): void {
    this.liquidacion.dias_trabajados = this.limitarDiasTrabajados(valor);
    input.value = String(this.liquidacion.dias_trabajados);
  }

  private limitarDiasTrabajados(valor: number | null): number {
    return Math.min(30, Math.max(0, Number(valor) || 0));
  }

  calcularSueldoProporcional(): number {

    const sueldoBase =
      this.normalizarMonto(this.liquidacion.sueldo_base);


    const diasTrabajados =
      this.limitarDiasTrabajados(
        this.liquidacion.dias_trabajados
      );


    return Math.round(

      (sueldoBase / 30) *
      diasTrabajados

    );

  }


  // =====================================================
  // TOTAL HABERES
  // =====================================================

  private normalizarMonto(valor: unknown): number {
    const monto = Number(valor);
    return Number.isFinite(monto) ? Math.max(0, monto) : 0;
  }

  private campoClpEnEdicion: CampoMontoClp | null = null;
  private textoClpEnEdicion = '';
  private readonly formatoClp = new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0
  });

  mostrarMontoClp(campo: CampoMontoClp): string {
    return this.campoClpEnEdicion === campo
      ? this.textoClpEnEdicion
      : this.formatoClp.format(this.liquidacion[campo]);
  }

  iniciarEdicionClp(campo: CampoMontoClp, input: HTMLInputElement): void {
    this.campoClpEnEdicion = campo;
    this.textoClpEnEdicion = String(this.liquidacion[campo]);
    input.value = this.textoClpEnEdicion;
    input.select();
  }

  editarMontoClp(campo: CampoMontoClp, input: HTMLInputElement): void {
    const texto = input.value.trim();
    // Solo enteros CLP: los puntos se aceptan únicamente en grupos de miles.
    const valido = /^(?:\d*|\d{1,3}(?:\.\d{3})+)$/.test(texto);
    const monto = Number(texto.replace(/\./g, ''));
    if (!valido || !Number.isSafeInteger(monto)) {
      input.value = this.textoClpEnEdicion;
      return;
    }
    this.liquidacion[campo] = monto;
    this.textoClpEnEdicion = texto === '' ? '' : String(monto);
    if (input.value !== this.textoClpEnEdicion) input.value = this.textoClpEnEdicion;
  }

  terminarEdicionClp(campo: CampoMontoClp, input: HTMLInputElement): void {
    this.editarMontoClp(campo, input);
    this.campoClpEnEdicion = null;
    this.textoClpEnEdicion = '';
    input.value = this.mostrarMontoClp(campo);
  }
  calcularBaseImponible(): number {
    return Math.round(this.haberesImponibles.reduce(
      (total, campo) => total + this.normalizarMonto(this.liquidacion[campo]),
      this.calcularSueldoProporcional()
    ));
  }

  calcularTotalHaberes(): number {
    return Math.round(this.haberesNoImponibles.reduce(
      (total, campo) => total + this.normalizarMonto(this.liquidacion[campo]),
      this.calcularBaseImponible()
    ));
  }

  private normalizarNombreAfp(nombre: string): string {
    return nombre.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-CL');
  }

  get afpAplicada(): AfpParametros | null {
    return this.afpsVigentes.find(afp => afp.afp_codigo === this.afpCodigo) ?? null;
  }

  private valorParametro(valor: unknown, porcentaje = false): number | null {
    if (valor == null || String(valor).trim() === '') return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 && (!porcentaje || numero <= 100) ? numero : null;
  }

  calcularBasePrevisional(): number | null {
    if (!this.parametros) return null;
    const uf = this.valorParametro(this.parametros.uf_valor_clp);
    const tope = this.valorParametro(this.parametros.tope_previsional_uf);
    if (uf === null || uf <= 0 || tope === null) return null;
    // Conservar la base sin redondear hasta calcular cada concepto monetario.
    return Math.min(this.calcularBaseImponible(), uf * tope);
  }

  calcularPensionObligatoria(): number | null {
    const base = this.calcularBasePrevisional();
    const tasa = this.valorParametro(this.parametros?.pension_obligatoria_pct, true);
    return base === null || tasa === null ? null : Math.round(base * tasa / 100);
  }

  calcularComisionAfp(): number | null {
    const base = this.calcularBasePrevisional();
    const tasa = this.valorParametro(this.afpAplicada?.comision_pct, true);
    return base === null || tasa === null ? null : Math.round(base * tasa / 100);
  }

  calcularDescuentoAfp(): number | null {
    const pension = this.calcularPensionObligatoria();
    const comision = this.calcularComisionAfp();
    return pension === null || comision === null ? null : pension + comision;
  }

  calcularDescuentoSalud(): number | null {
    if (!this.parametros) return null;
    const tipo = this.liquidacion.salud_tipo.trim().toUpperCase();
    const unidad = this.liquidacion.salud_tipo_valor.trim().toUpperCase();
    if (tipo === 'FONASA') {
      const base = this.calcularBasePrevisional();
      const tasa = this.valorParametro(this.parametros.salud_legal_pct, true);
      return base === null || tasa === null ? null : Math.round(base * tasa / 100);
    }
    if (tipo === 'ISAPRE' && unidad === 'PESOS') {
      const valor = this.valorParametro(this.liquidacion.salud_valor);
      return valor === null ? null : Math.round(valor);
    }
    return null;
  }

  descripcionSalud(): string {
    const tipo = this.liquidacion.salud_tipo.trim().toUpperCase();
    const unidad = this.liquidacion.salud_tipo_valor.trim().toUpperCase();
    if (tipo === 'FONASA') return 'Fonasa: ' + (this.parametros?.salud_legal_pct ?? 'tasa pendiente') + '%';
    if (tipo === 'ISAPRE' && unidad === 'PESOS') return 'Isapre en pesos (provisional)';
    if (tipo === 'ISAPRE' && unidad === 'UF') return 'Isapre en UF: cálculo pendiente';
    return 'Salud pendiente de cálculo';
  }

  get reglasContrato(): ReglaCesantia[] {
    const tipo = String(this.trabajador?.tipo_contrato || '').trim().toUpperCase();
    return this.reglasCesantia.filter(r => r.tipo_contrato.trim().toUpperCase() === tipo);
  }

  calcularBaseCesantia(): number | null {
    const uf = decimal(this.parametros?.uf_valor_clp);
    const tope = decimal(this.parametros?.tope_cesantia_uf);
    return uf === null || uf <= 0 || tope === null ? null : Math.min(this.calcularBaseImponible(), uf * tope);
  }

  cesantia(parte: 'trabajador_cic_pct' | 'empleador_cic_pct' | 'empleador_fcs_pct'): ResultadoMonto {
    if (!this.trabajador?.tipo_contrato) return pendiente('Falta el tipo de contrato del trabajador.');
    if (!this.reglasContrato.length) return pendiente('No hay reglas publicadas de cesantía para este tipo de contrato.');
    const reglas = this.reglasContrato.filter(r => r.regla_codigo === this.reglaCesantiaCodigo);
    if (reglas.length !== 1) return pendiente('Confirme la regla de cesantía aplicable a esta liquidación.');
    const regla = reglas[0];
    const tipo = String(this.trabajador.tipo_contrato).trim().toUpperCase();
    if (parte === 'trabajador_cic_pct' && ['PLAZO_FIJO', 'OBRA_FAENA'].includes(tipo) && decimal(regla[parte]) !== 0) {
      return pendiente('La regla publicada debe indicar trabajador sin aporte para plazo fijo u obra/faena.');
    }
    return aporteCesantia(this.calcularBaseCesantia(), regla[parte]);
  }

  baseTributable(): ResultadoMonto {
    const afp = this.calcularDescuentoAfp(), salud = this.calcularDescuentoSalud();
    const cesantia = this.cesantia('trabajador_cic_pct');
    if (afp === null || salud === null || cesantia.monto === null) return pendiente('IUSC pendiente: complete AFP, salud y cesantía del trabajador.');
    const uf = decimal(this.parametros?.uf_valor_clp), tope = decimal(this.parametros?.tope_previsional_uf);
    const tasaSalud = this.valorParametro(this.parametros?.salud_legal_pct, true);
    if (uf === null || uf <= 0 || tope === null || tasaSalud === null) return pendiente('Faltan parámetros para determinar la rebaja legal de salud en IUSC.');
    const apv = this.normalizarMonto(this.liquidacion.apv_monto);
    if (apv > 0 && this.liquidacion.apv_regimen.trim().toUpperCase() !== 'A') {
      return pendiente('IUSC pendiente: APV con régimen desconocido o B; falta parametrizar y validar su límite de rebaja tributaria.');
    }
    const saludDeducible = Math.min(salud, Math.round(uf * tope * tasaSalud / 100));
    // Colación/movilización conservan la clasificación actual. Otros descuentos no rebajan IUSC.
    return monto(Math.max(0, this.calcularBaseImponible() - afp - saludDeducible - cesantia.monto));
  }

  iusc(): ResultadoMonto {
    const base = this.baseTributable();
    if (base.monto === null) return base;
    return impuestoMensual(base.monto, this.parametros?.utm_valor_clp, this.tramosIusc);
  }

  calcularTotalDescuentos(): number | null {
    const afp = this.calcularDescuentoAfp();
    const salud = this.calcularDescuentoSalud();
    const cesantia = this.cesantia('trabajador_cic_pct').monto;
    const impuesto = this.iusc().monto;
    if (afp === null || salud === null || cesantia === null || impuesto === null) return null;
    return afp + salud + cesantia + impuesto + Math.round(this.normalizarMonto(this.liquidacion.apv_monto)) +
      Math.round(this.normalizarMonto(this.liquidacion.otros_descuentos));
  }

  calcularLiquidoEstimado(): number | null {
    const descuentos = this.calcularTotalDescuentos();
    return descuentos === null ? null : this.calcularTotalHaberes() - descuentos;
  }

  // =====================================================
  // FORMATEAR PESOS
  // =====================================================

  formatearPesos(valor: number | null): string {
    if (valor === null) return 'Pendiente';

    return new Intl.NumberFormat(
      'es-CL',
      {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
      }
    ).format(
      valor || 0
    );

  }

}
