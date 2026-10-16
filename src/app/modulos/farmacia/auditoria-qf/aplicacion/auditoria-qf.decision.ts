import type { DecisionAuditoria, DecisionPendiente } from './auditoria-qf.tipos';

/** Arma la decisión en un solo lugar. El guardado se conecta aquí cuando exista. */
export function prepararDecision(
  decision: DecisionAuditoria,
  observacion: string,
): DecisionPendiente {
  return {
    decision,
    observacion: observacion.trim(),
  };
}
