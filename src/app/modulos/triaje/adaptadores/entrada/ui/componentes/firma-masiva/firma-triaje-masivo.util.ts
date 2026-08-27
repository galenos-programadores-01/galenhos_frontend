import type { jsPDF } from 'jspdf';
import {
  type FirmaPeruBatido,
  iniciarFirmaLote,
} from '../../../../../../../compartido/utilidades/firma-peru.util';
import {
  construirPdfTriaje,
  type DatosInstitucion,
  type TriajeReporteData,
} from './triaje-pdf.util';

export interface PdfTriajeGenerado {
  idTriaje: number;
  doc: jsPDF | null;
  error?: string;
}

export interface ResultadoFirmaMasiva {
  idTriaje: number;
  ok: boolean;
  error?: string;
}

export interface ConexionApi {
  baseUrl: string;
  token: string | null;
}

export type SelectarProgreso = (
  actual: number,
  total: number,
  idTriaje: number,
) => boolean;

function authHeaders(
  conexion: ConexionApi,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...extra,
  };
  if (conexion.token) headers.authorization = `Bearer ${conexion.token}`;
  return headers;
}

function formatFechaImp(): string {
  return new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function obtenerReporte(
  conexion: ConexionApi,
  idTriaje: number,
): Promise<TriajeReporteData | null> {
  const res = await fetch(
    `${conexion.baseUrl}/api/v1/triaje/reporte?id=${idTriaje}`,
    {
      headers: authHeaders(conexion),
    },
  );
  const env = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: TriajeReporteData[];
    error?: { message?: string };
  } | null;
  const data = env?.data ?? [];
  if (!res.ok || !env?.success || !Array.isArray(data) || data.length === 0) {
    throw new Error(
      env?.error?.message ?? 'No se encontró el reporte del triaje.',
    );
  }
  return data[0];
}

/**
 * Fase 1: genera el PDF de cada triaje seleccionado. onProgreso recibe
 * (actual, total, idTriaje) y, si devuelve false, se detiene la generación.
 */
export async function generarPdfsTriajes(
  ids: number[],
  institucion: DatosInstitucion | null,
  conexion: ConexionApi,
  usuario: string,
  onProgreso: SelectarProgreso,
): Promise<PdfTriajeGenerado[]> {
  const generados: PdfTriajeGenerado[] = [];
  for (let i = 0; i < ids.length; i++) {
    const idTriaje = ids[i];
    if (!onProgreso(i + 1, ids.length, idTriaje)) break;
    console.log(
      `[FirmaPeru] masiva generando pdf triaje=${idTriaje} (${i + 1}/${ids.length})`,
    );
    try {
      const reporte = await obtenerReporte(conexion, idTriaje);
      if (!reporte) throw new Error('No se encontró el reporte del triaje.');
      const doc = await construirPdfTriaje(
        reporte,
        institucion,
        idTriaje,
        usuario,
        formatFechaImp(),
      );
      if (!doc) throw new Error('No se pudo generar el PDF del triaje.');
      generados.push({ idTriaje, doc });
    } catch (e) {
      generados.push({
        idTriaje,
        doc: null,
        error:
          e instanceof Error
            ? e.message
            : 'No se pudo generar el PDF del triaje.',
      });
    }
  }
  return generados;
}

/**
 * Fase 2: firma TODOS los PDFs generados en un solo lote (una única ventana
 * del Firmador y un solo PIN del DNIe). El backend extrae el 7z firmado y
 * guarda cada PDF en FIRMAPERU_SIGNED_DIR con el nombre del triaje.
 */
export async function firmarTriajesMasivamente(
  generados: PdfTriajeGenerado[],
  institucion: DatosInstitucion | null,
  conexion: ConexionApi,
  usuario: string,
  onProgreso: SelectarProgreso,
  batido: FirmaPeruBatido = {},
): Promise<ResultadoFirmaMasiva[]> {
  const conDoc = generados.filter((g) => g.doc);
  const sinDoc = generados.filter((g) => !g.doc);
  const resultados: ResultadoFirmaMasiva[] = sinDoc.map((g) => ({
    idTriaje: g.idTriaje,
    ok: false,
    error: g.error ?? 'No se generó el PDF de este triaje.',
  }));
  if (conDoc.length === 0) return resultados;

  const primerTriaje = conDoc[0].idTriaje;
  if (!onProgreso(1, conDoc.length, primerTriaje)) return resultados;

  console.log(
    `[FirmaPeru] masiva lote: firmando ${conDoc.length} documentos de una sola vez (PIN único)`,
  );
  try {
    const documentos = conDoc.map((g) => ({
      blob: (g.doc as jsPDF).output('blob'),
      nombre: `TRIAJE_${g.idTriaje}.pdf`,
    }));
    const firmado = await iniciarFirmaLote(
      documentos,
      conexion,
      {
        motivo: 'Firma del personal de salud responsable del triaje',
        rol: usuario,
        logoPngBase64: institucion?.logoMinsa ?? undefined,
        positionX: 430,
        positionY: 10,
      },
      batido,
    );
    console.log(
      `[FirmaPeru] masiva lote uuid=${firmado.uuid} firmado 7z bytes=${firmado.firmado.size}`,
    );
    for (const g of conDoc) resultados.push({ idTriaje: g.idTriaje, ok: true });
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : 'Ocurrió un error durante la firma por lote de los triajes.';
    console.log(`[FirmaPeru] masiva lote error=${msg}`);
    for (const g of conDoc)
      resultados.push({ idTriaje: g.idTriaje, ok: false, error: msg });
  }
  return resultados;
}
