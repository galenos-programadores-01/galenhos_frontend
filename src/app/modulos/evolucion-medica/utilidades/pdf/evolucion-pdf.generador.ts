import type { jsPDF } from 'jspdf';
import { PdfLienzoEvolucion } from './evolucion-pdf.lienzo';
import type { DatosInstitucion, EvolucionPdfData } from './evolucion-pdf.tipos';
import { dibujarAntecedentes } from './secciones/pdf-antecedentes';
import { dibujarDiagnosticos } from './secciones/pdf-diagnosticos';
import { dibujarEncabezadoInstitucion } from './secciones/pdf-encabezado';
import { dibujarEvaluacion } from './secciones/pdf-evaluacion';
import { dibujarExamenFisico } from './secciones/pdf-examen-fisico';
import { dibujarFirmaDigital } from './secciones/pdf-firma-digital';
import { dibujarMotivo } from './secciones/pdf-motivo';
import { dibujarTarjetaPaciente } from './secciones/pdf-paciente';
import { dibujarPlanTratamiento } from './secciones/pdf-plan-tratamiento';
import { dibujarSignosVitales } from './secciones/pdf-signos-vitales';
import { dibujarSubjetivo } from './secciones/pdf-subjetivo';

export async function construirPdfEvolucion(
  datosEvolucion: EvolucionPdfData,
  datosInstitucion: DatosInstitucion | null,
  nombreUsuario: string,
  fechaImpresion: string,
): Promise<jsPDF | null> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const lienzo = new PdfLienzoEvolucion(documentoPdf);

  dibujarEncabezadoInstitucion(lienzo, datosInstitucion);
  dibujarTarjetaPaciente(
    lienzo,
    datosEvolucion.paciente,
    datosEvolucion.cabecera,
  );
  dibujarSignosVitales(lienzo, datosEvolucion.signosVitales);
  dibujarAntecedentes(lienzo, datosEvolucion.antecedentes);
  dibujarMotivo(lienzo, datosEvolucion.motivo);
  dibujarSubjetivo(lienzo, datosEvolucion.subjetivo, datosEvolucion.sintomas);
  dibujarExamenFisico(lienzo, datosEvolucion.examenFisico);
  dibujarDiagnosticos(lienzo, datosEvolucion.diagnosticos);
  dibujarEvaluacion(
    lienzo,
    datosEvolucion.evaluacion,
    datosEvolucion.evolucionLibre,
  );
  dibujarPlanTratamiento(
    lienzo,
    datosEvolucion.plan,
    datosEvolucion.interconsultas,
    datosEvolucion.ordenesMedicas,
  );
  dibujarFirmaDigital(
    lienzo,
    datosEvolucion.cabecera,
    datosInstitucion,
    nombreUsuario,
    fechaImpresion,
  );

  const totalPaginas = documentoPdf.getNumberOfPages();
  for (let numeroPagina = 1; numeroPagina <= totalPaginas; numeroPagina++) {
    documentoPdf.setPage(numeroPagina);

    if (numeroPagina > 1) {
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(5.5);
      documentoPdf.setTextColor(148, 163, 184);
      documentoPdf.text(
        `HOSPITAL NACIONAL SERGIO E. BERNALES  •  EVOLUCIÓN CLÍNICA  •  ${lienzo.pacienteNombre.toUpperCase()} (HC: ${lienzo.pacienteHistoria || 'S/N'})`,
        14,
        8,
      );
      documentoPdf.setDrawColor(226, 232, 240);
      documentoPdf.setLineWidth(0.18);
      documentoPdf.line(14, 9.5, 196, 9.5);
    }

    documentoPdf.setDrawColor(226, 232, 240);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.line(14, 287, 196, 287);

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(5.5);
    documentoPdf.setTextColor(100, 116, 139);
    documentoPdf.text(
      'Hospital Nacional Sergio E. Bernales  •  Galenos Pro 2026  •  Documento Clínico Electrónico Oficial',
      14,
      291,
    );
    documentoPdf.text(`Página ${numeroPagina} de ${totalPaginas}`, 196, 291, {
      align: 'right',
    });
  }

  return documentoPdf;
}
