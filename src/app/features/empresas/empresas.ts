import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RemuneracionesService } from '../../shared/services/remuneraciones.service';

@Component({
  selector: 'app-empresas', standalone: true, imports: [FormsModule, RouterLink],
  templateUrl: './empresas.html', styleUrl: './empresas.scss'
})
export class Empresas implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(RemuneracionesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly empresas = signal<any[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly administrar = signal(false);
  readonly master = signal(false);
  readonly vista = signal<'lista' | 'nueva' | 'detalle' | 'editar'>('lista');
  readonly empresa = signal<any>(null);
  id = 0;
  filtro = '';
  estado = '';
  form = {rut: '', name: '', address: '', commune: '', city: '', email: '', phone: '', office_id: null as number | null};
  readonly campos = [
    {key: 'rut', label: 'RUT', max: 20}, {key: 'name', label: 'Razón social / nombre', max: 150},
    {key: 'address', label: 'Dirección', max: 255}, {key: 'commune', label: 'Comuna', max: 100},
    {key: 'city', label: 'Ciudad', max: 100}, {key: 'email', label: 'Correo', max: 150},
    {key: 'phone', label: 'Teléfono', max: 50}
  ] as const;
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.id = Number(params.get('id'));
      const path = this.route.snapshot.routeConfig?.path || '';
      this.vista.set(path.endsWith('/nueva') ? 'nueva' : path.endsWith('/editar') ? 'editar' : this.id ? 'detalle' : 'lista');
      this.cargar();
    });
  }
  cargar() {
    this.cargando.set(true); this.error.set('');
    this.api.getEmpresas().subscribe({next: r => {
      this.empresas.set(r.empresas || []); this.administrar.set(r.can_manage === true); this.master.set(r.is_master === true);
      if (this.id) {
        this.api.getEmpresa(this.id).subscribe({next: r => {
          this.empresa.set(r.empresa); this.form = {...this.form, ...r.empresa}; this.cargando.set(false);
        }, error: e => this.fallo(e)});
      } else this.cargando.set(false);
    }, error: e => this.fallo(e)});
  }
  filtradas() {
    const q = this.filtro.trim().toLocaleLowerCase();
    return this.empresas().filter(e => (!this.estado || e.status === this.estado) && `${e.rut} ${e.name}`.toLocaleLowerCase().includes(q));
  }
  guardar() {
    if (!this.administrar() || this.guardando()) return;
    this.guardando.set(true); this.error.set('');
    const request = this.id ? this.api.actualizarEmpresa(this.id, this.form) : this.api.crearEmpresa(this.form);
    request.subscribe({next: r => { this.guardando.set(false); this.router.navigate(['/empresas', r.id]); }, error: e => this.fallo(e)});
  }
  cambiarEstado() {
    if (!this.administrar() || this.guardando() || !this.empresa()) return;
    this.guardando.set(true);
    this.api.cambiarEstadoEmpresa(this.id, this.empresa().status === 'active' ? 'inactive' : 'active').subscribe({
      next: () => { this.guardando.set(false); this.cargar(); }, error: e => this.fallo(e)
    });
  }
  private fallo(e: any) { this.error.set(e?.error?.message || 'No fue posible cargar o guardar la empresa'); this.cargando.set(false); this.guardando.set(false); }
}
