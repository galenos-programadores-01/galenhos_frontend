import {
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CUERPO,
} from '../evolucion-pdf.constantes';
import { convertirTexto } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';
import type { EvolucionPdfData } from '../evolucion-pdf.tipos';

export function dibujarExamenFisico(
  lienzo: PdfLienzoEvolucion,
  examenFisico: EvolucionPdfData['examenFisico'],
): void {
  if (!examenFisico || examenFisico.length === 0) return;

  const itemsConHallazgo = examenFisico.filter(
    (item) => convertirTexto(item.hallazgo).length > 0,
  );

  if (itemsConHallazgo.length === 0) return;

  lienzo.dibujarTituloSeccion('EXAMEN FÍSICO REGIONAL POR SISTEMAS (O)');

  for (const item of itemsConHallazgo) {
    const sistemaTexto = (item.sistema || 'SISTEMA').toUpperCase();
    const hallazgoTexto = convertirTexto(item.hallazgo);

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    const lineasHallazgo = lienzo.doc.splitTextToSize(
      hallazgoTexto,
      lienzo.anchoContenido - 44,
    );
    const altoFila = Math.max(6.5, lineasHallazgo.length * 3.4 + 3);

    lienzo.asegurarEspacio(altoFila);

    lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
    lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    lienzo.doc.setLineWidth(0.18);
    lienzo.doc.roundedRect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      lienzo.anchoContenido,
      altoFila,
      0.8,
      0.8,
      'FD',
    );

    lienzo.doc.setFillColor(...COLOR_FONDO_GRIS);
    lienzo.doc.roundedRect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      38,
      altoFila,
      0.8,
      0.8,
      'F',
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.5);
    lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    lienzo.doc.text(
      sistemaTexto,
      lienzo.margenIzquierdo + 3,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { maxWidth: 33 },
    );

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
    lienzo.doc.text(
      lineasHallazgo,
      lienzo.margenIzquierdo + 41,
      lienzo.posicionVertical + 4.2,
    );

    lienzo.posicionVertical += altoFila + 1.2;
  }
}
