import type { PrimeraAtencionPdfData } from '../pdf/primera-atencion-pdf.tipos';

/** Vista HTML de ficha PA (mismo patrón que Ver detalle de Evolución). */
export interface VerFichaPaVista {
  idAtencion: number;
  historia: string;
  uuidFirma: string;
  financiamiento: string;
  prioridad: string;
  logoInstitucion: string;
  cargoCompleto: string;
  fechaHoraFirma: string;
  datos: PrimeraAtencionPdfData;
  sintomas: string[];
}
