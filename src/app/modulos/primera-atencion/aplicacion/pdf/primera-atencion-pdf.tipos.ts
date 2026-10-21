import type {
  DatosInstitucionPdf,
  PdfCabeceraAtencion,
  PdfPacienteIdentificacion,
  PdfSignosVitales,
} from '../../../../compartido/pdf/pdf.tipos';

export type { DatosInstitucionPdf };

/** Fila de plan (examen / procedimiento) con CIE del DX asociado. */
export interface PdfPlanItemConDx {
  cie10Dx: string;
  nombre: string;
  codigo: string;
}

export interface PdfMedicamentoConDx {
  cie10Dx: string;
  nombre: string;
  cantidad: string;
  dosis: string;
  unidad: string;
  frecuencia: string;
  via: string;
  duracion: string;
}

export interface PdfInterconsultaItem {
  especialidad: string;
  motivo: string;
  fecha: string;
  estado: string;
}

export interface PdfDiagnosticoItem {
  cie10: string;
  descripcion: string;
  tipo: string;
}

export interface PdfEgresoDetalleFila {
  etiqueta: string;
  valor: string;
}

export interface PrimeraAtencionPdfData {
  paciente: PdfPacienteIdentificacion;
  cabecera: PdfCabeceraAtencion;
  signosVitales: PdfSignosVitales;
  anamnesis: {
    tipo: string;
    tiempoEnfermedad: string;
    signosSintomas: string;
    relatoCronologico: string;
    antecedentes: string;
  };
  examen: {
    estadoGeneral: string;
    hidratacion: string;
    conciencia: string;
    pielAnexos: string;
    examenRegional: string;
  };
  diagnosticos: PdfDiagnosticoItem[];
  plan: {
    examenes: PdfPlanItemConDx[];
    procedimientos: PdfPlanItemConDx[];
    interconsultas: PdfInterconsultaItem[];
    referencia: string;
  };
  medicamentos: PdfMedicamentoConDx[];
  evolucion: string;
  evaluacionEnfermeria: string;
  egreso: {
    destino: string;
    fecha: string;
    hora: string;
    registrado: boolean;
    detalle: PdfEgresoDetalleFila[];
    diagnosticos: PdfDiagnosticoItem[];
  };
}

/** Contexto UI → mapper PDF (datos ya etiquetados). */
export interface ContextoMapperPdfPa {
  paciente: PdfPacienteIdentificacion;
  cabecera: PdfCabeceraAtencion;
  signosVitales: PdfSignosVitales;
  form: {
    anamnesisTipo: string;
    tiempoEnfermedad: string;
    signosSintomas: string;
    relatoCronologico: string;
    antecedentes: string;
    pielAnexos: string;
    examenRegional: string;
    referencia: string;
    evolucion: string;
    evaluacionEnfermeria: string;
  };
  etiquetasExamen: {
    estadoGeneral: string;
    hidratacion: string;
    conciencia: string;
  };
  diagnosticos: PdfDiagnosticoItem[];
  examenes: PdfPlanItemConDx[];
  procedimientos: PdfPlanItemConDx[];
  interconsultas: PdfInterconsultaItem[];
  medicamentos: PdfMedicamentoConDx[];
  egreso: {
    destino: string;
    fecha: string;
    hora: string;
    registrado: boolean;
    detalle: PdfEgresoDetalleFila[];
    diagnosticos: PdfDiagnosticoItem[];
  };
}
