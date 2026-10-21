/**
 * Error de validación anclado a un campo (o al paso completo).
 * Reutilizable en wizards HIS (PA, Evolución, etc.).
 */
export type ErrorCampoUi = {
  /** Id estable del control (ej. 'tiempoEnfermedad', 'diagnosticos'). */
  campoId: string;
  /** Mensaje corto orientado al usuario. */
  mensaje: string;
  /** Etiqueta legible opcional para el resumen. */
  etiqueta?: string;
  /** Ancla DOM opcional (#id) para foco / scroll. */
  ancla?: string;
};
