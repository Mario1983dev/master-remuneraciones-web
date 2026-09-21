export interface CrearLiquidacion {
  empresa_id: number;
  trabajador_id: number;
  anio: number;
  mes: number;
  parametros_version_id: number;
  parametros_version: number;
  afp_codigo: string;
  regla_cesantia_codigo: string;
  datos: {
    sueldo_base: number; dias_trabajados: number;
    afp_nombre: string; salud_tipo: string; salud_institucion: string;
    salud_valor: number | null; salud_tipo_valor: string;
    apv_monto: number; apv_regimen: string; cargas_familiares: number;
    horas_extra: number; bonos: number; comisiones: number; gratificacion: number;
    aguinaldo: number; colacion: number; movilizacion: number; otros_haberes: number;
    anticipos: number; prestamos: number; otros_descuentos: number;
  };
  resultados: Record<string, number | null>;
}
