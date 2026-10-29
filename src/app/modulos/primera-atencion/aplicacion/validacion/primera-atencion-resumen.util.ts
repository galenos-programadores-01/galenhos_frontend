import { PA_VALIDACION_CONFIG } from './primera-atencion.validacion.config';
import type {
  ConfigValidacionPa,
  ContextoValidacionPa,
  ItemResumenVerificacionPa,
} from './primera-atencion.validacion.tipos';
import {
  PaValidacionHelpers,
  validarPasoAnamnesis,
  validarPasoDiagnosticos,
  validarPasoEgreso,
  validarPasoExamen,
  validarPasoExamenes,
  validarPasoInterconsulta,
  validarPasoMedicamentos,
  validarPasoProcedimientos,
} from './primera-atencion.validador';

const { trim, selectVacio } = PaValidacionHelpers;

function contarProductos(lista: ContextoValidacionPa['examenes']): number {
  return lista.filter(
    (p) => !PaValidacionHelpers.esProductoVacio(p) && PaValidacionHelpers.esProductoCompleto(p),
  ).length;
}

function contarMedicamentos(lista: ContextoValidacionPa['medicamentos']): number {
  return lista.filter(
    (m) => !PaValidacionHelpers.esMedVacio(m) && PaValidacionHelpers.esMedCompleto(m),
  ).length;
}

/**
 * Checklist N/N del cierre: un ítem por paso del wizard (sin 'cierre').
 * Usa la misma config que los gates duros.
 */
export function calcularResumenVerificacionPa(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ItemResumenVerificacionPa[] {
  const nDx = PaValidacionHelpers.contarCompletosDx(ctx.diagnosticos);
  const nEx = contarProductos(ctx.examenes);
  const nProc = contarProductos(ctx.procedimientos);
  const nMed = contarMedicamentos(ctx.medicamentos);

  const signos = trim(ctx.form.signosSintomas);
  const relato = trim(ctx.form.relatoCronologico);

  return [
    {
      pasoId: 'anamnesis',
      numero: '01',
      titulo: 'Anamnesis',
      completado: validarPasoAnamnesis(ctx, cfg) === null,
      detalle:
        signos || relato
          ? `Tiempo: ${trim(ctx.form.tiempoEnfermedad) || '—'} · Relato/signos registrados`
          : 'Sin anamnesis completa',
    },
    {
      pasoId: 'examen',
      numero: '02',
      titulo: 'Examen clínico',
      completado: validarPasoExamen(ctx, cfg) === null,
      detalle: [
        selectVacio(ctx.form.estadoGeneral) ? null : 'Estado general',
        selectVacio(ctx.form.hidratacion) ? null : 'Hidratación',
        selectVacio(ctx.form.conciencia) ? null : 'Conciencia',
      ]
        .filter(Boolean)
        .join(' · ') || 'Selecciones clínicas pendientes',
    },
    {
      pasoId: 'diagnosticos',
      numero: '03',
      titulo: 'Diagnósticos',
      completado: validarPasoDiagnosticos(ctx, cfg) === null,
      detalle:
        nDx > 0
          ? `${nDx} diagnóstico(s) CIE-10`
          : 'Sin diagnósticos registrados',
    },
    {
      pasoId: 'examenes',
      numero: '04',
      titulo: 'Exámenes',
      completado: validarPasoExamenes(ctx, cfg) === null,
      detalle: `${nEx} examen(es)`,
    },
    {
      pasoId: 'interconsulta',
      numero: '05',
      titulo: 'Interconsulta',
      completado: validarPasoInterconsulta(ctx, cfg) === null,
      detalle: trim(ctx.form.referencia)
        ? 'Referencia registrada'
        : 'Sin referencia / interconsulta',
    },
    {
      pasoId: 'procedimientos',
      numero: '06',
      titulo: 'Procedimientos',
      completado: validarPasoProcedimientos(ctx, cfg) === null,
      detalle: `${nProc} procedimiento(s)`,
    },
    {
      pasoId: 'medicamentos',
      numero: '07',
      titulo: 'Medicamentos',
      completado: validarPasoMedicamentos(ctx, cfg) === null,
      detalle: `${nMed} medicamento(s) · Evolución: ${
        trim(ctx.form.evolucion).length >= (cfg.campos.evolucion.enabled ? cfg.campos.evolucion.min : 1)
          ? 'sí'
          : 'pendiente'
      }`,
    },
    {
      pasoId: 'egreso',
      numero: '08',
      titulo: 'Condición de egreso',
      completado: validarPasoEgreso(ctx, cfg) === null,
      detalle: selectVacio(ctx.form.condicionEgreso)
        ? 'Sin condición seleccionada'
        : 'Condición de egreso seleccionada',
    },
  ];
}
