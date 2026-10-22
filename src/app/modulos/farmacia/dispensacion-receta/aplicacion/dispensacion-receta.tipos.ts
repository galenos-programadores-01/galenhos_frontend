export const TAMANO_PAGINA_DISPENSACION = 10;

export type EstadoDispensacion = 'por_atender' | 'atendido';
export type PrioridadDispensacion = 'urgente' | 'normal';

export interface MedicamentoDispensacion {
  id: number;
  nombre: string;
  presentacion: string;
  indicacion: string;
  via: string;
  cantidad: string;
  unidad: string;
  ubicacion: string;
  lote: string;
  vence: string;
  stock: number;
}

export interface RecetaDispensacion {
  numReceta: string;
  paciente: string;
  dni: string;
  edad: string;
  servicio: string;
  prioridad: PrioridadDispensacion;
  medico: string;
  destino: string;
  estado: EstadoDispensacion;
  medicamentos: MedicamentoDispensacion[];
}

export interface FiltroDispensacion {
  estado: '' | EstadoDispensacion;
  servicio: string;
  prioridad: '' | PrioridadDispensacion;
  buscar: string;
}
