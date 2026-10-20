import type { DecisionAuditoria, DecisionPendiente } from './auditoria-qf.tipos';

/** Ids de dbo.RecetaEstados: Auditado, Observado y Rechazado. */
export const ID_ESTADO_APROBAR = 4;
export const ID_ESTADO_OBSERVAR = 5;
export const ID_ESTADO_RECHAZAR = 6;
export const LARGO_MAXIMO_MOTIVO = 200;

export interface PreparacionDecision {
  pendiente: DecisionPendiente | null;
  error: string;
}

/** Arma la decisión que se envía a usp_go_updateRecetaCabecera. */
export function prepararDecision(
  decision: DecisionAuditoria,
  observacion: string,
): PreparacionDecision {
  const texto = observacion.trim();
  if (decision !== 'aprobar') {
    if (!texto) return { pendiente: null, error: 'Escriba el motivo.' };
    if ([...texto].length > LARGO_MAXIMO_MOTIVO) {
      return { pendiente: null, error: 'El motivo no puede superar 200 caracteres.' };
    }
  }

  if (decision === 'aprobar') {
    return {
      pendiente: {
        decision,
        observacion: '',
        idEstado: ID_ESTADO_APROBAR,
        motivoObservacion: '',
        motivoRechazo: '',
      },
      error: '',
    };
  }

  if (decision === 'observar') {
    return {
      pendiente: {
        decision,
        observacion: texto,
        idEstado: ID_ESTADO_OBSERVAR,
        motivoObservacion: texto,
        motivoRechazo: '',
      },
      error: '',
    };
  }

  return {
    pendiente: {
      decision,
      observacion: texto,
      idEstado: ID_ESTADO_RECHAZAR,
      motivoObservacion: '',
      motivoRechazo: texto,
    },
    error: '',
  };
}

export function decisionDeEstado(estado: string): DecisionAuditoria | null {
  const limpio = estado.trim().toLowerCase();
  if (limpio.startsWith('aprob') || limpio.startsWith('audit')) return 'aprobar';
  if (limpio.startsWith('observ')) return 'observar';
  if (limpio.startsWith('rechaz')) return 'rechazar';
  return null;
}

export function recetaYaRegistrada(estado: string): boolean {
  return decisionDeEstado(estado) !== null;
}
