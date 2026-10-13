import type { jsPDF } from 'jspdf';
import { PdfLienzoClinico } from '../../../../compartido/pdf/pdf-lienzo-clinico';
import type { DatosInstitucionPdf } from '../../../../compartido/pdf/pdf.tipos';
import { formatearValorPdf } from '../../../../compartido/pdf/pdf-formato';
import type { PrimeraAtencionPdfData } from './primera-atencion-pdf.tipos';

const BANNER_PA =
  'HISTORIA CLÍNICA ELECTRÓNICA — PRIMERA ATENCIÓN — EMERGENCIA';

/**
 * Motor PDF de Primera Atención.
 * Usa el lienzo clínico compartido (institución, paciente, SV) + secciones PA.
 */
export async function construirPdfPrimeraAtencion(
  datos: PrimeraAtencionPdfData,
  institucion: DatosInstitucionPdf | null,
  nombreUsuario: string,
  fechaImpresion: string,
): Promise<jsPDF | null> {
  const { jsPDF: JsPdf } = await import('jspdf');
  const documentoPdf = new JsPdf({ unit: 'mm', format: 'a4' });
  const lienzo = new PdfLienzoClinico(documentoPdf);
  lienzo.etiquetaDocumentoCorto = 'PRIMERA ATENCIÓN';

  lienzo.dibujarEncabezadoInstitucion(institucion, BANNER_PA);
  lienzo.dibujarTarjetaPaciente(datos.paciente, datos.cabecera, 'PA');
  lienzo.dibujarSignosVitales(datos.signosVitales);

  // ── 1. Anamnesis ──
  lienzo.dibujarTituloSeccion('ANAMNESIS', datos.anamnesis.tipo || 'CONSULTA');
  lienzo.dibujarParrafoEtiquetado(
    'TIEMPO DE ENFERMEDAD',
    datos.anamnesis.tiempoEnfermedad,
  );
  lienzo.dibujarParrafoEtiquetado(
    'SIGNOS Y SÍNTOMAS',
    datos.anamnesis.signosSintomas,
  );
  lienzo.dibujarParrafoEtiquetado(
    'RELATO CRONOLÓGICO',
    datos.anamnesis.relatoCronologico,
  );
  lienzo.dibujarParrafoEtiquetado('ANTECEDENTES', datos.anamnesis.antecedentes);

  // ── 2. Examen clínico ──
  lienzo.dibujarTituloSeccion('EXAMEN CLÍNICO', 'PARÁMETROS CLÍNICOS');
  lienzo.dibujarParrafoEtiquetado(
    'ESTADO GENERAL',
    datos.examen.estadoGeneral,
  );
  lienzo.dibujarParrafoEtiquetado('HIDRATACIÓN', datos.examen.hidratacion);
  lienzo.dibujarParrafoEtiquetado('NIVEL DE CONCIENCIA', datos.examen.conciencia);
  lienzo.dibujarParrafoEtiquetado('PIEL Y ANEXOS', datos.examen.pielAnexos);
  lienzo.dibujarParrafoEtiquetado(
    'EXAMEN CLÍNICO REGIONAL',
    datos.examen.examenRegional,
  );

  // ── 3. Diagnósticos PA ──
  lienzo.dibujarTituloSeccion(
    'DIAGNÓSTICOS CLÍNICOS (PRIMERA ATENCIÓN)',
    `${datos.diagnosticos.length} registro(s)`,
  );
  if (datos.diagnosticos.length === 0) {
    lienzo.dibujarParrafoEtiquetado('DIAGNÓSTICOS', 'Sin diagnósticos');
  } else {
    lienzo.dibujarTablaSimple(
      ['CIE-10', 'DESCRIPCIÓN CLÍNICA', 'TIPO'],
      datos.diagnosticos.map((d) => [d.cie10, d.descripcion, d.tipo]),
      [22, 128, 32],
    );
  }

  // ── 4. Plan: exámenes / procedimientos / interconsultas ──
  lienzo.dibujarTituloSeccion('PLAN DE TRABAJO', 'EXÁMENES / PROCEDIMIENTOS / IC');
  if (datos.plan.examenes.length > 0) {
    lienzo.dibujarParrafoEtiquetado(
      'EXÁMENES AUXILIARES',
      `${datos.plan.examenes.length} solicitado(s)`,
    );
    lienzo.dibujarTablaSimple(
      ['#', 'CIE DX', 'EXAMEN', 'CÓDIGO'],
      datos.plan.examenes.map((e, i) => [
        String(i + 1),
        e.cie10Dx || '—',
        e.nombre,
        e.codigo || '—',
      ]),
      [10, 22, 120, 30],
    );
  } else {
    lienzo.dibujarParrafoEtiquetado('EXÁMENES', 'Sin exámenes solicitados');
  }

  if (datos.plan.procedimientos.length > 0) {
    lienzo.dibujarParrafoEtiquetado(
      'PROCEDIMIENTOS',
      `${datos.plan.procedimientos.length} registrado(s)`,
    );
    lienzo.dibujarTablaSimple(
      ['#', 'CIE DX', 'PROCEDIMIENTO', 'CÓDIGO'],
      datos.plan.procedimientos.map((p, i) => [
        String(i + 1),
        p.cie10Dx || '—',
        p.nombre,
        p.codigo || '—',
      ]),
      [10, 22, 120, 30],
    );
  } else {
    lienzo.dibujarParrafoEtiquetado(
      'PROCEDIMIENTOS',
      'Sin procedimientos registrados',
    );
  }

  if (datos.plan.interconsultas.length > 0) {
    lienzo.dibujarParrafoEtiquetado(
      'INTERCONSULTAS',
      `${datos.plan.interconsultas.length} solicitud(es)`,
    );
    lienzo.dibujarTablaSimple(
      ['ESPECIALIDAD', 'MOTIVO', 'FECHA', 'ESTADO'],
      datos.plan.interconsultas.map((ic) => [
        ic.especialidad || '—',
        ic.motivo || '—',
        ic.fecha || '—',
        ic.estado || '—',
      ]),
      [45, 75, 32, 30],
    );
  } else {
    lienzo.dibujarParrafoEtiquetado('INTERCONSULTAS', 'Sin interconsultas');
  }

  lienzo.dibujarParrafoEtiquetado(
    'REFERENCIA OPORTUNA',
    datos.plan.referencia || '—',
  );

  // ── 5. Medicamentos ──
  lienzo.dibujarTituloSeccion(
    'TRATAMIENTO FARMACOLÓGICO',
    `${datos.medicamentos.length} medicamento(s)`,
  );
  if (datos.medicamentos.length === 0) {
    lienzo.dibujarParrafoEtiquetado('MEDICAMENTOS', 'Sin medicamentos');
  } else {
    lienzo.dibujarTablaSimple(
      ['CIE DX', 'MEDICAMENTO', 'CANT.', 'DOSIS', 'VÍA', 'FREQ.', 'DÍAS'],
      datos.medicamentos.map((m) => [
        m.cie10Dx || '—',
        m.nombre,
        m.cantidad || '—',
        `${m.dosis || ''} ${m.unidad || ''}`.trim() || '—',
        m.via || '—',
        m.frecuencia || '—',
        m.duracion || '—',
      ]),
      [20, 48, 14, 28, 24, 30, 14],
    );
  }

  // ── 6. Evolución ──
  lienzo.dibujarTituloSeccion('EVOLUCIÓN', '');
  lienzo.dibujarParrafoEtiquetado('EVOLUCIÓN', datos.evolucion);
  lienzo.dibujarParrafoEtiquetado(
    'EVALUACIÓN ENFERMERÍA / OBSTETRICIA',
    datos.evaluacionEnfermeria,
  );

  // ── 7. Egreso ──
  const egresoSub = datos.egreso.registrado
    ? formatearValorPdf(datos.egreso.destino)
    : 'SIN REGISTRO';
  lienzo.dibujarTituloSeccion('EGRESO', egresoSub);
  if (!datos.egreso.registrado && !datos.egreso.destino) {
    lienzo.dibujarParrafoEtiquetado('EGRESO', 'Sin egreso registrado');
  } else {
    lienzo.dibujarParrafoEtiquetado(
      'DESTINO DE EGRESO',
      formatearValorPdf(datos.egreso.destino),
    );
    lienzo.dibujarParrafoEtiquetado(
      'FECHA / HORA',
      `${formatearValorPdf(datos.egreso.fecha)} ${formatearValorPdf(datos.egreso.hora)}`,
    );
    for (const fila of datos.egreso.detalle) {
      lienzo.dibujarParrafoEtiquetado(
        fila.etiqueta.toUpperCase(),
        formatearValorPdf(fila.valor),
      );
    }
    if (datos.egreso.diagnosticos.length > 0) {
      lienzo.dibujarParrafoEtiquetado(
        'DIAGNÓSTICOS DE EGRESO',
        `${datos.egreso.diagnosticos.length} registro(s)`,
      );
      lienzo.dibujarTablaSimple(
        ['CIE-10', 'DESCRIPCIÓN', 'TIPO'],
        datos.egreso.diagnosticos.map((d) => [
          d.cie10,
          d.descripcion,
          d.tipo,
        ]),
        [22, 128, 32],
      );
    } else {
      lienzo.dibujarParrafoEtiquetado(
        'DIAGNÓSTICOS DE EGRESO',
        'Sin diagnósticos de egreso',
      );
    }
  }

  lienzo.dibujarEspacioFirma(
    datos.cabecera,
    institucion,
    nombreUsuario,
    fechaImpresion,
  );
  lienzo.aplicarPiesDePagina('PRIMERA ATENCIÓN');

  return documentoPdf;
}
