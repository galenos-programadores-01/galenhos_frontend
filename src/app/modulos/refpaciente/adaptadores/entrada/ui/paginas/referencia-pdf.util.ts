import type { jsPDF } from 'jspdf';
import type {
  EstablecimientoItem,
  ReferenciaPacienteItem,
} from '../../../salida/http/refpaciente.api.service';

const AMARILLO: [number, number, number] = [250, 250, 218];

// Logo institucional. El PNG debe estar en public/ del frontend
// (public/logo-minsa.png) para servirse en la raíz del sitio.
const ARCHIVO_LOGO_MENSA = 'logo-minsa.png';

// Ancho máximo (en px) al que se reduce el logo antes de incrustarlo.
// El logo se imprime a 26 mm, así que 600 px sobran con creces y el PDF
// se mantiene pequeño.
const ANCHO_MAXIMO_LOGO_PX = 600;

interface UbigeoHoja {
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

// Establecimiento de referencia por defecto del establecimiento de salud.
const CODIGO_IPRESS_REFERENCIA = '7634';
const NOMBRE_ESTABLECIMIENTO_REFERENCIA =
  'HOSPITAL NACIONAL SERGIO E. BERNALES';

type Alineacion = 'centro' | 'izquierda' | 'arriba';

interface CeldaPdf {
  ancho: number;
  texto: string;
  tipo: 'titulo' | 'etiqueta' | 'valor' | 'vacia';
  alinear?: Alineacion;
  tamano?: number;
  color?: [number, number, number];
}

interface OpcionMarca {
  texto: string;
  marca: boolean;
}

function s(valor: string | null | undefined): string {
  return valor ?? '';
}

// Carga el logo institucional y lo devuelve como bytes para incrustarlo en el
// PDF. jsPDF no acepta data URLs en addImage/getImageProperties, por eso se
// pasa el Uint8Array crudo. La imagen se reduce al tamaño en que se imprime
// para no inflar el PDF (un PNG de 500 KB lo convertía en un PDF de 2 MB).
async function cargarLogoBytes(
  ruta: string,
  anchoMaximo: number,
): Promise<Uint8Array | null> {
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 5000);
    let respuesta: Response;
    try {
      respuesta = await fetch(ruta, { signal: controlador.signal });
    } finally {
      clearTimeout(temporizador);
    }
    const tipo = respuesta.headers.get('content-type') ?? '';
    if (!respuesta.ok || !tipo.startsWith('image/')) return null;
    const blob = await respuesta.blob();

    try {
      if (
        typeof createImageBitmap === 'function' &&
        typeof OffscreenCanvas !== 'undefined'
      ) {
        const bitmap = await createImageBitmap(blob);
        try {
          if (bitmap.width > anchoMaximo) {
            const escala = anchoMaximo / bitmap.width;
            const lienzo = new OffscreenCanvas(
              Math.round(bitmap.width * escala),
              Math.round(bitmap.height * escala),
            );
            const contexto = lienzo.getContext('2d');
            if (contexto) {
              contexto.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
              const salida = await lienzo.convertToBlob({ type: 'image/png' });
              return new Uint8Array(await salida.arrayBuffer());
            }
          }
        } finally {
          bitmap.close?.();
        }
      }
    } catch {
      // Si no se puede reducir, se usa la imagen original.
    }

    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    return null;
  }
}

function descripcionServicioUps(
  codigo: string | null | undefined,
  ups?: Map<string, string> | null,
): string {
  const c = s(codigo);
  if (!c) return '';
  const descripcion = ups?.get(c.trim());
  return descripcion ? `${descripcion} (${c})` : c;
}

function normalizarCodigoIpress(codigo: string): string {
  return codigo.trim().replace(/^0+/, '');
}

// Resuelve el establecimiento de origen: el código que trae la referencia
// puede venir sin ceros a la izquierda, mientras que el catálogo los incluye;
// por eso se comparan normalizados y se usa el código canónico del catálogo.
function resolverEstablecimiento(
  codigo: string | null | undefined,
  establecimientos?: EstablecimientoItem[] | null,
): { codigoIpress: string; nombre: string } {
  const codigoOriginal = s(codigo).trim();
  const clave = normalizarCodigoIpress(codigoOriginal);
  if (!clave) return { codigoIpress: codigoOriginal, nombre: '' };
  let codigoCanonico = codigoOriginal;
  let nombre = '';
  for (const establecimiento of establecimientos ?? []) {
    if (normalizarCodigoIpress(establecimiento.codigo) === clave) {
      codigoCanonico = establecimiento.codigo;
      nombre = establecimiento.nombre;
      break;
    }
  }
  return { codigoIpress: codigoCanonico, nombre };
}

function desglosarFecha(fecha: string | null | undefined): {
  d: string;
  m: string;
  a: string;
} {
  const partes = (fecha ?? '').split(/[/-]/);
  if (partes.length === 3) {
    return { d: partes[0], m: partes[1], a: partes[2] };
  }
  return { d: '', m: '', a: '' };
}

function calcularEdad(fechaNacimiento: string | null | undefined): string {
  const partes = (fechaNacimiento ?? '').split(/[/-]/);
  if (partes.length !== 3) return '';
  const [dd, mm, aa] = partes.map(Number);
  if (!dd || !mm || !aa) return '';
  const nacimiento = new Date(aa, mm - 1, dd);
  if (Number.isNaN(nacimiento.getTime())) return '';
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();
  let dias = hoy.getDate() - nacimiento.getDate();
  if (dias < 0) {
    meses -= 1;
    dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  if (anios < 0) return '';
  return `${anios} año(s) ${meses} mes(es) ${dias} día(s)`;
}

function formatearHora(hora: string | null | undefined): string {
  const h = s(hora).trim();
  const m = h.match(/(\d{1,2}):(\d{2})/);
  if (!m) return h;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function mapearTipoDocumento(codigo: string | null | undefined): string {
  switch (s(codigo)) {
    case '1':
      return 'DNI';
    case '2':
      return 'CE';
    case '4':
      return 'PASAPORTE';
    case '5':
      return 'SD';
    case '6':
      return 'CARNÉ DE EXTRANJERÍA';
    default:
      return '';
  }
}

function mapearSexo(sexo: string | null | undefined): string {
  const x = s(sexo).trim().toUpperCase();
  if (x === 'M' || x === 'MASCULINO' || x === '1') return 'MASCULINO';
  if (x === 'F' || x === 'FEMENINO' || x === '2') return 'FEMENINO';
  return '';
}

function mapearTipoDiagnostico(tipo: string | null | undefined): string {
  const x = s(tipo).trim().toUpperCase();
  if (x === 'D') return 'DEFINITIVO';
  if (x === 'P' || x === 'PRESUNTIVO' || x === 'PROBABLE') return 'PRESUNTIVO';
  return x;
}

function diagnosticosTexto(item: ReferenciaPacienteItem): string {
  const diags = item.diagnosticos ?? [];
  if (diags.length === 0) return '';
  return diags
    .map(
      (d, i) =>
        `DX ${i + 1} ${s(d.codigo_ciex)} TIPO: ${mapearTipoDiagnostico(d.tipo_diagnostico)}`,
    )
    .join('  |  ');
}

function condicionMarcas(condicion: string | null | undefined): {
  estable: boolean;
  mal: boolean;
  grave: boolean;
} {
  const x = s(condicion).trim().toUpperCase();
  return {
    estable: x === 'E' || x === 'ESTABLE' || x === '1',
    mal: x === 'M' || x.startsWith('MAL'),
    grave: x === 'G' || x === 'GRAVE' || x === '3',
  };
}

function transporteMarcas(tipo: string | null | undefined): {
  terrestre: boolean;
  aereo: boolean;
  fluvial: boolean;
  maritimo: boolean;
} {
  const x = s(tipo).trim().toUpperCase();
  return {
    terrestre: x === 'T' || x === 'TERRESTRE' || x === '1',
    aereo: x === 'A' || x === 'AEREO' || x === 'AÉREO',
    fluvial: x === 'F' || x === 'FLUVIAL' || x === '2',
    maritimo: x === 'M' || x === 'MARITIMO' || x === 'MARÍTIMO' || x === '3',
  };
}

export async function construirPdfHojaReferencia(
  item: ReferenciaPacienteItem | null | undefined,
  ups?: Map<string, string> | null,
  establecimientos?: EstablecimientoItem[] | null,
  ubigeo?: UbigeoHoja | null,
): Promise<jsPDF | null> {
  if (!item) return null;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = 210;
  const margenIzq = 8;
  const margenDer = 8;
  const ancho = pageW - margenIzq - margenDer;
  let y = 8;

  const rutaLogo = new URL(ARCHIVO_LOGO_MENSA, document.baseURI).toString();
  const logoMinsa = await cargarLogoBytes(rutaLogo, ANCHO_MAXIMO_LOGO_PX);

  const paciente = item.paciente ?? {};
  const ref = item.datos_referencia ?? {};
  const fecha = desglosarFecha(ref.fecha_referencia);

  function pintarOpciones(
    x: number,
    anchoCelda: number,
    alto: number,
    alinear: Alineacion,
    opciones: OpcionMarca[],
  ): void {
    const filas = opciones.length;
    const paso = filas > 0 ? (alto - 1) / filas : 0;
    const lado = 2.4;
    // Con una sola opción se centra verticalmente; con varias se reparten.
    let top = filas === 1 ? y + (alto - lado) / 2 : y + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(0);
    for (const opcion of opciones) {
      const texto = opcion.texto.toUpperCase();
      const anchoTexto = doc.getTextWidth(texto);
      let cajaX = x + 1;
      if (alinear === 'centro') {
        const contenido = lado + 1 + anchoTexto;
        cajaX = x + Math.max(0.8, (anchoCelda - contenido) / 2);
      }
      const textoX = cajaX + lado + 1;
      doc.setLineWidth(0.3);
      doc.rect(cajaX, top, lado, lado);
      if (opcion.marca) {
        doc.line(cajaX + 0.4, top + 0.4, cajaX + lado - 0.4, top + lado - 0.4);
        doc.line(cajaX + lado - 0.4, top + 0.4, cajaX + 0.4, top + lado - 0.4);
      }
      doc.text(texto, textoX, top + 2.4);
      top += paso;
    }
  }

  function dibujarFila(
    celdas: CeldaPdf[],
    altura: number,
    xInicio = margenIzq,
  ): void {
    let x = xInicio;
    for (const celda of celdas) {
      const color =
        celda.color ??
        (celda.tipo === 'titulo' || celda.tipo === 'etiqueta'
          ? AMARILLO
          : undefined);
      if (color) {
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(x, y, celda.ancho, altura, 'F');
      }
      doc.setLineWidth(0.3);
      doc.rect(x, y, celda.ancho, altura);

      const tamano = celda.tamano ?? (celda.tipo === 'valor' ? 7 : 5.5);
      doc.setFont(
        'helvetica',
        celda.tipo === 'valor' || celda.tipo === 'vacia' ? 'normal' : 'bold',
      );
      doc.setFontSize(tamano);
      doc.setTextColor(0);
      const texto = celda.texto.trim().toUpperCase();
      if (!texto) {
        x += celda.ancho;
        continue;
      }

      const altLinea = tamano * 0.42;
      if (celda.alinear === 'arriba') {
        const lineas = doc.splitTextToSize(
          texto,
          celda.ancho - 2.5,
        ) as string[];
        let ty = y + 1.6;
        for (const linea of lineas) {
          if (ty + altLinea > y + altura - 0.6) break;
          doc.text(linea, x + 1.2, ty);
          ty += altLinea;
        }
      } else if (celda.alinear === 'centro') {
        const lineas = doc.splitTextToSize(texto, celda.ancho - 2) as string[];
        if (lineas.length <= 1) {
          doc.text(
            texto,
            x + celda.ancho / 2,
            y + altura / 2 + tamano * 0.14 + 0.2,
            {
              align: 'center',
            },
          );
        } else {
          let ty = y + altura / 2 - (altLinea * (lineas.length - 1)) / 2;
          for (const linea of lineas) {
            doc.text(linea, x + celda.ancho / 2, ty, { align: 'center' });
            ty += altLinea;
          }
        }
      } else {
        const lineas = doc.splitTextToSize(texto, celda.ancho - 2) as string[];
        if (lineas.length <= 1) {
          doc.text(texto, x + 1.2, y + altura / 2 + tamano * 0.14 + 0.2);
        } else {
          let ty = y + altura / 2 - (altLinea * (lineas.length - 1)) / 2;
          for (const linea of lineas) {
            doc.text(linea, x + 1.2, ty);
            ty += altLinea;
          }
        }
      }
      x += celda.ancho;
    }
    y += altura;
  }

  // Alto necesario para que un texto entre completo en una celda, según el
  // ajuste de línea que usa dibujarFila (ancho - 2, interlineado 0.42).
  function altoTexto(
    texto: string,
    anchoCelda: number,
    tamano: number,
  ): number {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(tamano);
    const lineas = doc.splitTextToSize(
      texto.trim().toUpperCase(),
      Math.max(anchoCelda - 2, 1),
    ) as string[];
    return lineas.length * tamano * 0.42 + 2.5;
  }

  // Reduce el tamaño de fuente lo justo para que el texto no exceda altoMaximo.
  function ajustarTamanoTexto(
    texto: string,
    anchoCelda: number,
    tamanoBase: number,
    altoMaximo: number,
  ): number {
    let tamano = tamanoBase;
    while (tamano > 4.5 && altoTexto(texto, anchoCelda, tamano) > altoMaximo) {
      tamano -= 0.25;
    }
    return tamano;
  }

  // Cabecera
  const xTitulo = margenIzq + 27;
  let logoDibujado = false;
  if (logoMinsa) {
    try {
      const props = doc.getImageProperties(logoMinsa);
      const cajaAlto = 8;
      const cajaAncho = xTitulo - margenIzq - 1;
      const escala = Math.min(cajaAncho / props.width, cajaAlto / props.height);
      const anchoLogo = props.width * escala;
      const altoLogo = props.height * escala;
      doc.addImage(
        logoMinsa,
        'PNG',
        margenIzq,
        y + (cajaAlto - altoLogo) / 2,
        anchoLogo,
        altoLogo,
      );
      logoDibujado = true;
    } catch {
      // Si el logo no se puede incrustar, se usa el encabezado de respaldo.
      logoDibujado = false;
    }
  }
  if (!logoDibujado) {
    doc.setFillColor(192, 57, 43);
    doc.roundedRect(margenIzq, y, 8, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text('PERÚ', margenIzq + 11, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Ministerio de Salud', margenIzq + 11, y + 6.5);
  }
  doc.setLineWidth(0.5);
  doc.rect(xTitulo, y, pageW - margenDer - xTitulo, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    'HOJA DE REFERENCIA INSTITUCIONAL',
    (xTitulo + pageW - margenDer) / 2,
    y + 5.2,
    {
      align: 'center',
    },
  );
  y += 10;

  // 1.- DATOS GENERALES
  dibujarFila(
    [
      {
        ancho,
        texto: '1.- Datos generales',
        tipo: 'titulo',
        alinear: 'centro',
      },
    ],
    5,
  );

  const wFecha = 14;
  const wTriada = [15, 15, 14];
  const wHora = 11;
  const wHoraVal = 18;
  const wEntidad = 30;
  const wSis = 29;
  const wNro = ancho - wFecha - 44 - wHora - wHoraVal - wEntidad - wSis;
  const xDia = margenIzq + wFecha;
  const xHora = xDia + 44;

  const yIniDatos = y;
  dibujarFila(
    [
      { ancho: wTriada[0], texto: 'Día', tipo: 'etiqueta', alinear: 'centro' },
      { ancho: wTriada[1], texto: 'Mes', tipo: 'etiqueta', alinear: 'centro' },
      { ancho: wTriada[2], texto: 'Año', tipo: 'etiqueta', alinear: 'centro' },
      { ancho: wHora, texto: '', tipo: 'vacia' },
      { ancho: wHoraVal, texto: '', tipo: 'vacia' },
      { ancho: wEntidad, texto: 'Entidad aseguradora', tipo: 'etiqueta' },
      {
        ancho: wSis,
        texto: s(ref.tipo_financiador) || 'S.I.S',
        tipo: 'valor',
      },
      { ancho: wNro, texto: 'Nro. hoja referencia', tipo: 'etiqueta' },
    ],
    7,
    xDia,
  );

  dibujarFila(
    [
      { ancho: wTriada[0], texto: fecha.d, tipo: 'valor' },
      { ancho: wTriada[1], texto: fecha.m, tipo: 'valor' },
      { ancho: wTriada[2], texto: fecha.a, tipo: 'valor' },
      { ancho: wHora, texto: '', tipo: 'vacia' },
      { ancho: wHoraVal, texto: '', tipo: 'vacia' },
      { ancho: wEntidad, texto: 'Codigo del asegurado', tipo: 'etiqueta' },
      {
        ancho: wSis,
        texto: s(paciente.numero_seguro),
        tipo: 'valor',
      },
      {
        ancho: wNro,
        texto: s(ref.numero_referencia),
        tipo: 'valor',
      },
    ],
    7,
    xDia,
  );

  const horaTexto = formatearHora(ref.hora_referencia);

  // Celdas que abarcan las dos filas (FECHA, HORA y valor de la hora).
  function pintarEtiquetaSpan(x: number, w: number, titulo: string): void {
    doc.setFillColor(AMARILLO[0], AMARILLO[1], AMARILLO[2]);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(x, yIniDatos, w, 14, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(0);
    const lineas = doc.splitTextToSize(titulo, w - 2) as string[];
    const ty = yIniDatos + (14 - lineas.length * 2.5) / 2 + 1;
    lineas.forEach((l, li) => {
      doc.text(l, x + w / 2, ty + li * 2.5, { align: 'center' });
    });
  }

  pintarEtiquetaSpan(margenIzq, wFecha, 'FECHA');
  pintarEtiquetaSpan(xHora, wHora, 'HORA');

  const xHoraVal = xHora + wHora;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(xHoraVal, yIniDatos, wHoraVal, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0);
  doc.text(horaTexto, xHoraVal + 1.2, yIniDatos + 8);

  const cu8Est = ancho / 8;
  const cCodIp = cu8Est;
  const cEstab = cu8Est * 3;
  dibujarFila(
    [
      { ancho: cCodIp, texto: 'Cod. ipress', tipo: 'etiqueta' },
      { ancho: cEstab, texto: 'Establecimiento de origen', tipo: 'etiqueta' },
      { ancho: cCodIp, texto: 'Cod. ipress', tipo: 'etiqueta' },
      {
        ancho: cEstab,
        texto: 'Establecimiento de referencia',
        tipo: 'etiqueta',
      },
    ],
    5,
  );

  const establecimientoOrigen = resolverEstablecimiento(
    ref.codigo_establecimiento_origen,
    establecimientos,
  );

  dibujarFila(
    [
      {
        ancho: cCodIp,
        texto: establecimientoOrigen.codigoIpress,
        tipo: 'valor',
      },
      {
        ancho: cEstab,
        texto: establecimientoOrigen.nombre,
        tipo: 'valor',
      },
      {
        ancho: cCodIp,
        texto: CODIGO_IPRESS_REFERENCIA,
        tipo: 'valor',
      },
      {
        ancho: cEstab,
        texto: NOMBRE_ESTABLECIMIENTO_REFERENCIA,
        tipo: 'valor',
      },
    ],
    6,
  );

  dibujarFila(
    [
      {
        ancho: cCodIp + cEstab,
        texto: 'Servicio origen (UPS)',
        tipo: 'etiqueta',
      },
      {
        ancho: cCodIp + cEstab,
        texto: 'Servicio destino (UPS)',
        tipo: 'etiqueta',
      },
    ],
    4.5,
  );

  dibujarFila(
    [
      {
        ancho: cCodIp + cEstab,
        texto: descripcionServicioUps(ref.servicio_origen, ups),
        tipo: 'valor',
      },
      {
        ancho: cCodIp + cEstab,
        texto: descripcionServicioUps(ref.servicio_destino, ups),
        tipo: 'valor',
      },
    ],
    5.5,
  );

  // 2.- IDENTIFICACIÓN DEL PACIENTE
  dibujarFila(
    [
      {
        ancho,
        texto: '2.- Identificación del paciente',
        tipo: 'titulo',
        alinear: 'centro',
      },
    ],
    5,
  );

  const cu8 = ancho / 8;
  dibujarFila(
    [
      {
        ancho: cu8,
        texto: mapearTipoDocumento(paciente.tipo_documento),
        tipo: 'etiqueta',
        alinear: 'centro',
      },
      { ancho: cu8 * 3, texto: 'Nombre(s)', tipo: 'etiqueta' },
      { ancho: cu8 * 2, texto: 'Apellido paterno', tipo: 'etiqueta' },
      { ancho: cu8 * 2, texto: 'Apellido materno', tipo: 'etiqueta' },
    ],
    5,
  );

  dibujarFila(
    [
      {
        ancho: cu8,
        texto: s(paciente.numero_documento),
        tipo: 'valor',
      },
      { ancho: cu8 * 3, texto: s(paciente.nombres), tipo: 'valor' },
      { ancho: cu8 * 2, texto: s(paciente.primer_apellido), tipo: 'valor' },
      { ancho: cu8 * 2, texto: s(paciente.segundo_apellido), tipo: 'valor' },
    ],
    7,
  );

  dibujarFila(
    [
      { ancho: cu8 * 2, texto: 'Fecha nacimiento', tipo: 'etiqueta' },
      { ancho: cu8 * 2, texto: 'Edad', tipo: 'etiqueta' },
      { ancho: cu8, texto: 'Sexo', tipo: 'etiqueta' },
      { ancho: cu8 * 2, texto: 'Celular', tipo: 'etiqueta' },
      { ancho: cu8, texto: '', tipo: 'vacia' },
    ],
    5,
  );

  dibujarFila(
    [
      {
        ancho: cu8 * 2,
        texto: s(paciente.fecha_nacimiento),
        tipo: 'valor',
      },
      {
        ancho: cu8 * 2,
        texto: calcularEdad(paciente.fecha_nacimiento),
        tipo: 'valor',
      },
      {
        ancho: cu8,
        texto: mapearSexo(paciente.sexo),
        tipo: 'valor',
      },
      { ancho: cu8 * 2, texto: s(paciente.celular), tipo: 'valor' },
      { ancho: cu8, texto: '', tipo: 'valor' },
    ],
    7,
  );

  dibujarFila(
    [
      { ancho: cu8 * 4, texto: 'Dirección', tipo: 'etiqueta' },
      { ancho: cu8 * 1.2, texto: 'Departamento', tipo: 'etiqueta' },
      { ancho: cu8 * 1.4, texto: 'Provincia', tipo: 'etiqueta' },
      { ancho: cu8 * 1.4, texto: 'Distrito', tipo: 'etiqueta' },
    ],
    5,
  );

  dibujarFila(
    [
      { ancho: cu8 * 4, texto: s(paciente.direccion), tipo: 'valor' },
      {
        ancho: cu8 * 1.2,
        texto: s(ubigeo?.departamento),
        tipo: 'valor',
      },
      {
        ancho: cu8 * 1.4,
        texto: s(ubigeo?.provincia),
        tipo: 'valor',
      },
      {
        ancho: cu8 * 1.4,
        texto: s(ubigeo?.distrito),
        tipo: 'valor',
      },
    ],
    7,
  );

  // 3.- RESUMEN DE HISTORIA CLÍNICA
  dibujarFila(
    [
      {
        ancho,
        texto: '3.- Resumen de historia clínica',
        tipo: 'titulo',
        alinear: 'centro',
      },
    ],
    5,
  );

  const cu9 = ancho / 9;
  const wYellow = cu9 * 1.5;
  const wResto = ancho - wYellow;

  const textoAnamnesis = s(ref.resume_anamnesis);
  const tamAnamnesis = ajustarTamanoTexto(textoAnamnesis, wResto, 7, 24);
  dibujarFila(
    [
      {
        ancho: wYellow,
        texto: 'Anamnesis',
        tipo: 'etiqueta',
        alinear: 'centro',
      },
      {
        ancho: wResto,
        texto: textoAnamnesis,
        tipo: 'valor',
        tamano: tamAnamnesis,
      },
    ],
    Math.max(12, Math.min(24, altoTexto(textoAnamnesis, wResto, tamAnamnesis))),
  );

  const textoExfisico = s(ref.resume_exfisico);
  const altoVitales = 6;
  const tamExfisico = ajustarTamanoTexto(textoExfisico, wResto, 7, 18);
  const altoExfValor = Math.max(
    10,
    Math.min(18, altoTexto(textoExfisico, wResto, tamExfisico)),
  );
  const altoExfisico = altoVitales + altoExfValor;

  doc.setFillColor(AMARILLO[0], AMARILLO[1], AMARILLO[2]);
  doc.rect(margenIzq, y, wYellow, altoExfisico, 'F');
  doc.rect(margenIzq, y, wYellow, altoExfisico);
  doc.setLineWidth(0.3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(0);
  const exfisicoTitulo = doc.splitTextToSize(
    'EXÁMEN FÍSICO',
    wYellow - 2,
  ) as string[];
  const tyTitulo = y + (altoExfisico - exfisicoTitulo.length * 2.4) / 2 + 1;
  exfisicoTitulo.forEach((l, li) => {
    doc.text(l, margenIzq + wYellow / 2, tyTitulo + li * 2.4, {
      align: 'center',
    });
  });

  // Signos vitales: cada par etiqueta/valor ocupa exactamente wResto para
  // quedar alineado al margen derecho de la hoja.
  const etiquetasVitales = ['(T°)', '(PA)', '(FR)', '(FC)'];
  const anchoParVital = wResto / etiquetasVitales.length;
  const anchoLabelVital = anchoParVital * 0.45;
  const anchoValorVital = anchoParVital - anchoLabelVital;
  dibujarFila(
    etiquetasVitales.flatMap((label) => [
      {
        ancho: anchoLabelVital,
        texto: label,
        tipo: 'etiqueta' as const,
        alinear: 'centro' as const,
      },
      {
        ancho: anchoValorVital,
        texto: '',
        tipo: 'valor' as const,
        alinear: 'centro' as const,
      },
    ]),
    altoVitales,
    margenIzq + wYellow,
  );

  dibujarFila(
    [
      {
        ancho: wResto,
        texto: textoExfisico,
        tipo: 'valor',
        tamano: tamExfisico,
      },
    ],
    altoExfValor,
    margenIzq + wYellow,
  );

  const altoAux = 5 + 16;
  doc.setFillColor(AMARILLO[0], AMARILLO[1], AMARILLO[2]);
  doc.rect(margenIzq, y, wYellow, altoAux, 'F');
  doc.rect(margenIzq, y, wYellow, altoAux);
  doc.setLineWidth(0.3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  const auxTitulo = doc.splitTextToSize(
    'EXÁMENES AUXILIARES',
    wYellow - 2,
  ) as string[];
  const tyAux = y + (altoAux - auxTitulo.length * 2.4) / 2 + 1;
  auxTitulo.forEach((l, li) => {
    doc.text(l, margenIzq + wYellow / 2, tyAux + li * 2.4, { align: 'center' });
  });

  const wAuxResto = ancho - wYellow;
  dibujarFila(
    [
      { ancho: wAuxResto * 0.3, texto: 'Procedimientos', tipo: 'etiqueta' },
      {
        ancho: wAuxResto * 0.3,
        texto: 'Pruebas de laboratorio',
        tipo: 'etiqueta',
      },
      {
        ancho: wAuxResto * 0.4,
        texto: 'Diagnósticos por imágenes',
        tipo: 'etiqueta',
      },
    ],
    5,
    margenIzq + wYellow,
  );

  dibujarFila(
    [
      {
        ancho: wAuxResto * 0.3,
        texto: s(item.cpt_procedimiento),
        tipo: 'valor',
      },
      {
        ancho: wAuxResto * 0.3,
        texto: s(item.cpt_laboratorio),
        tipo: 'valor',
      },
      {
        ancho: wAuxResto * 0.4,
        texto: s(item.cpt_imagenes),
        tipo: 'valor',
      },
    ],
    16,
    margenIzq + wYellow,
  );

  dibujarFila(
    [
      {
        ancho: wYellow,
        texto: 'Diagnóstico',
        tipo: 'etiqueta',
        alinear: 'centro',
      },
      {
        ancho: wResto,
        texto: diagnosticosTexto(item),
        tipo: 'valor',
      },
    ],
    8,
  );

  dibujarFila(
    [
      {
        ancho: wYellow,
        texto: 'Tratamiento',
        tipo: 'etiqueta',
        alinear: 'centro',
      },
      {
        ancho: wResto,
        texto: s(item.tratamiento),
        tipo: 'valor',
      },
    ],
    11,
  );

  // 4.- DATOS DE LA REFERENCIA
  dibujarFila(
    [
      {
        ancho,
        texto: '4.- Datos de la referencia',
        tipo: 'titulo',
        alinear: 'centro',
      },
    ],
    5,
  );

  const cu6 = ancho / 6;
  dibujarFila(
    [
      {
        ancho: cu6 * 1.5,
        texto: 'Motivo de referencia',
        tipo: 'etiqueta',
        alinear: 'centro',
      },
      {
        ancho: cu6 * 2.5,
        texto: s(ref.motivo_referencia),
        tipo: 'valor',
      },
      { ancho: cu6, texto: 'Nota / observaciones', tipo: 'etiqueta' },
      { ancho: cu6, texto: '', tipo: 'valor' },
    ],
    6.5,
  );

  dibujarFila(
    [
      {
        ancho: cu6 * 1.5,
        texto: 'Detalle del motivo',
        tipo: 'etiqueta',
        alinear: 'centro',
      },
      { ancho: cu6 * 3.5, texto: '', tipo: 'valor' },
      { ancho: cu6, texto: '', tipo: 'valor' },
    ],
    5.5,
  );

  dibujarFila(
    [
      {
        ancho: cu6 * 1.5,
        texto: 'Especialidad del destino',
        tipo: 'etiqueta',
        alinear: 'centro',
      },
      {
        ancho: cu6 * 4.5,
        texto: s(ref.codigo_especialidad),
        tipo: 'valor',
      },
    ],
    5.5,
  );

  const estado = condicionMarcas(ref.condicion);
  const transporte = transporteMarcas(ref.tipo_transporte);
  const hCondicion = 15;
  const cEstado = { x: margenIzq, ancho: cu6 * 1.3 };
  const cOpcEstado = { x: cEstado.x + cEstado.ancho, ancho: cu6 * 1.2 };
  const cTranspLabel = { x: cOpcEstado.x + cOpcEstado.ancho, ancho: cu6 * 1.0 };
  const cOpcTransp = {
    x: cTranspLabel.x + cTranspLabel.ancho,
    ancho: cu6 * 1.1,
  };
  const cCoordLabel = { x: cOpcTransp.x + cOpcTransp.ancho, ancho: cu6 * 0.9 };
  const cCoordVal = {
    x: cCoordLabel.x + cCoordLabel.ancho,
    ancho: ancho - (cCoordLabel.x + cCoordLabel.ancho - margenIzq),
  };

  doc.setFillColor(AMARILLO[0], AMARILLO[1], AMARILLO[2]);
  doc.setLineWidth(0.3);
  doc.rect(cEstado.x, y, cEstado.ancho, hCondicion, 'F');
  doc.rect(cEstado.x, y, cEstado.ancho, hCondicion);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(0);
  const condTitulo = doc.splitTextToSize(
    'CONDICIÓN PACIENTE',
    cEstado.ancho - 2,
  ) as string[];
  const tyCond = y + (hCondicion - condTitulo.length * 2.4) / 2 + 1;
  condTitulo.forEach((l, li) => {
    doc.text(l, cEstado.x + cEstado.ancho / 2, tyCond + li * 2.4, {
      align: 'center',
    });
  });

  doc.rect(cOpcEstado.x, y, cOpcEstado.ancho, hCondicion);
  pintarOpciones(cOpcEstado.x, cOpcEstado.ancho, hCondicion, 'izquierda', [
    { texto: 'ESTABLE', marca: estado.estable },
    { texto: 'MAL ESTADO', marca: estado.mal },
    { texto: 'GRAVE', marca: estado.grave },
  ]);

  doc.rect(cTranspLabel.x, y, cTranspLabel.ancho, hCondicion);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  const transpTitulo = doc.splitTextToSize(
    'TIPO DE TRANSPORTE',
    cTranspLabel.ancho - 2,
  ) as string[];
  const tyTransp = y + (hCondicion - transpTitulo.length * 2.4) / 2 + 1;
  transpTitulo.forEach((l, li) => {
    doc.text(l, cTranspLabel.x + cTranspLabel.ancho / 2, tyTransp + li * 2.4, {
      align: 'center',
    });
  });

  doc.rect(cOpcTransp.x, y, cOpcTransp.ancho, hCondicion);
  pintarOpciones(cOpcTransp.x, cOpcTransp.ancho, hCondicion, 'izquierda', [
    { texto: 'TERRESTRE', marca: transporte.terrestre },
    { texto: 'AÉREO', marca: transporte.aereo },
    { texto: 'FLUVIAL', marca: transporte.fluvial },
    { texto: 'MARÍTIMO', marca: transporte.maritimo },
  ]);

  doc.rect(cCoordLabel.x, y, cCoordLabel.ancho, hCondicion);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  const coordTitulo = doc.splitTextToSize(
    'COORDINACIÓN DE LA REFERENCIA',
    cCoordLabel.ancho - 1.5,
  ) as string[];
  const tyCoord = y + (hCondicion - coordTitulo.length * 2) / 2 + 1;
  coordTitulo.forEach((l, li) => {
    doc.text(l, cCoordLabel.x + cCoordLabel.ancho / 2, tyCoord + li * 2, {
      align: 'center',
    });
  });

  doc.rect(cCoordVal.x, y, cCoordVal.ancho, hCondicion);
  const coordTexto = ['FECHA ACEPTACIÓN:', s(ref.fecha_aceptacion)]
    .filter((l) => l.trim())
    .join('\n')
    .toUpperCase();
  const coordLineas = doc.splitTextToSize(
    coordTexto,
    cCoordVal.ancho - 1.5,
  ) as string[];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  coordLineas.forEach((l, li) => {
    doc.text(l, cCoordVal.x + 1, y + 1.8 + li * 1.9);
  });

  y += hCondicion;

  // RESPONSABLES
  const cu4 = ancho / 4;
  const reponsables = [
    'RESPONSABLE DE LA REF.',
    'RESPONSABLE DEL EESS',
    'PERSONAL QUE ACOMPAÑA',
    'PERSONAL QUE RECIBE',
  ];
  dibujarFila(
    reponsables.map((t) => ({
      ancho: cu4,
      texto: t,
      tipo: 'etiqueta' as const,
      alinear: 'centro' as const,
    })),
    5,
  );
  dibujarFila(
    Array.from({ length: 4 }, () => ({
      ancho: cu4,
      texto: 'NOMBRE(S) Y APELLIDOS',
      tipo: 'etiqueta' as const,
      alinear: 'centro' as const,
    })),
    5,
  );
  dibujarFila(
    Array.from({ length: 4 }, () => ({
      ancho: cu4,
      texto: '' as string,
      tipo: 'valor' as const,
      alinear: 'centro' as const,
    })),
    7,
  );
  dibujarFila(
    Array.from({ length: 4 }, () => ({
      ancho: cu4,
      texto: 'PROFESIÓN',
      tipo: 'etiqueta' as const,
      alinear: 'centro' as const,
    })),
    5,
  );
  dibujarFila(
    Array.from({ length: 4 }, () => ({
      ancho: cu4,
      texto: '' as string,
      tipo: 'valor' as const,
    })),
    7,
  );
  dibujarFila(
    Array.from({ length: 4 }, () => ({
      ancho: cu4,
      texto: 'COLEGIO PROF.',
      tipo: 'etiqueta' as const,
      alinear: 'centro' as const,
    })),
    5,
  );
  dibujarFila(
    Array.from({ length: 4 }, () => ({
      ancho: cu4,
      texto: '' as string,
      tipo: 'valor' as const,
    })),
    7,
  );
  dibujarFila(
    Array.from({ length: 4 }, () => ({
      ancho: cu4,
      texto: 'FIRMA Y SELLO',
      tipo: 'valor' as const,
      alinear: 'centro' as const,
    })),
    9,
  );

  // CONDICIÓN DEL USUARIO A LA LLEGADA
  const finales: OpcionMarca[] = [
    { texto: 'ESTABLE', marca: false },
    { texto: 'MAL ESTADO', marca: false },
    { texto: 'GRAVE', marca: false },
  ];
  const hFinal = 8;
  doc.setLineWidth(0.3);
  doc.rect(margenIzq, y, cu4 * 2.4, hFinal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(0);
  const condFinalTitulo = doc.splitTextToSize(
    'CONDICIÓN DEL USUARIO A LA LLEGADA AL ESTABLECIMIENTO DE SALUD DE DESTINO DE LA REFERENCIA',
    cu4 * 2.4 - 2,
  ) as string[];
  condFinalTitulo.forEach((l, li) => {
    doc.text(l, margenIzq + 1.2, y + 1.8 + li * 1.9);
  });
  let xFinal = margenIzq + cu4 * 2.4;
  const anchoFinal = (ancho - cu4 * 2.4) / 3;
  for (const opcion of finales) {
    doc.rect(xFinal, y, anchoFinal, hFinal);
    pintarOpciones(xFinal, anchoFinal, hFinal, 'centro', [opcion]);
    xFinal += anchoFinal;
  }

  return doc;
}
