import type { DocumentoFirmaPa } from '../firma/primera-atencion-firma.tipos';
import type { PrimeraAtencionPdfData } from '../pdf/primera-atencion-pdf.tipos';

/** Ítem del paquete firmado (PA + satélites) para el visor. */
export interface VerFichaDocumentoItem {
  clave: string;
  etiqueta: string;
  tipo: 'pa' | 'examen' | 'medicamentos';
  idReceta: number | null;
}

/** Vista HTML de ficha PA + documentos firmados del encuentro. */
export interface VerFichaPaVista {
  idAtencion: number;
  idPrimeraAtencion: number;
  historia: string;
  /** @deprecated Preferir firmado + documentos del FTP. */
  uuidFirma: string;
  firmado: boolean;
  ubicacionArchivo: string;
  /** Lista UI del lateral (misma clave que loteDocumentos). */
  documentos: VerFichaDocumentoItem[];
  /**
   * Lote completo (ítems de examen/meds) para regenerar PDF si falla el FTP.
   * Misma forma que el armado de firma.
   */
  loteDocumentos: DocumentoFirmaPa[];
  financiamiento: string;
  prioridad: string;
  logoInstitucion: string;
  cargoCompleto: string;
  fechaHoraFirma: string;
  datos: PrimeraAtencionPdfData;
  sintomas: string[];
}
