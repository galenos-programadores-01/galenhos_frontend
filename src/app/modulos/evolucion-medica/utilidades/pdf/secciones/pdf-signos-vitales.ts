import {
  COLOR_ALERTA_BORDE,
  COLOR_ALERTA_FONDO,
  COLOR_ALERTA_TEXTO,
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_TEXTO_CLARO,
  COLOR_TEXTO_MUTED,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import { esSignoVitalAlerta, formatearValor } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';

export function dibujarSignosVitales(
  lienzo: PdfLienzoEvolucion,
  signosVitales: Record<string, unknown> | undefined,
): void {
  if (!signosVitales) return;

  lienzo.dibujarTituloSeccion(
    'SIGNOS VITALES Y ANTROPOMETRÍA',
    'PARÁMETROS REGISTRADOS',
  );

  const listaSignos = [
    {
      etiqueta: 'P. ARTERIAL',
      valor: formatearValor(signosVitales.presionArterial),
      unidad: 'mmHg',
    },
    {
      etiqueta: 'F. CARDÍACA',
      valor: formatearValor(signosVitales.frecuenciaCardiaca),
      unidad: 'lpm',
    },
    {
      etiqueta: 'F. RESPIRATORIA',
      valor: formatearValor(signosVitales.frecuenciaRespiratoria),
      unidad: 'rpm',
    },
    {
      etiqueta: 'TEMPERATURA',
      valor: formatearValor(signosVitales.temperatura),
      unidad: '°C',
    },
    {
      etiqueta: 'SATURACIÓN O₂',
      valor: formatearValor(signosVitales.saturacionOxigeno),
      unidad: '%',
    },
    {
      etiqueta: 'PESO',
      valor: formatearValor(signosVitales.peso),
      unidad: 'kg',
    },
    {
      etiqueta: 'TALLA',
      valor: formatearValor(signosVitales.talla),
      unidad: 'cm',
    },
    {
      etiqueta: 'IMC',
      valor: formatearValor(signosVitales.imc),
      unidad: 'kg/m²',
    },
  ];

  const totalTarjetas = listaSignos.length;
  const espaciado = 1.6;
  const anchoTarjeta =
    (lienzo.anchoContenido - (totalTarjetas - 1) * espaciado) / totalTarjetas;
  const altoTarjeta = 13.5;

  lienzo.asegurarEspacio(altoTarjeta + 2);

  let x = lienzo.margenIzquierdo;
  for (const item of listaSignos) {
    const tieneAlerta = esSignoVitalAlerta(item.etiqueta, item.valor);

    lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
    lienzo.doc.setDrawColor(
      ...(tieneAlerta ? COLOR_ALERTA_BORDE : COLOR_BORDE_SUAVE),
    );
    lienzo.doc.setLineWidth(tieneAlerta ? 0.22 : 0.2);
    lienzo.doc.roundedRect(
      x,
      lienzo.posicionVertical,
      anchoTarjeta,
      altoTarjeta,
      1,
      1,
      'FD',
    );

    lienzo.doc.setFillColor(
      ...(tieneAlerta ? COLOR_ALERTA_FONDO : COLOR_FONDO_GRIS),
    );
    lienzo.doc.roundedRect(
      x,
      lienzo.posicionVertical,
      anchoTarjeta,
      4.2,
      1,
      1,
      'F',
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(4.8);
    lienzo.doc.setTextColor(
      ...(tieneAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_MUTED),
    );
    lienzo.doc.text(
      item.etiqueta,
      x + anchoTarjeta / 2,
      lienzo.posicionVertical + 3,
      { align: 'center' },
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(8);
    lienzo.doc.setTextColor(
      ...(tieneAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_TITULO),
    );
    lienzo.doc.text(
      item.valor,
      x + anchoTarjeta / 2,
      lienzo.posicionVertical + 8.8,
      { align: 'center' },
    );

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(4.8);
    lienzo.doc.setTextColor(
      ...(tieneAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_CLARO),
    );
    lienzo.doc.text(
      item.unidad,
      x + anchoTarjeta / 2,
      lienzo.posicionVertical + 11.8,
      { align: 'center' },
    );

    x += anchoTarjeta + espaciado;
  }

  lienzo.posicionVertical += altoTarjeta + 2;

  const glucemiaValor = signosVitales.glucemia;
  if (glucemiaValor) {
    lienzo.asegurarEspacio(8);
    lienzo.doc.setFillColor(...COLOR_ALERTA_FONDO);
    lienzo.doc.setDrawColor(...COLOR_ALERTA_BORDE);
    lienzo.doc.setLineWidth(0.2);
    lienzo.doc.roundedRect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      lienzo.anchoContenido,
      5.8,
      1,
      1,
      'FD',
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(6.2);
    lienzo.doc.setTextColor(...COLOR_ALERTA_TEXTO);
    lienzo.doc.text(
      `GLICEMIA CAPILAR: ${formatearValor(glucemiaValor)} mg/dL`,
      lienzo.margenIzquierdo + 4,
      lienzo.posicionVertical + 4.1,
    );

    lienzo.posicionVertical += 7.8;
  }
}
