import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrearLiquidacion } from './liquidacion.model';

@Injectable({
  providedIn: 'root'
})
export class RemuneracionesService {

  private readonly baseUrl = 'http://localhost:3001/api/remuneraciones';

  constructor(private http: HttpClient) {}

  descargarLiquidacionPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/liquidaciones/${id}/pdf`, {
      headers: this.getHeaders(), responseType: 'blob'
    });
  }

  crearLiquidacion(liquidacion: CrearLiquidacion): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/liquidaciones`, liquidacion,
      { headers: this.getHeaders() });
  }

  getLiquidaciones(empresaId: number, anio: number, mes: number): Observable<{ liquidaciones: any[] }> {
    return this.http.get<{ liquidaciones: any[] }>(`${this.baseUrl}/liquidaciones`, {
      headers: this.getHeaders(), params: { empresa_id: empresaId, anio, mes }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getParametrosPeriodo(anio: number, mes: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/parametros/${anio}/${mes}`,
      { headers: this.getHeaders() }
    );
  }

  getEmpresa(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/empresas/${id}`, { headers: this.getHeaders() });
  }

  crearEmpresa(empresa: any): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/empresas`, empresa, { headers: this.getHeaders() });
  }

  actualizarEmpresa(id: number, empresa: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/empresas/${id}`, empresa, { headers: this.getHeaders() });
  }

  cambiarEstadoEmpresa(id: number, status: 'active' | 'inactive'): Observable<any> {
    return this.http.patch(`${this.baseUrl}/empresas/${id}/estado`, { status }, { headers: this.getHeaders() });
  }

  getEmpresas(soloActivas = false): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/empresas`,
      {
        headers: this.getHeaders(),
        params: soloActivas ? { status: 'active' } : {}
      }
    );
  }

  getTrabajadores(companyId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/empresas/${companyId}/trabajadores`,
      {
        headers: this.getHeaders()
      }
    );
  }

  crearTrabajador(
    companyId: number,
    trabajador: any
  ): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/empresas/${companyId}/trabajadores`,
      trabajador,
      {
        headers: this.getHeaders()
      }
    );
  }

  getTrabajador(trabajadorId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/trabajadores/${trabajadorId}`,
      {
        headers: this.getHeaders()
      }
    );
  }

  actualizarTrabajador(
    trabajadorId: number,
    trabajador: any
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/trabajadores/${trabajadorId}`,
      trabajador,
      {
        headers: this.getHeaders()
      }
    );
  }
}
