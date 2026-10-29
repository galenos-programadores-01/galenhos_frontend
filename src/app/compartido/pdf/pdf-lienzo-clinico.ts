import type { jsPDF } from 'jspdf';
import {
  convertirTextoPdf,
  esSignoVitalAlertaPdf,
  formatearValorPdf,
  PDF_COLOR,
} from './pdf-formato';
import type {
  DatosInstitucionPdf,
  PdfCabeceraAtencion,
  PdfPacienteIdentificacion,
  PdfSignosVitales,
} from './pdf.tipos';

/**
 * Lienzo base de PDFs clínicos hospitalarios.
 * Encabezado, paciente, signos vitales, títulos y pie — reutilizable por módulo.
 */
export class PdfLienzoClinico {
  readonly anchoPagina = 210;
  readonly altoPagina = 297;
  readonly margenIzquierdo = 14;
  readonly margenDerecho = 14;
  readonly anchoContenido: number;
  posicionVertical = 10;
  private readonly limiteInferior = 276;

  pacienteNombre = '';
  pacienteHistoria = '';
  etiquetaDocumentoCorto = 'DOCUMENTO CLÍNICO';

  constructor(readonly doc: jsPDF) {
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
    this.doc.setFillColor(...PDF_COLOR.primarioOscuro);
    this.doc.rect(0, 0, this.anchoPagina, 2.8, 'F');
    this.doc.setFillColor(...PDF_COLOR.primarioAcento);
    this.doc.rect(0, 2.8, this.anchoPagina, 0.8, 'F');
  }

  dibujarTituloSeccion(titulo: string, subtitulo?: string): void {
    this.asegurarEspacio(10);
    this.posicionVertical += 2.5;

    this.doc.setFillColor(...PDF_COLOR.fondoHeader);
    this.doc.setDrawColor(...PDF_COLOR.bordeMedio);
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

    this.doc.setFillColor(...PDF_COLOR.primario);
    this.doc.rect(this.margenIzquierdo, this.posicionVertical, 3, 5.8, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(...PDF_COLOR.primarioOscuro);
    this.doc.text(
      titulo.toUpperCase(),
      this.margenIzquierdo + 5.5,
      this.posicionVertical + 4.1,
    );

    if (subtitulo) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(...PDF_COLOR.textoMuted);
      this.doc.text(
        subtitulo,
        this.anchoPagina - this.margenDerecho - 3,
        this.posicionVertical + 4.1,
        { align: 'right' },
      );
    }

    this.posicionVertical += 7.2;
  }

  /**
   * @param tituloBannerDocumento ej. "HISTORIA CLÍNICA ELECTRÓNICA — PRIMERA ATENCIÓN — EMERGENCIA"
   */
  dibujarEncabezadoInstitucion(
    institucion: DatosInstitucionPdf | null,
    tituloBannerDocumento: string,
  ): void {
    this.dibujarBandaSuperior();
    this.posicionVertical = 7;

    const logoEncabezado = institucion?.logoHospi || institucion?.logoMinsa;
    if (logoEncabezado) {
      try {
        this.doc.addImage(
          `data:image/png;base64,${logoEncabezado}`,
          'PNG',
          this.margenIzquierdo,
          this.posicionVertical + 1,
          18,
          18,
        );
      } catch {
        /* sin logo */
      }
    }

    const posXCentro = this.anchoPagina / 2;
    const nombreHospital =
      convertirTextoPdf(institucion?.nombre) ||
      'HOSPITAL NACIONAL SERGIO E. BERNALES';

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.8);
    this.doc.setTextColor(...PDF_COLOR.textoMuted);
    this.doc.text(
      'GOBIERNO DEL PERÚ  •  MINISTERIO DE SALUD',
      posXCentro,
      this.posicionVertical + 3.5,
      { align: 'center' },
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(...PDF_COLOR.textoTitulo);
    this.doc.text(nombreHospital, posXCentro, this.posicionVertical + 8.5, {
      align: 'center',
    });

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...PDF_COLOR.primarioOscuro);
    this.doc.text(
      'COMPLEJO HOSPITALARIO DE ALTA COMPLEJIDAD — LIMA NORTE',
      posXCentro,
      this.posicionVertical + 12.2,
      { align: 'center' },
    );

    const anchoBannerDoc = 118;
    const altoBannerDoc = 5;
    const xBannerDoc = posXCentro - anchoBannerDoc / 2;
    const yBannerDoc = this.posicionVertical + 14.5;

    this.doc.setFillColor(...PDF_COLOR.primarioOscuro);
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
    this.doc.setTextColor(...PDF_COLOR.fondoBlanco);
    this.doc.text(tituloBannerDocumento, posXCentro, yBannerDoc + 3.5, {
      align: 'center',
      maxWidth: anchoBannerDoc - 4,
    });

    const datosContacto = [
      `RUC: ${formatearValorPdf(institucion?.rucEess || '20154876123')}`,
      formatearValorPdf(
        institucion?.direccion || 'Av. Túpac Amaru 8000, Comas',
      ),
      `Telf: ${formatearValorPdf(institucion?.telefono || '(01) 558-0186')}`,
    ].join('   •   ');

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5.2);
    this.doc.setTextColor(...PDF_COLOR.textoMuted);
    this.doc.text(datosContacto, posXCentro, this.posicionVertical + 22.5, {
      align: 'center',
    });

    this.doc.setDrawColor(...PDF_COLOR.bordeSuave);
    this.doc.setLineWidth(0.2);
    this.doc.line(
      this.margenIzquierdo,
      this.posicionVertical + 25,
      this.anchoPagina - this.margenDerecho,
      this.posicionVertical + 25,
    );

    this.posicionVertical += 27;
  }

  /**
   * @param prefijoRegistro ej. "PA" → ATENCIÓN: PA-123 ; "EV" → EV-123
   */
  dibujarTarjetaPaciente(
    paciente: PdfPacienteIdentificacion,
    cabecera: PdfCabeceraAtencion,
    prefijoRegistro = 'AT',
  ): void {
    this.pacienteNombre = paciente.nombre;
    this.pacienteHistoria = paciente.historia;

    this.dibujarTituloSeccion(
      'IDENTIFICACIÓN DEL PACIENTE Y ATENCIÓN CLÍNICA',
      `REGISTRO N° ${prefijoRegistro}-${paciente.idRegistro}`,
    );

    const servicioTexto =
      convertirTextoPdf(paciente.servicio) ||
      convertirTextoPdf(cabecera.servicio);
    const especialidadTexto =
      convertirTextoPdf(paciente.especialidad) ||
      convertirTextoPdf(cabecera.especialidad);

    const camposFila1 = [
      { etiqueta: 'EDAD', valor: formatearValorPdf(paciente.edad), ancho: 38 },
      { etiqueta: 'SEXO', valor: formatearValorPdf(paciente.sexo), ancho: 20 },
      {
        etiqueta: 'ESTADO',
        valor: formatearValorPdf(paciente.estado),
        ancho: 26,
      },
      {
        etiqueta: 'SERVICIO',
        valor: formatearValorPdf(servicioTexto),
        ancho: 70,
      },
      {
        etiqueta: paciente.cama ? 'CAMA' : 'DOCUMENTO',
        valor: formatearValorPdf(paciente.cama || paciente.documento),
        ancho: 28,
      },
    ];

    const camposFila2 = [
      {
        etiqueta: 'MÉDICO TRATANTE',
        valor: formatearValorPdf(cabecera.medicoTratante),
        ancho: 62,
      },
      {
        etiqueta: 'ESPECIALIDAD',
        valor: formatearValorPdf(especialidadTexto),
        ancho: 52,
      },
      {
        etiqueta: 'TIPO DE ATENCIÓN',
        valor: formatearValorPdf(cabecera.tipoAtencion),
        ancho: 32,
      },
      {
        etiqueta: 'FECHA Y HORA',
        valor: `${formatearValorPdf(cabecera.fecha)}   ${formatearValorPdf(cabecera.hora)}`,
        ancho: 36,
      },
    ];

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.5);

    let maxLineasFila1 = 1;
    const camposProcesadosFila1 = camposFila1.map((campo) => {
      const lineas = this.doc.splitTextToSize(campo.valor, campo.ancho - 3);
      if (lineas.length > maxLineasFila1) maxLineasFila1 = lineas.length;
      return { ...campo, lineas };
    });
    const altoFila1 = Math.max(9, maxLineasFila1 * 3.4 + 4.8);

    let maxLineasFila2 = 1;
    const camposProcesadosFila2 = camposFila2.map((campo) => {
      const lineas = this.doc.splitTextToSize(campo.valor, campo.ancho - 3);
      if (lineas.length > maxLineasFila2) maxLineasFila2 = lineas.length;
      return { ...campo, lineas };
    });
    const altoFila2 = Math.max(9, maxLineasFila2 * 3.4 + 4.8);

    const altoCabecera = 11.5;
    const alturaTarjeta = altoCabecera + altoFila1 + altoFila2 + 3.0;
    this.asegurarEspacio(alturaTarjeta + 3);

    this.doc.setFillColor(...PDF_COLOR.fondoGris);
    this.doc.setDrawColor(...PDF_COLOR.bordeMedio);
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

    this.doc.setFillColor(...PDF_COLOR.primario);
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
    this.doc.setTextColor(...PDF_COLOR.textoMuted);
    this.doc.text('PACIENTE:', posX, posYHeader);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...PDF_COLOR.textoTitulo);
    this.doc.text(
      (paciente.nombre || 'PACIENTE NO IDENTIFICADO').toUpperCase(),
      posX + 16,
      posYHeader,
      { maxWidth: this.anchoContenido - 85 },
    );

    const textoBadges = `HC: ${paciente.historia || 'S/N'}  •  ATENCIÓN: ${prefijoRegistro}-${paciente.idRegistro}`;
    const xBadges = this.anchoPagina - this.margenDerecho - 4;
    const anchoBadges = 62;

    this.doc.setFillColor(...PDF_COLOR.primario);
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
    this.doc.setFontSize(5.5);
    this.doc.setTextColor(...PDF_COLOR.fondoBlanco);
    this.doc.text(textoBadges, xBadges - anchoBadges / 2, posYHeader - 0.2, {
      align: 'center',
      maxWidth: anchoBadges - 2,
    });

    const yLineaDiv = posYHeader + 4.2;
    this.doc.setDrawColor(...PDF_COLOR.bordeSuave);
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
      this.doc.setTextColor(...PDF_COLOR.textoMuted);
      this.doc.text(campo.etiqueta, xCampo1, yFila1);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...PDF_COLOR.textoTitulo);
      this.doc.text(campo.lineas, xCampo1, yFila1 + 3.6);
      xCampo1 += campo.ancho;
    }

    const yFila2 = yFila1 + altoFila1;
    let xCampo2 = posX;
    for (const campo of camposProcesadosFila2) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(...PDF_COLOR.textoMuted);
      this.doc.text(campo.etiqueta, xCampo2, yFila2);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...PDF_COLOR.textoTitulo);
      this.doc.text(campo.lineas, xCampo2, yFila2 + 3.6);
      xCampo2 += campo.ancho;
    }

    this.posicionVertical += alturaTarjeta + 2;
  }

  /** Mismo formato de tarjetas que Evolución Médica. */
  dibujarSignosVitales(signosVitales: PdfSignosVitales | null | undefined): void {
    const sv = signosVitales || {};
    this.dibujarTituloSeccion(
      'SIGNOS VITALES Y ANTROPOMETRÍA',
      'PARÁMETROS REGISTRADOS',
    );

    const listaSignos = [
      {
        etiqueta: 'P. ARTERIAL',
        valor: formatearValorPdf(sv.presionArterial),
        unidad: 'mmHg',
      },
      {
        etiqueta: 'F. CARDÍACA',
        valor: formatearValorPdf(sv.frecuenciaCardiaca),
        unidad: 'lpm',
      },
      {
        etiqueta: 'F. RESPIRATORIA',
        valor: formatearValorPdf(sv.frecuenciaRespiratoria),
        unidad: 'rpm',
      },
      {
        etiqueta: 'TEMPERATURA',
        valor: formatearValorPdf(sv.temperatura),
        unidad: '°C',
      },
      {
        etiqueta: 'SATURACIÓN O₂',
        valor: formatearValorPdf(sv.saturacionOxigeno),
        unidad: '%',
      },
      {
        etiqueta: 'PESO',
        valor: formatearValorPdf(sv.peso),
        unidad: 'kg',
      },
      {
        etiqueta: 'TALLA',
        valor: formatearValorPdf(sv.talla),
        unidad: 'cm',
      },
      {
        etiqueta: 'IMC',
        valor: formatearValorPdf(sv.imc),
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
      const tieneAlerta = esSignoVitalAlertaPdf(item.etiqueta, item.valor);
      this.doc.setFillColor(...PDF_COLOR.fondoBlanco);
      this.doc.setDrawColor(
        ...(tieneAlerta ? PDF_COLOR.alertaBorde : PDF_COLOR.bordeSuave),
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
        ...(tieneAlerta ? PDF_COLOR.alertaFondo : PDF_COLOR.fondoGris),
      );
      this.doc.roundedRect(x, this.posicionVertical, anchoTarjeta, 4.2, 1, 1, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(4.8);
      this.doc.setTextColor(
        ...(tieneAlerta ? PDF_COLOR.alertaTexto : PDF_COLOR.textoMuted),
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
        ...(tieneAlerta ? PDF_COLOR.alertaTexto : PDF_COLOR.textoTitulo),
      );
      this.doc.text(item.valor, x + anchoTarjeta / 2, this.posicionVertical + 8.8, {
        align: 'center',
      });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(4.8);
      this.doc.setTextColor(
        ...(tieneAlerta ? PDF_COLOR.alertaTexto : PDF_COLOR.textoClaro),
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

    if (sv.glucemia) {
      this.asegurarEspacio(8);
      this.doc.setFillColor(...PDF_COLOR.alertaFondo);
      this.doc.setDrawColor(...PDF_COLOR.alertaBorde);
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
      this.doc.setTextColor(...PDF_COLOR.alertaTexto);
      this.doc.text(
        `GLICEMIA CAPILAR: ${formatearValorPdf(sv.glucemia)} mg/dL`,
        this.margenIzquierdo + 3,
        this.posicionVertical + 3.8,
      );
      this.posicionVertical += 7.5;
    }
  }

  dibujarParrafoEtiquetado(etiqueta: string, valor: string): void {
    const texto = formatearValorPdf(valor);
    this.asegurarEspacio(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6);
    this.doc.setTextColor(...PDF_COLOR.textoMuted);
    this.doc.text(etiqueta, this.margenIzquierdo, this.posicionVertical + 3);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(...PDF_COLOR.textoCuerpo);
    const lineas = this.doc.splitTextToSize(texto, this.anchoContenido);
    this.doc.text(lineas, this.margenIzquierdo, this.posicionVertical + 7);
    this.posicionVertical += 7 + lineas.length * 3.2 + 2;
  }

  dibujarTablaSimple(
    encabezados: string[],
    filas: string[][],
    anchos: number[],
  ): void {
    const altoFila = 6;
    this.asegurarEspacio(altoFila * (filas.length + 1) + 4);

    let x = this.margenIzquierdo;
    this.doc.setFillColor(...PDF_COLOR.fondoHeader);
    this.doc.rect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      altoFila,
      'F',
    );
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.5);
    this.doc.setTextColor(...PDF_COLOR.textoMuted);
    encabezados.forEach((h, i) => {
      this.doc.text(h, x + 1.5, this.posicionVertical + 4);
      x += anchos[i];
    });
    this.posicionVertical += altoFila;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...PDF_COLOR.textoCuerpo);
    for (const fila of filas) {
      this.asegurarEspacio(altoFila + 1);
      x = this.margenIzquierdo;
      this.doc.setDrawColor(...PDF_COLOR.bordeSuave);
      this.doc.setLineWidth(0.15);
      this.doc.line(
        this.margenIzquierdo,
        this.posicionVertical + altoFila,
        this.anchoPagina - this.margenDerecho,
        this.posicionVertical + altoFila,
      );
      fila.forEach((celda, i) => {
        const lineas = this.doc.splitTextToSize(
          formatearValorPdf(celda),
          anchos[i] - 2,
        );
        this.doc.text(lineas[0] || '—', x + 1.5, this.posicionVertical + 4);
        x += anchos[i];
      });
      this.posicionVertical += altoFila;
    }
    this.posicionVertical += 2;
  }

  dibujarEspacioFirma(
    cabecera: PdfCabeceraAtencion,
    institucion: DatosInstitucionPdf | null,
    nombreUsuario: string,
    fechaImpresion: string,
  ): void {
    const altoFirma = 30;
    const anchoFirma = 102;
    this.asegurarEspacio(altoFirma + 6);
    this.posicionVertical += 4;

    const posXFirma = this.anchoPagina - this.margenDerecho - anchoFirma;
    const posYFirma = this.posicionVertical;

    this.doc.setFillColor(...PDF_COLOR.fondoBlanco);
    this.doc.setDrawColor(...PDF_COLOR.primario);
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

    this.doc.setFillColor(...PDF_COLOR.primarioOscuro);
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
        /* sin logo */
      }
    }

    const posXTexto = posXFirma + (logoFirma ? 29 : 6);
    const maxAnchoTexto = anchoFirma - (logoFirma ? 32 : 9);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...PDF_COLOR.primarioOscuro);
    this.doc.text('DOCUMENTO FIRMADO DIGITALMENTE', posXTexto, posYFirma + 4.5);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...PDF_COLOR.textoTitulo);
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
    this.doc.setTextColor(...PDF_COLOR.textoMuted);

    let offsetFirma = 12.5;
    if (cabecera.dni) {
      this.doc.text(`DNI: ${cabecera.dni}`, posXTexto, posYFirma + offsetFirma);
      offsetFirma += 3.2;
    }

    const fechaTexto = `${fechaImpresion} (UTC-5)`;
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
    this.doc.text(partesCargo.join('  •  '), posXTexto, posYFirma + offsetFirma, {
      maxWidth: maxAnchoTexto,
    });
    offsetFirma += 3.2;

    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(4.6);
    this.doc.setTextColor(...PDF_COLOR.textoClaro);
    this.doc.text(
      'Validez legal conforme a la Ley N° 27269 sobre Firmas y Certificados Digitales.',
      posXTexto,
      posYFirma + offsetFirma,
      { maxWidth: maxAnchoTexto },
    );

    this.posicionVertical += altoFirma + 3;
  }

  aplicarPiesDePagina(etiquetaModulo: string): void {
    const totalPaginas = this.doc.getNumberOfPages();
    for (let n = 1; n <= totalPaginas; n++) {
      this.doc.setPage(n);
      if (n > 1) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(5.5);
        this.doc.setTextColor(148, 163, 184);
        this.doc.text(
          `HOSPITAL NACIONAL SERGIO E. BERNALES  •  ${etiquetaModulo}  •  ${this.pacienteNombre.toUpperCase()} (HC: ${this.pacienteHistoria || 'S/N'})`,
          14,
          8,
        );
        this.doc.setDrawColor(...PDF_COLOR.bordeSuave);
        this.doc.setLineWidth(0.18);
        this.doc.line(14, 9.5, 196, 9.5);
      }

      this.doc.setDrawColor(...PDF_COLOR.bordeSuave);
      this.doc.setLineWidth(0.18);
      this.doc.line(14, 287, 196, 287);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(...PDF_COLOR.textoClaro);
      this.doc.text(
        'Hospital Nacional Sergio E. Bernales  •  Galenos Pro 2026  •  Documento Clínico Electrónico Oficial',
        14,
        291,
      );
      this.doc.text(`Página ${n} de ${totalPaginas}`, 196, 291, {
        align: 'right',
      });
    }
  }
}
