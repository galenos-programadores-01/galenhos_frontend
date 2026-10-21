import type { RgbPdf } from './pdf.tipos';

export const PDF_COLOR = {
  primario: [26, 54, 93] as RgbPdf,
  primarioOscuro: [15, 23, 42] as RgbPdf,
  primarioAcento: [37, 99, 235] as RgbPdf,
  textoTitulo: [15, 23, 42] as RgbPdf,
  textoCuerpo: [30, 41, 59] as RgbPdf,
  textoMuted: [71, 85, 105] as RgbPdf,
  textoClaro: [100, 116, 139] as RgbPdf,
  fondoBlanco: [255, 255, 255] as RgbPdf,
  fondoGris: [248, 250, 252] as RgbPdf,
  fondoHeader: [241, 245, 249] as RgbPdf,
  bordeSuave: [226, 232, 240] as RgbPdf,
  bordeMedio: [203, 213, 225] as RgbPdf,
  alertaFondo: [254, 243, 199] as RgbPdf,
  alertaBorde: [252, 211, 77] as RgbPdf,
  alertaTexto: [180, 83, 9] as RgbPdf,
};

export function convertirTextoPdf(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }
  return '';
}

export function formatearValorPdf(valor: unknown): string {
  const texto = convertirTextoPdf(valor);
  return texto || '—';
}

/** Alertas biológicas alineadas al PDF de Evolución. */
export function esSignoVitalAlertaPdf(
  etiqueta: string,
  valorTexto: string,
): boolean {
  if (!valorTexto || valorTexto === '—') return false;
  const e = etiqueta.toUpperCase();

  if (e.includes('SAT') || e.includes('O₂') || e.includes('O2')) {
    const valor = Number.parseFloat(valorTexto);
    return !Number.isNaN(valor) && valor < 95;
  }
  if (e.includes('TEMP')) {
    const valor = Number.parseFloat(valorTexto);
    return !Number.isNaN(valor) && (valor >= 38.0 || valor < 36.0);
  }
  if (e.includes('CARD') || e === 'F.C.') {
    const valor = Number.parseFloat(valorTexto);
    return !Number.isNaN(valor) && (valor > 100 || valor < 55);
  }
  if (e.includes('RESP') || e === 'F.R.') {
    const valor = Number.parseFloat(valorTexto);
    return !Number.isNaN(valor) && (valor > 22 || valor < 12);
  }
  if (e.includes('ARTER') || e.includes('P.A') || e === 'P.A.') {
    const partes = valorTexto.split('/');
    if (partes.length === 2) {
      const sistolica = Number.parseFloat(partes[0]);
      const diastolica = Number.parseFloat(partes[1]);
      return (
        (!Number.isNaN(sistolica) && (sistolica >= 140 || sistolica < 90)) ||
        (!Number.isNaN(diastolica) && (diastolica >= 90 || diastolica < 60))
      );
    }
  }
  return false;
}
