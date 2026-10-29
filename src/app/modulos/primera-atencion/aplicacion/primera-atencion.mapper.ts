/** Formulario editable de la pantalla atención. */
export type FormPrimeraAtencion = {
  anamnesisTipo: 'directa' | 'indirecta';
  tiempoEnfermedad: string;
  signosSintomas: string;
  relatoCronologico: string;
  antecedentes: string;
  estadoGeneral: number | '';
  hidratacion: number | '';
  conciencia: number | '';
  pielAnexos: string;
  examenRegional: string;
  examenesImagenes: string;
  interconsulta: number | '';
  procedimientos: string;
  referencia: string;
  evolucion: string;
  evaluacionEnfermeria: string;
  /** IdParametro (Cat_ParametroClinico IdGrupo=4) → Tab_PrimeraAtencion.IdCondicionEgreso */
  condicionEgreso: number | '';
  fechaEgreso: string;
  horaEgreso: string;
};

/** Condición de egreso: Cat_ParametroClinico IdGrupo = 4. */
export type CondicionEgresoOpcion = {
  id: number;
  codigo: string;
  descripcion: string;
};

/** Fallback / mapa Id → Codigo (el listado UI puede venir del SP). */
export const CONDICIONES_EGRESO: CondicionEgresoOpcion[] = [
  { id: 15, codigo: 'ALT', descripcion: 'Alta' },
  { id: 16, codigo: 'TRA', descripcion: 'Transferencia' },
  { id: 17, codigo: 'FAL', descripcion: 'Fallecido' },
  { id: 18, codigo: 'OBS', descripcion: 'Observación' },
  { id: 19, codigo: 'REF', descripcion: 'Referencia' },
  { id: 20, codigo: 'RV', descripcion: 'Retiro voluntario' },
  { id: 21, codigo: 'SOP', descripcion: 'SOP' },
  { id: 22, codigo: 'FUG', descripcion: 'Fuga' },
  { id: 23, codigo: 'UCI', descripcion: 'UCI' },
  { id: 24, codigo: 'HOS', descripcion: 'Hospitalización' },
  { id: 25, codigo: 'OTR', descripcion: 'Otros' },
];

export function codigoCondicionEgreso(
  id: number | '',
  opciones: CondicionEgresoOpcion[] = CONDICIONES_EGRESO,
): string | null {
  if (id === '') return null;
  return opciones.find((o) => o.id === id)?.codigo || null;
}

export interface PrimeraAtencionGuardarPayload {
  fechaAtencion?: string;
  tipoAnamnesis?: 'D' | 'I';
  tiempoEnfermedad?: number | null;
  idTiempoEnfermedad?: number | null;
  signosSintomas?: string | null;
  relatoCronologico?: string | null;
  antecedentes?: string | null;
  idEstadoGeneral?: number | null;
  idEstadoHidratacion?: number | null;
  idNivelConciencia?: number | null;
  pielAnexos?: string | null;
  examenClinicoRegional?: string | null;
  referenciaOportuna?: string | null;
  evolucion?: string | null;
  evaluacionEnfermeriaObstetricia?: string | null;
  idCondicionEgreso?: number | null;
  codCondicionEgreso?: string | null;
  fechaEgreso?: string | null;
}

export interface PrimeraAtencionDetalle extends Record<string, unknown> {}

export interface PrimeraAtencionIniciarResponse {
  idPrimeraAtencion: number;
  mensaje: string;
}

/** Fila de diagnóstico en UI / borrador local (P=presuntivo, D=definitivo). */
export type DiagnosticoBorradorPA = {
  /** PK en AtencionesDiagnosticos; null/undefined = aún no persistido. */
  idAtencionDiagnostico?: number | null;
  idDiagnostico: number | '';
  nombre: string;
  cie10: string;
  /** Letra UI P|D|R (derivada del catálogo / idSubclasificacionDx). */
  tipo: 'P' | 'D' | 'R';
  /** Id del SP usp_go_SubclasificacionDiagnosticos_Select (clasif. 9 en PA). */
  idSubclasificacionDx: number;
};

/** Opción de tipo DX desde catálogo. */
export type SubclasificacionDxOpcion = {
  id: number;
  descripcionCorta: string;
  descripcionLarga: string;
  /** Letra normalizada P|D|R */
  letra: 'P' | 'D' | 'R';
};

/** Respuesta de GET .../diagnosticos. */
export interface DiagnosticoAtencionApi {
  idAtencionDiagnostico: number;
  idDiagnostico: number;
  idPrimeraAtencion: number;
  descripcion: string;
  codigoCIE10: string;
  tipo: 'P' | 'D' | 'R' | string;
  idSubclasificacionDx?: number;
  numOrdenCorrelativo?: number;
}

/** Body hacia POST .../diagnosticos. */
export interface DiagnosticoRegistrarItem {
  idDiagnostico: number;
  idSubclasificacionDx: number;
  /** Legado opcional. */
  tipo?: 'P' | 'D' | 'R';
}

export interface PrimeraAtencionRegistrarDiagnosticosBody {
  idPaciente: number;
  /**
   * PA (9) / IC (7): obligatorio.
   * Egreso (3/4): enviar null — el backend fuerza NULL en el SP.
   */
  idPrimeraAtencion?: number | null;
  /** Obligatorio: bandeja IdEpisodio (no enviar 0). */
  idEpisodio: number;
  /** 9=PA, 7=IC, 3=egreso, 4=egreso fallecido. */
  idClasificacionDx: number;
  diagnosticos: DiagnosticoRegistrarItem[];
}

/** POST .../egreso/alta-domicilio — usp_go_RegistrarAltaHospitalaria */
export interface AltaDomicilioRegistrarBody {
  idEpisodio: number;
  idMedicoEgreso: number;
  fechaEgreso: string;
  idTipoAlta: number;
  idCondicionAlta: number;
  idPronostico?: number | null;
  recomendacion?: string;
  idServicioEgreso: number;
  idDestinoAtencion?: number | null;
}

/** POST .../egreso/alta-hospitalizacion — mismo SP; tipo/condición NULL */
export interface AltaHospitalizacionRegistrarBody {
  idEpisodio: number;
  idMedicoEgreso: number;
  fechaEgreso: string;
  /** Servicio que recibe (IdServicioEgreso). */
  idServicioEgreso: number;
  /** Id catálogo tarjeta HOS (IdDestinoAtencion). */
  idDestinoAtencion: number;
  motivoTraslado?: string;
}

/** POST .../egreso/alta-fuga — FechaEgreso=fuga; FechaFuga=último contacto */
export interface AltaFugaRegistrarBody {
  idEpisodio: number;
  idMedicoEgreso: number;
  fechaEgreso: string;
  fechaFuga?: string;
  idServicioEgreso: number;
  idDestinoAtencion: number;
  reportaFuga?: string;
  /** 1=seguridad, 2=familiar, 3=incidente */
  idNotificacionFuga?: number | null;
  observaciones?: string;
}

/** POST .../egreso/alta-fallecido — familiar → observaciones; DX clasif.4 */
export interface AltaFallecidoRegistrarBody {
  idEpisodio: number;
  idMedicoEgreso: number;
  fechaEgreso: string;
  idServicioEgreso: number;
  idDestinoAtencion: number;
  /** Destino cadáver (grupo 11) → IdDestinoServicio */
  idDestinoServicio?: number | null;
  idTipoCertificado?: number | null;
  /** N° certificado → ActDefuncion */
  actDefuncion?: string;
  idtiempoEstanciaDeseso?: number | null;
  requiereAutopsia?: boolean | null;
  /** Familiar informado → Observaciones */
  observaciones?: string;
}

export interface AltaDomicilioRegistrarResponse {
  resultado: number;
  mensaje: string;
}

export type AltaHospitalizacionRegistrarResponse = AltaDomicilioRegistrarResponse;
export type AltaFugaRegistrarResponse = AltaDomicilioRegistrarResponse;
export type AltaFallecidoRegistrarResponse = AltaDomicilioRegistrarResponse;

export interface DiagnosticoRegistrarResultado {
  idDiagnostico: number;
  idAtencionDiagnostico: number;
  subclasificacionAnterior: string;
}

export interface PrimeraAtencionRegistrarDiagnosticosResponse {
  resultados: DiagnosticoRegistrarResultado[];
  mensaje: string;
}

/** POST .../interconsultas — solicitud PA (cabecera + DX). */
export interface InterconsultaRegistrarBody {
  idEpisodio: number;
  idPrimeraAtencion: number;
  idServicio: number;
  idEspecialidad: number;
  idPrioridad: number;
  idMotivoParametro: number;
  /** Indice 0..2 del catalogo IdGrupo=6 ordenado por codigo (bits del SP). */
  motivoOrden: number;
  motivoClinico: string;
  idEmpleado: number;
  diagnosticos: {
    idDiagnostico: number;
    idSubclasificacionDx: number;
  }[];
}

export interface InterconsultaRegistrarResponse {
  idInterconsulta: number;
  mensaje: string;
}

/** GET .../interconsultas — usp_go_ListarInterconsultasPorAtencion. */
export interface InterconsultaListadoApi {
  idInterconsulta: number;
  idAtencionOrigen: number;
  idEspecialidad: number;
  idMedicoDestino: number;
  motivo: string;
  fechaSolicitud: string;
  estado: string;
  especialidad: string;
  resumenHC: string;
}

/** Tipos temporales Tab_PA_PlanTrabajoItem. */
export type PlanTrabajoTipo = 'EXA' | 'INT' | 'PRO' | 'MED';

export interface PlanTrabajoItemApi {
  idPlanTrabajoItem: number;
  idAtencion: number;
  idPrimeraAtencion: number;
  tipo: PlanTrabajoTipo | string;
  idProducto?: number | null;
  idEspecialidad?: number | null;
  codigo: string;
  nombre: string;
  numOrden: number;
}

export interface PlanTrabajoItemRegistrarBody {
  idPrimeraAtencion: number;
  tipo: PlanTrabajoTipo;
  idProducto?: number | null;
  idEspecialidad?: number | null;
  codigo?: string;
  nombre?: string;
}

export interface PlanTrabajoItemRegistrarResponse {
  idPlanTrabajoItem: number;
  mensaje: string;
}

/** Medicamento persistido (RecetaCabecera + RecetaDetalle). */
export interface MedicamentoAtencionApi {
  idReceta: number;
  idPuntoCarga: number;
  idCuentaAtencion: number;
  idServicioReceta: number;
  idPrimeraAtencion: number;
  idProducto: number;
  cantidad: number;
  precio: number;
  idDosis?: number | null;
  idUNIDDosis?: number | null;
  idFrecuencia?: number | null;
  idViaAdministracion?: number | null;
  duracion?: number | null;
  codigo: string;
  nombre: string;
  idDiagnostico?: number | null;
  codigoDiagnostico?: string | null;
}

export interface MedicamentoRegistrarBody {
  idPrimeraAtencion: number;
  idCuentaAtencion: number;
  idPuntoCarga: number;
  idServicioReceta: number;
  idPaciente: number;
  idUsuarioAuditoria?: number;
  idProducto: number;
  cantidad: number;
  /** precioUnitario del catálogo → RecetaDetalle.Precio; Total = cantidad * precio */
  precio: number;
  duracion: number;
  idDosis?: number | null;
  idUNIDDosis?: number | null;
  idFrecuencia?: number | null;
  idViaAdministracion?: number | null;
  /** → RecetaDetalle.IdDiagnostico */
  idDiagnostico: number;
  /** → RecetaDetalle.CodigoDiagnostico (CIE-10) */
  codigoDiagnostico: string;
}

export interface MedicamentoRegistrarResponse {
  idReceta: number;
  idProducto: number;
  cantidad?: number;
  precio?: number;
  total?: number;
  idDiagnostico?: number;
  codigoDiagnostico?: string;
  mensaje: string;
}

/** Examen persistido (RecetaCabecera + RecetaDetalle; IdPuntoCarga del catálogo). */
export interface ExamenAtencionApi {
  idReceta: number;
  idPuntoCarga: number;
  puntoCarga?: string | null;
  idCuentaAtencion: number;
  idServicioReceta: number;
  idPrimeraAtencion: number;
  idProducto: number;
  cantidad: number;
  precio: number;
  total: number;
  codigo: string;
  nombre: string;
  idDiagnostico?: number | null;
  codigoDiagnostico?: string | null;
}

export interface ExamenRegistrarBody {
  idPrimeraAtencion: number;
  idCuentaAtencion: number;
  idPuntoCarga: number;
  idServicioReceta: number;
  idPaciente: number;
  idUsuarioAuditoria?: number;
  idProducto: number;
  precio: number;
  /** → RecetaDetalle.IdDiagnostico */
  idDiagnostico: number;
  /** → RecetaDetalle.CodigoDiagnostico (CIE-10) */
  codigoDiagnostico: string;
}

export interface ExamenRegistrarResponse {
  idReceta: number;
  idProducto: number;
  cantidad: number;
  precio: number;
  total: number;
  idDiagnostico?: number;
  codigoDiagnostico?: string;
  mensaje: string;
}

/** Procedimiento persistido (RecetaCabecera IdPuntoCarga=26 + RecetaDetalle). */
export type ProcedimientoAtencionApi = ExamenAtencionApi;

export interface ProcedimientoRegistrarBody {
  idPrimeraAtencion: number;
  idCuentaAtencion: number;
  idServicioReceta: number;
  idPaciente: number;
  idUsuarioAuditoria?: number;
  idProducto: number;
  precio: number;
  idDiagnostico: number;
  codigoDiagnostico: string;
}

export type ProcedimientoRegistrarResponse = ExamenRegistrarResponse & {
  idPuntoCarga?: number;
};

export interface SessionBorradorPA {
  idAtencion: number;
  idPrimeraAtencion: number | null;
  form: FormPrimeraAtencion;
  fechaHoraAtencion: string | null;
  diagnosticos: DiagnosticoBorradorPA[];
  guardadoEn: string;
}

/** Parámetros del SP usp_go_SubclasificacionDiagnosticos_Select (no son Ids de fila). */
export const ID_CLASIFICACION_DX_PA = 9;
export const ID_CLASIFICACION_DX_INTERC = 7;
/** Tipos DX del egreso no fallecido (misma SP, otra clasificación). */
export const ID_CLASIFICACION_DX_EGRESO = 3;
/** Tipos DX del egreso fallecido. */
export const ID_CLASIFICACION_DX_EGRESO_FALLECIDO = 4;

/** Extrae letra de DescripcionLarga ("P = Presuntivo", "PP = …", "R = …"). */
export function letraDesdeDescripcionLarga(
  larga: string | undefined | null,
): 'P' | 'D' | 'R' | null {
  const raw = String(larga ?? '').trim().toUpperCase();
  if (!raw) return null;
  const token = raw.split('=')[0]?.trim() ?? '';
  if (token === 'D' || token === 'PD') return 'D';
  if (token === 'R' || token === 'PR') return 'R';
  if (token === 'P' || token === 'PP') return 'P';
  // Prefijos explícitos (evitar que "PR" caiga en P).
  if (token.startsWith('PD') || (token.startsWith('D') && !token.startsWith('PR'))) {
    return 'D';
  }
  if (token.startsWith('PR') || token.startsWith('R')) return 'R';
  if (token.startsWith('P')) return 'P';
  return null;
}

/**
 * Nombre visible del tipo DX desde DescripcionLarga.
 * "P = Presuntivo" → "Presuntivo"; si no hay "=", usa el texto completo.
 */
export function nombreDesdeDescripcionLarga(
  larga: string | undefined | null,
  fallback = '',
): string {
  const raw = String(larga ?? '').trim();
  if (!raw) return fallback;
  const idx = raw.indexOf('=');
  if (idx >= 0) {
    const nombre = raw.slice(idx + 1).trim();
    if (nombre) return nombre;
  }
  return raw;
}

export function mapearSubclasificacionesDx(
  items: {
    id?: number;
    descripcionCorta?: string;
    descripcionLarga?: string;
  }[],
): SubclasificacionDxOpcion[] {
  return (Array.isArray(items) ? items : [])
    .map((it) => {
      const id = Number(it.id) || 0;
      if (id <= 0) return null;
      const descripcionCorta =
        String(it.descripcionCorta ?? '').trim() || `Tipo ${id}`;
      const descripcionLarga = String(it.descripcionLarga ?? '').trim();
      const letra =
        letraDesdeDescripcionLarga(descripcionLarga) ??
        letraDesdeDescripcionLarga(descripcionCorta) ??
        'P';
      return {
        id,
        descripcionCorta,
        descripcionLarga,
        letra,
      } as SubclasificacionDxOpcion;
    })
    .filter((x): x is SubclasificacionDxOpcion => x != null);
}

/** Presuntivo del catálogo SP; 0 si aún no cargó. */
export function idSubclasificacionDefault(
  opciones: SubclasificacionDxOpcion[],
): number {
  const pres = opciones.find((o) => o.letra === 'P');
  if (pres) return pres.id;
  return opciones.length > 0 ? opciones[0].id : 0;
}

/** Texto visible del tipo (DescripcionLarga / Corta). */
function textoTipoDx(o: SubclasificacionDxOpcion): string {
  return `${nombreDesdeDescripcionLarga(o.descripcionLarga, o.descripcionCorta)} ${o.descripcionCorta} ${o.descripcionLarga}`.toLowerCase();
}

/** Egreso clasif. 3/4: Principal (no confundir con letra P = Presuntivo de PA). */
export function esTipoDxEgresoPrincipal(o: SubclasificacionDxOpcion): boolean {
  return /\bprincipal\b/.test(textoTipoDx(o));
}

/** Egreso clasif. 3/4: Secundario. */
export function esTipoDxEgresoSecundario(o: SubclasificacionDxOpcion): boolean {
  return /\bsecundari/.test(textoTipoDx(o));
}

/**
 * Default de tipo en egreso:
 * - si aún no hay Principal → preferir Principal
 * - si ya hay Principal → preferir Secundario
 */
export function idSubclasificacionDefaultEgreso(
  opciones: SubclasificacionDxOpcion[],
  yaHayPrincipal: boolean,
): number {
  if (!yaHayPrincipal) {
    const prin = opciones.find(esTipoDxEgresoPrincipal);
    if (prin) return prin.id;
  }
  const sec = opciones.find(esTipoDxEgresoSecundario);
  if (sec) return sec.id;
  const otro = opciones.find((o) => !esTipoDxEgresoPrincipal(o));
  if (otro) return otro.id;
  return opciones.length > 0 ? opciones[0].id : 0;
}

/** Resuelve letra UI solo desde el catálogo cargado (ids vienen de BD). */
export function letraDesdeOpciones(
  id: number,
  opciones: SubclasificacionDxOpcion[],
): 'P' | 'D' | 'R' {
  return opciones.find((o) => o.id === id)?.letra ?? 'P';
}

/** Busca IdSubclasificacionDx en el catálogo por letra P|D|R. */
export function idSubclasificacionPorLetra(
  tipo: 'P' | 'D' | 'R',
  opciones: SubclasificacionDxOpcion[],
): number {
  return opciones.find((o) => o.letra === tipo)?.id ?? 0;
}

/** Filas listas para Registrar (≥1 con idDiagnostico + idSubclasificacionDx del SP). */
export function diagnosticosValidosParaRegistrar(
  filas: DiagnosticoBorradorPA[],
): DiagnosticoRegistrarItem[] {
  const out: DiagnosticoRegistrarItem[] = [];
  const seen = new Set<number>();
  for (const f of filas) {
    const id =
      typeof f.idDiagnostico === 'number' ? f.idDiagnostico : Number(f.idDiagnostico);
    if (!id || Number.isNaN(id) || id <= 0) continue;
    if (seen.has(id)) continue;
    const idSub = Number(f.idSubclasificacionDx) || 0;
    if (idSub <= 0) continue;
    seen.add(id);
    out.push({
      idDiagnostico: id,
      idSubclasificacionDx: idSub,
      tipo: f.tipo === 'D' ? 'D' : f.tipo === 'R' ? 'R' : 'P',
    });
  }
  return out;
}

export function normalizarDiagnosticosBorrador(
  filas: DiagnosticoBorradorPA[] | undefined | null,
  opciones: {
    incluirFilaVaciaSiNada?: boolean;
    idSubclasificacionDefault?: number;
    catalogo?: SubclasificacionDxOpcion[];
  } = {},
): DiagnosticoBorradorPA[] {
  const { incluirFilaVaciaSiNada = false } = opciones;
  const catalogo = opciones.catalogo ?? [];
  const defSub =
    opciones.idSubclasificacionDefault && opciones.idSubclasificacionDefault > 0
      ? opciones.idSubclasificacionDefault
      : idSubclasificacionDefault(catalogo);
  const mapped = (Array.isArray(filas) ? filas : [])
    .map((f) => {
      let idSub = Number(f.idSubclasificacionDx) || 0;
      if (idSub <= 0 && catalogo.length > 0) {
        idSub = idSubclasificacionPorLetra(
          f.tipo === 'D' ? 'D' : f.tipo === 'R' ? 'R' : 'P',
          catalogo,
        );
      }
      if (idSub <= 0) idSub = defSub;
      const tipo: 'P' | 'D' | 'R' =
        f.tipo === 'D' || f.tipo === 'R'
          ? f.tipo
          : letraDesdeOpciones(idSub, catalogo);
      return {
        idAtencionDiagnostico:
          f.idAtencionDiagnostico != null && Number(f.idAtencionDiagnostico) > 0
            ? Number(f.idAtencionDiagnostico)
            : null,
        idDiagnostico:
          f.idDiagnostico === '' || f.idDiagnostico == null
            ? ('' as const)
            : Number(f.idDiagnostico) || ('' as const),
        nombre: String(f.nombre ?? ''),
        cie10: String(f.cie10 ?? ''),
        tipo,
        idSubclasificacionDx: idSub,
      };
    })
    .filter((f) => f.idDiagnostico !== '' && f.idDiagnostico > 0);

  if (mapped.length === 0 && incluirFilaVaciaSiNada) {
    return [
      {
        idAtencionDiagnostico: null,
        idDiagnostico: '',
        nombre: '',
        cie10: '',
        tipo: letraDesdeOpciones(defSub, catalogo),
        idSubclasificacionDx: defSub,
      },
    ];
  }
  return mapped;
}

/** Mapea respuesta GET BD → filas UI (sin fila vacía). */
export function diagnosticosDesdeApi(
  items: DiagnosticoAtencionApi[] | null | undefined,
  catalogo: SubclasificacionDxOpcion[] = [],
): DiagnosticoBorradorPA[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items
    .filter((it) => it && Number(it.idDiagnostico) > 0)
    .map((it) => {
      const idSub = Number(it.idSubclasificacionDx) || 0;
      const tipoApi = String(it.tipo ?? '').toUpperCase();
      let tipo: 'P' | 'D' | 'R';
      if (tipoApi === 'D' || tipoApi === 'R' || tipoApi === 'P') {
        tipo = tipoApi as 'P' | 'D' | 'R';
      } else if (idSub > 0 && catalogo.length > 0) {
        tipo = letraDesdeOpciones(idSub, catalogo);
      } else {
        tipo = 'P';
      }
      const idSubFinal =
        idSub > 0
          ? idSub
          : idSubclasificacionPorLetra(tipo, catalogo) || idSubclasificacionDefault(catalogo);
      return {
        idAtencionDiagnostico: Number(it.idAtencionDiagnostico) || null,
        idDiagnostico: Number(it.idDiagnostico),
        nombre: String(it.descripcion ?? '').trim(),
        cie10: String(it.codigoCIE10 ?? '').trim(),
        tipo,
        idSubclasificacionDx: idSubFinal,
      };
    });
}

export type PlanTrabajoFilaUI = {
  idRegistro: number | null;
  idProducto: number | null;
  nombre: string;
  codigo: string;
  /** Asociación FE al CIE (aún no viene del API). */
  idDiagnostico: number | null;
};

/** Filtra GET plan-trabajo por tipo EXA|PRO → filas UI. */
export function planTrabajoProductoDesdeApi(
  items: PlanTrabajoItemApi[] | null | undefined,
  tipo: 'EXA' | 'PRO',
): PlanTrabajoFilaUI[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items
    .filter((it) => String(it.tipo).toUpperCase() === tipo && Number(it.idProducto) > 0)
    .map((it) => ({
      idRegistro: Number(it.idPlanTrabajoItem) || null,
      idProducto: Number(it.idProducto),
      nombre: String(it.nombre ?? '').trim(),
      codigo: String(it.codigo ?? '').trim(),
      idDiagnostico: null,
    }));
}

/** Extrae la única interconsulta (INT) del listado. */
export function interconsultaDesdeApi(
  items: PlanTrabajoItemApi[] | null | undefined,
): { idRegistro: number | null; idEspecialidad: number | '' } {
  if (!Array.isArray(items)) {
    return { idRegistro: null, idEspecialidad: '' };
  }
  const row = items.find((it) => String(it.tipo).toUpperCase() === 'INT');
  if (!row || !(Number(row.idEspecialidad) > 0)) {
    return { idRegistro: null, idEspecialidad: '' };
  }
  return {
    idRegistro: Number(row.idPlanTrabajoItem) || null,
    idEspecialidad: Number(row.idEspecialidad),
  };
}

/** GET medicamentos → filas UI (sin fila vacía). */
export function medicamentosDesdeApi(
  items: MedicamentoAtencionApi[] | null | undefined,
): {
  idReceta: number | null;
  idProducto: number | '';
  nombre: string;
  cantidad: string;
  precioUnitario: number | null;
  total: number | null;
  idDosis: number | '';
  dosis: string;
  idUNIDDosis: number | '';
  unidad: string;
  idFrecuencia: number | '';
  frecuencia: string;
  idViaAdministracion: number | '';
  duracion: string;
  idDiagnostico: number | null;
}[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items
    .filter((it) => it && Number(it.idProducto) > 0 && Number(it.idReceta) > 0)
    .map((it) => {
      const precio =
        typeof it.precio === 'number' ? it.precio : Number(it.precio) || 0;
      const cantidad = Number(it.cantidad) || 0;
      return {
        idReceta: Number(it.idReceta),
        idProducto: Number(it.idProducto),
        nombre: String(it.nombre ?? '').trim(),
        cantidad: it.cantidad != null ? String(it.cantidad) : '',
        precioUnitario: Number.isFinite(precio) ? precio : null,
        total: cantidad > 0 ? cantidad * (Number.isFinite(precio) ? precio : 0) : null,
        idDosis:
          it.idDosis != null && it.idDosis > 0
            ? Number(it.idDosis)
            : ('' as const),
        dosis: '',
        idUNIDDosis:
          it.idUNIDDosis != null && it.idUNIDDosis > 0
            ? Number(it.idUNIDDosis)
            : ('' as const),
        unidad: '',
        idFrecuencia:
          it.idFrecuencia != null && it.idFrecuencia > 0
            ? Number(it.idFrecuencia)
            : ('' as const),
        frecuencia: '',
        idViaAdministracion:
          it.idViaAdministracion != null && it.idViaAdministracion > 0
            ? Number(it.idViaAdministracion)
            : ('' as const),
        duracion:
          it.duracion != null && it.duracion > 0 ? String(it.duracion) : '',
        idDiagnostico:
          it.idDiagnostico != null && Number(it.idDiagnostico) > 0
            ? Number(it.idDiagnostico)
            : null,
      };
    });
}

/** GET exámenes (RecetaDetalle) → filas UI. */
export function examenesDesdeApi(
  items: ExamenAtencionApi[] | null | undefined,
): {
  idReceta: number | null;
  idProducto: number | null;
  nombre: string;
  codigo: string;
  idPuntoCarga: number | null;
  puntoCarga: string | null;
  precioUnitario: number | null;
  total: number | null;
  idDiagnostico: number | null;
}[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items
    .filter((it) => it && Number(it.idProducto) > 0 && Number(it.idReceta) > 0)
    .map((it) => ({
      idReceta: Number(it.idReceta),
      idProducto: Number(it.idProducto),
      nombre: String(it.nombre ?? '').trim(),
      codigo: String(it.codigo ?? '').trim(),
      idPuntoCarga: Number(it.idPuntoCarga) > 0 ? Number(it.idPuntoCarga) : null,
      puntoCarga: String(it.puntoCarga ?? '').trim() || null,
      precioUnitario:
        typeof it.precio === 'number' ? it.precio : Number(it.precio) || null,
      total: typeof it.total === 'number' ? it.total : Number(it.total) || null,
      idDiagnostico:
        it.idDiagnostico != null && Number(it.idDiagnostico) > 0
          ? Number(it.idDiagnostico)
          : null,
    }));
}

/** GET procedimientos (RecetaDetalle, IdPuntoCarga=26) → filas UI. */
export function procedimientosDesdeApi(
  items: ProcedimientoAtencionApi[] | null | undefined,
): {
  idReceta: number | null;
  idProducto: number | null;
  nombre: string;
  codigo: string;
  idPuntoCarga: number | null;
  puntoCarga: string | null;
  precioUnitario: number | null;
  total: number | null;
  idDiagnostico: number | null;
}[] {
  return examenesDesdeApi(items);
}

function leerTexto(row: PrimeraAtencionDetalle, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function leerNum(row: PrimeraAtencionDetalle, keys: string[]): number | '' {
  for (const k of keys) {
    const v = row[k];
    if (v == null || v === '') continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return '';
}

function parseTiempoEnfermedad(texto: string): number | null {
  const m = texto.trim().match(/^(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isNaN(n) ? null : n;
}

function toIsoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function combinarFechaHora(fecha: string, hora: string): string | null {
  if (!fecha) return null;
  const h = hora?.trim() || '00:00';
  return `${fecha}T${h}:00`;
}

export function formToGuardarPayload(
  form: FormPrimeraAtencion,
  fechaHoraAtencion: Date | null,
  condicionesEgreso: CondicionEgresoOpcion[] = CONDICIONES_EGRESO,
): PrimeraAtencionGuardarPayload {
  const tipo: 'D' | 'I' = form.anamnesisTipo === 'indirecta' ? 'I' : 'D';
  return {
    fechaAtencion: fechaHoraAtencion ? toIsoLocal(fechaHoraAtencion) : undefined,
    tipoAnamnesis: tipo,
    tiempoEnfermedad: parseTiempoEnfermedad(form.tiempoEnfermedad),
    signosSintomas: form.signosSintomas || null,
    relatoCronologico: form.relatoCronologico || null,
    antecedentes: form.antecedentes || null,
    idEstadoGeneral: form.estadoGeneral === '' ? null : form.estadoGeneral,
    idEstadoHidratacion: form.hidratacion === '' ? null : form.hidratacion,
    idNivelConciencia: form.conciencia === '' ? null : form.conciencia,
    pielAnexos: form.pielAnexos || null,
    examenClinicoRegional: form.examenRegional || null,
    referenciaOportuna: form.referencia || null,
    evolucion: form.evolucion || null,
    evaluacionEnfermeriaObstetricia: form.evaluacionEnfermeria || null,
    idCondicionEgreso: form.condicionEgreso === '' ? null : form.condicionEgreso,
    codCondicionEgreso: codigoCondicionEgreso(form.condicionEgreso, condicionesEgreso),
    fechaEgreso: combinarFechaHora(form.fechaEgreso, form.horaEgreso),
  };
}

export function detalleToForm(
  row: PrimeraAtencionDetalle,
): { form: FormPrimeraAtencion; fechaHoraAtencion: Date | null; idPrimeraAtencion: number | null } {
  const tipoRaw = leerTexto(row, ['TipoAnamnesis', 'tipoAnamnesis']).toUpperCase();
  const fechaRaw = leerTexto(row, ['FechaAtencion', 'fechaAtencion']);
  let fechaHoraAtencion: Date | null = null;
  if (fechaRaw) {
    const d = new Date(fechaRaw);
    if (!Number.isNaN(d.getTime())) fechaHoraAtencion = d;
  }

  const idPrimera = leerNum(row, ['IdPrimeraAtencion', 'idPrimeraAtencion']);
  const tiempo = leerNum(row, ['TiempoEnfermedad', 'tiempoEnfermedad']);
  const fechaEgresoRaw = leerTexto(row, ['FechaEgreso', 'fechaEgreso']);

  let fechaEgreso = '';
  let horaEgreso = '';
  if (fechaEgresoRaw) {
    const d = new Date(fechaEgresoRaw);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      fechaEgreso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      horaEgreso = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }

  const form: FormPrimeraAtencion = {
    anamnesisTipo: tipoRaw === 'I' ? 'indirecta' : 'directa',
    tiempoEnfermedad: tiempo === '' ? '' : String(tiempo),
    signosSintomas: leerTexto(row, ['SignosSintomas', 'signosSintomas']),
    relatoCronologico: leerTexto(row, ['RelatoCronologico', 'relatoCronologico']),
    antecedentes: leerTexto(row, ['Antecedentes', 'antecedentes']),
    estadoGeneral: leerNum(row, ['IdEstadoGeneral', 'idEstadoGeneral']),
    hidratacion: leerNum(row, ['IdEstadoHidratacion', 'idEstadoHidratacion']),
    conciencia: leerNum(row, ['IdNivelConciencia', 'idNivelConciencia']),
    pielAnexos: leerTexto(row, ['PielAnexos', 'pielAnexos']),
    examenRegional: leerTexto(row, ['ExamenClinicoRegional', 'examenClinicoRegional']),
    examenesImagenes: '',
    interconsulta: '',
    procedimientos: '',
    referencia: leerTexto(row, ['ReferenciaOportuna', 'referenciaOportuna']),
    evolucion: leerTexto(row, ['Evolucion', 'evolucion']),
    evaluacionEnfermeria: leerTexto(row, [
      'EvaluacionEnfermeriaObstetricia',
      'evaluacionEnfermeriaObstetricia',
    ]),
    condicionEgreso: leerNum(row, ['IdCondicionEgreso', 'idCondicionEgreso']),
    fechaEgreso,
    horaEgreso,
  };

  return {
    form,
    fechaHoraAtencion,
    idPrimeraAtencion: idPrimera === '' ? null : idPrimera,
  };
}

export function ubicacionArchivoDesdeDetalle(
  row: PrimeraAtencionDetalle,
): string {
  return leerTexto(row, ['UbicacionArchivo', 'ubicacionArchivo']);
}

/** Extrae el UUID de `/ftp/primera-atencion/{id}/{uuid}.pdf` o de un uuid suelto. */
export function uuidFirmaDesdeUbicacion(ubicacion: string): string {
  const texto = ubicacion.trim();
  if (!texto) return '';
  const nombre = texto.split(/[/\\]/).pop() ?? texto;
  return nombre.replace(/\.pdf$/i, '').trim();
}

/** Parte signos/síntomas de PA (texto libre) en ítems para recuadros. */
export function partirSignosSintomas(texto: string): string[] {
  const limpio = texto.trim();
  if (!limpio) return [];
  const porSeparador = limpio
    .split(/[;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (porSeparador.length > 1) return porSeparador;
  const porComa = limpio
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (porComa.length > 2) return porComa;
  return [limpio];
}

export const SESSION_KEY_PA = (idAtencion: number) => `pa-borrador:${idAtencion}`;
