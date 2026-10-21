import type { jsPDF } from 'jspdf';
import type {
  FichaAtencionCEDetalle,
  HistorialAtencionDetalle,
  HistorialProcedimientoItem,
  HistorialReporteOperatorioItem,
  ItemRecetaPrescripcion,
  OrdenApoyoDiagnosticoItem,
  TriajeConsultaSignosVitales,
} from '../../tipos/atencion-ce.tipos';
import {
  COLOR_BORDE_MEDIO,
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_PRIMARIO,
  COLOR_PRIMARIO_ACENTO,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CLARO,
  COLOR_TEXTO_CUERPO,
  COLOR_TEXTO_MUTED,
  COLOR_TEXTO_TITULO,
  type DatosFiliacionPacientePdf,
  type DatosInstitucionCache,
  dibujarEncabezadoInstitucionalUnificado,
  dibujarPiePaginaInstitucionalUnificado,
  dibujarTarjetaFiliacionPacienteUnificada,
  dibujarTituloSeccionUnificado,
  formatearFechaCorta,
  obtenerDatosInstitucionCache,
} from './institucional-pdf.util';

const MARGEN_IZQUIERDO = 14;
const MARGEN_DERECHO = 196;
const ANCHO_PAGINA = MARGEN_DERECHO - MARGEN_IZQUIERDO;
const LIMITE_INFERIOR_PAGINA = 268;

export interface MetadatosFirmaPdf {
  stampPage: number;
  positionX: number;
  positionY: number;
}

const SIMBOLO_METADATOS_FIRMA = Symbol('metadatosFirmaPdf');

export function asignarMetadatosFirmaPdf(
  documentoPdf: jsPDF,
  metadatos: MetadatosFirmaPdf,
): void {
  (documentoPdf as unknown as Record<string | symbol, unknown>)[
    SIMBOLO_METADATOS_FIRMA
  ] = metadatos;
}

export function obtenerMetadatosFirmaPdf(
  documentoPdf: jsPDF,
  posicionPorDefectoY = 28,
): MetadatosFirmaPdf {
  const metadatosGuardados = (
    documentoPdf as unknown as Record<string | symbol, unknown>
  )[SIMBOLO_METADATOS_FIRMA] as MetadatosFirmaPdf | undefined;

  if (metadatosGuardados) {
    return metadatosGuardados;
  }

  return {
    stampPage: 1,
    positionX: 435,
    positionY: posicionPorDefectoY,
  };
}

export function calcularCoordenadasFirmaDinamica(
  _documentoPdf: jsPDF,
  _posicionVerticalFinalMm?: number,
  _separacionCentimetros?: number,
): MetadatosFirmaPdf {
  return {
    stampPage: 1,
    positionX: 435,
    positionY: 28,
  };
}

function formatearTextoSeguro(
  valor: string | number | null | undefined,
): string {
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

async function dibujarEncabezadoInstitucional(
  documentoPdf: jsPDF,
  tituloDocumento: string,
  subtituloDocumento?: string,
): Promise<number> {
  const datosInstitucion = await obtenerDatosInstitucionCache();
  return dibujarEncabezadoInstitucionalUnificado(
    documentoPdf,
    tituloDocumento,
    subtituloDocumento,
    datosInstitucion,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
    210,
  );
}

function dibujarPiePaginaGlobal(
  documentoPdf: jsPDF,
  pacienteNombre: string,
  historiaClinica: string,
): void {
  dibujarPiePaginaInstitucionalUnificado(
    documentoPdf,
    pacienteNombre,
    historiaClinica,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
    210,
  );
}

export async function generarDocumentoPdfHistorialAtencion(
  detalle: HistorialAtencionDetalle,
  tipoServicioTitulo: string,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });

  let posicionVertical = await dibujarEncabezadoInstitucional(
    documentoPdf,
    `INFORME CLÍNICO DE ATENCIÓN - ${tipoServicioTitulo}`,
    `CUENTA DE ATENCIÓN: ${detalle.idCuentaAtencion}  •  FECHA: ${detalle.fechaAtencion || 'NO REGISTRADA'}  •  HORA: ${detalle.horaInicio || '--:--'} a ${detalle.horaFin || '--:--'}`,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre: detalle.pacienteNombre,
    nroHistoriaClinica: detalle.nroHistoriaClinica,
    nroDocumento: detalle.nroDocumento,
    idCuentaAtencion: detalle.idCuentaAtencion,
    edad: detalle.edad,
    sexo: detalle.sexo,
    servicioNombre: detalle.servicioNombre,
    especialidadNombre: detalle.servicioNombre,
    consultorio: detalle.servicioNombre,
    medicoTratante: detalle.medicoNombre,
    fechaAtencion: detalle.fechaAtencion,
    horaAtencion: detalle.horaInicio,
    tipoFinanciador: 'SIS',
  };

  posicionVertical = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posicionVertical,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
  );

  if (detalle.triaje) {
    posicionVertical = verificarEspacioDisponible(
      documentoPdf,
      posicionVertical,
      26,
    );

    posicionVertical = dibujarTituloSeccionUnificado(
      documentoPdf,
      'DATOS DEL TRIAJE — CONSTANTES VITALES',
      posicionVertical,
      MARGEN_IZQUIERDO,
      MARGEN_DERECHO,
    );

    const altoTarjetaTriaje = 19;
    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_MEDIO);
    documentoPdf.setLineWidth(0.2);
    documentoPdf.roundedRect(
      MARGEN_IZQUIERDO,
      posicionVertical,
      ANCHO_PAGINA,
      altoTarjetaTriaje,
      1.2,
      1.2,
      'FD',
    );

    documentoPdf.setFillColor(...COLOR_PRIMARIO);
    documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, 2.5, altoTarjetaTriaje, 'F');

    const listaSignosFilaUno = [
      {
        etiqueta: 'P. ARTERIAL',
        valor: detalle.triaje.presionArterial
          ? `${detalle.triaje.presionArterial} mmHg`
          : '---',
        ancho: 36,
      },
      {
        etiqueta: 'FREC. CARDÍACA',
        valor: detalle.triaje.frecuenciaCardiaca
          ? `${detalle.triaje.frecuenciaCardiaca} lpm`
          : '---',
        ancho: 36,
      },
      {
        etiqueta: 'FREC. RESPIRATORIA',
        valor: detalle.triaje.frecuenciaRespiratoria
          ? `${detalle.triaje.frecuenciaRespiratoria} rpm`
          : '---',
        ancho: 38,
      },
      {
        etiqueta: 'TEMPERATURA',
        valor: detalle.triaje.temperatura
          ? `${detalle.triaje.temperatura} °C`
          : '---',
        ancho: 36,
      },
      {
        etiqueta: 'SATURACIÓN O2',
        valor: detalle.triaje.saturacion
          ? `${detalle.triaje.saturacion} %`
          : '---',
        ancho: 36,
      },
    ];

    const listaSignosFilaDos = [
      {
        etiqueta: 'PESO',
        valor: detalle.triaje.peso ? `${detalle.triaje.peso} kg` : '---',
        ancho: 36,
      },
      {
        etiqueta: 'TALLA',
        valor: detalle.triaje.talla ? `${detalle.triaje.talla} cm` : '---',
        ancho: 36,
      },
      {
        etiqueta: 'IMC',
        valor: detalle.triaje.imc ? `${detalle.triaje.imc}` : '---',
        ancho: 38,
      },
      {
        etiqueta: 'HEMOGLOBINA',
        valor: detalle.triaje.hemoglobina
          ? `${detalle.triaje.hemoglobina} g/dl`
          : '---',
        ancho: 36,
      },
      {
        etiqueta: 'FIO2',
        valor: detalle.triaje.fiO2 ? `${detalle.triaje.fiO2} %` : '---',
        ancho: 36,
      },
    ];

    let xSignos1 = MARGEN_IZQUIERDO + 5;
    const ySignosFila1 = posicionVertical + 3.8;
    for (const metrica of listaSignosFilaUno) {
      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(4.8);
      documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
      documentoPdf.text(metrica.etiqueta, xSignos1, ySignosFila1);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(6.5);
      documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
      documentoPdf.text(metrica.valor, xSignos1, ySignosFila1 + 3.8);

      xSignos1 += metrica.ancho;
    }

    const yDivSignos = ySignosFila1 + 5.2;
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.line(
      MARGEN_IZQUIERDO + 5,
      yDivSignos,
      MARGEN_DERECHO - 5,
      yDivSignos,
    );

    let xSignos2 = MARGEN_IZQUIERDO + 5;
    const ySignosFila2 = yDivSignos + 3.6;
    for (const metrica of listaSignosFilaDos) {
      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(4.8);
      documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
      documentoPdf.text(metrica.etiqueta, xSignos2, ySignosFila2);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(6.5);
      documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
      documentoPdf.text(metrica.valor, xSignos2, ySignosFila2 + 3.8);

      xSignos2 += metrica.ancho;
    }

    posicionVertical += altoTarjetaTriaje + 3.5;
  }

  const escribirBloqueEstilizado = (
    titulo: string,
    contenido: string | undefined,
  ): void => {
    if (!contenido || contenido.trim().length === 0) return;

    posicionVertical = verificarEspacioDisponible(
      documentoPdf,
      posicionVertical,
      18,
    );

    posicionVertical = dibujarTituloSeccionUnificado(
      documentoPdf,
      titulo,
      posicionVertical,
      MARGEN_IZQUIERDO,
      MARGEN_DERECHO,
    );

    const textoLimpio = contenido.trim().toUpperCase();
    const lineasBloque = documentoPdf.splitTextToSize(
      textoLimpio,
      ANCHO_PAGINA - 10,
    );
    const altoCaja = Math.max(9, lineasBloque.length * 3.4 + 4.5);

    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      MARGEN_IZQUIERDO,
      posicionVertical,
      ANCHO_PAGINA,
      altoCaja,
      0.8,
      0.8,
      'FD',
    );

    documentoPdf.setFillColor(...COLOR_PRIMARIO);
    documentoPdf.rect(MARGEN_IZQUIERDO, posicionVertical, 2.5, altoCaja, 'F');

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(6.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
    documentoPdf.text(lineasBloque, MARGEN_IZQUIERDO + 5, posicionVertical + 4.5);
    posicionVertical += altoCaja + 3.5;
  };

  escribirBloqueEstilizado('MOTIVO DE CONSULTA / ENFERMEDAD ACTUAL', detalle.motivo);
  escribirBloqueEstilizado('EXAMEN FÍSICO / CLÍNICO REGIONAL', detalle.examenClinico);
  escribirBloqueEstilizado('INFORMACIÓN COMPLEMENTARIA', detalle.inforCompDiagMed);

  if (detalle.diagnosticos && detalle.diagnosticos.length > 0) {
    posicionVertical = verificarEspacioDisponible(
      documentoPdf,
      posicionVertical,
      24,
    );

    posicionVertical = dibujarTituloSeccionUnificado(
      documentoPdf,
      'DIAGNÓSTICOS CLÍNICOS CODIFICADOS (CIE-10)',
      posicionVertical,
      MARGEN_IZQUIERDO,
      MARGEN_DERECHO,
    );

    const altoCabeceraDiag = 5.2;
    const colCieAncho = 26;
    const colTipoAncho = 32;
    const colCondicionAncho = 30;
    const colDescAncho = ANCHO_PAGINA - colCieAncho - colTipoAncho - colCondicionAncho;

    const colCieX = MARGEN_IZQUIERDO;
    const colDescX = colCieX + colCieAncho;
    const colTipoX = colDescX + colDescAncho;
    const colCondX = colTipoX + colTipoAncho;

    const dibujarCabeceraTablaDiagnosticos = (posYActual: number): void => {
      documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
      documentoPdf.roundedRect(
        MARGEN_IZQUIERDO,
        posYActual,
        ANCHO_PAGINA,
        altoCabeceraDiag,
        0.8,
        0.8,
        'F',
      );

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(5.8);
      documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
      documentoPdf.text('CÓDIGO CIE-10', colCieX + colCieAncho / 2, posYActual + 3.7, {
        align: 'center',
      });
      documentoPdf.text('DESCRIPCIÓN DEL DIAGNÓSTICO', colDescX + 3, posYActual + 3.7);
      documentoPdf.text('TIPO DIAGNÓSTICO', colTipoX + colTipoAncho / 2, posYActual + 3.7, {
        align: 'center',
      });
      documentoPdf.text('CONDICIÓN', colCondX + colCondicionAncho / 2, posYActual + 3.7, {
        align: 'center',
      });
    };

    dibujarCabeceraTablaDiagnosticos(posicionVertical);
    posicionVertical += altoCabeceraDiag + 0.8;

    detalle.diagnosticos.forEach((diagnostico, indice) => {
      const descripcionTexto = String(
        diagnostico.descripcion || 'SIN DESCRIPCIÓN',
      ).toUpperCase();
      const lineasDesc = documentoPdf.splitTextToSize(
        descripcionTexto,
        colDescAncho - 6,
      );
      const altoFila = Math.max(6.5, lineasDesc.length * 3.2 + 2.8);

      if (posicionVertical + altoFila > 260) {
        documentoPdf.addPage();
        posicionVertical = 20;
        dibujarCabeceraTablaDiagnosticos(posicionVertical);
        posicionVertical += altoCabeceraDiag + 0.8;
      }

      const fondoFila =
        indice % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      documentoPdf.setFillColor(...fondoFila);
      documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
      documentoPdf.setLineWidth(0.18);
      documentoPdf.roundedRect(
        MARGEN_IZQUIERDO,
        posicionVertical,
        ANCHO_PAGINA,
        altoFila,
        0.4,
        0.4,
        'FD',
      );

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(6.8);
      documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
      documentoPdf.text(
        formatearTextoSeguro(diagnostico.codigoCIE10),
        colCieX + colCieAncho / 2,
        posicionVertical + 3.8,
        { align: 'center' },
      );

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7.0);
      documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
      documentoPdf.text(lineasDesc, colDescX + 3, posicionVertical + 3.6);

      let tipoTexto = 'PRESUNTIVO';
      if (diagnostico.clasificacion === 'D') {
        tipoTexto = 'DEFINITIVO';
      } else if (diagnostico.clasificacion === 'R') {
        tipoTexto = 'REPETIDO';
      }
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(6.5);
      documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
      documentoPdf.text(
        tipoTexto,
        colTipoX + colTipoAncho / 2,
        posicionVertical + 3.8,
        { align: 'center' },
      );

      const condicionTexto = indice === 0 ? 'PRINCIPAL' : 'SECUNDARIO';
      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(6.2);
      documentoPdf.setTextColor(...COLOR_PRIMARIO);
      documentoPdf.text(
        condicionTexto,
        colCondX + colCondicionAncho / 2,
        posicionVertical + 3.8,
        { align: 'center' },
      );

      posicionVertical += altoFila;
    });

    posicionVertical += 3.5;
  }

  escribirBloqueEstilizado(
    'PLAN DE TRABAJO Y TRATAMIENTO',
    detalle.planTratamiento || detalle.tratamiento,
  );
  escribirBloqueEstilizado('OBSERVACIONES GENERALES', detalle.observaciones);
  escribirBloqueEstilizado(
    'SERVICIOS DE APOYO AL DIAGNÓSTICO',
    detalle.servicioApoyoAlDx,
  );
  escribirBloqueEstilizado('CONSUMO EN SERVICIO', detalle.consumoEnServicio);

  posicionVertical = verificarEspacioDisponible(
    documentoPdf,
    posicionVertical,
    14,
  );

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.8);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    `MÉDICO TRATANTE: ${(detalle.medicoNombre || 'MÉDICO').toUpperCase()}   •   FECHA ATENCIÓN: ${detalle.fechaAtencion || 'NO REGISTRADA'}`,
    MARGEN_IZQUIERDO,
    posicionVertical + 4.0,
  );
  posicionVertical += 7.0;

  const metadatos = calcularCoordenadasFirmaDinamica(
    documentoPdf,
    posicionVertical,
    2,
  );
  asignarMetadatosFirmaPdf(documentoPdf, metadatos);

  dibujarPiePaginaInstitucionalUnificado(documentoPdf, {
    nombreDocumento: `INFORME CLÍNICO — ${tipoServicioTitulo}`,
    codigoFormato: 'HNSEB-CE-INF-01',
    medicoNombre: detalle.medicoNombre,
    pacienteNombre: detalle.pacienteNombre,
    historiaClinica: detalle.nroHistoriaClinica,
  });

  return documentoPdf;
}

export async function generarDocumentoPdfReporteOperatorio(
  reporte: HistorialReporteOperatorioItem,
  pacienteNombre: string,
  historiaClinica: string,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });

  let posicionVertical = await dibujarEncabezadoInstitucional(
    documentoPdf,
    'REPORTE QUIRÚRGICO OFICIAL - FICHA OPERATORIA',
    `FECHA INTERVENCIÓN: ${reporte.fecha || 'NO REGISTRADA'}  •  CIRUJANO: ${reporte.cirujano || 'NO REGISTRADO'}`,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre,
    nroHistoriaClinica: historiaClinica,
    servicioNombre: reporte.servicio,
    consultorio: reporte.cama ? `CAMA: ${reporte.cama}` : undefined,
    medicoTratante: reporte.cirujano,
    fechaAtencion: reporte.fecha,
    horaAtencion: `${reporte.horaInicio || '--:--'} - ${reporte.horaFin || '--:--'}`,
    procedencia: 'CENTRO QUIRÚRGICO',
  };

  posicionVertical = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posicionVertical,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
  );

  const escribirCampo = (etiqueta: string, valor: string | undefined): void => {
    if (!valor || valor.trim().length === 0) return;
    posicionVertical = verificarEspacioDisponible(
      documentoPdf,
      posicionVertical,
      14,
    );

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

  posicionVertical = verificarEspacioDisponible(
    documentoPdf,
    posicionVertical,
    22,
  );
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.5);
  documentoPdf.setTextColor(30, 41, 59);
  documentoPdf.text(
    'EQUIPO QUIRÚRGICO Y DETALLES',
    MARGEN_IZQUIERDO,
    posicionVertical,
  );
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

  let posicionVertical = await dibujarEncabezadoInstitucional(
    documentoPdf,
    'INFORME OFICIAL DE PROCEDIMIENTO MÉDICO',
    `FECHA: ${procedimiento.fecha || 'NO REGISTRADA'}  •  MÉDICO: ${procedimiento.medico || 'NO REGISTRADO'}`,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre,
    nroHistoriaClinica: historiaClinica,
    servicioNombre: procedimiento.servicio,
    especialidadNombre: procedimiento.especialidad,
    medicoTratante: procedimiento.medico,
    fechaAtencion: procedimiento.fecha,
    procedencia: 'CONSULTORIOS EXTERNOS',
  };

  posicionVertical = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posicionVertical,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
  );

  const escribirCampo = (etiqueta: string, valor: string | undefined): void => {
    if (!valor || valor.trim().length === 0) return;
    posicionVertical = verificarEspacioDisponible(
      documentoPdf,
      posicionVertical,
      16,
    );

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
  const documentoPdf = await generarDocumentoPdfHistorialAtencion(
    detalle,
    tipoServicioTitulo,
  );
  const nombreLimpio = (detalle.pacienteNombre || 'paciente')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  const nombreArchivo = `atencion_${detalle.idCuentaAtencion}_${nombreLimpio}.pdf`;
  documentoPdf.save(nombreArchivo);
}

export async function imprimirPdfHistorialAtencion(
  detalle: HistorialAtencionDetalle,
  tipoServicioTitulo: string,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfHistorialAtencion(
    detalle,
    tipoServicioTitulo,
  );
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
  readonly edad: number | string;
  readonly sexo: string;
  readonly tipoFinanciador: string;
  readonly fechaAtencion: string;
  readonly servicioNombre: string;
  readonly medicoNombre: string;
  readonly diagnosticos: readonly DiagnosticoPdfItem[];
  readonly itemsReceta: readonly ItemRecetaPrescripcion[];
  readonly indicacionesGenerales?: string;
  readonly fechaProximaCita?: string;
  readonly numeroReceta?: string | number;
  readonly direccion?: string;
  readonly numeroFua?: string;
  readonly tipoAtencion?: string;
  readonly telefono?: string;
  readonly consultorio?: string;
  readonly cuentaAtencion?: string | number;
  readonly peso?: string;
  readonly talla?: string;
  readonly medicoColegiatura?: string;
  readonly medicoRegistroEspecialidad?: string;
  readonly medicoDni?: string;
  readonly usuario?: string;
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
  readonly medicoColegiatura?: string;
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
  readonly medicoColegiatura?: string;
  readonly medicoRNE?: string;
  readonly medicoDni?: string;
  readonly usuarioImpresion?: string;
  readonly fechaImpresion?: string;
  readonly numeroRecetaFarmacia?: string | number;
  readonly numeroRecetaOrdenes?: string | number;
  readonly referenciaEstablecimiento?: string;
  readonly referenciaServicio?: string;
  readonly referenciaMotivo?: string;
  readonly referenciaCondicion?: string;
  readonly ordenesLaboratorio?: readonly {
    readonly codigoCPT: string;
    readonly descripcionCPT: string;
  }[];
  readonly ordenesImagenes?: readonly {
    readonly codigoCPT: string;
    readonly descripcionCPT: string;
  }[];
}

export interface ItemOrdenLaboratorioPdf {
  readonly codigoCPT: string;
  readonly descripcionCPT: string;
  readonly cantidad: number;
  readonly justificacion: string;
}

export interface DatosPdfOrdenLaboratorio {
  readonly numeroOrden: string | number;
  readonly idCuentaAtencion: string | number;
  readonly nroHistoriaClinica: string | number;
  readonly fechaCita: string;
  readonly especialidadNombre: string;
  readonly tipoFinanciador: string;
  readonly servicioProcedencia: string;
  readonly pacienteNombre: string;
  readonly medicoNombre: string;
  readonly medicoColegiatura?: string;
  readonly medicoRegistroEspecialidad?: string;
  readonly medicoDni?: string;
  readonly edad: number | string;
  readonly fechaAtencion: string;
  readonly sexo: string;
  readonly ordenesLaboratorio: readonly ItemOrdenLaboratorioPdf[];
  readonly resumenHistoriaClinica?: string;
  readonly diagnosticos?: readonly {
    readonly codigoCIE10?: string;
    readonly descripcion: string;
  }[];
  readonly usuarioImpresion?: string;
  readonly fechaImpresion?: string;
}

export interface ItemOrdenImagenologiaPdf {
  readonly codigoCPT: string;
  readonly descripcionCPT: string;
  readonly cantidad: number;
  readonly justificacion: string;
}

export interface DatosPdfOrdenImagenologia {
  readonly numeroOrden: string | number;
  readonly numeroCaso: string | number;
  readonly subtipoEstudio?: string;
  readonly idCuentaAtencion: string | number;
  readonly nroHistoriaClinica: string | number;
  readonly fechaCita: string;
  readonly especialidadNombre: string;
  readonly tipoFinanciador: string;
  readonly servicioProcedencia: string;
  readonly pacienteNombre: string;
  readonly medicoNombre: string;
  readonly medicoColegiatura?: string;
  readonly medicoRegistroEspecialidad?: string;
  readonly medicoDni?: string;
  readonly edad: number | string;
  readonly fechaAtencion: string;
  readonly sexo: string;
  readonly ordenesImagenologia: readonly ItemOrdenImagenologiaPdf[];
  readonly sala?: string;
  readonly diagnosticos?: readonly {
    readonly codigoCIE10?: string;
    readonly descripcion: string;
  }[];
  readonly fechaProgramada?: string;
  readonly indicaciones?: string;
  readonly resumenHistoriaClinica?: string;
  readonly usuarioImpresion?: string;
  readonly fechaImpresion?: string;
}

export interface DatosPdfHojaInterconsulta {
  readonly nroHistoriaClinica: string | number;
  readonly idCuentaAtencion: string | number;
  readonly servicioOrigen: string;
  readonly servicioDestino: string;
  readonly pacienteNombre: string;
  readonly nroDocumento: string;
  readonly codigoPaciente?: string;
  readonly edad: number | string;
  readonly sexo?: string;
  readonly tipoFinanciador?: string;
  readonly medicoNombre?: string;
  readonly fechaSolicitud: string;
  readonly fechaPropuesta: string;
  readonly resumenEnfermedadActual: string;
  readonly motivoInterconsulta: string;
  readonly diagnosticoAtencion: string;
  readonly usuarioImpresion?: string;
  readonly fechaImpresion?: string;
  readonly medicoSolicitante?: string;
  readonly medicoColegiatura?: string;
  readonly medicoRegistroEspecialidad?: string;
  readonly medicoDni?: string;
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
  readonly medicoColegiatura?: string;
  readonly medicoRegistroEspecialidad?: string;
  readonly medicoDni?: string;
  readonly diagnosticoPrincipal: string;
  readonly codigoCIE10: string;
  readonly diasDescanso: number;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly tipoReposo: string;
  readonly observaciones?: string;
}

function dibujarTalonRecetaOficial(
  documentoPdf: jsPDF,
  datos: DatosPdfRecetaMedica,
  subtituloTalon: 'RECETA - FARMACIA' | 'RECETA - PACIENTE',
  posicionInicialVertical: number,
  datosInstitucion?: DatosInstitucionCache | null,
): number {
  const margenIzquierdo = MARGEN_IZQUIERDO;
  const margenDerecho = MARGEN_DERECHO;
  const anchoContenido = ANCHO_PAGINA;

  documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.rect(
    margenIzquierdo,
    posicionInicialVertical,
    anchoContenido,
    1.8,
    'F',
  );
  documentoPdf.setFillColor(...COLOR_PRIMARIO_ACENTO);
  documentoPdf.rect(
    margenIzquierdo,
    posicionInicialVertical + 1.8,
    anchoContenido,
    0.5,
    'F',
  );

  const logoUnicoIzquierda =
    datosInstitucion?.logoMinsa || datosInstitucion?.logoHospi;
  if (logoUnicoIzquierda) {
    try {
      const fuenteLogo = logoUnicoIzquierda.startsWith('data:')
        ? logoUnicoIzquierda
        : `data:image/png;base64,${logoUnicoIzquierda}`;
      documentoPdf.addImage(
        fuenteLogo,
        'PNG',
        margenIzquierdo + 1,
        posicionInicialVertical + 2.5,
        14,
        14,
      );
    } catch {
      // Continuar sin logo
    }
  }

  const anchoRecuadroFirma = 40;
  const altoRecuadroFirma = 19;
  const xRecuadroFirma = margenDerecho - anchoRecuadroFirma;
  const yRecuadroFirma = posicionInicialVertical + 2.5;

  if (subtituloTalon === 'RECETA - FARMACIA') {
    // Espacio superior derecho libre y limpio para la estampa digital de Firma Perú
  } else {
    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_MEDIO);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      xRecuadroFirma,
      yRecuadroFirma,
      anchoRecuadroFirma,
      altoRecuadroFirma,
      0.8,
      0.8,
      'FD',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.0);
    documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.text(
      'CONTROL DE DISPENSACIÓN',
      xRecuadroFirma + anchoRecuadroFirma / 2,
      yRecuadroFirma + 5.5,
      { align: 'center' },
    );

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(4.0);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(
      'FARMACIA INSTITUCIONAL — HNSEB',
      xRecuadroFirma + anchoRecuadroFirma / 2,
      yRecuadroFirma + 9.0,
      { align: 'center' },
    );
    documentoPdf.text(
      'FECHA: ____/____/202__   TURNO: [M] [T]',
      xRecuadroFirma + anchoRecuadroFirma / 2,
      yRecuadroFirma + 12.5,
      { align: 'center' },
    );
    documentoPdf.text(
      'SELLO Y FIRMA DEL DISPENSADOR',
      xRecuadroFirma + anchoRecuadroFirma / 2,
      yRecuadroFirma + 16.0,
      { align: 'center' },
    );
  }

  const xInicioCentro = margenIzquierdo + 17;
  const xFinCentro = margenDerecho - anchoRecuadroFirma - 2;
  const centroHorizontal = (xInicioCentro + xFinCentro) / 2;

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.5);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    'GOBIERNO DEL PERÚ  •  MINISTERIO DE SALUD',
    centroHorizontal,
    posicionInicialVertical + 4.5,
    { align: 'center' },
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(9.0);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(
    'HOSPITAL NACIONAL SERGIO E. BERNALES',
    centroHorizontal,
    posicionInicialVertical + 8.5,
    { align: 'center' },
  );

  const anchoBanner = Math.min(110, xFinCentro - xInicioCentro);
  const altoBanner = 4.5;
  const xBanner = centroHorizontal - anchoBanner / 2;
  const yBanner = posicionInicialVertical + 10.0;

  documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.roundedRect(
    xBanner,
    yBanner,
    anchoBanner,
    altoBanner,
    0.6,
    0.6,
    'F',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.2);
  documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
  documentoPdf.text(
    `FORMATO OFICIAL DE PRESCRIPCIÓN Y DISPENSACIÓN — ${subtituloTalon}`,
    centroHorizontal,
    yBanner + 3.1,
    { align: 'center' },
  );

  const posicionVerticalFiliacion = posicionInicialVertical + 19.5;

  const textoEdad = datos.edad ? `${datos.edad} AÑOS` : 'NO REG.';
  const textoSexo = datos.sexo ? String(datos.sexo).toUpperCase() : 'NO REG.';
  const textoFinanciador = formatearTextoSeguro(
    datos.tipoFinanciador || 'SIS',
  ).toUpperCase();
  const textoConsultorio = formatearTextoSeguro(
    datos.consultorio || datos.servicioNombre || 'CONSULTORIO GENERAL',
  ).toUpperCase();
  const textoEspecialidad = formatearTextoSeguro(
    datos.servicioNombre || 'CONSULTA EXTERNA',
  ).toUpperCase();

  const columnasFilaUno = [
    { etiqueta: 'EDAD', valor: textoEdad, ancho: 22 },
    { etiqueta: 'SEXO', valor: textoSexo, ancho: 22 },
    { etiqueta: 'FINANCIADOR', valor: textoFinanciador, ancho: 30 },
    { etiqueta: 'ESPECIALIDAD', valor: textoEspecialidad, ancho: 54 },
    { etiqueta: 'CONSULTORIO', valor: textoConsultorio, ancho: 54 },
  ];

  let medicoTexto = formatearTextoSeguro(
    datos.medicoNombre || 'MÉDICO TRATANTE',
  ).toUpperCase();
  if (datos.medicoColegiatura) {
    medicoTexto += `  •  CMP: ${datos.medicoColegiatura}`;
  }

  const columnasFilaDos = [
    { etiqueta: 'MÉDICO PRESCRIPTOR', valor: medicoTexto, ancho: 82 },
    {
      etiqueta: 'F. ATENCIÓN',
      valor: formatearFechaCorta(datos.fechaAtencion),
      ancho: 30,
    },
    {
      etiqueta: 'N° RECETA',
      valor: formatearTextoSeguro(datos.numeroReceta || datos.cuentaAtencion || '---'),
      ancho: 34,
    },
    {
      etiqueta: 'NRO. FUA',
      valor: formatearTextoSeguro(datos.numeroFua || '---'),
      ancho: 36,
    },
  ];

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.5);

  let maximoLineasFilaUno = 1;
  const celdasFilaUno = columnasFilaUno.map((columna) => {
    const lineas = documentoPdf.splitTextToSize(
      columna.valor,
      columna.ancho - 2,
    );
    if (lineas.length > maximoLineasFilaUno) {
      maximoLineasFilaUno = lineas.length;
    }
    return { ...columna, lineas };
  });
  const altoFilaUno = Math.max(8.5, maximoLineasFilaUno * 3.0 + 4.2);

  let maximoLineasFilaDos = 1;
  const celdasFilaDos = columnasFilaDos.map((columna) => {
    const lineas = documentoPdf.splitTextToSize(
      columna.valor,
      columna.ancho - 2,
    );
    if (lineas.length > maximoLineasFilaDos) {
      maximoLineasFilaDos = lineas.length;
    }
    return { ...columna, lineas };
  });
  const altoFilaDos = Math.max(8.5, maximoLineasFilaDos * 3.0 + 4.2);

  const diagnosticosLista = datos.diagnosticos || [];
  const textoDiagnostico =
    diagnosticosLista.length > 0
      ? diagnosticosLista
        .map((diagnostico) =>
          diagnostico.codigoCIE10
            ? `[${diagnostico.codigoCIE10}] ${diagnostico.descripcion.toUpperCase()}`
            : diagnostico.descripcion.toUpperCase(),
        )
        .join('   •   ')
      : 'NO REGISTRADO';
  const lineasDiagnostico = documentoPdf.splitTextToSize(
    textoDiagnostico,
    anchoContenido - 30,
  );
  const altoFilaDiagnostico = Math.max(
    5.8,
    lineasDiagnostico.length * 2.8 + 3.0,
  );

  const altoCabeceraTarjeta = 7.5;
  const alturaTotalFiliacion =
    altoCabeceraTarjeta + altoFilaUno + altoFilaDos + altoFilaDiagnostico + 1.2;

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_MEDIO);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionVerticalFiliacion,
    anchoContenido,
    alturaTotalFiliacion,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.rect(
    margenIzquierdo,
    posicionVerticalFiliacion,
    2.4,
    alturaTotalFiliacion,
    'F',
  );

  const xInterior = margenIzquierdo + 4;
  const yHeader = posicionVerticalFiliacion + 4.2;

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('PACIENTE:', xInterior, yHeader);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7.6);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(
    formatearTextoSeguro(datos.pacienteNombre).toUpperCase(),
    xInterior + 14,
    yHeader,
    { maxWidth: anchoContenido - 74 },
  );

  const textoBadgePaciente = `HC: ${datos.nroHistoriaClinica || '---'}   •   DNI: ${datos.nroDocumento || '---'}`;
  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.roundedRect(
    margenDerecho - 54,
    yHeader - 3.4,
    52,
    4.5,
    0.6,
    0.6,
    'F',
  );
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.4);
  documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
  documentoPdf.text(textoBadgePaciente, margenDerecho - 28, yHeader - 0.4, {
    align: 'center',
  });

  const yDiv1 = yHeader + 2.8;
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.line(xInterior, yDiv1, margenDerecho - 3, yDiv1);

  const yFila1 = yDiv1 + 3.2;
  let xCursorFila1 = xInterior;
  for (const columna of celdasFilaUno) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(4.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(columna.etiqueta, xCursorFila1, yFila1);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.4);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    for (let i = 0; i < columna.lineas.length; i++) {
      documentoPdf.text(columna.lineas[i], xCursorFila1, yFila1 + 3.0 + i * 2.8);
    }
    xCursorFila1 += columna.ancho;
  }

  const yFila2 = yFila1 + altoFilaUno;
  let xCursorFila2 = xInterior;
  for (const columna of celdasFilaDos) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(4.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(columna.etiqueta, xCursorFila2, yFila2);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.4);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    for (let i = 0; i < columna.lineas.length; i++) {
      documentoPdf.text(columna.lineas[i], xCursorFila2, yFila2 + 3.0 + i * 2.8);
    }
    xCursorFila2 += columna.ancho;
  }

  const yFilaDiag = yFila2 + altoFilaDos;
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(4.8);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('DIAGNÓSTICO CIE-10:', xInterior, yFilaDiag);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  for (let i = 0; i < lineasDiagnostico.length; i++) {
    documentoPdf.text(lineasDiagnostico[i], xInterior + 26, yFilaDiag + i * 2.8);
  }

  let posicionVerticalTabla =
    posicionVerticalFiliacion + alturaTotalFiliacion + 4.5;

  const altoCabeceraTabla = 5.2;
  documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionVerticalTabla,
    anchoContenido,
    altoCabeceraTabla,
    0.6,
    0.6,
    'F',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.6);
  documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
  documentoPdf.text('ITEM', margenIzquierdo + 5.0, posicionVerticalTabla + 3.5, {
    align: 'center',
  });
  documentoPdf.text(
    'MEDICAMENTO / CONCENTRACIÓN / FORMA FARMACÉUTICA',
    margenIzquierdo + 11.0,
    posicionVerticalTabla + 3.5,
  );
  documentoPdf.text(
    'FORMA FARM.',
    margenIzquierdo + 99.0,
    posicionVerticalTabla + 3.5,
    { align: 'center' },
  );
  documentoPdf.text(
    'DOSIS / FRECUENCIA / VÍA / DURACIÓN',
    margenIzquierdo + 113.0,
    posicionVerticalTabla + 3.5,
  );
  documentoPdf.text('CANT.', margenDerecho - 9.0, posicionVerticalTabla + 3.5, {
    align: 'center',
  });

  posicionVerticalTabla += altoCabeceraTabla + 0.6;

  let indiceMedicamento = 1;
  const listaItems = datos.itemsReceta || [];
  for (const itemActual of listaItems) {
    const dosisTexto =
      `${itemActual.dosis || '1'} C\\${itemActual.frecuencia || '24 HORAS'}, POR ${itemActual.duracion || '30 DÍAS'}`.toUpperCase();
    const viaTexto = `VÍA: ${(itemActual.via || 'ORAL').toUpperCase()}`;

    const codigoTexto = itemActual.codigo ? `[${itemActual.codigo}] ` : '';
    const concentracionTexto = itemActual.concentracion
      ? ` ${itemActual.concentracion}`
      : '';
    const presentacionTexto = itemActual.formaFarmaceutica
      ? ` ${itemActual.formaFarmaceutica}`
      : '';
    const nombreMedicamento =
      `${codigoTexto}${itemActual.nombre}${concentracionTexto}${presentacionTexto}`
        .trim()
        .toUpperCase();

    const lineasNombre = documentoPdf.splitTextToSize(nombreMedicamento, 74);
    const lineasPosologia = documentoPdf.splitTextToSize(
      `${dosisTexto}  •  ${viaTexto}`,
      50,
    );
    const lineasTotales = Math.max(
      lineasNombre.length,
      lineasPosologia.length,
      1,
    );
    const altoFila = Math.max(6.2, lineasTotales * 3.0 + 2.4);

    const fondoFila =
      indiceMedicamento % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
    documentoPdf.setFillColor(...fondoFila);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posicionVerticalTabla,
      anchoContenido,
      altoFila,
      0.4,
      0.4,
      'FD',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.4);
    documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.text(
      String(indiceMedicamento),
      margenIzquierdo + 5.0,
      posicionVerticalTabla + 3.8,
      { align: 'center' },
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    documentoPdf.text(
      lineasNombre,
      margenIzquierdo + 11.0,
      posicionVerticalTabla + 3.6,
    );

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(6.2);
    documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
    documentoPdf.text(
      (itemActual.formaFarmaceutica || 'TABLETA').toUpperCase(),
      margenIzquierdo + 99.0,
      posicionVerticalTabla + 3.8,
      { align: 'center' },
    );

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(6.4);
    documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
    documentoPdf.text(
      lineasPosologia,
      margenIzquierdo + 113.0,
      posicionVerticalTabla + 3.6,
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(8.0);
    documentoPdf.setTextColor(...COLOR_PRIMARIO);
    documentoPdf.text(
      String(itemActual.cantidad || 1),
      margenDerecho - 9.0,
      posicionVerticalTabla + 3.8,
      { align: 'center' },
    );

    posicionVerticalTabla += altoFila;
    indiceMedicamento += 1;
  }

  if (listaItems.length === 0) {
    const altoFilaVacia = 7.0;
    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posicionVerticalTabla,
      anchoContenido,
      altoFilaVacia,
      0.4,
      0.4,
      'FD',
    );
    documentoPdf.setFont('helvetica', 'italic');
    documentoPdf.setFontSize(6.2);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(
      'SIN PRESCRIPCIÓN DE MEDICAMENTOS PARA ESTA ATENCIÓN',
      (margenIzquierdo + margenDerecho) / 2,
      posicionVerticalTabla + 4.5,
      { align: 'center' },
    );
    posicionVerticalTabla += altoFilaVacia;
  }

  posicionVerticalTabla += 1.8;
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.line(
    margenIzquierdo,
    posicionVerticalTabla,
    margenDerecho,
    posicionVerticalTabla,
  );
  posicionVerticalTabla += 1.5;

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.4);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);

  if (subtituloTalon === 'RECETA - PACIENTE') {
    const textoPiePaciente = `USUARIO: ${(datos.usuario || 'MÉDICO').toUpperCase()}   •   MÉDICO TRATANTE: ${(datos.medicoNombre || 'MÉDICO').toUpperCase()}   •   RECETA VÁLIDA POR 72 HORAS`;
    documentoPdf.text(
      textoPiePaciente,
      margenIzquierdo + 1,
      posicionVerticalTabla + 2.8,
    );
  } else {
    const textoPieFarmacia =
      'DISPENSACIÓN EN FARMACIA: CONSERVAR TALÓN OFICIAL PARA EXPEDIENTE   •   RECETA VÁLIDA POR 72 HORAS   •   HNSEB';
    documentoPdf.text(
      textoPieFarmacia,
      margenIzquierdo + 1,
      posicionVerticalTabla + 2.8,
    );
  }

  return posicionVerticalTabla + 4.0;
}

export async function generarDocumentoPdfRecetaMedica(
  datos: DatosPdfRecetaMedica,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const datosInstitucion = await obtenerDatosInstitucionCache();

  dibujarTalonRecetaOficial(
    documentoPdf,
    datos,
    'RECETA - FARMACIA',
    6,
    datosInstitucion,
  );

  documentoPdf.setDrawColor(...COLOR_BORDE_MEDIO);
  documentoPdf.setLineDashPattern([2, 2], 0);
  documentoPdf.line(MARGEN_IZQUIERDO, 145, MARGEN_DERECHO, 145);
  documentoPdf.setLineDashPattern([], 0);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(4.6);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    'CORTE AQUÍ  —  TALÓN FARMACIA (ARRIBA)  /  TALÓN PACIENTE (ABAJO)',
    105,
    144.2,
    { align: 'center' },
  );

  dibujarTalonRecetaOficial(
    documentoPdf,
    datos,
    'RECETA - PACIENTE',
    149,
    datosInstitucion,
  );

  asignarMetadatosFirmaPdf(documentoPdf, {
    stampPage: 1,
    positionX: 435,
    positionY: 28,
  });

  return documentoPdf;
}

export async function generarBlobPdfRecetaMedica(
  datos: DatosPdfRecetaMedica,
): Promise<Blob> {
  const documentoPdf = await generarDocumentoPdfRecetaMedica(datos);
  return documentoPdf.output('blob');
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
  const margenIzquierdo = MARGEN_IZQUIERDO;
  const margenDerecho = MARGEN_DERECHO;
  const anchoContenido = ANCHO_PAGINA;

  const datosInstitucion = await obtenerDatosInstitucionCache();

  let posicionVertical = dibujarEncabezadoInstitucionalUnificado(
    documentoPdf,
    'SOLICITUD DE EXÁMENES DE APOYO AL DIAGNÓSTICO',
    `CONSULTA EXTERNA  •  FECHA: ${datos.fechaAtencion || 'NO REGISTRADA'}  •  FINANCIADOR: ${datos.tipoFinanciador || 'SIS'}`,
    datosInstitucion,
    margenIzquierdo,
    margenDerecho,
    210,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre: datos.pacienteNombre,
    nroHistoriaClinica: datos.nroHistoriaClinica,
    nroDocumento: datos.nroDocumento,
    edad: datos.edad,
    sexo: datos.sexo,
    servicioNombre: datos.servicioNombre,
    especialidadNombre: datos.servicioNombre,
    consultorio: datos.servicioNombre,
    medicoTratante: datos.medicoNombre,
    medicoColegiatura: datos.medicoColegiatura,
    tipoFinanciador: datos.tipoFinanciador || 'SIS',
    fechaAtencion: datos.fechaAtencion,
    procedencia: 'CONSULTORIOS EXTERNOS',
  };

  posicionVertical = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posicionVertical,
    margenIzquierdo,
    margenDerecho,
  );

  if (datos.diagnosticos && datos.diagnosticos.length > 0) {
    posicionVertical = dibujarTituloSeccionUnificado(
      documentoPdf,
      'DIAGNÓSTICOS ASOCIADOS A LA SOLICITUD',
      posicionVertical,
      margenIzquierdo,
      margenDerecho,
    );

    const textoDiagnosticos = datos.diagnosticos
      .map((d) => (d.codigoCIE10 ? `[${d.codigoCIE10}] ${d.descripcion.toUpperCase()}` : d.descripcion.toUpperCase()))
      .join('   •   ');
    const lineasDiag = documentoPdf.splitTextToSize(textoDiagnosticos, anchoContenido - 8);
    const altoCajaDiag = Math.max(8.0, lineasDiag.length * 3.0 + 3.5);

    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(margenIzquierdo, posicionVertical, anchoContenido, altoCajaDiag, 0.8, 0.8, 'FD');

    documentoPdf.setFillColor(...COLOR_PRIMARIO);
    documentoPdf.rect(margenIzquierdo, posicionVertical, 2.5, altoCajaDiag, 'F');

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.4);
    documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.text(lineasDiag, margenIzquierdo + 5, posicionVertical + 3.8);
    posicionVertical += altoCajaDiag + 2.8;
  }

  posicionVertical = dibujarTituloSeccionUnificado(
    documentoPdf,
    'EXÁMENES Y PROCEDIMIENTOS SOLICITADOS',
    posicionVertical,
    margenIzquierdo,
    margenDerecho,
  );

  const altoCabecera = 5.2;
  const colNumAncho = 10;
  const colProcAncho = 82;
  const colServAncho = 32;
  const colCantAncho = 16;
  const colJustAncho = 42;

  documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.roundedRect(margenIzquierdo, posicionVertical, anchoContenido, altoCabecera, 0.8, 0.8, 'F');

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.8);
  documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
  documentoPdf.text('#', margenIzquierdo + colNumAncho / 2, posicionVertical + 3.6, { align: 'center' });
  documentoPdf.text('EXAMEN / ESTUDIO SOLICITADO', margenIzquierdo + colNumAncho + 2, posicionVertical + 3.6);
  documentoPdf.text('SERVICIO DESTINO', margenIzquierdo + colNumAncho + colProcAncho + 2, posicionVertical + 3.6);
  documentoPdf.text('CANT.', margenIzquierdo + colNumAncho + colProcAncho + colServAncho + colCantAncho / 2, posicionVertical + 3.6, { align: 'center' });
  documentoPdf.text('JUSTIFICACIÓN / INDICACIÓN', margenIzquierdo + colNumAncho + colProcAncho + colServAncho + colCantAncho + 2, posicionVertical + 3.6);

  posicionVertical += altoCabecera + 0.6;

  if (datos.ordenesApoyo.length === 0) {
    const altoVacio = 7.5;
    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(margenIzquierdo, posicionVertical, anchoContenido, altoVacio, 0.4, 0.4, 'FD');
    documentoPdf.setFont('helvetica', 'italic');
    documentoPdf.setFontSize(6.5);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text('NO SE REGISTRARON SOLICITUDES DE APOYO DIAGNÓSTICO.', (margenIzquierdo + margenDerecho) / 2, posicionVertical + 4.8, { align: 'center' });
    posicionVertical += altoVacio + 3.0;
  } else {
    let indice = 1;
    for (const item of datos.ordenesApoyo) {
      const lineasProc = documentoPdf.splitTextToSize(String(item.nombreProcedimiento || '').toUpperCase(), colProcAncho - 4);
      const justificacionTexto = item.justificacion || item.observacion || 'CONTROL CLÍNICO';
      const lineasJust = documentoPdf.splitTextToSize(String(justificacionTexto).toUpperCase(), colJustAncho - 4);
      const maxLineas = Math.max(lineasProc.length, lineasJust.length, 1);
      const altoFila = Math.max(6.2, maxLineas * 3.0 + 2.4);

      if (posicionVertical + altoFila > 250) {
        documentoPdf.addPage();
        posicionVertical = 20;
      }

      const fondoFila = indice % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      documentoPdf.setFillColor(...fondoFila);
      documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
      documentoPdf.setLineWidth(0.18);
      documentoPdf.roundedRect(margenIzquierdo, posicionVertical, anchoContenido, altoFila, 0.4, 0.4, 'FD');

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(6.4);
      documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
      documentoPdf.text(String(indice), margenIzquierdo + colNumAncho / 2, posicionVertical + 3.8, { align: 'center' });

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(6.8);
      documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
      documentoPdf.text(lineasProc, margenIzquierdo + colNumAncho + 2, posicionVertical + 3.6);

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(6.2);
      documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
      documentoPdf.text(String(item.servicio || 'LABORATORIO').toUpperCase(), margenIzquierdo + colNumAncho + colProcAncho + 2, posicionVertical + 3.8);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(7.5);
      documentoPdf.setTextColor(...COLOR_PRIMARIO);
      documentoPdf.text(String(item.cantidad || 1), margenIzquierdo + colNumAncho + colProcAncho + colServAncho + colCantAncho / 2, posicionVertical + 3.8, { align: 'center' });

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(6.0);
      documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
      documentoPdf.text(lineasJust, margenIzquierdo + colNumAncho + colProcAncho + colServAncho + colCantAncho + 2, posicionVertical + 3.6);

      posicionVertical += altoFila;
      indice++;
    }
  }

  posicionVertical += 3.0;
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    `MÉDICO SOLICITANTE: ${(datos.medicoNombre || 'MÉDICO').toUpperCase()}   •   FECHA DE EMISIÓN: ${datos.fechaAtencion || new Date().toLocaleDateString()}`,
    margenIzquierdo,
    posicionVertical,
  );

  asignarMetadatosFirmaPdf(documentoPdf, {
    stampPage: 1,
    positionX: 435,
    positionY: 28,
  });

  dibujarPiePaginaInstitucionalUnificado(documentoPdf, {
    nombreDocumento: 'SOLICITUD DE APOYO AL DIAGNÓSTICO',
    codigoFormato: 'HNSEB-APO-CE-01',
    medicoNombre: datos.medicoNombre,
    pacienteNombre: datos.pacienteNombre,
    historiaClinica: datos.nroHistoriaClinica,
    margenIzquierdo,
    margenDerecho,
  });

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
  const margenIzquierdo = 11;
  const margenDerecho = 199;
  const anchoContenido = margenDerecho - margenIzquierdo;

  const datosInstitucion = await obtenerDatosInstitucionCache();

  let posY = dibujarEncabezadoInstitucionalUnificado(
    documentoPdf,
    'HISTORIA CLÍNICA ELECTRÓNICA — RESUMEN DE ATENCIÓN MÉDICA',
    undefined,
    datosInstitucion,
    margenIzquierdo,
    margenDerecho,
    210,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre: ficha.pacienteNombre,
    nroHistoriaClinica: ficha.nroHistoriaClinica,
    nroDocumento: ficha.nroDocumento,
    idCuentaAtencion: ficha.idCuentaAtencion,
    edad: ficha.edad,
    sexo: ficha.sexo,
    servicioNombre: ficha.especialidadNombre || 'CONSULTA EXTERNA',
    especialidadNombre: ficha.especialidadNombre,
    consultorio: ficha.especialidadNombre,
    tipoFinanciador: ficha.iafa || 'SIS',
    medicoTratante: datos.medicoNombre || ficha.medicoNombre,
    medicoColegiatura: datos.medicoColegiatura,
    medicoRne: datos.medicoRNE,
    fechaAtencion: datos.fechaConsultaFormateada || ficha.fechaAtencion,
    horaAtencion: ficha.horaIngreso,
    procedencia: 'CONSULTA EXTERNA',
  };

  posY = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posY,
    margenIzquierdo,
    margenDerecho,
  );

  posY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'DATOS DEL TRIAJE — SIGNOS VITALES',
    undefined,
    posY,
    margenIzquierdo,
    margenDerecho,
  );

  const triaje = datos.triaje;
  const altoTarjetaTriaje = 19;

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_MEDIO);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posY,
    anchoContenido,
    altoTarjetaTriaje,
    1.2,
    1.2,
    'FD',
  );

  const metricasTriajeFilaUno = [
    {
      etiqueta: 'PULSO',
      valor: String(triaje?.frecuenciaCardiaca || '---'),
      ancho: 28,
    },
    {
      etiqueta: 'FREC. CARDIACA',
      valor: triaje?.frecuenciaCardiaca
        ? `${triaje.frecuenciaCardiaca} lpm`
        : '---',
      ancho: 38,
    },
    {
      etiqueta: 'PRESIÓN ARTERIAL',
      valor: String(triaje?.presionArterial || '---/---'),
      ancho: 44,
    },
    {
      etiqueta: 'TEMPERATURA',
      valor: triaje?.temperatura ? `${triaje.temperatura} °C` : '---',
      ancho: 38,
    },
    {
      etiqueta: 'FREC. RESPIRATORIA',
      valor: triaje?.frecuenciaRespiratoria
        ? `${triaje.frecuenciaRespiratoria} rpm`
        : '---',
      ancho: 40,
    },
  ];

  const metricasTriajeFilaDos = [
    {
      etiqueta: 'PESO',
      valor: triaje?.peso ? `${triaje.peso} kg` : '---',
      ancho: 28,
    },
    {
      etiqueta: 'TALLA',
      valor: triaje?.talla ? `${triaje.talla} cm` : '---',
      ancho: 38,
    },
    { etiqueta: 'IMC', valor: String(triaje?.imc || '---'), ancho: 44 },
    {
      etiqueta: 'PERÍMETRO CEFÁLICO',
      valor: triaje?.perimetroCefalico
        ? `${triaje.perimetroCefalico} cm`
        : '---',
      ancho: 42,
    },
    {
      etiqueta: 'SATURACIÓN O2',
      valor: triaje?.saturacion ? `${triaje.saturacion} %` : '---',
      ancho: 36,
    },
  ];

  let xTriaje1 = margenIzquierdo + 4;
  const yTriajeFila1 = posY + 3.8;
  for (const metrica of metricasTriajeFilaUno) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(4.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(metrica.etiqueta, xTriaje1, yTriajeFila1);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.5);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    documentoPdf.text(metrica.valor, xTriaje1, yTriajeFila1 + 3.8);

    xTriaje1 += metrica.ancho;
  }

  const yDivTriaje = yTriajeFila1 + 5.2;
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.line(
    margenIzquierdo + 4,
    yDivTriaje,
    margenDerecho - 4,
    yDivTriaje,
  );

  let xTriaje2 = margenIzquierdo + 4;
  const yTriajeFila2 = yDivTriaje + 3.6;
  for (const metrica of metricasTriajeFilaDos) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(4.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(metrica.etiqueta, xTriaje2, yTriajeFila2);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.5);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    documentoPdf.text(metrica.valor, xTriaje2, yTriajeFila2 + 3.8);

    xTriaje2 += metrica.ancho;
  }

  posY += altoTarjetaTriaje + 3.5;

  const asegurarEspacioDisponible = (alturaRequerida: number): void => {
    if (posY + alturaRequerida > 260) {
      documentoPdf.addPage();
      posY = 20;
    }
  };

  asegurarEspacioDisponible(24);
  posY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'ANAMNESIS Y MOTIVO DE CONSULTA',
    posY,
    margenIzquierdo,
    margenDerecho,
  );

  const relatoTexto = String(
    ficha.motivo ||
    'PACIENTE ACUDE A CONSULTA EXTERNA PARA EVALUACIÓN CLÍNICA INTEGRAL Y SEGUIMIENTO.',
  ).toUpperCase();
  const lineasRelato = documentoPdf.splitTextToSize(
    relatoTexto,
    anchoContenido - 8,
  );

  const antecedentesConsultaTexto = ficha.antecedente
    ? `RELACIONADOS: ${String(ficha.antecedente).toUpperCase()}`
    : '';
  const patologicosTexto = ficha.inforCompDiagMed
    ? `PATOLÓGICOS: ${String(ficha.inforCompDiagMed).toUpperCase()}`
    : 'PATOLÓGICOS: NIEGA';
  const textoAntecedentesCompleto = [antecedentesConsultaTexto, patologicosTexto, 'QUIRÚRGICOS: NIEGA']
    .filter(Boolean)
    .join('   •   ');
  const lineasAntecedentes = documentoPdf.splitTextToSize(
    textoAntecedentesCompleto,
    anchoContenido - 8,
  );

  const altoCajaAnamnesis = Math.max(
    14,
    (lineasRelato.length + lineasAntecedentes.length) * 3.2 + 8,
  );

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posY,
    anchoContenido,
    altoCajaAnamnesis,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_PRIMARIO);
  documentoPdf.text('RELATO DE LA ENFERMEDAD ACTUAL:', margenIzquierdo + 4, posY + 3.8);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.8);
  documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
  documentoPdf.text(lineasRelato, margenIzquierdo + 4, posY + 7.2);

  const yAntecedentes = posY + 7.2 + lineasRelato.length * 3.2 + 1.5;
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.0);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('ANTECEDENTES CLÍNICOS:', margenIzquierdo + 4, yAntecedentes);

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.4);
  documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
  documentoPdf.text(lineasAntecedentes, margenIzquierdo + 4, yAntecedentes + 3.4);

  posY += altoCajaAnamnesis + 3.0;

  asegurarEspacioDisponible(20);
  posY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'EXAMEN CLÍNICO REGIONAL Y GENERAL',
    posY,
    margenIzquierdo,
    margenDerecho,
  );

  const examenTexto = String(
    ficha.examenClinico ||
    'PACIENTE EN APARENTE BUEN ESTADO GENERAL, CONSCIENTE, LÚCIDO, ORIENTADO EN TIEMPO, ESPACIO Y PERSONA. VENTILANDO ESPONTÁNEAMENTE.',
  ).toUpperCase();
  const lineasExamen = documentoPdf.splitTextToSize(
    examenTexto,
    anchoContenido - 8,
  );
  const altoCajaExamen = Math.max(9, lineasExamen.length * 3.2 + 4.5);

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posY,
    anchoContenido,
    altoCajaExamen,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.8);
  documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
  documentoPdf.text(lineasExamen, margenIzquierdo + 4, posY + 4.2);
  posY += altoCajaExamen + 3.0;

  const diagnosticos = ficha.diagnosticos || [];
  asegurarEspacioDisponible(24);
  posY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'DIAGNÓSTICOS CLÍNICOS CODIFICADOS (CIE-10)',
    posY,
    margenIzquierdo,
    margenDerecho,
  );

  const altoCabeceraDiag = 5.2;
  const colCieAncho = 26;
  const colTipoDiagAncho = 32;
  const colDescDiagAncho = anchoContenido - colCieAncho - colTipoDiagAncho;

  const colCieX = margenIzquierdo;
  const colDescDiagX = colCieX + colCieAncho;
  const colTipoDiagX = colDescDiagX + colDescDiagAncho;

  const dibujarEncabezadoDiagnosticos = (posYActual: number): void => {
    documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posYActual,
      anchoContenido,
      altoCabeceraDiag,
      0.8,
      0.8,
      'F',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.5);
    documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
    documentoPdf.text(
      'CÓDIGO CIE-10',
      colCieX + colCieAncho / 2,
      posYActual + 3.5,
      { align: 'center' },
    );
    documentoPdf.text(
      'DESCRIPCIÓN DEL DIAGNÓSTICO',
      colDescDiagX + 3,
      posYActual + 3.5,
    );
    documentoPdf.text(
      'TIPO DIAGNÓSTICO',
      colTipoDiagX + colTipoDiagAncho / 2,
      posYActual + 3.5,
      { align: 'center' },
    );
  };

  dibujarEncabezadoDiagnosticos(posY);
  posY += altoCabeceraDiag + 0.6;

  let indiceDiag = 1;
  const listaDiagnosticosMostrar =
    diagnosticos.length > 0
      ? diagnosticos
      : [
        {
          codigoCIE10: 'Z00.0',
          descripcion: 'EXAMEN MÉDICO GENERAL',
          clasificacion: 'D',
        },
      ];

  for (const diag of listaDiagnosticosMostrar) {
    const tipoTexto =
      diag.clasificacion === 'D'
        ? 'DEFINITIVO'
        : diag.clasificacion === 'R'
          ? 'REPETIDO'
          : 'PRESUNTIVO';

    const lineasDesc = documentoPdf.splitTextToSize(
      String(diag.descripcion || '').toUpperCase(),
      colDescDiagAncho - 6,
    );
    const altoFila = Math.max(5.6, lineasDesc.length * 3.0 + 2.2);

    asegurarEspacioDisponible(altoFila);

    const fondoFila =
      indiceDiag % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
    documentoPdf.setFillColor(...fondoFila);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posY,
      anchoContenido,
      altoFila,
      0.4,
      0.4,
      'FD',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.8);
    documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.text(
      String(diag.codigoCIE10 || '--'),
      colCieX + colCieAncho / 2,
      posY + 3.6,
      { align: 'center' },
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    documentoPdf.text(lineasDesc, colDescDiagX + 3, posY + 3.4);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.4);
    documentoPdf.setTextColor(
      diag.clasificacion === 'D' ? 16 : 71,
      diag.clasificacion === 'D' ? 149 : 85,
      diag.clasificacion === 'D' ? 193 : 105,
    );
    documentoPdf.text(
      tipoTexto,
      colTipoDiagX + colTipoDiagAncho / 2,
      posY + 3.6,
      { align: 'center' },
    );

    posY += altoFila;
    indiceDiag += 1;
  }

  posY += 3.0;

  const itemsReceta = datos.itemsReceta || [];
  asegurarEspacioDisponible(24);
  posY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'PLAN TERAPÉUTICO Y PRESCRIPCIÓN DE MEDICAMENTOS',
    posY,
    margenIzquierdo,
    margenDerecho,
  );

  if (itemsReceta.length > 0) {
    const altoCabeceraRec = 5.2;
    const colItemAncho = 10;
    const colCantRecAncho = 16;
    const colMedAncho = 74;
    const colPosAncho = anchoContenido - colItemAncho - colCantRecAncho - colMedAncho;

    const colItemX = margenIzquierdo;
    const colMedX = colItemX + colItemAncho;
    const colPosX = colMedX + colMedAncho;
    const colCantRecX = colPosX + colPosAncho;

    const dibujarEncabezadoReceta = (posYActual: number): void => {
      documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
      documentoPdf.roundedRect(
        margenIzquierdo,
        posYActual,
        anchoContenido,
        altoCabeceraRec,
        0.8,
        0.8,
        'F',
      );

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(5.5);
      documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
      documentoPdf.text('ITEM', colItemX + colItemAncho / 2, posYActual + 3.5, {
        align: 'center',
      });
      documentoPdf.text('MEDICAMENTO / CONCENTRACIÓN / FORMA', colMedX + 3, posYActual + 3.5);
      documentoPdf.text('DOSIS / FRECUENCIA / VÍA / DURACIÓN', colPosX + 3, posYActual + 3.5);
      documentoPdf.text('CANT.', colCantRecX + colCantRecAncho / 2, posYActual + 3.5, {
        align: 'center',
      });
    };

    dibujarEncabezadoReceta(posY);
    posY += altoCabeceraRec + 0.6;

    let indiceMed = 1;
    for (const med of itemsReceta) {
      const dosisTexto = med.dosis ? `${med.dosis}` : '1 TABLETA';
      const frecTexto = med.frecuencia ? ` C\\${med.frecuencia}` : '';
      const viaTexto = med.via ? ` • VÍA: ${med.via.toUpperCase()}` : ' • VÍA: ORAL';
      const durTexto = med.duracion ? ` • POR ${med.duracion.toUpperCase()}` : '';
      const posologiaCompleta = `${dosisTexto}${frecTexto}${viaTexto}${durTexto}`.toUpperCase();

      const codigoMedTexto = med.codigo ? `[${med.codigo}] ` : '';
      const concTexto = med.concentracion ? ` ${med.concentracion}` : '';
      const formaTexto = med.formaFarmaceutica ? ` ${med.formaFarmaceutica}` : '';
      const nombreCompletoMed = `${codigoMedTexto}${med.nombre}${concTexto}${formaTexto}`.trim().toUpperCase();

      const lineasMed = documentoPdf.splitTextToSize(nombreCompletoMed, colMedAncho - 6);
      const lineasPos = documentoPdf.splitTextToSize(posologiaCompleta, colPosAncho - 6);
      const maxLineas = Math.max(lineasMed.length, lineasPos.length, 1);
      const altoFila = Math.max(5.6, maxLineas * 2.8 + 2.2);

      asegurarEspacioDisponible(altoFila);

      const fondoFila =
        indiceMed % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      documentoPdf.setFillColor(...fondoFila);
      documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
      documentoPdf.setLineWidth(0.18);
      documentoPdf.roundedRect(
        margenIzquierdo,
        posY,
        anchoContenido,
        altoFila,
        0.4,
        0.4,
        'FD',
      );

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(5.5);
      documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
      documentoPdf.text(
        String(indiceMed),
        colItemX + colItemAncho / 2,
        posY + 3.6,
        { align: 'center' },
      );

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(5.8);
      documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
      documentoPdf.text(lineasMed, colMedX + 3, posY + 3.4);

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(5.2);
      documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
      documentoPdf.text(lineasPos, colPosX + 3, posY + 3.4);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(6.5);
      documentoPdf.setTextColor(...COLOR_PRIMARIO);
      documentoPdf.text(
        String(med.cantidad || 1),
        colCantRecX + colCantRecAncho / 2,
        posY + 3.6,
        { align: 'center' },
      );

      posY += altoFila;
      indiceMed += 1;
    }
  } else {
    const textoTratamientoPlan = String(
      ficha.planTratamiento || ficha.tratamiento || 'CONTINUAR CON ESTILO DE VIDA SALUDABLE Y CONTROL AMBULATORIO PERIÓDICO.',
    ).toUpperCase();
    const lineasTratamientoPlan = documentoPdf.splitTextToSize(
      textoTratamientoPlan,
      anchoContenido - 8,
    );
    const altoCajaPlan = Math.max(8, lineasTratamientoPlan.length * 3.2 + 4.5);

    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posY,
      anchoContenido,
      altoCajaPlan,
      0.8,
      0.8,
      'FD',
    );

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(5.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
    documentoPdf.text(lineasTratamientoPlan, margenIzquierdo + 4, posY + 4.2);
    posY += altoCajaPlan;
  }

  posY += 3.0;

  const ordenesLab = datos.ordenesLaboratorio || [];
  const ordenesImg = datos.ordenesImagenes || [];
  const tieneOrdenes = ordenesLab.length > 0 || ordenesImg.length > 0;

  if (tieneOrdenes) {
    asegurarEspacioDisponible(22);
    posY = dibujarTituloSeccionUnificado(
      documentoPdf,
      'SOLICITUD DE EXÁMENES AUXILIARES (APOYO AL DIAGNÓSTICO)',
      posY,
      margenIzquierdo,
      margenDerecho,
    );

    const altoCabeceraOrd = 5.2;
    const colTipoOrdAncho = 42;
    const colCptOrdAncho = 26;
    const colDescOrdAncho = anchoContenido - colTipoOrdAncho - colCptOrdAncho;

    const colTipoOrdX = margenIzquierdo;
    const colCptOrdX = colTipoOrdX + colTipoOrdAncho;
    const colDescOrdX = colCptOrdX + colCptOrdAncho;

    documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posY,
      anchoContenido,
      altoCabeceraOrd,
      0.8,
      0.8,
      'F',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.5);
    documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
    documentoPdf.text('ÁREA / SERVICIO', colTipoOrdX + 3, posY + 3.5);
    documentoPdf.text('CÓDIGO CPT', colCptOrdX + colCptOrdAncho / 2, posY + 3.5, {
      align: 'center',
    });
    documentoPdf.text('DESCRIPCIÓN DEL PROCEDIMIENTO O EXAMEN', colDescOrdX + 3, posY + 3.5);

    posY += altoCabeceraOrd + 0.6;

    let indiceOrden = 1;
    for (const img of ordenesImg) {
      const lineasImg = documentoPdf.splitTextToSize(
        String(img.descripcionCPT || '').toUpperCase(),
        colDescOrdAncho - 6,
      );
      const altoFila = Math.max(5.6, lineasImg.length * 3.0 + 2.2);
      asegurarEspacioDisponible(altoFila);

      const fondoFila =
        indiceOrden % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      documentoPdf.setFillColor(...fondoFila);
      documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
      documentoPdf.setLineWidth(0.18);
      documentoPdf.roundedRect(
        margenIzquierdo,
        posY,
        anchoContenido,
        altoFila,
        0.4,
        0.4,
        'FD',
      );

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(5.2);
      documentoPdf.setTextColor(...COLOR_PRIMARIO);
      documentoPdf.text('DIAGNÓSTICO POR IMÁGENES', colTipoOrdX + 3, posY + 3.5);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(5.6);
      documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
      documentoPdf.text(
        String(img.codigoCPT || '--'),
        colCptOrdX + colCptOrdAncho / 2,
        posY + 3.5,
        { align: 'center' },
      );

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(5.6);
      documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
      documentoPdf.text(lineasImg, colDescOrdX + 3, posY + 3.4);

      posY += altoFila;
      indiceOrden += 1;
    }

    for (const lab of ordenesLab) {
      const lineasLab = documentoPdf.splitTextToSize(
        String(lab.descripcionCPT || '').toUpperCase(),
        colDescOrdAncho - 6,
      );
      const altoFila = Math.max(5.6, lineasLab.length * 3.0 + 2.2);
      asegurarEspacioDisponible(altoFila);

      const fondoFila =
        indiceOrden % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      documentoPdf.setFillColor(...fondoFila);
      documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
      documentoPdf.setLineWidth(0.18);
      documentoPdf.roundedRect(
        margenIzquierdo,
        posY,
        anchoContenido,
        altoFila,
        0.4,
        0.4,
        'FD',
      );

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(5.2);
      documentoPdf.setTextColor(30, 64, 175);
      documentoPdf.text('PATOLOGÍA CLÍNICA (LAB)', colTipoOrdX + 3, posY + 3.5);

      documentoPdf.setFont('helvetica', 'bold');
      documentoPdf.setFontSize(5.6);
      documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
      documentoPdf.text(
        String(lab.codigoCPT || '--'),
        colCptOrdX + colCptOrdAncho / 2,
        posY + 3.5,
        { align: 'center' },
      );

      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(5.6);
      documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
      documentoPdf.text(lineasLab, colDescOrdX + 3, posY + 3.4);

      posY += altoFila;
      indiceOrden += 1;
    }

    posY += 3.0;
  }

  const refEstablecimiento =
    datos.referenciaEstablecimiento || ficha.referenciaEstablecimiento;
  if (refEstablecimiento) {
    asegurarEspacioDisponible(16);
    posY = dibujarTituloSeccionUnificado(
      documentoPdf,
      'DATOS DE REFERENCIA Y PROCEDENCIA',
      posY,
      margenIzquierdo,
      margenDerecho,
    );

    const refServicio =
      datos.referenciaServicio || ficha.referenciaServicio || 'NO REGISTRADO';
    const refMotivo =
      datos.referenciaMotivo || ficha.referenciaMotivo || 'NO REGISTRADO';

    const textoRef = `ESTABLECIMIENTO: ${String(refEstablecimiento).toUpperCase()}   •   SERVICIO: ${String(refServicio).toUpperCase()}   •   MOTIVO: ${String(refMotivo).toUpperCase()}`;
    const lineasRef = documentoPdf.splitTextToSize(textoRef, anchoContenido - 8);
    const altoCajaRef = Math.max(8, lineasRef.length * 3.2 + 4.5);

    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posY,
      anchoContenido,
      altoCajaRef,
      0.8,
      0.8,
      'FD',
    );

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(5.6);
    documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
    documentoPdf.text(lineasRef, margenIzquierdo + 4, posY + 4.2);
    posY += altoCajaRef + 3.0;
  }

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    `USUARIO IMPRESIÓN: ${(datos.medicoNombre || ficha.medicoNombre || 'MÉDICO').toUpperCase()}   •   FECHA IMPRESIÓN: ${datos.fechaConsultaFormateada || new Date().toLocaleString()}`,
    margenIzquierdo,
    posY,
  );
  posY += 2.5;

  const metadatos = calcularCoordenadasFirmaDinamica(documentoPdf, posY, 2);
  asignarMetadatosFirmaPdf(documentoPdf, metadatos);

  dibujarPiePaginaInstitucionalUnificado(documentoPdf, {
    nombreDocumento: 'RESUMEN DE ATENCIÓN MÉDICA',
    codigoFormato: 'HNSEB-CE-HCE-01',
    medicoNombre: datos.medicoNombre || ficha.medicoNombre,
    pacienteNombre: ficha.pacienteNombre,
    historiaClinica: ficha.nroHistoriaClinica,
  });

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

  const tieneDiasDescanso = datos.diasDescanso && datos.diasDescanso > 0;
  const tituloCabecera = tieneDiasDescanso
    ? 'CERTIFICADO DE DESCANSO MÉDICO / INCAPACIDAD TEMPORAL'
    : 'CONSTANCIA DE ATENCIÓN MÉDICA AMBULATORIA';

  const datosInstitucion = await obtenerDatosInstitucionCache();
  const fechaEmisionLimpia = formatearFechaCorta(datos.fechaAtencion);
  let posicionVertical = dibujarEncabezadoInstitucionalUnificado(
    documentoPdf,
    tituloCabecera,
    `CONSULTA EXTERNA  •  FECHA DE EMISIÓN: ${fechaEmisionLimpia}`,
    datosInstitucion,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
    210,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre: datos.pacienteNombre,
    nroHistoriaClinica: datos.nroHistoriaClinica,
    nroDocumento: datos.nroDocumento,
    edad: datos.edad,
    sexo: datos.sexo,
    servicioNombre: datos.servicioNombre,
    especialidadNombre: datos.servicioNombre,
    consultorio: datos.servicioNombre,
    medicoTratante: datos.medicoNombre,
    tipoFinanciador: 'SIS',
    fechaAtencion: datos.fechaAtencion,
    procedencia: 'CONSULTORIOS EXTERNOS',
  };

  posicionVertical = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posicionVertical,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
  );

  posicionVertical = dibujarTituloSeccionUnificado(
    documentoPdf,
    'CERTIFICACIÓN MÉDICA OFICIAL',
    posicionVertical,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
  );

  const parrafoCertifico = `El médico especialista que suscribe certifica que el/la paciente ${datos.pacienteNombre}, identificado(a) con DNI N° ${datos.nroDocumento} e Historia Clínica N° ${datos.nroHistoriaClinica}, fue evaluado(a) en el servicio de ${datos.servicioNombre}, diagnosticándose la siguiente condición clínica:`;
  const lineasCertifico = documentoPdf.splitTextToSize(
    parrafoCertifico,
    ANCHO_PAGINA - 8,
  );

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(6.5);
  documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
  documentoPdf.text(lineasCertifico, MARGEN_IZQUIERDO + 2, posicionVertical + 4.2);
  posicionVertical += lineasCertifico.length * 3.4 + 5.5;

  const altoCajaDiag = 12.0;
  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    altoCajaDiag,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.rect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    2.5,
    altoCajaDiag,
    'F',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('DIAGNÓSTICO PRINCIPAL CODIFICADO:', MARGEN_IZQUIERDO + 5, posicionVertical + 4.0);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.8);
  documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.text(
    `CIE-10 [${datos.codigoCIE10}]: ${String(datos.diagnosticoPrincipal).toUpperCase()}`,
    MARGEN_IZQUIERDO + 5,
    posicionVertical + 8.5,
  );
  posicionVertical += altoCajaDiag + 4.0;

  posicionVertical = dibujarTituloSeccionUnificado(
    documentoPdf,
    tieneDiasDescanso ? 'DISPOSICIÓN DE REPOSO MÉDICO LABORAL' : 'CONCLUSIÓN DE ATENCIÓN AMBULATORIA',
    posicionVertical,
    MARGEN_IZQUIERDO,
    MARGEN_DERECHO,
  );

  const parrafoConclusion = tieneDiasDescanso
    ? `Por lo expuesto clínicamente, el/la paciente amerita reposo médico y descanso domiciliario ${String(datos.tipoReposo || 'ABSOLUTO').toUpperCase()} por el lapso estricto de ${datos.diasDescanso} DÍA(S), iniciando el ${datos.fechaInicio} y culminando el ${datos.fechaFin} inclusive, debiendo guardar reposo según indicación médica.`
    : 'Por lo expuesto clínicamente, se deja constancia médica formal de la atención ambulatoria brindada, determinándose que el/la paciente no amerita reposo laboral domiciliario, encontrándose en condiciones de continuar con sus actividades habituales.';
  const lineasConclusion = documentoPdf.splitTextToSize(
    parrafoConclusion,
    ANCHO_PAGINA - 8,
  );
  const altoCajaConclusion = Math.max(11, lineasConclusion.length * 3.4 + 5.5);

  documentoPdf.setFillColor(239, 246, 255);
  documentoPdf.setDrawColor(191, 219, 254);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.roundedRect(
    MARGEN_IZQUIERDO,
    posicionVertical,
    ANCHO_PAGINA,
    altoCajaConclusion,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(6.2);
  documentoPdf.setTextColor(30, 58, 138);
  documentoPdf.text(lineasConclusion, MARGEN_IZQUIERDO + 4, posicionVertical + 4.5);
  posicionVertical += altoCajaConclusion + 4.0;

  if (datos.observaciones?.trim()) {
    posicionVertical = dibujarTituloSeccionUnificado(
      documentoPdf,
      'RECOMENDACIONES O INDICACIONES MÉDICAS',
      posicionVertical,
      MARGEN_IZQUIERDO,
      MARGEN_DERECHO,
    );

    const lineasObs = documentoPdf.splitTextToSize(
      datos.observaciones.trim().toUpperCase(),
      ANCHO_PAGINA - 8,
    );
    const altoCajaObs = Math.max(9, lineasObs.length * 3.2 + 4.5);

    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      MARGEN_IZQUIERDO,
      posicionVertical,
      ANCHO_PAGINA,
      altoCajaObs,
      0.8,
      0.8,
      'FD',
    );

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(5.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
    documentoPdf.text(lineasObs, MARGEN_IZQUIERDO + 4, posicionVertical + 4.2);
    posicionVertical += altoCajaObs + 3.0;
  }

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    `MÉDICO EMISOR: ${(datos.medicoNombre || 'MÉDICO TRATANTE').toUpperCase()}   •   FECHA: ${datos.fechaAtencion || new Date().toLocaleDateString()}`,
    MARGEN_IZQUIERDO,
    posicionVertical,
  );
  posicionVertical += 2.5;

  const metadatos = calcularCoordenadasFirmaDinamica(
    documentoPdf,
    posicionVertical,
    2,
  );
  asignarMetadatosFirmaPdf(documentoPdf, metadatos);

  dibujarPiePaginaInstitucionalUnificado(documentoPdf, {
    nombreDocumento: tieneDiasDescanso
      ? 'CERTIFICADO DE DESCANSO MÉDICO'
      : 'CONSTANCIA DE ATENCIÓN MÉDICA',
    codigoFormato: 'HNSEB-DM-CE-01',
    medicoNombre: datos.medicoNombre,
    pacienteNombre: datos.pacienteNombre,
    historiaClinica: datos.nroHistoriaClinica,
    margenIzquierdo: MARGEN_IZQUIERDO,
    margenDerecho: MARGEN_DERECHO,
  });

  return documentoPdf;
}

export async function imprimirPdfDescansoMedico(
  datos: DatosPdfDescansoMedico,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfDescansoMedico(datos);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

function dibujarIdentificacionMedicoTratante(
  _documentoPdf: jsPDF,
  posicionVerticalActual: number,
  _nombreMedico?: string,
  _tituloCargo?: string,
  _colegiaturaColegio?: string,
  _registroEspecialidad?: string,
  _incluirRecuadroFirmaDigital?: boolean,
): number {
  return posicionVerticalActual;
}

function dibujarCodigoBarras(
  documentoPdf: jsPDF,
  textoCodigo: string,
  posicionX: number,
  posicionY: number,
  anchoTotal: number = 40,
  altura: number = 6.5,
): void {
  const cadenaLimpia =
    String(textoCodigo || '2481984').replace(/\D/g, '') || '2481984';
  documentoPdf.setFillColor(15, 23, 42);

  let semilla = 19;
  for (let indice = 0; indice < cadenaLimpia.length; indice++) {
    semilla = (semilla * 31 + cadenaLimpia.charCodeAt(indice)) % 100000;
  }

  const cantidadBarras = 34;
  const pasoUnitario = anchoTotal / (cantidadBarras * 1.6);
  let posicionActualX = posicionX;

  documentoPdf.rect(
    posicionActualX,
    posicionY,
    pasoUnitario * 1.4,
    altura,
    'F',
  );
  posicionActualX += pasoUnitario * 2.0;
  documentoPdf.rect(
    posicionActualX,
    posicionY,
    pasoUnitario * 1.4,
    altura,
    'F',
  );
  posicionActualX += pasoUnitario * 2.2;

  for (let indice = 0; indice < cantidadBarras; indice++) {
    const valorPseudo = Math.sin(semilla + indice * 1.7) * 10000;
    const esBarra = Math.abs(valorPseudo - Math.floor(valorPseudo)) > 0.35;
    const grosor =
      Math.abs(valorPseudo * 10 - Math.floor(valorPseudo * 10)) > 0.65
        ? 1.8
        : 1.0;

    const anchoBarra = pasoUnitario * grosor;
    if (
      posicionActualX + anchoBarra >
      posicionX + anchoTotal - pasoUnitario * 3.5
    ) {
      break;
    }

    if (esBarra) {
      documentoPdf.rect(posicionActualX, posicionY, anchoBarra, altura, 'F');
    }
    posicionActualX += pasoUnitario * (grosor + 0.4);
  }

  const posicionFinalHorizontal = posicionX + anchoTotal - pasoUnitario * 2.8;
  documentoPdf.rect(
    posicionFinalHorizontal,
    posicionY,
    pasoUnitario * 1.2,
    altura,
    'F',
  );
  documentoPdf.rect(
    posicionFinalHorizontal + pasoUnitario * 1.6,
    posicionY,
    pasoUnitario * 1.2,
    altura,
    'F',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(30, 41, 59);
  documentoPdf.text(
    `* ${cadenaLimpia} *`,
    posicionX + anchoTotal / 2,
    posicionY + altura + 2.8,
    { align: 'center' },
  );
}

function dibujarTarjetaCabeceraOrden(
  documentoPdf: jsPDF,
  opciones: {
    numeroOrden: string;
    servicioDestino: string;
    fechaSolicitud?: string;
    prioridad?: string;
    estado?: string;
  },
  posicionVertical: number,
  margenIzquierdo = MARGEN_IZQUIERDO,
  margenDerecho = MARGEN_DERECHO,
): number {
  const anchoContenido = margenDerecho - margenIzquierdo;
  const altoTarjeta = 14.5;

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_MEDIO);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionVertical,
    anchoContenido,
    altoTarjeta,
    1,
    1,
    'FD',
  );

  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.rect(margenIzquierdo, posicionVertical, 2.8, altoTarjeta, 'F');

  const xTexto = margenIzquierdo + 6;
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('N° ORDEN MÉDICA:', xTexto, posicionVertical + 4.2);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(8.2);
  documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.text(opciones.numeroOrden, xTexto + 25, posicionVertical + 4.2);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('SERVICIO DESTINO:', xTexto, posicionVertical + 9.0);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.5);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(
    opciones.servicioDestino.toUpperCase(),
    xTexto + 25,
    posicionVertical + 9.0,
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('FECHA SOLICITUD:', xTexto + 78, posicionVertical + 4.2);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.5);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(
    formatearFechaCorta(opciones.fechaSolicitud) || 'FECHA DE ATENCIÓN',
    xTexto + 103,
    posicionVertical + 4.2,
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('PRIORIDAD / ESTADO:', xTexto + 78, posicionVertical + 9.0);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.5);
  documentoPdf.setTextColor(...COLOR_PRIMARIO);
  documentoPdf.text(
    `${(opciones.prioridad || 'RUTINA').toUpperCase()}  •  ${(opciones.estado || 'REGISTRADO').toUpperCase()}`,
    xTexto + 103,
    posicionVertical + 9.0,
  );

  const xBarras = margenDerecho - 42;
  dibujarCodigoBarras(
    documentoPdf,
    opciones.numeroOrden,
    xBarras,
    posicionVertical + 2.0,
    38,
    6.0,
  );

  return posicionVertical + altoTarjeta + 4.0;
}

export async function generarDocumentoPdfOrdenLaboratorio(
  datos: DatosPdfOrdenLaboratorio,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margenIzquierdo = MARGEN_IZQUIERDO;
  const margenDerecho = MARGEN_DERECHO;
  const anchoContenido = ANCHO_PAGINA;

  const datosInstitucion = await obtenerDatosInstitucionCache();
  const codigoOrden = String(
    datos.numeroOrden || datos.idCuentaAtencion || '2482260',
  );

  let posicionY = dibujarEncabezadoInstitucionalUnificado(
    documentoPdf,
    'ORDEN MÉDICA DE LABORATORIO CLÍNICO',
    'PATOLOGÍA CLÍNICA — COMPLEJO HOSPITALARIO HNSEB',
    datosInstitucion,
    margenIzquierdo,
    margenDerecho,
    210,
  );

  posicionY = dibujarTarjetaCabeceraOrden(
    documentoPdf,
    {
      numeroOrden: codigoOrden,
      servicioDestino: datos.especialidadNombre || 'PATOLOGÍA CLÍNICA',
      fechaSolicitud: datos.fechaAtencion || datos.fechaCita,
      prioridad: 'RUTINA',
      estado: 'SOLICITADO',
    },
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre: datos.pacienteNombre,
    nroHistoriaClinica: datos.nroHistoriaClinica,
    idCuentaAtencion: datos.idCuentaAtencion,
    edad: datos.edad,
    sexo: datos.sexo,
    servicioNombre: datos.servicioProcedencia || datos.especialidadNombre,
    especialidadNombre: datos.especialidadNombre,
    consultorio: datos.servicioProcedencia,
    tipoFinanciador: datos.tipoFinanciador || 'SIS',
    medicoTratante: datos.medicoNombre,
    fechaAtencion: datos.fechaAtencion || datos.fechaCita,
    procedencia: datos.servicioProcedencia || 'CONSULTA EXTERNA',
  };

  posicionY = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  if (datos.diagnosticos && datos.diagnosticos.length > 0) {
    posicionY = dibujarTituloSeccionUnificado(
      documentoPdf,
      'DIAGNÓSTICOS ASOCIADOS A LA SOLICITUD (CIE-10)',
      posicionY,
      margenIzquierdo,
      margenDerecho,
    );

    const textoDiagnosticos = datos.diagnosticos
      .map((d) => (d.codigoCIE10 ? `[${d.codigoCIE10}] ${d.descripcion.toUpperCase()}` : d.descripcion.toUpperCase()))
      .join('   •   ');
    const lineasDiag = documentoPdf.splitTextToSize(textoDiagnosticos, anchoContenido - 8);
    const altoCajaDiag = Math.max(8.0, lineasDiag.length * 3.0 + 3.8);

    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(margenIzquierdo, posicionY, anchoContenido, altoCajaDiag, 0.8, 0.8, 'FD');

    documentoPdf.setFillColor(...COLOR_PRIMARIO);
    documentoPdf.rect(margenIzquierdo, posicionY, 2.5, altoCajaDiag, 'F');

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.4);
    documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.text(lineasDiag, margenIzquierdo + 5, posicionY + 4.0);
    posicionY += altoCajaDiag + 3.8;
  }

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'PRUEBAS ANALÍTICAS Y PROCEDIMIENTOS DE LABORATORIO',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const altoCabecera = 5.2;
  const colCptAncho = 24;
  const colCantAncho = 16;
  const colJustAncho = 60;
  const colDescAncho = anchoContenido - colCptAncho - colCantAncho - colJustAncho;

  const colCptX = margenIzquierdo;
  const colDescX = colCptX + colCptAncho;
  const colCantX = colDescX + colDescAncho;
  const colJustX = colCantX + colCantAncho;

  const dibujarEncabezadoTablaLab = (posYActual: number): void => {
    documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posYActual,
      anchoContenido,
      altoCabecera,
      0.8,
      0.8,
      'F',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.0);
    documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
    documentoPdf.text(
      'CÓDIGO CPT',
      colCptX + colCptAncho / 2,
      posYActual + 3.7,
      { align: 'center' },
    );
    documentoPdf.text(
      'ANÁLISIS CLÍNICO / PROCEDIMIENTO DE LABORATORIO',
      colDescX + 3,
      posYActual + 3.7,
    );
    documentoPdf.text(
      'CANT.',
      colCantX + colCantAncho / 2,
      posYActual + 3.7,
      { align: 'center' },
    );
    documentoPdf.text(
      'JUSTIFICACIÓN MÉDICA / MOTIVO',
      colJustX + 3,
      posYActual + 3.7,
    );
  };

  dibujarEncabezadoTablaLab(posicionY);
  posicionY += altoCabecera + 0.8;

  const listaExamenes =
    datos.ordenesLaboratorio && datos.ordenesLaboratorio.length > 0
      ? datos.ordenesLaboratorio
      : [
        {
          codigoCPT: '82565',
          descripcionCPT: 'DOSAJE DE CREATININA EN SANGRE',
          cantidad: 1,
          justificacion: 'EVALUACIÓN MÉDICA INTEGRAL',
        },
      ];

  let indiceExamen = 1;
  for (const item of listaExamenes) {
    const lineasDescripcion = documentoPdf.splitTextToSize(
      String(item.descripcionCPT || '').toUpperCase(),
      colDescAncho - 6,
    );
    const lineasJustificacion = documentoPdf.splitTextToSize(
      String(item.justificacion || 'EVALUACIÓN MÉDICA').toUpperCase(),
      colJustAncho - 6,
    );
    const cantidadLineas = Math.max(
      lineasDescripcion.length,
      lineasJustificacion.length,
      1,
    );
    const altoFila = Math.max(6.8, cantidadLineas * 3.2 + 2.8);

    if (posicionY + altoFila > 240) {
      documentoPdf.addPage();
      posicionY = 20;
      dibujarEncabezadoTablaLab(posicionY);
      posicionY += altoCabecera + 0.8;
    }

    const fondoFila =
      indiceExamen % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
    documentoPdf.setFillColor(...fondoFila);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posicionY,
      anchoContenido,
      altoFila,
      0.4,
      0.4,
      'FD',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.8);
    documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.text(
      String(item.codigoCPT || '--'),
      colCptX + colCptAncho / 2,
      posicionY + 4.0,
      { align: 'center' },
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(7.2);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    documentoPdf.text(lineasDescripcion, colDescX + 3, posicionY + 3.8);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(7.8);
    documentoPdf.setTextColor(...COLOR_PRIMARIO);
    documentoPdf.text(
      String(item.cantidad || 1),
      colCantX + colCantAncho / 2,
      posicionY + 4.0,
      { align: 'center' },
    );

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(6.5);
    documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
    documentoPdf.text(lineasJustificacion, colJustX + 3, posicionY + 3.8);

    posicionY += altoFila;
    indiceExamen += 1;
  }

  posicionY += 3.0;
  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'RESUMEN CLÍNICO / INDICACIÓN MÉDICA',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const textoResumen = String(
    datos.resumenHistoriaClinica ||
    'PACIENTE EN CONSULTA EXTERNA PARA EVALUACIÓN DIAGNÓSTICA Y CONTROL INTEGRAL.',
  ).toUpperCase();
  const lineasResumen = documentoPdf.splitTextToSize(
    textoResumen,
    anchoContenido - 8,
  );
  const altoCajaResumen = Math.max(9, lineasResumen.length * 3.2 + 4.5);

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    altoCajaResumen,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.rect(margenIzquierdo, posicionY, 2.5, altoCajaResumen, 'F');

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(6.6);
  documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
  documentoPdf.text(lineasResumen, margenIzquierdo + 5, posicionY + 4.5);
  posicionY += altoCajaResumen + 3.0;

  documentoPdf.setFillColor(239, 246, 255);
  documentoPdf.setDrawColor(191, 219, 254);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    7.5,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.8);
  documentoPdf.setTextColor(30, 64, 175);
  documentoPdf.text(
    'INDICACIÓN PARA EL PACIENTE: ACÉRQUESE AL LABORATORIO CLÍNICO EN AYUNAS (06:00 - 09:00 HORAS) CON ESTA ORDEN Y SU DNI.',
    margenIzquierdo + anchoContenido / 2,
    posicionY + 4.8,
    { align: 'center' },
  );
  posicionY += 9.5;

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.5);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    `USUARIO IMPRESIÓN: ${(datos.usuarioImpresion || datos.medicoNombre || 'MÉDICO').toUpperCase()}   •   FECHA IMPRESIÓN: ${datos.fechaImpresion || new Date().toLocaleString()}`,
    margenIzquierdo,
    posicionY,
  );

  asignarMetadatosFirmaPdf(documentoPdf, {
    stampPage: 1,
    positionX: 435,
    positionY: 28,
  });

  dibujarPiePaginaInstitucionalUnificado(documentoPdf, {
    nombreDocumento: 'ORDEN MÉDICA DE LABORATORIO CLÍNICO',
    codigoFormato: 'HNSEB-LAB-CE-01',
    medicoNombre: datos.medicoNombre,
    margenIzquierdo,
    margenDerecho,
  });

  return documentoPdf;
}

export async function imprimirPdfOrdenLaboratorio(
  datos: DatosPdfOrdenLaboratorio,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfOrdenLaboratorio(datos);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

export async function generarDocumentoPdfOrdenImagenologia(
  datos: DatosPdfOrdenImagenologia,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margenIzquierdo = MARGEN_IZQUIERDO;
  const margenDerecho = MARGEN_DERECHO;
  const anchoContenido = ANCHO_PAGINA;

  const datosInstitucion = await obtenerDatosInstitucionCache();
  const codigoOrden = String(
    datos.numeroOrden || datos.idCuentaAtencion || '2481984',
  );
  const subtipoEstudio = String(
    datos.subtipoEstudio || 'ECOGRAFÍA GENERAL',
  ).toUpperCase();
  const numeroCasoTexto = datos.numeroCaso
    ? ` — CASO N° ${datos.numeroCaso}`
    : '';

  let posicionY = dibujarEncabezadoInstitucionalUnificado(
    documentoPdf,
    `ORDEN MÉDICA DE IMAGENOLOGÍA — N° ${codigoOrden}`,
    `${subtipoEstudio}${numeroCasoTexto} — DIAGNÓSTICO POR IMÁGENES`,
    datosInstitucion,
    margenIzquierdo,
    margenDerecho,
    210,
  );

  posicionY = dibujarTarjetaCabeceraOrden(
    documentoPdf,
    {
      numeroOrden: codigoOrden,
      servicioDestino: `${subtipoEstudio} — DIAGNÓSTICO POR IMÁGENES`,
      fechaSolicitud: datos.fechaAtencion || datos.fechaCita,
      prioridad: 'RUTINA',
      estado: 'SOLICITADO',
    },
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre: datos.pacienteNombre,
    nroHistoriaClinica: datos.nroHistoriaClinica,
    idCuentaAtencion: datos.idCuentaAtencion,
    edad: datos.edad,
    sexo: datos.sexo,
    servicioNombre: datos.servicioProcedencia || datos.especialidadNombre,
    especialidadNombre: datos.especialidadNombre,
    consultorio: datos.servicioProcedencia,
    tipoFinanciador: datos.tipoFinanciador || 'SIS',
    medicoTratante: datos.medicoNombre,
    fechaAtencion: datos.fechaAtencion || datos.fechaCita,
    procedencia: datos.servicioProcedencia || 'CONSULTA EXTERNA',
  };

  posicionY = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  if (datos.diagnosticos && datos.diagnosticos.length > 0) {
    posicionY = dibujarTituloSeccionUnificado(
      documentoPdf,
      'DIAGNÓSTICOS ASOCIADOS A LA SOLICITUD (CIE-10)',
      posicionY,
      margenIzquierdo,
      margenDerecho,
    );

    const textoDiagnosticos = datos.diagnosticos
      .map((d) => (d.codigoCIE10 ? `[${d.codigoCIE10}] ${d.descripcion.toUpperCase()}` : d.descripcion.toUpperCase()))
      .join('   •   ');
    const lineasDiag = documentoPdf.splitTextToSize(textoDiagnosticos, anchoContenido - 8);
    const altoCajaDiag = Math.max(8.0, lineasDiag.length * 3.0 + 3.8);

    documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(margenIzquierdo, posicionY, anchoContenido, altoCajaDiag, 0.8, 0.8, 'FD');

    documentoPdf.setFillColor(...COLOR_PRIMARIO);
    documentoPdf.rect(margenIzquierdo, posicionY, 2.5, altoCajaDiag, 'F');

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.4);
    documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.text(lineasDiag, margenIzquierdo + 5, posicionY + 4.0);
    posicionY += altoCajaDiag + 3.8;
  }

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'ESTUDIOS DE DIAGNÓSTICO POR IMÁGENES SOLICITADOS',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const altoCabecera = 5.2;
  const colCptAncho = 24;
  const colCantAncho = 16;
  const colJustAncho = 60;
  const colDescAncho = anchoContenido - colCptAncho - colCantAncho - colJustAncho;

  const colCptX = margenIzquierdo;
  const colDescX = colCptX + colCptAncho;
  const colCantX = colDescX + colDescAncho;
  const colJustX = colCantX + colCantAncho;

  const dibujarEncabezadoTablaImagenologia = (posYActual: number): void => {
    documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posYActual,
      anchoContenido,
      altoCabecera,
      0.8,
      0.8,
      'F',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.8);
    documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
    documentoPdf.text(
      'CÓDIGO CPT',
      colCptX + colCptAncho / 2,
      posYActual + 3.6,
      { align: 'center' },
    );
    documentoPdf.text(
      'ESTUDIO RADIOLÓGICO / ECOGRÁFICO',
      colDescX + 3,
      posYActual + 3.6,
    );
    documentoPdf.text(
      'CANT.',
      colCantX + colCantAncho / 2,
      posYActual + 3.6,
      { align: 'center' },
    );
    documentoPdf.text(
      'JUSTIFICACIÓN CLÍNICA',
      colJustX + 3,
      posYActual + 3.6,
    );
  };

  dibujarEncabezadoTablaImagenologia(posicionY);
  posicionY += altoCabecera + 0.6;

  const listaEstudios =
    datos.ordenesImagenologia && datos.ordenesImagenologia.length > 0
      ? datos.ordenesImagenologia
      : [
        {
          codigoCPT: '76706.01',
          descripcionCPT: 'ECOGRAFÍA ABDOMINAL SUPERIOR',
          cantidad: 1,
          justificacion:
            'SEGUIMIENTO AL TRATAMIENTO Y CONTROL CLÍNICO',
        },
      ];

  let indiceEstudio = 1;
  for (const item of listaEstudios) {
    const lineasDescripcion = documentoPdf.splitTextToSize(
      String(item.descripcionCPT || '').toUpperCase(),
      colDescAncho - 6,
    );
    const lineasJustificacion = documentoPdf.splitTextToSize(
      String(item.justificacion || 'CONTROL CLÍNICO').toUpperCase(),
      colJustAncho - 6,
    );
    const lineasMaximas = Math.max(
      lineasDescripcion.length,
      lineasJustificacion.length,
      1,
    );
    const altoFila = Math.max(6.2, lineasMaximas * 3.0 + 2.6);

    if (posicionY + altoFila > 235) {
      documentoPdf.addPage();
      posicionY = 20;
      dibujarEncabezadoTablaImagenologia(posicionY);
      posicionY += altoCabecera + 0.6;
    }

    const fondoFila =
      indiceEstudio % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
    documentoPdf.setFillColor(...fondoFila);
    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.roundedRect(
      margenIzquierdo,
      posicionY,
      anchoContenido,
      altoFila,
      0.4,
      0.4,
      'FD',
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.4);
    documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
    documentoPdf.text(
      String(item.codigoCPT || '--'),
      colCptX + colCptAncho / 2,
      posicionY + 3.8,
      { align: 'center' },
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    documentoPdf.text(lineasDescripcion, colDescX + 3, posicionY + 3.6);

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(7.5);
    documentoPdf.setTextColor(...COLOR_PRIMARIO);
    documentoPdf.text(
      String(item.cantidad || 1),
      colCantX + colCantAncho / 2,
      posicionY + 3.8,
      { align: 'center' },
    );

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(6.2);
    documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
    documentoPdf.text(lineasJustificacion, colJustX + 3, posicionY + 3.6);

    posicionY += altoFila;
    indiceEstudio += 1;
  }

  posicionY += 2.8;

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'PROGRAMACIÓN DE SALA Y CITACIÓN',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const altoCajaProgramacion = 9.5;
  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    altoCajaProgramacion,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.6);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('SALA ASIGNADA:', margenIzquierdo + 4, posicionY + 4.0);
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.6);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(
    String(datos.sala || 'SALA GENERAL DE ECOGRAFÍA').toUpperCase(),
    margenIzquierdo + 25,
    posicionY + 4.0,
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.6);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    'FECHA PROGRAMADA:',
    margenIzquierdo + anchoContenido / 2,
    posicionY + 4.0,
  );
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.6);
  documentoPdf.setTextColor(...COLOR_PRIMARIO);
  documentoPdf.text(
    String(datos.fechaProgramada || 'PROGRAMACIÓN DIRECTA').toUpperCase(),
    margenIzquierdo + anchoContenido / 2 + 27,
    posicionY + 4.0,
  );

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.0);
  documentoPdf.setTextColor(...COLOR_TEXTO_CLARO);
  documentoPdf.text(
    'Presentarse 30 minutos antes de la hora con documento de identidad y orden médica original.',
    margenIzquierdo + 4,
    posicionY + 7.8,
  );

  posicionY += altoCajaProgramacion + 2.8;

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'INDICACIONES Y PREPARACIÓN PREVIA',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const textoIndicaciones =
    datos.indicaciones ||
    '• ACUDIR EN AYUNAS DE 8 HORAS (SI ES ESTUDIO ABDOMINAL O PÉLVICO)\n• TRAER 01 ROLLO DE PAPEL TOALLA O HIGIÉNICO\n• ACERCARSE A LA SALA DE IMÁGENES CON ESTA ORDEN Y SU DNI VIGENTE';
  const lineasIndicaciones = documentoPdf.splitTextToSize(
    textoIndicaciones.toUpperCase(),
    anchoContenido - 8,
  );
  const altoCajaIndicaciones = Math.max(8.5, lineasIndicaciones.length * 3.0 + 3.5);

  documentoPdf.setFillColor(239, 246, 255);
  documentoPdf.setDrawColor(191, 219, 254);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    altoCajaIndicaciones,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.6);
  documentoPdf.setTextColor(30, 64, 175);
  documentoPdf.text(lineasIndicaciones, margenIzquierdo + 4, posicionY + 3.8);
  posicionY += altoCajaIndicaciones + 2.8;

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'RESUMEN DE HISTORIA CLÍNICA',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const textoResumen = String(
    datos.resumenHistoriaClinica ||
    'PACIENTE EN CONSULTA EXTERNA PARA EVALUACIÓN RADIOLÓGICA Y SEGUIMIENTO MÉDICO.',
  ).toUpperCase();
  const lineasResumen = documentoPdf.splitTextToSize(
    textoResumen,
    anchoContenido - 8,
  );
  const altoCajaResumen = Math.max(8.0, lineasResumen.length * 3.0 + 3.5);

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    altoCajaResumen,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.8);
  documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
  documentoPdf.text(lineasResumen, margenIzquierdo + 4, posicionY + 3.8);
  posicionY += altoCajaResumen + 2.8;

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    `USUARIO IMPRESIÓN: ${(datos.usuarioImpresion || datos.medicoNombre || 'MÉDICO').toUpperCase()}   •   FECHA IMPRESIÓN: ${datos.fechaImpresion || new Date().toLocaleString()}`,
    margenIzquierdo,
    posicionY,
  );

  asignarMetadatosFirmaPdf(documentoPdf, {
    stampPage: 1,
    positionX: 435,
    positionY: 28,
  });

  dibujarPiePaginaInstitucionalUnificado(documentoPdf, {
    nombreDocumento: 'ORDEN MÉDICA DE IMAGENOLOGÍA',
    codigoFormato: 'HNSEB-IMG-CE-01',
    medicoNombre: datos.medicoNombre,
    margenIzquierdo,
    margenDerecho,
  });

  return documentoPdf;
}

export async function imprimirPdfOrdenImagenologia(
  datos: DatosPdfOrdenImagenologia,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfOrdenImagenologia(datos);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}

export async function generarDocumentoPdfHojaInterconsulta(
  datos: DatosPdfHojaInterconsulta,
): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margenIzquierdo = MARGEN_IZQUIERDO;
  const margenDerecho = MARGEN_DERECHO;
  const anchoContenido = ANCHO_PAGINA;

  const datosInstitucion = await obtenerDatosInstitucionCache();

  let posicionY = dibujarEncabezadoInstitucionalUnificado(
    documentoPdf,
    'HOJA DE INTERCONSULTA MÉDICA (NUEVA CITA)',
    'SOLICITUD DE EVALUACIÓN INTERDEPARTAMENTAL ESPECIALIZADA',
    datosInstitucion,
    margenIzquierdo,
    margenDerecho,
    210,
  );

  const datosFiliacion: DatosFiliacionPacientePdf = {
    pacienteNombre: datos.pacienteNombre,
    nroHistoriaClinica: datos.nroHistoriaClinica,
    idCuentaAtencion: datos.idCuentaAtencion,
    edad: datos.edad,
    nroDocumento: datos.nroDocumento,
    sexo: datos.sexo,
    servicioNombre: datos.servicioOrigen,
    especialidadNombre: datos.servicioOrigen,
    consultorio: datos.servicioOrigen,
    tipoFinanciador: datos.tipoFinanciador || 'SIS',
    medicoTratante: datos.medicoNombre || datos.medicoSolicitante,
    fechaAtencion: datos.fechaSolicitud,
    procedencia: datos.servicioOrigen || 'CONSULTA EXTERNA',
  };

  posicionY = dibujarTarjetaFiliacionPacienteUnificada(
    documentoPdf,
    datosFiliacion,
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'DATOS DE LA SOLICITUD DE INTERCONSULTA',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const altoTarjetaInterconsulta = 13.5;
  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    altoTarjetaInterconsulta,
    0.8,
    0.8,
    'FD',
  );

  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.rect(
    margenIzquierdo,
    posicionY,
    2.4,
    altoTarjetaInterconsulta,
    'F',
  );

  const mitadAnchoContenido = anchoContenido / 2;
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    'SERVICIO DE ORIGEN:',
    margenIzquierdo + 4,
    posicionY + 4.2,
  );
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(
    String(datos.servicioOrigen || 'CONSULTA EXTERNA').toUpperCase(),
    margenIzquierdo + 36,
    posicionY + 4.2,
    { maxWidth: mitadAnchoContenido - 40 },
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    'SERVICIO DESTINO:',
    margenIzquierdo + mitadAnchoContenido + 3,
    posicionY + 4.2,
  );
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.2);
  documentoPdf.setTextColor(...COLOR_PRIMARIO);
  documentoPdf.text(
    String(datos.servicioDestino || 'ESPECIALIDAD SOLICITADA').toUpperCase(),
    margenIzquierdo + mitadAnchoContenido + 36,
    posicionY + 4.2,
    { maxWidth: mitadAnchoContenido - 40 },
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('FECHA SOLICITUD:', margenIzquierdo + 4, posicionY + 9.5);
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.0);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(
    String(datos.fechaSolicitud || '--'),
    margenIzquierdo + 36,
    posicionY + 9.5,
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    'FECHA PROPUESTA:',
    margenIzquierdo + mitadAnchoContenido + 3,
    posicionY + 9.5,
  );
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.0);
  documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.text(
    String(datos.fechaPropuesta || '--'),
    margenIzquierdo + mitadAnchoContenido + 36,
    posicionY + 9.5,
  );

  posicionY += altoTarjetaInterconsulta + 2.8;

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'RESUMEN DE LA ENFERMEDAD ACTUAL',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const textoEnfermedad = String(
    datos.resumenEnfermedadActual ||
    'PACIENTE EN CONSULTA EXTERNA PARA EVALUACIÓN POR SU ESPECIALIDAD.',
  ).toUpperCase();
  const lineasEnfermedad = documentoPdf.splitTextToSize(
    textoEnfermedad,
    anchoContenido - 8,
  );
  const altoCajaEnfermedad = Math.max(9, lineasEnfermedad.length * 3.0 + 4.0);

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    altoCajaEnfermedad,
    0.8,
    0.8,
    'FD',
  );
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(6.0);
  documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
  documentoPdf.text(lineasEnfermedad, margenIzquierdo + 4, posicionY + 4.0);
  posicionY += altoCajaEnfermedad + 2.8;

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'MOTIVO DE LA INTERCONSULTA',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const textoMotivo = String(
    datos.motivoInterconsulta || 'MANEJO CONJUNTO Y EVALUACIÓN ESPECIALIZADA.',
  ).toUpperCase();
  const lineasMotivo = documentoPdf.splitTextToSize(
    textoMotivo,
    anchoContenido - 8,
  );
  const altoCajaMotivo = Math.max(9, lineasMotivo.length * 3.0 + 4.0);

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    altoCajaMotivo,
    0.8,
    0.8,
    'FD',
  );
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(6.0);
  documentoPdf.setTextColor(...COLOR_TEXTO_CUERPO);
  documentoPdf.text(lineasMotivo, margenIzquierdo + 4, posicionY + 4.0);
  posicionY += altoCajaMotivo + 2.8;

  posicionY = dibujarTituloSeccionUnificado(
    documentoPdf,
    'DIAGNÓSTICO DE LA ATENCIÓN',
    posicionY,
    margenIzquierdo,
    margenDerecho,
  );

  const textoDiagnostico = String(
    datos.diagnosticoAtencion || 'ATENCIÓN MÉDICA INTEGRAL',
  ).toUpperCase();
  const lineasDiagnostico = documentoPdf.splitTextToSize(
    textoDiagnostico,
    anchoContenido - 8,
  );
  const altoCajaDiagnostico = Math.max(9, lineasDiagnostico.length * 3.0 + 4.0);

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionY,
    anchoContenido,
    altoCajaDiagnostico,
    0.8,
    0.8,
    'FD',
  );
  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.0);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(lineasDiagnostico, margenIzquierdo + 4, posicionY + 4.0);
  posicionY += altoCajaDiagnostico + 2.8;

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    `USUARIO IMPRESIÓN: ${(datos.usuarioImpresion || datos.medicoNombre || datos.medicoSolicitante || 'MÉDICO').toUpperCase()}   •   FECHA IMPRESIÓN: ${datos.fechaImpresion || new Date().toLocaleString()}`,
    margenIzquierdo,
    posicionY,
  );

  asignarMetadatosFirmaPdf(documentoPdf, {
    stampPage: 1,
    positionX: 435,
    positionY: 28,
  });

  dibujarPiePaginaInstitucionalUnificado(documentoPdf, {
    nombreDocumento: 'HOJA DE INTERCONSULTA MÉDICA',
    codigoFormato: 'HNSEB-INT-CE-01',
    medicoNombre: datos.medicoNombre || datos.medicoSolicitante,
    margenIzquierdo,
    margenDerecho,
  });

  return documentoPdf;
}

export async function imprimirPdfHojaInterconsulta(
  datos: DatosPdfHojaInterconsulta,
): Promise<void> {
  const documentoPdf = await generarDocumentoPdfHojaInterconsulta(datos);
  ejecutarImpresionLimpiaDocumentoPdf(documentoPdf);
}
