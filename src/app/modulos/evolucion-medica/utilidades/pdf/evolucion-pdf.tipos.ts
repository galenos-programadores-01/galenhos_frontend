import type { IPacienteDatosAdicionales } from '../../../../compartido/tipos/tipos';

export interface SolicitudExamenPdfItem {
  tipo?: string;
  examen?: string;
  indicacion?: string;
  prioridad?: string;
  [key: string]: unknown;
}

export interface InterconsultaPdfItem {
  especialidad?: string;
  IdEspecialidad?: number;
  medico?: string;
  idMedicoDestino?: number;
  motivo?: string;
  estado?: string;
  fechaSolicitud?: string;
  [key: string]: unknown;
}

export interface PlanEvolucionPdf {
  farmacologico?: Record<string, unknown>[];
  solicitudExamenes?: SolicitudExamenPdfItem[] | Record<string, unknown>;
  interconsultas?: InterconsultaPdfItem[] | Record<string, unknown>;
  indicacionesGenerales?: Record<string, unknown>;
}

export interface EvolucionPdfData {
  paciente: {
    nombre: string;
    historia: string;
    idRegAtencion: number;
    edad: string;
    sexo: string;
    ubicacion: string;
    servicio?: string;
    especialidad?: string;
    cama: string;
    estado: string;
  };
  cabecera: {
    fecha: string;
    hora: string;
    medicoTratante: string;
    tipoAtencion: string;
    servicio?: string;
    especialidad?: string;
    dni?: string;
    colegiatura?: string;
    rne?: string;
  };
  antecedentes?: IPacienteDatosAdicionales | null;
  motivo: Record<string, unknown>;
  subjetivo?: Record<string, unknown>;
  signosVitales?: Record<string, unknown>;
  examenFisico?: {
    sistema?: string | null;
    normal?: boolean | null;
    hallazgo?: string | null;
  }[];
  evaluacion?: Record<string, unknown>;
  diagnosticos?: {
    cie10?: string | null;
    descripcion?: string | null;
    tipo?: string | null;
    condicion?: string | null;
    estado?: string | null;
  }[];
  evolucionLibre?: string;
  plan?: PlanEvolucionPdf;
  interconsultas?: InterconsultaPdfItem[];
  sintomas?: string[];
  ordenesMedicas?: Record<string, unknown>;
}

export interface DatosInstitucion {
  rucEess?: string | null;
  nombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  logoMinsa?: string | null;
  logoHospi?: string | null;
}
