import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RemuneracionesService {

  private readonly baseUrl = 'http://localhost:3001/api/remuneraciones';

  constructor(private http: HttpClient) {}

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

  getEmpresas(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/empresas`,
      {
        headers: this.getHeaders()
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