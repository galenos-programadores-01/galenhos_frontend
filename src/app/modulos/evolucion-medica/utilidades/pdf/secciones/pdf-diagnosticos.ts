import {
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CUERPO,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import { formatearValor } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';
import type { EvolucionPdfData } from '../evolucion-pdf.tipos';

export function dibujarDiagnosticos(
  lienzo: PdfLienzoEvolucion,
  diagnosticos: EvolucionPdfData['diagnosticos'],
): void {
  if (!diagnosticos || diagnosticos.length === 0) return;

  lienzo.dibujarTituloSeccion(
    'DIAGNÓSTICOS CLÍNICOS CODIFICADOS (CIE-10) — ANÁLISIS (A)',
  );

  const altoHeader = 5.8;
  lienzo.asegurarEspacio(altoHeader + 8);

  lienzo.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
  lienzo.doc.roundedRect(
    lienzo.margenIzquierdo,
    lienzo.posicionVertical,
    lienzo.anchoContenido,
    altoHeader,
    0.8,
    0.8,
    'F',
  );

  const columnas = [
    { titulo: 'CIE-10', ancho: 22, align: 'center' as const },
    {
      titulo: 'DESCRIPCIÓN CLÍNICA DEL DIAGNÓSTICO',
      ancho: 100,
      align: 'left' as const,
    },
    { titulo: 'TIPO', ancho: 20, align: 'center' as const },
    { titulo: 'CONDICIÓN', ancho: 20, align: 'center' as const },
    { titulo: 'ESTADO', ancho: 20, align: 'center' as const },
  ];

  let xH = lienzo.margenIzquierdo;
  for (const col of columnas) {
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.5);
    lienzo.doc.setTextColor(...COLOR_FONDO_BLANCO);
    if (col.align === 'center') {
      lienzo.doc.text(
        col.titulo,
        xH + col.ancho / 2,
        lienzo.posicionVertical + 3.8,
        {
          align: 'center',
        },
      );
    } else {
      lienzo.doc.text(col.titulo, xH + 3, lienzo.posicionVertical + 3.8);
    }
    xH += col.ancho;
  }

  lienzo.posicionVertical += altoHeader + 0.8;

  let indexFila = 0;
  for (const diagnostico of diagnosticos) {
    if (!diagnostico.cie10 && !diagnostico.descripcion) continue;

    const descripcion = formatearValor(diagnostico.descripcion);
    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    const lineasDescripcion = lienzo.doc.splitTextToSize(descripcion, 96);
    const altoFila = Math.max(6.2, lineasDescripcion.length * 3.4 + 2.8);

    lienzo.asegurarEspacio(altoFila);

    const colorFondo =
      indexFila % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
    lienzo.doc.setFillColor(...colorFondo);
    lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    lienzo.doc.setLineWidth(0.18);
    lienzo.doc.rect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      lienzo.anchoContenido,
      altoFila,
      'FD',
    );

    let xC = lienzo.margenIzquierdo;

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(6.5);
    lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    lienzo.doc.text(
      formatearValor(diagnostico.cie10),
      xC + columnas[0].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );
    xC += columnas[0].ancho;

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
    lienzo.doc.text(lineasDescripcion, xC + 3, lienzo.posicionVertical + 4);
    xC += columnas[1].ancho;

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(5.8);
    lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
    lienzo.doc.text(
      formatearValor(diagnostico.tipo),
      xC + columnas[2].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );
    xC += columnas[2].ancho;

    lienzo.doc.text(
      formatearValor(diagnostico.condicion),
      xC + columnas[3].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );
    xC += columnas[3].ancho;

    lienzo.doc.text(
      formatearValor(diagnostico.estado),
      xC + columnas[4].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );

    lienzo.posicionVertical += altoFila;
    indexFila++;
  }

  lienzo.posicionVertical += 2;
}
