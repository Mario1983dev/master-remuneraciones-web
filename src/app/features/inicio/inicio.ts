import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParametrosRemuneracionesService } from '../../shared/services/parametros-remuneraciones.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio implements OnInit {
  private parametros = inject(ParametrosRemuneracionesService);
  private destroyRef = inject(DestroyRef);
  readonly mostrarParametros = signal(false);
  readonly mostrarOficina = signal(false);
  ngOnInit() {
    // La sesión ya fue autorizada por /remuneraciones/access al iniciar sesión.
    // Esta lectura del rol solo controla las tarjetas, no concede permisos.
    try {
      const payload = (localStorage.getItem('token') || '').split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const usuario = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      const vigente = !usuario.exp || usuario.exp * 1000 > Date.now();
      this.mostrarOficina.set(vigente && ['MASTER', 'OFFICE_ADMIN', 'OFFICE_USER'].includes(String(usuario.role).trim().toUpperCase()));
    } catch { this.mostrarOficina.set(false); }
    this.parametros.puedeAdministrar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(permitido => this.mostrarParametros.set(permitido));
  }
}
