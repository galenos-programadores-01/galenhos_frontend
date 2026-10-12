import {
  COLOR_ALERTA_BORDE,
  COLOR_ALERTA_FONDO,
  COLOR_ALERTA_TEXTO,
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_FONDO_HEADER,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CUERPO,
  COLOR_TEXTO_MUTED,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import { convertirTexto } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';

function extraerListaSintomas(
  subjetivo: Record<string, unknown> | undefined,
  sintomas: string[] | undefined,
): string[] {
  const catalogoSintomas: [string, string][] = [
    ['dolor', 'Dolor'],
    ['fiebre', 'Fiebre'],
    ['tos', 'Tos'],
    ['nauseas', 'Náuseas'],
    ['vomitos', 'Vómitos'],
    ['mareos', 'Mareos'],
    ['disnea', 'Disnea'],
  ];

  const sintomasDetectados = subjetivo
    ? catalogoSintomas
        .filter(([clave]) => Boolean(subjetivo[clave]))
        .map(([, etiqueta]) => etiqueta)
    : [];

  return Array.from(new Set([...sintomasDetectados, ...(sintomas || [])]));
}

function dibujarBadgeDolor(
  lienzo: PdfLienzoEvolucion,
  altoSintomas: number,
  anchoBadge: number,
  tieneDolorActivo: boolean,
  evaTexto: string,
): void {
  const x = lienzo.anchoPagina - lienzo.margenDerecho - anchoBadge - 2;
  const y = lienzo.posicionVertical + (altoSintomas - 5.4) / 2;

  if (tieneDolorActivo) {
    lienzo.doc.setFillColor(...COLOR_ALERTA_FONDO);
    lienzo.doc.setDrawColor(...COLOR_ALERTA_BORDE);
    lienzo.doc.setLineWidth(0.2);
    lienzo.doc.roundedRect(x, y, anchoBadge, 5.4, 1, 1, 'FD');
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.8);
    lienzo.doc.setTextColor(...COLOR_ALERTA_TEXTO);
  } else {
    lienzo.doc.setFillColor(...COLOR_FONDO_HEADER);
    lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    lienzo.doc.setLineWidth(0.18);
    lienzo.doc.roundedRect(x, y, anchoBadge, 5.4, 1, 1, 'FD');
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.8);
    lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
  }

  lienzo.doc.text(evaTexto, x + anchoBadge / 2, y + 3.8, { align: 'center' });
}

function dibujarTarjetaSintomas(
  lienzo: PdfLienzoEvolucion,
  listaSintomas: string[],
  escalaDolor: unknown,
): void {
  const tieneDolor =
    escalaDolor !== undefined && escalaDolor !== null && escalaDolor !== '';

  if (listaSintomas.length === 0 && !tieneDolor) return;

  const valorDolor = Number(escalaDolor);
  const tieneDolorActivo = !Number.isNaN(valorDolor) && valorDolor > 0;
  const evaTexto = `EVA DOLOR: ${escalaDolor} / 10`;

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(5.8);
  const anchoTextoEva = lienzo.doc.getTextWidth(evaTexto);
  const anchoBadge = tieneDolor ? Math.max(34, anchoTextoEva + 8) : 0;

  const anchoMaxSintomas = tieneDolor
    ? lienzo.anchoContenido - anchoBadge - 10
    : lienzo.anchoContenido - 42;

  lienzo.doc.setFont('helvetica', 'normal');
  lienzo.doc.setFontSize(6.2);
  const textoSintomas =
    listaSintomas.length > 0
      ? listaSintomas.join('  •  ')
      : 'No especifica síntomas agudos';
  const lineasSintomas = lienzo.doc.splitTextToSize(
    textoSintomas,
    anchoMaxSintomas,
  );
  const altoSintomas = Math.max(7.2, lineasSintomas.length * 3.4 + 3.8);

  lienzo.asegurarEspacio(altoSintomas + 2);

  lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
  lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
  lienzo.doc.setLineWidth(0.18);
  lienzo.doc.roundedRect(
    lienzo.margenIzquierdo,
    lienzo.posicionVertical,
    lienzo.anchoContenido,
    altoSintomas,
    0.8,
    0.8,
    'FD',
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(5.2);
  lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
  lienzo.doc.text(
    'SÍNTOMAS PRINCIPALES:',
    lienzo.margenIzquierdo + 3,
    lienzo.posicionVertical + 4.5,
  );

  lienzo.doc.setFont('helvetica', 'normal');
  lienzo.doc.setFontSize(6.2);
  lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
  lienzo.doc.text(
    lineasSintomas,
    lienzo.margenIzquierdo + 38,
    lienzo.posicionVertical + 4.5,
  );

  if (tieneDolor) {
    dibujarBadgeDolor(
      lienzo,
      altoSintomas,
      anchoBadge,
      tieneDolorActivo,
      evaTexto,
    );
  }

  lienzo.posicionVertical += altoSintomas + 2;
}

function dibujarTarjetaRelato(
  lienzo: PdfLienzoEvolucion,
  relatoCronologico: string,
): void {
  lienzo.doc.setFont('helvetica', 'normal');
  lienzo.doc.setFontSize(6.2);
  const lineasRelato = lienzo.doc.splitTextToSize(
    relatoCronologico,
    lienzo.anchoContenido - 6,
  );
  const altoRelato = Math.max(7, lineasRelato.length * 3.5 + 5);

  lienzo.asegurarEspacio(altoRelato);

  lienzo.doc.setFillColor(...COLOR_FONDO_GRIS);
  lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
  lienzo.doc.setLineWidth(0.18);
  lienzo.doc.roundedRect(
    lienzo.margenIzquierdo,
    lienzo.posicionVertical,
    lienzo.anchoContenido,
    altoRelato,
    0.8,
    0.8,
    'FD',
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(5.2);
  lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
  lienzo.doc.text(
    'RELATO CRONOLÓGICO:',
    lienzo.margenIzquierdo + 3,
    lienzo.posicionVertical + 3.8,
  );

  lienzo.doc.setFont('helvetica', 'normal');
  lienzo.doc.setFontSize(6.2);
  lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
  lienzo.doc.text(
    lineasRelato,
    lienzo.margenIzquierdo + 3,
    lienzo.posicionVertical + 7.2,
  );

  lienzo.posicionVertical += altoRelato + 2;
}

export function dibujarSubjetivo(
  lienzo: PdfLienzoEvolucion,
  subjetivo: Record<string, unknown> | undefined,
  sintomas: string[] | undefined,
): void {
  if (!subjetivo && (!sintomas || sintomas.length === 0)) return;

  lienzo.dibujarTituloSeccion('ANAMNESIS Y SUBJETIVO (S)', 'SÍNTOMAS Y RELATO');

  const listaSintomas = extraerListaSintomas(subjetivo, sintomas);
  dibujarTarjetaSintomas(lienzo, listaSintomas, subjetivo?.escalaDolor);

  const relatoCronologico = convertirTexto(subjetivo?.evolucionSintomas);
  if (relatoCronologico) {
    dibujarTarjetaRelato(lienzo, relatoCronologico);
  }
}
