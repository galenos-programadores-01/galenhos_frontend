import type { jsPDF } from 'jspdf';
import { PdfLienzoClinico } from '../../../../compartido/pdf/pdf-lienzo-clinico';
import type { DatosInstitucionPdf } from '../../../../compartido/pdf/pdf.tipos';
import type {
  DocumentoFirmaPa,
  ItemExamenDocumentoFirmaPa,
  ItemMedicamentoDocumentoFirmaPa,
} from '../firma/primera-atencion-firma.tipos';
import type { PrimeraAtencionPdfData } from './primera-atencion-pdf.tipos';
import { construirPdfPrimeraAtencion } from './primera-atencion-pdf.util';

export interface PdfDocumentoFirmaPa {
  documento: DocumentoFirmaPa;
  doc: jsPDF;
}

/**
 * Genera el PDF de un DocumentoFirmaPa.
 * PA: motor completo. Satélites: cabecera paciente sin signos vitales.
 */
export async function generarPdfDocumentoFirmaPa(
  documento: DocumentoFirmaPa,
  datosPa: PrimeraAtencionPdfData,
  institucion: DatosInstitucionPdf | null,
  nombreUsuario: string,
  fechaImpresion: string,
): Promise<jsPDF> {
  let doc: jsPDF | null = null;
  if (documento.tipo === 'pa') {
    doc = await construirPdfPrimeraAtencion(
      datosPa,
      institucion,
      nombreUsuario,
      fechaImpresion,
    );
  } else if (documento.tipo === 'examen') {
    doc = await construirPdfExamenSatelite(
      documento,
      documento.examenes,
      datosPa,
      institucion,
      nombreUsuario,
      fechaImpresion,
    );
  } else if (documento.tipo === 'medicamentos') {
    doc = await construirPdfMedicamentosSatelite(
      documento,
      documento.medicamentos,
      datosPa,
      institucion,
      nombreUsuario,
      fechaImpresion,
    );
  }
  if (!doc) {
    throw new Error(`No se pudo generar el PDF: ${documento.etiqueta}`);
  }
  return doc;
}

/** Genera el PDF de cada DocumentoFirmaPa del lote. */
export async function generarPdfsDocumentosFirmaPa(
  documentos: DocumentoFirmaPa[],
  datosPa: PrimeraAtencionPdfData,
  institucion: DatosInstitucionPdf | null,
  nombreUsuario: string,
  fechaImpresion: string,
): Promise<PdfDocumentoFirmaPa[]> {
  const out: PdfDocumentoFirmaPa[] = [];
  for (const documento of documentos) {
    const doc = await generarPdfDocumentoFirmaPa(
      documento,
      datosPa,
      institucion,
      nombreUsuario,
      fechaImpresion,
    );
    out.push({ documento, doc });
  }
  return out;
}

async function construirPdfExamenSatelite(
  documento: DocumentoFirmaPa,
  items: ItemExamenDocumentoFirmaPa[],
  datosPa: PrimeraAtencionPdfData,
  institucion: DatosInstitucionPdf | null,
  nombreUsuario: string,
  fechaImpresion: string,
): Promise<jsPDF | null> {
  const { jsPDF: JsPdf } = await import('jspdf');
  const documentoPdf = new JsPdf({ unit: 'mm', format: 'a4' });
  const lienzo = new PdfLienzoClinico(documentoPdf);
  const tituloCorto = 'SOLICITUD DE EXÁMENES';
  lienzo.etiquetaDocumentoCorto = tituloCorto;

  const banner = `HISTORIA CLÍNICA ELECTRÓNICA — ${documento.etiqueta.toUpperCase()} — EMERGENCIA`;
  lienzo.dibujarEncabezadoInstitucion(institucion, banner);
  lienzo.dibujarTarjetaPaciente(datosPa.paciente, datosPa.cabecera, 'PA');
  // Sin signos vitales (acuerdo diseño satélites).

  lienzo.dibujarTituloSeccion(
    'EXÁMENES AUXILIARES SOLICITADOS',
    `${items.length} ítem(s)`,
  );
  if (items.length === 0) {
    lienzo.dibujarParrafoEtiquetado('EXÁMENES', 'Sin exámenes');
  } else {
    lienzo.dibujarTablaSimple(
      ['#', 'CIE DX', 'EXAMEN', 'CÓDIGO'],
      items.map((e, i) => [
        String(i + 1),
        e.cie10Dx || '—',
        e.nombre || '—',
        e.codigo || '—',
      ]),
      [10, 22, 120, 30],
    );
  }

  lienzo.dibujarEspacioFirma(
    datosPa.cabecera,
    institucion,
    nombreUsuario,
    fechaImpresion,
  );
  lienzo.aplicarPiesDePagina(tituloCorto);
  return documentoPdf;
}

async function construirPdfMedicamentosSatelite(
  _documento: DocumentoFirmaPa,
  items: ItemMedicamentoDocumentoFirmaPa[],
  datosPa: PrimeraAtencionPdfData,
  institucion: DatosInstitucionPdf | null,
  nombreUsuario: string,
  fechaImpresion: string,
): Promise<jsPDF | null> {
  const { jsPDF: JsPdf } = await import('jspdf');
  const documentoPdf = new JsPdf({ unit: 'mm', format: 'a4' });
  const lienzo = new PdfLienzoClinico(documentoPdf);
  const tituloCorto = 'RECETA MÉDICA';
  lienzo.etiquetaDocumentoCorto = tituloCorto;

  lienzo.dibujarEncabezadoInstitucion(
    institucion,
    'HISTORIA CLÍNICA ELECTRÓNICA — MEDICAMENTOS — EMERGENCIA',
  );
  lienzo.dibujarTarjetaPaciente(datosPa.paciente, datosPa.cabecera, 'PA');
  // Sin signos vitales.

  lienzo.dibujarTituloSeccion(
    'TRATAMIENTO FARMACOLÓGICO',
    `${items.length} medicamento(s)`,
  );
  if (items.length === 0) {
    lienzo.dibujarParrafoEtiquetado('MEDICAMENTOS', 'Sin medicamentos');
  } else {
    lienzo.dibujarTablaSimple(
      ['CIE DX', 'MEDICAMENTO', 'CANT.', 'DOSIS', 'VÍA', 'FREQ.', 'DÍAS'],
      items.map((m) => [
        m.cie10Dx || '—',
        m.nombre || '—',
        m.cantidad || '—',
        `${m.dosis || ''} ${m.unidad || ''}`.trim() || '—',
        m.via || '—',
        m.frecuencia || '—',
        m.duracion || '—',
      ]),
      [20, 48, 14, 28, 24, 30, 14],
    );
  }

  lienzo.dibujarEspacioFirma(
    datosPa.cabecera,
    institucion,
    nombreUsuario,
    fechaImpresion,
  );
  lienzo.aplicarPiesDePagina(tituloCorto);
  return documentoPdf;
}
