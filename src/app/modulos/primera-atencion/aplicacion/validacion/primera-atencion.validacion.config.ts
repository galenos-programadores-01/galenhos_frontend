import type { ConfigValidacionPa } from './primera-atencion.validacion.tipos';

/**
 * Reglas de validación de Primera Atención (solo frontend por ahora).
 * Cambiar `enabled` / `min` / `max` aquí para ajustar o desactivar sin tocar el validador.
 */
export const PA_VALIDACION_CONFIG: ConfigValidacionPa = {
  campos: {
    tiempoEnfermedad: { enabled: true, min: 1, max: 100 },
    signosSintomas: { enabled: true, min: 5, max: 2000 },
    relatoCronologico: { enabled: true, min: 5, max: 4000 },
    antecedentes: { enabled: false, min: 0, max: 2000 },
    pielAnexos: { enabled: false, min: 0, max: 2000 },
    examenRegional: { enabled: false, min: 0, max: 2000 },
    referencia: { enabled: false, min: 0, max: 500 },
    evolucion: { enabled: true, min: 10, max: 4000 },
    evaluacionEnfermeria: { enabled: false, min: 0, max: 2000 },
  },
  selects: {
    estadoGeneral: { enabled: true },
    hidratacion: { enabled: true },
    conciencia: { enabled: true },
    condicionEgreso: { enabled: true },
  },
  cantidades: {
    diagnosticos: { enabled: true, min: 1 },
    examenes: { enabled: true, min: 0 },
    procedimientos: { enabled: true, min: 0 },
    medicamentos: { enabled: true, min: 0 },
  },
  egreso: {
    fechaHoraObligatoria: false,
  },
};
