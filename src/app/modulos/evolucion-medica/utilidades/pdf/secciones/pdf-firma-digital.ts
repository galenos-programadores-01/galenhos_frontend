import {
  COLOR_FONDO_BLANCO,
  COLOR_PRIMARIO,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CLARO,
  COLOR_TEXTO_MUTED,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';
import type {
  DatosInstitucion,
  EvolucionPdfData,
} from '../evolucion-pdf.tipos';

export function dibujarFirmaDigital(
  lienzo: PdfLienzoEvolucion,
  cabecera: EvolucionPdfData['cabecera'],
  institucion: DatosInstitucion | null,
  nombreUsuario: string,
  fechaImpresion: string,
): void {
  const altoFirma = 30;
  const anchoFirma = 102;
  lienzo.asegurarEspacio(altoFirma + 6);
  lienzo.posicionVertical += 4;

  const posXFirma = lienzo.anchoPagina - lienzo.margenDerecho - anchoFirma;
  const posYFirma = lienzo.posicionVertical;

  lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
  lienzo.doc.setDrawColor(...COLOR_PRIMARIO);
  lienzo.doc.setLineWidth(0.28);
  lienzo.doc.roundedRect(
    posXFirma,
    posYFirma,
    anchoFirma,
    altoFirma,
    1.5,
    1.5,
    'FD',
  );

  lienzo.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
  lienzo.doc.rect(posXFirma, posYFirma, 3, altoFirma, 'F');

  const logoFirma = institucion?.logoHospi || institucion?.logoMinsa;
  if (logoFirma) {
    try {
      lienzo.doc.addImage(
        `data:image/png;base64,${logoFirma}`,
        'PNG',
        posXFirma + 5.5,
        posYFirma + 5,
        20,
        20,
      );
    } catch {
      /* Continuar sin logo */
    }
  }

  const posXTexto = posXFirma + (logoFirma ? 29 : 6);
  const maxAnchoTexto = anchoFirma - (logoFirma ? 32 : 9);

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(6.2);
  lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
  lienzo.doc.text('DOCUMENTO FIRMADO DIGITALMENTE', posXTexto, posYFirma + 4.5);

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(7.5);
  lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
  const nombreMedico = (
    cabecera.medicoTratante ||
    nombreUsuario ||
    'MÉDICO TRATANTE'
  ).toUpperCase();
  lienzo.doc.text(nombreMedico, posXTexto, posYFirma + 8.8, {
    maxWidth: maxAnchoTexto,
  });

  lienzo.doc.setFont('helvetica', 'normal');
  lienzo.doc.setFontSize(5.5);
  lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);

  let offsetFirma = 12.5;
  if (cabecera.dni) {
    lienzo.doc.text(`DNI: ${cabecera.dni}`, posXTexto, posYFirma + offsetFirma);
    offsetFirma += 3.2;
  }

  const fechaTexto = cabecera.fecha
    ? `${cabecera.fecha} ${cabecera.hora || ''} (UTC-5)`.trim()
    : `${fechaImpresion} (UTC-5)`;
  lienzo.doc.text(
    `Fecha y hora de firma: ${fechaTexto}`,
    posXTexto,
    posYFirma + offsetFirma,
  );
  offsetFirma += 3.2;

  const partesCargo: string[] = ['Médico Tratante'];
  if (cabecera.colegiatura) {
    partesCargo.push(`CMP: ${cabecera.colegiatura}`);
  }
  if (cabecera.rne) {
    partesCargo.push(`RNE: ${cabecera.rne}`);
  }
  const cargoTexto = partesCargo.join('  •  ');
  lienzo.doc.text(cargoTexto, posXTexto, posYFirma + offsetFirma, {
    maxWidth: maxAnchoTexto,
  });
  offsetFirma += 3.2;

  lienzo.doc.setFont('helvetica', 'italic');
  lienzo.doc.setFontSize(4.6);
  lienzo.doc.setTextColor(...COLOR_TEXTO_CLARO);
  lienzo.doc.text(
    'Validez legal conforme a la Ley N° 27269 sobre Firmas y Certificados Digitales.',
    posXTexto,
    posYFirma + offsetFirma,
    { maxWidth: maxAnchoTexto },
  );

  lienzo.posicionVertical += altoFirma + 3;
}
