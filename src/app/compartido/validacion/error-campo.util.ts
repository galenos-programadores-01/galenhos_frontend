import type { ErrorCampoUi } from './error-campo.tipos';

/** Primer mensaje (compat con APIs que esperan string | null). */
export function primerMensajeError(errores: ErrorCampoUi[]): string | null {
  return errores[0]?.mensaje ?? null;
}

export function tieneErrorCampo(
  errores: ErrorCampoUi[],
  campoId: string,
): boolean {
  return errores.some((e) => e.campoId === campoId);
}

export function mensajeDeCampo(
  errores: ErrorCampoUi[],
  campoId: string,
): string | null {
  return errores.find((e) => e.campoId === campoId)?.mensaje ?? null;
}

/** Quita un campo del listado (p. ej. al corregir). */
export function quitarErrorCampo(
  errores: ErrorCampoUi[],
  campoId: string,
): ErrorCampoUi[] {
  return errores.filter((e) => e.campoId !== campoId);
}

export function tituloResumenErrores(cantidad: number): string {
  if (cantidad <= 0) return 'Sin errores';
  if (cantidad === 1) return 'Hay 1 campo por completar o corregir';
  return `Hay ${cantidad} campos por completar o corregir`;
}
