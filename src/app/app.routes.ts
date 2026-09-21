import { Routes } from '@angular/router';
import { Empresas } from './features/empresas/empresas';
import { ParametrosRemuneraciones } from './features/parametros-remuneraciones/parametros-remuneraciones';

import { LoginComponent } from './features/login/login';
import { Inicio } from './features/inicio/inicio';
import { Trabajadores } from './features/trabajadores/trabajadores';
import { NuevoTrabajador } from './features/trabajadores/nuevo-trabajador/nuevo-trabajador';
import { EditarTrabajador } from './features/trabajadores/editar-trabajador/editar-trabajador';
import { DetalleTrabajador } from './features/trabajadores/detalle-trabajador/detalle-trabajador';
import { Liquidaciones } from './features/liquidaciones/liquidaciones';
import { NuevaLiquidacion } from './features/liquidaciones/nueva-liquidacion/nueva-liquidacion';

export const routes: Routes = [
  { path: 'empresas', component: Empresas },
  { path: 'empresas/nueva', component: Empresas },
  { path: 'empresas/:id/editar', component: Empresas },
  { path: 'empresas/:id', component: Empresas },
  { path: 'parametros-remuneraciones', component: ParametrosRemuneraciones },

  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'dashboard',
    component: Inicio
  },

  {
    path: 'trabajadores',
    component: Trabajadores
  },

  {
    path: 'trabajadores/nuevo',
    component: NuevoTrabajador
  },

  {
    path: 'trabajadores/:id/editar',
    component: EditarTrabajador
  },

  {
    path: 'trabajadores/:id',
    component: DetalleTrabajador
  },

  {
    path: 'liquidaciones',
    component: Liquidaciones
  },

  {
    path: 'liquidaciones/nueva',
    component: NuevaLiquidacion
  },

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'login'
  }

];
