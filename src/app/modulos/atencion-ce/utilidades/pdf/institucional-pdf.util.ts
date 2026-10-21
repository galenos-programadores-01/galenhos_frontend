export function formatearFechaCorta(fechaTexto?: string | null): string {
  if (!fechaTexto) return 'NO REGISTRADA';
  const texto = String(fechaTexto).trim();
  const coincidenciaIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (coincidenciaIso) {
    const [, anio, mes, dia] = coincidenciaIso;
    return `${dia}/${mes}/${anio}`;
  }
  const coincidenciaPeruana = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (coincidenciaPeruana) {
    return coincidenciaPeruana[0];
  }
  return texto;
}

import type { jsPDF } from 'jspdf';

export const COLOR_PRIMARIO: [number, number, number] = [26, 54, 93];
export const COLOR_PRIMARIO_OSCURO: [number, number, number] = [15, 23, 42];
export const COLOR_PRIMARIO_PROFUNDO: [number, number, number] = [10, 25, 47];
export const COLOR_PRIMARIO_ACENTO: [number, number, number] = [37, 99, 235];

export const COLOR_TEXTO_TITULO: [number, number, number] = [15, 23, 42];
export const COLOR_TEXTO_CUERPO: [number, number, number] = [30, 41, 59];
export const COLOR_TEXTO_MUTED: [number, number, number] = [71, 85, 105];
export const COLOR_TEXTO_CLARO: [number, number, number] = [100, 116, 139];

export const COLOR_FONDO_BLANCO: [number, number, number] = [255, 255, 255];
export const COLOR_FONDO_GRIS: [number, number, number] = [248, 250, 252];
export const COLOR_FONDO_ENCABEZADO: [number, number, number] = [241, 245, 249];

export const COLOR_BORDE_SUAVE: [number, number, number] = [226, 232, 240];
export const COLOR_BORDE_MEDIO: [number, number, number] = [203, 213, 225];

export interface DatosInstitucionCache {
  logoHospi?: string;
  logoMinsa?: string;
  rucEess?: string;
  direccion?: string;
  telefono?: string;
}

export interface DatosFiliacionPacientePdf {
  pacienteNombre?: string;
  nroHistoriaClinica?: string | number;
  nroDocumento?: string | number;
  idCuentaAtencion?: string | number;
  edad?: string | number;
  sexo?: string;
  servicioNombre?: string;
  especialidadNombre?: string;
  consultorio?: string;
  tipoFinanciador?: string;
  medicoTratante?: string;
  medicoColegiatura?: string;
  medicoRne?: string;
  fechaAtencion?: string;
  horaAtencion?: string;
  procedencia?: string;
}

let cacheDatosInstitucionGlobal: DatosInstitucionCache | null = null;

export async function obtenerDatosInstitucionCache(): Promise<DatosInstitucionCache | null> {
  if (cacheDatosInstitucionGlobal) {
    return cacheDatosInstitucionGlobal;
  }

  try {
    const datosAlmacenados = localStorage.getItem('galenos.datosInstitucion');
    if (datosAlmacenados) {
      cacheDatosInstitucionGlobal = JSON.parse(
        datosAlmacenados,
      ) as DatosInstitucionCache;
      return cacheDatosInstitucionGlobal;
    }
  } catch {
    // Continuar con la petición de red
  }

  try {
    const urlBaseGuardada = localStorage.getItem('galenos.apiBaseUrl');
    const { hostname, origin } = window.location;
    const urlBase =
      urlBaseGuardada ||
      (hostname === 'localhost' || hostname === '127.0.0.1'
        ? `http://${hostname}:8080`
        : origin);

    const cabeceras: Record<string, string> = {
      Accept: 'application/json',
    };
    const token = localStorage.getItem('galenos.accessToken');
    if (token) {
      cabeceras.Authorization = `Bearer ${token}`;
    }

    const respuesta = await fetch(`${urlBase}/api/v1/datos-institucion`, {
      headers: cabeceras,
    });

    if (respuesta.ok) {
      const cuerpoRespuesta = (await respuesta.json()) as {
        data?: Record<string, unknown>;
        [key: string]: unknown;
      };
      const datosCrudos = (cuerpoRespuesta.data || cuerpoRespuesta) as Record<
        string,
        unknown
      >;

      if (datosCrudos) {
        cacheDatosInstitucionGlobal = {
          logoHospi:
            (datosCrudos.logoHospi as string) ||
            (datosCrudos.LogoHospi as string) ||
            undefined,
          logoMinsa:
            (datosCrudos.logoMinsa as string) ||
            (datosCrudos.LogoMinsa as string) ||
            undefined,
          rucEess:
            (datosCrudos.rucEess as string) ||
            (datosCrudos.RucEess as string) ||
            '20154876123',
          direccion:
            (datosCrudos.direccion as string) ||
            (datosCrudos.Direccion as string) ||
            'Av. Túpac Amaru 8000, Comas',
          telefono:
            (datosCrudos.telefono as string) ||
            (datosCrudos.Telefono as string) ||
            '(01) 558-0186',
        };

        try {
          localStorage.setItem(
            'galenos.datosInstitucion',
            JSON.stringify(cacheDatosInstitucionGlobal),
          );
        } catch {
          // Ignorar limitación de cuota de almacenamiento
        }

        return cacheDatosInstitucionGlobal;
      }
    }
  } catch {
    // Si la red falla, se prosigue sin imágenes para no interrumpir la impresión
  }

  return null;
}

export function dibujarBandaSuperiorInstitucional(
  documentoPdf: jsPDF,
  anchoPagina = 210,
): void {
  documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.rect(0, 0, anchoPagina, 2.8, 'F');
  documentoPdf.setFillColor(...COLOR_PRIMARIO_ACENTO);
  documentoPdf.rect(0, 2.8, anchoPagina, 0.8, 'F');
}

export function dibujarEncabezadoInstitucionalUnificado(
  documentoPdf: jsPDF,
  tituloDocumento: string,
  subtituloDocumento?: string,
  datosInstitucion?: DatosInstitucionCache | null,
  margenIzquierdo = 14,
  margenDerecho = 196,
  anchoPagina = 210,
): number {
  dibujarBandaSuperiorInstitucional(documentoPdf, anchoPagina);
  const posicionVerticalInicial = 7.5;

  const logoUnicoIzquierda =
    datosInstitucion?.logoMinsa || datosInstitucion?.logoHospi;
  if (logoUnicoIzquierda) {
    try {
      const fuenteImagen = logoUnicoIzquierda.startsWith('data:')
        ? logoUnicoIzquierda
        : `data:image/png;base64,${logoUnicoIzquierda}`;
      documentoPdf.addImage(
        fuenteImagen,
        'PNG',
        margenIzquierdo,
        posicionVerticalInicial + 0.5,
        18,
        18,
      );
    } catch {
    }
  }

  const coordenadaCentroHorizontal = anchoPagina / 2;

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.8);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    'GOBIERNO DEL PERÚ  •  MINISTERIO DE SALUD',
    coordenadaCentroHorizontal,
    posicionVerticalInicial + 3.2,
    { align: 'center' },
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(10.5);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  documentoPdf.text(
    'HOSPITAL NACIONAL SERGIO E. BERNALES',
    coordenadaCentroHorizontal,
    posicionVerticalInicial + 8.2,
    { align: 'center' },
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.0);
  documentoPdf.setTextColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.text(
    'COMPLEJO HOSPITALARIO DE ALTA COMPLEJIDAD — LIMA NORTE',
    coordenadaCentroHorizontal,
    posicionVerticalInicial + 11.8,
    { align: 'center' },
  );

  const anchoBanner = Math.min(100, anchoPagina - 110);
  const altoBanner = 5.2;
  const coordenadaXBanner = coordenadaCentroHorizontal - anchoBanner / 2;
  const coordenadaYBanner = posicionVerticalInicial + 13.8;

  documentoPdf.setFillColor(...COLOR_PRIMARIO_OSCURO);
  documentoPdf.roundedRect(
    coordenadaXBanner,
    coordenadaYBanner,
    anchoBanner,
    altoBanner,
    1,
    1,
    'F',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.5);
  documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
  documentoPdf.text(
    tituloDocumento.toUpperCase(),
    coordenadaCentroHorizontal,
    coordenadaYBanner + 3.7,
    { align: 'center' },
  );

  const textoInstitucional =
    subtituloDocumento ||
    [
      `RUC: ${datosInstitucion?.rucEess || '20154876123'}`,
      datosInstitucion?.direccion || 'Av. Túpac Amaru 8000, Comas',
      `Telf: ${datosInstitucion?.telefono || '(01) 558-0186'}`,
    ].join('   •   ');

  documentoPdf.setFont('helvetica', 'normal');
  documentoPdf.setFontSize(5.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text(
    textoInstitucional,
    coordenadaCentroHorizontal,
    posicionVerticalInicial + 22.2,
    { align: 'center' },
  );

  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.line(
    margenIzquierdo,
    posicionVerticalInicial + 24.8,
    margenDerecho,
    posicionVerticalInicial + 24.8,
  );

  return posicionVerticalInicial + 29.5;
}

export function dibujarTituloSeccionUnificado(
  documentoPdf: jsPDF,
  tituloSeccion: string,
  posicionVerticalOSubtitulo?: number | string,
  margenIzquierdoOPosicionVertical = 14,
  margenDerechoOMargenIzquierdo = 196,
  margenDerechoParametro = 196,
): number {
  let subtituloDerecho: string | undefined;
  let posicionVerticalActual = 0;
  let margenIzquierdo = 14;
  let margenDerecho = 196;

  if (typeof posicionVerticalOSubtitulo === 'number') {
    posicionVerticalActual = posicionVerticalOSubtitulo;
    margenIzquierdo = margenIzquierdoOPosicionVertical;
    margenDerecho = margenDerechoOMargenIzquierdo;
    subtituloDerecho = undefined;
  } else {
    subtituloDerecho = posicionVerticalOSubtitulo;
    posicionVerticalActual = margenIzquierdoOPosicionVertical;
    margenIzquierdo = margenDerechoOMargenIzquierdo;
    margenDerecho = margenDerechoParametro;
  }

  const anchoContenido = margenDerecho - margenIzquierdo;
  const altoBarra = 5.6;

  documentoPdf.setFillColor(...COLOR_FONDO_ENCABEZADO);
  documentoPdf.setDrawColor(...COLOR_BORDE_MEDIO);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionVerticalActual,
    anchoContenido,
    altoBarra,
    1,
    1,
    'FD',
  );

  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.rect(margenIzquierdo, posicionVerticalActual, 3, altoBarra, 'F');

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(7);
  documentoPdf.setTextColor(...COLOR_PRIMARIO_PROFUNDO);
  documentoPdf.text(
    tituloSeccion.toUpperCase(),
    margenIzquierdo + 5.5,
    posicionVerticalActual + 4.0,
  );

  if (subtituloDerecho) {
    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(5.5);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(
      subtituloDerecho,
      margenDerecho - 3,
      posicionVerticalActual + 4.0,
      { align: 'right' },
    );
  }

  return posicionVerticalActual + altoBarra + 2.5;
}

function limpiarTextoSeguro(
  textoEntrada: string | number | null | undefined,
): string {
  if (textoEntrada === null || textoEntrada === undefined) {
    return 'NO REGISTRADO';
  }
  const textoLimpio = String(textoEntrada).trim();
  return textoLimpio.length > 0 ? textoLimpio : 'NO REGISTRADO';
}

export function dibujarTarjetaFiliacionPacienteUnificada(
  documentoPdf: jsPDF,
  filiacion: DatosFiliacionPacientePdf,
  posicionVerticalInicial: number,
  margenIzquierdo = 14,
  margenDerecho = 196,
): number {
  const anchoContenido = margenDerecho - margenIzquierdo;
  let posicionActual = posicionVerticalInicial;

  posicionActual = dibujarTituloSeccionUnificado(
    documentoPdf,
    'IDENTIFICACIÓN DEL PACIENTE Y ATENCIÓN CLÍNICA',
    filiacion.idCuentaAtencion
      ? `CUENTA N° ${filiacion.idCuentaAtencion}`
      : undefined,
    posicionActual,
    margenIzquierdo,
    margenDerecho,
  );

  const textoEdad = filiacion.edad ? `${filiacion.edad} AÑOS` : 'NO REGISTRADA';
  const textoSexo =
    filiacion.sexo === 'F'
      ? 'FEMENINO'
      : filiacion.sexo === 'M'
        ? 'MASCULINO'
        : limpiarTextoSeguro(filiacion.sexo);
  const textoSeguro = limpiarTextoSeguro(
    filiacion.tipoFinanciador || 'SIS',
  ).toUpperCase();
  const textoServicio = limpiarTextoSeguro(
    filiacion.servicioNombre ||
      filiacion.especialidadNombre ||
      'CONSULTA EXTERNA',
  ).toUpperCase();
  const textoConsultorio = limpiarTextoSeguro(
    filiacion.consultorio || filiacion.servicioNombre || 'CONSULTORIO GENERAL',
  ).toUpperCase();

  const columnasFilaUno = [
    { etiqueta: 'EDAD', valor: textoEdad, ancho: 26 },
    { etiqueta: 'SEXO', valor: textoSexo, ancho: 24 },
    { etiqueta: 'FINANCIADOR', valor: textoSeguro, ancho: 32 },
    { etiqueta: 'ESPECIALIDAD / SERVICIO', valor: textoServicio, ancho: 52 },
    { etiqueta: 'CONSULTORIO', valor: textoConsultorio, ancho: 44 },
  ];

  let informacionMedico = limpiarTextoSeguro(
    filiacion.medicoTratante || 'MÉDICO TRATANTE',
  ).toUpperCase();
  if (filiacion.medicoColegiatura) {
    informacionMedico += `  •  CMP: ${filiacion.medicoColegiatura}`;
  }
  if (filiacion.medicoRne) {
    informacionMedico += `  •  RNE: ${filiacion.medicoRne}`;
  }

  const fechaLimpia = filiacion.fechaAtencion
    ? formatearFechaCorta(filiacion.fechaAtencion)
    : 'NO REGISTRADA';
  const textoFechaHora = filiacion.horaAtencion && fechaLimpia !== 'NO REGISTRADA'
    ? `${fechaLimpia}  ${filiacion.horaAtencion}`
    : fechaLimpia;

  const columnasFilaDos = [
    { etiqueta: 'MÉDICO TRATANTE', valor: informacionMedico, ancho: 96 },
    {
      etiqueta: 'PROCEDENCIA / MODALIDAD',
      valor: limpiarTextoSeguro(
        filiacion.procedencia || 'CONSULTA AMBULATORIA',
      ).toUpperCase(),
      ancho: 44,
    },
    { etiqueta: 'FECHA Y HORA', valor: textoFechaHora, ancho: 38 },
  ];

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(6.2);

  let maximoLineasFilaUno = 1;
  const columnasCalculadasFilaUno = columnasFilaUno.map((columna) => {
    const lineas = documentoPdf.splitTextToSize(
      columna.valor,
      columna.ancho - 3,
    );
    if (lineas.length > maximoLineasFilaUno) {
      maximoLineasFilaUno = lineas.length;
    }
    return { ...columna, lineas };
  });
  const altoFilaUno = Math.max(9.5, maximoLineasFilaUno * 3.0 + 4.5);

  let maximoLineasFilaDos = 1;
  const columnasCalculadasFilaDos = columnasFilaDos.map((columna) => {
    const lineas = documentoPdf.splitTextToSize(
      columna.valor,
      columna.ancho - 3,
    );
    if (lineas.length > maximoLineasFilaDos) {
      maximoLineasFilaDos = lineas.length;
    }
    return { ...columna, lineas };
  });
  const altoFilaDos = Math.max(9.5, maximoLineasFilaDos * 3.0 + 4.5);

  const altoCabecera = 11.0;
  const alturaTarjetaTotal = altoCabecera + altoFilaUno + altoFilaDos + 2.5;

  documentoPdf.setFillColor(...COLOR_FONDO_GRIS);
  documentoPdf.setDrawColor(...COLOR_BORDE_MEDIO);
  documentoPdf.setLineWidth(0.2);
  documentoPdf.roundedRect(
    margenIzquierdo,
    posicionActual,
    anchoContenido,
    alturaTarjetaTotal,
    1.5,
    1.5,
    'FD',
  );

  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.rect(
    margenIzquierdo,
    posicionActual,
    2.5,
    alturaTarjetaTotal,
    'F',
  );

  const coordenadaXInterior = margenIzquierdo + 5;
  const coordenadaYCabecera = posicionActual + 5.0;

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.5);
  documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
  documentoPdf.text('PACIENTE:', coordenadaXInterior, coordenadaYCabecera);

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(8.2);
  documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
  const nombrePacienteTexto = limpiarTextoSeguro(
    filiacion.pacienteNombre,
  ).toUpperCase();
  documentoPdf.text(
    nombrePacienteTexto,
    coordenadaXInterior + 15,
    coordenadaYCabecera,
    {
      maxWidth: anchoContenido - 80,
    },
  );

  const partesBadges: string[] = [];
  if (filiacion.nroHistoriaClinica) {
    partesBadges.push(`HC: ${filiacion.nroHistoriaClinica}`);
  }
  if (filiacion.nroDocumento) {
    partesBadges.push(`DOC: ${filiacion.nroDocumento}`);
  }
  if (partesBadges.length === 0 && filiacion.idCuentaAtencion) {
    partesBadges.push(`CTA: ${filiacion.idCuentaAtencion}`);
  }
  const textoBadges = partesBadges.join('   •   ');
  const anchoBadges = Math.min(62, textoBadges.length * 2.2 + 8);
  const coordenadaXBadges = margenDerecho - 4;

  documentoPdf.setFillColor(...COLOR_PRIMARIO);
  documentoPdf.roundedRect(
    coordenadaXBadges - anchoBadges,
    coordenadaYCabecera - 3.8,
    anchoBadges,
    5.0,
    1,
    1,
    'F',
  );

  documentoPdf.setFont('helvetica', 'bold');
  documentoPdf.setFontSize(5.6);
  documentoPdf.setTextColor(...COLOR_FONDO_BLANCO);
  documentoPdf.text(
    textoBadges,
    coordenadaXBadges - anchoBadges / 2,
    coordenadaYCabecera - 0.4,
    { align: 'center' },
  );

  const coordenadaYDivisoria = coordenadaYCabecera + 4.0;
  documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
  documentoPdf.setLineWidth(0.18);
  documentoPdf.line(
    coordenadaXInterior,
    coordenadaYDivisoria,
    margenDerecho - 4,
    coordenadaYDivisoria,
  );

  const coordenadaYFilaUno = coordenadaYDivisoria + 4.2;
  let coordenadaXCursorFilaUno = coordenadaXInterior;
  for (const columna of columnasCalculadasFilaUno) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.4);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(
      columna.etiqueta,
      coordenadaXCursorFilaUno,
      coordenadaYFilaUno,
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    for (let i = 0; i < columna.lineas.length; i++) {
      documentoPdf.text(
        columna.lineas[i],
        coordenadaXCursorFilaUno,
        coordenadaYFilaUno + 3.6 + i * 3.0,
      );
    }

    coordenadaXCursorFilaUno += columna.ancho;
  }

  const coordenadaYFilaDos = coordenadaYFilaUno + altoFilaUno;
  let coordenadaXCursorFilaDos = coordenadaXInterior;
  for (const columna of columnasCalculadasFilaDos) {
    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(5.4);
    documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
    documentoPdf.text(
      columna.etiqueta,
      coordenadaXCursorFilaDos,
      coordenadaYFilaDos,
    );

    documentoPdf.setFont('helvetica', 'bold');
    documentoPdf.setFontSize(6.8);
    documentoPdf.setTextColor(...COLOR_TEXTO_TITULO);
    for (let i = 0; i < columna.lineas.length; i++) {
      documentoPdf.text(
        columna.lineas[i],
        coordenadaXCursorFilaDos,
        coordenadaYFilaDos + 3.6 + i * 3.0,
      );
    }

    coordenadaXCursorFilaDos += columna.ancho;
  }

  return posicionActual + alturaTarjetaTotal + 4.5;
}

export interface OpcionesPiePaginaInstitucional {
  nombreDocumento?: string;
  codigoFormato?: string;
  medicoNombre?: string;
  pacienteNombre?: string;
  historiaClinica?: string | number;
  margenIzquierdo?: number;
  margenDerecho?: number;
  anchoPagina?: number;
}

export function dibujarPiePaginaInstitucionalUnificado(
  documentoPdf: jsPDF,
  opcionesOPacienteNombre?: OpcionesPiePaginaInstitucional | string,
  historiaClinicaParametro?: string | number,
  margenIzquierdoParametro = 14,
  margenDerechoParametro = 196,
  anchoPaginaParametro = 210,
): void {
  let pacienteNombre: string | undefined;
  let historiaClinica: string | undefined;
  let margenIzquierdo = margenIzquierdoParametro;
  let margenDerecho = margenDerechoParametro;
  let anchoPagina = anchoPaginaParametro;
  let textoPieDocumento =
    'Documento Clínico Oficial  •  Hospital Nacional Sergio E. Bernales  •  GalenHos Pro';

  if (
    typeof opcionesOPacienteNombre === 'object' &&
    opcionesOPacienteNombre !== null
  ) {
    pacienteNombre = opcionesOPacienteNombre.pacienteNombre;
    historiaClinica = opcionesOPacienteNombre.historiaClinica
      ? String(opcionesOPacienteNombre.historiaClinica)
      : undefined;
    margenIzquierdo =
      opcionesOPacienteNombre.margenIzquierdo ?? margenIzquierdoParametro;
    margenDerecho =
      opcionesOPacienteNombre.margenDerecho ?? margenDerechoParametro;
    anchoPagina = opcionesOPacienteNombre.anchoPagina ?? anchoPaginaParametro;

    const partesPie: string[] = [];
    if (opcionesOPacienteNombre.nombreDocumento) {
      partesPie.push(opcionesOPacienteNombre.nombreDocumento);
    }
    if (opcionesOPacienteNombre.codigoFormato) {
      partesPie.push(`Código: ${opcionesOPacienteNombre.codigoFormato}`);
    }
    if (opcionesOPacienteNombre.medicoNombre) {
      partesPie.push(
        `Médico: ${opcionesOPacienteNombre.medicoNombre.toUpperCase()}`,
      );
    }
    if (partesPie.length > 0) {
      textoPieDocumento = `${partesPie.join('  •  ')}  •  HNSEB`;
    }
  } else {
    pacienteNombre = opcionesOPacienteNombre;
    historiaClinica = historiaClinicaParametro
      ? String(historiaClinicaParametro)
      : undefined;
  }

  const totalPaginas = documentoPdf.getNumberOfPages();

  for (let numeroPagina = 1; numeroPagina <= totalPaginas; numeroPagina++) {
    documentoPdf.setPage(numeroPagina);

    if (numeroPagina > 1) {
      dibujarBandaSuperiorInstitucional(documentoPdf, anchoPagina);
      documentoPdf.setFont('helvetica', 'normal');
      documentoPdf.setFontSize(6.2);
      documentoPdf.setTextColor(...COLOR_TEXTO_MUTED);
      const nombreTexto = (pacienteNombre || 'PACIENTE').toUpperCase();
      const hcTexto = historiaClinica ? ` (HC: ${historiaClinica})` : '';
      documentoPdf.text(
        `HOSPITAL NACIONAL SERGIO E. BERNALES  •  ${nombreTexto}${hcTexto}`,
        margenIzquierdo,
        9.0,
      );
      documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
      documentoPdf.setLineWidth(0.2);
      documentoPdf.line(margenIzquierdo, 11.2, margenDerecho, 11.2);
    }

    documentoPdf.setDrawColor(...COLOR_BORDE_SUAVE);
    documentoPdf.setLineWidth(0.2);
    documentoPdf.line(margenIzquierdo, 287, margenDerecho, 287);

    documentoPdf.setFont('helvetica', 'normal');
    documentoPdf.setFontSize(6.2);
    documentoPdf.setTextColor(...COLOR_TEXTO_CLARO);
    documentoPdf.text(textoPieDocumento, margenIzquierdo, 291);
    documentoPdf.text(
      `Página ${numeroPagina} de ${totalPaginas}`,
      margenDerecho,
      291,
      { align: 'right' },
    );
  }
}
