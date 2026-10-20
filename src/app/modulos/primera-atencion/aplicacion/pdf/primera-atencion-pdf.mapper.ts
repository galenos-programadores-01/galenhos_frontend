import type {
  ContextoMapperPdfPa,
  PrimeraAtencionPdfData,
} from './primera-atencion-pdf.tipos';

/** Traduce el contexto de UI → DTO estable para el motor PDF (capa mapper). */
export function mapearPrimeraAtencionPdfData(
  ctx: ContextoMapperPdfPa,
): PrimeraAtencionPdfData {
  return {
    paciente: ctx.paciente,
    cabecera: ctx.cabecera,
    signosVitales: ctx.signosVitales,
    anamnesis: {
      tipo: ctx.form.anamnesisTipo === 'indirecta' ? 'Indirecta' : 'Directa',
      tiempoEnfermedad: ctx.form.tiempoEnfermedad,
      signosSintomas: ctx.form.signosSintomas,
      relatoCronologico: ctx.form.relatoCronologico,
      antecedentes: ctx.form.antecedentes,
    },
    examen: {
      estadoGeneral: ctx.etiquetasExamen.estadoGeneral,
      hidratacion: ctx.etiquetasExamen.hidratacion,
      conciencia: ctx.etiquetasExamen.conciencia,
      pielAnexos: ctx.form.pielAnexos,
      examenRegional: ctx.form.examenRegional,
    },
    diagnosticos: ctx.diagnosticos.filter((d) => d.cie10 || d.descripcion),
    plan: {
      examenes: ctx.examenes.filter((e) => e.nombre.trim()),
      procedimientos: ctx.procedimientos.filter((p) => p.nombre.trim()),
      interconsultas: ctx.interconsultas.filter(
        (i) => i.especialidad.trim() || i.motivo.trim(),
      ),
      referencia: ctx.form.referencia,
    },
    medicamentos: ctx.medicamentos.filter((m) => m.nombre.trim()),
    evolucion: ctx.form.evolucion,
    evaluacionEnfermeria: ctx.form.evaluacionEnfermeria,
    egreso: {
      destino: ctx.egreso.destino,
      fecha: ctx.egreso.fecha,
      hora: ctx.egreso.hora,
      registrado: ctx.egreso.registrado,
      detalle: ctx.egreso.detalle.filter((f) => f.etiqueta.trim()),
      diagnosticos: ctx.egreso.diagnosticos.filter(
        (d) => d.cie10 || d.descripcion,
      ),
    },
  };
}
