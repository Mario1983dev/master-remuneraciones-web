import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Empresas } from './empresas';
import { RemuneracionesService } from '../../shared/services/remuneraciones.service';

const empresa = {id: 9, office_id: 2, rut: '76123456-0', name: 'Empresa propia', status: 'active'};
describe('Empresas de Remuneraciones', () => {
  function setup(path = 'empresas', manage = true, status = 'active') {
    const api = {getEmpresas: vi.fn(() => of({empresas: [{...empresa,status}], can_manage: manage, is_master: true})),
      getEmpresa: vi.fn(() => of({empresa: {...empresa,status}, can_manage: manage})), crearEmpresa: vi.fn(() => of({id: 10})),
      actualizarEmpresa: vi.fn(() => of({id:9})), cambiarEstadoEmpresa: vi.fn(() => of({id:9}))};
    TestBed.configureTestingModule({imports:[Empresas],providers:[provideRouter([]),{provide:RemuneracionesService,useValue:api},
      {provide:ActivatedRoute,useValue:{paramMap:of(convertToParamMap(path.includes(':id') ? {id:'9'}:{})),snapshot:{routeConfig:{path}}}}]});
    const f=TestBed.createComponent(Empresas);f.detectChanges();return {f,c:f.componentInstance,api};
  }
  it('lista empresas y filtra por estado y RUT',()=>{
    const {c,f}=setup();expect(f.nativeElement.textContent).toContain('Empresa propia');
    c.estado='inactive';expect(c.filtradas()).toHaveLength(0);c.estado='';c.filtro='76123456';expect(c.filtradas()).toHaveLength(1);
  });
  it('consulta no muestra acciones administrativas y no escribe',()=>{
    const {c,f,api}=setup('empresas/nueva',false);c.guardar();expect(api.crearEmpresa).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).toContain('solo consultar');expect(f.nativeElement.querySelector('form')).toBeNull();
  });
  it('crea una empresa y navega al detalle propio',()=>{
    const {c,api}=setup('empresas/nueva');const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    c.form={...c.form,rut:empresa.rut,name:empresa.name,office_id:2};c.guardar();
    expect(api.crearEmpresa).toHaveBeenCalledWith(c.form);expect(navigate).toHaveBeenCalledWith(['/empresas',10]);
  });
  it('detalle inactivo mantiene históricos y oculta nuevas operaciones',()=>{
    const {f,c,api}=setup('empresas/:id',true,'inactive');
    expect(f.nativeElement.textContent).toContain('Liquidaciones e históricos');
    expect(f.nativeElement.textContent).not.toContain('Nuevo trabajador');
    expect(f.nativeElement.textContent).not.toContain('Nueva liquidación');
    c.cambiarEstado();expect(api.cambiarEstadoEmpresa).toHaveBeenCalledWith(9,'active');
  });
  it('edita el registro seleccionado',()=>{
    const {c,api}=setup('empresas/:id/editar');vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    c.form.name='Editada';c.guardar();expect(api.actualizarEmpresa).toHaveBeenCalledWith(9,c.form);
  });
  it('muestra conflictos del servidor y libera guardado',()=>{
    const {c,api}=setup('empresas/nueva');api.crearEmpresa.mockReturnValue(throwError(()=>({error:{message:'RUT duplicado'}})));
    c.guardar();expect(c.error()).toBe('RUT duplicado');expect(c.guardando()).toBe(false);
  });
});
