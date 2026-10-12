export function esSignoVitalAlerta(
  etiqueta: string,
  valorTexto: string,
): boolean {
  if (!valorTexto || valorTexto === '—') {
    return false;
  }

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

export function convertirTexto(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return '';
  }
  if (typeof valor === 'string') {
    return valor.trim();
  }
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }
  return '';
}

export function formatearValor(valor: unknown): string {
  const texto = convertirTexto(valor);
  return texto || '—';
}
