import {
  COLOR_ALERTA_TEXTO,
  COLOR_BORDE_MEDIO,
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_PRIMARIO,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CUERPO,
  COLOR_TEXTO_MUTED,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import { convertirTexto, formatearValor } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';

export function dibujarEvaluacion(
  lienzo: PdfLienzoEvolucion,
  evaluacion: Record<string, unknown> | undefined,
  evolucionLibre: string | undefined,
): void {
  if (evaluacion) {
    lienzo.dibujarTituloSeccion('ESTADO GENERAL Y PRONÓSTICO MÉDICO');

    lienzo.asegurarEspacio(14);

    lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
    lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    lienzo.doc.setLineWidth(0.18);
    lienzo.doc.roundedRect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      lienzo.anchoContenido,
      6.5,
      0.8,
      0.8,
      'FD',
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.2);
    lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    lienzo.doc.text(
      'ESTADO CLÍNICO:',
      lienzo.margenIzquierdo + 3,
      lienzo.posicionVertical + 4.2,
    );

    const estadoTexto = formatearValor(evaluacion.estadoClinico);
    const pronosticoTexto = formatearValor(evaluacion.pronostico);
    const esEstadoAlerta =
      /grave|crítico|critico|delicado|desfavorable|malo|reservado/i.test(
        estadoTexto,
      );
    const esPronosticoAlerta = /malo|grave|desfavorable|reservado/i.test(
      pronosticoTexto,
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(6.5);
    lienzo.doc.setTextColor(
      ...(esEstadoAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_TITULO),
    );
    lienzo.doc.text(
      estadoTexto,
      lienzo.margenIzquierdo + 28,
      lienzo.posicionVertical + 4.2,
    );

    const mitadAncho = lienzo.anchoContenido / 2;
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.2);
    lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    lienzo.doc.text(
      'PRONÓSTICO MÉDICO:',
      lienzo.margenIzquierdo + mitadAncho + 3,
      lienzo.posicionVertical + 4.2,
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(6.5);
    lienzo.doc.setTextColor(
      ...(esPronosticoAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_TITULO),
    );
    lienzo.doc.text(
      pronosticoTexto,
      lienzo.margenIzquierdo + mitadAncho + 35,
      lienzo.posicionVertical + 4.2,
    );

    lienzo.posicionVertical += 7.5;

    const planTrabajo = convertirTexto(evaluacion.planTrabajo);
    if (planTrabajo) {
      lienzo.doc.setFont('helvetica', 'normal');
      lienzo.doc.setFontSize(6.2);
      const lineasPlan = lienzo.doc.splitTextToSize(
        planTrabajo,
        lienzo.anchoContenido - 6,
      );
      const altoPlan = Math.max(7, lineasPlan.length * 3.5 + 5);

      lienzo.asegurarEspacio(altoPlan);

      lienzo.doc.setFillColor(...COLOR_FONDO_GRIS);
      lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      lienzo.doc.setLineWidth(0.18);
      lienzo.doc.roundedRect(
        lienzo.margenIzquierdo,
        lienzo.posicionVertical,
        lienzo.anchoContenido,
        altoPlan,
        0.8,
        0.8,
        'FD',
      );

      lienzo.doc.setFont('helvetica', 'bold');
      lienzo.doc.setFontSize(5.2);
      lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
      lienzo.doc.text(
        'PLAN DE TRABAJO:',
        lienzo.margenIzquierdo + 3,
        lienzo.posicionVertical + 3.8,
      );

      lienzo.doc.setFont('helvetica', 'normal');
      lienzo.doc.setFontSize(6.2);
      lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      lienzo.doc.text(
        lineasPlan,
        lienzo.margenIzquierdo + 3,
        lienzo.posicionVertical + 7.2,
      );

      lienzo.posicionVertical += altoPlan + 2;
    }
  }

  const textoEvolucion = convertirTexto(evolucionLibre);
  if (textoEvolucion) {
    lienzo.dibujarTituloSeccion(
      'EVOLUCIÓN CLÍNICA DETALLADA / NOTA MÉDICA (SOAP)',
    );

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.5);
    const lineasEvolucion = lienzo.doc.splitTextToSize(
      textoEvolucion,
      lienzo.anchoContenido - 8,
    );
    const altoEvolucion = Math.max(9, lineasEvolucion.length * 3.6 + 5);

    lienzo.asegurarEspacio(altoEvolucion);

    lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
    lienzo.doc.setDrawColor(...COLOR_BORDE_MEDIO);
    lienzo.doc.setLineWidth(0.2);
    lienzo.doc.roundedRect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      lienzo.anchoContenido,
      altoEvolucion,
      1,
      1,
      'FD',
    );

    lienzo.doc.setFillColor(...COLOR_PRIMARIO);
    lienzo.doc.rect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      2.5,
      altoEvolucion,
      'F',
    );

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.5);
    lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
    lienzo.doc.text(
      lineasEvolucion,
      lienzo.margenIzquierdo + 5,
      lienzo.posicionVertical + 4.8,
    );

    lienzo.posicionVertical += altoEvolucion + 2.5;
  }
}
