import { validarComplementos } from './validar-complementos';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { FormularioParametros, ParametrosRemuneracionesService, VersionParametros } from '../../shared/services/parametros-remuneraciones.service';

@Component({
  selector: 'app-parametros-remuneraciones', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './parametros-remuneraciones.html', styleUrl: './parametros-remuneraciones.scss'
})
export class ParametrosRemuneraciones implements OnInit {
  private servicio = inject(ParametrosRemuneracionesService);
  private destroyRef = inject(DestroyRef);
  readonly ocupado = signal(false);
  readonly autorizado = signal(false);
  readonly verificando = signal(true);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly versiones = signal<VersionParametros[]>([]);
  readonly seleccionada = signal<VersionParametros | null>(null);
  readonly cargado = signal(false);
  readonly cambios = signal(false);
  readonly confirmarPublicacion = signal(false);
  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  version = 0;
  private periodo = { anio: this.anio, mes: this.mes };
  readonly meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  readonly camposCesantia = [
    { clave: 'trabajador_cic_pct', etiqueta: 'Trabajador CIC (%)' },
    { clave: 'empleador_cic_pct', etiqueta: 'Empleador CIC (%)' },
    { clave: 'empleador_fcs_pct', etiqueta: 'Empleador FCS (%)' }
  ] as const;
  readonly camposIusc = [
    { clave: 'desde_utm', etiqueta: 'Desde UTM (exclusivo)' },
    { clave: 'hasta_utm', etiqueta: 'Hasta UTM (inclusivo)' },
    { clave: 'factor', etiqueta: 'Factor (0 a 1)' },
    { clave: 'rebaja_utm', etiqueta: 'Rebaja (UTM)' }
  ] as const;
  readonly campos = [
    { clave: 'pension_obligatoria_pct', etiqueta: 'Pensión obligatoria (%)' },
    { clave: 'uf_valor_clp', etiqueta: 'Valor UF (CLP)' },
    { clave: 'tope_previsional_uf', etiqueta: 'Tope previsional (UF)' },
    { clave: 'salud_legal_pct', etiqueta: 'Salud legal (%)' }
  ] as const;
  formulario: FormularioParametros = this.vacio();

  private vacio(): FormularioParametros {
    return { pension_obligatoria_pct: null, uf_valor_clp: null, uf_fecha: null,
      tope_previsional_uf: null, salud_legal_pct: null,
      utm_valor_clp: null, tope_cesantia_uf: null, cesantia: [], iusc_tramos: [], afp: [] };
  }
  ngOnInit() {
    this.servicio.puedeAdministrar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(permitido => {
      this.autorizado.set(permitido); this.verificando.set(false);
      if (permitido) this.cargar();
    });
  }
  private descartar(): boolean {
    return !this.cambios() || window.confirm('Hay cambios sin guardar. ¿Deseas descartarlos?');
  }
  cargar() {
    if (this.ocupado() || !this.autorizado()) return;
    if (!this.descartar()) { this.anio = this.periodo.anio; this.mes = this.periodo.mes; return; }
    if (!Number.isInteger(this.anio) || this.anio < 1000 || this.anio > 9999 || this.mes < 1 || this.mes > 12) {
      this.error.set('Selecciona un año válido entre 1000 y 9999 y un mes.'); this.cargado.set(false); this.seleccionada.set(null); return;
    }
    this.periodo = { anio: this.anio, mes: this.mes };
    this.ocupado.set(true); this.cargado.set(false); this.error.set(''); this.mensaje.set('');
    this.versiones.set([]); this.seleccionada.set(null); this.confirmarPublicacion.set(false); this.cambios.set(false);
    this.servicio.listar(this.anio, this.mes).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.ocupado.set(false))).subscribe({
      next: res => {
        const lista = [...res.versiones].sort((a, b) => b.parametros.version - a.parametros.version);
        this.versiones.set(lista); this.cargado.set(true);
        this.elegir(lista.find(v => v.parametros.estado === 'BORRADOR') || lista[0] || null);
      }, error: e => this.mostrarError(e)
    });
  }
  cambiarVersion(valor: number, selector?: HTMLSelectElement) {
    if (this.ocupado() || !this.descartar()) {
      if (selector) selector.selectedIndex = this.versiones().findIndex(v => v.parametros.version === this.version);
      return;
    }
    this.error.set(''); this.mensaje.set('');
    this.elegir(this.versiones().find(v => v.parametros.version === Number(valor)) || null);
  }
  private elegir(datos: VersionParametros | null) {
    this.seleccionada.set(datos); this.version = datos?.parametros.version || 0;
    this.formulario = this.vacio();
    if (datos) {
      for (const { clave } of this.campos) this.formulario[clave] = datos.parametros[clave] ?? null;
      this.formulario.utm_valor_clp = datos.parametros.utm_valor_clp ?? null;
      this.formulario.tope_cesantia_uf = datos.parametros.tope_cesantia_uf ?? null;
      this.formulario.cesantia = (datos.cesantia || []).map(r => ({ ...r }));
      this.formulario.iusc_tramos = (datos.iusc_tramos || []).map(r => ({ ...r }));
      this.formulario.uf_fecha = datos.parametros.uf_fecha ?? null;
      this.formulario.afp = datos.afp.map(f => ({ ...f }));
    }
    this.cambios.set(false); this.confirmarPublicacion.set(false);
  }
  agregarRegla() {
    if (!this.editable()) return;
    this.formulario.cesantia!.push({ tipo_contrato: '', regla_codigo: '', trabajador_cic_pct: null, empleador_cic_pct: null, empleador_fcs_pct: null }); this.editado();
  }
  agregarTramo() {
    if (!this.editable()) return;
    const numero = Math.max(0, ...this.formulario.iusc_tramos!.map(t => t.numero_tramo || 0)) + 1;
    this.formulario.iusc_tramos!.push({ numero_tramo: numero, desde_utm: null, hasta_utm: null, factor: null, rebaja_utm: null }); this.editado();
  }
  quitarDetalle(tipo: 'cesantia' | 'iusc_tramos', indice: number) {
    if (!this.editable()) return;
    this.formulario[tipo]!.splice(indice, 1); this.editado();
  }
  private editable() { return !this.ocupado() && this.autorizado() && this.seleccionada()?.parametros.estado === 'BORRADOR'; }
  agregarAfp() {
    if (this.ocupado() || !this.autorizado() || this.seleccionada()?.parametros.estado !== 'BORRADOR') return;
    this.formulario.afp.push({ afp_codigo: '', afp_nombre: '', comision_pct: null, vigente: true });
    this.editado();
  }
  cambiarVigenciaAfp(indice: number) {
    if (this.ocupado() || !this.autorizado() || this.seleccionada()?.parametros.estado !== 'BORRADOR') return;
    const afp = this.formulario.afp[indice];
    if (!afp) return;
    afp.vigente = !afp.vigente;
    this.editado();
  }
  editado() { this.cambios.set(true); this.confirmarPublicacion.set(false); this.mensaje.set(''); }
  private ejecutar(peticion: Observable<VersionParametros>, mensaje: string | ((datos: VersionParametros) => string)) {
    this.ocupado.set(true); this.error.set(''); this.mensaje.set(''); this.confirmarPublicacion.set(false);
    peticion.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.ocupado.set(false))).subscribe({
      next: datos => {
        this.versiones.update(lista => [...lista.filter(v => v.parametros.version !== datos.parametros.version), datos].sort((a, b) => b.parametros.version - a.parametros.version));
        this.elegir(datos); this.mensaje.set(typeof mensaje === 'function' ? mensaje(datos) : mensaje);
      }, error: e => this.mostrarError(e)
    });
  }
  crear() {
    if (this.ocupado() || !this.autorizado() || !this.cargado() || this.versiones().length) return;
    this.ejecutar(this.servicio.crear(this.anio, this.mes), datos => datos.origen_parametros ? `Borrador precargado desde ${this.meses[datos.origen_parametros.mes - 1]} ${datos.origen_parametros.anio}, versión ${datos.origen_parametros.version}: AFP, UTM, tope y reglas de cesantía y tramos IUSC. Revisa y actualiza los valores para este período antes de publicar.` : datos.origen_afp ? `Borrador creado con las AFP y comisiones de ${this.meses[datos.origen_afp.mes - 1]} ${datos.origen_afp.anio}, versión ${datos.origen_afp.version}. Revisa los valores para este período.` : 'Borrador sin precarga: no existe un período anterior publicado. Completa AFP, UTM, cesantía e IUSC.');
  }
  corregir() {
    if (this.ocupado() || !this.autorizado() || this.seleccionada()?.parametros.estado !== 'PUBLICADO') return;
    this.ejecutar(this.servicio.crear(this.anio, this.mes, this.version), 'Corrección creada como nueva versión BORRADOR.');
  }
  private datos(completo: boolean): FormularioParametros | null {
    const datos: FormularioParametros = structuredClone(this.formulario);
    const convertir = (valor: unknown, nombre: string, digitos: number, porcentaje = false, positivo = false, requerido = completo) => {
      const texto = valor == null ? '' : String(valor).trim().replace(',', '.');
      if (!texto) { if (requerido) throw new Error(`Completa ${nombre}.`); return null; }
      if (!new RegExp(`^\\d{1,${digitos}}(?:\\.\\d{1,6})?$`).test(texto) ||
          (porcentaje && Number(texto) > 100) || (positivo && Number(texto) <= 0)) {
        throw new Error(`${nombre}: ingresa un valor válido con hasta seis decimales, sin separadores de miles${porcentaje ? ', entre 0 y 100' : ''}.`);
      }
      return texto;
    };
    try {
      for (const { clave, etiqueta } of this.campos) datos[clave] = convertir(datos[clave], etiqueta, clave === 'uf_valor_clp' ? 12 : clave === 'tope_previsional_uf' ? 6 : 3, clave.endsWith('_pct'), clave === 'uf_valor_clp');
      datos.uf_fecha = datos.uf_fecha?.trim() || null;
      if (!datos.uf_fecha && completo) throw new Error('Completa la fecha UF.');
      if (datos.uf_fecha) {
        const fecha = new Date(datos.uf_fecha + 'T00:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.uf_fecha) || Number(datos.uf_fecha.slice(0, 4)) < 1000 || !Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== datos.uf_fecha) throw new Error('Ingresa una fecha UF válida.');
      }
      if (completo && !datos.afp.length) throw new Error('Agrega las AFP antes de publicar.');
      const codigos = new Set<string>();
      datos.afp = datos.afp.map(f => {
        const codigo = f.afp_codigo.trim().toUpperCase();
        const nombre = f.afp_nombre.trim();
        if (!/^[A-Z0-9_-]{1,30}$/.test(codigo)) throw new Error('Cada AFP requiere un código de hasta 30 letras, números, guiones o guiones bajos.');
        if (codigos.has(codigo)) throw new Error(`Código AFP duplicado: ${codigo}.`);
        if (!nombre || [...nombre].length > 100) throw new Error(`AFP ${codigo}: ingresa un nombre de hasta 100 caracteres.`);
        codigos.add(codigo);
        if (typeof f.vigente !== 'boolean') throw new Error(`AFP ${codigo}: vigencia inválida.`);
        return { afp_codigo: codigo, afp_nombre: nombre, vigente: f.vigente, comision_pct: convertir(f.comision_pct, `Comisión ${codigo} (Tasa pendiente)`, 3, true, false, completo && f.vigente) };
      });
      validarComplementos(datos, completo);
      return datos;
    } catch (e) { this.error.set((e as Error).message); return null; }
  }
  guardar() {
    if (this.ocupado() || !this.autorizado() || this.seleccionada()?.parametros.estado !== 'BORRADOR') return;
    const datos = this.datos(false);
    if (datos) this.ejecutar(this.servicio.guardar(this.anio, this.mes, this.version, datos), 'Borrador guardado.');
  }
  prepararPublicacion() {
    if (this.ocupado() || this.cambios() || this.seleccionada()?.parametros.estado !== 'BORRADOR') return;
    this.error.set(''); if (this.datos(true)) this.confirmarPublicacion.set(true);
  }
  publicar() {
    if (this.ocupado() || !this.autorizado() || !this.confirmarPublicacion() || this.cambios() || this.seleccionada()?.parametros.estado !== 'BORRADOR') return;
    this.ejecutar(this.servicio.publicar(this.anio, this.mes, this.version), 'Versión publicada. Para modificarla, crea una corrección.');
  }
  private mostrarError(e: { status?: number; error?: { message?: string; code?: string } }) {
    const detalle = e.error?.message || 'No fue posible completar la operación.';
    this.error.set(e.status === 409 ? `Conflicto: ${detalle} Recarga el período para consultar el estado actual.` :
      e.status === 401 ? 'La sesión expiró o no es válida. Vuelve a iniciar sesión.' :
      e.status === 403 ? 'No tienes permiso para administrar parámetros de Remuneraciones.' :
      e.status === 0 ? 'No se pudo conectar con el servidor. Intenta nuevamente.' : detalle);
  }
}