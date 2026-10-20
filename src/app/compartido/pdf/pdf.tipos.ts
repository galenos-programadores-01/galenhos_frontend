/** Datos institucionales para encabezado de PDFs clínicos (Evolución, PA, etc.). */
export interface DatosInstitucionPdf {
  rucEess?: string | null;
  nombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  logoMinsa?: string | null;
  logoHospi?: string | null;
}

/** Identificación del paciente en tarjeta de PDF (patrón común). */
export interface PdfPacienteIdentificacion {
  nombre: string;
  historia: string;
  idRegistro: number | string;
  edad: string;
  sexo: string;
  estado: string;
  servicio: string;
  cama?: string;
  especialidad?: string;
  documento?: string;
}

/** Quién / cuándo / tipo de atención en el PDF. */
export interface PdfCabeceraAtencion {
  fecha: string;
  hora: string;
  medicoTratante: string;
  tipoAtencion: string;
  servicio?: string;
  especialidad?: string;
  dni?: string;
  colegiatura?: string;
  rne?: string;
}

/**
 * Signos vitales en el mismo shape que Evolución (formulario SOAP / PDF).
 * Claves en camelCase para un contrato estable entre módulos.
 */
export interface PdfSignosVitales {
  presionArterial?: string | number | null;
  frecuenciaCardiaca?: string | number | null;
  frecuenciaRespiratoria?: string | number | null;
  temperatura?: string | number | null;
  saturacionOxigeno?: string | number | null;
  peso?: string | number | null;
  talla?: string | number | null;
  imc?: string | number | null;
  glucemia?: string | number | null;
}

export type RgbPdf = [number, number, number];
