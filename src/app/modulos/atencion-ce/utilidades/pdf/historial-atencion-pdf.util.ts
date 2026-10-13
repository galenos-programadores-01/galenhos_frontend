import type { jsPDF } from 'jspdf';
import type {
  AtencionProcedimientoCEItem,
  FichaAtencionCEDetalle,
  HistorialAtencionDetalle,
  HistorialProcedimientoItem,
  HistorialReporteOperatorioItem,
  ItemRecetaPrescripcion,
  OrdenApoyoDiagnosticoItem,
  TriajeConsultaSignosVitales,
} from '../../tipos/atencion-ce.tipos';

const MARGEN_IZQUIERDO = 14;
const MARGEN_DERECHO = 196;
const ANCHO_PAGINA = MARGEN_DERECHO - MARGEN_IZQUIERDO;
const LIMITE_INFERIOR_PAGINA = 268;

function formatearTextoSeguro(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) {
    return 'NO REGISTRADO';
  }
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : 'NO REGISTRADO';
}

function verificarEspacioDisponible(
  documentoPdf: jsPDF,
  posicionVerticalActual: number,
  alturaRequerida: number,
): number {
  if (posicionVerticalActual + alturaRequerida > LIMITE_INFERIOR_PAGINA) {
    documentoPdf.addPage();
    return 20;
  }
  return posicionVerticalActual;
}

function imprimirTextoConSaltoPagina(
  documentoPdf: jsPDF,
  lineasTexto: readonly string[],
  posicionVerticalInicial: number,
  interlineado: number = 4.2,
  margenIzquierdo: number = MARGEN_IZQUIERDO,
): number {
  let posicionActual = posicionVerticalInicial;
  for (const linea of lineasTexto) {
    if (posicionActual + interlineado > LIMITE_INFERIOR_PAGINA) {
      documentoPdf.addPage();
      posicionActual = 20;
    }
    documentoPdf.text(linea, margenIzquierdo, posicionActual);
    posicionActual += interlineado;
  }
  return posicionActual;
}

function imprimirBloqueClinicoConPaginacion(
  documentoPdf: jsPDF,
  tituloSeccion: string,
  contenidoTexto: string | null | undefined,
  posicionVerticalActual: number,
): number {
  if (!contenidoTexto || !contenidoTexto.trim()) {
    return posicionVerticalActual;
  }

  let posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVerticalActual, 14);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(8);
  documentoPdf.setTextColor(30, 41, 59);
  documentoPdf.text(tituloSeccion, MARGEN_IZQUIERDO, posicionVertical);
  posicionVertical += 4.5;

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);

  const lineasSeparadas = documentoPdf.splitTextToSize(contenidoTexto.trim(), ANCHO_PAGINA);
  posicionVertical = imprimirTextoConSaltoPagina(
    documentoPdf,
    lineasSeparadas,
    posicionVertical,
    4.2,
    MARGEN_IZQUIERDO,
  );

  posicionVertical += 4;
  return posicionVertical;
}

function dibujarEncabezadoInstitucional(
  documentoPdf: jsPDF,
  tituloDocumento: string,
  subtituloDocumento: string,
): number {
  let posicionVertical = 16;

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(11);
  documentoPdf.setTextColor(15, 23, 42);
  documentoPdf.text(
    'HOSPITAL NACIONAL SERGIO E. BERNALES',
    MARGEN_IZQUIERDO,
    posicionVertical,
  );

  posicionVertical += 4.5;
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);
  documentoPdf.text(
    'MINISTERIO DE SALUD  •  DIRECCIÓN DE SALUD LIMA NORTE',
    MARGEN_IZQUIERDO,
    posicionVertical,
  );

  posicionVertical += 7;
  documentoPdf.setFillColor(241, 245, 249);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    11,
    1,
    1,
    'F',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(9.5);
  documentoPdf.setTextColor(30, 41, 59);
  documentoPdf.text(
    tituloDocumento.toUpperCase(),
    MARGEN_IZQUIERDO + 3,
    posicionVertical + 5,
  );

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7);
  documentoPdf.setTextColor(100, 116, 139);
  documentoPdf.text(
    subtituloDocumento,
    MARGEN_IZQUIERDO + 3,
    posicionVertical + 9,
  );

  posicionVertical += 15;
  return posicionVertical;
}

function dibujarPiePaginaGlobal(
  documentoPdf: jsPDF,
  pacienteNombre: string,
  historiaClinica: string,
): void {
  const totalPaginas = documentoPdf.getNumberOfPages();

  for (let numeroPagina = 1; numeroPagina <= totalPaginas; numeroPagina++) {
    documentoPdf.setPage(numeroPagina);

    if (numeroPagina > 1) {
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(6.5);
      documentoPdf.setTextColor(148, 163, 184);
      documentoPdf.text(
        `HOSPITAL NACIONAL SERGIO E. BERNALES  •  ${pacienteNombre.toUpperCase()} (HC: ${historiaClinica})`,
        MARGEN_IZQUIERDO,
        10,
      );
      documentoPdf.setDrawColor(226, 232, 240);
      documentoPdf.setLineWidth(0.2);
      documentoPdf.line(MARGEN_IZQUIERDO, 12, MARGEN_DERECHO, 12);
    }

    documentoPdf.setDrawColor(226, 232, 240);
    documentoPdf.setLineWidth(0.2);
    documentoPdf.line(MARGEN_IZQUIERDO, 287, MARGEN_DERECHO, 287);

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(6.5);
    documentoPdf.setTextColor(100, 116, 139);
    documentoPdf.text(
      'Documento Clínico Oficial  •  Sistema GalenHos Pro 2026',
      MARGEN_IZQUIERDO,
      291,
    );
    documentoPdf.text(
      `Página ${numeroPagina} de ${totalPaginas}`,
      MARGEN_DERECHO,
      291,
      { align: 'right' },
    );
  }
}

export async function generarDocumentoPdfHistorialAtencion(
  detalle: HistorialAtencionDetalle,
  tipoServicioTitulo: string,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });

  let posicionVertical = dibujarEncabezadoInstitucional(
    documentoPdf,
    `INFORME CLÍNICO DE ATENCIÓN - ${tipoServicioTitulo}`,
    `CUENTA DE ATENCIÓN: ${detalle.idCuentaAtencion}  •  FECHA: ${detalle.fechaAtencion || 'NO REGISTRADA'}  •  HORA: ${detalle.horaInicio || '--:--'} a ${detalle.horaFin || '--:--'}`,
  );

  documentoPdf.setDrawColor(203, 213, 225);
  documentoPdf.setFillColor(248, 250, 252);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    22,
    1,
    1,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);

  documentoPdf.text('PACIENTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 5);
  documentoPdf.text('HISTORIA CLÍNICA:', MARGEN_IZQUIERDO + 105, posicionVertical + 5);
  documentoPdf.text('DOCUMENTO (DNI):', MARGEN_IZQUIERDO + 148, posicionVertical + 5);

  documentoPdf.text('EDAD / SEXO:', MARGEN_IZQUIERDO + 3, posicionVertical + 11);
  documentoPdf.text('SERVICIO / CONSULTORIO:', MARGEN_IZQUIERDO + 55, posicionVertical + 11);
  documentoPdf.text('MÉDICO TRATANTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 17);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);

  documentoPdf.text(
    formatearTextoSeguro(detalle.pacienteNombre),
    MARGEN_IZQUIERDO + 23,
    posicionVertical + 5,
  );
  documentoPdf.text(
    formatearTextoSeguro(detalle.nroHistoriaClinica),
    MARGEN_IZQUIERDO + 133,
    posicionVertical + 5,
  );
  documentoPdf.text(
    formatearTextoSeguro(detalle.nroDocumento),
    MARGEN_IZQUIERDO + 176,
    posicionVertical + 5,
  );

  const edadTexto = detalle.edad ? `${detalle.edad} Años` : 'NO REGISTRADA';
  const sexoTexto = detalle.sexo || 'NO REGISTRADO';
  documentoPdf.text(
    `${edadTexto}  /  ${sexoTexto}`,
    MARGEN_IZQUIERDO + 24,
    posicionVertical + 11,
  );
  documentoPdf.text(
    formatearTextoSeguro(detalle.servicioNombre),
    MARGEN_IZQUIERDO + 95,
    posicionVertical + 11,
  );
  documentoPdf.text(
    formatearTextoSeguro(detalle.medicoNombre),
    MARGEN_IZQUIERDO + 32,
    posicionVertical + 17,
  );

  posicionVertical += 27;

  if (detalle.triaje) {
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 22);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('CONSTANTES VITALES Y TRIAJE', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 3;

    const anchoColumna = ANCHO_PAGINA / 5;
    const altoFila = 7;

    documentoPdf.setFillColor(241, 245, 249);
    documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, altoFila * 2, 'F');
    documentoPdf.setDrawColor(226, 232, 240);
    documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, altoFila * 2, 'S');

    const listaSignosFilaUno = [
      { etiqueta: 'P. ARTERIAL', valor: detalle.triaje.presionArterial ? `${detalle.triaje.presionArterial} mmHg` : '--' },
      { etiqueta: 'FREC. CARD.', valor: detalle.triaje.frecuenciaCardiaca ? `${detalle.triaje.frecuenciaCardiaca} lpm` : '--' },
      { etiqueta: 'FREC. RESP.', valor: detalle.triaje.frecuenciaRespiratoria ? `${detalle.triaje.frecuenciaRespiratoria} rpm` : '--' },
      { etiqueta: 'TEMPERATURA', valor: detalle.triaje.temperatura ? `${detalle.triaje.temperatura} °C` : '--' },
      { etiqueta: 'SATURACIÓN', valor: detalle.triaje.saturacion ? `${detalle.triaje.saturacion} %` : '--' },
    ];

    const listaSignosFilaDos = [
      { etiqueta: 'PESO', valor: detalle.triaje.peso ? `${detalle.triaje.peso} kg` : '--' },
      { etiqueta: 'TALLA', valor: detalle.triaje.talla ? `${detalle.triaje.talla} cm` : '--' },
      { etiqueta: 'IMC', valor: detalle.triaje.imc ? `${detalle.triaje.imc}` : '--' },
      { etiqueta: 'HEMOGLOBINA', valor: detalle.triaje.hemoglobina ? `${detalle.triaje.hemoglobina} g/dl` : '--' },
      { etiqueta: 'FIO2', valor: detalle.triaje.fiO2 ? `${detalle.triaje.fiO2} %` : '--' },
    ];

    listaSignosFilaUno.forEach((item, indice) => {
      const posicionX = MARGEN_IZQUIERDO + indice * anchoColumna + 2;
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(6);
      documentoPdf.setTextColor(100, 116, 139);
      documentoPdf.text(item.etiqueta, posicionX, posicionVertical + 3);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7);
      documentoPdf.setTextColor(15, 23, 42);
      documentoPdf.text(item.valor, posicionX, posicionVertical + 6);
    });

    listaSignosFilaDos.forEach((item, indice) => {
      const posicionX = MARGEN_IZQUIERDO + indice * anchoColumna + 2;
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(6);
      documentoPdf.setTextColor(100, 116, 139);
      documentoPdf.text(item.etiqueta, posicionX, posicionVertical + altoFila + 3);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7);
      documentoPdf.setTextColor(15, 23, 42);
      documentoPdf.text(item.valor, posicionX, posicionVertical + altoFila + 6);
    });

    posicionVertical += altoFila * 2 + 5;
  }

  const escribirBloqueTexto = (titulo: string, contenido: string | undefined): void => {
    if (!contenido || contenido.trim().length === 0) return;

    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 14);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text(titulo, MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 4.5;

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(51, 65, 85);

    const lineasBloque = documentoPdf.splitTextToSize(contenido.trim(), ANCHO_PAGINA - 4);
    posicionVertical = imprimirTextoConSaltoPagina(
      documentoPdf,
      lineasBloque,
      posicionVertical,
      4,
      MARGEN_IZQUIERDO + 2,
    );
    posicionVertical += 4;
  };

  escribirBloqueTexto('MOTIVO DE CONSULTA / ENFERMEDAD ACTUAL', detalle.motivo);
  escribirBloqueTexto('EXAMEN FÍSICO / CLÍNICO', detalle.examenClinico);
  escribirBloqueTexto('INFORMACIÓN COMPLEMENTARIA', detalle.inforCompDiagMed);

  if (detalle.diagnosticos && detalle.diagnosticos.length > 0) {
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 22);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('DIAGNÓSTICOS (CIE-10)', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 3;

    documentoPdf.setFillColor(226, 232, 240);
    documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 6, 'F');

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.5);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('CÓDIGO', MARGEN_IZQUIERDO + 3, posicionVertical + 4);
    documentoPdf.text('DESCRIPCIÓN DEL DIAGNÓSTICO', MARGEN_IZQUIERDO + 25, posicionVertical + 4);
    documentoPdf.text('TIPO', MARGEN_IZQUIERDO + 130, posicionVertical + 4);
    documentoPdf.text('CONDICIÓN', MARGEN_IZQUIERDO + 160, posicionVertical + 4);
    posicionVertical += 6;

    detalle.diagnosticos.forEach((diagnostico, indice) => {
      posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 6.5);

      if (indice % 2 === 0) {
        documentoPdf.setFillColor(248, 250, 252);
        documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 6, 'F');
      }

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7);
      documentoPdf.setTextColor(15, 23, 42);
      documentoPdf.text(
        formatearTextoSeguro(diagnostico.codigoCIE10),
        MARGEN_IZQUIERDO + 3,
        posicionVertical + 4,
      );

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(7);
      documentoPdf.setTextColor(51, 65, 85);
      const descripcionRecortada = (diagnostico.descripcion || 'SIN DESCRIPCIÓN').substring(0, 75);
      documentoPdf.text(
        descripcionRecortada,
        MARGEN_IZQUIERDO + 25,
        posicionVertical + 4,
      );

      let tipoTexto = 'PRESUNTIVO';
      if (diagnostico.clasificacion === 'D') {
        tipoTexto = 'DEFINITIVO';
      } else if (diagnostico.clasificacion === 'R') {
        tipoTexto = 'REPETIDO';
      }
      documentoPdf.text(tipoTexto, MARGEN_IZQUIERDO + 130, posicionVertical + 4);

      const condicionTexto = indice === 0 ? 'PRINCIPAL' : 'SECUNDARIO';
      documentoPdf.text(condicionTexto, MARGEN_IZQUIERDO + 160, posicionVertical + 4);

      posicionVertical += 6;
    });

    posicionVertical += 4;
  }

  escribirBloqueTexto('PLAN DE TRABAJO Y TRATAMIENTO', detalle.planTratamiento || detalle.tratamiento);
  escribirBloqueTexto('OBSERVACIONES GENERALES', detalle.observaciones);
  escribirBloqueTexto('SERVICIOS DE APOYO AL DIAGNÓSTICO', detalle.servicioApoyoAlDx);
  escribirBloqueTexto('CONSUMO EN SERVICIO', detalle.consumoEnServicio);

  posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 30);
  posicionVertical += 10;

  const posicionCentroFirma = MARGEN_IZQUIERDO + ANCHO_PAGINA - 45;
  documentoPdf.setDrawColor(100, 116, 139);
  documentoPdf.setLineWidth(0.3);
  documentoPdf.line(posicionCentroFirma - 35, posicionVertical, posicionCentroFirma + 35, posicionVertical);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);
  documentoPdf.text(
    formatearTextoSeguro(detalle.medicoNombre).toUpperCase(),
    posicionCentroFirma,
    posicionVertical + 4.5,
    { align: 'center' },
  );

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(6.5);
  documentoPdf.setTextColor(100, 116, 139);
  documentoPdf.text(
    'MÉDICO TRATANTE  •  FIRMA Y SELLO',
    posicionCentroFirma,
    posicionVertical + 8,
    { align: 'center' },
  );

  dibujarPiePaginaGlobal(
    documentoPdf,
    detalle.pacienteNombre || 'PACIENTE',
    String(detalle.nroHistoriaClinica || 'S/N'),
  );

  return documentoPdf;
}

export async function generarDocumentoPdfReporteOperatorio(
  reporte: HistorialReporteOperatorioItem,
  pacienteNombre: string,
  historiaClinica: string,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });

  let posicionVertical = dibujarEncabezadoInstitucional(
    documentoPdf,
    'REPORTE QUIRÚRGICO OFICIAL - FICHA OPERATORIA',
    `FECHA INTERVENCIÓN: ${reporte.fecha || 'NO REGISTRADA'}  •  CIRUJANO: ${reporte.cirujano || 'NO REGISTRADO'}`,
  );

  documentoPdf.setDrawColor(203, 213, 225);
  documentoPdf.setFillColor(248, 250, 252);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    20,
    1,
    1,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);

  documentoPdf.text('PACIENTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 5);
  documentoPdf.text('HISTORIA CLÍNICA:', MARGEN_IZQUIERDO + 120, posicionVertical + 5);
  documentoPdf.text('SERVICIO / CAMA:', MARGEN_IZQUIERDO + 3, posicionVertical + 11);
  documentoPdf.text('HORA INICIO / FIN:', MARGEN_IZQUIERDO + 120, posicionVertical + 11);
  documentoPdf.text('CÓDIGO PROCEDIMIENTO (CPT):', MARGEN_IZQUIERDO + 3, posicionVertical + 17);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);

  documentoPdf.text(formatearTextoSeguro(pacienteNombre), MARGEN_IZQUIERDO + 25, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(historiaClinica), MARGEN_IZQUIERDO + 155, posicionVertical + 5);
  documentoPdf.text(
    `${formatearTextoSeguro(reporte.servicio)} / Cama: ${formatearTextoSeguro(reporte.cama)}`,
    MARGEN_IZQUIERDO + 35,
    posicionVertical + 11,
  );
  documentoPdf.text(
    `${formatearTextoSeguro(reporte.horaInicio)} - ${formatearTextoSeguro(reporte.horaFin)} (${reporte.tiempoQuirurgico || ''})`,
    MARGEN_IZQUIERDO + 155,
    posicionVertical + 11,
  );
  documentoPdf.text(
    `${formatearTextoSeguro(reporte.codigoCPT)} - ${formatearTextoSeguro(reporte.descripcion)}`,
    MARGEN_IZQUIERDO + 52,
    posicionVertical + 17,
  );

  posicionVertical += 25;

  const escribirCampo = (etiqueta: string, valor: string | undefined): void => {
    if (!valor || valor.trim().length === 0) return;
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 14);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text(etiqueta, MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 3.5;

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(51, 65, 85);
    const lineas = documentoPdf.splitTextToSize(valor.trim(), ANCHO_PAGINA - 4);
    documentoPdf.text(lineas, MARGEN_IZQUIERDO + 2, posicionVertical);
    posicionVertical += lineas.length * 3.6 + 4;
  };

  escribirCampo('DIAGNÓSTICO PRE-OPERATORIO:', reporte.diagnosticoPre);
  escribirCampo('DIAGNÓSTICO POST-OPERATORIO:', reporte.diagnosticoPost);
  escribirCampo('OPERACIÓN INDICADA:', reporte.operacionIndicada);
  escribirCampo('OPERACIÓN REALIZADA:', reporte.operacionRealizada);
  escribirCampo('HALLAZGOS QUIRÚRGICOS:', reporte.hallazgos);

  posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 22);
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(30, 41, 59);
  documentoPdf.text('EQUIPO QUIRÚRGICO Y DETALLES', MARGEN_IZQUIERDO, posicionVertical);
  posicionVertical += 4;

  const detallesQuirurgicos = [
    `Primer Ayudante: ${formatearTextoSeguro(reporte.primerAyudante)}`,
    `Segundo Ayudante: ${formatearTextoSeguro(reporte.segundoAyudante)}`,
    `Anestesiólogo: ${formatearTextoSeguro(reporte.anestesiologo)}`,
    `Tipo Anestesia: ${formatearTextoSeguro(reporte.tipoAnestesia)}`,
    `Instrumentista: ${formatearTextoSeguro(reporte.instrumentista)}`,
    `Circulante: ${formatearTextoSeguro(reporte.personalCirculante)}`,
    `Cuenta de Gasas: ${formatearTextoSeguro(reporte.cuentaGasas)}`,
    `Pieza Operatoria: ${formatearTextoSeguro(reporte.piezaOperatoria)}`,
  ];

  documentoPdf.setFillColor(248, 250, 252);
  documentoPdf.setDrawColor(226, 232, 240);
  documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 18, 'FD');

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(6.8);
  documentoPdf.setTextColor(51, 65, 85);

  detallesQuirurgicos.forEach((texto, indice) => {
    const columna = indice % 2;
    const fila = Math.floor(indice / 2);
    const posX = MARGEN_IZQUIERDO + 3 + columna * 90;
    const posY = posicionVertical + 4 + fila * 4;
    documentoPdf.text(texto, posX, posY);
  });

  posicionVertical += 25;

  dibujarPiePaginaGlobal(documentoPdf, pacienteNombre, historiaClinica);
  return documentoPdf;
}

export async function generarDocumentoPdfInformeProcedimiento(
  procedimiento: HistorialProcedimientoItem,
  pacienteNombre: string,
  historiaClinica: string,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });

  let posicionVertical = dibujarEncabezadoInstitucional(
    documentoPdf,
    'INFORME OFICIAL DE PROCEDIMIENTO MÉDICO',
    `FECHA: ${procedimiento.fecha || 'NO REGISTRADA'}  •  MÉDICO: ${procedimiento.medico || 'NO REGISTRADO'}`,
  );

  documentoPdf.setDrawColor(203, 213, 225);
  documentoPdf.setFillColor(248, 250, 252);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    20,
    1,
    1,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);

  documentoPdf.text('PACIENTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 5);
  documentoPdf.text('HISTORIA CLÍNICA:', MARGEN_IZQUIERDO + 120, posicionVertical + 5);
  documentoPdf.text('SERVICIO / ESPECIALIDAD:', MARGEN_IZQUIERDO + 3, posicionVertical + 11);
  documentoPdf.text('MÉDICO EJECUTOR:', MARGEN_IZQUIERDO + 120, posicionVertical + 11);
  documentoPdf.text('PROCEDIMIENTO REALIZADO:', MARGEN_IZQUIERDO + 3, posicionVertical + 17);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);

  documentoPdf.text(formatearTextoSeguro(pacienteNombre), MARGEN_IZQUIERDO + 25, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(historiaClinica), MARGEN_IZQUIERDO + 155, posicionVertical + 5);
  documentoPdf.text(
    `${formatearTextoSeguro(procedimiento.servicio)} / ${formatearTextoSeguro(procedimiento.especialidad)}`,
    MARGEN_IZQUIERDO + 45,
    posicionVertical + 11,
  );
  documentoPdf.text(
    formatearTextoSeguro(procedimiento.medico),
    MARGEN_IZQUIERDO + 152,
    posicionVertical + 11,
  );
  documentoPdf.text(
    `[${formatearTextoSeguro(procedimiento.codigoCPT)}] ${formatearTextoSeguro(procedimiento.descripcion)}`,
    MARGEN_IZQUIERDO + 50,
    posicionVertical + 17,
  );

  posicionVertical += 26;

  const escribirCampo = (etiqueta: string, valor: string | undefined): void => {
    if (!valor || valor.trim().length === 0) return;
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 16);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text(etiqueta, MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 3.5;

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(51, 65, 85);
    const lineas = documentoPdf.splitTextToSize(valor.trim(), ANCHO_PAGINA - 4);
    documentoPdf.text(lineas, MARGEN_IZQUIERDO + 2, posicionVertical);
    posicionVertical += lineas.length * 3.6 + 5;
  };

  escribirCampo('DIAGNÓSTICOS ASOCIADOS:', procedimiento.diagnosticos);
  escribirCampo('HALLAZGOS DEL PROCEDIMIENTO:', procedimiento.hallazgos);
  escribirCampo('OBSERVACIONES ADICIONALES:', procedimiento.observacion);

  dibujarPiePaginaGlobal(documentoPdf, pacienteNombre, historiaClinica);
  return documentoPdf;
}

export async function descargarPdfHistorialAtencion(
  detalle: HistorialAtencionDetalle,
  tipoServicioTitulo: string,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfHistorialAtencion(detalle, tipoServicioTitulo);
  const nombreLimpio = (detalle.pacienteNombre || 'paciente').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const nombreArchivo = `atencion_${detalle.idCuentaAtencion}_${nombreLimpio}.pdf`;
  documentoPdf.save(nombreArchivo);
}

export async function imprimirPdfHistorialAtencion(
  detalle: HistorialAtencionDetalle,
  tipoServicioTitulo: string,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfHistorialAtencion(detalle, tipoServicioTitulo);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

export async function imprimirPdfReporteOperatorio(
  reporte: HistorialReporteOperatorioItem,
  pacienteNombre: string,
  historiaClinica: string,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfReporteOperatorio(
    reporte,
    pacienteNombre,
    historiaClinica,
  );
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

export async function imprimirPdfInformeProcedimiento(
  procedimiento: HistorialProcedimientoItem,
  pacienteNombre: string,
  historiaClinica: string,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfInformeProcedimiento(
    procedimiento,
    pacienteNombre,
    historiaClinica,
  );
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

function ejecutarImpresionLimpiaDocumentoPdf(documentoPdf: jsPDF): void {
  const blob = documentoPdf.output('blob');
  const urlBlob = URL.createObjectURL(blob);

  const ventanaNueva = window.open(urlBlob, '_blank');
  if (ventanaNueva) {
    ventanaNueva.focus();
    return;
  }

  const marcoImpresionInvisible = document.createElement('iframe');
  marcoImpresionInvisible.style.position = 'fixed';
  marcoImpresionInvisible.style.top = '-9999px';
  marcoImpresionInvisible.style.left = '-9999px';
  marcoImpresionInvisible.style.width = '0px';
  marcoImpresionInvisible.style.height = '0px';
  marcoImpresionInvisible.style.border = 'none';
  marcoImpresionInvisible.src = urlBlob;

  document.body.appendChild(marcoImpresionInvisible);

  marcoImpresionInvisible.onload = () => {
    try {
      marcoImpresionInvisible.contentWindow?.focus();
      marcoImpresionInvisible.contentWindow?.print();
    } catch {
      window.open(urlBlob, '_blank');
    } finally {
      setTimeout(() => {
        if (document.body.contains(marcoImpresionInvisible)) {
          document.body.removeChild(marcoImpresionInvisible);
        }
        URL.revokeObjectURL(urlBlob);
      }, 60000);
    }
  };
}

export interface DiagnosticoPdfItem {
  readonly codigoCIE10: string;
  readonly descripcion: string;
  readonly clasificacion?: string;
}

export interface DatosPdfRecetaMedica {
  readonly pacienteNombre: string;
  readonly nroHistoriaClinica: string | number;
  readonly nroDocumento: string;
  readonly edad: number;
  readonly sexo: string;
  readonly tipoFinanciador: string;
  readonly fechaAtencion: string;
  readonly servicioNombre: string;
  readonly medicoNombre: string;
  readonly diagnosticos: readonly DiagnosticoPdfItem[];
  readonly itemsReceta: readonly ItemRecetaPrescripcion[];
  readonly indicacionesGenerales?: string;
  readonly fechaProximaCita?: string;
}

export interface DatosPdfOrdenesApoyo {
  readonly pacienteNombre: string;
  readonly nroHistoriaClinica: string | number;
  readonly nroDocumento: string;
  readonly edad: number;
  readonly sexo: string;
  readonly tipoFinanciador: string;
  readonly fechaAtencion: string;
  readonly servicioNombre: string;
  readonly medicoNombre: string;
  readonly diagnosticos: readonly DiagnosticoPdfItem[];
  readonly ordenesApoyo: readonly OrdenApoyoDiagnosticoItem[];
  readonly indicacionesGenerales?: string;
}

export interface DatosPdfResumenConsulta {
  readonly ficha: FichaAtencionCEDetalle;
  readonly triaje?: TriajeConsultaSignosVitales | null;
  readonly itemsReceta?: readonly ItemRecetaPrescripcion[];
  readonly fechaConsultaFormateada: string;
  readonly medicoNombre?: string;
}

export interface DatosPdfDescansoMedico {
  readonly pacienteNombre: string;
  readonly nroHistoriaClinica: string | number;
  readonly nroDocumento: string;
  readonly edad: number;
  readonly sexo: string;
  readonly fechaAtencion: string;
  readonly servicioNombre: string;
  readonly medicoNombre: string;
  readonly diagnosticoPrincipal: string;
  readonly codigoCIE10: string;
  readonly diasDescanso: number;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly tipoReposo: string;
  readonly observaciones?: string;
}

export async function generarDocumentoPdfRecetaMedica(
  datos: DatosPdfRecetaMedica,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });

  let posicionVertical = dibujarEncabezadoInstitucional(
    documentoPdf,
    'RECETA Y PRESCRIPCIÓN MÉDICA OFICIAL',
    `CONSULTA EXTERNA  •  FECHA: ${datos.fechaAtencion || 'NO REGISTRADA'}  •  FINANCIADOR: ${datos.tipoFinanciador || 'SIS'}`,
  );

  documentoPdf.setDrawColor(203, 213, 225);
  documentoPdf.setFillColor(248, 250, 252);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    20,
    1,
    1,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);

  documentoPdf.text('PACIENTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 5);
  documentoPdf.text('HISTORIA CLÍNICA:', MARGEN_IZQUIERDO + 105, posicionVertical + 5);
  documentoPdf.text('DOCUMENTO (DNI):', MARGEN_IZQUIERDO + 148, posicionVertical + 5);
  documentoPdf.text('EDAD / SEXO:', MARGEN_IZQUIERDO + 3, posicionVertical + 11);
  documentoPdf.text('ESPECIALIDAD:', MARGEN_IZQUIERDO + 55, posicionVertical + 11);
  documentoPdf.text('MÉDICO TRATANTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 17);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);

  documentoPdf.text(formatearTextoSeguro(datos.pacienteNombre), MARGEN_IZQUIERDO + 23, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(datos.nroHistoriaClinica), MARGEN_IZQUIERDO + 133, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(datos.nroDocumento), MARGEN_IZQUIERDO + 176, posicionVertical + 5);

  const edadTexto = datos.edad ? `${datos.edad} Años` : 'NO REGISTRADA';
  const sexoTexto = datos.sexo === 'F' ? 'Femenino' : (datos.sexo === 'M' ? 'Masculino' : 'No registrado');
  documentoPdf.text(`${edadTexto}  /  ${sexoTexto}`, MARGEN_IZQUIERDO + 24, posicionVertical + 11);
  documentoPdf.text(formatearTextoSeguro(datos.servicioNombre), MARGEN_IZQUIERDO + 78, posicionVertical + 11);
  documentoPdf.text(formatearTextoSeguro(datos.medicoNombre), MARGEN_IZQUIERDO + 32, posicionVertical + 17);

  posicionVertical += 25;

  if (datos.diagnosticos && datos.diagnosticos.length > 0) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('DIAGNÓSTICOS ASOCIADOS (CIE-10)', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 4;

    for (const diagnostico of datos.diagnosticos) {
      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7.5);
      documentoPdf.setTextColor(30, 58, 138);
      documentoPdf.text(`[${diagnostico.codigoCIE10}]`, MARGEN_IZQUIERDO + 2, posicionVertical);

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setTextColor(15, 23, 42);
      documentoPdf.text(diagnostico.descripcion, MARGEN_IZQUIERDO + 18, posicionVertical);
      posicionVertical += 5;
    }
    posicionVertical += 3;
  }

  posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 25);
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(8.5);
  documentoPdf.setTextColor(30, 41, 59);
  documentoPdf.text('RP / PRESCRIPCIÓN FARMACOLÓGICA', MARGEN_IZQUIERDO, posicionVertical);
  posicionVertical += 4;

  documentoPdf.setFillColor(241, 245, 249);
  documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 7, 'F');
  documentoPdf.setDrawColor(226, 232, 240);
  documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 7, 'S');

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7);
  documentoPdf.setTextColor(71, 85, 105);
  documentoPdf.text('#', MARGEN_IZQUIERDO + 2, posicionVertical + 4.5);
  documentoPdf.text('MEDICAMENTO / CONCENTRACIÓN / FORMA', MARGEN_IZQUIERDO + 8, posicionVertical + 4.5);
  documentoPdf.text('CANTIDAD', MARGEN_IZQUIERDO + 105, posicionVertical + 4.5);
  documentoPdf.text('DOSIS Y FRECUENCIA (POSOLOGÍA)', MARGEN_IZQUIERDO + 125, posicionVertical + 4.5);
  posicionVertical += 7;

  if (datos.itemsReceta.length === 0) {
    documentoPdf.setFont('helvetica', 'italic');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(100, 116, 139);
    documentoPdf.text('No se registraron medicamentos en esta prescripción.', MARGEN_IZQUIERDO + 8, posicionVertical + 5);
    posicionVertical += 10;
  } else {
    let indice = 1;
    for (const item of datos.itemsReceta) {
      posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 12);

      documentoPdf.setFillColor(indice % 2 === 0 ? 248 : 255, indice % 2 === 0 ? 250 : 255, indice % 2 === 0 ? 252 : 255);
      documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 10, 'F');
      documentoPdf.setDrawColor(241, 245, 249);
      documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 10, 'S');

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7.5);
      documentoPdf.setTextColor(15, 23, 42);
      documentoPdf.text(String(indice), MARGEN_IZQUIERDO + 2, posicionVertical + 4.5);

      const nombreMedicamento = `${item.nombre} ${item.concentracion || ''} ${item.formaFarmaceutica || ''}`.trim();
      documentoPdf.text(nombreMedicamento, MARGEN_IZQUIERDO + 8, posicionVertical + 4.5);

      documentoPdf.text(`${item.cantidad || 1} ${item.unidadMedida || 'UND'}`, MARGEN_IZQUIERDO + 105, posicionVertical + 4.5);

      const posologia = `${item.dosis || '1'} ${item.unidadMedida || 'TAB'}, ${item.frecuencia || 'CADA 24 HORAS'}, VÍA: ${item.via || 'ORAL'}, POR ${item.duracion || '30 DÍAS'}`.toUpperCase();
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(6.5);
      documentoPdf.setTextColor(71, 85, 105);
      documentoPdf.text(posologia, MARGEN_IZQUIERDO + 8, posicionVertical + 8.5);

      posicionVertical += 10;
      indice++;
    }
  }

  posicionVertical += 4;
  if (datos.indicacionesGenerales && datos.indicacionesGenerales.trim()) {
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 20);
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('INDICACIONES GENERALES Y MEDIDAS HIGIÉNICO-DIETÉTICAS', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 4;

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(15, 23, 42);
    const lineasIndicaciones = documentoPdf.splitTextToSize(datos.indicacionesGenerales, ANCHO_PAGINA);
    documentoPdf.text(lineasIndicaciones, MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += lineasIndicaciones.length * 4.5;
  }

  if (datos.fechaProximaCita) {
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 10);
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(30, 58, 138);
    documentoPdf.text(`PRÓXIMO CONTROL PROGRAMADO: ${datos.fechaProximaCita}`, MARGEN_IZQUIERDO, posicionVertical + 4);
    posicionVertical += 8;
  }

  posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 30);
  posicionVertical += 10;
  documentoPdf.setDrawColor(148, 163, 184);
  documentoPdf.line(MARGEN_DERECHO - 60, posicionVertical, MARGEN_DERECHO, posicionVertical);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7);
  documentoPdf.setTextColor(71, 85, 105);
  documentoPdf.text('FIRMA Y SELLO DEL MÉDICO TRATANTE', MARGEN_DERECHO - 60, posicionVertical + 4);
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.text(formatearTextoSeguro(datos.medicoNombre), MARGEN_DERECHO - 60, posicionVertical + 8);

  dibujarPiePaginaGlobal(documentoPdf, datos.pacienteNombre, String(datos.nroHistoriaClinica));
  return documentoPdf;
}

export async function imprimirPdfRecetaMedica(
  datos: DatosPdfRecetaMedica,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfRecetaMedica(datos);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

export async function generarDocumentoPdfOrdenesApoyo(
  datos: DatosPdfOrdenesApoyo,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });

  let posicionVertical = dibujarEncabezadoInstitucional(
    documentoPdf,
    'SOLICITUD DE EXÁMENES DE APOYO AL DIAGNÓSTICO',
    `CONSULTA EXTERNA  •  FECHA: ${datos.fechaAtencion || 'NO REGISTRADA'}  •  FINANCIADOR: ${datos.tipoFinanciador || 'SIS'}`,
  );

  documentoPdf.setDrawColor(203, 213, 225);
  documentoPdf.setFillColor(248, 250, 252);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    20,
    1,
    1,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);

  documentoPdf.text('PACIENTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 5);
  documentoPdf.text('HISTORIA CLÍNICA:', MARGEN_IZQUIERDO + 105, posicionVertical + 5);
  documentoPdf.text('DOCUMENTO (DNI):', MARGEN_IZQUIERDO + 148, posicionVertical + 5);
  documentoPdf.text('EDAD / SEXO:', MARGEN_IZQUIERDO + 3, posicionVertical + 11);
  documentoPdf.text('ESPECIALIDAD:', MARGEN_IZQUIERDO + 55, posicionVertical + 11);
  documentoPdf.text('MÉDICO SOLICITANTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 17);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);

  documentoPdf.text(formatearTextoSeguro(datos.pacienteNombre), MARGEN_IZQUIERDO + 23, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(datos.nroHistoriaClinica), MARGEN_IZQUIERDO + 133, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(datos.nroDocumento), MARGEN_IZQUIERDO + 176, posicionVertical + 5);

  const edadTexto = datos.edad ? `${datos.edad} Años` : 'NO REGISTRADA';
  const sexoTexto = datos.sexo === 'F' ? 'Femenino' : (datos.sexo === 'M' ? 'Masculino' : 'No registrado');
  documentoPdf.text(`${edadTexto}  /  ${sexoTexto}`, MARGEN_IZQUIERDO + 24, posicionVertical + 11);
  documentoPdf.text(formatearTextoSeguro(datos.servicioNombre), MARGEN_IZQUIERDO + 78, posicionVertical + 11);
  documentoPdf.text(formatearTextoSeguro(datos.medicoNombre), MARGEN_IZQUIERDO + 35, posicionVertical + 17);

  posicionVertical += 25;

  if (datos.diagnosticos && datos.diagnosticos.length > 0) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('DIAGNÓSTICOS ASOCIADOS A LA SOLICITUD', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 4;

    for (const diagnostico of datos.diagnosticos) {
      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7.5);
      documentoPdf.setTextColor(30, 58, 138);
      documentoPdf.text(`[${diagnostico.codigoCIE10}]`, MARGEN_IZQUIERDO + 2, posicionVertical);

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setTextColor(15, 23, 42);
      documentoPdf.text(diagnostico.descripcion, MARGEN_IZQUIERDO + 18, posicionVertical);
      posicionVertical += 5;
    }
    posicionVertical += 3;
  }

  posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 25);
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(8.5);
  documentoPdf.setTextColor(30, 41, 59);
  documentoPdf.text('EXÁMENES Y PROCEDIMIENTOS SOLICITADOS', MARGEN_IZQUIERDO, posicionVertical);
  posicionVertical += 4;

  documentoPdf.setFillColor(241, 245, 249);
  documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 7, 'F');
  documentoPdf.setDrawColor(226, 232, 240);
  documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 7, 'S');

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7);
  documentoPdf.setTextColor(71, 85, 105);
  documentoPdf.text('#', MARGEN_IZQUIERDO + 2, posicionVertical + 4.5);
  documentoPdf.text('EXAMEN / ESTUDIO SOLICITADO', MARGEN_IZQUIERDO + 8, posicionVertical + 4.5);
  documentoPdf.text('SERVICIO DESTINO', MARGEN_IZQUIERDO + 95, posicionVertical + 4.5);
  documentoPdf.text('CANT.', MARGEN_IZQUIERDO + 135, posicionVertical + 4.5);
  documentoPdf.text('JUSTIFICACIÓN / INDICACIÓN', MARGEN_IZQUIERDO + 148, posicionVertical + 4.5);
  posicionVertical += 7;

  if (datos.ordenesApoyo.length === 0) {
    documentoPdf.setFont('helvetica', 'italic');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(100, 116, 139);
    documentoPdf.text('No se registraron solicitudes de apoyo diagnóstico.', MARGEN_IZQUIERDO + 8, posicionVertical + 5);
    posicionVertical += 10;
  } else {
    let indice = 1;
    for (const item of datos.ordenesApoyo) {
      posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 10);

      documentoPdf.setFillColor(indice % 2 === 0 ? 248 : 255, indice % 2 === 0 ? 250 : 255, indice % 2 === 0 ? 252 : 255);
      documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 8, 'F');
      documentoPdf.setDrawColor(241, 245, 249);
      documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 8, 'S');

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7.5);
      documentoPdf.setTextColor(15, 23, 42);
      documentoPdf.text(String(indice), MARGEN_IZQUIERDO + 2, posicionVertical + 5);
      documentoPdf.text(item.nombreProcedimiento, MARGEN_IZQUIERDO + 8, posicionVertical + 5);

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(7);
      documentoPdf.text(item.servicio || 'LABORATORIO', MARGEN_IZQUIERDO + 95, posicionVertical + 5);
      documentoPdf.text(String(item.cantidad || 1), MARGEN_IZQUIERDO + 138, posicionVertical + 5);

      const justificacion = item.justificacion || item.observacion || 'CONTROL CLÍNICO';
      documentoPdf.text(justificacion.substring(0, 24), MARGEN_IZQUIERDO + 148, posicionVertical + 5);

      posicionVertical += 8;
      indice++;
    }
  }

  posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 30);
  posicionVertical += 12;
  documentoPdf.setDrawColor(148, 163, 184);
  documentoPdf.line(MARGEN_DERECHO - 60, posicionVertical, MARGEN_DERECHO, posicionVertical);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7);
  documentoPdf.setTextColor(71, 85, 105);
  documentoPdf.text('FIRMA Y SELLO DEL MÉDICO SOLICITANTE', MARGEN_DERECHO - 60, posicionVertical + 4);
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.text(formatearTextoSeguro(datos.medicoNombre), MARGEN_DERECHO - 60, posicionVertical + 8);

  dibujarPiePaginaGlobal(documentoPdf, datos.pacienteNombre, String(datos.nroHistoriaClinica));
  return documentoPdf;
}

export async function imprimirPdfOrdenesApoyo(
  datos: DatosPdfOrdenesApoyo,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfOrdenesApoyo(datos);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

export async function generarDocumentoPdfResumenConsulta(
  datos: DatosPdfResumenConsulta,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const ficha = datos.ficha;

  let posicionVertical = dibujarEncabezadoInstitucional(
    documentoPdf,
    'HOJA DE ATENCIÓN DE CONSULTA EXTERNA',
    `CUENTA: ${ficha.idCuentaAtencion}  •  FECHA: ${datos.fechaConsultaFormateada || 'NO REGISTRADA'}  •  ESTADO: ${ficha.estado === 2 ? 'ATENDIDO' : 'EN ATENCIÓN'}`,
  );

  documentoPdf.setDrawColor(203, 213, 225);
  documentoPdf.setFillColor(248, 250, 252);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    20,
    1,
    1,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);

  documentoPdf.text('PACIENTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 5);
  documentoPdf.text('HISTORIA CLÍNICA:', MARGEN_IZQUIERDO + 105, posicionVertical + 5);
  documentoPdf.text('DOCUMENTO (DNI):', MARGEN_IZQUIERDO + 148, posicionVertical + 5);
  documentoPdf.text('EDAD / SEXO:', MARGEN_IZQUIERDO + 3, posicionVertical + 11);
  documentoPdf.text('CONSULTORIO / SERVICIO:', MARGEN_IZQUIERDO + 55, posicionVertical + 11);
  documentoPdf.text('FINANCIADOR / SEGURO:', MARGEN_IZQUIERDO + 3, posicionVertical + 17);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);

  documentoPdf.text(formatearTextoSeguro(ficha.pacienteNombre), MARGEN_IZQUIERDO + 23, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(ficha.nroHistoriaClinica), MARGEN_IZQUIERDO + 133, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(ficha.nroDocumento), MARGEN_IZQUIERDO + 176, posicionVertical + 5);

  const edadTexto = ficha.edad ? `${ficha.edad} Años` : 'NO REGISTRADA';
  const sexoTexto = ficha.sexo === 'F' ? 'Femenino' : (ficha.sexo === 'M' ? 'Masculino' : 'No registrado');
  documentoPdf.text(`${edadTexto}  /  ${sexoTexto}`, MARGEN_IZQUIERDO + 24, posicionVertical + 11);
  documentoPdf.text(formatearTextoSeguro(ficha.especialidadNombre || 'CONSULTA EXTERNA'), MARGEN_IZQUIERDO + 95, posicionVertical + 11);
  documentoPdf.text(formatearTextoSeguro(ficha.iafa || 'SIS'), MARGEN_IZQUIERDO + 38, posicionVertical + 17);

  posicionVertical += 25;

  if (datos.triaje) {
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 22);
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('SIGNOS VITALES DEL TRIAJE', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 3;

    const listaSignos = [
      { etiqueta: 'P. ARTERIAL', valor: datos.triaje.presionArterial ? `${datos.triaje.presionArterial} mmHg` : '--' },
      { etiqueta: 'FREC. CARD.', valor: datos.triaje.frecuenciaCardiaca ? `${datos.triaje.frecuenciaCardiaca} lpm` : '--' },
      { etiqueta: 'FREC. RESP.', valor: datos.triaje.frecuenciaRespiratoria ? `${datos.triaje.frecuenciaRespiratoria} rpm` : '--' },
      { etiqueta: 'TEMPERATURA', valor: datos.triaje.temperatura ? `${datos.triaje.temperatura} °C` : '--' },
      { etiqueta: 'SATURACIÓN', valor: datos.triaje.saturacion ? `${datos.triaje.saturacion} %` : '--' },
    ];

    documentoPdf.setFillColor(241, 245, 249);
    documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 7, 'F');
    documentoPdf.setDrawColor(226, 232, 240);
    documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 7, 'S');

    const anchoColumna = ANCHO_PAGINA / 5;
    for (let indice = 0; indice < listaSignos.length; indice++) {
      const posicionX = MARGEN_IZQUIERDO + indice * anchoColumna + 2;
      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(6.5);
      documentoPdf.setTextColor(71, 85, 105);
      documentoPdf.text(listaSignos[indice].etiqueta, posicionX, posicionVertical + 3);

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(7.5);
      documentoPdf.setTextColor(15, 23, 42);
      documentoPdf.text(listaSignos[indice].valor, posicionX, posicionVertical + 6);
    }
    posicionVertical += 10;
  }

  posicionVertical = imprimirBloqueClinicoConPaginacion(
    documentoPdf,
    '1. RELATO DE LA ENFERMEDAD / MOTIVO DE CONSULTA',
    ficha.motivo,
    posicionVertical,
  );

  posicionVertical = imprimirBloqueClinicoConPaginacion(
    documentoPdf,
    '2. EXAMEN CLÍNICO DIRIGIDO',
    ficha.examenClinico,
    posicionVertical,
  );

  posicionVertical = imprimirBloqueClinicoConPaginacion(
    documentoPdf,
    '3. ANTECEDENTES Y COMORBILIDADES',
    ficha.antecedente,
    posicionVertical,
  );

  posicionVertical = imprimirBloqueClinicoConPaginacion(
    documentoPdf,
    '4. PLAN TERAPÉUTICO Y TRATAMIENTO',
    ficha.planTratamiento || ficha.tratamiento,
    posicionVertical,
  );

  if (ficha.diagnosticos && ficha.diagnosticos.length > 0) {
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 16);
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('5. DIAGNÓSTICOS CIE-10 REGISTRADOS', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 4.5;

    for (const diagnostico of ficha.diagnosticos) {
      posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 6);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7.5);
      documentoPdf.setTextColor(30, 58, 138);
      documentoPdf.text(`[${diagnostico.codigoCIE10}]`, MARGEN_IZQUIERDO + 2, posicionVertical);

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setTextColor(15, 23, 42);
      const clasificacionTexto =
        diagnostico.clasificacion === 'D'
          ? 'DEFINITIVO'
          : diagnostico.clasificacion === 'R'
            ? 'REPETIDO'
            : 'PRESUNTIVO';
      const descripcionCompleta = `${diagnostico.descripcion} (${clasificacionTexto})`;
      const lineasDiagnostico = documentoPdf.splitTextToSize(descripcionCompleta, ANCHO_PAGINA - 20);

      documentoPdf.text(lineasDiagnostico[0], MARGEN_IZQUIERDO + 18, posicionVertical);
      posicionVertical += 4.5;

      if (lineasDiagnostico.length > 1) {
        for (let indiceLinea = 1; indiceLinea < lineasDiagnostico.length; indiceLinea++) {
          posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 5);
          documentoPdf.text(lineasDiagnostico[indiceLinea], MARGEN_IZQUIERDO + 18, posicionVertical);
          posicionVertical += 4.2;
        }
      }
    }
    posicionVertical += 3;
  }

  if (datos.itemsReceta && datos.itemsReceta.length > 0) {
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 18);
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    documentoPdf.text('6. MEDICAMENTOS Y RECETA PRESCRITA', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 4.5;

    let contadorMedicamento = 1;
    for (const item of datos.itemsReceta) {
      posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 10);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7.5);
      documentoPdf.setTextColor(15, 23, 42);
      const nombreItem = `${contadorMedicamento}. ${item.nombre} ${item.concentracion || ''} ${item.formaFarmaceutica || ''} (Cant: ${item.cantidad || 1} ${item.unidadMedida || 'UND'})`.trim();
      documentoPdf.text(nombreItem, MARGEN_IZQUIERDO + 2, posicionVertical);
      posicionVertical += 4;

      const posologiaTexto = `Dosis: ${item.dosis || '1'} ${item.unidadMedida || 'TAB'}, cada ${item.frecuencia || '24 HORAS'}, vía: ${item.via || 'ORAL'}, por ${item.duracion || '30 DÍAS'}`.toUpperCase();
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(7);
      documentoPdf.setTextColor(71, 85, 105);
      documentoPdf.text(posologiaTexto, MARGEN_IZQUIERDO + 6, posicionVertical);
      posicionVertical += 4.5;

      contadorMedicamento++;
    }
    posicionVertical += 3;
  }

  if (ficha.idDestinoAtencion || ficha.fechaProxCita) {
    posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 12);
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(30, 41, 59);
    const numeroSecuenciaDestino = datos.itemsReceta && datos.itemsReceta.length > 0 ? '7' : '6';
    documentoPdf.text(`${numeroSecuenciaDestino}. DESTINO Y PRÓXIMO CONTROL`, MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 4;

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(15, 23, 42);
    const destinoTexto = ficha.destinoNombre || 'CONSULTA EXTERNA';
    const citaTexto = ficha.fechaProxCita ? `  •  PRÓXIMA CITA: ${ficha.fechaProxCita}` : '';
    documentoPdf.text(`DESTINO: ${destinoTexto}${citaTexto}`, MARGEN_IZQUIERDO + 2, posicionVertical);
    posicionVertical += 7;
  }

  posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 34);
  posicionVertical += 14;
  documentoPdf.setDrawColor(148, 163, 184);
  documentoPdf.line(MARGEN_DERECHO - 65, posicionVertical, MARGEN_DERECHO, posicionVertical);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);
  documentoPdf.text('FIRMA Y SELLO MÉDICO', MARGEN_DERECHO - 65, posicionVertical + 4);
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7);
  documentoPdf.text(
    formatearTextoSeguro(datos.medicoNombre || ficha.medicoNombre || 'MÉDICO TRATANTE'),
    MARGEN_DERECHO - 65,
    posicionVertical + 8,
  );

  dibujarPiePaginaGlobal(documentoPdf, ficha.pacienteNombre, String(ficha.nroHistoriaClinica));
  return documentoPdf;
}

export async function imprimirPdfResumenConsulta(
  datos: DatosPdfResumenConsulta,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfResumenConsulta(datos);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

export async function generarDocumentoPdfDescansoMedico(
  datos: DatosPdfDescansoMedico,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });

  let posicionVertical = dibujarEncabezadoInstitucional(
    documentoPdf,
    'CERTIFICADO DE DESCANSO MÉDICO / INCAPACIDAD TEMPORAL',
    `CONSULTA EXTERNA  •  FECHA DE EMISIÓN: ${datos.fechaAtencion || 'NO REGISTRADA'}`,
  );

  documentoPdf.setDrawColor(203, 213, 225);
  documentoPdf.setFillColor(248, 250, 252);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    22,
    1,
    1,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);

  documentoPdf.text('PACIENTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 5);
  documentoPdf.text('HISTORIA CLÍNICA:', MARGEN_IZQUIERDO + 105, posicionVertical + 5);
  documentoPdf.text('DOCUMENTO (DNI):', MARGEN_IZQUIERDO + 148, posicionVertical + 5);
  documentoPdf.text('EDAD / SEXO:', MARGEN_IZQUIERDO + 3, posicionVertical + 11);
  documentoPdf.text('ESPECIALIDAD:', MARGEN_IZQUIERDO + 55, posicionVertical + 11);
  documentoPdf.text('MÉDICO CERTIFICANTE:', MARGEN_IZQUIERDO + 3, posicionVertical + 17);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(15, 23, 42);

  documentoPdf.text(formatearTextoSeguro(datos.pacienteNombre), MARGEN_IZQUIERDO + 23, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(datos.nroHistoriaClinica), MARGEN_IZQUIERDO + 133, posicionVertical + 5);
  documentoPdf.text(formatearTextoSeguro(datos.nroDocumento), MARGEN_IZQUIERDO + 176, posicionVertical + 5);

  const edadTexto = datos.edad ? `${datos.edad} Años` : 'NO REGISTRADA';
  const sexoTexto = datos.sexo === 'F' ? 'Femenino' : (datos.sexo === 'M' ? 'Masculino' : 'No registrado');
  documentoPdf.text(`${edadTexto}  /  ${sexoTexto}`, MARGEN_IZQUIERDO + 24, posicionVertical + 11);
  documentoPdf.text(formatearTextoSeguro(datos.servicioNombre), MARGEN_IZQUIERDO + 78, posicionVertical + 11);
  documentoPdf.text(formatearTextoSeguro(datos.medicoNombre), MARGEN_IZQUIERDO + 36, posicionVertical + 17);

  posicionVertical += 28;

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(9);
  documentoPdf.setTextColor(30, 41, 59);
  documentoPdf.text('CERTIFICACIÓN CLÍNICA', MARGEN_IZQUIERDO, posicionVertical);
  posicionVertical += 5;

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(8.5);
  documentoPdf.setTextColor(15, 23, 42);

  const parrafoCertifico = `El médico que suscribe certifica que el/la paciente ${datos.pacienteNombre}, identificado(a) con DNI N° ${datos.nroDocumento} e Historia Clínica N° ${datos.nroHistoriaClinica}, fue evaluado(a) en el servicio de ${datos.servicioNombre} presentando el siguiente diagnóstico:`;
  const lineasCertifico = documentoPdf.splitTextToSize(parrafoCertifico, ANCHO_PAGINA);
  documentoPdf.text(lineasCertifico, MARGEN_IZQUIERDO, posicionVertical);
  posicionVertical += lineasCertifico.length * 5 + 4;

  documentoPdf.setFillColor(241, 245, 249);
  documentoPdf.roundedRect(MARGEN_IZQUIERDO, posicionVertical, ANCHO_PAGINA, 12, 1, 1, 'F');
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(8.5);
  documentoPdf.setTextColor(30, 58, 138);
  documentoPdf.text(`CIE-10 [${datos.codigoCIE10}]: ${datos.diagnosticoPrincipal}`, MARGEN_IZQUIERDO + 4, posicionVertical + 7.5);
  posicionVertical += 18;

  const parrafoDias = `Por lo expuesto, amerita descanso médico y reposo ${datos.tipoReposo || 'ABSOLUTO'} por el lapso de ${datos.diasDescanso} DÍA(S), computados a partir del ${datos.fechaInicio} hasta el ${datos.fechaFin} inclusive.`;
  const lineasDias = documentoPdf.splitTextToSize(parrafoDias, ANCHO_PAGINA);
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(8.5);
  documentoPdf.setTextColor(15, 23, 42);
  documentoPdf.text(lineasDias, MARGEN_IZQUIERDO, posicionVertical);
  posicionVertical += lineasDias.length * 5 + 6;

  if (datos.observaciones && datos.observaciones.trim()) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8);
    documentoPdf.setTextColor(71, 85, 105);
    documentoPdf.text('OBSERVACIONES O RECOMENDACIONES:', MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += 4;

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(15, 23, 42);
    const lineasObs = documentoPdf.splitTextToSize(datos.observaciones.trim(), ANCHO_PAGINA);
    documentoPdf.text(lineasObs, MARGEN_IZQUIERDO, posicionVertical);
    posicionVertical += lineasObs.length * 4.5 + 4;
  }

  posicionVertical = verificarEspacioDisponible(documentoPdf, posicionVertical, 35);
  posicionVertical += 16;
  documentoPdf.setDrawColor(148, 163, 184);
  documentoPdf.line(MARGEN_DERECHO - 65, posicionVertical, MARGEN_DERECHO, posicionVertical);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(71, 85, 105);
  documentoPdf.text('FIRMA Y SELLO DEL MÉDICO TRATANTE', MARGEN_DERECHO - 65, posicionVertical + 4);
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.text(formatearTextoSeguro(datos.medicoNombre), MARGEN_DERECHO - 65, posicionVertical + 8);
  documentoPdf.text('CMP / RNE COLEGIO MÉDICO DEL PERÚ', MARGEN_DERECHO - 65, posicionVertical + 12);

  dibujarPiePaginaGlobal(documentoPdf, datos.pacienteNombre, String(datos.nroHistoriaClinica));
  return documentoPdf;
}

export async function imprimirPdfDescansoMedico(
  datos: DatosPdfDescansoMedico,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfDescansoMedico(datos);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}
