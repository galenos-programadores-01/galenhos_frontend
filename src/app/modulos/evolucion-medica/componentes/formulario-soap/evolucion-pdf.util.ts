import type { jsPDF, TextOptionsLight } from 'jspdf';

export interface EvolucionPdfData {
  paciente: {
    nombre: string;
    historia: string;
    idRegAtencion: number;
    edad: string;
    sexo: string;
    ubicacion: string;
    cama: string;
    estado: string;
  };
  cabecera: {
    fecha: string;
    hora: string;
    medicoTratante: string;
    tipoAtencion: string;
  };
  motivo: Record<string, unknown>;
  subjetivo?: Record<string, unknown>;
  signosVitales?: Record<string, unknown>;
  examenFisico?: {
    sistema?: string | null;
    normal?: boolean | null;
    hallazgo?: string | null;
  }[];
  evaluacion?: Record<string, unknown>;
  diagnosticos?: {
    cie10?: string | null;
    descripcion?: string | null;
    tipo?: string | null;
    condicion?: string | null;
  }[];
  evolucionLibre?: string;
  plan?: {
    indicacionesGenerales?: Record<string, unknown>;
  };
  sintomas?: string[];
}

export interface DatosInstitucion {
  rucEess?: string | null;
  nombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  logoMinsa?: string | null;
  logoHospi?: string | null;
}

interface CeldaTabla {
  span: number;
  text: string;
  kind: 'label' | 'value';
  align?: 'left' | 'center';
}

function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') {
    return '—';
  }
  return String(valor);
}

export async function construirPdfEvolucion(
  datosEvolucion: EvolucionPdfData,
  datosInstitucion: DatosInstitucion | null,
  nombreUsuario: string,
  fechaImpresion: string,
): Promise<jsPDF | null> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const anchoPagina = 210;
  const margenIzquierdo = 18;
  const margenDerecho = 18;
  const anchoContenido = anchoPagina - margenIzquierdo - margenDerecho;
  const totalColumnas = 8;
  const anchoColumna = anchoContenido / totalColumnas;

  let posicionVertical = 15;

  function dibujarFila(
    celdas: CeldaTabla[],
    alturaFila: number,
    tamanioFuenteValor = 7,
  ): void {
    let posicionHorizontal = margenIzquierdo;
    for (const celda of celdas) {
      const anchoCelda = anchoColumna * celda.span;
      if (celda.kind === 'label') {
        documentoPdf.setFillColor(204, 204, 204);
        documentoPdf.rect(
          posicionHorizontal,
          posicionVertical,
          anchoCelda,
          alturaFila,
          'F',
        );
        documentoPdf.setFont('helvetica', 'bold');
        documentoPdf.setFontSize(5.5);
        documentoPdf.setTextColor(0);
        documentoPdf.text(
          celda.text,
          posicionHorizontal + anchoCelda / 2,
          posicionVertical + alturaFila / 2 + 0.7,
          { align: 'center' },
        );
      } else {
        documentoPdf.rect(
          posicionHorizontal,
          posicionVertical,
          anchoCelda,
          alturaFila,
        );
        documentoPdf.setFont('helvetica', 'normal');
        documentoPdf.setFontSize(tamanioFuenteValor);
        documentoPdf.setTextColor(0);
        const textoValor = celda.text.toUpperCase();
        const opcionesTexto: TextOptionsLight =
          celda.align === 'center'
            ? { align: 'center', maxWidth: anchoCelda - 2 }
            : { align: 'left', maxWidth: anchoCelda - 3 };
        documentoPdf.text(
          textoValor,
          celda.align === 'center'
            ? posicionHorizontal + anchoCelda / 2
            : posicionHorizontal + 1.5,
          posicionVertical + alturaFila / 2 + 0.8,
          opcionesTexto,
        );
      }
      posicionHorizontal += anchoCelda;
    }
    posicionVertical += alturaFila;
  }

  function agregarTituloSeccion(titulo: string): void {
    posicionVertical += 3;
    dibujarFila([{ span: totalColumnas, text: titulo, kind: 'label' }], 6);
  }

  function escribirTextoConSaltoLinea(
    texto: string,
    anchoMaximo: number,
    alturaLinea = 4,
  ): void {
    const lineas = documentoPdf.splitTextToSize(
      texto.toUpperCase(),
      anchoMaximo,
    );
    for (const linea of lineas) {
      if (posicionVertical > 270) {
        documentoPdf.addPage();
        posicionVertical = 20;
      }
      documentoPdf.text(linea, margenIzquierdo + 1.5, posicionVertical + 3);
      posicionVertical += alturaLinea;
    }
  }

  if (datosInstitucion?.logoMinsa) {
    try {
      documentoPdf.addImage(
        `data:image/png;base64,${datosInstitucion.logoMinsa}`,
        'PNG',
        margenIzquierdo,
        posicionVertical,
        24,
        24,
      );
    } catch {
      /* Continuar sin logo */
    }
  }

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(13);
  documentoPdf.setTextColor(0);
  documentoPdf.text('EVOLUCIÓN MÉDICA', anchoPagina / 2, posicionVertical + 8, {
    align: 'center',
  });

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7);
  documentoPdf.setTextColor(100, 100, 100);
  documentoPdf.text(
    `RUC: ${formatearValor(datosInstitucion?.rucEess)}`,
    anchoPagina / 2,
    posicionVertical + 13,
    { align: 'center' },
  );
  documentoPdf.text(
    `DIRECCIÓN: ${formatearValor(datosInstitucion?.direccion)}`,
    anchoPagina / 2,
    posicionVertical + 17,
    { align: 'center' },
  );
  documentoPdf.text(
    `Telef.: ${formatearValor(datosInstitucion?.telefono)}`,
    anchoPagina / 2,
    posicionVertical + 21,
    { align: 'center' },
  );
  posicionVertical += 28;

  agregarTituloSeccion('DATOS DEL PACIENTE');
  dibujarFila(
    [
      { span: 1, text: 'PACIENTE', kind: 'label' },
      {
        span: 5,
        text: formatearValor(datosEvolucion.paciente.nombre),
        kind: 'value',
      },
      { span: 1, text: 'HC', kind: 'label' },
      {
        span: 1,
        text: formatearValor(datosEvolucion.paciente.historia),
        kind: 'value',
        align: 'center',
      },
    ],
    8,
  );
  dibujarFila(
    [
      { span: 1, text: 'N° ATENCIÓN', kind: 'label' },
      {
        span: 2,
        text: formatearValor(`EV-${datosEvolucion.paciente.idRegAtencion}`),
        kind: 'value',
        align: 'center',
      },
      { span: 1, text: 'EDAD', kind: 'label' },
      {
        span: 1,
        text: formatearValor(datosEvolucion.paciente.edad),
        kind: 'value',
        align: 'center',
      },
      { span: 1, text: 'SEXO', kind: 'label' },
      {
        span: 1,
        text: formatearValor(datosEvolucion.paciente.sexo),
        kind: 'value',
        align: 'center',
      },
      { span: 1, text: 'ESTADO', kind: 'label' },
      {
        span: 1,
        text: formatearValor(datosEvolucion.paciente.estado),
        kind: 'value',
        align: 'center',
      },
    ],
    8,
  );
  dibujarFila(
    [
      { span: 1, text: 'SERVICIO', kind: 'label' },
      {
        span: 3,
        text: formatearValor(datosEvolucion.paciente.ubicacion),
        kind: 'value',
      },
      { span: 1, text: 'CAMA', kind: 'label' },
      {
        span: 1,
        text: formatearValor(datosEvolucion.paciente.cama),
        kind: 'value',
        align: 'center',
      },
      { span: 1, text: 'FECHA', kind: 'label' },
      {
        span: 1,
        text: formatearValor(datosEvolucion.cabecera.fecha),
        kind: 'value',
        align: 'center',
      },
      { span: 1, text: 'HORA', kind: 'label' },
      {
        span: 1,
        text: formatearValor(datosEvolucion.cabecera.hora),
        kind: 'value',
        align: 'center',
      },
    ],
    8,
  );
  dibujarFila(
    [
      { span: 1, text: 'MÉDICO', kind: 'label' },
      {
        span: 5,
        text: formatearValor(datosEvolucion.cabecera.medicoTratante),
        kind: 'value',
      },
      { span: 1, text: 'TIPO ATENCIÓN', kind: 'label' },
      {
        span: 1,
        text: formatearValor(datosEvolucion.cabecera.tipoAtencion),
        kind: 'value',
        align: 'center',
      },
    ],
    8,
  );

  if (datosEvolucion.motivo) {
    agregarTituloSeccion('MOTIVO DE CONSULTA');
    const motivosSeleccionados: string[] = [];
    if (datosEvolucion.motivo.motivoConsulta) {
      motivosSeleccionados.push('Motivo de consulta');
    }
    if (datosEvolucion.motivo.seguimiento) {
      motivosSeleccionados.push('Seguimiento');
    }
    if (datosEvolucion.motivo.control) {
      motivosSeleccionados.push('Control');
    }
    if (datosEvolucion.motivo.reevaluacion) {
      motivosSeleccionados.push('Reevaluación');
    }
    if (datosEvolucion.motivo.postoperatorio) {
      motivosSeleccionados.push('Postoperatorio');
    }
    if (datosEvolucion.motivo.interconsulta) {
      motivosSeleccionados.push('Interconsulta');
    }
    if (datosEvolucion.motivo.emergencia) {
      motivosSeleccionados.push('Emergencia');
    }

    if (motivosSeleccionados.length > 0) {
      dibujarFila(
        [
          { span: 2, text: 'TIPO', kind: 'label' },
          {
            span: 6,
            text: motivosSeleccionados.join(', '),
            kind: 'value',
          },
        ],
        7,
      );
    }
    const detalleMotivo = datosEvolucion.motivo.detalle;
    if (typeof detalleMotivo === 'string' && detalleMotivo) {
      dibujarFila(
        [
          { span: 1, text: 'DETALLE', kind: 'label' },
          { span: 7, text: '', kind: 'value' },
        ],
        7,
      );
      escribirTextoConSaltoLinea(detalleMotivo, anchoContenido - 3);
    }
  }

  if (datosEvolucion.subjetivo) {
    agregarTituloSeccion('SUBJETIVO');
    const datosSubjetivo = datosEvolucion.subjetivo;
    const sintomasSubjetivos: string[] = [];
    if (datosSubjetivo.dolor) sintomasSubjetivos.push('Dolor');
    if (datosSubjetivo.fiebre) sintomasSubjetivos.push('Fiebre');
    if (datosSubjetivo.tos) sintomasSubjetivos.push('Tos');
    if (datosSubjetivo.nauseas) sintomasSubjetivos.push('Náuseas');
    if (datosSubjetivo.vomitos) sintomasSubjetivos.push('Vómitos');
    if (datosSubjetivo.mareos) sintomasSubjetivos.push('Mareos');
    if (datosSubjetivo.disnea) sintomasSubjetivos.push('Disnea');

    const escalaDolorEva = datosSubjetivo.escalaDolor;
    if (sintomasSubjetivos.length > 0) {
      dibujarFila(
        [
          { span: 1, text: 'SÍNTOMAS', kind: 'label' },
          {
            span: 5,
            text: sintomasSubjetivos.join(', '),
            kind: 'value',
          },
          { span: 1, text: 'EVA', kind: 'label' },
          {
            span: 1,
            text: formatearValor(escalaDolorEva),
            kind: 'value',
            align: 'center',
          },
        ],
        7,
      );
    }
    const evolucionSintomasTexto = datosSubjetivo.evolucionSintomas;
    if (typeof evolucionSintomasTexto === 'string' && evolucionSintomasTexto) {
      dibujarFila(
        [
          { span: 1, text: 'EVOLUCIÓN', kind: 'label' },
          { span: 7, text: '', kind: 'value' },
        ],
        7,
      );
      escribirTextoConSaltoLinea(evolucionSintomasTexto, anchoContenido - 3);
    }
  }

  if (datosEvolucion.signosVitales) {
    const signosVitales = datosEvolucion.signosVitales;
    agregarTituloSeccion('SIGNOS VITALES');
    dibujarFila(
      [
        { span: 1, text: 'P/A', kind: 'label' },
        { span: 1, text: 'FC', kind: 'label' },
        { span: 1, text: 'FR', kind: 'label' },
        { span: 1, text: 'T°', kind: 'label' },
        { span: 1, text: 'SpO₂', kind: 'label' },
        { span: 1, text: 'PESO', kind: 'label' },
        { span: 1, text: 'TALLA', kind: 'label' },
        { span: 1, text: 'IMC', kind: 'label' },
      ],
      7,
    );
    dibujarFila(
      [
        {
          span: 1,
          text: formatearValor(signosVitales.presionArterial),
          kind: 'value',
          align: 'center',
        },
        {
          span: 1,
          text: formatearValor(signosVitales.frecuenciaCardiaca),
          kind: 'value',
          align: 'center',
        },
        {
          span: 1,
          text: formatearValor(signosVitales.frecuenciaRespiratoria),
          kind: 'value',
          align: 'center',
        },
        {
          span: 1,
          text: formatearValor(signosVitales.temperatura),
          kind: 'value',
          align: 'center',
        },
        {
          span: 1,
          text: formatearValor(
            signosVitales.saturacionOxigeno != null
              ? `${signosVitales.saturacionOxigeno}%`
              : null,
          ),
          kind: 'value',
          align: 'center',
        },
        {
          span: 1,
          text: formatearValor(
            signosVitales.peso != null ? `${signosVitales.peso} kg` : null,
          ),
          kind: 'value',
          align: 'center',
        },
        {
          span: 1,
          text: formatearValor(signosVitales.talla),
          kind: 'value',
          align: 'center',
        },
        {
          span: 1,
          text: formatearValor(signosVitales.imc),
          kind: 'value',
          align: 'center',
        },
      ],
      7,
    );
    const glucemiaValor = signosVitales.glucemia;
    if (glucemiaValor) {
      dibujarFila(
        [
          { span: 1, text: 'GLUCEMIA', kind: 'label' },
          {
            span: 1,
            text: formatearValor(glucemiaValor),
            kind: 'value',
            align: 'center',
          },
          { span: 6, text: '', kind: 'value' },
        ],
        7,
      );
    }
  }

  if (datosEvolucion.examenFisico && datosEvolucion.examenFisico.length > 0) {
    agregarTituloSeccion('EXAMEN FÍSICO');
    for (const examenItem of datosEvolucion.examenFisico) {
      const hallazgoTexto = examenItem.hallazgo ?? '';
      const sistemaTexto = examenItem.sistema ?? '';
      if (hallazgoTexto.trim()) {
        dibujarFila(
          [
            {
              span: 2,
              text: sistemaTexto.toUpperCase(),
              kind: 'label',
            },
            { span: 6, text: '', kind: 'value' },
          ],
          7,
        );
        escribirTextoConSaltoLinea(hallazgoTexto, anchoContenido - 3);
      }
    }
  }

  if (datosEvolucion.diagnosticos && datosEvolucion.diagnosticos.length > 0) {
    agregarTituloSeccion('DIAGNÓSTICOS');
    dibujarFila(
      [
        { span: 1, text: 'CIE-10', kind: 'label' },
        { span: 4, text: 'DESCRIPCIÓN', kind: 'label' },
        { span: 1, text: 'TIPO', kind: 'label' },
        { span: 1, text: 'CONDICIÓN', kind: 'label' },
        { span: 1, text: 'ESTADO', kind: 'label' },
      ],
      7,
    );
    for (const diagnosticoItem of datosEvolucion.diagnosticos) {
      if (diagnosticoItem.cie10 || diagnosticoItem.descripcion) {
        dibujarFila(
          [
            {
              span: 1,
              text: formatearValor(diagnosticoItem.cie10),
              kind: 'value',
              align: 'center',
            },
            {
              span: 4,
              text: formatearValor(diagnosticoItem.descripcion),
              kind: 'value',
            },
            {
              span: 1,
              text: formatearValor(diagnosticoItem.tipo),
              kind: 'value',
              align: 'center',
            },
            {
              span: 1,
              text: formatearValor(diagnosticoItem.condicion),
              kind: 'value',
              align: 'center',
            },
            {
              span: 1,
              text: 'ACTIVO',
              kind: 'value',
              align: 'center',
            },
          ],
          7,
        );
      }
    }
  }

  if (datosEvolucion.evaluacion) {
    agregarTituloSeccion('EVALUACIÓN');
    dibujarFila(
      [
        { span: 1, text: 'ESTADO CLÍNICO', kind: 'label' },
        {
          span: 3,
          text: formatearValor(datosEvolucion.evaluacion.estadoClinico),
          kind: 'value',
        },
        { span: 1, text: 'PRONÓSTICO', kind: 'label' },
        {
          span: 3,
          text: formatearValor(datosEvolucion.evaluacion.pronostico),
          kind: 'value',
        },
      ],
      8,
    );
  }

  if (datosEvolucion.evolucionLibre) {
    agregarTituloSeccion('EVOLUCIÓN CLÍNICA');
    escribirTextoConSaltoLinea(
      datosEvolucion.evolucionLibre,
      anchoContenido - 3,
    );
  }

  if (datosEvolucion.plan?.indicacionesGenerales) {
    const indicacionesGenerales = datosEvolucion.plan.indicacionesGenerales;
    const itemsIndicaciones: [string, string][] = [];
    if (indicacionesGenerales.dieta) {
      itemsIndicaciones.push(['DIETA', String(indicacionesGenerales.dieta)]);
    }
    if (indicacionesGenerales.reposo) {
      itemsIndicaciones.push(['REPOSO', String(indicacionesGenerales.reposo)]);
    }
    if (indicacionesGenerales.hidratacion) {
      itemsIndicaciones.push([
        'HIDRATACIÓN',
        String(indicacionesGenerales.hidratacion),
      ]);
    }
    if (indicacionesGenerales.oxigeno) {
      itemsIndicaciones.push([
        'OXÍGENO',
        String(indicacionesGenerales.oxigeno),
      ]);
    }
    if (indicacionesGenerales.restricciones) {
      itemsIndicaciones.push([
        'RESTRICCIONES',
        String(indicacionesGenerales.restricciones),
      ]);
    }

    if (itemsIndicaciones.length > 0) {
      agregarTituloSeccion('INDICACIONES');
      for (const [etiqueta, valorIndicacion] of itemsIndicaciones) {
        dibujarFila(
          [
            { span: 2, text: etiqueta, kind: 'label' },
            { span: 6, text: valorIndicacion, kind: 'value' },
          ],
          7,
        );
      }
    }
  }

  if (datosEvolucion.sintomas && datosEvolucion.sintomas.length > 0) {
    agregarTituloSeccion('SÍNTOMAS REFERIDOS');
    escribirTextoConSaltoLinea(
      datosEvolucion.sintomas.join(', '),
      anchoContenido - 3,
    );
  }

  posicionVertical += 8;
  if (posicionVertical > 265) {
    documentoPdf.addPage();
    posicionVertical = 20;
  }
  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(7);
  documentoPdf.setTextColor(100, 100, 100);
  documentoPdf.text(
    `Fecha de impresión: ${fechaImpresion}`,
    anchoPagina - margenDerecho,
    posicionVertical,
    { align: 'right' },
  );
  documentoPdf.text(
    `Usuario: ${nombreUsuario}`,
    anchoPagina - margenDerecho,
    posicionVertical + 4,
    { align: 'right' },
  );

  return documentoPdf;
}
