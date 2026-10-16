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
