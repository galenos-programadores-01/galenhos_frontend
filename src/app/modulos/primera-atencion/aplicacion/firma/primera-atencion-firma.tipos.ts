/** IdPuntoCarga farmacia (medicamentos). */
export const PA_ID_PUNTO_CARGA_FARMACIA = 5;

/** IdPuntoCarga procedimientos — fuera del lote de firma. */
export const PA_ID_PUNTO_CARGA_PROCEDIMIENTOS = 26;

export type TipoDocumentoFirmaPa = 'pa' | 'examen' | 'medicamentos';

/** Ítem de examen incluido en un documento satélite. */
export interface ItemExamenDocumentoFirmaPa {
  idProducto: number | null;
  idReceta: number | null;
  idPuntoCarga: number | null;
  puntoCarga: string | null;
  nombre: string;
  codigo: string;
  idDiagnostico: number | null;
  cie10Dx: string;
}

/** Ítem de medicamento incluido en el documento de farmacia. */
export interface ItemMedicamentoDocumentoFirmaPa {
  idProducto: number;
  idReceta: number | null;
  nombre: string;
  cantidad: string;
  dosis: string;
  unidad: string;
  frecuencia: string;
  via: string;
  duracion: string;
  idDiagnostico: number | null;
  cie10Dx: string;
}

/**
 * Documento que entrará al lote de Firma Perú.
 * Basename = path FTP: {idPA}.pdf / {idPA}_{idReceta}.pdf
 */
export interface DocumentoFirmaPa {
  clave: string;
  etiqueta: string;
  tipo: TipoDocumentoFirmaPa;
  /** Clave satélite (RecetaCabecera); null en PA. */
  idReceta: number | null;
  idPuntoCarga: number | null;
  cantidadItems: number;
  /** Nombre en el 7z (= basename remoto). */
  nombreArchivoSugerido: string;
  examenes: ItemExamenDocumentoFirmaPa[];
  medicamentos: ItemMedicamentoDocumentoFirmaPa[];
}

/** Entrada del armado: filas UI ya cargadas en el cierre. */
export interface EntradaArmarDocumentosFirmaPa {
  /** Clave HIS (contexto); el path FTP usa idPrimeraAtencion. */
  idAtencion: number;
  /** PK de Tab_PA — basename del PDF principal y prefijo de satélites. */
  idPrimeraAtencion: number;
  examenes: ReadonlyArray<{
    idProducto: number | null;
    idReceta: number | null;
    idPuntoCarga: number | null;
    puntoCarga: string | null;
    nombre: string;
    codigo?: string;
    idDiagnostico?: number | null;
    cie10Dx?: string;
  }>;
  medicamentos: ReadonlyArray<{
    idProducto: number | '' | null;
    idReceta: number | null;
    nombre: string;
    cantidad?: string;
    dosis?: string;
    unidad?: string;
    frecuencia?: string;
    via?: string;
    duracion?: string;
    idDiagnostico?: number | null;
    cie10Dx?: string;
  }>;
}
