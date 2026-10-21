import { PA_VALIDACION_CONFIG } from './primera-atencion.validacion.config';
import type {
  ConfigValidacionPa,
  ContextoValidacionPa,
  DiagnosticoValidacionPa,
  ErrorValidacionPa,
  MedicamentoValidacionPa,
  PasoAtencionPa,
  ProductoValidacionPa,
  ReglaTextoPa,
} from './primera-atencion.validacion.tipos';
import type { ErrorCampoUi } from '../../../../compartido/validacion/error-campo.tipos';
import { primerMensajeError } from '../../../../compartido/validacion/error-campo.util';

function trim(v: unknown): string {
  return String(v ?? '').trim();
}

function pushTexto(
  errores: ErrorCampoUi[],
  campoId: string,
  etiqueta: string,
  valor: unknown,
  regla: ReglaTextoPa,
  ancla?: string,
): void {
  const t = trim(valor);
  if (regla.enabled && t.length < regla.min) {
    errores.push({
      campoId,
      etiqueta,
      ancla,
      mensaje: `Ingrese al menos ${regla.min} caracter(es).`,
    });
    return;
  }
  if (t.length > regla.max) {
    errores.push({
      campoId,
      etiqueta,
      ancla,
      mensaje: `No debe superar ${regla.max} caracteres.`,
    });
  }
}

function selectVacio(v: number | ''): boolean {
  return v === '' || v == null || Number(v) <= 0;
}

function esDxVacio(d: DiagnosticoValidacionPa): boolean {
  return !trim(d.nombre) && !trim(d.cie10) && (d.idDiagnostico === '' || d.idDiagnostico == null);
}

function esDxCompleto(d: DiagnosticoValidacionPa): boolean {
  return (
    typeof d.idDiagnostico === 'number' &&
    d.idDiagnostico > 0 &&
    trim(d.nombre).length >= 2 &&
    trim(d.cie10).length >= 2
  );
}

function esProductoVacio(p: ProductoValidacionPa): boolean {
  return !trim(p.nombre) && (p.idProducto == null || p.idProducto <= 0);
}

function esProductoCompleto(p: ProductoValidacionPa): boolean {
  return trim(p.nombre).length >= 2 && p.idProducto != null && p.idProducto > 0;
}

function esMedVacio(m: MedicamentoValidacionPa): boolean {
  return (
    !trim(m.nombre) &&
    (m.idProducto === '' || m.idProducto == null) &&
    !trim(m.cantidad) &&
    !trim(m.dosis) &&
    (m.idDosis === '' || m.idDosis == null) &&
    !trim(m.unidad) &&
    (m.idUNIDDosis === '' || m.idUNIDDosis == null) &&
    !trim(m.frecuencia) &&
    (m.idFrecuencia === '' || m.idFrecuencia == null) &&
    (m.idViaAdministracion === '' || m.idViaAdministracion == null) &&
    !trim(m.duracion)
  );
}

function esMedCompleto(m: MedicamentoValidacionPa): boolean {
  const cant = Number(m.cantidad);
  const dur = Number(m.duracion);
  return (
    typeof m.idProducto === 'number' &&
    m.idProducto > 0 &&
    trim(m.nombre).length >= 2 &&
    Number.isFinite(cant) &&
    cant > 0 &&
    (typeof m.idDosis === 'number' || trim(m.dosis).length > 0) &&
    (typeof m.idUNIDDosis === 'number' || trim(m.unidad).length > 0) &&
    (typeof m.idFrecuencia === 'number' || trim(m.frecuencia).length > 0) &&
    typeof m.idViaAdministracion === 'number' &&
    m.idViaAdministracion > 0 &&
    Number.isFinite(dur) &&
    dur >= 1
  );
}

function contarCompletosDx(lista: DiagnosticoValidacionPa[]): number {
  return lista.filter((d) => !esDxVacio(d) && esDxCompleto(d)).length;
}

function erroresListaDx(
  lista: DiagnosticoValidacionPa[],
  cfg: ConfigValidacionPa,
): ErrorCampoUi[] {
  const errores: ErrorCampoUi[] = [];
  for (let i = 0; i < lista.length; i++) {
    const d = lista[i];
    if (esDxVacio(d)) continue;
    if (!esDxCompleto(d)) {
      errores.push({
        campoId: 'diagnosticos',
        etiqueta: 'Diagnósticos',
        ancla: 'dx-pa-buscar',
        mensaje: `Fila #${i + 1}: seleccione un CIE-10 del catálogo (código y descripción).`,
      });
    }
  }
  const regla = cfg.cantidades.diagnosticos;
  if (regla.enabled && contarCompletosDx(lista) < regla.min) {
    errores.push({
      campoId: 'diagnosticos',
      etiqueta: 'Diagnósticos',
      ancla: 'dx-pa-buscar',
      mensaje: `Debe registrar al menos ${regla.min} diagnóstico(s) CIE-10.`,
    });
  }
  return errores;
}

function erroresListaProducto(
  lista: ProductoValidacionPa[],
  campoId: string,
  etiqueta: string,
  regla: ConfigValidacionPa['cantidades']['examenes'],
): ErrorCampoUi[] {
  const errores: ErrorCampoUi[] = [];
  let completos = 0;
  for (let i = 0; i < lista.length; i++) {
    const p = lista[i];
    if (esProductoVacio(p)) continue;
    if (!esProductoCompleto(p)) {
      errores.push({
        campoId,
        etiqueta,
        mensaje: `Fila #${i + 1}: seleccione un ítem del catálogo o elimine la fila.`,
      });
    } else {
      completos += 1;
    }
  }
  if (regla.enabled && completos < regla.min) {
    errores.push({
      campoId,
      etiqueta,
      mensaje: `Debe registrar al menos ${regla.min} ${etiqueta.toLowerCase()}.`,
    });
  }
  return errores;
}

function erroresListaMedicamentos(
  lista: MedicamentoValidacionPa[],
  cfg: ConfigValidacionPa,
): ErrorCampoUi[] {
  const errores: ErrorCampoUi[] = [];
  let completos = 0;
  for (let i = 0; i < lista.length; i++) {
    const m = lista[i];
    if (esMedVacio(m)) continue;
    if (!esMedCompleto(m)) {
      const nombre = trim(m.nombre) || `Medicamento #${i + 1}`;
      errores.push({
        campoId: 'medicamentos',
        etiqueta: 'Medicamentos',
        mensaje: `Fila #${i + 1} ("${nombre}"): complete medicamento, cantidad, dosis, unidad, frecuencia, vía y duración.`,
      });
    } else {
      completos += 1;
    }
  }
  const regla = cfg.cantidades.medicamentos;
  if (regla.enabled && completos < regla.min) {
    errores.push({
      campoId: 'medicamentos',
      etiqueta: 'Medicamentos',
      mensaje: `Debe registrar al menos ${regla.min} medicamento(s).`,
    });
  }
  return errores;
}

export function erroresCamposAnamnesis(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  const errores: ErrorCampoUi[] = [];
  pushTexto(
    errores,
    'tiempoEnfermedad',
    'Tiempo de enfermedad',
    ctx.form.tiempoEnfermedad,
    cfg.campos.tiempoEnfermedad,
    'tiempo-enf',
  );
  pushTexto(
    errores,
    'signosSintomas',
    'Signos y síntomas',
    ctx.form.signosSintomas,
    cfg.campos.signosSintomas,
    'signos',
  );
  pushTexto(
    errores,
    'relatoCronologico',
    'Relato cronológico',
    ctx.form.relatoCronologico,
    cfg.campos.relatoCronologico,
    'relato',
  );
  pushTexto(
    errores,
    'antecedentes',
    'Antecedentes',
    ctx.form.antecedentes,
    cfg.campos.antecedentes,
    'antec',
  );
  return errores;
}

export function erroresCamposExamen(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  const errores: ErrorCampoUi[] = [];
  if (cfg.selects.estadoGeneral.enabled && selectVacio(ctx.form.estadoGeneral)) {
    errores.push({
      campoId: 'estadoGeneral',
      etiqueta: 'Estado general',
      ancla: 'est-gen',
      mensaje: 'Seleccione el estado general del paciente.',
    });
  }
  if (cfg.selects.hidratacion.enabled && selectVacio(ctx.form.hidratacion)) {
    errores.push({
      campoId: 'hidratacion',
      etiqueta: 'Hidratación',
      ancla: 'hidrat',
      mensaje: 'Seleccione el estado de hidratación.',
    });
  }
  if (cfg.selects.conciencia.enabled && selectVacio(ctx.form.conciencia)) {
    errores.push({
      campoId: 'conciencia',
      etiqueta: 'Conciencia',
      ancla: 'concien',
      mensaje: 'Seleccione el nivel de conciencia.',
    });
  }
  pushTexto(
    errores,
    'pielAnexos',
    'Piel y anexos',
    ctx.form.pielAnexos,
    cfg.campos.pielAnexos,
    'piel',
  );
  pushTexto(
    errores,
    'examenRegional',
    'Examen clínico regional',
    ctx.form.examenRegional,
    cfg.campos.examenRegional,
    'ex-reg',
  );
  return errores;
}

export function erroresCamposDiagnosticos(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  return erroresListaDx(ctx.diagnosticos, cfg);
}

export function erroresCamposExamenes(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  return erroresListaProducto(
    ctx.examenes,
    'examenes',
    'Exámenes',
    cfg.cantidades.examenes,
  );
}

export function erroresCamposInterconsulta(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  const errores: ErrorCampoUi[] = [];
  pushTexto(
    errores,
    'referencia',
    'Referencia oportuna',
    ctx.form.referencia,
    cfg.campos.referencia,
  );
  return errores;
}

export function erroresCamposProcedimientos(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  return erroresListaProducto(
    ctx.procedimientos,
    'procedimientos',
    'Procedimientos',
    cfg.cantidades.procedimientos,
  );
}

export function erroresCamposMedicamentos(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  const errores = erroresListaMedicamentos(ctx.medicamentos, cfg);
  pushTexto(
    errores,
    'evolucion',
    'Evolución',
    ctx.form.evolucion,
    cfg.campos.evolucion,
    'evol',
  );
  pushTexto(
    errores,
    'evaluacionEnfermeria',
    'Evaluación de enfermería',
    ctx.form.evaluacionEnfermeria,
    cfg.campos.evaluacionEnfermeria,
    'enf',
  );
  return errores;
}

export function erroresCamposEgreso(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  const errores: ErrorCampoUi[] = [];
  if (cfg.selects.condicionEgreso.enabled && selectVacio(ctx.form.condicionEgreso)) {
    errores.push({
      campoId: 'condicionEgreso',
      etiqueta: 'Condición de egreso',
      mensaje: 'Seleccione la condición de egreso.',
    });
  }
  if (cfg.egreso.fechaHoraObligatoria) {
    if (!trim(ctx.form.fechaEgreso)) {
      errores.push({
        campoId: 'fechaEgreso',
        etiqueta: 'Fecha de egreso',
        mensaje: 'Ingrese la fecha de egreso.',
      });
    }
    if (!trim(ctx.form.horaEgreso)) {
      errores.push({
        campoId: 'horaEgreso',
        etiqueta: 'Hora de egreso',
        mensaje: 'Ingrese la hora de egreso.',
      });
    }
  }
  return errores;
}

/** Todos los errores de campo del paso (para resumen + inline). */
export function obtenerErroresCamposPasoPa(
  paso: PasoAtencionPa,
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorCampoUi[] {
  switch (paso) {
    case 'anamnesis':
      return erroresCamposAnamnesis(ctx, cfg);
    case 'examen':
      return erroresCamposExamen(ctx, cfg);
    case 'diagnosticos':
      return erroresCamposDiagnosticos(ctx, cfg);
    case 'examenes':
      return erroresCamposExamenes(ctx, cfg);
    case 'interconsulta':
      return erroresCamposInterconsulta(ctx, cfg);
    case 'procedimientos':
      return erroresCamposProcedimientos(ctx, cfg);
    case 'medicamentos':
      return erroresCamposMedicamentos(ctx, cfg);
    case 'egreso':
      return erroresCamposEgreso(ctx, cfg);
    default:
      return [];
  }
}

/** Compat: primer mensaje del paso (gate / APIs string). */
export function validarPasoAnamnesis(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(erroresCamposAnamnesis(ctx, cfg));
}

export function validarPasoExamen(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(erroresCamposExamen(ctx, cfg));
}

export function validarPasoDiagnosticos(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(erroresCamposDiagnosticos(ctx, cfg));
}

export function validarPasoExamenes(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(erroresCamposExamenes(ctx, cfg));
}

export function validarPasoInterconsulta(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(erroresCamposInterconsulta(ctx, cfg));
}

export function validarPasoProcedimientos(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(erroresCamposProcedimientos(ctx, cfg));
}

/** @deprecated Usar validarPasoExamenes / Interconsulta / Procedimientos. */
export function validarPasoPlan(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return (
    validarPasoExamenes(ctx, cfg) ||
    validarPasoInterconsulta(ctx, cfg) ||
    validarPasoProcedimientos(ctx, cfg)
  );
}

export function validarPasoMedicamentos(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(erroresCamposMedicamentos(ctx, cfg));
}

export function validarPasoEgreso(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(erroresCamposEgreso(ctx, cfg));
}

export function validarPasoActualPa(
  paso: PasoAtencionPa,
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): string | null {
  return primerMensajeError(obtenerErroresCamposPasoPa(paso, ctx, cfg));
}

type PasoValidablePa = Exclude<PasoAtencionPa, 'cierre'>;

const ORDEN_ERRORES: PasoValidablePa[] = [
  'anamnesis',
  'examen',
  'diagnosticos',
  'examenes',
  'interconsulta',
  'procedimientos',
  'medicamentos',
  'egreso',
];

const ETIQUETA_PASO: Record<PasoValidablePa, string> = {
  anamnesis: 'Anamnesis',
  examen: 'Examen clínico',
  diagnosticos: 'Diagnósticos',
  examenes: 'Exámenes',
  interconsulta: 'Interconsulta',
  procedimientos: 'Procedimientos',
  medicamentos: 'Medicamentos',
  egreso: 'Condición de egreso',
};

export function obtenerErroresValidacionPa(
  ctx: ContextoValidacionPa,
  cfg: ConfigValidacionPa = PA_VALIDACION_CONFIG,
): ErrorValidacionPa[] {
  const errores: ErrorValidacionPa[] = [];
  for (const paso of ORDEN_ERRORES) {
    const campos = obtenerErroresCamposPasoPa(paso, ctx, cfg);
    for (const c of campos) {
      const detalle = c.etiqueta ? `${c.etiqueta}: ${c.mensaje}` : c.mensaje;
      errores.push({
        paso,
        mensaje: `${ETIQUETA_PASO[paso]}: ${detalle}`,
      });
    }
  }
  return errores;
}

/** Helpers reutilizados por el resumen N/N. */
export const PaValidacionHelpers = {
  contarCompletosDx,
  esDxCompleto,
  esProductoCompleto,
  esProductoVacio,
  esMedCompleto,
  esMedVacio,
  trim,
  selectVacio,
};
