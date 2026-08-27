import type { jsPDF, TextOptionsLight } from 'jspdf';

export interface TriajeReporteData {
  idTriaje?: number;
  NroDocumento?: string | null;
  Paciente?: string | null;
  FechaNacimiento?: string | null;
  EstadoCivil?: string | null;
  Sexo?: string | null;
  Direccion?: string | null;
  Distrito?: string | null;
  Edad?: string | null;
  Telefono?: string | null;
  fuentefinanciamiento?: string | null;
  Gravedad?: string | null;
  temperatura?: string | null;
  presion_arterial?: string | null;
  frecuencia_respiratoria?: number | null;
  frecuencia_cardiaca?: number | null;
  peso?: string | null;
  talla?: number | null;
  IMC?: string | null;
  escala_glasgow?: number | null;
  escala_dolor?: number | null;
  sintoma_principal?: string | null;
  tiempo_evolucion_cantidad?: number | null;
  tiempo_evolucion_unidad?: string | null;
  Servicio?: string | null;
}

export interface DatosInstitucion {
  rucEess?: string | null;
  nombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  logoMinsa?: string | null;
  logoHospi?: string | null;
}

export function decodificarBase64Reporte(
  valor: string | null | undefined,
): string {
  if (!valor) return '';
  try {
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(valor)) return atob(valor);
  } catch {
    /* no es base64 válido */
  }
  return valor;
}

export function formatFechaPdf(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso ?? '';
  return d.toLocaleDateString('es-PE');
}

/**
 * Construye el PDF del reporte de triaje con jsPDF (cargado en diferido para
 * no inflar el bundle inicial). Devuelve null si no hay cabecera.
 */
export async function construirPdfTriaje(
  cabecera: TriajeReporteData | null,
  institucion: DatosInstitucion | null,
  idTriaje: number,
  usuario: string,
  fechaImp: string,
): Promise<jsPDF | null> {
  if (!cabecera) return null;
  const c = cabecera;
  const v = (x: string | number | null | undefined) =>
    x === null || x === undefined || x === '' ? '—' : String(x);
  const direccion = c.Direccion
    ? c.Direccion + (c.Distrito ? `, ${c.Distrito}` : '')
    : '—';
  const motivo = c.sintoma_principal ?? '—';

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const ml = 20;
  const w = pageW - ml * 2;
  const nCols = 8;
  const cw = w / nCols;

  let y = 15;

  interface Celda {
    span: number;
    text: string;
    kind: 'label' | 'value';
    align?: 'left' | 'center';
  }

  function dibujarFila(celdas: Celda[], h: number, valorSize = 7) {
    let x = ml;
    for (const celda of celdas) {
      const ancho = cw * celda.span;
      if (celda.kind === 'label') {
        doc.setFillColor(204, 204, 204);
        doc.rect(x, y, ancho, h, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(0);
        doc.text(celda.text, x + ancho / 2, y + h / 2 + 0.7, {
          align: 'center',
        });
      } else {
        doc.rect(x, y, ancho, h);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(valorSize);
        doc.setTextColor(0);
        const texto = celda.text.toUpperCase();
        const opts: TextOptionsLight =
          celda.align === 'center'
            ? { align: 'center', maxWidth: ancho - 2 }
            : { align: 'left', maxWidth: ancho - 3 };
        doc.text(
          texto,
          celda.align === 'center' ? x + ancho / 2 : x + 1.5,
          y + h / 2 + 0.8,
          opts,
        );
      }
      x += ancho;
    }
    y += h;
  }

  function seccion(titulo: string) {
    y += 4;
    dibujarFila([{ span: nCols, text: titulo, kind: 'label' }], 6);
  }

  if (institucion?.logoMinsa) {
    try {
      doc.addImage(
        `data:image/png;base64,${institucion.logoMinsa}`,
        'PNG',
        ml,
        y,
        28,
        28,
      );
    } catch {
      /* logo inválido */
    }
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('TRIAJE', pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`RUC: ${v(institucion?.rucEess)}`, pageW / 2, y, {
    align: 'center',
  });
  y += 4;
  doc.text(`DIRECCIÓN: ${v(institucion?.direccion)}`, pageW / 2, y, {
    align: 'center',
  });
  y += 4;
  doc.text(`Telef.: ${v(institucion?.telefono)}`, pageW / 2, y, {
    align: 'center',
  });
  y += 7;

  dibujarFila(
    [
      { span: 1, text: 'N° DOCUMENTO', kind: 'label' },
      { span: 3, text: v(c.NroDocumento), kind: 'value' },
      { span: 1, text: 'N° DE TRIAJE', kind: 'label' },
      {
        span: 1,
        text: v(c.idTriaje ?? idTriaje),
        kind: 'value',
        align: 'center',
      },
      { span: 1, text: 'FUEN. FIN', kind: 'label' },
      {
        span: 1,
        text: v(c.fuentefinanciamiento),
        kind: 'value',
        align: 'center',
      },
    ],
    8,
  );

  dibujarFila(
    [
      { span: 1, text: 'PACIENTE', kind: 'label' },
      { span: 7, text: v(c.Paciente), kind: 'value' },
    ],
    9,
  );

  dibujarFila(
    [
      { span: 1, text: 'F.NACIMIENTO', kind: 'label' },
      { span: 2, text: formatFechaPdf(c.FechaNacimiento), kind: 'value' },
      { span: 1, text: 'ESTADO CIVIL', kind: 'label' },
      { span: 2, text: v(c.EstadoCivil), kind: 'value', align: 'center' },
      { span: 1, text: 'SEXO', kind: 'label' },
      { span: 1, text: v(c.Sexo), kind: 'value', align: 'center' },
    ],
    8,
  );

  dibujarFila(
    [
      { span: 1, text: 'EDAD', kind: 'label' },
      { span: 1, text: v(c.Edad), kind: 'value', align: 'center' },
      { span: 1, text: 'DIRECCIÓN', kind: 'label' },
      { span: 5, text: direccion, kind: 'value' },
    ],
    9,
  );

  seccion('FUNCIONES VITALES');
  dibujarFila(
    [
      { span: 1, text: 'TEM. (°C)', kind: 'label' },
      { span: 1, text: 'P.A. (mmHg)', kind: 'label' },
      { span: 1, text: 'F.R. (x min)', kind: 'label' },
      { span: 1, text: 'F.C. (x min)', kind: 'label' },
      { span: 1, text: 'PESO (kg)', kind: 'label' },
      { span: 1, text: 'TALLA (cm)', kind: 'label' },
      { span: 1, text: 'IMC', kind: 'label' },
      { span: 1, text: 'GLASGOW / DOLOR', kind: 'label' },
    ],
    7,
  );
  dibujarFila(
    [
      {
        span: 1,
        text: v(decodificarBase64Reporte(c.temperatura)),
        kind: 'value',
        align: 'center',
      },
      { span: 1, text: v(c.presion_arterial), kind: 'value', align: 'center' },
      {
        span: 1,
        text: v(c.frecuencia_respiratoria),
        kind: 'value',
        align: 'center',
      },
      {
        span: 1,
        text: v(c.frecuencia_cardiaca),
        kind: 'value',
        align: 'center',
      },
      {
        span: 1,
        text: v(decodificarBase64Reporte(c.peso)),
        kind: 'value',
        align: 'center',
      },
      { span: 1, text: v(c.talla), kind: 'value', align: 'center' },
      {
        span: 1,
        text: v(decodificarBase64Reporte(c.IMC)),
        kind: 'value',
        align: 'center',
      },
      {
        span: 1,
        text: `${v(c.escala_glasgow)} / ${v(c.escala_dolor)}`,
        kind: 'value',
        align: 'center',
      },
    ],
    7,
  );

  seccion('MOTIVO DE CONSULTA');
  dibujarFila(
    [
      { span: 1, text: 'Síntomas principales', kind: 'label' },
      { span: 5, text: motivo, kind: 'value' },
      { span: 1, text: 'Tiempo de evolución', kind: 'label' },
      {
        span: 1,
        text: `${v(c.tiempo_evolucion_cantidad)} ${v(c.tiempo_evolucion_unidad)}`,
        kind: 'value',
        align: 'center',
      },
    ],
    9,
  );

  seccion('CLASIFICACIÓN Y DERIVACIÓN');
  dibujarFila(
    [
      { span: 1, text: 'Tipo de gravedad', kind: 'label' },
      { span: 3, text: v(c.Gravedad), kind: 'value' },
      { span: 1, text: 'Servicio', kind: 'label' },
      { span: 3, text: v(c.Servicio), kind: 'value', align: 'center' },
    ],
    8,
  );

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${fechaImp}`, pageW - ml, y, { align: 'right' });
  doc.text(`U. Impresión: ${usuario}`, pageW - ml, y + 4, { align: 'right' });

  return doc;
}
