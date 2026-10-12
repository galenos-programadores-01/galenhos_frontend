import {
  COLOR_ALERTA_BORDE,
  COLOR_ALERTA_FONDO,
  COLOR_ALERTA_TEXTO,
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CUERPO,
  COLOR_TEXTO_MUTED,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import { convertirTexto, formatearValor } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';
import type {
  EvolucionPdfData,
  InterconsultaPdfItem,
  PlanEvolucionPdf,
} from '../evolucion-pdf.tipos';

function dibujarFarmacologico(
  lienzo: PdfLienzoEvolucion,
  farmacologico: Record<string, unknown>[] | undefined,
): void {
  if (!Array.isArray(farmacologico) || farmacologico.length === 0) return;

  lienzo.dibujarTituloSeccion(
    'TRATAMIENTO FARMACOLÓGICO / RECETA MÉDICA (PLAN - P)',
    '℞ PRESCRIPCIÓN OFICIAL',
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
    { titulo: 'MEDICAMENTO / FÁRMACO', ancho: 67, align: 'left' as const },
    { titulo: 'DOSIS', ancho: 25, align: 'center' as const },
    { titulo: 'VÍA', ancho: 22, align: 'center' as const },
    { titulo: 'FRECUENCIA', ancho: 24, align: 'center' as const },
    { titulo: 'DURACIÓN', ancho: 22, align: 'center' as const },
    { titulo: 'CANTIDAD', ancho: 22, align: 'center' as const },
  ];

  let xH = lienzo.margenIzquierdo;
  for (const col of columnas) {
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.2);
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
  for (const item of farmacologico) {
    const nombreMed = convertirTexto(item?.medicamento);
    if (!nombreMed) continue;

    const valorDosis = convertirTexto(item?.dosis);
    const valorUnidad = convertirTexto(item?.unidad);
    const dosisMed = valorDosis ? `${valorDosis} ${valorUnidad}`.trim() : '—';
    const viaMed = formatearValor(item?.via);
    const frecMed = formatearValor(item?.frecuencia);
    const durMed = formatearValor(item?.duracion);
    const cantMed = formatearValor(item?.cantidad);

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(6.2);
    const lineasMed = lienzo.doc.splitTextToSize(nombreMed, 62);
    const altoFila = Math.max(6.2, lineasMed.length * 3.4 + 2.8);

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
    lienzo.doc.setFontSize(6.2);
    lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
    lienzo.doc.text(lineasMed, xC + 3, lienzo.posicionVertical + 4);
    xC += columnas[0].ancho;

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(5.8);
    lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);

    lienzo.doc.text(
      dosisMed,
      xC + columnas[1].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );
    xC += columnas[1].ancho;

    lienzo.doc.text(
      viaMed,
      xC + columnas[2].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );
    xC += columnas[2].ancho;

    lienzo.doc.text(
      frecMed,
      xC + columnas[3].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );
    xC += columnas[3].ancho;

    lienzo.doc.text(
      durMed,
      xC + columnas[4].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );
    xC += columnas[4].ancho;

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    lienzo.doc.text(
      cantMed,
      xC + columnas[5].ancho / 2,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { align: 'center' },
    );

    lienzo.posicionVertical += altoFila;
    indexFila++;
  }

  lienzo.posicionVertical += 2;
}

function dibujarExamenesSolicitados(
  lienzo: PdfLienzoEvolucion,
  solicitudExamenes: PlanEvolucionPdf['solicitudExamenes'],
): void {
  if (!Array.isArray(solicitudExamenes) || solicitudExamenes.length === 0) {
    return;
  }

  lienzo.dibujarTituloSeccion('EXÁMENES AUXILIARES Y PRUEBAS DIAGNÓSTICAS');

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
    { titulo: 'TIPO DE EXAMEN', ancho: 42, align: 'left' as const },
    {
      titulo: 'EXAMEN / PRUEBA SOLICITADA',
      ancho: 70,
      align: 'left' as const,
    },
    { titulo: 'INDICACIÓN CLÍNICA', ancho: 46, align: 'left' as const },
    { titulo: 'PRIORIDAD', ancho: 24, align: 'center' as const },
  ];

  let xH = lienzo.margenIzquierdo;
  for (const col of columnas) {
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.2);
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
  for (const ex of solicitudExamenes) {
    const nombreExamen = formatearValor(ex?.examen);
    const tipoExamen = formatearValor(ex?.tipo);
    const indicacion = formatearValor(ex?.indicacion);
    const prioridad = formatearValor(ex?.prioridad);

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    const lineasEx = lienzo.doc.splitTextToSize(nombreExamen, 66);
    const altoFila = Math.max(6.2, lineasEx.length * 3.4 + 2.8);

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
    lienzo.doc.setFontSize(5.8);
    lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
    lienzo.doc.text(
      tipoExamen,
      xC + 3,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
    );
    xC += columnas[0].ancho;

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(6.2);
    lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
    lienzo.doc.text(lineasEx, xC + 3, lienzo.posicionVertical + 4);
    xC += columnas[1].ancho;

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(5.8);
    lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
    lienzo.doc.text(
      indicacion,
      xC + 3,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      {
        maxWidth: 42,
      },
    );
    xC += columnas[2].ancho;

    const esUrgente =
      prioridad.toUpperCase().includes('URG') ||
      prioridad.toUpperCase().includes('EMERG');

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.5);
    if (esUrgente) {
      lienzo.doc.setFillColor(...COLOR_ALERTA_FONDO);
      lienzo.doc.setDrawColor(...COLOR_ALERTA_BORDE);
      lienzo.doc.setLineWidth(0.18);
      lienzo.doc.roundedRect(
        xC + 2,
        lienzo.posicionVertical + (altoFila - 4.6) / 2,
        columnas[3].ancho - 4,
        4.6,
        0.8,
        0.8,
        'FD',
      );
      lienzo.doc.setTextColor(...COLOR_ALERTA_TEXTO);
      lienzo.doc.text(
        prioridad,
        xC + columnas[3].ancho / 2,
        lienzo.posicionVertical + (altoFila - 4.6) / 2 + 3.3,
        { align: 'center' },
      );
    } else {
      lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
      lienzo.doc.text(
        prioridad,
        xC + columnas[3].ancho / 2,
        lienzo.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
    }

    lienzo.posicionVertical += altoFila;
    indexFila++;
  }

  lienzo.posicionVertical += 2;
}

function dibujarInterconsultas(
  lienzo: PdfLienzoEvolucion,
  interconsultas: InterconsultaPdfItem[] | null | undefined,
): void {
  if (!interconsultas || interconsultas.length === 0) return;

  lienzo.dibujarTituloSeccion('INTERCONSULTAS MÉDICAS SOLICITADAS');

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
    { titulo: 'ESPECIALIDAD DESTINO', ancho: 55, align: 'left' as const },
    {
      titulo: 'MOTIVO CLÍNICO DE INTERCONSULTA',
      ancho: 97,
      align: 'left' as const,
    },
    { titulo: 'ESTADO', ancho: 30, align: 'center' as const },
  ];

  let xH = lienzo.margenIzquierdo;
  for (const col of columnas) {
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.2);
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
  for (const ic of interconsultas) {
    let especialidad = convertirTexto(ic?.especialidad);
    if (!especialidad && ic?.IdEspecialidad) {
      especialidad = `Especialidad #${ic.IdEspecialidad}`;
    }
    const motivo = formatearValor(ic?.motivo);
    const estado = formatearValor(ic?.estado || 'Pendiente');

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    const lineasMotivo = lienzo.doc.splitTextToSize(motivo, 92);
    const altoFila = Math.max(6.2, lineasMotivo.length * 3.4 + 2.8);

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
    lienzo.doc.setFontSize(6.2);
    lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
    lienzo.doc.text(
      formatearValor(especialidad),
      xC + 3,
      lienzo.posicionVertical + altoFila / 2 + 0.8,
      { maxWidth: 50 },
    );
    xC += columnas[0].ancho;

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
    lienzo.doc.text(lineasMotivo, xC + 3, lienzo.posicionVertical + 4);
    xC += columnas[1].ancho;

    const esUrgente =
      estado.toUpperCase().includes('URG') ||
      motivo.toUpperCase().includes('URG') ||
      estado.toUpperCase().includes('EMERG');

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5.8);
    if (esUrgente) {
      lienzo.doc.setFillColor(...COLOR_ALERTA_FONDO);
      lienzo.doc.setDrawColor(...COLOR_ALERTA_BORDE);
      lienzo.doc.setLineWidth(0.18);
      lienzo.doc.roundedRect(
        xC + 2,
        lienzo.posicionVertical + (altoFila - 4.6) / 2,
        columnas[2].ancho - 4,
        4.6,
        0.8,
        0.8,
        'FD',
      );
      lienzo.doc.setTextColor(...COLOR_ALERTA_TEXTO);
      lienzo.doc.text(
        estado,
        xC + columnas[2].ancho / 2,
        lienzo.posicionVertical + (altoFila - 4.6) / 2 + 3.3,
        { align: 'center' },
      );
    } else {
      lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
      lienzo.doc.text(
        estado,
        xC + columnas[2].ancho / 2,
        lienzo.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
    }

    lienzo.posicionVertical += altoFila;
    indexFila++;
  }

  lienzo.posicionVertical += 2;
}

function dibujarIndicacionesGenerales(
  lienzo: PdfLienzoEvolucion,
  indicaciones: Record<string, unknown> | undefined,
): void {
  if (!indicaciones) return;

  const items: [string, string][] = [];

  const dieta = convertirTexto(indicaciones.dieta);
  if (dieta) items.push(['DIETA INDICADA', dieta]);

  const reposo = convertirTexto(indicaciones.reposo);
  if (reposo) items.push(['RÉGIMEN DE REPOSO', reposo]);

  const hidratacion = convertirTexto(indicaciones.hidratacion);
  if (hidratacion) items.push(['HIDRATACIÓN Y FLUIDOTERAPIA', hidratacion]);

  const oxigeno = convertirTexto(indicaciones.oxigeno);
  if (oxigeno) items.push(['OXIGENOTERAPIA', oxigeno]);

  const restricciones = convertirTexto(indicaciones.restricciones);
  if (restricciones) items.push(['RESTRICCIONES / CUIDADOS', restricciones]);

  if (items.length > 0) {
    lienzo.dibujarTituloSeccion(
      'INDICACIONES GENERALES Y CUIDADOS DE ENFERMERÍA',
    );

    for (const [etiqueta, valor] of items) {
      lienzo.doc.setFont('helvetica', 'normal');
      lienzo.doc.setFontSize(6.2);
      const lineasValor = lienzo.doc.splitTextToSize(
        valor,
        lienzo.anchoContenido - 55,
      );
      const altoFila = Math.max(6.2, lineasValor.length * 3.4 + 2.8);

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
        50,
        altoFila,
        0.8,
        0.8,
        'F',
      );

      lienzo.doc.setFont('helvetica', 'bold');
      lienzo.doc.setFontSize(5.2);
      lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
      lienzo.doc.text(
        etiqueta,
        lienzo.margenIzquierdo + 3,
        lienzo.posicionVertical + altoFila / 2 + 0.8,
      );

      lienzo.doc.setFont('helvetica', 'normal');
      lienzo.doc.setFontSize(6.2);
      lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      lienzo.doc.text(
        lineasValor,
        lienzo.margenIzquierdo + 53,
        lienzo.posicionVertical + 4,
      );

      lienzo.posicionVertical += altoFila + 1.2;
    }
  }
}

function dibujarOrdenesMedicas(
  lienzo: PdfLienzoEvolucion,
  ordenes: Record<string, unknown> | undefined,
): void {
  if (!ordenes) return;

  const tipoOrden = convertirTexto(ordenes.orden);
  const detalleOrden = convertirTexto(ordenes.detalle);

  if (!tipoOrden && !detalleOrden) return;

  let etiquetaTipo = tipoOrden;
  const tipoMinuscula = tipoOrden.toLowerCase();
  if (tipoMinuscula === 'alta') etiquetaTipo = 'Alta médica definitiva';
  else if (tipoMinuscula === 'hospitalizacion')
    etiquetaTipo = 'Ingreso / Continuación de hospitalización';
  else if (tipoMinuscula === 'observacion')
    etiquetaTipo = 'Permanencia en sala de observación';
  else if (tipoMinuscula === 'traslado')
    etiquetaTipo = 'Traslado o referencia a otro establecimiento';

  lienzo.dibujarTituloSeccion('DESTINO DEL PACIENTE Y ÓRDENES MÉDICAS');

  lienzo.asegurarEspacio(detalleOrden ? 15 : 7.5);

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
    'DESTINO DEFINIDO:',
    lienzo.margenIzquierdo + 3,
    lienzo.posicionVertical + 4.2,
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(6.8);
  lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
  lienzo.doc.text(
    etiquetaTipo || '—',
    lienzo.margenIzquierdo + 36,
    lienzo.posicionVertical + 4.2,
  );

  lienzo.posicionVertical += 7.5;

  if (detalleOrden) {
    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(6.2);
    const lineasDetalle = lienzo.doc.splitTextToSize(
      detalleOrden,
      lienzo.anchoContenido - 6,
    );
    const altoDetalle = Math.max(7, lineasDetalle.length * 3.5 + 4);

    lienzo.asegurarEspacio(altoDetalle);

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

export function dibujarPlanTratamiento(
  lienzo: PdfLienzoEvolucion,
  plan: EvolucionPdfData['plan'],
  interconsultas: InterconsultaPdfItem[] | null | undefined,
  ordenesMedicas?: Record<string, unknown>,
): void {
  dibujarFarmacologico(lienzo, plan?.farmacologico);
  dibujarExamenesSolicitados(lienzo, plan?.solicitudExamenes);

  const interconsultasPdf =
    interconsultas ||
    (Array.isArray(plan?.interconsultas)
      ? (plan?.interconsultas as InterconsultaPdfItem[])
      : null);

  dibujarInterconsultas(lienzo, interconsultasPdf);
  dibujarIndicacionesGenerales(lienzo, plan?.indicacionesGenerales);
  dibujarOrdenesMedicas(lienzo, ordenesMedicas);
}
