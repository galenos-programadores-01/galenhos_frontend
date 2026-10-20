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

export function decisionDeEstado(estado: string): DecisionAuditoria | null {
  const limpio = estado.trim().toLowerCase();
  if (limpio.startsWith('aprob')) return 'aprobar';
  if (limpio.startsWith('observ')) return 'observar';
  if (limpio.startsWith('rechaz')) return 'rechazar';
  return null;
}

export function recetaYaRegistrada(estado: string): boolean {
  return decisionDeEstado(estado) !== null;
}

export function etiquetaMotivo(decision: DecisionAuditoria | null): string {
  if (decision === 'rechazar') return 'Motivo de rechazado';
  return 'Motivo de observado';
}
