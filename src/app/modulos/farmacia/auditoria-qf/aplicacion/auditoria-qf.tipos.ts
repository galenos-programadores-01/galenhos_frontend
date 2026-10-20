export const DIAS_MAXIMOS_BANDEJA = 7;
export const TAMANO_PAGINA_BANDEJA = 10;

export interface RecetaBandeja {
  numReceta: string;
  receta: string;
  hora: string;
  paciente: string;
  edad: string;
  medico: string;
  servicio: string;
  estadoFirma: string;
  estado: string;
  motivo: string;
}

export interface EstadoRecetaOpcion {
  idEstado: number;
  estado: string;
}

export interface FiltroBandejaRecetas {
  fechaInicio: string;
  fechaFin: string;
  idEstado: number | null;
}

export interface MedicamentoReceta {
  idPaciente: number;
  idProducto: number;
  codigo: string;
  nombre: string;
  cantidadPedida: string;
  via: string;
  tratamiento: string;
  solicitadoAntes: boolean;
}

export interface HistoricoMedicamento {
  fecha: string;
  medico: string;
  tratamiento: string;
  cantidadDespachada: string;
}

export type DecisionAuditoria = 'aprobar' | 'observar' | 'rechazar';

export interface DecisionPendiente {
  decision: DecisionAuditoria;
  observacion: string;
  idEstado: number;
  motivoObservacion: string;
  motivoRechazo: string;
}

export interface GuardarEstadoReceta {
  idEstado: number;
  motivoObservacion: string;
  motivoRechazo: string;
}
