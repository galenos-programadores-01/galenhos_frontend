import type { jsPDF } from 'jspdf';
import type { IPacienteDatosAdicionales } from '../../../../compartido/tipos/tipos';

export interface SolicitudExamenPdfItem {
  tipo?: string;
  examen?: string;
  indicacion?: string;
  prioridad?: string;
  [key: string]: unknown;
}

export interface InterconsultaPdfItem {
  especialidad?: string;
  IdEspecialidad?: number;
  medico?: string;
  idMedicoDestino?: number;
  motivo?: string;
  estado?: string;
  fechaSolicitud?: string;
  [key: string]: unknown;
}

export interface PlanEvolucionPdf {
  farmacologico?: Record<string, unknown>[];
  solicitudExamenes?: SolicitudExamenPdfItem[] | Record<string, unknown>;
  interconsultas?: InterconsultaPdfItem[] | Record<string, unknown>;
  indicacionesGenerales?: Record<string, unknown>;
}

export interface EvolucionPdfData {
  paciente: {
    nombre: string;
    historia: string;
    idRegAtencion: number;
    edad: string;
    sexo: string;
    ubicacion: string;
    servicio?: string;
    especialidad?: string;
    cama: string;
    estado: string;
  };
  cabecera: {
    fecha: string;
    hora: string;
    medicoTratante: string;
    tipoAtencion: string;
    servicio?: string;
    especialidad?: string;
    dni?: string;
    colegiatura?: string;
    rne?: string;
  };
  antecedentes?: IPacienteDatosAdicionales | null;
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
    estado?: string | null;
  }[];
  evolucionLibre?: string;
  plan?: PlanEvolucionPdf;
  interconsultas?: InterconsultaPdfItem[];
  sintomas?: string[];
  ordenesMedicas?: Record<string, unknown>;
}

export interface DatosInstitucion {
  rucEess?: string | null;
  nombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  logoMinsa?: string | null;
  logoHospi?: string | null;
}

const COLOR_PRIMARIO: [number, number, number] = [26, 54, 93];
const COLOR_PRIMARIO_OSCURO: [number, number, number] = [15, 23, 42];
const COLOR_PRIMARIO_PROFUNDO: [number, number, number] = [10, 25, 47];
const COLOR_PRIMARIO_ACENTO: [number, number, number] = [37, 99, 235];

const COLOR_TEXTO_TITULO: [number, number, number] = [15, 23, 42];
const COLOR_TEXTO_CUERPO: [number, number, number] = [30, 41, 59];
const COLOR_TEXTO_MUTED: [number, number, number] = [71, 85, 105];
const COLOR_TEXTO_CLARO: [number, number, number] = [100, 116, 139];

const COLOR_FONDO_BLANCO: [number, number, number] = [255, 255, 255];
const COLOR_FONDO_GRIS: [number, number, number] = [248, 250, 252];
const COLOR_FONDO_HEADER: [number, number, number] = [241, 245, 249];

const COLOR_BORDE_SUAVE: [number, number, number] = [226, 232, 240];
const COLOR_BORDE_MEDIO: [number, number, number] = [203, 213, 225];

const COLOR_ALERTA_FONDO: [number, number, number] = [254, 243, 199];
const COLOR_ALERTA_BORDE: [number, number, number] = [252, 211, 77];
const COLOR_ALERTA_TEXTO: [number, number, number] = [180, 83, 9];

function esSignoVitalAlerta(etiqueta: string, valorTexto: string): boolean {
  if (!valorTexto || valorTexto === '—') return false;

  if (etiqueta === 'Sat. O₂') {
    const valor = Number.parseFloat(valorTexto);
    return !Number.isNaN(valor) && valor < 95;
  }
  if (etiqueta === 'TEMP.') {
    const valor = Number.parseFloat(valorTexto);
    return !Number.isNaN(valor) && (valor >= 38.0 || valor < 36.0);
  }
  if (etiqueta === 'F.C.') {
    const valor = Number.parseFloat(valorTexto);
    return !Number.isNaN(valor) && (valor > 100 || valor < 55);
  }
  if (etiqueta === 'F.R.') {
    const valor = Number.parseFloat(valorTexto);
    return !Number.isNaN(valor) && (valor > 22 || valor < 12);
  }
  if (etiqueta === 'P.A.') {
    const partes = valorTexto.split('/');
    if (partes.length === 2) {
      const sistolica = Number.parseFloat(partes[0]);
      const diastolica = Number.parseFloat(partes[1]);
      const sistolicaAlerta =
        !Number.isNaN(sistolica) && (sistolica >= 140 || sistolica < 90);
      const diastolicaAlerta =
        !Number.isNaN(diastolica) && (diastolica >= 90 || diastolica < 60);
      return sistolicaAlerta || diastolicaAlerta;
    }
  }
  return false;
}

function convertirTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }
  return '';
}

function formatearValor(valor: unknown): string {
  const texto = convertirTexto(valor);
  return texto || '—';
}

class PdfLienzoEvolucion {
  public readonly anchoPagina = 210;
  public readonly altoPagina = 297;
  public readonly margenIzquierdo = 14;
  public readonly margenDerecho = 14;
  public readonly anchoContenido: number;
  public posicionVertical = 10;
  private readonly limiteInferior = 276;
  public pacienteNombre = '';
  public pacienteHistoria = '';

  constructor(public readonly doc: jsPDF) {
    this.anchoContenido =
      this.anchoPagina - this.margenIzquierdo - this.margenDerecho;
  }

  asegurarEspacio(alturaNecesaria: number): void {
    if (this.posicionVertical + alturaNecesaria > this.limiteInferior) {
      this.doc.addPage();
      this.dibujarBandaSuperior();
      this.posicionVertical = 14;
    }
  }

  dibujarBandaSuperior(): void {
    this.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.rect(0, 0, this.anchoPagina, 2.8, 'F');
    this.doc.setFillColor(...COLOR_PRIMARIO_ACENTO);
    this.doc.rect(0, 2.8, this.anchoPagina, 0.8, 'F');
  }

  dibujarTituloSeccion(titulo: string, subtitulo?: string): void {
    this.asegurarEspacio(10);
    this.posicionVertical += 2.5;

    this.doc.setFillColor(...COLOR_FONDO_HEADER);
    this.doc.setDrawColor(...COLOR_BORDE_MEDIO);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      5.8,
      1,
      1,
      'FD',
    );

    this.doc.setFillColor(...COLOR_PRIMARIO);
    this.doc.rect(this.margenIzquierdo, this.posicionVertical, 3, 5.8, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(...COLOR_PRIMARIO_PROFUNDO);
    this.doc.text(
      titulo.toUpperCase(),
      this.margenIzquierdo + 5.5,
      this.posicionVertical + 4.1,
    );

    if (subtitulo) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(...COLOR_TEXTO_MUTED);
      this.doc.text(
        subtitulo,
        this.anchoPagina - this.margenDerecho - 3,
        this.posicionVertical + 4.1,
        { align: 'right' },
      );
    }

    this.posicionVertical += 7.2;
  }

  dibujarEncabezadoInstitucion(institucion: DatosInstitucion | null): void {
    this.dibujarBandaSuperior();
    this.posicionVertical = 7;

    const tieneLogoMinsa = Boolean(institucion?.logoMinsa);
    if (tieneLogoMinsa && institucion?.logoMinsa) {
      try {
        this.doc.addImage(
          `data:image/png;base64,${institucion.logoMinsa}`,
          'PNG',
          this.margenIzquierdo,
          this.posicionVertical + 1,
          18,
          18,
        );
      } catch {
        /* Continuar */
      }
    }

    const tieneLogoHospi = Boolean(institucion?.logoHospi);
    if (tieneLogoHospi && institucion?.logoHospi) {
      try {
        this.doc.addImage(
          `data:image/png;base64,${institucion.logoHospi}`,
          'PNG',
          this.anchoPagina - this.margenDerecho - 18,
          this.posicionVertical + 1,
          18,
          18,
        );
      } catch {
        /* Continuar */
      }
    }

    const posXCentro = this.anchoPagina / 2;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.8);
    this.doc.setTextColor(...COLOR_TEXTO_MUTED);
    this.doc.text(
      'GOBIERNO DEL PERÚ  •  MINISTERIO DE SALUD',
      posXCentro,
      this.posicionVertical + 3.5,
      { align: 'center' },
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(...COLOR_TEXTO_TITULO);
    this.doc.text(
      'HOSPITAL NACIONAL SERGIO E. BERNALES',
      posXCentro,
      this.posicionVertical + 8.5,
      { align: 'center' },
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.text(
      'COMPLEJO HOSPITALARIO DE ALTA COMPLEJIDAD — LIMA NORTE',
      posXCentro,
      this.posicionVertical + 12.2,
      { align: 'center' },
    );

    const anchoBannerDoc = 110;
    const altoBannerDoc = 5;
    const xBannerDoc = posXCentro - anchoBannerDoc / 2;
    const yBannerDoc = this.posicionVertical + 14.5;

    this.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.roundedRect(
      xBannerDoc,
      yBannerDoc,
      anchoBannerDoc,
      altoBannerDoc,
      1,
      1,
      'F',
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(...COLOR_FONDO_BLANCO);
    this.doc.text(
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
      .filter((d) => d && d !== '—')
      .join('   •   ');

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5.2);
    this.doc.setTextColor(...COLOR_TEXTO_MUTED);
    this.doc.text(datosContacto, posXCentro, this.posicionVertical + 22.5, {
      align: 'center',
    });

    this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    this.doc.setLineWidth(0.2);
    this.doc.line(
      this.margenIzquierdo,
      this.posicionVertical + 25,
      this.anchoPagina - this.margenDerecho,
      this.posicionVertical + 25,
    );

    this.posicionVertical += 27;
  }

  dibujarTarjetaPaciente(
    paciente: EvolucionPdfData['paciente'],
    cabecera: EvolucionPdfData['cabecera'],
  ): void {
    this.pacienteNombre = paciente.nombre;
    this.pacienteHistoria = paciente.historia;

    this.dibujarTituloSeccion(
      'IDENTIFICACIÓN DEL PACIENTE Y ATENCIÓN CLÍNICA',
      `REGISTRO N° EV-${paciente.idRegAtencion}`,
    );

    const servicioTexto =
      convertirTexto(paciente.servicio) ||
      convertirTexto(cabecera.servicio) ||
      convertirTexto(paciente.ubicacion);
    const especialidadTexto =
      convertirTexto(paciente.especialidad) ||
      convertirTexto(cabecera.especialidad);

    const camposFila1 = [
      { etiqueta: 'EDAD', valor: formatearValor(paciente.edad), ancho: 38 },
      { etiqueta: 'SEXO', valor: formatearValor(paciente.sexo), ancho: 20 },
      { etiqueta: 'ESTADO', valor: formatearValor(paciente.estado), ancho: 26 },
      {
        etiqueta: 'SERVICIO',
        valor: formatearValor(servicioTexto),
        ancho: 70,
      },
      {
        etiqueta: 'CAMA',
        valor: formatearValor(paciente.cama),
        ancho: 28,
      },
    ];

    const camposFila2 = [
      {
        etiqueta: 'MÉDICO TRATANTE',
        valor: formatearValor(cabecera.medicoTratante),
        ancho: 62,
      },
      {
        etiqueta: 'ESPECIALIDAD',
        valor: formatearValor(especialidadTexto),
        ancho: 52,
      },
      {
        etiqueta: 'TIPO DE ATENCIÓN',
        valor: formatearValor(cabecera.tipoAtencion),
        ancho: 32,
      },
      {
        etiqueta: 'FECHA Y HORA',
        valor: `${formatearValor(cabecera.fecha)}   ${formatearValor(cabecera.hora)}`,
        ancho: 36,
      },
    ];

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.5);

    let maxLineasFila1 = 1;
    const camposProcesadosFila1 = camposFila1.map((campo) => {
      const lineas = this.doc.splitTextToSize(campo.valor, campo.ancho - 3);
      if (lineas.length > maxLineasFila1) {
        maxLineasFila1 = lineas.length;
      }
      return { ...campo, lineas };
    });
    const altoFila1 = Math.max(9, maxLineasFila1 * 3.4 + 4.8);

    let maxLineasFila2 = 1;
    const camposProcesadosFila2 = camposFila2.map((campo) => {
      const lineas = this.doc.splitTextToSize(campo.valor, campo.ancho - 3);
      if (lineas.length > maxLineasFila2) {
        maxLineasFila2 = lineas.length;
      }
      return { ...campo, lineas };
    });
    const altoFila2 = Math.max(9, maxLineasFila2 * 3.4 + 4.8);

    const altoCabecera = 11.5;
    const alturaTarjeta = altoCabecera + altoFila1 + altoFila2 + 3.0;

    this.asegurarEspacio(alturaTarjeta + 3);

    this.doc.setFillColor(...COLOR_FONDO_GRIS);
    this.doc.setDrawColor(...COLOR_BORDE_MEDIO);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      alturaTarjeta,
      1.5,
      1.5,
      'FD',
    );

    this.doc.setFillColor(...COLOR_PRIMARIO);
    this.doc.rect(
      this.margenIzquierdo,
      this.posicionVertical,
      2.5,
      alturaTarjeta,
      'F',
    );

    const posX = this.margenIzquierdo + 5;
    const posYHeader = this.posicionVertical + 5.2;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.5);
    this.doc.setTextColor(...COLOR_TEXTO_MUTED);
    this.doc.text('PACIENTE:', posX, posYHeader);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...COLOR_TEXTO_TITULO);
    const nombrePaciente = (
      paciente.nombre || 'PACIENTE NO IDENTIFICADO'
    ).toUpperCase();
    this.doc.text(nombrePaciente, posX + 16, posYHeader, {
      maxWidth: this.anchoContenido - 85,
    });

    const textoBadges = `HC: ${paciente.historia || 'S/N'}  •  ATENCIÓN: EV-${paciente.idRegAtencion}`;
    const xBadges = this.anchoPagina - this.margenDerecho - 4;
    const anchoBadges = 58;

    this.doc.setFillColor(...COLOR_PRIMARIO);
    this.doc.roundedRect(
      xBadges - anchoBadges,
      posYHeader - 3.8,
      anchoBadges,
      5.2,
      1,
      1,
      'F',
    );
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.8);
    this.doc.setTextColor(...COLOR_FONDO_BLANCO);
    this.doc.text(textoBadges, xBadges - anchoBadges / 2, posYHeader - 0.2, {
      align: 'center',
    });

    const yLineaDiv = posYHeader + 4.2;
    this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    this.doc.setLineWidth(0.18);
    this.doc.line(
      posX,
      yLineaDiv,
      this.anchoPagina - this.margenDerecho - 4,
      yLineaDiv,
    );

    const yFila1 = yLineaDiv + 4.5;
    let xCampo1 = posX;
    for (const campo of camposProcesadosFila1) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(...COLOR_TEXTO_MUTED);
      this.doc.text(campo.etiqueta, xCampo1, yFila1);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...COLOR_TEXTO_TITULO);
      this.doc.text(campo.lineas, xCampo1, yFila1 + 3.6);

      xCampo1 += campo.ancho;
    }

    const yFila2 = yFila1 + altoFila1;
    let xCampo2 = posX;
    for (const campo of camposProcesadosFila2) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(...COLOR_TEXTO_MUTED);
      this.doc.text(campo.etiqueta, xCampo2, yFila2);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...COLOR_TEXTO_TITULO);
      this.doc.text(campo.lineas, xCampo2, yFila2 + 3.6);

      xCampo2 += campo.ancho;
    }

    this.posicionVertical += alturaTarjeta + 3;
  }

  dibujarSignosVitales(
    signosVitales: Record<string, unknown> | undefined,
  ): void {
    if (!signosVitales) return;

    this.dibujarTituloSeccion(
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
      (this.anchoContenido - (totalTarjetas - 1) * espaciado) / totalTarjetas;
    const altoTarjeta = 13.5;

    this.asegurarEspacio(altoTarjeta + 2);

    let x = this.margenIzquierdo;
    for (const item of listaSignos) {
      const tieneAlerta = esSignoVitalAlerta(item.etiqueta, item.valor);

      this.doc.setFillColor(...COLOR_FONDO_BLANCO);
      this.doc.setDrawColor(
        ...(tieneAlerta ? COLOR_ALERTA_BORDE : COLOR_BORDE_SUAVE),
      );
      this.doc.setLineWidth(tieneAlerta ? 0.22 : 0.2);
      this.doc.roundedRect(
        x,
        this.posicionVertical,
        anchoTarjeta,
        altoTarjeta,
        1,
        1,
        'FD',
      );

      this.doc.setFillColor(
        ...(tieneAlerta ? COLOR_ALERTA_FONDO : COLOR_FONDO_GRIS),
      );
      this.doc.roundedRect(
        x,
        this.posicionVertical,
        anchoTarjeta,
        4.2,
        1,
        1,
        'F',
      );

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(4.8);
      this.doc.setTextColor(
        ...(tieneAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_MUTED),
      );
      this.doc.text(
        item.etiqueta,
        x + anchoTarjeta / 2,
        this.posicionVertical + 3,
        { align: 'center' },
      );

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(
        ...(tieneAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_TITULO),
      );
      this.doc.text(
        item.valor,
        x + anchoTarjeta / 2,
        this.posicionVertical + 8.8,
        { align: 'center' },
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(4.8);
      this.doc.setTextColor(
        ...(tieneAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_CLARO),
      );
      this.doc.text(
        item.unidad,
        x + anchoTarjeta / 2,
        this.posicionVertical + 11.8,
        { align: 'center' },
      );

      x += anchoTarjeta + espaciado;
    }

    this.posicionVertical += altoTarjeta + 2;

    const glucemiaValor = signosVitales.glucemia;
    if (glucemiaValor) {
      this.asegurarEspacio(8);
      this.doc.setFillColor(...COLOR_ALERTA_FONDO);
      this.doc.setDrawColor(...COLOR_ALERTA_BORDE);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        5.8,
        1,
        1,
        'FD',
      );

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_ALERTA_TEXTO);
      this.doc.text(
        `GLICEMIA CAPILAR: ${formatearValor(glucemiaValor)} mg/dL`,
        this.margenIzquierdo + 4,
        this.posicionVertical + 4.1,
      );

      this.posicionVertical += 7.8;
    }
  }

  private obtenerTextoComorbilidades(
    antecedentes: IPacienteDatosAdicionales,
  ): string {
    const catalogoComorbilidades: [keyof IPacienteDatosAdicionales, string][] =
      [
        ['hipertensionArterial', 'Hipertensión Arterial'],
        ['anemia', 'Anemia'],
        ['tuberculosis', 'Tuberculosis'],
        ['obesidad', 'Obesidad'],
        ['higadoGraso', 'Hígado Graso'],
        ['fumaActualmente', 'Tabaquismo Activo'],
        ['dislipidemia', 'Dislipidemia'],
        ['enfTiroidea', 'Enfermedad Tiroidea'],
        ['cancer', 'Neoplasia / Cáncer'],
      ];

    const encontradas = catalogoComorbilidades
      .filter(([campo]) => antecedentes[campo] === 1)
      .map(([, nombre]) => nombre);

    return encontradas.length > 0
      ? encontradas.join(' • ')
      : 'Sin comorbilidades reportadas';
  }

  dibujarAntecedentes(
    antecedentes: IPacienteDatosAdicionales | null | undefined,
  ): void {
    if (!antecedentes) return;

    this.dibujarTituloSeccion('HISTORIAL CLÍNICO Y ANTECEDENTES RELEVANTES');

    const filasAntecedentes = [
      {
        etiqueta1: 'QUIRÚRGICOS',
        valor1: formatearValor(antecedentes.antecedQuirurgico),
        etiqueta2: 'PATOLÓGICOS',
        valor2: formatearValor(antecedentes.antecedPatologico),
      },
      {
        etiqueta1: 'OBSTÉTRICOS',
        valor1: formatearValor(antecedentes.antecedObstetrico),
        etiqueta2: 'ALERGIAS / REACCIONES',
        valor2: formatearValor(antecedentes.antecedAlergico),
      },
      {
        etiqueta1: 'FAMILIARES',
        valor1: formatearValor(antecedentes.antecedFamiliar),
        etiqueta2: 'OTROS ANTECEDENTES',
        valor2: formatearValor(antecedentes.antecedentes),
      },
    ];

    const anchoMitad = (this.anchoContenido - 2) / 2;

    for (const fila of filasAntecedentes) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.8);
      const lineasValor1 = this.doc.splitTextToSize(
        fila.valor1,
        anchoMitad - 34,
      );
      const lineasValor2 = this.doc.splitTextToSize(
        fila.valor2,
        anchoMitad - 40,
      );
      const maxLineas = Math.max(lineasValor1.length, lineasValor2.length);
      const altoFila = Math.max(6.8, maxLineas * 3.2 + 3.4);

      this.asegurarEspacio(altoFila + 2);

      const esAlergiaAlerta =
        fila.etiqueta2.includes('ALERGIAS') &&
        fila.valor2 !== '—' &&
        !fila.valor2.toLowerCase().includes('niega') &&
        !fila.valor2.toLowerCase().includes('ningun') &&
        !fila.valor2.toLowerCase().includes('no refiere');

      this.doc.setFillColor(...COLOR_FONDO_BLANCO);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.roundedRect(
        this.margenIzquierdo,
        this.posicionVertical,
        anchoMitad,
        altoFila,
        0.8,
        0.8,
        'FD',
      );

      if (esAlergiaAlerta) {
        this.doc.setFillColor(...COLOR_ALERTA_FONDO);
        this.doc.setDrawColor(...COLOR_ALERTA_BORDE);
        this.doc.setLineWidth(0.2);
      } else {
        this.doc.setFillColor(...COLOR_FONDO_BLANCO);
        this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
        this.doc.setLineWidth(0.18);
      }
      this.doc.roundedRect(
        this.margenIzquierdo + anchoMitad + 2,
        this.posicionVertical,
        anchoMitad,
        altoFila,
        0.8,
        0.8,
        'FD',
      );

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
      this.doc.text(
        fila.etiqueta1,
        this.margenIzquierdo + 2.5,
        this.posicionVertical + 4.0,
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      this.doc.text(
        lineasValor1,
        this.margenIzquierdo + 32,
        this.posicionVertical + 4.0,
      );

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(
        ...(esAlergiaAlerta ? COLOR_ALERTA_TEXTO : COLOR_PRIMARIO_OSCURO),
      );
      this.doc.text(
        fila.etiqueta2,
        this.margenIzquierdo + anchoMitad + 4.5,
        this.posicionVertical + 4.0,
      );

      this.doc.setFont('helvetica', esAlergiaAlerta ? 'bold' : 'normal');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(
        ...(esAlergiaAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_CUERPO),
      );
      this.doc.text(
        lineasValor2,
        this.margenIzquierdo + anchoMitad + 38,
        this.posicionVertical + 4.0,
      );

      this.posicionVertical += altoFila + 1.5;
    }

    const comorbilidadesTexto = this.obtenerTextoComorbilidades(antecedentes);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5.8);
    const lineasComorb = this.doc.splitTextToSize(
      comorbilidadesTexto,
      this.anchoContenido - 35,
    );
    const altoComorb = Math.max(6.8, lineasComorb.length * 3.2 + 3.4);

    this.asegurarEspacio(altoComorb + 2);

    this.doc.setFillColor(...COLOR_FONDO_GRIS);
    this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    this.doc.setLineWidth(0.18);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      altoComorb,
      0.8,
      0.8,
      'FD',
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5);
    this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.text(
      'COMORBILIDADES',
      this.margenIzquierdo + 2.5,
      this.posicionVertical + 4.0,
    );

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5.8);
    this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
    this.doc.text(
      lineasComorb,
      this.margenIzquierdo + 32,
      this.posicionVertical + 4.0,
    );

    this.posicionVertical += altoComorb + 2.5;
  }

  dibujarMotivo(motivo: Record<string, unknown> | undefined): void {
    if (!motivo) return;

    const tipoDirecto = convertirTexto(motivo.tipo);
    const mapeoClaves: [string, string][] = [
      ['motivoConsulta', 'Motivo de consulta'],
      ['seguimiento', 'Seguimiento'],
      ['control', 'Control médico'],
      ['reevaluacion', 'Reevaluación'],
      ['postoperatorio', 'Postoperatorio'],
      ['interconsulta', 'Interconsulta'],
      ['emergencia', 'Atención de Emergencia'],
    ];

    const seleccionados = mapeoClaves
      .filter(([clave]) => Boolean(motivo[clave]))
      .map(([, etiqueta]) => etiqueta);

    const tipoFinal =
      tipoDirecto ||
      (seleccionados.length > 0
        ? seleccionados.join(', ')
        : 'Consulta médica general');
    const detalleMotivo = convertirTexto(motivo.descripcion || motivo.detalle);

    this.dibujarTituloSeccion('MOTIVO DE CONSULTA Y RAZÓN DE ATENCIÓN');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.2);
    const lineasTipo = this.doc.splitTextToSize(
      tipoFinal,
      this.anchoContenido - 36,
    );
    const altoTipo = Math.max(6.8, lineasTipo.length * 3.4 + 3.4);

    this.asegurarEspacio(altoTipo + (detalleMotivo ? 12 : 2));

    this.doc.setFillColor(...COLOR_FONDO_BLANCO);
    this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    this.doc.setLineWidth(0.18);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      altoTipo,
      0.8,
      0.8,
      'FD',
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.2);
    this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.text(
      'MODALIDAD / TIPO:',
      this.margenIzquierdo + 3,
      this.posicionVertical + 4.2,
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...COLOR_TEXTO_TITULO);
    this.doc.text(
      lineasTipo,
      this.margenIzquierdo + 34,
      this.posicionVertical + 4.2,
    );

    this.posicionVertical += altoTipo + 1.5;

    if (detalleMotivo) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      const lineasDetalle = this.doc.splitTextToSize(
        detalleMotivo,
        this.anchoContenido - 6,
      );
      const altoDetalle = Math.max(7, lineasDetalle.length * 3.5 + 4);

      this.doc.setFillColor(...COLOR_FONDO_GRIS);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.roundedRect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        altoDetalle,
        0.8,
        0.8,
        'FD',
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      this.doc.text(
        lineasDetalle,
        this.margenIzquierdo + 3,
        this.posicionVertical + 4,
      );

      this.posicionVertical += altoDetalle + 2;
    }
  }

  dibujarSubjetivo(
    subjetivo: Record<string, unknown> | undefined,
    sintomas: string[] | undefined,
  ): void {
    if (!subjetivo && (!sintomas || sintomas.length === 0)) return;

    this.dibujarTituloSeccion('ANAMNESIS Y SUBJETIVO (S)', 'SÍNTOMAS Y RELATO');

    const listaSintomas = this.extraerListaSintomas(subjetivo, sintomas);
    this.dibujarTarjetaSintomas(listaSintomas, subjetivo?.escalaDolor);

    const relatoCronologico = convertirTexto(subjetivo?.evolucionSintomas);
    if (relatoCronologico) {
      this.dibujarTarjetaRelato(relatoCronologico);
    }
  }

  private extraerListaSintomas(
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

  private dibujarTarjetaSintomas(
    listaSintomas: string[],
    escalaDolor: unknown,
  ): void {
    const tieneDolor =
      escalaDolor !== undefined && escalaDolor !== null && escalaDolor !== '';

    if (listaSintomas.length === 0 && !tieneDolor) return;

    const valorDolor = Number(escalaDolor);
    const tieneDolorActivo = !Number.isNaN(valorDolor) && valorDolor > 0;
    const evaTexto = `EVA DOLOR: ${escalaDolor} / 10`;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.8);
    const anchoTextoEva = this.doc.getTextWidth(evaTexto);
    const anchoBadge = tieneDolor ? Math.max(34, anchoTextoEva + 8) : 0;

    const anchoMaxSintomas = tieneDolor
      ? this.anchoContenido - anchoBadge - 10
      : this.anchoContenido - 42;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    const textoSintomas =
      listaSintomas.length > 0
        ? listaSintomas.join('  •  ')
        : 'No especifica síntomas agudos';
    const lineasSintomas = this.doc.splitTextToSize(
      textoSintomas,
      anchoMaxSintomas,
    );
    const altoSintomas = Math.max(7.2, lineasSintomas.length * 3.4 + 3.8);

    this.asegurarEspacio(altoSintomas + 2);

    this.doc.setFillColor(...COLOR_FONDO_BLANCO);
    this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    this.doc.setLineWidth(0.18);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      altoSintomas,
      0.8,
      0.8,
      'FD',
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.2);
    this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.text(
      'SÍNTOMAS PRINCIPALES:',
      this.margenIzquierdo + 3,
      this.posicionVertical + 4.5,
    );

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...COLOR_TEXTO_TITULO);
    this.doc.text(
      lineasSintomas,
      this.margenIzquierdo + 38,
      this.posicionVertical + 4.5,
    );

    if (tieneDolor) {
      this.dibujarBadgeDolor(
        altoSintomas,
        anchoBadge,
        tieneDolorActivo,
        evaTexto,
      );
    }

    this.posicionVertical += altoSintomas + 2;
  }

  private dibujarTarjetaRelato(relatoCronologico: string): void {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    const lineasRelato = this.doc.splitTextToSize(
      relatoCronologico,
      this.anchoContenido - 6,
    );
    const altoRelato = Math.max(7, lineasRelato.length * 3.5 + 5);

    this.asegurarEspacio(altoRelato);

    this.doc.setFillColor(...COLOR_FONDO_GRIS);
    this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    this.doc.setLineWidth(0.18);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      altoRelato,
      0.8,
      0.8,
      'FD',
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.2);
    this.doc.setTextColor(...COLOR_TEXTO_MUTED);
    this.doc.text(
      'RELATO CRONOLÓGICO:',
      this.margenIzquierdo + 3,
      this.posicionVertical + 3.8,
    );

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
    this.doc.text(
      lineasRelato,
      this.margenIzquierdo + 3,
      this.posicionVertical + 7.2,
    );

    this.posicionVertical += altoRelato + 2;
  }

  private dibujarBadgeDolor(
    altoSintomas: number,
    anchoBadge: number,
    tieneDolorActivo: boolean,
    evaTexto: string,
  ): void {
    const x = this.anchoPagina - this.margenDerecho - anchoBadge - 2;
    const y = this.posicionVertical + (altoSintomas - 5.4) / 2;

    if (tieneDolorActivo) {
      this.doc.setFillColor(...COLOR_ALERTA_FONDO);
      this.doc.setDrawColor(...COLOR_ALERTA_BORDE);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(x, y, anchoBadge, 5.4, 1, 1, 'FD');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(...COLOR_ALERTA_TEXTO);
    } else {
      this.doc.setFillColor(...COLOR_FONDO_HEADER);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.roundedRect(x, y, anchoBadge, 5.4, 1, 1, 'FD');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(...COLOR_TEXTO_MUTED);
    }

    this.doc.text(evaTexto, x + anchoBadge / 2, y + 3.8, { align: 'center' });
  }

  dibujarExamenFisico(examenFisico: EvolucionPdfData['examenFisico']): void {
    if (!examenFisico || examenFisico.length === 0) return;

    const itemsConHallazgo = examenFisico.filter(
      (e) => convertirTexto(e.hallazgo).length > 0,
    );

    if (itemsConHallazgo.length === 0) return;

    this.dibujarTituloSeccion('EXAMEN FÍSICO REGIONAL POR SISTEMAS (O)');

    for (const item of itemsConHallazgo) {
      const sistemaTexto = (item.sistema || 'SISTEMA').toUpperCase();
      const hallazgoTexto = convertirTexto(item.hallazgo);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      const lineasHallazgo = this.doc.splitTextToSize(
        hallazgoTexto,
        this.anchoContenido - 44,
      );
      const altoFila = Math.max(6.5, lineasHallazgo.length * 3.4 + 3);

      this.asegurarEspacio(altoFila);

      this.doc.setFillColor(...COLOR_FONDO_BLANCO);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.roundedRect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        altoFila,
        0.8,
        0.8,
        'FD',
      );

      this.doc.setFillColor(...COLOR_FONDO_GRIS);
      this.doc.roundedRect(
        this.margenIzquierdo,
        this.posicionVertical,
        38,
        altoFila,
        0.8,
        0.8,
        'F',
      );

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
      this.doc.text(
        sistemaTexto,
        this.margenIzquierdo + 3,
        this.posicionVertical + altoFila / 2 + 0.8,
        { maxWidth: 33 },
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      this.doc.text(
        lineasHallazgo,
        this.margenIzquierdo + 41,
        this.posicionVertical + 4.2,
      );

      this.posicionVertical += altoFila + 1.2;
    }
  }

  dibujarDiagnosticos(diagnosticos: EvolucionPdfData['diagnosticos']): void {
    if (!diagnosticos || diagnosticos.length === 0) return;

    this.dibujarTituloSeccion(
      'DIAGNÓSTICOS CLÍNICOS CODIFICADOS (CIE-10) — ANÁLISIS (A)',
    );

    const altoHeader = 5.8;
    this.asegurarEspacio(altoHeader + 8);

    this.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
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

    let xH = this.margenIzquierdo;
    for (const col of columnas) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(...COLOR_FONDO_BLANCO);
      if (col.align === 'center') {
        this.doc.text(
          col.titulo,
          xH + col.ancho / 2,
          this.posicionVertical + 3.8,
          {
            align: 'center',
          },
        );
      } else {
        this.doc.text(col.titulo, xH + 3, this.posicionVertical + 3.8);
      }
      xH += col.ancho;
    }

    this.posicionVertical += altoHeader + 0.8;

    let indexFila = 0;
    for (const d of diagnosticos) {
      if (!d.cie10 && !d.descripcion) continue;

      const desc = formatearValor(d.descripcion);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      const lineasDesc = this.doc.splitTextToSize(desc, 96);
      const altoFila = Math.max(6.2, lineasDesc.length * 3.4 + 2.8);

      this.asegurarEspacio(altoFila);

      const colorFondo =
        indexFila % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      this.doc.setFillColor(...colorFondo);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.rect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        altoFila,
        'FD',
      );

      let xC = this.margenIzquierdo;

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
      this.doc.text(
        formatearValor(d.cie10),
        xC + columnas[0].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
      xC += columnas[0].ancho;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_TEXTO_TITULO);
      this.doc.text(lineasDesc, xC + 3, this.posicionVertical + 4);
      xC += columnas[1].ancho;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      this.doc.text(
        formatearValor(d.tipo),
        xC + columnas[2].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
      xC += columnas[2].ancho;

      this.doc.text(
        formatearValor(d.condicion),
        xC + columnas[3].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
      xC += columnas[3].ancho;

      this.doc.text(
        formatearValor(d.estado),
        xC + columnas[4].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );

      this.posicionVertical += altoFila;
      indexFila++;
    }

    this.posicionVertical += 2;
  }

  dibujarEvaluacion(
    evaluacion: Record<string, unknown> | undefined,
    evolucionLibre: string | undefined,
  ): void {
    if (evaluacion) {
      this.dibujarTituloSeccion('ESTADO GENERAL Y PRONÓSTICO MÉDICO');

      this.asegurarEspacio(14);

      this.doc.setFillColor(...COLOR_FONDO_BLANCO);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.roundedRect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        6.5,
        0.8,
        0.8,
        'FD',
      );

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.2);
      this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
      this.doc.text(
        'ESTADO CLÍNICO:',
        this.margenIzquierdo + 3,
        this.posicionVertical + 4.2,
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

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(
        ...(esEstadoAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_TITULO),
      );
      this.doc.text(
        estadoTexto,
        this.margenIzquierdo + 28,
        this.posicionVertical + 4.2,
      );

      const mitadAncho = this.anchoContenido / 2;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.2);
      this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
      this.doc.text(
        'PRONÓSTICO MÉDICO:',
        this.margenIzquierdo + mitadAncho + 3,
        this.posicionVertical + 4.2,
      );

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(
        ...(esPronosticoAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_TITULO),
      );
      this.doc.text(
        pronosticoTexto,
        this.margenIzquierdo + mitadAncho + 35,
        this.posicionVertical + 4.2,
      );

      this.posicionVertical += 7.5;

      const planTrabajo = convertirTexto(evaluacion.planTrabajo);
      if (planTrabajo) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.2);
        const lineasPlan = this.doc.splitTextToSize(
          planTrabajo,
          this.anchoContenido - 6,
        );
        const altoPlan = Math.max(7, lineasPlan.length * 3.5 + 5);

        this.asegurarEspacio(altoPlan);

        this.doc.setFillColor(...COLOR_FONDO_GRIS);
        this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
        this.doc.setLineWidth(0.18);
        this.doc.roundedRect(
          this.margenIzquierdo,
          this.posicionVertical,
          this.anchoContenido,
          altoPlan,
          0.8,
          0.8,
          'FD',
        );

        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(5.2);
        this.doc.setTextColor(...COLOR_TEXTO_MUTED);
        this.doc.text(
          'PLAN DE TRABAJO:',
          this.margenIzquierdo + 3,
          this.posicionVertical + 3.8,
        );

        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.2);
        this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
        this.doc.text(
          lineasPlan,
          this.margenIzquierdo + 3,
          this.posicionVertical + 7.2,
        );

        this.posicionVertical += altoPlan + 2;
      }
    }

    const textoEvolucion = convertirTexto(evolucionLibre);
    if (textoEvolucion) {
      this.dibujarTituloSeccion(
        'EVOLUCIÓN CLÍNICA DETALLADA / NOTA MÉDICA (SOAP)',
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      const lineasEvolucion = this.doc.splitTextToSize(
        textoEvolucion,
        this.anchoContenido - 8,
      );
      const altoEvolucion = Math.max(9, lineasEvolucion.length * 3.6 + 5);

      this.asegurarEspacio(altoEvolucion);

      this.doc.setFillColor(...COLOR_FONDO_BLANCO);
      this.doc.setDrawColor(...COLOR_BORDE_MEDIO);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        altoEvolucion,
        1,
        1,
        'FD',
      );

      this.doc.setFillColor(...COLOR_PRIMARIO);
      this.doc.rect(
        this.margenIzquierdo,
        this.posicionVertical,
        2.5,
        altoEvolucion,
        'F',
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...COLOR_TEXTO_TITULO);
      this.doc.text(
        lineasEvolucion,
        this.margenIzquierdo + 5,
        this.posicionVertical + 4.8,
      );

      this.posicionVertical += altoEvolucion + 2.5;
    }
  }

  private dibujarFarmacologico(
    farmacologico: Record<string, unknown>[] | undefined,
  ): void {
    if (!Array.isArray(farmacologico) || farmacologico.length === 0) return;

    this.dibujarTituloSeccion(
      'TRATAMIENTO FARMACOLÓGICO / RECETA MÉDICA (PLAN - P)',
      '℞ PRESCRIPCIÓN OFICIAL',
    );

    const altoHeader = 5.8;
    this.asegurarEspacio(altoHeader + 8);

    this.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
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

    let xH = this.margenIzquierdo;
    for (const col of columnas) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.2);
      this.doc.setTextColor(...COLOR_FONDO_BLANCO);
      if (col.align === 'center') {
        this.doc.text(
          col.titulo,
          xH + col.ancho / 2,
          this.posicionVertical + 3.8,
          {
            align: 'center',
          },
        );
      } else {
        this.doc.text(col.titulo, xH + 3, this.posicionVertical + 3.8);
      }
      xH += col.ancho;
    }

    this.posicionVertical += altoHeader + 0.8;

    let indexFila = 0;
    for (const f of farmacologico) {
      const nombreMed = convertirTexto(f?.medicamento);
      if (!nombreMed) continue;

      const valorDosis = convertirTexto(f?.dosis);
      const valorUnidad = convertirTexto(f?.unidad);
      const dosisMed = valorDosis ? `${valorDosis} ${valorUnidad}`.trim() : '—';
      const viaMed = formatearValor(f?.via);
      const frecMed = formatearValor(f?.frecuencia);
      const durMed = formatearValor(f?.duracion);
      const cantMed = formatearValor(f?.cantidad);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.2);
      const lineasMed = this.doc.splitTextToSize(nombreMed, 62);
      const altoFila = Math.max(6.2, lineasMed.length * 3.4 + 2.8);

      this.asegurarEspacio(altoFila);

      const colorFondo =
        indexFila % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      this.doc.setFillColor(...colorFondo);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.rect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        altoFila,
        'FD',
      );

      let xC = this.margenIzquierdo;

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_TEXTO_TITULO);
      this.doc.text(lineasMed, xC + 3, this.posicionVertical + 4);
      xC += columnas[0].ancho;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(...COLOR_TEXTO_CUERPO);

      this.doc.text(
        dosisMed,
        xC + columnas[1].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
      xC += columnas[1].ancho;

      this.doc.text(
        viaMed,
        xC + columnas[2].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
      xC += columnas[2].ancho;

      this.doc.text(
        frecMed,
        xC + columnas[3].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
      xC += columnas[3].ancho;

      this.doc.text(
        durMed,
        xC + columnas[4].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );
      xC += columnas[4].ancho;

      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
      this.doc.text(
        cantMed,
        xC + columnas[5].ancho / 2,
        this.posicionVertical + altoFila / 2 + 0.8,
        { align: 'center' },
      );

      this.posicionVertical += altoFila;
      indexFila++;
    }

    this.posicionVertical += 2;
  }

  private dibujarExamenesSolicitados(
    solicitudExamenes: PlanEvolucionPdf['solicitudExamenes'],
  ): void {
    if (!Array.isArray(solicitudExamenes) || solicitudExamenes.length === 0)
      return;

    this.dibujarTituloSeccion('EXÁMENES AUXILIARES Y PRUEBAS DIAGNÓSTICAS');

    const altoHeader = 5.8;
    this.asegurarEspacio(altoHeader + 8);

    this.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
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

    let xH = this.margenIzquierdo;
    for (const col of columnas) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.2);
      this.doc.setTextColor(...COLOR_FONDO_BLANCO);
      if (col.align === 'center') {
        this.doc.text(
          col.titulo,
          xH + col.ancho / 2,
          this.posicionVertical + 3.8,
          {
            align: 'center',
          },
        );
      } else {
        this.doc.text(col.titulo, xH + 3, this.posicionVertical + 3.8);
      }
      xH += col.ancho;
    }

    this.posicionVertical += altoHeader + 0.8;

    let indexFila = 0;
    for (const ex of solicitudExamenes) {
      const nombreExamen = formatearValor(ex?.examen);
      const tipoExamen = formatearValor(ex?.tipo);
      const indicacion = formatearValor(ex?.indicacion);
      const prioridad = formatearValor(ex?.prioridad);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      const lineasEx = this.doc.splitTextToSize(nombreExamen, 66);
      const altoFila = Math.max(6.2, lineasEx.length * 3.4 + 2.8);

      this.asegurarEspacio(altoFila);

      const colorFondo =
        indexFila % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      this.doc.setFillColor(...colorFondo);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.rect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        altoFila,
        'FD',
      );

      let xC = this.margenIzquierdo;

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(...COLOR_TEXTO_MUTED);
      this.doc.text(
        tipoExamen,
        xC + 3,
        this.posicionVertical + altoFila / 2 + 0.8,
      );
      xC += columnas[0].ancho;

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_TEXTO_TITULO);
      this.doc.text(lineasEx, xC + 3, this.posicionVertical + 4);
      xC += columnas[1].ancho;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      this.doc.text(
        indicacion,
        xC + 3,
        this.posicionVertical + altoFila / 2 + 0.8,
        {
          maxWidth: 42,
        },
      );
      xC += columnas[2].ancho;

      const esUrgente =
        prioridad.toUpperCase().includes('URG') ||
        prioridad.toUpperCase().includes('EMERG');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      if (esUrgente) {
        this.doc.setFillColor(...COLOR_ALERTA_FONDO);
        this.doc.setDrawColor(...COLOR_ALERTA_BORDE);
        this.doc.setLineWidth(0.18);
        this.doc.roundedRect(
          xC + 2,
          this.posicionVertical + (altoFila - 4.6) / 2,
          columnas[3].ancho - 4,
          4.6,
          0.8,
          0.8,
          'FD',
        );
        this.doc.setTextColor(...COLOR_ALERTA_TEXTO);
        this.doc.text(
          prioridad,
          xC + columnas[3].ancho / 2,
          this.posicionVertical + (altoFila - 4.6) / 2 + 3.3,
          { align: 'center' },
        );
      } else {
        this.doc.setTextColor(...COLOR_TEXTO_MUTED);
        this.doc.text(
          prioridad,
          xC + columnas[3].ancho / 2,
          this.posicionVertical + altoFila / 2 + 0.8,
          { align: 'center' },
        );
      }

      this.posicionVertical += altoFila;
      indexFila++;
    }

    this.posicionVertical += 2;
  }

  private dibujarInterconsultas(
    interconsultas: InterconsultaPdfItem[] | null | undefined,
  ): void {
    if (!interconsultas || interconsultas.length === 0) return;

    this.dibujarTituloSeccion('INTERCONSULTAS MÉDICAS SOLICITADAS');

    const altoHeader = 5.8;
    this.asegurarEspacio(altoHeader + 8);

    this.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
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

    let xH = this.margenIzquierdo;
    for (const col of columnas) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.2);
      this.doc.setTextColor(...COLOR_FONDO_BLANCO);
      if (col.align === 'center') {
        this.doc.text(
          col.titulo,
          xH + col.ancho / 2,
          this.posicionVertical + 3.8,
          {
            align: 'center',
          },
        );
      } else {
        this.doc.text(col.titulo, xH + 3, this.posicionVertical + 3.8);
      }
      xH += col.ancho;
    }

    this.posicionVertical += altoHeader + 0.8;

    let indexFila = 0;
    for (const ic of interconsultas) {
      let esp = convertirTexto(ic?.especialidad);
      if (!esp && ic?.IdEspecialidad) {
        esp = `Especialidad #${ic.IdEspecialidad}`;
      }
      const mot = formatearValor(ic?.motivo);
      const est = formatearValor(ic?.estado || 'Pendiente');

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      const lineasMot = this.doc.splitTextToSize(mot, 92);
      const altoFila = Math.max(6.2, lineasMot.length * 3.4 + 2.8);

      this.asegurarEspacio(altoFila);

      const colorFondo =
        indexFila % 2 === 0 ? COLOR_FONDO_BLANCO : COLOR_FONDO_GRIS;
      this.doc.setFillColor(...colorFondo);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.rect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        altoFila,
        'FD',
      );

      let xC = this.margenIzquierdo;

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_TEXTO_TITULO);
      this.doc.text(
        formatearValor(esp),
        xC + 3,
        this.posicionVertical + altoFila / 2 + 0.8,
        { maxWidth: 50 },
      );
      xC += columnas[0].ancho;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      this.doc.text(lineasMot, xC + 3, this.posicionVertical + 4);
      xC += columnas[1].ancho;

      const esUrgente =
        est.toUpperCase().includes('URG') ||
        mot.toUpperCase().includes('URG') ||
        est.toUpperCase().includes('EMERG');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.8);
      if (esUrgente) {
        this.doc.setFillColor(...COLOR_ALERTA_FONDO);
        this.doc.setDrawColor(...COLOR_ALERTA_BORDE);
        this.doc.setLineWidth(0.18);
        this.doc.roundedRect(
          xC + 2,
          this.posicionVertical + (altoFila - 4.6) / 2,
          columnas[2].ancho - 4,
          4.6,
          0.8,
          0.8,
          'FD',
        );
        this.doc.setTextColor(...COLOR_ALERTA_TEXTO);
        this.doc.text(
          est,
          xC + columnas[2].ancho / 2,
          this.posicionVertical + (altoFila - 4.6) / 2 + 3.3,
          { align: 'center' },
        );
      } else {
        this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
        this.doc.text(
          est,
          xC + columnas[2].ancho / 2,
          this.posicionVertical + altoFila / 2 + 0.8,
          { align: 'center' },
        );
      }

      this.posicionVertical += altoFila;
      indexFila++;
    }

    this.posicionVertical += 2;
  }

  private dibujarIndicacionesGenerales(
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
      this.dibujarTituloSeccion(
        'INDICACIONES GENERALES Y CUIDADOS DE ENFERMERÍA',
      );

      for (const [etiqueta, valor] of items) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.2);
        const lineasValor = this.doc.splitTextToSize(
          valor,
          this.anchoContenido - 55,
        );
        const altoFila = Math.max(6.2, lineasValor.length * 3.4 + 2.8);

        this.asegurarEspacio(altoFila);

        this.doc.setFillColor(...COLOR_FONDO_BLANCO);
        this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
        this.doc.setLineWidth(0.18);
        this.doc.roundedRect(
          this.margenIzquierdo,
          this.posicionVertical,
          this.anchoContenido,
          altoFila,
          0.8,
          0.8,
          'FD',
        );

        this.doc.setFillColor(...COLOR_FONDO_GRIS);
        this.doc.roundedRect(
          this.margenIzquierdo,
          this.posicionVertical,
          50,
          altoFila,
          0.8,
          0.8,
          'F',
        );

        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(5.2);
        this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
        this.doc.text(
          etiqueta,
          this.margenIzquierdo + 3,
          this.posicionVertical + altoFila / 2 + 0.8,
        );

        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.2);
        this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
        this.doc.text(
          lineasValor,
          this.margenIzquierdo + 53,
          this.posicionVertical + 4,
        );

        this.posicionVertical += altoFila + 1.2;
      }
    }
  }

  private dibujarOrdenesMedicas(
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

    this.dibujarTituloSeccion('DESTINO DEL PACIENTE Y ÓRDENES MÉDICAS');

    this.asegurarEspacio(detalleOrden ? 15 : 7.5);

    this.doc.setFillColor(...COLOR_FONDO_BLANCO);
    this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    this.doc.setLineWidth(0.18);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      6.5,
      0.8,
      0.8,
      'FD',
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.2);
    this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.text(
      'DESTINO DEFINIDO:',
      this.margenIzquierdo + 3,
      this.posicionVertical + 4.2,
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(...COLOR_TEXTO_TITULO);
    this.doc.text(
      etiquetaTipo || '—',
      this.margenIzquierdo + 36,
      this.posicionVertical + 4.2,
    );

    this.posicionVertical += 7.5;

    if (detalleOrden) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      const lineasDetalle = this.doc.splitTextToSize(
        detalleOrden,
        this.anchoContenido - 6,
      );
      const altoDetalle = Math.max(7, lineasDetalle.length * 3.5 + 4);

      this.asegurarEspacio(altoDetalle);

      this.doc.setFillColor(...COLOR_FONDO_GRIS);
      this.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      this.doc.setLineWidth(0.18);
      this.doc.roundedRect(
        this.margenIzquierdo,
        this.posicionVertical,
        this.anchoContenido,
        altoDetalle,
        0.8,
        0.8,
        'FD',
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...COLOR_TEXTO_CUERPO);
      this.doc.text(
        lineasDetalle,
        this.margenIzquierdo + 3,
        this.posicionVertical + 4,
      );

      this.posicionVertical += altoDetalle + 2;
    }
  }

  dibujarPlanTratamiento(
    plan: EvolucionPdfData['plan'],
    interconsultas: InterconsultaPdfItem[] | null | undefined,
    ordenesMedicas?: Record<string, unknown>,
  ): void {
    this.dibujarFarmacologico(plan?.farmacologico);
    this.dibujarExamenesSolicitados(plan?.solicitudExamenes);

    const interconsultasPdf =
      interconsultas ||
      (Array.isArray(plan?.interconsultas)
        ? (plan?.interconsultas as InterconsultaPdfItem[])
        : null);

    this.dibujarInterconsultas(interconsultasPdf);
    this.dibujarIndicacionesGenerales(plan?.indicacionesGenerales);
    this.dibujarOrdenesMedicas(ordenesMedicas);
  }

  dibujarFirmaDigital(
    cabecera: EvolucionPdfData['cabecera'],
    institucion: DatosInstitucion | null,
    nombreUsuario: string,
    fechaImpresion: string,
  ): void {
    const altoFirma = 30;
    const anchoFirma = 102;
    this.asegurarEspacio(altoFirma + 6);
    this.posicionVertical += 4;

    const posXFirma = this.anchoPagina - this.margenDerecho - anchoFirma;
    const posYFirma = this.posicionVertical;

    this.doc.setFillColor(...COLOR_FONDO_BLANCO);
    this.doc.setDrawColor(...COLOR_PRIMARIO);
    this.doc.setLineWidth(0.28);
    this.doc.roundedRect(
      posXFirma,
      posYFirma,
      anchoFirma,
      altoFirma,
      1.5,
      1.5,
      'FD',
    );

    this.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.rect(posXFirma, posYFirma, 3, altoFirma, 'F');

    const logoFirma = institucion?.logoHospi || institucion?.logoMinsa;
    if (logoFirma) {
      try {
        this.doc.addImage(
          `data:image/png;base64,${logoFirma}`,
          'PNG',
          posXFirma + 5.5,
          posYFirma + 5,
          20,
          20,
        );
      } catch {
        /* Continuar */
      }
    }

    const posXTexto = posXFirma + (logoFirma ? 29 : 6);
    const maxAnchoTexto = anchoFirma - (logoFirma ? 32 : 9);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.text('DOCUMENTO FIRMADO DIGITALMENTE', posXTexto, posYFirma + 4.5);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...COLOR_TEXTO_TITULO);
    const nombreMedico = (
      cabecera.medicoTratante ||
      nombreUsuario ||
      'MÉDICO TRATANTE'
    ).toUpperCase();
    this.doc.text(nombreMedico, posXTexto, posYFirma + 8.8, {
      maxWidth: maxAnchoTexto,
    });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5.5);
    this.doc.setTextColor(...COLOR_TEXTO_MUTED);

    let offsetFirma = 12.5;
    if (cabecera.dni) {
      this.doc.text(`DNI: ${cabecera.dni}`, posXTexto, posYFirma + offsetFirma);
      offsetFirma += 3.2;
    }

    const fechaTexto = cabecera.fecha
      ? `${cabecera.fecha} ${cabecera.hora || ''} (UTC-5)`.trim()
      : `${fechaImpresion} (UTC-5)`;
    this.doc.text(
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
    this.doc.text(cargoTexto, posXTexto, posYFirma + offsetFirma, {
      maxWidth: maxAnchoTexto,
    });
    offsetFirma += 3.2;

    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(4.6);
    this.doc.setTextColor(...COLOR_TEXTO_CLARO);
    this.doc.text(
      'Validez legal conforme a la Ley N° 27269 sobre Firmas y Certificados Digitales.',
      posXTexto,
      posYFirma + offsetFirma,
      { maxWidth: maxAnchoTexto },
    );

    this.posicionVertical += altoFirma + 3;
  }
}

export async function construirPdfEvolucion(
  datosEvolucion: EvolucionPdfData,
  datosInstitucion: DatosInstitucion | null,
  nombreUsuario: string,
  fechaImpresion: string,
): Promise<jsPDF | null> {
  const { jsPDF } = await import('jspdf');
  const documentoPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const lienzo = new PdfLienzoEvolucion(documentoPdf);

  lienzo.dibujarEncabezadoInstitucion(datosInstitucion);
  lienzo.dibujarTarjetaPaciente(
    datosEvolucion.paciente,
    datosEvolucion.cabecera,
  );
  lienzo.dibujarSignosVitales(datosEvolucion.signosVitales);
  lienzo.dibujarAntecedentes(datosEvolucion.antecedentes);
  lienzo.dibujarMotivo(datosEvolucion.motivo);
  lienzo.dibujarSubjetivo(datosEvolucion.subjetivo, datosEvolucion.sintomas);
  lienzo.dibujarExamenFisico(datosEvolucion.examenFisico);
  lienzo.dibujarDiagnosticos(datosEvolucion.diagnosticos);
  lienzo.dibujarEvaluacion(
    datosEvolucion.evaluacion,
    datosEvolucion.evolucionLibre,
  );
  lienzo.dibujarPlanTratamiento(
    datosEvolucion.plan,
    datosEvolucion.interconsultas,
    datosEvolucion.ordenesMedicas,
  );
  lienzo.dibujarFirmaDigital(
    datosEvolucion.cabecera,
    datosInstitucion,
    nombreUsuario,
    fechaImpresion,
  );

  const totalPaginas = documentoPdf.getNumberOfPages();
  for (let numeroPagina = 1; numeroPagina <= totalPaginas; numeroPagina++) {
    documentoPdf.setPage(numeroPagina);

    if (numeroPagina > 1) {
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(5.5);
      documentoPdf.setTextColor(148, 163, 184);
      documentoPdf.text(
        `HOSPITAL NACIONAL SERGIO E. BERNALES  •  EVOLUCIÓN CLÍNICA  •  ${lienzo.pacienteNombre.toUpperCase()} (HC: ${lienzo.pacienteHistoria || 'S/N'})`,
        14,
        8,
      );
      documentoPdf.setDrawColor(226, 232, 240);
      documentoPdf.setLineWidth(0.18);
      documentoPdf.line(14, 9.5, 196, 9.5);
    }

    documentoPdf.setDrawColor(226, 232, 240);
    documentoPdf.setLineWidth(0.18);
    documentoPdf.line(14, 287, 196, 287);

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(5.5);
    documentoPdf.setTextColor(100, 116, 139);
    documentoPdf.text(
      'Hospital Nacional Sergio E. Bernales  •  Galenos Pro 2026  •  Documento Clínico Electrónico Oficial',
      14,
      291,
    );
    documentoPdf.text(`Página ${numeroPagina} de ${totalPaginas}`, 196, 291, {
      align: 'right',
    });
  }

  return documentoPdf;
}
