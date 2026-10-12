import {
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_MUTED,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import { formatearValor } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';
import type { DatosInstitucion } from '../evolucion-pdf.tipos';

export function dibujarEncabezadoInstitucion(
  lienzo: PdfLienzoEvolucion,
  institucion: DatosInstitucion | null,
): void {
  lienzo.dibujarBandaSuperior();
  lienzo.posicionVertical = 7;

  const tieneLogoMinsa = Boolean(institucion?.logoMinsa);
  if (tieneLogoMinsa && institucion?.logoMinsa) {
    try {
      lienzo.doc.addImage(
        `data:image/png;base64,${institucion.logoMinsa}`,
        'PNG',
        lienzo.margenIzquierdo,
        lienzo.posicionVertical + 1,
        18,
        18,
      );
    } catch {
      /* Continuar sin logo */
    }
  }

  const tieneLogoHospi = Boolean(institucion?.logoHospi);
  if (tieneLogoHospi && institucion?.logoHospi) {
    try {
      lienzo.doc.addImage(
        `data:image/png;base64,${institucion.logoHospi}`,
        'PNG',
        lienzo.anchoPagina - lienzo.margenDerecho - 18,
        lienzo.posicionVertical + 1,
        18,
        18,
      );
    } catch {
      /* Continuar sin logo */
    }
  }

  const posXCentro = lienzo.anchoPagina / 2;

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(5.8);
  lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
  lienzo.doc.text(
    'GOBIERNO DEL PERÚ  •  MINISTERIO DE SALUD',
    posXCentro,
    lienzo.posicionVertical + 3.5,
    { align: 'center' },
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(11);
  lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
  lienzo.doc.text(
    'HOSPITAL NACIONAL SERGIO E. BERNALES',
    posXCentro,
    lienzo.posicionVertical + 8.5,
    { align: 'center' },
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(6.2);
  lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
  lienzo.doc.text(
    'COMPLEJO HOSPITALARIO DE ALTA COMPLEJIDAD — LIMA NORTE',
    posXCentro,
    lienzo.posicionVertical + 12.2,
    { align: 'center' },
  );

  const anchoBannerDoc = 110;
  const altoBannerDoc = 5;
  const xBannerDoc = posXCentro - anchoBannerDoc / 2;
  const yBannerDoc = lienzo.posicionVertical + 14.5;

  lienzo.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
  lienzo.doc.roundedRect(
    xBannerDoc,
    yBannerDoc,
    anchoBannerDoc,
    altoBannerDoc,
    1,
    1,
    'F',
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(7);
  lienzo.doc.setTextColor(...COLOR_FONDO_BLANCO);
  lienzo.doc.text(
    'HISTORIA CLÍNICA ELECTRÓNICA — EVOLUCIÓN MÉDICA (SOAP)',
    posXCentro,
    yBannerDoc + 3.6,
    { align: 'center' },
  );

  const datosContacto = [
    `RUC: ${formatearValor(institucion?.rucEess || '20154876123')}`,
    formatearValor(institucion?.direccion || 'Av. Túpac Amaru 8000, Comas'),
    `Telf: ${formatearValor(institucion?.telefono || '(01) 558-0186')}`,
  ]
    .filter((dato) => dato && dato !== '—')
    .join('   •   ');

  lienzo.doc.setFont('helvetica', 'normal');
  lienzo.doc.setFontSize(5.2);
  lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
  lienzo.doc.text(datosContacto, posXCentro, lienzo.posicionVertical + 22.5, {
    align: 'center',
  });

  lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
  lienzo.doc.setLineWidth(0.2);
  lienzo.doc.line(
    lienzo.margenIzquierdo,
    lienzo.posicionVertical + 25,
    lienzo.anchoPagina - lienzo.margenDerecho,
    lienzo.posicionVertical + 25,
  );

  lienzo.posicionVertical += 27;
}
