import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  private apiUrl = 'http://localhost:3001/api';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(): void {
    this.loading = true;
    this.errorMessage = '';

 this.http.post<any>(`${this.apiUrl}/login`, {
  email: this.email.trim().toLowerCase(),
  password: this.password.trim()
}).subscribe({
      next: (response) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${response.token}`
        });

        this.http.get<any>(
          `${this.apiUrl}/remuneraciones/access`,
          { headers }
        ).subscribe({
          next: () => {
            localStorage.setItem('token', response.token);
            this.router.navigate(['/dashboard']);
          },
          error: () => {
            this.errorMessage = 'No tiene acceso a Remuneraciones';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.errorMessage = 'Usuario o contraseña incorrectos';
        this.loading = false;
      }
    });
  }
}