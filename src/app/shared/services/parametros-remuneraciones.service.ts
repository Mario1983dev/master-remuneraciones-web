import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';

export type Decimal = string | number | null;
export interface ParametrosFormulario {
  utm_valor_clp?: Decimal;
  tope_cesantia_uf?: Decimal;
  pension_obligatoria_pct: Decimal;
  uf_valor_clp: Decimal;
  uf_fecha: string | null;
  tope_previsional_uf: Decimal;
  salud_legal_pct: Decimal;
}
export interface AfpParametros {
  afp_codigo: string;
  afp_nombre: string;
  comision_pct: Decimal;
  vigente: boolean;
}
export interface CesantiaParametros {
  tipo_contrato: string; regla_codigo: string;
  trabajador_cic_pct: Decimal; empleador_cic_pct: Decimal; empleador_fcs_pct: Decimal;
}
export interface TramoParametros {
  numero_tramo: number | null; desde_utm: Decimal; hasta_utm: Decimal;
  factor: Decimal; rebaja_utm: Decimal;
}
export interface FormularioParametros extends ParametrosFormulario {
  cesantia?: CesantiaParametros[];
  iusc_tramos?: TramoParametros[];
  afp: AfpParametros[];
}
export interface VersionParametros {
  cesantia?: CesantiaParametros[];
  iusc_tramos?: TramoParametros[];
  origen_parametros?: { anio: number; mes: number; version: number } | null;
  origen_afp?: { anio: number; mes: number; version: number } | null;
  parametros: ParametrosFormulario & { id: number; version: number; estado: 'BORRADOR' | 'PUBLICADO' };
  afp: AfpParametros[];
}

@Injectable({ providedIn: 'root' })
export class ParametrosRemuneracionesService {
  private readonly baseUrl = 'http://localhost:3001/api/remuneraciones';
  constructor(private http: HttpClient) {}

  private opciones() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }) };
  }

  puedeAdministrar() {
    // Solo controla la visibilidad. El backend verifica JWT, rol y permiso.
    try {
      const payload = (localStorage.getItem('token') || '').split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const usuario = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      if (String(usuario.role).trim().toUpperCase() !== 'MASTER' ||
          (usuario.exp && usuario.exp * 1000 <= Date.now())) return of(false);
    } catch { return of(false); }
    return this.http.get<{ allowed: boolean }>(`${this.baseUrl}/access`, this.opciones()).pipe(
      map(respuesta => respuesta.allowed === true), catchError(() => of(false))
    );
  }

  private url(anio: number, mes: number) { return `${this.baseUrl}/parametros/${anio}/${mes}/versiones`; }
  listar(anio: number, mes: number) {
    return this.http.get<{ versiones: VersionParametros[] }>(this.url(anio, mes), this.opciones());
  }
  crear(anio: number, mes: number, origen?: number) {
    return this.http.post<VersionParametros>(this.url(anio, mes), origen === undefined ? {} : { version_origen: origen }, this.opciones());
  }
  guardar(anio: number, mes: number, version: number, datos: FormularioParametros) {
    return this.http.put<VersionParametros>(`${this.url(anio, mes)}/${version}`, datos, this.opciones());
  }
  publicar(anio: number, mes: number, version: number) {
    return this.http.post<VersionParametros>(`${this.url(anio, mes)}/${version}/publicar`, {}, this.opciones());
  }
}