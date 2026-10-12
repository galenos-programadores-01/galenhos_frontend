import {
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CUERPO,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import { convertirTexto } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';

export function dibujarMotivo(
  lienzo: PdfLienzoEvolucion,
  motivo: Record<string, unknown> | undefined,
): void {
  if (!motivo) return;

  const tipoDirecto = convertirTexto(motivo.tipo);
  const mapeoClaves: [string, string][] = [
    ['motivoConsulta', 'Motivo de consulta'],
    ['seguimiento', 'Seguimiento'],
    ['control', 'Control médico'],
    ['reevaluacion', 'Reevaluación'],
    ['postoperatorio', 'Postoperatorio'],
    ['interconsulta', 'Interconsulta'],
    ['emergencia', 'Atención de Emergencia'],
  ];

  const seleccionados = mapeoClaves
    .filter(([clave]) => Boolean(motivo[clave]))
    .map(([, etiqueta]) => etiqueta);

  const tipoFinal =
    tipoDirecto ||
    (seleccionados.length > 0
      ? seleccionados.join(', ')
      : 'Consulta médica general');
  const detalleMotivo = convertirTexto(motivo.descripcion || motivo.detalle);

  lienzo.dibujarTituloSeccion('MOTIVO DE CONSULTA Y RAZÓN DE ATENCIÓN');

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(6.2);
  const lineasTipo = lienzo.doc.splitTextToSize(
    tipoFinal,
    lienzo.anchoContenido - 36,
  );
  const altoTipo = Math.max(6.8, lineasTipo.length * 3.4 + 3.4);

  lienzo.asegurarEspacio(altoTipo + (detalleMotivo ? 12 : 2));

  lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
  lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
  lienzo.doc.setLineWidth(0.18);
  lienzo.doc.roundedRect(
    lienzo.margenIzquierdo,
    lienzo.posicionVertical,
    lienzo.anchoContenido,
    altoTipo,
    0.8,
    0.8,
    'FD',
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(5.2);
  lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
  lienzo.doc.text(
    'MODALIDAD / TIPO:',
    lienzo.margenIzquierdo + 3,
    lienzo.posicionVertical + 4.2,
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(6.2);
  lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
  lienzo.doc.text(
    lineasTipo,
    lienzo.margenIzquierdo + 34,
    lienzo.posicionVertical + 4.2,
  );

  lienzo.posicionVertical += altoTipo + 1.5;

  if (detalleMotivo) {
    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    const lineasDetalle = lienzo.doc.splitTextToSize(
      detalleMotivo,
      lienzo.anchoContenido - 6,
    );
    const altoDetalle = Math.max(7, lineasDetalle.length * 3.5 + 4);

    lienzo.doc.setFillColor(...COLOR_FONDO_GRIS);
    lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    lienzo.doc.setLineWidth(0.18);
    lienzo.doc.roundedRect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      lienzo.anchoContenido,
      altoDetalle,
      0.8,
      0.8,
      'FD',
    );

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
    lienzo.doc.text(
      lineasDetalle,
      lienzo.margenIzquierdo + 3,
      lienzo.posicionVertical + 4,
    );

    lienzo.posicionVertical += altoDetalle + 2;
  }
}
