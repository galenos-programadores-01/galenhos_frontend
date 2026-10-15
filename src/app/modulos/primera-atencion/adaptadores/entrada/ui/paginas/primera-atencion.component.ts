import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  ViewChild,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ApiClientService,
  ApiRequestError,
} from '../../../../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../../compartido/componentes/tabla/tabla.component';
import type {
  ICatalogoDescripcion,
  ICatalogoNombre,
  IFilaBackend,
} from '../../../../../../compartido/tipos/api-tipos';
import { MaestrosApiService } from '../../../../../../compartido/api/maestros.api.service';
import { ModalGlobalService } from '../../../../../../compartido/ui/modal-global/modal-global.service';
import { ResumenErroresComponent } from '../../../../../../compartido/ui/validacion/resumen-errores.component';
import type { ErrorCampoUi } from '../../../../../../compartido/validacion/error-campo.tipos';
import {
  mensajeDeCampo,
  quitarErrorCampo,
  tieneErrorCampo,
} from '../../../../../../compartido/validacion/error-campo.util';
import { VerFichaPaComponent } from '../componentes/ver-ficha-pa/ver-ficha-pa';
import { AuthService } from '../../../../../auth/aplicacion/auth.service';
import { PrimeraAtencionApiService } from '../../../salida/http/primera-atencion.api.service';
import { PrimeraAtencionPersistenciaService } from '../../../../aplicacion/primera-atencion-persistencia.service';
import { PrimeraAtencionFirmaService } from '../../../../aplicacion/primera-atencion-firma.service';
import type { DocumentoFirmaPa } from '../../../../aplicacion/firma/primera-atencion-firma.tipos';
import { calcularResumenVerificacionPa } from '../../../../aplicacion/validacion/primera-atencion-resumen.util';
import {
  obtenerErroresCamposPasoPa,
  obtenerErroresValidacionPa,
  validarPasoActualPa,
} from '../../../../aplicacion/validacion/primera-atencion.validador';
import type {
  ContextoValidacionPa,
  ItemResumenVerificacionPa,
  PasoAtencionPa,
} from '../../../../aplicacion/validacion/primera-atencion.validacion.tipos';
import { mapearPrimeraAtencionPdfData } from '../../../../aplicacion/pdf/primera-atencion-pdf.mapper';
import { construirPdfPrimeraAtencion } from '../../../../aplicacion/pdf/primera-atencion-pdf.util';
import type { ContextoMapperPdfPa } from '../../../../aplicacion/pdf/primera-atencion-pdf.tipos';
import type { VerFichaPaVista } from '../../../../aplicacion/ficha/ver-ficha-pa.tipos';
import type { DatosInstitucionPdf } from '../../../../../../compartido/pdf/pdf.tipos';
import {
  CONDICIONES_EGRESO,
  codigoCondicionEgreso,
  detalleToForm,
  diagnosticosDesdeApi,
  examenesDesdeApi,
  formToGuardarPayload,
  ID_CLASIFICACION_DX_EGRESO,
  ID_CLASIFICACION_DX_EGRESO_FALLECIDO,
  ID_CLASIFICACION_DX_INTERC,
  ID_CLASIFICACION_DX_PA,
  idSubclasificacionDefault,
  mapearSubclasificacionesDx,
  esTipoDxEgresoPrincipal,
  idSubclasificacionDefaultEgreso,
  medicamentosDesdeApi,
  nombreDesdeDescripcionLarga,
  normalizarDiagnosticosBorrador,
  partirSignosSintomas,
  procedimientosDesdeApi,
  ubicacionArchivoDesdeDetalle,
  uuidFirmaDesdeUbicacion,
  type DiagnosticoBorradorPA,
  type InterconsultaListadoApi,
  type SessionBorradorPA,
  type SubclasificacionDxOpcion,
} from '../../../../aplicacion/primera-atencion.mapper';

/** Grupos del SP usp_go_Cat_ParametroClinico_Listar */
const ID_GRUPO_EXAMEN_CLINICO = 1;
const ID_GRUPO_HIDRATACION = 2;
const ID_GRUPO_CONCIENCIA = 3;
const ID_GRUPO_CONDICION_EGRESO = 4;
/** Motivos de interconsulta (radio paso 5). */
const ID_GRUPO_MOTIVO_INTERCONSULTA = 6;
/** Tipo de alta (egreso Domicilio). */
const ID_GRUPO_TIPO_ALTA = 8;
/** Condición de alta (egreso Domicilio). */
const ID_GRUPO_CONDICION_ALTA = 9;
/** Pronóstico (egreso Domicilio). */
const ID_GRUPO_PRONOSTICO = 10;
/** Destino del cadáver (egreso Fallecido). */
const ID_GRUPO_DESTINO_CADAVER = 11;
/** Tipo de certificado (egreso Fallecido). */
const ID_GRUPO_TIPO_CERTIFICADO = 12;
/** Tiempo de estancia hasta el deceso (egreso Fallecido). */
const ID_GRUPO_TIEMPO_ESTANCIA_DECESO = 13;

type PasoNavegacionPa = {
  id: PasoAtencionPa;
  num: string;
  /** Badge visual del panel (01, 02… o ✓). */
  badge: string;
  label: string;
  /** Subtítulo del header del paso (patrón panel derecho). */
  sub: string;
};

const PASOS_ATENCION_PA: PasoNavegacionPa[] = [
  {
    id: 'anamnesis',
    num: '1',
    badge: '01',
    label: 'Anamnesis',
    sub: 'Motivo, relato y antecedentes de la atención',
  },
  {
    id: 'examen',
    num: '2',
    badge: '02',
    label: 'Examen clínico',
    sub: 'Estado general y hallazgos al examen físico',
  },
  {
    id: 'diagnosticos',
    num: '3',
    badge: '03',
    label: 'Diagnósticos',
    sub: 'CIE-10 de la primera atención',
  },
  {
    id: 'examenes',
    num: '4',
    badge: '04',
    label: 'Exámenes',
    sub: 'Solicitud de exámenes auxiliares por diagnóstico',
  },
  {
    id: 'interconsulta',
    num: '5',
    badge: '05',
    label: 'Interconsulta',
    sub: 'Solicitud a otras especialidades',
  },
  {
    id: 'procedimientos',
    num: '6',
    badge: '06',
    label: 'Procedimientos',
    sub: 'Procedimientos vinculados al diagnóstico',
  },
  {
    id: 'medicamentos',
    num: '7',
    badge: '07',
    label: 'Medicamentos',
    sub: 'Indicación farmacológica y evolución',
  },
  {
    id: 'egreso',
    num: '8',
    badge: '08',
    label: 'Condición de egreso',
    sub: 'Destino y datos de egreso de la atención',
  },
  {
    id: 'cierre',
    num: '✓',
    badge: '✓',
    label: 'Firma y registro',
    sub: 'Verifique las secciones y firme con DNIe',
  },
];

const GRUPOS_PASOS_ATENCION_PA: {
  id: string;
  label: string;
  pasos: PasoNavegacionPa[];
}[] = [
  {
    id: 'clinica',
    label: 'Atención clínica',
    pasos: PASOS_ATENCION_PA.filter((p) =>
      ['anamnesis', 'examen', 'diagnosticos'].includes(p.id),
    ),
  },
  {
    id: 'plan',
    label: 'Plan y tratamiento',
    pasos: PASOS_ATENCION_PA.filter((p) =>
      [
        'examenes',
        'interconsulta',
        'procedimientos',
        'medicamentos',
        'egreso',
      ].includes(p.id),
    ),
  },
  {
    id: 'cierre',
    label: 'Cierre',
    pasos: PASOS_ATENCION_PA.filter((p) => p.id === 'cierre'),
  },
];

/** Prioridades alineadas con Admisiones / HTML de referencia. */
const TIPO_PRIORIDAD_INFO: Record<
  number,
  { label: string; bg: string; text: string }
> = {
  1: { label: 'I. Crítica', bg: '#fee2e2', text: '#b91c1c' },
  2: { label: 'II. Mayor', bg: '#ffedd5', text: '#c2410c' },
  3: { label: 'III. Menor', bg: '#fef9c3', text: '#a16207' },
  4: { label: 'IV. Aguda común', bg: '#d1fae5', text: '#047857' },
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  curso: 'En atención',
  atendido: 'Atendido',
  'en atencion': 'En atención',
  'en atención': 'En atención',
};

function campo(
  item: IFilaBackend | null | undefined,
  claves: string[],
): string {
  if (!item) return '';
  for (const k of claves) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== '') {
      if (typeof v === 'string') return v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return JSON.stringify(v);
    }
  }
  return '';
}

function campoNum(
  item: IFilaBackend | null | undefined,
  claves: string[],
): number {
  const raw = campo(item, claves);
  return Number(raw) || 0;
}

type Vista = 'bandeja' | 'atencion';

/** Destino UI del paso egreso (tarjeta → código catálogo). */
type DestinoEgresoClave =
  | 'domicilio'
  | 'hospitalizacion'
  | 'referencia'
  | 'fuga'
  | 'fallecido';

/** Destinos con lista propia de DX de egreso (referencia no tiene). */
type DestinoEgresoConDx = Exclude<DestinoEgresoClave, 'referencia'>;

type EgresoDxPorDestino = Record<DestinoEgresoConDx, DiagnosticoBorradorPA[]>;

/** Snapshot local de egreso (sessionStorage) hasta tablas/API propias. */
type EgresoDraftSession = {
  destino: DestinoEgresoClave;
  condicionEgreso: number | '';
  fechaEgreso: string;
  horaEgreso: string;
  domicilio: {
    fecha: string;
    hora: string;
    /** IdParametro (Cat_ParametroClinico IdGrupo=8). */
    tipoAlta: number | '';
    /** IdParametro (Cat_ParametroClinico IdGrupo=9). */
    condicionAlta: number | '';
    /** IdParametro (Cat_ParametroClinico IdGrupo=10). */
    pronostico: number | '';
    recomendaciones: string;
  };
  hospitalizacion: {
    fecha: string;
    hora: string;
    idServicioRecibe: number | '';
    motivo: string;
  };
  fuga: {
    fecha: string;
    hora: string;
    fechaUltimoContacto: string;
    horaUltimoContacto: string;
    reportadoPor: string;
    notificacion: '' | 'seguridad' | 'familiar' | 'incidente';
    observaciones: string;
  };
  fallecido: {
    fecha: string;
    hora: string;
    /** IdParametro (Cat_ParametroClinico IdGrupo=11). */
    destinoCadaver: number | '';
    /** IdParametro (Cat_ParametroClinico IdGrupo=12). */
    tipoCertificado: number | '';
    nroCertificado: string;
    /** IdParametro (Cat_ParametroClinico IdGrupo=13). */
    tiempoEstanciaDeceso: number | '';
    necropsia: '' | 'si' | 'no';
    familiarInformado: string;
  };
  /** @deprecated Preferir diagnosticosPorDestino. */
  diagnosticos?: DiagnosticoBorradorPA[];
  /** DX de egreso aislados por tarjeta de destino. */
  diagnosticosPorDestino?: Partial<EgresoDxPorDestino>;
  /** Alta domicilio ya persistida (reintento solo DX pendientes). */
  altaDomicilioRegistrada?: boolean;
  /** Alta hospitalización ya persistida (reintento solo DX pendientes). */
  altaHospitalizacionRegistrada?: boolean;
  /** Alta fuga ya persistida (reintento solo DX pendientes). */
  altaFugaRegistrada?: boolean;
  /** Alta fallecido ya persistida (reintento solo DX pendientes). */
  altaFallecidoRegistrada?: boolean;
  guardadoEn: string;
};

/** De dónde se cargó el borrador al abrir la atención. */
type OrigenBorradorPA = 'servidor' | 'session' | 'nuevo';

type ItemCatalogoDx = {
  idDiagnostico: number;
  descripcion: string;
  codigoCIE10: string;
};

/** DX de la solicitud de interconsulta (local; persistencia aparte del paso 3). */
type InterconsultaDxFila = {
  idDiagnostico: number | '';
  nombre: string;
  cie10: string;
  tipo: 'P' | 'D' | 'R';
  idSubclasificacionDx: number;
};

const MIN_CARACTERES_DX = 2;
const DEBOUNCE_DX_MS = 300;
const MIN_CARACTERES_MED = 2;
const DEBOUNCE_MED_MS = 300;
const MIN_CARACTERES_EX = 2;
const DEBOUNCE_EX_MS = 300;
const MIN_CARACTERES_PROC = 2;
const DEBOUNCE_PROC_MS = 300;

/** Colores del círculo/valor en signos vitales de ingreso. */
const COLOR_VITAL = {
  verde: '#22c55e',
  amarillo: '#eab308',
  rojo: '#ef4444',
  /** Círculo cuando no hay rango / sin dato */
  neutro: '#7fa3b8',
  /** Texto del valor en estado neutro */
  textoNeutro: '#ffffff',
} as const;

type ItemMedicamentoCat = {
  idProducto: number;
  codigo: string;
  nombre: string;
  precioUnitario?: number;
};

type ItemExamenCat = {
  idProducto: number;
  codigo: string;
  nombre: string;
  nombreLargo?: string;
  idPuntoCarga?: number;
  puntoCarga?: string;
  servicio?: string;
  precioUnitario?: number;
};

/** Fila UI de examen (RecetaDetalle). */
type FilaExamenPa = {
  nombre: string;
  codigo: string;
  idProducto: number | null;
  idReceta: number | null;
  idPuntoCarga: number | null;
  puntoCarga: string | null;
  precioUnitario: number | null;
  total: number | null;
  idDiagnostico: number | null;
};

/** Vista cacheada: grupos por IdPuntoCarga para la tabla opción A. */
type GrupoExamenVista = {
  clave: string;
  etiqueta: string;
  claseCss: string;
  filas: {
    indice: number;
    ordinal: number;
    cie10: string;
    tipo: string;
  }[];
};

type ItemProcedimientoCat = {
  idProducto: number;
  codigo: string;
  nombre: string;
  nombreLargo?: string;
  idPuntoCarga?: number;
  puntoCarga?: string;
  precioUnitario?: number;
};

type ItemDosisCat = { idDosis: number; numeroDosis: string };
type ItemUnidadCat = { idUNIDDosis: number; numeroUNIDDosis: string };
type ItemFrecuenciaCat = { idFrecuencia: number; descripcion: string };
type ItemViaCat = { idViaAdministracion: number; descripcion: string };

type FilaMedicamento = {
  /** PK lógica: idReceta + idProducto; null = aún no en BD. */
  idReceta: number | null;
  idProducto: number | '';
  nombre: string;
  cantidad: string;
  /** Del catálogo; → RecetaDetalle.Precio. Total = cantidad * precioUnitario. */
  precioUnitario: number | null;
  total: number | null;
  idDosis: number | '';
  dosis: string;
  idUNIDDosis: number | '';
  unidad: string;
  idFrecuencia: number | '';
  frecuencia: string;
  idViaAdministracion: number | '';
  /** Días (entero); string en input. */
  duracion: string;
  /** Catálogo CIE — asocia el medicamento al DX activo. */
  idDiagnostico: number | null;
};

@Component({
  selector: 'app-primera-atencion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TablaComponent,
    ColumnaTemplateDirective,
    VerFichaPaComponent,
    ResumenErroresComponent,
  ],
  templateUrl: './primera-atencion.component.html',
  styleUrls: [
    './primera-atencion.component.css',
    '../../../../../../compartido/ui/validacion/gal-validacion-campo.css',
  ],
})
export class PrimeraAtencionComponent implements OnInit, OnDestroy {
  private readonly api = inject(PrimeraAtencionApiService);
  private readonly apiClient = inject(ApiClientService);
  readonly persistencia = inject(PrimeraAtencionPersistenciaService);
  private readonly firmaService = inject(PrimeraAtencionFirmaService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly modalGlobal = inject(ModalGlobalService);
  public readonly authService = inject(AuthService);

  @ViewChild(ResumenErroresComponent)
  private resumenErroresUi?: ResumenErroresComponent;

  /** Emergencia — mismo criterio que Admisiones (getServicios(2)). */
  readonly idTipoServicio = 2;

  vista: Vista = 'bandeja';
  filtro = '';
  filtroPrioridad = '';
  filtroEstado = '';

  items: IFilaBackend[] = [];
  itemsFiltrados: IFilaBackend[] = [];
  cargando = false;
  error = '';
  buscado = false;

  /**
   * Instante de referencia para calcular espera.
   * Se actualiza en cada handleBuscar (botón Actualizar / carga inicial).
   */
  ahoraConsulta = new Date();

  pacienteSeleccionado: IFilaBackend | null = null;
  modoAtencion: 'iniciar' | 'continuar' = 'iniciar';

  /**
   * Fecha/hora de atención (ahora) al abrir Iniciar o Continuar.
   * Se muestra en Anamnesis; cuando exista SP de guardado podrá persistirse.
   */
  fechaHoraAtencion: Date | null = null;

  /** Formulario clínico (fase UI; persistencia cuando exista SP de guardado). */
  form = this.formVacio();

  /**
   * Paso 3 — diagnósticos principales.
   * Lista = solo filas ya en BD. Alta = borrador local → Agregar (INSERT).
   * Tipo no se edita tras Agregar: ✕ + volver a cargar.
   */
  diagnosticos: DiagnosticoBorradorPA[] = [];
  borradorDxPa: DiagnosticoBorradorPA = {
    idAtencionDiagnostico: null,
    idDiagnostico: '',
    nombre: '',
    cie10: '',
    tipo: 'P',
    idSubclasificacionDx: 0,
  };
  sugerenciasBorradorDxPa: ItemCatalogoDx[] = [];
  cargandoBorradorDxPa = false;
  private secuenciaBorradorDxPa = 0;
  private debounceBorradorDxPa: ReturnType<typeof setTimeout> | null = null;
  filaBorradorDxPaActiva = false;
  guardandoDxPa = false;
  eliminandoDxIndex: number | null = null;
  errorDx = '';

  medicamentos: FilaMedicamento[] = [];
  /** Lista cacheada (orden de alta; todos los DX). */
  medicamentosVista: {
    indice: number;
    ordinal: number;
    cie10: string;
    dosis: string;
    unidad: string;
    frecuencia: string;
    via: string;
  }[] = [];
  /** Borrador del formulario de alta (no es fila de la tabla). */
  borradorMed: FilaMedicamento = {
    idReceta: null,
    idProducto: '',
    nombre: '',
    cantidad: '',
    precioUnitario: null,
    total: null,
    idDosis: '',
    dosis: '',
    idUNIDDosis: '',
    unidad: '',
    idFrecuencia: '',
    frecuencia: '',
    idViaAdministracion: '',
    duracion: '',
    idDiagnostico: null,
  };
  errorMedicamentos = '';
  guardandoAltaMed = false;
  /** Índice en `diagnosticos` del DX del combo (paso Medicamentos). */
  indiceDxMedActivo: number | null = null;

  /** Catálogos receta (carga una vez). */
  catalogoDosis: ItemDosisCat[] = [];
  catalogoUnidades: ItemUnidadCat[] = [];
  catalogoFrecuencias: ItemFrecuenciaCat[] = [];
  opcionesVia: ItemViaCat[] = [];
  cargandoCatalogosMed = false;
  errorCatalogosMed = '';

  /** Sugerencias del formulario de alta. */
  sugerenciasAltaMed: ItemMedicamentoCat[] = [];
  sugerenciasAltaDosis: ItemDosisCat[] = [];
  sugerenciasAltaUnidad: ItemUnidadCat[] = [];
  sugerenciasAltaFrecuencia: ItemFrecuenciaCat[] = [];
  cargandoAltaMed = false;
  altaMedActiva = false;
  campoAltaMedActivo: 'med' | 'dosis' | 'unidad' | 'frecuencia' | null = null;
  private secuenciaAltaMed = 0;
  private debounceAltaMed: ReturnType<typeof setTimeout> | null = null;

  /* ── Exámenes (tabla global por PuntoCarga; DX vía combo) ── */
  examenes: FilaExamenPa[] = [];
  /** Grupos cacheados; reconstruir tras alta/baja/rehidratación. */
  gruposExamenVista: GrupoExamenVista[] = [];
  /** Barra de alta (opción A). */
  textoBusquedaExamen = '';
  sugerenciasAltaEx: ItemExamenCat[] = [];
  cargandoAltaEx = false;
  private secuenciaAltaEx = 0;
  private debounceAltaEx: ReturnType<typeof setTimeout> | null = null;
  altaExActiva = false;
  /** Anti doble-clic en alta (POST). */
  guardandoAltaEx = false;
  /** Índice en eliminación (DELETE); null = idle. */
  eliminandoExIndex: number | null = null;
  errorEx = '';
  /** Índice en `diagnosticos` del DX del combo (paso Exámenes). */
  indiceDxExamenActivo: number | null = null;

  /* ── Procedimientos (tabla global; cabecera fija IdPuntoCarga=26) ── */
  procedimientos: FilaExamenPa[] = [];
  /** Filas cacheadas en orden de alta (sin agrupar por PuntoCarga). */
  procedimientosVista: {
    indice: number;
    ordinal: number;
    cie10: string;
    tipo: string;
  }[] = [];
  textoBusquedaProc = '';
  sugerenciasAltaProc: ItemProcedimientoCat[] = [];
  cargandoAltaProc = false;
  private secuenciaAltaProc = 0;
  private debounceAltaProc: ReturnType<typeof setTimeout> | null = null;
  altaProcActiva = false;
  guardandoAltaProc = false;
  eliminandoProcIndex: number | null = null;
  errorProc = '';
  /** Índice en `diagnosticos` del DX del combo (paso Procedimientos). */
  indiceDxProcActivo: number | null = null;

  /** Opciones desde usp_go_Cat_ParametroClinico_Listar (IdGrupo 1, 2, 3). */
  opcionesEstadoGeneral: ICatalogoDescripcion[] = [];
  opcionesHidratacion: ICatalogoDescripcion[] = [];
  opcionesConciencia: ICatalogoDescripcion[] = [];
  cargandoCatalogosClinicos = false;
  /** Tipos DX PA (9), interconsulta (7), egreso (3) y egreso fallecido (4). */
  opcionesSubclasificacionPa: SubclasificacionDxOpcion[] = [];
  opcionesSubclasificacionInterc: SubclasificacionDxOpcion[] = [];
  opcionesSubclasificacionEgreso: SubclasificacionDxOpcion[] = [];
  opcionesSubclasificacionEgresoFallecido: SubclasificacionDxOpcion[] = [];
  errorSubclasificacionDx = '';
  errorCatalogosClinicos = '';

  /** Especialidades interconsulta: usp_go_Especialidades_Listar */
  opcionesEspecialidad: ICatalogoNombre[] = [];
  cargandoEspecialidades = false;
  errorEspecialidades = '';

  /**
   * Egreso Hospitalización — Servicio que recibe.
   * usp_go_ListarServicios @IdTipoServicio (= this.idTipoServicio).
   */
  opcionesServicioEgreso: ICatalogoNombre[] = [];
  cargandoServiciosEgreso = false;
  errorServiciosEgreso = '';

  /**
   * Paso 5 — solicitud interconsulta (usp_go_Interconsulta_*).
   * DX: borrador + pila LOCAL hasta Registrar. Lista B = GET interconsultas.
   */
  intercPrioridad: number | '' = '';
  opcionesPrioridad: ICatalogoDescripcion[] = [];
  cargandoPrioridades = false;
  errorPrioridades = '';
  opcionesMotivoInterconsulta: ICatalogoDescripcion[] = [];
  intercMotivoId: number | '' = '';
  intercMotivoClinico = '';
  /** Pila A: DX confirmados localmente (antes de Registrar). */
  intercDxLista: InterconsultaDxFila[] = [];
  /** Borrador estilo medicamentos (una sola fila de alta). */
  borradorDxInterc: InterconsultaDxFila = {
    idDiagnostico: '',
    nombre: '',
    cie10: '',
    tipo: 'P',
    idSubclasificacionDx: 0,
  };
  sugerenciasBorradorDxInterc: ItemCatalogoDx[] = [];
  cargandoBorradorDxInterc = false;
  private secuenciaBorradorDxInterc = 0;
  private debounceBorradorDxInterc: ReturnType<typeof setTimeout> | null = null;
  filaBorradorDxIntercActiva = false;
  mensajeInterc = '';
  errorDxInterc = '';
  guardandoInterc = false;
  /** Pila B: solicitudes ya en BD. */
  intercListaRegistradas: InterconsultaListadoApi[] = [];
  cargandoIntercLista = false;
  eliminandoIntercId: number | null = null;
  errorIntercLista = '';

  /** Cat_ParametroClinico IdGrupo=4 → IdCondicionEgreso + CodCondicionEgreso */
  opcionesEgreso = [...CONDICIONES_EGRESO];

  /**
   * Destinos UI del paso egreso (5 tarjetas).
   * Alta (ALT) se muestra como «Domicilio». Referencia bloqueada.
   */
  readonly destinosEgresoUi: {
    clave: DestinoEgresoClave;
    codigo: string;
    nombre: string;
    subtitulo: string;
    icono: string;
    bloqueado: boolean;
  }[] = [
    {
      clave: 'domicilio',
      codigo: 'ALT',
      nombre: 'Domicilio',
      subtitulo: 'Alta médica',
      icono: 'D',
      bloqueado: false,
    },
    {
      clave: 'hospitalizacion',
      codigo: 'HOS',
      nombre: 'Hospitalización',
      subtitulo: 'Transferencia interna',
      icono: 'H',
      bloqueado: false,
    },
    {
      clave: 'referencia',
      codigo: 'REF',
      nombre: 'Referencia',
      subtitulo: 'Otro establecimiento',
      icono: 'R',
      bloqueado: true,
    },
    {
      clave: 'fuga',
      codigo: 'FUG',
      nombre: 'Fuga',
      subtitulo: 'Abandono no autorizado',
      icono: 'F',
      bloqueado: false,
    },
    {
      clave: 'fallecido',
      codigo: 'FAL',
      nombre: 'Fallecido',
      subtitulo: 'Morgue / mortuorio',
      icono: '†',
      bloqueado: false,
    },
  ];

  /**
   * Tipo de alta — usp_go_Cat_ParametroClinico_Listar @IdGrupo=8.
   * Valor = IdParametro; label = Descripcion.
   */
  opcionesTipoAltaEgreso: ICatalogoDescripcion[] = [];
  /**
   * Condición de alta — usp_go_Cat_ParametroClinico_Listar @IdGrupo=9.
   * Valor = IdParametro; label = Descripcion.
   */
  opcionesCondicionAltaEgreso: ICatalogoDescripcion[] = [];
  /**
   * Pronóstico — usp_go_Cat_ParametroClinico_Listar @IdGrupo=10.
   * Valor = IdParametro; label = Descripcion.
   */
  opcionesPronosticoEgreso: ICatalogoDescripcion[] = [];
  /**
   * Destino del cadáver — usp_go_Cat_ParametroClinico_Listar @IdGrupo=11.
   * Valor = IdParametro; label = Descripcion.
   */
  opcionesDestinoCadaverEgreso: ICatalogoDescripcion[] = [];
  /**
   * Tipo de certificado — usp_go_Cat_ParametroClinico_Listar @IdGrupo=12.
   * Valor = IdParametro; label = Descripcion.
   */
  opcionesTipoCertificadoEgreso: ICatalogoDescripcion[] = [];
  /**
   * Tiempo de estancia hasta el deceso — usp_go_Cat_ParametroClinico_Listar @IdGrupo=13.
   * Valor = IdParametro; label = Descripcion.
   */
  opcionesTiempoEstanciaDecesoEgreso: ICatalogoDescripcion[] = [];

  destinoEgresoActivo: DestinoEgresoClave | null = null;

  egresoDomicilio = {
    fecha: '',
    hora: '',
    tipoAlta: '' as number | '',
    condicionAlta: '' as number | '',
    pronostico: '' as number | '',
    recomendaciones: '',
  };
  egresoHospitalizacion = {
    fecha: '',
    hora: '',
    idServicioRecibe: '' as number | '',
    motivo: '',
  };
  egresoFuga = {
    fecha: '',
    hora: '',
    fechaUltimoContacto: '',
    horaUltimoContacto: '',
    reportadoPor: '',
    /** Radio fijo: seguridad | familiar | incidente */
    notificacion: '' as '' | 'seguridad' | 'familiar' | 'incidente',
    observaciones: '',
  };
  egresoFallecido = {
    fecha: '',
    hora: '',
    destinoCadaver: '' as number | '',
    tipoCertificado: '' as number | '',
    nroCertificado: '',
    tiempoEstanciaDeceso: '' as number | '',
    necropsia: '' as '' | 'si' | 'no',
    familiarInformado: '',
  };

  /**
   * DX de egreso por tarjeta (domicilio / hosp / fuga / fallecido).
   * La UI usa el getter egresoDxLista del destino activo.
   */
  private egresoDxPorDestino: EgresoDxPorDestino = {
    domicilio: [],
    hospitalizacion: [],
    fuga: [],
    fallecido: [],
  };

  /** Lista DX del destino activo (vacía si no hay tarjeta o es referencia). */
  get egresoDxLista(): DiagnosticoBorradorPA[] {
    const k = this.destinoEgresoActivo;
    if (!k || k === 'referencia') return [];
    return this.egresoDxPorDestino[k];
  }

  borradorDxEgreso: DiagnosticoBorradorPA = {
    idDiagnostico: '',
    nombre: '',
    cie10: '',
    tipo: 'P',
    idSubclasificacionDx: 0,
  };
  sugerenciasBorradorDxEgreso: ItemCatalogoDx[] = [];
  cargandoBorradorDxEgreso = false;
  private secuenciaBorradorDxEgreso = 0;
  private debounceBorradorDxEgreso: ReturnType<typeof setTimeout> | null = null;
  filaBorradorDxEgresoActiva = false;
  errorDxEgreso = '';
  mensajeEgreso = '';
  errorEgreso = '';
  guardandoEgreso = false;
  /** Evita reenviar usp_go_RegistrarAltaHospitalaria si ya salió OK. */
  altaDomicilioRegistrada = false;
  altaHospitalizacionRegistrada = false;
  altaFugaRegistrada = false;
  altaFallecidoRegistrada = false;

  fichaVista: VerFichaPaVista | null = null;
  fichaCargando = false;
  fichaError = '';
  fichaDescargando = false;
  mensaje = '';

  /** Wizard de atención (diseño alineado a Evolución). */
  pasoActivo: PasoAtencionPa = 'anamnesis';

  /** Errores del paso activo (resumen + inline). Patrón compartido ErrorCampoUi. */
  erroresCamposPaso: ErrorCampoUi[] = [];
  readonly pasosPa: PasoNavegacionPa[] = PASOS_ATENCION_PA;
  readonly gruposPasosPa = GRUPOS_PASOS_ATENCION_PA;

  /** Meta de un paso (badge, título, subtítulo) para headers del panel. */
  pasoPa(id: PasoAtencionPa): PasoNavegacionPa {
    return this.pasosPa.find((p) => p.id === id) ?? this.pasosPa[0];
  }

  /** Preview del sello digital (fase A — sin Firma Perú aún). */
  logoInstitucion = '';
  datosInstitucionPa: DatosInstitucionPdf | null = null;
  isSigning = false;

  /** Posición fixed de la lista de sugerencias activa (evita clip por overflow-x). */
  sugerenciaPos: { top: number; left: number; width: number } | null = null;

  columnasTabla: ColumnaTabla[] = [
    { campo: 'cuentaCustom', cabecera: 'Cuenta', ancho: '100px' },
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'prioridadCustom', cabecera: 'Prioridad', ancho: '120px' },
    { campo: 'esperaCustom', cabecera: 'Espera', ancho: '100px' },
    { campo: 'consultorioCustom', cabecera: 'Consultorio / Médico' },
    { campo: 'estadoCustom', cabecera: 'Estado', ancho: '120px' },
    { campo: 'accionCustom', cabecera: 'Acción', alineacion: 'right' },
  ];

  ngOnInit() {
    this.persistencia.registrarFuentes(
      () => formToGuardarPayload(this.form, this.fechaHoraAtencion, this.opcionesEgreso),
      () => ({
        idAtencion: this.idAtencionActivo() ?? 0,
        idPrimeraAtencion: this.persistencia.idPrimeraAtencion,
        form: { ...this.form },
        fechaHoraAtencion: this.fechaHoraAtencion?.toISOString() ?? null,
        diagnosticos: this.diagnosticos.map((d) => ({ ...d })),
      }),
    );
    this.persistencia.onEstadoChange = () => this.cdr.detectChanges();
    void this.cargarCatalogosClinicos();
    void this.cargarEspecialidadesInterconsulta();
    void this.cargarServiciosEgreso();
    void this.cargarPrioridadesPrimeraAtencion();
    void this.cargarCatalogosMedicamento();
    void this.cargarDatosInstitucionYPerfilPa();
    this.handleBuscar();
  }

  /** Logo institución + perfil del médico firmante (preview del sello). */
  private async cargarDatosInstitucionYPerfilPa(): Promise<void> {
    try {
      const institucion = await this.maestrosApi.getDatosInstitucion();
      const raw = institucion as DatosInstitucionPdf & Record<string, unknown>;
      this.datosInstitucionPa = {
        rucEess: (raw.rucEess as string) || (raw.RucEess as string) || null,
        nombre: (raw.nombre as string) || (raw.Nombre as string) || null,
        direccion: (raw.direccion as string) || (raw.Direccion as string) || null,
        telefono: (raw.telefono as string) || (raw.Telefono as string) || null,
        logoMinsa: (raw.logoMinsa as string) || (raw.LogoMinsa as string) || null,
        logoHospi: (raw.logoHospi as string) || (raw.LogoHospi as string) || null,
      };
      this.logoInstitucion =
        this.datosInstitucionPa.logoHospi ||
        this.datosInstitucionPa.logoMinsa ||
        '';
    } catch {
      this.logoInstitucion = '';
      this.datosInstitucionPa = null;
    }
    void this.authService.cargarPerfil().finally(() => this.cdr.detectChanges());
    this.cdr.detectChanges();
  }

  get nombreMedicoFirmantePa(): string {
    const perfil = this.authService.userProfile();
    if (perfil?.nombreCompleto && perfil.nombreCompleto.trim().length > 0) {
      return perfil.nombreCompleto.trim().toUpperCase();
    }
    const username = this.authService.username();
    return username ? username.toUpperCase() : 'MÉDICO TRATANTE';
  }

  get dniMedicoFirmantePa(): string {
    return this.authService.userProfile()?.dni || '';
  }

  get cargoCompletoFirmantePa(): string {
    const perfil = this.authService.userProfile();
    const partes: string[] = [`Médico ${this.nombreMedicoFirmantePa}`];
    if (perfil?.colegiatura) {
      partes.push(`CMP: ${perfil.colegiatura}`);
    }
    if (perfil?.rne) {
      partes.push(`RNE: ${perfil.rne}`);
    }
    return partes.join(' - ');
  }

  get fechaFirmaPreviewPa(): string {
    return this.formatearFechaSolo(new Date());
  }

  get horaFirmaPreviewPa(): string {
    return this.formatearHoraSolo(new Date());
  }

  get listoParaSelladoPa(): boolean {
    const resumen = this.resumenVerificacionPa;
    return resumen.length > 0 && resumen.every((item) => item.completado);
  }

  /**
   * Lista del cierre + fuente del lote (PA → exámenes → medicamentos).
   */
  get documentosParaFirmarLista(): DocumentoFirmaPa[] {
    return this.firmaService.armarDocumentosParaFirmar({
      idAtencion: this.idAtencionActivo() ?? 0,
      idPrimeraAtencion: this.persistencia.idPrimeraAtencion ?? 0,
      examenes: this.examenes.map((e) => ({
        ...e,
        cie10Dx: this.pdfCie10DeIdDx(e.idDiagnostico),
      })),
      medicamentos: this.medicamentos.map((m) => ({
        ...m,
        cie10Dx: this.pdfCie10DeIdDx(m.idDiagnostico),
        via: this.etiquetaVia(m.idViaAdministracion),
      })),
    });
  }

  /**
   * Carga selects del examen clínico + condición de egreso + motivos interconsulta
   * + tipo/condición/pronóstico (8/9/10) + fallecido (11/12/13)
   * + subclasificaciones DX (PA 9 / interconsulta 7 / egreso 3 / egreso fallecido 4).
   */
  async cargarCatalogosClinicos() {
    this.cargandoCatalogosClinicos = true;
    this.errorCatalogosClinicos = '';
    this.errorSubclasificacionDx = '';
    try {
      const [
        estadoGeneral,
        hidratacion,
        conciencia,
        egreso,
        motivosInterc,
        tipoAlta,
        condicionAlta,
        pronostico,
        destinoCadaver,
        tipoCertificado,
        tiempoEstanciaDeceso,
        subPa,
        subInterc,
        subEgreso,
        subEgresoFallecido,
      ] = await Promise.all([
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_EXAMEN_CLINICO),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_HIDRATACION),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_CONCIENCIA),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_CONDICION_EGRESO),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_MOTIVO_INTERCONSULTA),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_TIPO_ALTA),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_CONDICION_ALTA),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_PRONOSTICO),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_DESTINO_CADAVER),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_TIPO_CERTIFICADO),
        this.maestrosApi.getParametrosClinicos(ID_GRUPO_TIEMPO_ESTANCIA_DECESO),
        this.maestrosApi.getSubclasificacionesDiagnostico({
          idTipoServicio: this.idTipoServicio,
          idClasificacionDx: ID_CLASIFICACION_DX_PA,
        }),
        this.maestrosApi.getSubclasificacionesDiagnostico({
          idTipoServicio: this.idTipoServicio,
          idClasificacionDx: ID_CLASIFICACION_DX_INTERC,
        }),
        this.maestrosApi.getSubclasificacionesDiagnostico({
          idTipoServicio: this.idTipoServicio,
          idClasificacionDx: ID_CLASIFICACION_DX_EGRESO,
        }),
        this.maestrosApi.getSubclasificacionesDiagnostico({
          idTipoServicio: this.idTipoServicio,
          idClasificacionDx: ID_CLASIFICACION_DX_EGRESO_FALLECIDO,
        }),
      ]);
      this.opcionesEstadoGeneral = Array.isArray(estadoGeneral)
        ? estadoGeneral
        : [];
      this.opcionesHidratacion = Array.isArray(hidratacion) ? hidratacion : [];
      this.opcionesConciencia = Array.isArray(conciencia) ? conciencia : [];
      if (Array.isArray(egreso) && egreso.length > 0) {
        this.opcionesEgreso = egreso.map((o) => {
          const codigoApi = o.codigo?.trim() ?? '';
          return {
            id: o.id,
            descripcion: o.descripcion?.trim() || String(o.id),
            codigo: codigoApi || codigoCondicionEgreso(o.id) || '',
          };
        });
      } else {
        this.opcionesEgreso = [...CONDICIONES_EGRESO];
      }
      this.aplicarOpcionesMotivoInterconsulta(
        Array.isArray(motivosInterc) ? motivosInterc : [],
      );
      this.opcionesTipoAltaEgreso = Array.isArray(tipoAlta) ? tipoAlta : [];
      this.opcionesCondicionAltaEgreso = Array.isArray(condicionAlta)
        ? condicionAlta
        : [];
      this.opcionesPronosticoEgreso = Array.isArray(pronostico)
        ? pronostico
        : [];
      this.opcionesDestinoCadaverEgreso = Array.isArray(destinoCadaver)
        ? destinoCadaver
        : [];
      this.opcionesTipoCertificadoEgreso = Array.isArray(tipoCertificado)
        ? tipoCertificado
        : [];
      this.opcionesTiempoEstanciaDecesoEgreso = Array.isArray(
        tiempoEstanciaDeceso,
      )
        ? tiempoEstanciaDeceso
        : [];
      this.opcionesSubclasificacionPa = mapearSubclasificacionesDx(
        Array.isArray(subPa) ? subPa : [],
      );
      this.opcionesSubclasificacionInterc = mapearSubclasificacionesDx(
        Array.isArray(subInterc) ? subInterc : [],
      );
      this.opcionesSubclasificacionEgreso = mapearSubclasificacionesDx(
        Array.isArray(subEgreso) ? subEgreso : [],
      );
      this.opcionesSubclasificacionEgresoFallecido = mapearSubclasificacionesDx(
        Array.isArray(subEgresoFallecido) ? subEgresoFallecido : [],
      );
      if (
        this.opcionesSubclasificacionPa.length === 0 ||
        this.opcionesSubclasificacionInterc.length === 0 ||
        this.opcionesSubclasificacionEgreso.length === 0 ||
        this.opcionesSubclasificacionEgresoFallecido.length === 0
      ) {
        this.errorSubclasificacionDx =
          'No se cargaron tipos de diagnóstico (SubclasificacionDiagnosticos).';
      }
      this.sincronizarTipoDxEgresoConDestino();
    } catch (err: unknown) {
      this.errorCatalogosClinicos =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudieron cargar los catálogos clínicos.';
      this.opcionesEgreso = [...CONDICIONES_EGRESO];
      this.aplicarOpcionesMotivoInterconsulta([]);
      this.opcionesTipoAltaEgreso = [];
      this.opcionesCondicionAltaEgreso = [];
      this.opcionesPronosticoEgreso = [];
      this.opcionesSubclasificacionPa = [];
      this.opcionesSubclasificacionInterc = [];
      this.opcionesSubclasificacionEgreso = [];
      this.opcionesSubclasificacionEgresoFallecido = [];
    } finally {
      this.cargandoCatalogosClinicos = false;
      this.cdr.detectChanges();
    }
  }

  /** IdSubclasificacionDx por defecto = Presuntivo del SP (0 si catálogo vacío). */
  private idSubclasifDefaultPa(): number {
    return idSubclasificacionDefault(this.opcionesSubclasificacionPa);
  }

  private idSubclasifDefaultInterc(): number {
    return idSubclasificacionDefault(this.opcionesSubclasificacionInterc);
  }

  private idSubclasifDefaultEgreso(): number {
    return idSubclasificacionDefaultEgreso(
      this.opcionesTipoDxEgresoActivas,
      this.tienePrincipalDxEgreso(),
    );
  }

  /**
   * Tipos DX del combo egreso:
   * - clasif. 4 si destino = fallecido
   * - clasif. 3 en el resto de destinos de egreso
   */
  get opcionesTipoDxEgresoActivas(): SubclasificacionDxOpcion[] {
    return this.destinoEgresoActivo === 'fallecido'
      ? this.opcionesSubclasificacionEgresoFallecido
      : this.opcionesSubclasificacionEgreso;
  }

  /** True si la lista de egreso ya tiene un DX Principal. */
  tienePrincipalDxEgreso(): boolean {
    return this.egresoDxLista.some((d) =>
      this.esIdSubclasifEgresoPrincipal(Number(d.idSubclasificacionDx)),
    );
  }

  /** Principal ya usado → esa opción del combo se deshabilita. */
  tipoDxEgresoOpcionBloqueada(o: SubclasificacionDxOpcion): boolean {
    return esTipoDxEgresoPrincipal(o) && this.tienePrincipalDxEgreso();
  }

  private esIdSubclasifEgresoPrincipal(id: number): boolean {
    if (id <= 0) return false;
    const o = this.opcionesTipoDxEgresoActivas.find((x) => x.id === id);
    return o ? esTipoDxEgresoPrincipal(o) : false;
  }

  /** Ajusta tipo del borrador (y filas) al catálogo 3/4 según destino activo. */
  private sincronizarTipoDxEgresoConDestino(): void {
    const opts = this.opcionesTipoDxEgresoActivas;
    const clave = this.destinoEgresoActivo;
    // Filtrar solo la lista de la tarjeta activa (no mezcla entre destinos).
    if (opts.length > 0 && clave && clave !== 'referencia') {
      this.egresoDxPorDestino[clave] = this.egresoDxPorDestino[clave].filter(
        (d) => opts.some((o) => o.id === Number(d.idSubclasificacionDx)),
      );
    }
    const idSub = this.idSubclasifDefaultEgreso();
    const idActual = Number(this.borradorDxEgreso.idSubclasificacionDx) || 0;
    const tipoSigueValido = opts.some((o) => o.id === idActual);
    const principalBloqueado =
      this.esIdSubclasifEgresoPrincipal(idActual) && this.tienePrincipalDxEgreso();
    if (!tipoSigueValido || principalBloqueado) {
      this.borradorDxEgreso.idSubclasificacionDx = idSub;
      this.borradorDxEgreso.tipo = this.letraDeIdSubclasif(idSub);
    }
  }

  private letraDeIdSubclasif(id: number): 'P' | 'D' | 'R' {
    const enPa = this.opcionesSubclasificacionPa.find((o) => o.id === id);
    if (enPa) return enPa.letra;
    const enInterc = this.opcionesSubclasificacionInterc.find((o) => o.id === id);
    if (enInterc) return enInterc.letra;
    const enEgreso = this.opcionesSubclasificacionEgreso.find((o) => o.id === id);
    if (enEgreso) return enEgreso.letra;
    const enEgresoFal = this.opcionesSubclasificacionEgresoFallecido.find(
      (o) => o.id === id,
    );
    if (enEgresoFal) return enEgresoFal.letra;
    return 'P';
  }

  /** Texto del combo/lista: nombre completo (DescripcionLarga), sin letra. */
  nombreTipoDx(o: SubclasificacionDxOpcion): string {
    return nombreDesdeDescripcionLarga(o.descripcionLarga, o.descripcionCorta);
  }

  etiquetaTipoDxPa(idSubclasificacionDx: number | undefined | null): string {
    const id = Number(idSubclasificacionDx) || 0;
    const o = this.opcionesSubclasificacionPa.find((x) => x.id === id);
    return o ? this.nombreTipoDx(o) : '';
  }

  etiquetaTipoDxInterc(idSubclasificacionDx: number | undefined | null): string {
    const id = Number(idSubclasificacionDx) || 0;
    const o = this.opcionesSubclasificacionInterc.find((x) => x.id === id);
    return o ? this.nombreTipoDx(o) : '';
  }

  etiquetaTipoDxEgreso(idSubclasificacionDx: number | undefined | null): string {
    const id = Number(idSubclasificacionDx) || 0;
    const o =
      this.opcionesSubclasificacionEgreso.find((x) => x.id === id) ||
      this.opcionesSubclasificacionEgresoFallecido.find((x) => x.id === id);
    return o ? this.nombreTipoDx(o) : '';
  }

  /** Fallback UI si no hay idSubclasificacionDx en la fila. */
  nombreDesdeTipoLetra(tipo: string | undefined | null): string {
    const t = String(tipo ?? '').trim().toUpperCase();
    if (t === 'D') return 'Definitivo';
    if (t === 'R') return 'Repetido';
    if (t === 'P') return 'Presuntivo';
    return '';
  }

  private aplicarOpcionesMotivoInterconsulta(
    items: ICatalogoDescripcion[],
  ): void {
    this.opcionesMotivoInterconsulta = items;
    this.intercMotivoId = '';
  }

  /**
   * Combo Interconsultas — especialidad.
   * EXEC usp_go_Especialidades_Listar
   */
  async cargarEspecialidadesInterconsulta() {
    this.cargandoEspecialidades = true;
    this.errorEspecialidades = '';
    try {
      const items = await this.maestrosApi.getEspecialidadesListar();
      this.opcionesEspecialidad = Array.isArray(items) ? items : [];
      if (this.opcionesEspecialidad.length === 0) {
        this.errorEspecialidades =
          'Catálogo de especialidades vacío (revisar SP usp_go_Especialidades_Listar / API).';
      }
    } catch (err: unknown) {
      this.opcionesEspecialidad = [];
      this.errorEspecialidades =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudieron cargar las especialidades de interconsulta.';
    } finally {
      this.cargandoEspecialidades = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Egreso Hospitalización — Servicio que recibe.
   * EXEC usp_go_ListarServicios @IdTipoServicio
   */
  async cargarServiciosEgreso() {
    this.cargandoServiciosEgreso = true;
    this.errorServiciosEgreso = '';
    try {
      const items = await this.maestrosApi.getServicios(this.idTipoServicio);
      this.opcionesServicioEgreso = Array.isArray(items) ? items : [];
      if (this.opcionesServicioEgreso.length === 0) {
        this.errorServiciosEgreso =
          'Catálogo de servicios vacío (revisar SP usp_go_ListarServicios / API).';
      }
    } catch (err: unknown) {
      this.opcionesServicioEgreso = [];
      this.errorServiciosEgreso =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudieron cargar los servicios de egreso.';
    } finally {
      this.cargandoServiciosEgreso = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Bandeja + interconsulta — prioridad.
   * EXEC usp_go_Cat_Prioridad_PrimeraAtencion
   */
  async cargarPrioridadesPrimeraAtencion() {
    this.cargandoPrioridades = true;
    this.errorPrioridades = '';
    try {
      const items = await this.maestrosApi.getPrioridadesPrimeraAtencion();
      this.opcionesPrioridad = Array.isArray(items) ? items : [];
      if (this.opcionesPrioridad.length === 0) {
        this.errorPrioridades =
          'Catálogo de prioridades vacío (revisar SP usp_go_Cat_Prioridad_PrimeraAtencion / API).';
      }
    } catch (err: unknown) {
      this.opcionesPrioridad = [];
      this.errorPrioridades =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudieron cargar las prioridades.';
    } finally {
      this.cargandoPrioridades = false;
      this.cdr.detectChanges();
    }
  }

  formVacio() {
    return {
      anamnesisTipo: 'directa' as 'directa' | 'indirecta',
      tiempoEnfermedad: '',
      signosSintomas: '',
      relatoCronologico: '',
      antecedentes: '',
      /** Id del parámetro clínico (grupo 1) */
      estadoGeneral: '' as number | '',
      /** Id del parámetro clínico (grupo 2) */
      hidratacion: '' as number | '',
      /** Id del parámetro clínico (grupo 3) */
      conciencia: '' as number | '',
      pielAnexos: '',
      examenRegional: '',
      examenesImagenes: '',
      /** IdEspecialidad del SP usp_go_Especialidades_Listar */
      interconsulta: '' as number | '',
      procedimientos: '',
      referencia: '',
      evolucion: '',
      evaluacionEnfermeria: '',
      condicionEgreso: '' as number | '',
      fechaEgreso: '',
      horaEgreso: '',
    };
  }

  async handleBuscar() {
    this.cargando = true;
    this.error = '';
    this.mensaje = '';
    try {
      const items = await this.api.listarBandeja({
        filtro: this.filtro.trim() || undefined,
        idTipoServicio: this.idTipoServicio,
      });
      this.items = Array.isArray(items) ? items : [];
      // Recalcula espera FechaIngreso → ahora al refrescar la bandeja
      this.ahoraConsulta = new Date();
      this.aplicarFiltrosLocales();
      this.buscado = true;
    } catch (err: unknown) {
      this.items = [];
      this.itemsFiltrados = [];
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo obtener la bandeja de primera atención.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltrosLocales() {
    const fp = this.filtroPrioridad;
    const fe = this.filtroEstado.toLowerCase();
    this.itemsFiltrados = this.items.filter((p) => {
      const prio = String(this.idTipoPrioridad(p) || '');
      const est = this.estadoClave(p);
      const okPrio = !fp || prio === fp;
      const okEst = !fe || est === fe || (fe === 'curso' && est === 'curso');
      return okPrio && okEst;
    });
  }

  onFiltroLocalChange() {
    this.aplicarFiltrosLocales();
  }

  // ——— Acciones de bandeja ———

  iniciarAtencion(item: IFilaBackend) {
    void this.abrirAtencion(item, 'iniciar');
  }

  continuarAtencion(item: IFilaBackend) {
    void this.abrirAtencion(item, 'continuar');
  }

  private async abrirAtencion(item: IFilaBackend, modo: 'iniciar' | 'continuar') {
    const idAtencion = this.idAtencionActivo(item);
    if (!idAtencion) {
      this.mensaje =
        'No se pudo obtener IdAtencion de la fila (bandeja debe traer IdAtencion distinto de IdCuentaAtencion).';
      return;
    }
    if (!this.idCuentaAtencionActivo(item)) {
      this.mensaje =
        'No se pudo obtener IdCuentaAtencion de la fila seleccionada.';
      return;
    }

    this.persistencia.desactivar();
    this.pacienteSeleccionado = item;
    this.modoAtencion = modo;
    this.form = this.formVacio();
    this.resetPanelesEgreso();
    this.diagnosticos = [];
    this.resetBorradorDxPa();
    this.guardandoDxPa = false;
    this.eliminandoDxIndex = null;
    this.medicamentos = [];
    this.medicamentosVista = [];
    this.resetBarraAltaMed();
    this.guardandoAltaMed = false;
    this.errorMedicamentos = '';
    this.examenes = [];
    this.gruposExamenVista = [];
    this.resetBarraAltaExamen();
    this.guardandoAltaEx = false;
    this.eliminandoExIndex = null;
    this.errorEx = '';
    this.procedimientos = [];
    this.procedimientosVista = [];
    this.resetBarraAltaProc();
    this.guardandoAltaProc = false;
    this.eliminandoProcIndex = null;
    this.errorProc = '';
    this.intercDxLista = [];
    this.resetBorradorDxInterc();
    this.intercListaRegistradas = [];
    this.errorDxInterc = '';
    this.mensajeInterc = '';
    this.errorIntercLista = '';
    this.intercPrioridad = '';
    this.intercMotivoId = '';
    this.intercMotivoClinico = '';
    this.guardandoInterc = false;
    this.eliminandoIntercId = null;
    this.mensaje = '';
    this.error = '';
    this.pasoActivo = 'anamnesis';
    this.vista = 'atencion';

    try {
      const origen = await this.cargarBorrador(idAtencion);
      if (origen === 'nuevo') {
        this.fechaHoraAtencion = new Date();
        const payload = formToGuardarPayload(this.form, this.fechaHoraAtencion, this.opcionesEgreso);
        await this.persistencia.iniciarBorrador(
          idAtencion,
          payload.fechaAtencion,
          payload.tipoAnamnesis,
        );
        // Atención nueva: lista vacía; alta por fila borrador + Agregar.
        this.diagnosticos = [];
        this.resetBorradorDxPa();
        // Exámenes/procedimientos/medicamentos se agregan en pasos 4/6/7 tras elegir DX.
      } else {
        // Borrador existente (servidor o respaldo local): misma UX que Continuar.
        this.modoAtencion = 'continuar';
      }
      this.persistencia.activar(idAtencion);
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo abrir la atención.';
      const backup = this.persistencia.cargarSessionStorage(idAtencion);
      if (backup) {
        this.aplicarSessionBorrador(backup);
        this.modoAtencion = 'continuar';
        this.persistencia.activar(idAtencion);
      }
    }
    this.cdr.detectChanges();
  }

  /**
   * Cabecera: GET detalle. Diagnósticos: GET BD (fuente de verdad cross-máquina).
   * Sin fila vacía al recuperar.
   */
  private async cargarBorrador(idAtencion: number): Promise<OrigenBorradorPA> {
    try {
      const detalle = await this.api.obtenerDetalle(idAtencion);
      const mapped = detalleToForm(detalle);
      this.form = mapped.form;
      this.sincronizarPanelEgresoDesdeForm();
      this.rehidratarEgresoDesdeSession();
      this.fechaHoraAtencion = mapped.fechaHoraAtencion ?? new Date();
      this.persistencia.idPrimeraAtencion = mapped.idPrimeraAtencion;
      this.persistencia.estado = 'saved';
      this.persistencia.ultimoGuardado = new Date();
      await this.rehidratarDiagnosticosDesdeServidor(idAtencion);
      await this.rehidratarPlanTrabajoDesdeServidor(idAtencion);
      await this.rehidratarExamenesDesdeServidor(idAtencion);
      await this.rehidratarProcedimientosDesdeServidor(idAtencion);
      await this.rehidratarMedicamentosDesdeServidor(idAtencion);
      return 'servidor';
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 404) {
        const backup = this.persistencia.cargarSessionStorage(idAtencion);
        if (backup) {
          this.aplicarSessionBorrador(backup);
          return 'session';
        }
        return 'nuevo';
      }
      throw err;
    }
  }

  /** GET AtencionesDiagnosticos — sin línea en blanco. */
  private async rehidratarDiagnosticosDesdeServidor(idAtencion: number): Promise<void> {
    try {
      const items = await this.api.listarDiagnosticos(
        idAtencion,
        this.persistencia.idPrimeraAtencion,
      );
      this.aplicarDiagnosticosBorrador(
        diagnosticosDesdeApi(items, this.opcionesSubclasificacionPa),
      );
    } catch (err: unknown) {
      // Si falla el GET DX, no tumba la pantalla; deja lista vacía + Agregar.
      this.diagnosticos = [];
      this.resetBorradorDxPa();
      if (err instanceof ApiRequestError) {
        this.errorDx = err.message;
      }
    }
  }

  /** Plan-trabajo INT ya no se usa para interconsulta PA (SPs Interconsulta_*). */
  private async rehidratarPlanTrabajoDesdeServidor(
    _idAtencion: number,
  ): Promise<void> {
    // no-op: especialidad/solicitudes viven en usp_go_Interconsulta_*
  }

  /** GET procedimientos RecetaDetalle (IdPuntoCarga=26). */
  private async rehidratarProcedimientosDesdeServidor(
    idAtencion: number,
  ): Promise<void> {
    const ctx = this.idsContextoExamenGuardar();
    if (!ctx) {
      this.procedimientos = [];
      this.reconstruirVistaProcedimientos();
      this.resetBarraAltaProc();
      return;
    }
    try {
      const items = await this.api.listarProcedimientos(idAtencion, {
        idCuentaAtencion: ctx.idCuentaAtencion,
        idPrimeraAtencion: this.persistencia.idPrimeraAtencion,
      });
      this.procedimientos = procedimientosDesdeApi(items);
      this.vincularHuerfanosProcAlPrimerDx();
      this.reconstruirVistaProcedimientos();
      this.resetBarraAltaProc();
      this.errorProc = '';
    } catch (err: unknown) {
      this.procedimientos = [];
      this.reconstruirVistaProcedimientos();
      this.resetBarraAltaProc();
      if (err instanceof ApiRequestError) {
        this.errorProc = err.message;
      }
    }
  }

  /** GET exámenes RecetaDetalle (SP excluye IdPuntoCarga farmacia = 5). */
  private async rehidratarExamenesDesdeServidor(
    idAtencion: number,
  ): Promise<void> {
    const ctx = this.idsContextoExamenGuardar();
    if (!ctx) {
      this.examenes = [];
      this.reconstruirGruposExamenes();
      this.resetBarraAltaExamen();
      return;
    }
    try {
      const items = await this.api.listarExamenes(idAtencion, {
        idCuentaAtencion: ctx.idCuentaAtencion,
        idPrimeraAtencion: this.persistencia.idPrimeraAtencion,
      });
      this.examenes = examenesDesdeApi(items);
      this.reconstruirGruposExamenes();
      this.resetBarraAltaExamen();
      this.errorEx = '';
    } catch (err: unknown) {
      this.examenes = [];
      this.reconstruirGruposExamenes();
      this.resetBarraAltaExamen();
      if (err instanceof ApiRequestError) {
        this.errorEx = err.message;
      }
    }
  }

  /** GET medicamentos RecetaDetalle — sin fila vacía. */
  private async rehidratarMedicamentosDesdeServidor(
    idAtencion: number,
  ): Promise<void> {
    const ctx = this.idsContextoMedicamento();
    if (!ctx) {
      this.medicamentos = [];
      this.reconstruirVistaMedicamentos();
      this.resetBarraAltaMed();
      return;
    }
    try {
      const items = await this.api.listarMedicamentos(idAtencion, {
        idCuentaAtencion: ctx.idCuentaAtencion,
        idPrimeraAtencion: this.persistencia.idPrimeraAtencion,
        // Backend filtra siempre farmacia (=5); el valor de bandeja no aplica.
        idPuntoCarga: 5,
      });
      this.medicamentos = medicamentosDesdeApi(items);
      this.enriquecerEtiquetasMedicamentos();
      this.reconstruirVistaMedicamentos();
      this.resetBarraAltaMed();
      this.errorMedicamentos = '';
    } catch (err: unknown) {
      this.medicamentos = [];
      this.reconstruirVistaMedicamentos();
      this.resetBarraAltaMed();
      if (err instanceof ApiRequestError) {
        this.errorMedicamentos = err.message;
      }
    }
  }

  /** Completa textos de dosis/unidad/frecuencia/vía desde catálogos locales. */
  private enriquecerEtiquetasMedicamentos(): void {
    for (const m of this.medicamentos) {
      if (m.idDosis !== '' && !m.dosis) {
        const d = this.catalogoDosis.find((x) => x.idDosis === m.idDosis);
        if (d) m.dosis = String(d.numeroDosis);
      }
      if (m.idUNIDDosis !== '' && !m.unidad) {
        const u = this.catalogoUnidades.find(
          (x) => x.idUNIDDosis === m.idUNIDDosis,
        );
        if (u) m.unidad = u.numeroUNIDDosis || '';
      }
      if (m.idFrecuencia !== '' && !m.frecuencia) {
        const f = this.catalogoFrecuencias.find(
          (x) => x.idFrecuencia === m.idFrecuencia,
        );
        if (f) m.frecuencia = f.descripcion || '';
      }
    }
  }

  private aplicarSessionBorrador(backup: SessionBorradorPA) {
    this.form = { ...backup.form };
    this.sincronizarPanelEgresoDesdeForm();
    this.rehidratarEgresoDesdeSession();
    this.fechaHoraAtencion = backup.fechaHoraAtencion
      ? new Date(backup.fechaHoraAtencion)
      : new Date();
    this.persistencia.idPrimeraAtencion = backup.idPrimeraAtencion;
    this.persistencia.estado = 'saved';
    this.persistencia.ultimoGuardado = new Date(backup.guardadoEn);
    // Session: solo filas ya en BD; alta incompleta se descarta (usar Agregar).
    this.aplicarDiagnosticosBorrador(backup.diagnosticos);
    this.mensaje = 'Se recuperó un borrador local de respaldo.';
  }

  private aplicarDiagnosticosBorrador(
    filas: DiagnosticoBorradorPA[] | undefined,
  ): void {
    const normalizados = normalizarDiagnosticosBorrador(filas, {
      incluirFilaVaciaSiNada: false,
      idSubclasificacionDefault: this.idSubclasifDefaultPa(),
      catalogo: this.opcionesSubclasificacionPa,
    });
    this.diagnosticos = normalizados.filter(
      (d) => d.idAtencionDiagnostico != null && d.idAtencionDiagnostico > 0,
    );
    this.resetBorradorDxPa();
  }

  onFormChange() {
    this.persistencia.marcarDirty();
  }

  /** Limpia error de un campo al editarlo (feedback incremental). */
  onCampoEditadoPa(campoId: string): void {
    if (tieneErrorCampo(this.erroresCamposPaso, campoId)) {
      this.erroresCamposPaso = quitarErrorCampo(this.erroresCamposPaso, campoId);
    }
    this.onFormChange();
  }

  campoInvalidoPa(campoId: string): boolean {
    return tieneErrorCampo(this.erroresCamposPaso, campoId);
  }

  mensajeCampoPa(campoId: string): string | null {
    return mensajeDeCampo(this.erroresCamposPaso, campoId);
  }

  private mostrarErroresPasoPa(paso: PasoAtencionPa = this.pasoActivo): boolean {
    this.erroresCamposPaso = obtenerErroresCamposPasoPa(
      paso,
      this.contextoValidacionPa(),
    );
    this.cdr.detectChanges();
    if (this.erroresCamposPaso.length > 0) {
      setTimeout(() => this.resumenErroresUi?.enfocar(), 0);
      return true;
    }
    return false;
  }

  private limpiarErroresPasoPa(): void {
    this.erroresCamposPaso = [];
  }

  enfocarAnclaPa(anclaOCampo: string): void {
    const el =
      document.getElementById(anclaOCampo) ||
      document.getElementById(
        this.erroresCamposPaso.find((e) => e.campoId === anclaOCampo)?.ancla ||
          '',
      );
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if ('focus' in el && typeof (el as HTMLElement).focus === 'function') {
      (el as HTMLElement).focus();
    }
  }

  /** Cambios de diagnósticos: solo sessionStorage (no PATCH cabecera). */
  onDiagnosticoChange() {
    this.persistencia.marcarBorradorLocal();
  }

  /**
   * IdAtencion clínico de bandeja (Tab_PrimeraAtencion / path PA).
   * NO usar IdCuentaAtencion: pueden diferir.
   */
  idAtencionActivo(item?: IFilaBackend | null): number | null {
    const p = item ?? this.pacienteSeleccionado;
    if (!p) return null;
    const id = campoNum(p, ['IdAtencion', 'idAtencion']);
    return id > 0 ? id : null;
  }

  /**
   * IdCuentaAtencion HIS (recetas med/exa/pro).
   * NO usar IdAtencion como fallback.
   */
  idCuentaAtencionActivo(item?: IFilaBackend | null): number | null {
    const p = item ?? this.pacienteSeleccionado;
    if (!p) return null;
    const id = campoNum(p, ['IdCuentaAtencion', 'idCuentaAtencion']);
    return id > 0 ? id : null;
  }

  async volverBandeja() {
    await this.persistencia.flush();
    // Conserva borrador local (cabecera + DX) para Continuar / F5.
    this.persistencia.guardarSessionStorage();
    this.persistencia.desactivar();
    this.vista = 'bandeja';
    this.pacienteSeleccionado = null;
    this.fechaHoraAtencion = null;
    this.pasoActivo = 'anamnesis';
    this.resetBorradorDxPa();
    this.resetBarraAltaMed();
    this.handleBuscar();
  }

  get esPrimerPasoPa(): boolean {
    return this.indicePasoPa() <= 0;
  }

  get esUltimoPasoPa(): boolean {
    return this.indicePasoPa() >= PASOS_ATENCION_PA.length - 1;
  }

  seleccionarPasoPa(id: PasoAtencionPa) {
    if (!this.puedeNavegarAPasoPa(id)) {
      this.mostrarErroresPasoPa(this.pasoActivo);
      return;
    }
    this.limpiarErroresPasoPa();
    this.pasoActivo = id;
    if (id === 'diagnosticos') {
      this.asegurarBorradorDxPaDefault();
    }
    if (id === 'examenes') {
      this.asegurarDxActivoExamen();
    }
    if (id === 'procedimientos') {
      this.asegurarDxActivoProc();
    }
    if (id === 'medicamentos') {
      this.asegurarDxActivoMed();
    }
    if (id === 'interconsulta') {
      this.asegurarBorradorDxIntercDefault();
      void this.cargarListaInterconsultas();
    }
    this.cdr.detectChanges();
  }

  /**
   * Índice máximo al que se puede ir: pasos completados + el primero incompleto.
   * Cierre solo si todos los anteriores validan.
   */
  indiceMaximoAlcanzablePa(): number {
    const ctx = this.contextoValidacionPa();
    let max = 0;
    for (let i = 0; i < PASOS_ATENCION_PA.length; i++) {
      const paso = PASOS_ATENCION_PA[i];
      if (paso.id === 'cierre') {
        return max;
      }
      const error = validarPasoActualPa(paso.id, ctx);
      if (error) {
        return i;
      }
      max = i + 1;
    }
    return PASOS_ATENCION_PA.length - 1;
  }

  puedeNavegarAPasoPa(id: PasoAtencionPa): boolean {
    const dest = PASOS_ATENCION_PA.findIndex((p) => p.id === id);
    if (dest < 0) return false;
    return dest <= this.indiceMaximoAlcanzablePa();
  }

  pasoCompletadoPa(id: PasoAtencionPa): boolean {
    if (id === 'cierre') {
      return this.indiceMaximoAlcanzablePa() >= PASOS_ATENCION_PA.length - 1;
    }
    return validarPasoActualPa(id, this.contextoValidacionPa()) === null;
  }

  tituloPasoBloqueadoPa(id: PasoAtencionPa): string {
    if (this.puedeNavegarAPasoPa(id)) {
      return '';
    }
    return 'Complete los pasos anteriores antes de continuar';
  }

  irAnteriorPasoPa() {
    const i = this.indicePasoPa();
    if (i <= 0) return;
    this.seleccionarPasoPa(PASOS_ATENCION_PA[i - 1].id);
  }

  irSiguientePasoPa() {
    if (this.mostrarErroresPasoPa(this.pasoActivo)) {
      return;
    }
    this.limpiarErroresPasoPa();
    const i = this.indicePasoPa();
    if (i >= PASOS_ATENCION_PA.length - 1) return;
    this.seleccionarPasoPa(PASOS_ATENCION_PA[i + 1].id);
  }

  get resumenVerificacionPa(): ItemResumenVerificacionPa[] {
    return calcularResumenVerificacionPa(this.contextoValidacionPa());
  }

  get totalSeccionesCompletadasPa(): number {
    return this.resumenVerificacionPa.filter((item) => item.completado).length;
  }

  private contextoValidacionPa(): ContextoValidacionPa {
    return {
      form: {
        tiempoEnfermedad: this.form.tiempoEnfermedad,
        signosSintomas: this.form.signosSintomas,
        relatoCronologico: this.form.relatoCronologico,
        antecedentes: this.form.antecedentes,
        estadoGeneral: this.form.estadoGeneral,
        hidratacion: this.form.hidratacion,
        conciencia: this.form.conciencia,
        pielAnexos: this.form.pielAnexos,
        examenRegional: this.form.examenRegional,
        referencia: this.form.referencia,
        evolucion: this.form.evolucion,
        evaluacionEnfermeria: this.form.evaluacionEnfermeria,
        condicionEgreso: this.form.condicionEgreso,
        fechaEgreso: this.form.fechaEgreso,
        horaEgreso: this.form.horaEgreso,
      },
      diagnosticos: this.diagnosticos.map((d) => ({
        idDiagnostico: d.idDiagnostico,
        nombre: d.nombre,
        cie10: d.cie10,
      })),
      examenes: this.examenes.map((e) => ({
        nombre: e.nombre,
        idProducto: e.idProducto,
      })),
      procedimientos: this.procedimientos.map((p) => ({
        nombre: p.nombre,
        idProducto: p.idProducto,
      })),
      medicamentos: this.medicamentos.map((m) => ({
        idProducto: m.idProducto,
        nombre: m.nombre,
        cantidad: m.cantidad,
        dosis: m.dosis,
        idDosis: m.idDosis,
        unidad: m.unidad,
        idUNIDDosis: m.idUNIDDosis,
        frecuencia: m.frecuencia,
        idFrecuencia: m.idFrecuencia,
        idViaAdministracion: m.idViaAdministracion,
        duracion: m.duracion,
      })),
      tienePaciente: Boolean(this.pacienteSeleccionado),
    };
  }

  contarDiagnosticosPersistidos(): number {
    return this.diagnosticos.filter(
      (d) => d.idAtencionDiagnostico != null && d.idAtencionDiagnostico > 0,
    ).length;
  }

  etiquetaCondicionEgreso(): string {
    const id = this.form.condicionEgreso;
    if (id === '' || id == null) return 'Sin seleccionar';
    const op = this.opcionesEgreso.find((o) => o.id === id);
    const dest = this.destinosEgresoUi.find(
      (d) => d.codigo === (op?.codigo || '').toUpperCase(),
    );
    return dest?.nombre || op?.descripcion?.trim() || String(id);
  }

  medicoEgresoTexto(): string {
    if (!this.pacienteSeleccionado) return '—';
    const m = this.medico(this.pacienteSeleccionado);
    return m && m !== '—' ? m : this.nombreMedicoFirmantePa || '—';
  }

  servicioEgresoTexto(): string {
    if (!this.pacienteSeleccionado) return '—';
    return this.consultorio(this.pacienteSeleccionado) || '—';
  }

  idCondicionPorCodigoEgreso(codigo: string): number | '' {
    const cod = codigo.trim().toUpperCase();
    const op = this.opcionesEgreso.find(
      (o) => (o.codigo || '').trim().toUpperCase() === cod,
    );
    return op ? op.id : '';
  }

  claveDestinoDesdeCondicion(
    id: number | '' | null | undefined,
  ): DestinoEgresoClave | null {
    if (id === '' || id == null) return null;
    const op = this.opcionesEgreso.find((o) => o.id === id);
    const cod = (op?.codigo || '').trim().toUpperCase();
    const dest = this.destinosEgresoUi.find((d) => d.codigo === cod);
    return dest?.clave ?? null;
  }

  /**
   * Destino cuya alta ya se persistió (como máximo uno).
   * Contenido visible; las demás tarjetas se bloquean.
   */
  get egresoDestinoRegistrado(): DestinoEgresoConDx | null {
    if (this.altaDomicilioRegistrada) return 'domicilio';
    if (this.altaHospitalizacionRegistrada) return 'hospitalizacion';
    if (this.altaFugaRegistrada) return 'fuga';
    if (this.altaFallecidoRegistrada) return 'fallecido';
    return null;
  }

  get egresoYaRegistrado(): boolean {
    return this.egresoDestinoRegistrado != null;
  }

  get egresoDestinoRegistradoNombre(): string {
    const clave = this.egresoDestinoRegistrado;
    if (!clave) return '';
    return (
      this.destinosEgresoUi.find((d) => d.clave === clave)?.nombre ?? clave
    );
  }

  /** Campos del panel de alta en solo lectura (no borra contenido). */
  get egresoCamposSoloLectura(): boolean {
    return this.egresoYaRegistrado;
  }

  get egresoTieneDxPendientes(): boolean {
    return this.egresoDxLista.some(
      (dx) =>
        !(dx.idAtencionDiagnostico != null && dx.idAtencionDiagnostico > 0),
    );
  }

  /** DX: bloquear alta/edición si egreso OK y no hay pendientes. */
  get egresoDxEdicionBloqueada(): boolean {
    return this.egresoYaRegistrado && !this.egresoTieneDxPendientes;
  }

  get egresoGuardarDeshabilitado(): boolean {
    if (
      this.guardandoEgreso ||
      !this.destinoEgresoActivo ||
      this.destinoEgresoActivo === 'referencia'
    ) {
      return true;
    }
    if (this.egresoYaRegistrado && !this.egresoTieneDxPendientes) {
      return true;
    }
    return false;
  }

  destinoEgresoTarjetaBloqueada(clave: DestinoEgresoClave): boolean {
    if (clave === 'referencia') return true;
    const reg = this.egresoDestinoRegistrado;
    if (!reg) return false;
    return clave !== reg;
  }

  tituloTarjetaDestinoEgreso(d: {
    clave: DestinoEgresoClave;
    nombre: string;
  }): string {
    if (d.clave === 'referencia') {
      return 'Referencia no disponible en Primera Atención';
    }
    if (this.destinoEgresoTarjetaBloqueada(d.clave)) {
      const nombre = this.egresoDestinoRegistradoNombre;
      return nombre
        ? `Egreso ya registrado como «${nombre}». No se puede cambiar el destino.`
        : 'Destino no disponible';
    }
    return d.nombre;
  }

  badgeDestinoEgreso(clave: DestinoEgresoClave): string | null {
    if (!this.destinoEgresoTarjetaBloqueada(clave)) return null;
    return clave === 'referencia' ? 'Bloqueado' : 'No disponible';
  }

  /** Fija la tarjeta al destino ya registrado (tras alta o rehidratación). */
  private fijarDestinoEgresoRegistrado(): void {
    const reg = this.egresoDestinoRegistrado;
    if (!reg) return;
    this.destinoEgresoActivo = reg;
    const dest = this.destinosEgresoUi.find((d) => d.clave === reg);
    if (!dest) return;
    const id = this.idCondicionPorCodigoEgreso(dest.codigo);
    if (id !== '') this.form.condicionEgreso = id;
    this.aplicarFechaHoraPanelActivoAlForm();
    this.sincronizarTipoDxEgresoConDestino();
  }

  seleccionarDestinoEgreso(clave: DestinoEgresoClave): void {
    const dest = this.destinosEgresoUi.find((d) => d.clave === clave);
    if (!dest || this.destinoEgresoTarjetaBloqueada(clave)) return;
    const id = this.idCondicionPorCodigoEgreso(dest.codigo);
    if (id === '') {
      this.mensaje =
        `No se encontró la condición de egreso «${dest.codigo}» en el catálogo.`;
      return;
    }
    this.destinoEgresoActivo = clave;
    this.form.condicionEgreso = id;
    this.aplicarFechaHoraPanelActivoAlForm();
    this.sincronizarTipoDxEgresoConDestino();
    this.mensajeEgreso = '';
    this.errorEgreso = '';
    // Egreso: solo local hasta tablas/API propias (no flush cabecera).
    this.cdr.detectChanges();
  }

  /** Fecha/hora del panel activo → form (local; Guardar Egreso persiste session). */
  onFechaHoraEgresoPanelChange(): void {
    this.aplicarFechaHoraPanelActivoAlForm();
    this.mensajeEgreso = '';
    this.errorEgreso = '';
  }

  /** Une fecha+hora a valor de input datetime-local (YYYY-MM-DDTHH:mm). */
  combinarFechaHoraEgreso(fecha: string, hora: string): string {
    const f = String(fecha ?? '').trim();
    const h = String(hora ?? '').trim().slice(0, 5);
    if (!f || !h || !h.includes(':')) return '';
    return `${f}T${h}`;
  }

  /** Parte datetime-local → { fecha, hora }; vacío si falta alguna parte. */
  partirFechaHoraEgreso(valor: string): { fecha: string; hora: string } {
    const raw = String(valor ?? '').trim();
    if (!raw || !raw.includes('T')) return { fecha: '', hora: '' };
    const [fechaPart, resto = ''] = raw.split('T');
    const fecha = fechaPart.trim();
    const hora = resto.trim().slice(0, 5);
    if (!fecha || !hora || !hora.includes(':')) {
      return { fecha: '', hora: '' };
    }
    return { fecha, hora };
  }

  onFechaHoraEgresoPanelInput(
    valor: string,
    clave: DestinoEgresoClave,
  ): void {
    if (clave === 'referencia') return;
    const { fecha, hora } = this.partirFechaHoraEgreso(valor);
    this.setFechaHoraEnPanel(clave, fecha, hora);
    this.onFechaHoraEgresoPanelChange();
  }

  onFechaHoraUltimoContactoInput(valor: string): void {
    const { fecha, hora } = this.partirFechaHoraEgreso(valor);
    this.egresoFuga.fechaUltimoContacto = fecha;
    this.egresoFuga.horaUltimoContacto = hora;
    this.onCampoEgresoLocalChange();
  }

  onCampoEgresoLocalChange(): void {
    this.mensajeEgreso = '';
    this.errorEgreso = '';
  }

  /**
   * Guarda egreso:
   * - Domicilio / Hospitalización / Fuga → API alta + DX clasif.3.
   * - Fallecido → API alta + DX clasif.4.
   * - Otros destinos → borrador local (session) hasta su SP.
   */
  guardarEgresoLocal(): void {
    void this.guardarEgresoAsync();
  }

  private async guardarEgresoAsync(): Promise<void> {
    if (this.guardandoEgreso) return;
    this.mensajeEgreso = '';
    this.errorEgreso = '';
    const clave = this.destinoEgresoActivo;
    if (!clave || clave === 'referencia') {
      this.errorEgreso = 'Seleccione un destino de egreso.';
      this.cdr.detectChanges();
      return;
    }
    const fh = this.fechaHoraDelPanel(clave);
    if (!fh?.fecha?.trim() || !fh?.hora?.trim()) {
      this.errorEgreso =
        'Complete la fecha y hora del caso seleccionado (ambos valores).';
      this.cdr.detectChanges();
      return;
    }
    this.aplicarFechaHoraPanelActivoAlForm();

    if (clave === 'domicilio') {
      await this.guardarEgresoDomicilioApi();
      return;
    }
    if (clave === 'hospitalizacion') {
      await this.guardarEgresoHospitalizacionApi();
      return;
    }
    if (clave === 'fuga') {
      await this.guardarEgresoFugaApi();
      return;
    }
    if (clave === 'fallecido') {
      await this.guardarEgresoFallecidoApi();
      return;
    }

    this.persistirEgresoSession();
    this.errorEgreso = '';
    this.mensajeEgreso =
      'Egreso guardado localmente (API de este destino pendiente).';
    this.cdr.detectChanges();
  }

  /** Mapeo radios fuga → IdNotificacionFuga (1|2|3). */
  private idNotificacionFugaDesdeUi(): number | null {
    switch (this.egresoFuga.notificacion) {
      case 'seguridad':
        return 1;
      case 'familiar':
        return 2;
      case 'incidente':
        return 3;
      default:
        return null;
    }
  }

  private async guardarEgresoDomicilioApi(): Promise<void> {
    const d = this.egresoDomicilio;
    if (!d.tipoAlta || Number(d.tipoAlta) <= 0) {
      this.errorEgreso = 'Seleccione el tipo de alta.';
      this.cdr.detectChanges();
      return;
    }
    if (!d.condicionAlta || Number(d.condicionAlta) <= 0) {
      this.errorEgreso = 'Seleccione la condición de alta.';
      this.cdr.detectChanges();
      return;
    }
    if (this.egresoDxLista.length === 0) {
      this.errorEgreso = 'Agregue al menos un diagnóstico de egreso.';
      this.cdr.detectChanges();
      return;
    }
    const nPrincipal = this.egresoDxLista.filter((d) =>
      this.esIdSubclasifEgresoPrincipal(Number(d.idSubclasificacionDx)),
    ).length;
    if (nPrincipal > 1) {
      this.errorEgreso =
        'Solo puede haber un diagnóstico Principal de egreso.';
      this.cdr.detectChanges();
      return;
    }

    const ctx = this.idsContextoEgresoDomicilio();
    if (!ctx) {
      this.errorEgreso =
        'Faltan IdAtencion / IdEpisodio / IdPaciente / IdMedico / IdServicio / IdPrimeraAtencion.';
      this.cdr.detectChanges();
      return;
    }

    const pendientes = this.egresoDxLista.filter(
      (dx) =>
        !(dx.idAtencionDiagnostico != null && dx.idAtencionDiagnostico > 0),
    );
    if (pendientes.length === 0 && this.altaDomicilioRegistrada) {
      this.mensajeEgreso = 'Egreso a domicilio ya está registrado.';
      this.errorEgreso = '';
      this.persistirEgresoSession();
      this.cdr.detectChanges();
      return;
    }

    this.guardandoEgreso = true;
    this.cdr.detectChanges();

    try {
      if (!this.altaDomicilioRegistrada) {
        const fechaEgreso = this.combinarFechaHoraEgreso(d.fecha, d.hora);
        const idDestinoDom = this.idCondicionPorCodigoEgreso('ALT');
        const respAlta = await this.api.registrarAltaDomicilio(ctx.idAtencion, {
          idEpisodio: ctx.idEpisodio,
          idMedicoEgreso: ctx.idMedicoEgreso,
          fechaEgreso,
          idTipoAlta: Number(d.tipoAlta),
          idCondicionAlta: Number(d.condicionAlta),
          idPronostico:
            d.pronostico !== '' && Number(d.pronostico) > 0
              ? Number(d.pronostico)
              : null,
          recomendacion: (d.recomendaciones || '').trim(),
          idServicioEgreso: ctx.idServicioEgreso,
          idDestinoAtencion:
            idDestinoDom !== '' && Number(idDestinoDom) > 0
              ? Number(idDestinoDom)
              : null,
        });
        this.altaDomicilioRegistrada = true;
        this.fijarDestinoEgresoRegistrado();
        this.persistirEgresoSession();
        if (!respAlta?.resultado || respAlta.resultado < 1) {
          // Si el API respondió 200 con resultado, el handler ya validó; por si acaso.
        }
      }

      let okDx = 0;
      let failDx = 0;
      const erroresDx: string[] = [];
      for (const dx of pendientes) {
        const idDx = Number(dx.idDiagnostico);
        if (!idDx || !dx.idSubclasificacionDx) {
          failDx += 1;
          erroresDx.push('Diagnóstico incompleto en la lista.');
          continue;
        }
        try {
          // DX egreso: IdPrimeraAtencion = NULL (no amarran a PA).
          const resp = await this.api.registrarDiagnosticos(ctx.idAtencion, {
            idPaciente: ctx.idPaciente,
            idPrimeraAtencion: null,
            idEpisodio: ctx.idEpisodio,
            idClasificacionDx: ID_CLASIFICACION_DX_EGRESO,
            diagnosticos: [
              {
                idDiagnostico: idDx,
                idSubclasificacionDx: dx.idSubclasificacionDx,
                tipo: dx.tipo,
              },
            ],
          });
          const idAD = resp.resultados?.[0]?.idAtencionDiagnostico ?? 0;
          if (idAD > 0) {
            dx.idAtencionDiagnostico = idAD;
            okDx += 1;
          } else {
            failDx += 1;
            erroresDx.push(
              `${dx.cie10 || idDx}: sin IdAtencionDiagnostico en respuesta.`,
            );
          }
        } catch (err: unknown) {
          failDx += 1;
          const msg =
            err instanceof ApiRequestError
              ? err.message
              : 'Error al registrar diagnóstico.';
          erroresDx.push(`${dx.cie10 || idDx}: ${msg}`);
        }
      }

      this.persistirEgresoSession();
      const totalPend = pendientes.length;
      if (failDx === 0) {
        this.errorEgreso = '';
        this.mensajeEgreso =
          totalPend === 0
            ? 'Egreso a domicilio registrado.'
            : `Egreso a domicilio registrado. Diagnósticos: ${okDx} de ${totalPend}.`;
      } else {
        this.mensajeEgreso = '';
        this.errorEgreso = `Alta OK. Diagnósticos: ${okDx} de ${totalPend}. Reintente los ${failDx} pendientes. ${erroresDx.slice(0, 2).join(' | ')}`;
      }
    } catch (err: unknown) {
      this.mensajeEgreso = '';
      this.errorEgreso =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo registrar el egreso a domicilio.';
    } finally {
      this.guardandoEgreso = false;
      this.cdr.detectChanges();
    }
  }

  /** Hospitalización: alta (MotivoTraslado) + DX clasif.3 — mismo patrón que domicilio. */
  private async guardarEgresoHospitalizacionApi(): Promise<void> {
    const h = this.egresoHospitalizacion;
    if (!h.idServicioRecibe || Number(h.idServicioRecibe) <= 0) {
      this.errorEgreso = 'Seleccione el servicio que recibe.';
      this.cdr.detectChanges();
      return;
    }
    const idDestinoAtencion = this.idCondicionPorCodigoEgreso('HOS');
    if (idDestinoAtencion === '' || Number(idDestinoAtencion) <= 0) {
      this.errorEgreso =
        'No se encontró la condición de egreso «HOS» en el catálogo.';
      this.cdr.detectChanges();
      return;
    }
    if (this.egresoDxLista.length === 0) {
      this.errorEgreso = 'Agregue al menos un diagnóstico de egreso.';
      this.cdr.detectChanges();
      return;
    }
    const nPrincipal = this.egresoDxLista.filter((d) =>
      this.esIdSubclasifEgresoPrincipal(Number(d.idSubclasificacionDx)),
    ).length;
    if (nPrincipal > 1) {
      this.errorEgreso =
        'Solo puede haber un diagnóstico Principal de egreso.';
      this.cdr.detectChanges();
      return;
    }

    const ctx = this.idsContextoEgresoHospitalizacion();
    if (!ctx) {
      this.errorEgreso =
        'Faltan IdAtencion / IdEpisodio / IdPaciente / IdMedico.';
      this.cdr.detectChanges();
      return;
    }

    const pendientes = this.egresoDxLista.filter(
      (dx) =>
        !(dx.idAtencionDiagnostico != null && dx.idAtencionDiagnostico > 0),
    );
    if (pendientes.length === 0 && this.altaHospitalizacionRegistrada) {
      this.mensajeEgreso = 'Egreso a hospitalización ya está registrado.';
      this.errorEgreso = '';
      this.persistirEgresoSession();
      this.cdr.detectChanges();
      return;
    }

    this.guardandoEgreso = true;
    this.cdr.detectChanges();

    try {
      if (!this.altaHospitalizacionRegistrada) {
        const fechaEgreso = this.combinarFechaHoraEgreso(h.fecha, h.hora);
        await this.api.registrarAltaHospitalizacion(ctx.idAtencion, {
          idEpisodio: ctx.idEpisodio,
          idMedicoEgreso: ctx.idMedicoEgreso,
          fechaEgreso,
          idServicioEgreso: Number(h.idServicioRecibe),
          idDestinoAtencion: Number(idDestinoAtencion),
          motivoTraslado: (h.motivo || '').trim(),
        });
        this.altaHospitalizacionRegistrada = true;
        this.fijarDestinoEgresoRegistrado();
        this.persistirEgresoSession();
      }

      let okDx = 0;
      let failDx = 0;
      const erroresDx: string[] = [];
      for (const dx of pendientes) {
        const idDx = Number(dx.idDiagnostico);
        if (!idDx || !dx.idSubclasificacionDx) {
          failDx += 1;
          erroresDx.push('Diagnóstico incompleto en la lista.');
          continue;
        }
        try {
          const resp = await this.api.registrarDiagnosticos(ctx.idAtencion, {
            idPaciente: ctx.idPaciente,
            idPrimeraAtencion: null,
            idEpisodio: ctx.idEpisodio,
            idClasificacionDx: ID_CLASIFICACION_DX_EGRESO,
            diagnosticos: [
              {
                idDiagnostico: idDx,
                idSubclasificacionDx: dx.idSubclasificacionDx,
                tipo: dx.tipo,
              },
            ],
          });
          const idAD = resp.resultados?.[0]?.idAtencionDiagnostico ?? 0;
          if (idAD > 0) {
            dx.idAtencionDiagnostico = idAD;
            okDx += 1;
          } else {
            failDx += 1;
            erroresDx.push(
              `${dx.cie10 || idDx}: sin IdAtencionDiagnostico en respuesta.`,
            );
          }
        } catch (err: unknown) {
          failDx += 1;
          const msg =
            err instanceof ApiRequestError
              ? err.message
              : 'Error al registrar diagnóstico.';
          erroresDx.push(`${dx.cie10 || idDx}: ${msg}`);
        }
      }

      this.persistirEgresoSession();
      const totalPend = pendientes.length;
      if (failDx === 0) {
        this.errorEgreso = '';
        this.mensajeEgreso =
          totalPend === 0
            ? 'Egreso a hospitalización registrado.'
            : `Egreso a hospitalización registrado. Diagnósticos: ${okDx} de ${totalPend}.`;
      } else {
        this.mensajeEgreso = '';
        this.errorEgreso = `Alta OK. Diagnósticos: ${okDx} de ${totalPend}. Reintente los ${failDx} pendientes. ${erroresDx.slice(0, 2).join(' | ')}`;
      }
    } catch (err: unknown) {
      this.mensajeEgreso = '';
      this.errorEgreso =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo registrar el egreso a hospitalización.';
    } finally {
      this.guardandoEgreso = false;
      this.cdr.detectChanges();
    }
  }

  /** Fuga: FechaEgreso=fuga; FechaFuga=último contacto; DX clasif.3. */
  private async guardarEgresoFugaApi(): Promise<void> {
    const f = this.egresoFuga;
    const idDestinoAtencion = this.idCondicionPorCodigoEgreso('FUG');
    if (idDestinoAtencion === '' || Number(idDestinoAtencion) <= 0) {
      this.errorEgreso =
        'No se encontró la condición de egreso «FUG» en el catálogo.';
      this.cdr.detectChanges();
      return;
    }
    if (this.egresoDxLista.length === 0) {
      this.errorEgreso = 'Agregue al menos un diagnóstico de egreso.';
      this.cdr.detectChanges();
      return;
    }
    const nPrincipal = this.egresoDxLista.filter((d) =>
      this.esIdSubclasifEgresoPrincipal(Number(d.idSubclasificacionDx)),
    ).length;
    if (nPrincipal > 1) {
      this.errorEgreso =
        'Solo puede haber un diagnóstico Principal de egreso.';
      this.cdr.detectChanges();
      return;
    }

    const ctx = this.idsContextoEgresoDomicilio();
    if (!ctx) {
      this.errorEgreso =
        'Faltan IdAtencion / IdEpisodio / IdPaciente / IdMedico / IdServicio.';
      this.cdr.detectChanges();
      return;
    }

    const pendientes = this.egresoDxLista.filter(
      (dx) =>
        !(dx.idAtencionDiagnostico != null && dx.idAtencionDiagnostico > 0),
    );
    if (pendientes.length === 0 && this.altaFugaRegistrada) {
      this.mensajeEgreso = 'Egreso por fuga ya está registrado.';
      this.errorEgreso = '';
      this.persistirEgresoSession();
      this.cdr.detectChanges();
      return;
    }

    this.guardandoEgreso = true;
    this.cdr.detectChanges();

    try {
      if (!this.altaFugaRegistrada) {
        const fechaEgreso = this.combinarFechaHoraEgreso(f.fecha, f.hora);
        const fechaFuga =
          f.fechaUltimoContacto?.trim() && f.horaUltimoContacto?.trim()
            ? this.combinarFechaHoraEgreso(
                f.fechaUltimoContacto,
                f.horaUltimoContacto,
              )
            : undefined;
        await this.api.registrarAltaFuga(ctx.idAtencion, {
          idEpisodio: ctx.idEpisodio,
          idMedicoEgreso: ctx.idMedicoEgreso,
          fechaEgreso,
          fechaFuga,
          idServicioEgreso: ctx.idServicioEgreso,
          idDestinoAtencion: Number(idDestinoAtencion),
          reportaFuga: (f.reportadoPor || '').trim(),
          idNotificacionFuga: this.idNotificacionFugaDesdeUi(),
          observaciones: (f.observaciones || '').trim(),
        });
        this.altaFugaRegistrada = true;
        this.fijarDestinoEgresoRegistrado();
        this.persistirEgresoSession();
      }

      let okDx = 0;
      let failDx = 0;
      const erroresDx: string[] = [];
      for (const dx of pendientes) {
        const idDx = Number(dx.idDiagnostico);
        if (!idDx || !dx.idSubclasificacionDx) {
          failDx += 1;
          erroresDx.push('Diagnóstico incompleto en la lista.');
          continue;
        }
        try {
          const resp = await this.api.registrarDiagnosticos(ctx.idAtencion, {
            idPaciente: ctx.idPaciente,
            idPrimeraAtencion: null,
            idEpisodio: ctx.idEpisodio,
            idClasificacionDx: ID_CLASIFICACION_DX_EGRESO,
            diagnosticos: [
              {
                idDiagnostico: idDx,
                idSubclasificacionDx: dx.idSubclasificacionDx,
                tipo: dx.tipo,
              },
            ],
          });
          const idAD = resp.resultados?.[0]?.idAtencionDiagnostico ?? 0;
          if (idAD > 0) {
            dx.idAtencionDiagnostico = idAD;
            okDx += 1;
          } else {
            failDx += 1;
            erroresDx.push(
              `${dx.cie10 || idDx}: sin IdAtencionDiagnostico en respuesta.`,
            );
          }
        } catch (err: unknown) {
          failDx += 1;
          const msg =
            err instanceof ApiRequestError
              ? err.message
              : 'Error al registrar diagnóstico.';
          erroresDx.push(`${dx.cie10 || idDx}: ${msg}`);
        }
      }

      this.persistirEgresoSession();
      const totalPend = pendientes.length;
      if (failDx === 0) {
        this.errorEgreso = '';
        this.mensajeEgreso =
          totalPend === 0
            ? 'Egreso por fuga registrado.'
            : `Egreso por fuga registrado. Diagnósticos: ${okDx} de ${totalPend}.`;
      } else {
        this.mensajeEgreso = '';
        this.errorEgreso = `Alta OK. Diagnósticos: ${okDx} de ${totalPend}. Reintente los ${failDx} pendientes. ${erroresDx.slice(0, 2).join(' | ')}`;
      }
    } catch (err: unknown) {
      this.mensajeEgreso = '';
      this.errorEgreso =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo registrar el egreso por fuga.';
    } finally {
      this.guardandoEgreso = false;
      this.cdr.detectChanges();
    }
  }

  /** Fallecido: alta + DX clasif.4; familiar → Observaciones. */
  private async guardarEgresoFallecidoApi(): Promise<void> {
    const f = this.egresoFallecido;
    const idDestinoAtencion = this.idCondicionPorCodigoEgreso('FAL');
    if (idDestinoAtencion === '' || Number(idDestinoAtencion) <= 0) {
      this.errorEgreso =
        'No se encontró la condición de egreso «FAL» en el catálogo.';
      this.cdr.detectChanges();
      return;
    }
    if (this.egresoDxLista.length === 0) {
      this.errorEgreso = 'Agregue al menos un diagnóstico de egreso.';
      this.cdr.detectChanges();
      return;
    }
    const nPrincipal = this.egresoDxLista.filter((d) =>
      this.esIdSubclasifEgresoPrincipal(Number(d.idSubclasificacionDx)),
    ).length;
    if (nPrincipal > 1) {
      this.errorEgreso =
        'Solo puede haber un diagnóstico Principal de egreso.';
      this.cdr.detectChanges();
      return;
    }

    const ctx = this.idsContextoEgresoDomicilio();
    if (!ctx) {
      this.errorEgreso =
        'Faltan IdAtencion / IdEpisodio / IdPaciente / IdMedico / IdServicio.';
      this.cdr.detectChanges();
      return;
    }

    const pendientes = this.egresoDxLista.filter(
      (dx) =>
        !(dx.idAtencionDiagnostico != null && dx.idAtencionDiagnostico > 0),
    );
    if (pendientes.length === 0 && this.altaFallecidoRegistrada) {
      this.mensajeEgreso = 'Egreso por fallecido ya está registrado.';
      this.errorEgreso = '';
      this.persistirEgresoSession();
      this.cdr.detectChanges();
      return;
    }

    this.guardandoEgreso = true;
    this.cdr.detectChanges();

    try {
      if (!this.altaFallecidoRegistrada) {
        const idDestinoServicio = Number(f.destinoCadaver);
        const idTipoCertificado = Number(f.tipoCertificado);
        const idTiempoEstancia = Number(f.tiempoEstanciaDeceso);
        await this.api.registrarAltaFallecido(ctx.idAtencion, {
          idEpisodio: ctx.idEpisodio,
          idMedicoEgreso: ctx.idMedicoEgreso,
          fechaEgreso: this.combinarFechaHoraEgreso(f.fecha, f.hora),
          idServicioEgreso: ctx.idServicioEgreso,
          idDestinoAtencion: Number(idDestinoAtencion),
          idDestinoServicio:
            idDestinoServicio > 0 ? idDestinoServicio : null,
          idTipoCertificado:
            idTipoCertificado > 0 ? idTipoCertificado : null,
          actDefuncion: (f.nroCertificado || '').trim(),
          idtiempoEstanciaDeseso:
            idTiempoEstancia > 0 ? idTiempoEstancia : null,
          requiereAutopsia: this.requiereAutopsiaDesdeUi(),
          observaciones: (f.familiarInformado || '').trim(),
        });
        this.altaFallecidoRegistrada = true;
        this.fijarDestinoEgresoRegistrado();
        this.persistirEgresoSession();
      }

      let okDx = 0;
      let failDx = 0;
      const erroresDx: string[] = [];
      for (const dx of pendientes) {
        const idDx = Number(dx.idDiagnostico);
        if (!idDx || !dx.idSubclasificacionDx) {
          failDx += 1;
          erroresDx.push('Diagnóstico incompleto en la lista.');
          continue;
        }
        try {
          const resp = await this.api.registrarDiagnosticos(ctx.idAtencion, {
            idPaciente: ctx.idPaciente,
            idPrimeraAtencion: null,
            idEpisodio: ctx.idEpisodio,
            idClasificacionDx: ID_CLASIFICACION_DX_EGRESO_FALLECIDO,
            diagnosticos: [
              {
                idDiagnostico: idDx,
                idSubclasificacionDx: dx.idSubclasificacionDx,
                tipo: dx.tipo,
              },
            ],
          });
          const idAD = resp.resultados?.[0]?.idAtencionDiagnostico ?? 0;
          if (idAD > 0) {
            dx.idAtencionDiagnostico = idAD;
            okDx += 1;
          } else {
            failDx += 1;
            erroresDx.push(
              `${dx.cie10 || idDx}: sin IdAtencionDiagnostico en respuesta.`,
            );
          }
        } catch (err: unknown) {
          failDx += 1;
          const msg =
            err instanceof ApiRequestError
              ? err.message
              : 'Error al registrar diagnóstico.';
          erroresDx.push(`${dx.cie10 || idDx}: ${msg}`);
        }
      }

      this.persistirEgresoSession();
      const totalPend = pendientes.length;
      if (failDx === 0) {
        this.errorEgreso = '';
        this.mensajeEgreso =
          totalPend === 0
            ? 'Egreso por fallecido registrado.'
            : `Egreso por fallecido registrado. Diagnósticos: ${okDx} de ${totalPend}.`;
      } else {
        this.mensajeEgreso = '';
        this.errorEgreso = `Alta OK. Diagnósticos: ${okDx} de ${totalPend}. Reintente los ${failDx} pendientes. ${erroresDx.slice(0, 2).join(' | ')}`;
      }
    } catch (err: unknown) {
      this.mensajeEgreso = '';
      this.errorEgreso =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo registrar el egreso por fallecido.';
    } finally {
      this.guardandoEgreso = false;
      this.cdr.detectChanges();
    }
  }

  /** Radios necropsia → RequiereAutopsia (null si no eligió). */
  private requiereAutopsiaDesdeUi(): boolean | null {
    if (this.egresoFallecido.necropsia === 'si') return true;
    if (this.egresoFallecido.necropsia === 'no') return false;
    return null;
  }

  private idsContextoEgresoHospitalizacion(): {
    idAtencion: number;
    idEpisodio: number;
    idPaciente: number;
    idMedicoEgreso: number;
  } | null {
    const p = this.pacienteSeleccionado;
    if (!p) return null;
    const idAtencion = this.idAtencionActivo();
    const idEpisodio = campoNum(p, ['IdEpisodio', 'idEpisodio']);
    const idPaciente = campoNum(p, ['IdPaciente', 'idPaciente']);
    const idMedicoEgreso = campoNum(p, ['IdMedico', 'idMedico']);
    if (!idAtencion || !idEpisodio || !idPaciente || !idMedicoEgreso) {
      return null;
    }
    return { idAtencion, idEpisodio, idPaciente, idMedicoEgreso };
  }

  private idsContextoEgresoDomicilio(): {
    idAtencion: number;
    idEpisodio: number;
    idPaciente: number;
    idPrimeraAtencion: number;
    idMedicoEgreso: number;
    idServicioEgreso: number;
  } | null {
    const p = this.pacienteSeleccionado;
    if (!p) return null;
    const idAtencion = this.idAtencionActivo();
    const idEpisodio = campoNum(p, ['IdEpisodio', 'idEpisodio']);
    const idPaciente = campoNum(p, ['IdPaciente', 'idPaciente']);
    const idPrimeraAtencion = this.persistencia.idPrimeraAtencion ?? 0;
    const idMedicoEgreso = campoNum(p, ['IdMedico', 'idMedico']);
    const idServicioEgreso = campoNum(p, [
      'IdServicio',
      'idServicio',
      'IdServicioReceta',
      'idServicioReceta',
    ]);
    if (
      !idAtencion ||
      !idEpisodio ||
      !idPaciente ||
      !idPrimeraAtencion ||
      !idMedicoEgreso ||
      !idServicioEgreso
    ) {
      return null;
    }
    return {
      idAtencion,
      idEpisodio,
      idPaciente,
      idPrimeraAtencion,
      idMedicoEgreso,
      idServicioEgreso,
    };
  }

  private persistirEgresoSession(): void {
    const clave = this.destinoEgresoActivo;
    if (!clave || clave === 'referencia') return;
    const key = this.claveSessionEgreso();
    if (!key || typeof sessionStorage === 'undefined') return;
    try {
      const payload: EgresoDraftSession = {
        destino: clave,
        condicionEgreso: this.form.condicionEgreso,
        fechaEgreso: this.form.fechaEgreso,
        horaEgreso: this.form.horaEgreso,
        domicilio: { ...this.egresoDomicilio },
        hospitalizacion: { ...this.egresoHospitalizacion },
        fuga: { ...this.egresoFuga },
        fallecido: { ...this.egresoFallecido },
        diagnosticos: this.egresoDxLista.map((d) => ({ ...d })),
        diagnosticosPorDestino: {
          domicilio: this.egresoDxPorDestino.domicilio.map((d) => ({ ...d })),
          hospitalizacion: this.egresoDxPorDestino.hospitalizacion.map((d) => ({
            ...d,
          })),
          fuga: this.egresoDxPorDestino.fuga.map((d) => ({ ...d })),
          fallecido: this.egresoDxPorDestino.fallecido.map((d) => ({ ...d })),
        },
        altaDomicilioRegistrada: this.altaDomicilioRegistrada,
        altaHospitalizacionRegistrada: this.altaHospitalizacionRegistrada,
        altaFugaRegistrada: this.altaFugaRegistrada,
        altaFallecidoRegistrada: this.altaFallecidoRegistrada,
        guardadoEn: new Date().toISOString(),
      };
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  private claveSessionEgreso(): string | null {
    const id = this.idAtencionActivo();
    return id ? `pa-egreso-draft-${id}` : null;
  }

  /** Rehidrata paneles/DX egreso desde session (prioridad sobre cabecera mínima). */
  private rehidratarEgresoDesdeSession(): void {
    const key = this.claveSessionEgreso();
    if (!key || typeof sessionStorage === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw) as EgresoDraftSession;
      if (!data || typeof data !== 'object') return;
      const destino = data.destino;
      if (
        destino !== 'domicilio' &&
        destino !== 'hospitalizacion' &&
        destino !== 'fuga' &&
        destino !== 'fallecido'
      ) {
        return;
      }
      this.destinoEgresoActivo = destino;
      if (data.condicionEgreso !== undefined && data.condicionEgreso !== '') {
        this.form.condicionEgreso = data.condicionEgreso;
      } else {
        const id = this.idCondicionPorCodigoEgreso(
          this.destinosEgresoUi.find((d) => d.clave === destino)?.codigo || '',
        );
        if (id !== '') this.form.condicionEgreso = id;
      }
      if (data.domicilio) {
        const tipoRaw = data.domicilio.tipoAlta as number | string | '';
        const tipoId =
          typeof tipoRaw === 'number'
            ? tipoRaw
            : Number(tipoRaw) > 0
              ? Number(tipoRaw)
              : '';
        const condRaw = data.domicilio.condicionAlta as number | string | '';
        const condId =
          typeof condRaw === 'number'
            ? condRaw
            : Number(condRaw) > 0
              ? Number(condRaw)
              : '';
        const pronRaw = data.domicilio.pronostico as number | string | '';
        const pronId =
          typeof pronRaw === 'number'
            ? pronRaw
            : Number(pronRaw) > 0
              ? Number(pronRaw)
              : '';
        this.egresoDomicilio = {
          ...this.egresoDomicilio,
          ...data.domicilio,
          tipoAlta:
            tipoId === '' || Number.isNaN(Number(tipoId)) ? '' : Number(tipoId),
          condicionAlta:
            condId === '' || Number.isNaN(Number(condId)) ? '' : Number(condId),
          pronostico:
            pronId === '' || Number.isNaN(Number(pronId)) ? '' : Number(pronId),
        };
      }
      if (data.hospitalizacion) {
        this.egresoHospitalizacion = {
          ...this.egresoHospitalizacion,
          ...data.hospitalizacion,
        };
      }
      if (data.fuga) {
        this.egresoFuga = { ...this.egresoFuga, ...data.fuga };
      }
      if (data.fallecido) {
        const destRaw = data.fallecido.destinoCadaver as number | string | '';
        const destId =
          typeof destRaw === 'number'
            ? destRaw
            : Number(destRaw) > 0
              ? Number(destRaw)
              : '';
        const tipRaw = data.fallecido.tipoCertificado as number | string | '';
        const tipId =
          typeof tipRaw === 'number'
            ? tipRaw
            : Number(tipRaw) > 0
              ? Number(tipRaw)
              : '';
        const estRaw = data.fallecido.tiempoEstanciaDeceso as
          | number
          | string
          | '';
        const estId =
          typeof estRaw === 'number'
            ? estRaw
            : Number(estRaw) > 0
              ? Number(estRaw)
              : '';
        this.egresoFallecido = {
          ...this.egresoFallecido,
          ...data.fallecido,
          destinoCadaver:
            destId === '' || Number.isNaN(Number(destId))
              ? ''
              : Number(destId),
          tipoCertificado:
            tipId === '' || Number.isNaN(Number(tipId)) ? '' : Number(tipId),
          tiempoEstanciaDeceso:
            estId === '' || Number.isNaN(Number(estId)) ? '' : Number(estId),
        };
      }
      this.egresoDxPorDestino = {
        domicilio: [],
        hospitalizacion: [],
        fuga: [],
        fallecido: [],
      };
      const porDest = data.diagnosticosPorDestino;
      if (porDest && typeof porDest === 'object') {
        (['domicilio', 'hospitalizacion', 'fuga', 'fallecido'] as const).forEach(
          (k) => {
            const arr = porDest[k];
            this.egresoDxPorDestino[k] = Array.isArray(arr)
              ? arr.map((d) => ({ ...d }))
              : [];
          },
        );
      } else if (Array.isArray(data.diagnosticos) && data.diagnosticos.length) {
        // Migración: draft viejo con una sola lista → destino activo.
        this.egresoDxPorDestino[destino] = data.diagnosticos.map((d) => ({
          ...d,
        }));
      }
      this.altaDomicilioRegistrada = Boolean(data.altaDomicilioRegistrada);
      this.altaHospitalizacionRegistrada = Boolean(
        data.altaHospitalizacionRegistrada,
      );
      this.altaFugaRegistrada = Boolean(data.altaFugaRegistrada);
      this.altaFallecidoRegistrada = Boolean(data.altaFallecidoRegistrada);
      this.fijarDestinoEgresoRegistrado();
      this.sincronizarTipoDxEgresoConDestino();
      this.aplicarFechaHoraPanelActivoAlForm();
      if (!this.form.fechaEgreso && data.fechaEgreso) {
        this.form.fechaEgreso = data.fechaEgreso;
      }
      if (!this.form.horaEgreso && data.horaEgreso) {
        this.form.horaEgreso = data.horaEgreso;
      }
      // Asegurar fecha/hora del panel desde draft si el panel quedó vacío.
      const fh = this.fechaHoraDelPanel(destino);
      if (fh && (!fh.fecha || !fh.hora) && data.fechaEgreso) {
        this.setFechaHoraEnPanel(
          destino,
          data.fechaEgreso || '',
          data.horaEgreso || '',
        );
        this.aplicarFechaHoraPanelActivoAlForm();
      }
      this.mensajeEgreso = '';
      this.errorEgreso = '';
    } catch {
      /* ignore JSON inválido */
    }
  }

  private limpiarBorradorEgresoSession(): void {
    const key = this.claveSessionEgreso();
    if (!key || typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  private aplicarFechaHoraPanelActivoAlForm(): void {
    const fh = this.fechaHoraDelPanel(this.destinoEgresoActivo);
    if (!fh) return;
    this.form.fechaEgreso = fh.fecha;
    this.form.horaEgreso = fh.hora;
  }

  private fechaHoraDelPanel(
    clave: DestinoEgresoClave | null,
  ): { fecha: string; hora: string } | null {
    if (clave === 'domicilio') {
      return {
        fecha: this.egresoDomicilio.fecha,
        hora: this.egresoDomicilio.hora,
      };
    }
    if (clave === 'hospitalizacion') {
      return {
        fecha: this.egresoHospitalizacion.fecha,
        hora: this.egresoHospitalizacion.hora,
      };
    }
    if (clave === 'fuga') {
      return { fecha: this.egresoFuga.fecha, hora: this.egresoFuga.hora };
    }
    if (clave === 'fallecido') {
      return {
        fecha: this.egresoFallecido.fecha,
        hora: this.egresoFallecido.hora,
      };
    }
    return null;
  }

  private setFechaHoraEnPanel(
    clave: DestinoEgresoClave,
    fecha: string,
    hora: string,
  ): void {
    if (clave === 'domicilio') {
      this.egresoDomicilio.fecha = fecha;
      this.egresoDomicilio.hora = hora;
    } else if (clave === 'hospitalizacion') {
      this.egresoHospitalizacion.fecha = fecha;
      this.egresoHospitalizacion.hora = hora;
    } else if (clave === 'fuga') {
      this.egresoFuga.fecha = fecha;
      this.egresoFuga.hora = hora;
    } else if (clave === 'fallecido') {
      this.egresoFallecido.fecha = fecha;
      this.egresoFallecido.hora = hora;
    }
  }

  /** Tras cargar detalle/session: tarjeta activa + fecha/hora en su panel. */
  sincronizarPanelEgresoDesdeForm(): void {
    const clave = this.claveDestinoDesdeCondicion(this.form.condicionEgreso);
    this.destinoEgresoActivo =
      clave && clave !== 'referencia' ? clave : null;
    if (this.destinoEgresoActivo) {
      this.setFechaHoraEnPanel(
        this.destinoEgresoActivo,
        this.form.fechaEgreso || '',
        this.form.horaEgreso || '',
      );
    }
    this.sincronizarTipoDxEgresoConDestino();
  }

  private resetPanelesEgreso(): void {
    this.destinoEgresoActivo = null;
    this.egresoDomicilio = {
      fecha: '',
      hora: '',
      tipoAlta: '' as number | '',
      condicionAlta: '' as number | '',
      pronostico: '' as number | '',
      recomendaciones: '',
    };
    this.egresoHospitalizacion = {
      fecha: '',
      hora: '',
      idServicioRecibe: '',
      motivo: '',
    };
    this.egresoFuga = {
      fecha: '',
      hora: '',
      fechaUltimoContacto: '',
      horaUltimoContacto: '',
      reportadoPor: '',
      notificacion: '',
      observaciones: '',
    };
    this.egresoFallecido = {
      fecha: '',
      hora: '',
      destinoCadaver: '',
      tipoCertificado: '',
      nroCertificado: '',
      tiempoEstanciaDeceso: '',
      necropsia: '',
      familiarInformado: '',
    };
    this.egresoDxPorDestino = {
      domicilio: [],
      hospitalizacion: [],
      fuga: [],
      fallecido: [],
    };
    this.altaDomicilioRegistrada = false;
    this.altaHospitalizacionRegistrada = false;
    this.altaFugaRegistrada = false;
    this.altaFallecidoRegistrada = false;
    this.resetBorradorDxEgreso();
    this.errorDxEgreso = '';
    this.mensajeEgreso = '';
    this.errorEgreso = '';
  }

  private resetBorradorDxEgreso(): void {
    if (this.debounceBorradorDxEgreso) {
      clearTimeout(this.debounceBorradorDxEgreso);
      this.debounceBorradorDxEgreso = null;
    }
    const idSub = this.idSubclasifDefaultEgreso();
    this.borradorDxEgreso = {
      idDiagnostico: '',
      nombre: '',
      cie10: '',
      tipo: this.letraDeIdSubclasif(idSub),
      idSubclasificacionDx: idSub,
    };
    this.sugerenciasBorradorDxEgreso = [];
    this.cargandoBorradorDxEgreso = false;
    this.filaBorradorDxEgresoActiva = false;
  }

  onEscribeBorradorDxEgreso(texto: string): void {
    this.borradorDxEgreso.nombre = texto;
    this.borradorDxEgreso.idDiagnostico = '';
    this.borradorDxEgreso.cie10 = '';
    this.buscarBorradorDxEgreso(texto);
  }

  buscarBorradorDxEgreso(texto: string): void {
    if (this.debounceBorradorDxEgreso) {
      clearTimeout(this.debounceBorradorDxEgreso);
    }
    this.filaBorradorDxEgresoActiva = true;
    const q = (texto || '').trim();
    if (q.length < MIN_CARACTERES_DX) {
      this.sugerenciasBorradorDxEgreso = [];
      this.cargandoBorradorDxEgreso = false;
      return;
    }
    this.debounceBorradorDxEgreso = setTimeout(() => {
      void this.consultarBorradorDxEgreso(q);
    }, DEBOUNCE_DX_MS);
  }

  seleccionarBorradorDxEgreso(item: ItemCatalogoDx): void {
    this.borradorDxEgreso.idDiagnostico = item.idDiagnostico;
    this.borradorDxEgreso.nombre = (item.descripcion || '').trim();
    this.borradorDxEgreso.cie10 = (item.codigoCIE10 || '').trim().slice(0, 7);
    this.sugerenciasBorradorDxEgreso = [];
    this.filaBorradorDxEgresoActiva = false;
    this.errorDxEgreso = '';
    this.cdr.detectChanges();
  }

  get borradorDxEgresoListo(): boolean {
    return (
      Number(this.borradorDxEgreso.idDiagnostico) > 0 &&
      !!this.borradorDxEgreso.cie10.trim() &&
      this.borradorDxEgreso.idSubclasificacionDx > 0
    );
  }

  cambiarTipoBorradorDxEgreso(idSubclasificacionDx: number): void {
    if (!idSubclasificacionDx) return;
    if (
      this.esIdSubclasifEgresoPrincipal(idSubclasificacionDx) &&
      this.tienePrincipalDxEgreso()
    ) {
      this.errorDxEgreso =
        'Ya hay un diagnóstico Principal. Elija Secundario.';
      const idAlt = this.idSubclasifDefaultEgreso();
      this.borradorDxEgreso.idSubclasificacionDx = idAlt;
      this.borradorDxEgreso.tipo = this.letraDeIdSubclasif(idAlt);
      this.cdr.detectChanges();
      return;
    }
    this.borradorDxEgreso.idSubclasificacionDx = idSubclasificacionDx;
    this.borradorDxEgreso.tipo = this.letraDeIdSubclasif(idSubclasificacionDx);
    this.errorDxEgreso = '';
  }

  mostrarSugerenciasBorradorDxEgreso(): boolean {
    return (
      this.filaBorradorDxEgresoActiva &&
      (this.cargandoBorradorDxEgreso ||
        this.sugerenciasBorradorDxEgreso.length > 0)
    );
  }

  cerrarSugerenciasBorradorDxEgreso(): void {
    setTimeout(() => {
      this.filaBorradorDxEgresoActiva = false;
      this.limpiarPosicionSugerencia();
      this.cdr.detectChanges();
    }, 200);
  }

  private async consultarBorradorDxEgreso(filtro: string): Promise<void> {
    const ids = this.idsContextoDiagnostico();
    if (!ids) {
      this.errorDxEgreso =
        'No se pudo obtener IdAtencion / IdPaciente para buscar CIE.';
      this.sugerenciasBorradorDxEgreso = [];
      this.cdr.detectChanges();
      return;
    }
    const seq = this.secuenciaBorradorDxEgreso + 1;
    this.secuenciaBorradorDxEgreso = seq;
    this.cargandoBorradorDxEgreso = true;
    this.cdr.detectChanges();
    try {
      const items = await this.maestrosApi.getDiagnosticosCatalogo({
        filtro,
        idAtencion: ids.idAtencion,
        idPaciente: ids.idPaciente,
      });
      if (this.secuenciaBorradorDxEgreso !== seq) return;
      this.sugerenciasBorradorDxEgreso = Array.isArray(items) ? items : [];
      this.errorDxEgreso = '';
    } catch (err: unknown) {
      if (this.secuenciaBorradorDxEgreso !== seq) return;
      this.sugerenciasBorradorDxEgreso = [];
      this.errorDxEgreso =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo buscar diagnósticos.';
    } finally {
      if (this.secuenciaBorradorDxEgreso === seq) {
        this.cargandoBorradorDxEgreso = false;
      }
      this.cdr.detectChanges();
    }
  }

  agregarDxEgresoDesdeBorrador(): void {
    const b = this.borradorDxEgreso;
    const idDx = Number(b.idDiagnostico);
    if (!idDx || idDx <= 0 || !b.cie10.trim()) {
      this.errorDxEgreso =
        'Seleccione un diagnóstico del catálogo antes de agregar.';
      this.cdr.detectChanges();
      return;
    }
    if (!b.idSubclasificacionDx || b.idSubclasificacionDx <= 0) {
      this.errorDxEgreso = 'Seleccione el tipo de diagnóstico.';
      this.cdr.detectChanges();
      return;
    }
    if (
      this.esIdSubclasifEgresoPrincipal(b.idSubclasificacionDx) &&
      this.tienePrincipalDxEgreso()
    ) {
      this.errorDxEgreso =
        'Ya hay un diagnóstico Principal. Solo puede agregar Secundario.';
      this.cdr.detectChanges();
      return;
    }
    if (this.egresoDxLista.some((d) => Number(d.idDiagnostico) === idDx)) {
      this.errorDxEgreso = 'Ese diagnóstico ya está en la lista.';
      this.cdr.detectChanges();
      return;
    }
    this.egresoDxLista.push({
      idAtencionDiagnostico: null,
      idDiagnostico: idDx,
      nombre: b.nombre.trim(),
      cie10: b.cie10.trim().slice(0, 7),
      tipo: b.tipo,
      idSubclasificacionDx: b.idSubclasificacionDx,
    });
    this.resetBorradorDxEgreso();
    this.errorDxEgreso = '';
    this.persistirEgresoSession();
    this.cdr.detectChanges();
  }

  quitarDxEgreso(indice: number): void {
    if (indice < 0 || indice >= this.egresoDxLista.length) return;
    const fila = this.egresoDxLista[indice];
    if (fila.idAtencionDiagnostico != null && fila.idAtencionDiagnostico > 0) {
      this.errorDxEgreso =
        'Ese diagnóstico ya está registrado; no se puede quitar desde aquí.';
      this.cdr.detectChanges();
      return;
    }
    this.egresoDxLista.splice(indice, 1);
    this.persistirEgresoSession();
    this.cdr.detectChanges();
  }

  private indicePasoPa(): number {
    return PASOS_ATENCION_PA.findIndex((p) => p.id === this.pasoActivo);
  }

  abrirFicha(item: IFilaBackend) {
    void this.abrirFichaAsync(item);
  }

  cerrarFicha() {
    this.fichaVista = null;
    this.fichaError = '';
    this.fichaCargando = false;
    this.fichaDescargando = false;
  }

  private async abrirFichaAsync(item: IFilaBackend) {
    const idAtencion = this.idAtencionActivo(item);
    if (!idAtencion) {
      this.modalGlobal.error(
        'No se pudo obtener IdAtencion para ver la ficha.',
        'Error',
      );
      return;
    }

    this.fichaError = '';
    this.fichaCargando = true;
    this.fichaVista = null;
    this.cdr.detectChanges();

    try {
      this.fichaVista = await this.construirVistaFicha(item, idAtencion);
    } catch (err: unknown) {
      this.fichaError =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo cargar la ficha de primera atención.';
    } finally {
      this.fichaCargando = false;
      this.cdr.detectChanges();
    }
  }

  private async construirVistaFicha(
    item: IFilaBackend,
    idAtencion: number,
  ): Promise<VerFichaPaVista> {
    const detalle = await this.api.obtenerDetalle(idAtencion);
    const mapped = detalleToForm(detalle);
    const idPrimera = mapped.idPrimeraAtencion ?? 0;
    const idCuenta = this.idCuentaAtencionActivo(item) || 0;
    const idEpisodio = campoNum(item, ['IdEpisodio', 'idEpisodio']);

    const [dxApi, medApi, exaApi, proApi, intercApi] = await Promise.all([
      this.api.listarDiagnosticos(idAtencion, idPrimera || null).catch(() => []),
      this.api
        .listarMedicamentos(idAtencion, {
          idCuentaAtencion: idCuenta,
          idPrimeraAtencion: idPrimera || null,
          idPuntoCarga: 5,
        })
        .catch(() => []),
      this.api
        .listarExamenes(idAtencion, {
          idCuentaAtencion: idCuenta,
          idPrimeraAtencion: idPrimera || null,
        })
        .catch(() => []),
      this.api
        .listarProcedimientos(idAtencion, {
          idCuentaAtencion: idCuenta,
          idPrimeraAtencion: idPrimera || null,
        })
        .catch(() => []),
      idEpisodio > 0 && idPrimera > 0
        ? this.api
            .listarInterconsultas(idAtencion, idEpisodio, idPrimera)
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    // PA/IC suelen traer IdPrimeraAtencion; egreso (3/4) va en NULL/0.
    const dxPaApi = (Array.isArray(dxApi) ? dxApi : []).filter(
      (d) => Number(d.idPrimeraAtencion) > 0,
    );
    const dxEgresoApi = (Array.isArray(dxApi) ? dxApi : []).filter(
      (d) => !(Number(d.idPrimeraAtencion) > 0),
    );
    const diagnosticos = diagnosticosDesdeApi(
      dxPaApi,
      this.opcionesSubclasificacionPa,
    );
    const diagnosticosEgreso = diagnosticosDesdeApi(
      dxEgresoApi,
      this.destinoEgresoActivo === 'fallecido' ||
        mapped.form.condicionEgreso ===
          this.idCondicionPorCodigoEgreso('FAL')
        ? this.opcionesSubclasificacionEgresoFallecido
        : this.opcionesSubclasificacionEgreso,
    );
    const medicamentosUi = medicamentosDesdeApi(medApi);
    this.enriquecerEtiquetasMedicamentosDe(medicamentosUi);

    const cieMap = new Map<number, string>();
    for (const d of [...diagnosticos, ...diagnosticosEgreso]) {
      const id = Number(d.idDiagnostico);
      if (id > 0 && d.cie10) cieMap.set(id, d.cie10.trim());
    }
    const cieDe = (
      id: number | null | undefined,
      codigoApi?: string | null,
    ): string => {
      const fromApi = String(codigoApi ?? '').trim();
      if (fromApi) return fromApi;
      if (id != null && id > 0) return cieMap.get(id) || '—';
      return '—';
    };

    const fechaBase = mapped.fechaHoraAtencion ?? new Date();
    const fecha = this.formatearFechaSolo(fechaBase);
    const hora = this.formatearHoraSolo(fechaBase);
    const medico =
      this.medico(item) !== '—'
        ? this.medico(item)
        : this.nombreMedicoFirmantePa;
    const perfil = this.authService.userProfile();
    const egresoDraft = this.leerDraftEgresoSession(idAtencion);
    const egresoPdf = this.pdfEgresoDesdeFicha(
      mapped.form.condicionEgreso,
      mapped.form.fechaEgreso,
      mapped.form.horaEgreso,
      diagnosticosEgreso,
      egresoDraft,
    );

    const contexto: ContextoMapperPdfPa = {
      paciente: {
        nombre: this.nombrePaciente(item),
        historia: this.historia(item),
        idRegistro: idAtencion,
        edad: this.edad(item),
        sexo: this.sexo(item),
        estado: this.estadoLabel(item),
        servicio: this.consultorio(item) || 'Emergencia',
        documento: this.documento(item),
        especialidad: perfil?.especialidad || '',
      },
      cabecera: {
        fecha,
        hora,
        medicoTratante: medico,
        tipoAtencion: 'Primera Atención',
        servicio: 'Emergencia',
        especialidad: perfil?.especialidad || '',
        dni: perfil?.dni || '',
        colegiatura: perfil?.colegiatura || '',
        rne: perfil?.rne || '',
      },
      signosVitales: this.signosVitalesPdfDesdePaciente(item),
      form: {
        anamnesisTipo: mapped.form.anamnesisTipo,
        tiempoEnfermedad: mapped.form.tiempoEnfermedad,
        signosSintomas: mapped.form.signosSintomas,
        relatoCronologico: mapped.form.relatoCronologico,
        antecedentes: mapped.form.antecedentes,
        pielAnexos: mapped.form.pielAnexos,
        examenRegional: mapped.form.examenRegional,
        referencia: mapped.form.referencia,
        evolucion: mapped.form.evolucion,
        evaluacionEnfermeria: mapped.form.evaluacionEnfermeria,
      },
      etiquetasExamen: {
        estadoGeneral: this.etiquetaCatalogoDescripcion(
          this.opcionesEstadoGeneral,
          mapped.form.estadoGeneral,
        ),
        hidratacion: this.etiquetaCatalogoDescripcion(
          this.opcionesHidratacion,
          mapped.form.hidratacion,
        ),
        conciencia: this.etiquetaCatalogoDescripcion(
          this.opcionesConciencia,
          mapped.form.conciencia,
        ),
      },
      diagnosticos: this.pdfDiagnosticosDesdeFilas(diagnosticos, 'pa'),
      examenes: (Array.isArray(exaApi) ? exaApi : [])
        .filter((e) => e && Number(e.idProducto) > 0)
        .map((e) => ({
          cie10Dx: cieDe(
            e.idDiagnostico != null ? Number(e.idDiagnostico) : null,
            e.codigoDiagnostico,
          ),
          nombre: String(e.nombre ?? '').trim(),
          codigo: String(e.codigo ?? '').trim(),
        })),
      procedimientos: (Array.isArray(proApi) ? proApi : [])
        .filter((e) => e && Number(e.idProducto) > 0)
        .map((e) => ({
          cie10Dx: cieDe(
            e.idDiagnostico != null ? Number(e.idDiagnostico) : null,
            e.codigoDiagnostico,
          ),
          nombre: String(e.nombre ?? '').trim(),
          codigo: String(e.codigo ?? '').trim(),
        })),
      interconsultas: this.pdfInterconsultasDesdeLista(
        Array.isArray(intercApi) ? intercApi : [],
      ),
      medicamentos: medicamentosUi.map((m) => {
        const raw = (Array.isArray(medApi) ? medApi : []).find(
          (it) =>
            Number(it.idProducto) === Number(m.idProducto) &&
            Number(it.idReceta) === Number(m.idReceta),
        );
        return {
          cie10Dx: cieDe(m.idDiagnostico, raw?.codigoDiagnostico),
          nombre: m.nombre,
          cantidad: m.cantidad,
          dosis: m.dosis,
          unidad: m.unidad,
          frecuencia: m.frecuencia,
          via: this.etiquetaVia(m.idViaAdministracion),
          duracion: m.duracion,
        };
      }),
      egreso: egresoPdf,
    };

    const datos = mapearPrimeraAtencionPdfData(contexto);
    const uuidFirma = uuidFirmaDesdeUbicacion(
      ubicacionArchivoDesdeDetalle(detalle),
    );

    return {
      idAtencion,
      historia: this.historia(item),
      uuidFirma,
      financiamiento:
        campo(item, [
          'FuenteFinanciamiento',
          'fuenteFinanciamiento',
          'DescFuenteFinanciamiento',
        ]) || 'SIS',
      prioridad:
        this.prioridadInfo(item)?.label || this.prioridadTexto(item) || '',
      logoInstitucion: this.logoInstitucion,
      cargoCompleto: `Médico ${medico}`,
      fechaHoraFirma: `${fecha} ${hora}`,
      datos,
      sintomas: partirSignosSintomas(mapped.form.signosSintomas),
    };
  }

  async descargarPdfFicha(): Promise<void> {
    const vista = this.fichaVista;
    if (!vista || this.fichaDescargando) return;

    this.fichaDescargando = true;
    this.cdr.detectChanges();
    try {
      if (vista.uuidFirma) {
        const ok = await this.descargarPdfFirmadoRemotoPa(
          vista.uuidFirma,
          vista.historia || vista.idAtencion,
        );
        if (ok) return;
      }
      await this.generarYDescargarPdfCopiaPa(vista);
    } finally {
      this.fichaDescargando = false;
      this.cdr.detectChanges();
    }
  }

  private async descargarPdfFirmadoRemotoPa(
    uuidFirma: string,
    identificador: string | number,
  ): Promise<boolean> {
    try {
      const urlDescarga = `${this.apiClient.getApiBaseUrl()}/api/v1/firmaperu/documentos/${uuidFirma}/firmado`;
      const token = this.authService.getToken();
      const respuesta = await fetch(urlDescarga, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (respuesta.ok) {
        this.descargarBlobPa(
          await respuesta.blob(),
          `PrimeraAtencion_${identificador}_firmada.pdf`,
        );
        return true;
      }
    } catch (error) {
      console.warn(
        'No se pudo obtener el PDF firmado del servidor, generando copia:',
        error,
      );
    }
    return false;
  }

  private async generarYDescargarPdfCopiaPa(
    vista: VerFichaPaVista,
  ): Promise<void> {
    const fechaImpresion = new Date().toLocaleString('es-PE');
    const documento = await construirPdfPrimeraAtencion(
      vista.datos,
      this.datosInstitucionPa,
      this.authService.username() ?? '',
      fechaImpresion,
    );
    if (!documento) {
      this.modalGlobal.error(
        'No se pudo generar la copia PDF de primera atención.',
        'Error',
      );
      return;
    }
    this.descargarBlobPa(
      documento.output('blob'),
      `PrimeraAtencion_${vista.historia || vista.idAtencion}_copia.pdf`,
    );
  }

  private descargarBlobPa(blob: Blob, nombre: string): void {
    const urlBlob = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = urlBlob;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(urlBlob);
  }

  private enriquecerEtiquetasMedicamentosDe(
    medicamentos: { idDosis: number | ''; dosis: string; idUNIDDosis: number | ''; unidad: string; idFrecuencia: number | ''; frecuencia: string }[],
  ): void {
    for (const m of medicamentos) {
      if (m.idDosis !== '' && !m.dosis) {
        const d = this.catalogoDosis.find((x) => x.idDosis === m.idDosis);
        if (d) m.dosis = String(d.numeroDosis);
      }
      if (m.idUNIDDosis !== '' && !m.unidad) {
        const u = this.catalogoUnidades.find(
          (x) => x.idUNIDDosis === m.idUNIDDosis,
        );
        if (u) m.unidad = u.numeroUNIDDosis || '';
      }
      if (m.idFrecuencia !== '' && !m.frecuencia) {
        const f = this.catalogoFrecuencias.find(
          (x) => x.idFrecuencia === m.idFrecuencia,
        );
        if (f) m.frecuencia = f.descripcion || '';
      }
    }
  }

  private etiquetaCondicionEgresoDe(id: number | ''): string {
    if (id === '' || id == null) return '';
    return (
      this.opcionesEgreso.find((o) => o.id === id)?.descripcion?.trim() ||
      String(id)
    );
  }

  private formatearFechaSolo(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  private formatearHoraSolo(d: Date): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  }

  /* ═══════════════════════════════════════════════════════════
     PASO 3 — Diagnósticos principales (borrador → Agregar → BD)
     ═══════════════════════════════════════════════════════════ */

  private asegurarBorradorDxPaDefault(): void {
    if (!this.borradorDxPa.idSubclasificacionDx) {
      const idSub = this.idSubclasifDefaultPa();
      this.borradorDxPa.idSubclasificacionDx = idSub;
      this.borradorDxPa.tipo = this.letraDeIdSubclasif(idSub);
    }
  }

  private resetBorradorDxPa(): void {
    if (this.debounceBorradorDxPa) {
      clearTimeout(this.debounceBorradorDxPa);
      this.debounceBorradorDxPa = null;
    }
    const idSub = this.idSubclasifDefaultPa();
    this.borradorDxPa = {
      idAtencionDiagnostico: null,
      idDiagnostico: '',
      nombre: '',
      cie10: '',
      tipo: this.letraDeIdSubclasif(idSub),
      idSubclasificacionDx: idSub,
    };
    this.sugerenciasBorradorDxPa = [];
    this.cargandoBorradorDxPa = false;
    this.filaBorradorDxPaActiva = false;
    this.errorDx = '';
  }

  onEscribeBorradorDxPa(texto: string): void {
    this.borradorDxPa.nombre = texto;
    this.borradorDxPa.idDiagnostico = '';
    this.borradorDxPa.cie10 = '';
    this.buscarBorradorDxPa(texto);
  }

  buscarBorradorDxPa(texto: string): void {
    if (this.debounceBorradorDxPa) {
      clearTimeout(this.debounceBorradorDxPa);
    }
    this.filaBorradorDxPaActiva = true;
    const q = (texto || '').trim();
    if (q.length < MIN_CARACTERES_DX) {
      this.sugerenciasBorradorDxPa = [];
      this.cargandoBorradorDxPa = false;
      return;
    }
    this.debounceBorradorDxPa = setTimeout(() => {
      void this.consultarBorradorDxPa(q);
    }, DEBOUNCE_DX_MS);
  }

  seleccionarBorradorDxPa(item: ItemCatalogoDx): void {
    this.borradorDxPa.idDiagnostico = item.idDiagnostico;
    this.borradorDxPa.nombre = (item.descripcion || '').trim();
    this.borradorDxPa.cie10 = (item.codigoCIE10 || '').trim().slice(0, 7);
    this.sugerenciasBorradorDxPa = [];
    this.filaBorradorDxPaActiva = false;
    this.errorDx = '';
    this.cdr.detectChanges();
  }

  get borradorDxPaListo(): boolean {
    return (
      Number(this.borradorDxPa.idDiagnostico) > 0 &&
      !!this.borradorDxPa.cie10.trim() &&
      this.borradorDxPa.idSubclasificacionDx > 0
    );
  }

  cambiarTipoBorradorDxPa(idSubclasificacionDx: number): void {
    if (!idSubclasificacionDx || this.guardandoDxPa) return;
    this.borradorDxPa.idSubclasificacionDx = idSubclasificacionDx;
    this.borradorDxPa.tipo = this.letraDeIdSubclasif(idSubclasificacionDx);
  }

  mostrarSugerenciasBorradorDxPa(): boolean {
    return (
      this.filaBorradorDxPaActiva &&
      (this.cargandoBorradorDxPa || this.sugerenciasBorradorDxPa.length > 0)
    );
  }

  cerrarSugerenciasBorradorDxPa(): void {
    setTimeout(() => {
      this.filaBorradorDxPaActiva = false;
      this.limpiarPosicionSugerencia();
      this.cdr.detectChanges();
    }, 200);
  }

  private async consultarBorradorDxPa(filtro: string): Promise<void> {
    const ids = this.idsContextoDiagnostico();
    if (!ids) {
      this.errorDx =
        'No se pudo obtener IdAtencion / IdPaciente para el catálogo.';
      this.sugerenciasBorradorDxPa = [];
      this.cdr.detectChanges();
      return;
    }
    const seq = this.secuenciaBorradorDxPa + 1;
    this.secuenciaBorradorDxPa = seq;
    this.cargandoBorradorDxPa = true;
    this.errorDx = '';
    this.cdr.detectChanges();
    try {
      const items = await this.maestrosApi.getDiagnosticosCatalogo({
        filtro,
        idAtencion: ids.idAtencion,
        idPaciente: ids.idPaciente,
      });
      if (this.secuenciaBorradorDxPa !== seq) return;
      this.sugerenciasBorradorDxPa = Array.isArray(items) ? items : [];
    } catch (err: unknown) {
      if (this.secuenciaBorradorDxPa !== seq) return;
      this.sugerenciasBorradorDxPa = [];
      this.errorDx =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo buscar el catálogo de diagnósticos.';
    } finally {
      if (this.secuenciaBorradorDxPa === seq) {
        this.cargandoBorradorDxPa = false;
      }
      this.cdr.detectChanges();
    }
  }

  /** Agregar: INSERT inmediato a BD (no autosave al elegir CIE). */
  agregarDiagnosticoDesdeBorrador(): void {
    void this.agregarDiagnosticoDesdeBorradorAsync();
  }

  private async agregarDiagnosticoDesdeBorradorAsync(): Promise<void> {
    if (this.guardandoDxPa) return;
    this.asegurarBorradorDxPaDefault();
    const b = this.borradorDxPa;
    const idDx = Number(b.idDiagnostico);
    if (!idDx || idDx <= 0 || !b.cie10.trim()) {
      this.errorDx =
        'Seleccione un diagnóstico del catálogo antes de agregar.';
      this.cdr.detectChanges();
      return;
    }
    if (!b.idSubclasificacionDx || b.idSubclasificacionDx <= 0) {
      this.errorDx =
        'No hay tipo de diagnóstico (cargue el catálogo SubclasificacionDiagnosticos).';
      this.cdr.detectChanges();
      return;
    }

    const duplicado = this.diagnosticos.some(
      (d) => Number(d.idDiagnostico) === idDx,
    );
    if (duplicado) {
      this.errorDx = 'Ese diagnóstico ya está en la lista.';
      this.cdr.detectChanges();
      return;
    }

    const idAtencion = this.idAtencionActivo();
    const idPrimera = this.persistencia.idPrimeraAtencion;
    const idPaciente = campoNum(this.pacienteSeleccionado, [
      'IdPaciente',
      'idPaciente',
    ]);
    const idEpisodio = campoNum(this.pacienteSeleccionado, [
      'IdEpisodio',
      'idEpisodio',
    ]);
    if (!idAtencion || !idPrimera || !idPaciente || !idEpisodio) {
      this.errorDx =
        'No se pudo guardar el diagnóstico: faltan IdAtencion, IdEpisodio, IdPrimeraAtencion o IdPaciente.';
      this.cdr.detectChanges();
      return;
    }

    this.guardandoDxPa = true;
    this.errorDx = '';
    this.cdr.detectChanges();

    try {
      const resp = await this.api.registrarDiagnosticos(idAtencion, {
        idPaciente,
        idPrimeraAtencion: idPrimera,
        idEpisodio,
        idClasificacionDx: ID_CLASIFICACION_DX_PA,
        diagnosticos: [
          {
            idDiagnostico: idDx,
            idSubclasificacionDx: b.idSubclasificacionDx,
            tipo: this.letraDeIdSubclasif(b.idSubclasificacionDx),
          },
        ],
      });
      const creado = resp.resultados?.[0];
      const idAD = creado?.idAtencionDiagnostico ?? null;
      if (idAD == null || idAD <= 0) {
        this.errorDx =
          'Se guardó el diagnóstico pero no se recibió IdAtencionDiagnostico.';
        return;
      }
      this.diagnosticos.push({
        idAtencionDiagnostico: idAD,
        idDiagnostico: idDx,
        nombre: b.nombre.trim(),
        cie10: b.cie10.trim().slice(0, 7),
        tipo: this.letraDeIdSubclasif(b.idSubclasificacionDx),
        idSubclasificacionDx: b.idSubclasificacionDx,
      });
      this.resetBorradorDxPa();
      this.onDiagnosticoChange();
    } catch (err: unknown) {
      this.errorDx =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo guardar el diagnóstico.';
    } finally {
      this.guardandoDxPa = false;
      this.cdr.detectChanges();
    }
  }

  quitarDiagnostico(i: number): void {
    if (this.guardandoDxPa || this.eliminandoDxIndex != null) return;
    void this.quitarDiagnosticoAsync(i);
  }

  /** ✕: DELETE en BD y quita de la lista (solo filas persistidas). */
  private async quitarDiagnosticoAsync(i: number): Promise<void> {
    const fila = this.diagnosticos[i];
    if (!fila) return;
    if (this.guardandoDxPa || this.eliminandoDxIndex != null) return;

    const idAD = fila.idAtencionDiagnostico;
    if (idAD == null || idAD <= 0) {
      this.diagnosticos.splice(i, 1);
      this.onDiagnosticoChange();
      this.cdr.detectChanges();
      return;
    }

    const idAtencion = this.idAtencionActivo();
    const idPrimera = this.persistencia.idPrimeraAtencion;
    if (!idAtencion || !idPrimera) {
      this.errorDx =
        'No se pudo eliminar: faltan IdAtencion o IdPrimeraAtencion.';
      this.cdr.detectChanges();
      return;
    }

    this.eliminandoDxIndex = i;
    this.errorDx = '';
    this.cdr.detectChanges();
    try {
      await this.api.eliminarDiagnostico(idAtencion, idAD, idPrimera);
      this.diagnosticos.splice(i, 1);
      this.onDiagnosticoChange();
    } catch (err: unknown) {
      this.errorDx =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo eliminar el diagnóstico.';
    } finally {
      this.eliminandoDxIndex = null;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.persistencia.desactivar();
    if (this.debounceBorradorDxPa) clearTimeout(this.debounceBorradorDxPa);
    if (this.debounceBorradorDxInterc) clearTimeout(this.debounceBorradorDxInterc);
    if (this.debounceAltaMed) clearTimeout(this.debounceAltaMed);
    if (this.debounceAltaEx) clearTimeout(this.debounceAltaEx);
    if (this.debounceAltaProc) clearTimeout(this.debounceAltaProc);
  }

  /** Calcula top/left/width para dropdown fuera del contenedor con scroll horizontal. */
  posicionarSugerencia(event: Event, anchoMinimo = 0): void {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.sugerenciaPos = {
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, anchoMinimo),
    };
  }

  estiloSugerenciaLista(): Record<string, string> {
    const p = this.sugerenciaPos;
    if (!p) return {};
    return {
      position: 'fixed',
      top: `${p.top}px`,
      left: `${p.left}px`,
      width: `${p.width}px`,
      zIndex: '1000',
    };
  }

  limpiarPosicionSugerencia(): void {
    this.sugerenciaPos = null;
  }

  /** Ids de contexto que exige usp_go_SelectDiagnosticos. */
  private idsContextoDiagnostico(): {
    idAtencion: number;
    idPaciente: number;
  } | null {
    const p = this.pacienteSeleccionado;
    if (!p) return null;
    const idAtencion = this.idAtencionActivo(p);
    const idPaciente = campoNum(p, ['IdPaciente', 'idPaciente']);
    if (!idAtencion || !idPaciente) return null;
    return { idAtencion, idPaciente };
  }

  medicamentoVacio(): FilaMedicamento {
    return {
      idReceta: null,
      idProducto: '',
      nombre: '',
      cantidad: '',
      precioUnitario: null,
      total: null,
      idDosis: '',
      dosis: '',
      idUNIDDosis: '',
      unidad: '',
      idFrecuencia: '',
      frecuencia: '',
      idViaAdministracion: '',
      duracion: '',
      idDiagnostico: null,
    };
  }

  private resetBarraAltaMed(): void {
    if (this.debounceAltaMed) {
      clearTimeout(this.debounceAltaMed);
      this.debounceAltaMed = null;
    }
    this.borradorMed = this.medicamentoVacio();
    this.sugerenciasAltaMed = [];
    this.sugerenciasAltaDosis = [];
    this.sugerenciasAltaUnidad = [];
    this.sugerenciasAltaFrecuencia = [];
    this.cargandoAltaMed = false;
    this.altaMedActiva = false;
    this.campoAltaMedActivo = null;
  }

  private reconstruirVistaMedicamentos(): void {
    let ordinal = 0;
    this.medicamentosVista = [];
    this.medicamentos.forEach((m, indice) => {
      if (m.idProducto === '' && !(m.nombre || '').trim()) return;
      ordinal += 1;
      const via =
        m.idViaAdministracion === ''
          ? '—'
          : this.opcionesVia.find(
              (v) => v.idViaAdministracion === m.idViaAdministracion,
            )?.descripcion || '—';
      this.medicamentosVista.push({
        indice,
        ordinal,
        cie10:
          m.idDiagnostico != null
            ? this.cie10DeDiagnostico(m.idDiagnostico)
            : '',
        dosis: (m.dosis || '').trim() || '—',
        unidad: (m.unidad || '').trim() || '—',
        frecuencia: (m.frecuencia || '').trim() || '—',
        via,
      });
    });
  }


  /**
   * Carga catálogos de dosis/unidad/frecuencia/vía (SP ...Todos / listado).
   */
  async cargarCatalogosMedicamento() {
    this.cargandoCatalogosMed = true;
    this.errorCatalogosMed = '';
    try {
      const [dosis, unidades, frecuencias, vias] = await Promise.all([
        this.maestrosApi.getRecetaDosis(),
        this.maestrosApi.getRecetaUnidadesDosis(),
        this.maestrosApi.getRecetaFrecuencias(),
        this.maestrosApi.getViasAdministracion(),
      ]);
      this.catalogoDosis = Array.isArray(dosis) ? dosis : [];
      this.catalogoUnidades = Array.isArray(unidades) ? unidades : [];
      this.catalogoFrecuencias = Array.isArray(frecuencias) ? frecuencias : [];
      this.opcionesVia = Array.isArray(vias)
        ? vias.filter((v) => v.idViaAdministracion > 0)
        : [];
    } catch (err: unknown) {
      this.errorCatalogosMed =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudieron cargar catálogos de medicamento.';
    } finally {
      this.cargandoCatalogosMed = false;
      this.cdr.detectChanges();
    }
  }

  private idPacienteSeleccionado(): number {
    return campoNum(this.pacienteSeleccionado, ['IdPaciente', 'idPaciente']);
  }

  // ——— Alta medicamentos (borrador + Agregar) ———

  onEscribeAltaMed(texto: string): void {
    if (this.guardandoAltaMed) return;
    const t = (texto || '').trim();
    const id = this.borradorMed.idProducto;
    // Tras elegir de la lista, ngModelChange repite el mismo nombre: no borrar IdProducto.
    if (
      id !== '' &&
      Number(id) > 0 &&
      t === (this.borradorMed.nombre || '').trim()
    ) {
      this.buscarAltaMed(texto);
      return;
    }
    this.borradorMed.nombre = texto;
    this.borradorMed.idProducto = '';
    this.buscarAltaMed(texto);
  }

  abrirSugerenciasAltaMed(): void {
    if (this.guardandoAltaMed) return;
    this.altaMedActiva = true;
    this.campoAltaMedActivo = 'med';
    const q = (this.borradorMed.nombre || '').trim();
    if (q.length >= MIN_CARACTERES_MED) this.buscarAltaMed(q);
  }

  buscarAltaMed(texto: string): void {
    if (this.debounceAltaMed) clearTimeout(this.debounceAltaMed);
    this.altaMedActiva = true;
    this.campoAltaMedActivo = 'med';
    const q = (texto || '').trim();
    if (q.length < MIN_CARACTERES_MED) {
      this.sugerenciasAltaMed = [];
      this.cargandoAltaMed = false;
      return;
    }
    this.debounceAltaMed = setTimeout(() => {
      void this.consultarCatalogoAltaMed(q);
    }, DEBOUNCE_MED_MS);
  }

  cerrarSugerenciasAltaMed(): void {
    setTimeout(() => {
      this.altaMedActiva = false;
      this.campoAltaMedActivo = null;
      this.limpiarPosicionSugerencia();
      this.cdr.detectChanges();
    }, 200);
  }

  mostrarSugerenciasAltaMed(): boolean {
    if (this.guardandoAltaMed || this.campoAltaMedActivo !== 'med') return false;
    const q = (this.borradorMed.nombre || '').trim();
    return (
      this.altaMedActiva &&
      q.length >= MIN_CARACTERES_MED &&
      (this.cargandoAltaMed || this.sugerenciasAltaMed.length > 0)
    );
  }

  mostrarSugerenciasAltaCampo(
    campo: 'dosis' | 'unidad' | 'frecuencia',
  ): boolean {
    if (this.guardandoAltaMed || this.campoAltaMedActivo !== campo) return false;
    if (campo === 'dosis') return this.sugerenciasAltaDosis.length > 0;
    if (campo === 'unidad') return this.sugerenciasAltaUnidad.length > 0;
    return this.sugerenciasAltaFrecuencia.length > 0;
  }

  seleccionarAltaMed(item: ItemMedicamentoCat): void {
    if (this.guardandoAltaMed) return;
    this.borradorMed.idProducto = item.idProducto;
    this.borradorMed.nombre = (item.nombre || '').trim();
    this.borradorMed.precioUnitario =
      typeof item.precioUnitario === 'number' ? item.precioUnitario : null;
    this.borradorMed.total = null;
    this.sugerenciasAltaMed = [];
    this.campoAltaMedActivo = null;
    this.altaMedActiva = false;
  }

  private async consultarCatalogoAltaMed(filtro: string): Promise<void> {
    const idPaciente = this.idPacienteSeleccionado();
    if (!idPaciente) {
      this.errorCatalogosMed = 'No se pudo obtener IdPaciente para medicamentos.';
      this.sugerenciasAltaMed = [];
      this.cargandoAltaMed = false;
      this.cdr.detectChanges();
      return;
    }
    const seq = this.secuenciaAltaMed + 1;
    this.secuenciaAltaMed = seq;
    this.cargandoAltaMed = true;
    this.cdr.detectChanges();
    try {
      const items = await this.maestrosApi.getMedicamentosCatalogo({
        filtro,
        idPaciente,
      });
      if (this.secuenciaAltaMed !== seq) return;
      this.sugerenciasAltaMed = Array.isArray(items) ? items : [];
    } catch (err: unknown) {
      if (this.secuenciaAltaMed !== seq) return;
      this.sugerenciasAltaMed = [];
      this.errorCatalogosMed =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo buscar medicamentos.';
    } finally {
      if (this.secuenciaAltaMed === seq) this.cargandoAltaMed = false;
      this.cdr.detectChanges();
    }
  }

  onEscribeAltaDosis(texto: string): void {
    const t = (texto || '').trim();
    const id = this.borradorMed.idDosis;
    // Elegir de la lista setea id+texto; el ngModelChange siguiente no debe borrar el id.
    if (id !== '' && Number(id) > 0 && t === (this.borradorMed.dosis || '').trim()) {
      this.filtrarAltaDosis(texto);
      return;
    }
    this.borradorMed.dosis = texto;
    this.borradorMed.idDosis = '';
    this.filtrarAltaDosis(texto);
  }

  onEscribeAltaUnidad(texto: string): void {
    const t = (texto || '').trim();
    const id = this.borradorMed.idUNIDDosis;
    if (
      id !== '' &&
      Number(id) > 0 &&
      t === (this.borradorMed.unidad || '').trim()
    ) {
      this.filtrarAltaUnidad(texto);
      return;
    }
    this.borradorMed.unidad = texto;
    this.borradorMed.idUNIDDosis = '';
    this.filtrarAltaUnidad(texto);
  }

  onEscribeAltaFrecuencia(texto: string): void {
    const t = (texto || '').trim();
    const id = this.borradorMed.idFrecuencia;
    if (
      id !== '' &&
      Number(id) > 0 &&
      t === (this.borradorMed.frecuencia || '').trim()
    ) {
      this.filtrarAltaFrecuencia(texto);
      return;
    }
    this.borradorMed.frecuencia = texto;
    this.borradorMed.idFrecuencia = '';
    this.filtrarAltaFrecuencia(texto);
  }

  filtrarAltaDosis(texto: string): void {
    this.campoAltaMedActivo = 'dosis';
    const q = (texto || '').trim().toLowerCase();
    this.sugerenciasAltaDosis =
      q.length < 1
        ? []
        : this.catalogoDosis
            .filter((d) => String(d.numeroDosis).toLowerCase().includes(q))
            .slice(0, 40);
  }

  filtrarAltaUnidad(texto: string): void {
    this.campoAltaMedActivo = 'unidad';
    const q = (texto || '').trim().toLowerCase();
    this.sugerenciasAltaUnidad =
      q.length < 1
        ? []
        : this.catalogoUnidades
            .filter((u) => (u.numeroUNIDDosis || '').toLowerCase().includes(q))
            .slice(0, 40);
  }

  filtrarAltaFrecuencia(texto: string): void {
    this.campoAltaMedActivo = 'frecuencia';
    const q = (texto || '').trim().toLowerCase();
    this.sugerenciasAltaFrecuencia =
      q.length < 1
        ? []
        : this.catalogoFrecuencias
            .filter((f) => (f.descripcion || '').toLowerCase().includes(q))
            .slice(0, 40);
  }

  seleccionarAltaDosis(item: ItemDosisCat): void {
    this.borradorMed.idDosis = item.idDosis;
    this.borradorMed.dosis = String(item.numeroDosis);
    this.sugerenciasAltaDosis = [];
    this.campoAltaMedActivo = null;
  }

  seleccionarAltaUnidad(item: ItemUnidadCat): void {
    this.borradorMed.idUNIDDosis = item.idUNIDDosis;
    this.borradorMed.unidad = (item.numeroUNIDDosis || '').trim();
    this.sugerenciasAltaUnidad = [];
    this.campoAltaMedActivo = null;
  }

  seleccionarAltaFrecuencia(item: ItemFrecuenciaCat): void {
    this.borradorMed.idFrecuencia = item.idFrecuencia;
    this.borradorMed.frecuencia = (item.descripcion || '').trim();
    this.sugerenciasAltaFrecuencia = [];
    this.campoAltaMedActivo = null;
  }

  /**
   * Valida todos los campos del borrador → POST → limpia form y lista abajo.
   */
  confirmarAltaMedicamento(): void {
    void this.confirmarAltaMedicamentoAsync();
  }

  /**
   * Si el usuario escribió texto sin clickear la sugerencia, intenta enlazar
   * idDosis / idUNIDDosis / idFrecuencia por coincidencia exacta o única.
   * Evita el falso “falta dosis” cuando el texto ya es válido en catálogo.
   */
  private resolverIdsCatalogoBorradorMed(): void {
    const b = this.borradorMed;

    if (!(Number(b.idDosis) > 0)) {
      const q = (b.dosis || '').trim().toLowerCase();
      if (q) {
        const exact = this.catalogoDosis.find(
          (d) => String(d.numeroDosis).trim().toLowerCase() === q,
        );
        const candidatos = exact
          ? [exact]
          : this.catalogoDosis.filter((d) =>
              String(d.numeroDosis).toLowerCase().includes(q),
            );
        if (candidatos.length === 1) {
          b.idDosis = candidatos[0].idDosis;
          b.dosis = String(candidatos[0].numeroDosis);
        }
      }
    }

    if (!(Number(b.idUNIDDosis) > 0)) {
      const q = (b.unidad || '').trim().toLowerCase();
      if (q) {
        const exact = this.catalogoUnidades.find(
          (u) => (u.numeroUNIDDosis || '').trim().toLowerCase() === q,
        );
        const candidatos = exact
          ? [exact]
          : this.catalogoUnidades.filter((u) =>
              (u.numeroUNIDDosis || '').toLowerCase().includes(q),
            );
        if (candidatos.length === 1) {
          b.idUNIDDosis = candidatos[0].idUNIDDosis;
          b.unidad = (candidatos[0].numeroUNIDDosis || '').trim();
        }
      }
    }

    if (!(Number(b.idFrecuencia) > 0)) {
      const q = (b.frecuencia || '').trim().toLowerCase();
      if (q) {
        const exact = this.catalogoFrecuencias.find(
          (f) => (f.descripcion || '').trim().toLowerCase() === q,
        );
        const candidatos = exact
          ? [exact]
          : this.catalogoFrecuencias.filter((f) =>
              (f.descripcion || '').toLowerCase().includes(q),
            );
        if (candidatos.length === 1) {
          b.idFrecuencia = candidatos[0].idFrecuencia;
          b.frecuencia = (candidatos[0].descripcion || '').trim();
        }
      }
    }
  }

  private validarBorradorMed(): string | null {
    this.asegurarDxActivoMed();
    this.resolverIdsCatalogoBorradorMed();

    const idDx = this.idDiagnosticoActivoMed();
    const faltan: string[] = [];
    if (idDx == null) faltan.push('diagnóstico');
    if (!(Number(this.borradorMed.idProducto) > 0)) {
      faltan.push(
        (this.borradorMed.nombre || '').trim()
          ? 'medicamento (seleccione de la lista)'
          : 'medicamento',
      );
    }
    if (!(Number(String(this.borradorMed.cantidad).trim()) > 0)) {
      faltan.push('cantidad');
    }
    if (!(Number(this.borradorMed.idDosis) > 0)) {
      faltan.push(
        (this.borradorMed.dosis || '').trim()
          ? 'dosis (seleccione de la lista)'
          : 'dosis',
      );
    }
    if (!(Number(this.borradorMed.idUNIDDosis) > 0)) {
      faltan.push(
        (this.borradorMed.unidad || '').trim()
          ? 'unidad (seleccione de la lista)'
          : 'unidad',
      );
    }
    if (!(Number(this.borradorMed.idFrecuencia) > 0)) {
      faltan.push(
        (this.borradorMed.frecuencia || '').trim()
          ? 'frecuencia (seleccione de la lista)'
          : 'frecuencia',
      );
    }
    if (!(Number(this.borradorMed.idViaAdministracion) > 0)) faltan.push('vía');
    if (!(Number(String(this.borradorMed.duracion).trim()) > 0)) {
      faltan.push('días');
    }
    if (faltan.length) {
      return `Complete los campos obligatorios: ${faltan.join(', ')}.`;
    }
    if (idDx != null && !this.cie10DeDiagnostico(idDx)) {
      return 'El diagnóstico seleccionado no tiene código CIE-10.';
    }
    return null;
  }

  private async confirmarAltaMedicamentoAsync(): Promise<void> {
    if (this.guardandoAltaMed) return;

    const errVal = this.validarBorradorMed();
    if (errVal) {
      this.errorMedicamentos = errVal;
      this.cdr.detectChanges();
      return;
    }

    const idDx = this.idDiagnosticoActivoMed()!;
    const codigoDx = this.cie10DeDiagnostico(idDx);
    const idProducto = Number(this.borradorMed.idProducto);
    const cantidad = Number(String(this.borradorMed.cantidad).trim());
    const duracion = Number(String(this.borradorMed.duracion).trim());
    const idDosis = Number(this.borradorMed.idDosis);
    const idUNID = Number(this.borradorMed.idUNIDDosis);
    const idFreq = Number(this.borradorMed.idFrecuencia);
    const idVia = Number(this.borradorMed.idViaAdministracion);

    if (
      this.medicamentos.some(
        (m) =>
          m.idProducto === idProducto &&
          m.idDiagnostico === idDx &&
          m.idReceta != null,
      )
    ) {
      this.errorMedicamentos =
        'Ese medicamento ya está asociado al diagnóstico seleccionado.';
      this.cdr.detectChanges();
      return;
    }

    const ctx = this.idsContextoMedicamento();
    const idAtencion = this.idAtencionActivo();
    const idPrimera = this.persistencia.idPrimeraAtencion;
    if (!ctx || !idAtencion || !idPrimera) {
      this.errorMedicamentos =
        'No se pudo guardar: faltan IdPuntoCarga / IdServicio / cuenta / PA.';
      this.cdr.detectChanges();
      return;
    }

    const snapshot: FilaMedicamento = {
      ...this.borradorMed,
      idDiagnostico: idDx,
      idProducto,
      cantidad: String(cantidad),
      duracion: String(duracion),
      idDosis,
      idUNIDDosis: idUNID,
      idFrecuencia: idFreq,
      idViaAdministracion: idVia,
    };

    this.guardandoAltaMed = true;
    this.errorMedicamentos = '';
    this.cdr.detectChanges();

    try {
      const resp = await this.api.registrarMedicamento(idAtencion, {
        idPrimeraAtencion: idPrimera,
        idCuentaAtencion: ctx.idCuentaAtencion,
        idPuntoCarga: ctx.idPuntoCarga,
        idServicioReceta: ctx.idServicioReceta,
        idPaciente: ctx.idPaciente,
        idUsuarioAuditoria: this.authService.getIdEmpleado() || 0,
        idProducto,
        cantidad,
        precio: snapshot.precioUnitario ?? 0,
        duracion,
        idDosis,
        idUNIDDosis: idUNID,
        idFrecuencia: idFreq,
        idViaAdministracion: idVia,
        idDiagnostico: idDx,
        codigoDiagnostico: codigoDx,
      });

      const idReceta = resp.idReceta ?? null;
      if (idReceta == null || idReceta <= 0) {
        this.errorMedicamentos =
          'El servidor no devolvió IdReceta al registrar el medicamento.';
        return;
      }

      snapshot.idReceta = idReceta;
      snapshot.idProducto = resp.idProducto || idProducto;
      if (typeof resp.precio === 'number') snapshot.precioUnitario = resp.precio;
      snapshot.total =
        typeof resp.total === 'number'
          ? resp.total
          : cantidad * (snapshot.precioUnitario ?? 0);
      if (resp.idDiagnostico != null && resp.idDiagnostico > 0) {
        snapshot.idDiagnostico = resp.idDiagnostico;
      }

      this.medicamentos.push(snapshot);
      this.resetBarraAltaMed();
      this.reconstruirVistaMedicamentos();
    } catch (err: unknown) {
      this.errorMedicamentos =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo guardar el medicamento.';
    } finally {
      this.guardandoAltaMed = false;
      this.cdr.detectChanges();
    }
  }

  quitarMedicamento(i: number): void {
    void this.quitarMedicamentoAsync(i);
  }

  private async quitarMedicamentoAsync(i: number): Promise<void> {
    const fila = this.medicamentos[i];
    if (!fila) return;

    const snapshot = { ...fila };
    const indiceOriginal = i;
    this.medicamentos.splice(i, 1);
    this.reconstruirVistaMedicamentos();
    this.errorMedicamentos = '';
    this.cdr.detectChanges();

    if (snapshot.idReceta == null || snapshot.idReceta <= 0 || snapshot.idProducto === '') {
      return;
    }

    try {
      const ctx = this.idsContextoMedicamento();
      const idAtencion = this.idAtencionActivo();
      const idPrimera = this.persistencia.idPrimeraAtencion;
      if (!ctx || !idAtencion || !idPrimera) {
        throw new Error(
          'No se pudo eliminar: faltan datos de cuenta / primera atención.',
        );
      }
      await this.api.eliminarMedicamento(
        idAtencion,
        snapshot.idReceta,
        Number(snapshot.idProducto),
        ctx.idCuentaAtencion,
        idPrimera,
      );
    } catch (err: unknown) {
      const insertAt = Math.min(indiceOriginal, this.medicamentos.length);
      this.medicamentos.splice(insertAt, 0, snapshot);
      this.reconstruirVistaMedicamentos();
      this.errorMedicamentos =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo eliminar el medicamento.';
      this.cdr.detectChanges();
    }
  }
	// IdPuntoCarga de bandeja ya no se exige para listar (backend usa farmacia=5).
	// Sí hace falta para el POST de alta (cabecera); el use case también fuerza 5.
	private idsContextoMedicamento(): {
    idCuentaAtencion: number;
    idPuntoCarga: number;
    idServicioReceta: number;
    idPaciente: number;
  } | null {
    const p = this.pacienteSeleccionado;
    if (!p) return null;
    const idCuentaAtencion = this.idCuentaAtencionActivo(p);
    const idPuntoCarga = campoNum(p, ['IdPuntoCarga', 'idPuntoCarga']) || 5;
    const idServicioReceta = campoNum(p, [
      'IdServicio',
      'idServicio',
      'IdServicioReceta',
      'idServicioReceta',
    ]);
    const idPaciente = campoNum(p, ['IdPaciente', 'idPaciente']);
    if (!idCuentaAtencion || !idServicioReceta || !idPaciente) {
      return null;
    }
    return { idCuentaAtencion, idPuntoCarga, idServicioReceta, idPaciente };
  }

  registrarAtencion() {
    void this.registrarAtencionAsync();
  }

  private async registrarAtencionAsync() {
    const idAtencion = this.idAtencionActivo();
    if (!idAtencion) {
      this.mensaje = 'No se pudo obtener IdAtencion.';
      this.modalGlobal.error(this.mensaje, 'Error');
      return;
    }

    const errores = obtenerErroresValidacionPa(this.contextoValidacionPa());
    if (errores.length > 0) {
      this.pasoActivo = errores[0].paso;
      this.mostrarErroresPasoPa(errores[0].paso);
      const detalleErrores = errores.map((e) => `• ${e.mensaje}`).join('\n');
      this.modalGlobal.error(
        `No se puede registrar la primera atención porque existen campos pendientes o inválidos:\n\n${detalleErrores}`,
        'Campos requeridos pendientes',
      );
      this.cdr.detectChanges();
      return;
    }

    const persistidos = this.diagnosticos.filter(
      (d) => d.idAtencionDiagnostico != null && d.idAtencionDiagnostico > 0,
    );
    if (persistidos.length < 1) {
      this.pasoActivo = 'diagnosticos';
      this.modalGlobal.error(
        'Debe tener al menos un diagnóstico guardado (Agregar en el paso Diagnósticos).',
        'Campos Obligatorios',
      );
      this.cdr.detectChanges();
      return;
    }

    const documentos = this.documentosParaFirmarLista;
    const nDocs = documentos.length;
    const confirmado = await this.modalGlobal.confirmar(
      nDocs === 1
        ? 'Se generará el PDF de primera atención y se abrirá Firma Perú para firmar con su DNIe. ¿Desea continuar?'
        : `Se generarán ${nDocs} documentos (PA, exámenes y/o medicamentos) y se firmarán en un solo lote con su DNIe. ¿Desea continuar?`,
      'Firmar primera atención con DNIe',
      'Firmar',
    );
    if (!confirmado) {
      return;
    }

    this.mensaje = '';
    this.error = '';
    this.isSigning = true;
    this.cdr.detectChanges();

    try {
      await this.persistencia.flush();
      if (this.persistencia.estado === 'error') {
        throw new Error(
          this.persistencia.errorGuardado ||
            'No se pudo guardar el borrador antes de firmar.',
        );
      }
      const resultado = await this.firmaService.procesarFirmaDigital({
        idAtencion,
        datosPdf: mapearPrimeraAtencionPdfData(this.construirContextoMapperPdfPa()),
        institucion: this.datosInstitucionPa,
        nombreUsuario: this.authService.username() ?? '',
        cargoFirma: this.cargoCompletoFirmantePa,
        documentos,
      });

      if (!resultado.exito) {
        this.modalGlobal.error(
          resultado.mensajeError ||
            'No se pudo completar la firma. Verifique Firma Perú y su DNIe.',
          'Error en el proceso de firma',
        );
        return;
      }

      this.persistencia.limpiarSessionStorage(idAtencion);
      this.persistencia.desactivar();
      const nFirmados = resultado.cantidadDocumentos ?? nDocs;
      this.modalGlobal.exito(
        nFirmados > 1
          ? `Se firmaron ${nFirmados} documentos en lote y la primera atención quedó cerrada. Ya no se puede editar.`
          : 'La primera atención fue firmada con el DNIe y cerrada. Ya no se puede editar.',
        'Primera atención firmada',
      );
      this.vista = 'bandeja';
      this.pacienteSeleccionado = null;
      this.fechaHoraAtencion = null;
      this.pasoActivo = 'anamnesis';
      this.handleBuscar();
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo firmar o cerrar la primera atención.';
      this.modalGlobal.error(this.error, 'Error');
    } finally {
      this.isSigning = false;
      this.cdr.detectChanges();
    }
  }

  private construirContextoMapperPdfPa(): ContextoMapperPdfPa {
    const p = this.pacienteSeleccionado;
    if (!p) {
      throw new Error('No hay paciente seleccionado para el PDF.');
    }
    const idAtencion = this.idAtencionActivo() ?? 0;
    const perfil = this.authService.userProfile();

    return {
      paciente: {
        nombre: this.nombrePaciente(p),
        historia: this.historia(p),
        idRegistro: idAtencion,
        edad: this.edad(p),
        sexo: this.sexo(p),
        estado: this.estadoLabel(p),
        servicio: this.consultorio(p) || 'Emergencia',
        documento: this.documento(p),
        especialidad: perfil?.especialidad || '',
      },
      cabecera: {
        fecha: this.formatearFechaSolo(this.fechaHoraAtencion ?? new Date()),
        hora: this.formatearHoraSolo(this.fechaHoraAtencion ?? new Date()),
        medicoTratante: this.nombreMedicoFirmantePa,
        tipoAtencion: 'Primera Atención',
        servicio: 'Emergencia',
        especialidad: perfil?.especialidad || '',
        dni: perfil?.dni || '',
        colegiatura: perfil?.colegiatura || '',
        rne: perfil?.rne || '',
      },
      signosVitales: this.signosVitalesPdfDesdePaciente(p),
      form: {
        anamnesisTipo: this.form.anamnesisTipo,
        tiempoEnfermedad: this.form.tiempoEnfermedad,
        signosSintomas: this.form.signosSintomas,
        relatoCronologico: this.form.relatoCronologico,
        antecedentes: this.form.antecedentes,
        pielAnexos: this.form.pielAnexos,
        examenRegional: this.form.examenRegional,
        referencia: this.form.referencia,
        evolucion: this.form.evolucion,
        evaluacionEnfermeria: this.form.evaluacionEnfermeria,
      },
      etiquetasExamen: {
        estadoGeneral: this.etiquetaCatalogoDescripcion(
          this.opcionesEstadoGeneral,
          this.form.estadoGeneral,
        ),
        hidratacion: this.etiquetaCatalogoDescripcion(
          this.opcionesHidratacion,
          this.form.hidratacion,
        ),
        conciencia: this.etiquetaCatalogoDescripcion(
          this.opcionesConciencia,
          this.form.conciencia,
        ),
      },
      diagnosticos: this.pdfDiagnosticosDesdeFilas(this.diagnosticos, 'pa'),
      examenes: this.pdfExamenesDesdeFilas(this.examenes),
      procedimientos: this.pdfExamenesDesdeFilas(this.procedimientos),
      interconsultas: this.pdfInterconsultasDesdeLista(
        this.intercListaRegistradas,
      ),
      medicamentos: this.pdfMedicamentosDesdeFilas(this.medicamentos),
      egreso: this.pdfEgresoDesdeUi(),
    };
  }

  /** CIE del DX asociado (lista PA actual). */
  private pdfCie10DeIdDx(idDiagnostico: number | null | undefined): string {
    if (idDiagnostico == null || idDiagnostico <= 0) return '—';
    return this.cie10DeDiagnostico(idDiagnostico) || '—';
  }

  private pdfTipoDxLabel(
    fila: DiagnosticoBorradorPA,
    origen: 'pa' | 'egreso',
  ): string {
    const etiq =
      origen === 'egreso'
        ? this.etiquetaTipoDxEgreso(fila.idSubclasificacionDx)
        : this.etiquetaTipoDxPa(fila.idSubclasificacionDx);
    if (etiq) return etiq;
    return this.nombreDesdeTipoLetra(fila.tipo) || fila.tipo || '—';
  }

  private pdfDiagnosticosDesdeFilas(
    filas: DiagnosticoBorradorPA[],
    origen: 'pa' | 'egreso',
  ): ContextoMapperPdfPa['diagnosticos'] {
    return filas
      .filter((d) => d.cie10 || d.nombre)
      .map((d) => ({
        cie10: (d.cie10 || '').trim() || '—',
        descripcion: (d.nombre || '').trim() || '—',
        tipo: this.pdfTipoDxLabel(d, origen),
      }));
  }

  private pdfExamenesDesdeFilas(
    filas: FilaExamenPa[],
  ): ContextoMapperPdfPa['examenes'] {
    return filas
      .filter((e) => (e.nombre || '').trim() || e.idProducto != null)
      .map((e) => ({
        cie10Dx: this.pdfCie10DeIdDx(e.idDiagnostico),
        nombre: (e.nombre || '').trim(),
        codigo: (e.codigo || '').trim(),
      }));
  }

  private pdfMedicamentosDesdeFilas(
    filas: FilaMedicamento[],
  ): ContextoMapperPdfPa['medicamentos'] {
    return filas
      .filter((m) => (m.nombre || '').trim() || m.idProducto !== '')
      .map((m) => ({
        cie10Dx: this.pdfCie10DeIdDx(m.idDiagnostico),
        nombre: (m.nombre || '').trim(),
        cantidad: (m.cantidad || '').trim(),
        dosis: (m.dosis || '').trim(),
        unidad: (m.unidad || '').trim(),
        frecuencia: (m.frecuencia || '').trim(),
        via: this.etiquetaVia(m.idViaAdministracion),
        duracion: (m.duracion || '').trim(),
      }));
  }

  private pdfInterconsultasDesdeLista(
    items: InterconsultaListadoApi[],
  ): ContextoMapperPdfPa['interconsultas'] {
    if (!Array.isArray(items)) return [];
    return items.map((ic) => ({
      especialidad: (ic.especialidad || '').trim() || '—',
      motivo: (ic.motivo || ic.resumenHC || '').trim() || '—',
      fecha: this.pdfFormatearFechaInterconsulta(ic.fechaSolicitud),
      estado: (ic.estado || '').trim() || '—',
    }));
  }

  private pdfFormatearFechaInterconsulta(raw: string): string {
    const s = String(raw ?? '').trim();
    if (!s) return '—';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return `${this.formatearFechaSolo(d)} ${this.formatearHoraSolo(d)}`;
  }

  private pdfEgresoDesdeUi(): ContextoMapperPdfPa['egreso'] {
    const clave =
      this.egresoDestinoRegistrado ??
      (this.destinoEgresoActivo && this.destinoEgresoActivo !== 'referencia'
        ? this.destinoEgresoActivo
        : null);
    const registrado = this.egresoDestinoRegistrado != null;
    const destino = registrado
      ? this.egresoDestinoRegistradoNombre
      : this.etiquetaCondicionEgreso();
    const fh = clave ? this.fechaHoraDelPanel(clave) : null;
    const fecha = (fh?.fecha || this.form.fechaEgreso || '').trim();
    const hora = (fh?.hora || this.form.horaEgreso || '').trim();
    const detalle = clave ? this.pdfDetalleEgresoPorClave(clave) : [];
    const dxLista = clave ? (this.egresoDxPorDestino[clave] ?? []) : [];
    return {
      destino,
      fecha,
      hora,
      registrado,
      detalle,
      diagnosticos: this.pdfDiagnosticosDesdeFilas(dxLista, 'egreso'),
    };
  }

  private pdfDetalleEgresoPorClave(
    clave: DestinoEgresoConDx,
  ): ContextoMapperPdfPa['egreso']['detalle'] {
    const filas: ContextoMapperPdfPa['egreso']['detalle'] = [];
    const push = (etiqueta: string, valor: string) => {
      const v = (valor || '').trim();
      if (v) filas.push({ etiqueta, valor: v });
    };

    if (clave === 'domicilio') {
      const d = this.egresoDomicilio;
      push(
        'Tipo de alta',
        this.etiquetaCatalogoDescripcion(
          this.opcionesTipoAltaEgreso,
          d.tipoAlta,
        ),
      );
      push(
        'Condición de alta',
        this.etiquetaCatalogoDescripcion(
          this.opcionesCondicionAltaEgreso,
          d.condicionAlta,
        ),
      );
      push(
        'Pronóstico',
        this.etiquetaCatalogoDescripcion(
          this.opcionesPronosticoEgreso,
          d.pronostico,
        ),
      );
      push('Recomendaciones', d.recomendaciones);
    } else if (clave === 'hospitalizacion') {
      const h = this.egresoHospitalizacion;
      const idSrv = Number(h.idServicioRecibe);
      const nomSrv =
        idSrv > 0
          ? this.opcionesServicioEgreso.find((o) => o.id === idSrv)?.nombre ||
            String(idSrv)
          : '';
      push('Servicio que recibe', nomSrv);
      push('Motivo de transferencia', h.motivo);
    } else if (clave === 'fuga') {
      const f = this.egresoFuga;
      const uc =
        f.fechaUltimoContacto?.trim() && f.horaUltimoContacto?.trim()
          ? `${f.fechaUltimoContacto} ${f.horaUltimoContacto}`
          : '';
      push('Último contacto', uc);
      push('Reportado por', f.reportadoPor);
      push('Notificación', this.etiquetaNotificacionFugaPdf());
      push('Observaciones', f.observaciones);
    } else if (clave === 'fallecido') {
      const f = this.egresoFallecido;
      push(
        'Destino del cadáver',
        this.etiquetaCatalogoDescripcion(
          this.opcionesDestinoCadaverEgreso,
          f.destinoCadaver,
        ),
      );
      push(
        'Tipo de certificado',
        this.etiquetaCatalogoDescripcion(
          this.opcionesTipoCertificadoEgreso,
          f.tipoCertificado,
        ),
      );
      push('N° de certificado', f.nroCertificado);
      push(
        'Tiempo de estancia hasta el deceso',
        this.etiquetaCatalogoDescripcion(
          this.opcionesTiempoEstanciaDecesoEgreso,
          f.tiempoEstanciaDeceso,
        ),
      );
      push(
        'Requiere necropsia',
        f.necropsia === 'si' ? 'Sí' : f.necropsia === 'no' ? 'No' : '',
      );
      push('Familiar informado', f.familiarInformado);
    }
    return filas;
  }

  private etiquetaNotificacionFugaPdf(): string {
    switch (this.egresoFuga.notificacion) {
      case 'seguridad':
        return 'Se notificó a seguridad del hospital';
      case 'familiar':
        return 'Se notificó al familiar / apoderado';
      case 'incidente':
        return 'Se generó reporte de incidente';
      default:
        return '';
    }
  }

  /** Lee draft de egreso de session sin mutar el estado del componente. */
  private leerDraftEgresoSession(
    idAtencion: number,
  ): EgresoDraftSession | null {
    if (!idAtencion || typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(`pa-egreso-draft-${idAtencion}`);
      if (!raw) return null;
      const data = JSON.parse(raw) as EgresoDraftSession;
      return data && typeof data === 'object' ? data : null;
    } catch {
      return null;
    }
  }

  /** Egreso para ficha bandeja: cabecera + draft session si existe + DX egreso API. */
  private pdfEgresoDesdeFicha(
    condicionEgreso: number | '',
    fechaEgreso: string,
    horaEgreso: string,
    diagnosticosEgreso: DiagnosticoBorradorPA[],
    draft: EgresoDraftSession | null,
  ): ContextoMapperPdfPa['egreso'] {
    const destinoCabecera = this.etiquetaCondicionEgresoDe(condicionEgreso);
    if (draft) {
      const clave = draft.destino;
      const registrado = Boolean(
        draft.altaDomicilioRegistrada ||
          draft.altaHospitalizacionRegistrada ||
          draft.altaFugaRegistrada ||
          draft.altaFallecidoRegistrada,
      );
      // Restaurar paneles temporales solo para etiquetar (snapshot).
      const snapDom = { ...this.egresoDomicilio };
      const snapHos = { ...this.egresoHospitalizacion };
      const snapFug = { ...this.egresoFuga };
      const snapFal = { ...this.egresoFallecido };
      if (draft.domicilio) Object.assign(this.egresoDomicilio, draft.domicilio);
      if (draft.hospitalizacion) {
        Object.assign(this.egresoHospitalizacion, draft.hospitalizacion);
      }
      if (draft.fuga) Object.assign(this.egresoFuga, draft.fuga);
      if (draft.fallecido) Object.assign(this.egresoFallecido, draft.fallecido);

      let detalle: ContextoMapperPdfPa['egreso']['detalle'] = [];
      let fecha = (fechaEgreso || '').trim();
      let hora = (horaEgreso || '').trim();
      const destino =
        this.destinosEgresoUi.find((d) => d.clave === clave)?.nombre ||
        destinoCabecera;
      let dxPdf = this.pdfDiagnosticosDesdeFilas(diagnosticosEgreso, 'egreso');

      if (clave === 'domicilio' || clave === 'hospitalizacion' || clave === 'fuga' || clave === 'fallecido') {
        detalle = this.pdfDetalleEgresoPorClave(clave);
        if (clave === 'domicilio') {
          fecha = draft.domicilio?.fecha || fecha;
          hora = draft.domicilio?.hora || hora;
        } else if (clave === 'hospitalizacion') {
          fecha = draft.hospitalizacion?.fecha || fecha;
          hora = draft.hospitalizacion?.hora || hora;
        } else if (clave === 'fuga') {
          fecha = draft.fuga?.fecha || fecha;
          hora = draft.fuga?.hora || hora;
        } else {
          fecha = draft.fallecido?.fecha || fecha;
          hora = draft.fallecido?.hora || hora;
        }
        const dxDraft =
          draft.diagnosticosPorDestino?.[clave] ?? draft.diagnosticos;
        if (Array.isArray(dxDraft) && dxDraft.length > 0) {
          dxPdf = this.pdfDiagnosticosDesdeFilas(dxDraft, 'egreso');
        }
      }

      Object.assign(this.egresoDomicilio, snapDom);
      Object.assign(this.egresoHospitalizacion, snapHos);
      Object.assign(this.egresoFuga, snapFug);
      Object.assign(this.egresoFallecido, snapFal);

      return {
        destino,
        fecha,
        hora,
        registrado,
        detalle,
        diagnosticos: dxPdf,
      };
    }

    return {
      destino: destinoCabecera,
      fecha: (fechaEgreso || '').trim(),
      hora: (horaEgreso || '').trim(),
      registrado: Boolean(destinoCabecera && destinoCabecera !== 'Sin seleccionar'),
      detalle: [],
      diagnosticos: this.pdfDiagnosticosDesdeFilas(diagnosticosEgreso, 'egreso'),
    };
  }

  private signosVitalesPdfDesdePaciente(item: IFilaBackend) {
    const pa = this.vital(item, [
      'presion_arterial',
      'PresionArterial',
      'pa',
    ]);
    const peso = this.vital(item, ['peso', 'Peso']);
    const talla = this.vital(item, ['talla', 'Talla', 'estatura', 'Estatura']);
    let imc: string | null = null;
    const nPeso = this.parseNumeroVital(peso);
    const nTalla = this.parseNumeroVital(talla);
    if (nPeso != null && nTalla != null && nTalla > 0) {
      const tallaM = nTalla > 3 ? nTalla / 100 : nTalla;
      imc = (nPeso / (tallaM * tallaM)).toFixed(1);
    }

    return {
      presionArterial: pa === '—' ? null : pa,
      frecuenciaCardiaca: this.vitalONull(item, [
        'frecuencia_cardiaca',
        'FrecuenciaCardiaca',
        'fc',
      ]),
      frecuenciaRespiratoria: this.vitalONull(item, [
        'frecuencia_respiratoria',
        'FrecuenciaRespiratoria',
        'fr',
      ]),
      temperatura: this.vitalONull(item, [
        'temperatura',
        'Temperatura',
        'temp',
      ]),
      saturacionOxigeno: this.vitalONull(item, [
        'saturacion_oxigeno',
        'Saturacion',
        'spo2',
      ]),
      peso: peso === '—' ? null : peso,
      talla: talla === '—' ? null : talla,
      imc,
      glucemia: this.vitalONull(item, [
        'glucemia',
        'Glucemia',
        'glicemia',
        'Glicemia',
      ]),
    };
  }

  private vitalONull(item: IFilaBackend, claves: string[]): string | null {
    const v = this.vital(item, claves);
    return !v || v === '—' ? null : v;
  }

  private etiquetaCatalogoDescripcion(
    opciones: ICatalogoDescripcion[],
    id: number | '',
  ): string {
    if (id === '' || id == null) return '';
    return opciones.find((o) => o.id === id)?.descripcion?.trim() || String(id);
  }

  private etiquetaEspecialidad(id: number | ''): string {
    if (id === '' || id == null) return '';
    return (
      this.opcionesEspecialidad.find((o) => o.id === id)?.nombre?.trim() ||
      String(id)
    );
  }

  private etiquetaVia(id: number | ''): string {
    if (id === '' || id == null) return '';
    return (
      this.opcionesVia.find((o) => o.idViaAdministracion === id)?.descripcion?.trim() ||
      String(id)
    );
  }

  // ——— Lectores de fila (tolerantes a nombres de columna del SP) ———

  cuenta(item: IFilaBackend): string {
    return (
      campo(item, [
        'IdCuentaAtencion',
        'idCuentaAtencion',
        'NroCuenta',
        'nroCuenta',
        'Cuenta',
        'cuenta',
      ]) || '—'
    );
  }

  historia(item: IFilaBackend): string {
    return (
      campo(item, [
        'NroHistoriaClinica',
        'nroHistoriaClinica',
        'Historia',
        'historia',
        'HC',
      ]) || '—'
    );
  }

  nombrePaciente(item: IFilaBackend): string {
    const completo = campo(item, [
      'Paciente',
      'paciente',
      'NombreCompleto',
      'nombreCompleto',
      'Nombre',
      'nombre',
    ]);
    if (completo) return completo;
    const partes = [
      campo(item, ['ApellidoPaterno', 'apellidoPaterno']),
      campo(item, ['ApellidoMaterno', 'apellidoMaterno']),
      campo(item, ['PrimerNombre', 'primerNombre']),
      campo(item, ['SegundoNombre', 'segundoNombre']),
    ].filter(Boolean);
    return partes.join(' ') || 'Paciente NN';
  }

  documento(item: IFilaBackend): string {
    return (
      campo(item, [
        'NroDocumento',
        'nroDocumento',
        'Documento',
        'documento',
        'DNI',
      ]) || '—'
    );
  }

  /**
   * Edad en años cumplidos: FechaNacimiento del SP vs fecha actual.
   * No usa columna Edad del backend.
   */
  edad(item: IFilaBackend): string {
    const partes = this.parseFechaSoloDia(item);
    if (!partes) return '';

    const { yyyy, mm, dd } = partes;
    const hoy = new Date();
    let anios = hoy.getFullYear() - yyyy;
    const mes = hoy.getMonth() + 1 - mm;
    if (mes < 0 || (mes === 0 && hoy.getDate() < dd)) {
      anios -= 1;
    }
    if (anios < 0) return '';
    return String(anios);
  }

  /** Extrae yyyy-mm-dd sin aplicar zona horaria del sufijo Z. */
  private parseFechaSoloDia(
    item: IFilaBackend,
  ): { yyyy: number; mm: number; dd: number } | null {
    const raw = campo(item, [
      'FechaNacimiento',
      'fechaNacimiento',
      'FecNacimiento',
      'fnac',
    ]);
    if (!raw) return null;
    const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return {
      yyyy: Number(m[1]),
      mm: Number(m[2]),
      dd: Number(m[3]),
    };
  }

  sexo(item: IFilaBackend): string {
    return (
      campo(item, ['Sexo', 'sexo', 'TipoSexo', 'tipoSexo', 'Genero', 'genero']) ||
      '—'
    );
  }

  idTipoPrioridad(item: IFilaBackend): number {
    return campoNum(item, [
      'IdTipoPrioridad',
      'idTipoPrioridad',
      'IdTiposGravedad',
      'idTiposGravedad',
      'Prioridad',
      'prioridad',
    ]);
  }

  prioridadInfo(
    item: IFilaBackend,
  ): { label: string; bg: string; text: string } | null {
    const id = this.idTipoPrioridad(item);
    return TIPO_PRIORIDAD_INFO[id] || null;
  }

  prioridadTexto(item: IFilaBackend): string {
    return campo(item, [
      'TipoPrioridad',
      'tipoPrioridad',
      'DescripcionPrioridad',
      'Prioridad',
    ]);
  }

  /**
   * Fecha/hora de ingreso (cabecera atención) desde FechaIngreso del SP.
   * Formato UI: "27/08/2025 08:55".
   */
  fechaHoraIngreso(item: IFilaBackend): string {
    const ingreso = this.parseFechaIngreso(item);
    if (!ingreso) return '—';
    return this.formatearFechaHora(ingreso);
  }

  /**
   * Fecha/hora de atención (Anamnesis): instante al abrir Iniciar/Continuar.
   * Formato UI: "27/08/2025 08:55".
   */
  fechaHoraAtencionTexto(): string {
    if (!this.fechaHoraAtencion) return '—';
    return this.formatearFechaHora(this.fechaHoraAtencion);
  }

  /** Formato local dd/MM/yyyy HH:mm (como la maqueta). */
  private formatearFechaHora(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  /** Lee FechaIngreso del SP; quita Z para no forzar UTC (igual que espera). */
  private parseFechaIngreso(item: IFilaBackend): Date | null {
    const raw = campo(item, [
      'FechaIngreso',
      'fechaIngreso',
      'FechaHoraIngreso',
      'fecha_Triaje',
      'FechaTriaje',
    ]);
    if (!raw) return null;

    let texto = raw.trim();
    if (texto.endsWith('Z')) texto = texto.slice(0, -1);

    const ingreso = new Date(texto);
    if (Number.isNaN(ingreso.getTime())) return null;
    return ingreso;
  }

  /**
   * Espera = ahoraConsulta − FechaIngreso (del SP).
   * Se refresca al pulsar Actualizar / cargar bandeja (handleBuscar).
   * Formato: "0h 14min", "1h 05min".
   */
  espera(item: IFilaBackend): string {
    const ingreso = this.parseFechaIngreso(item);
    if (!ingreso) return '—';

    let diffMs = this.ahoraConsulta.getTime() - ingreso.getTime();
    if (diffMs < 0) diffMs = 0;

    const totalMin = Math.floor(diffMs / 60000);
    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    return `${horas}h ${String(minutos).padStart(2, '0')}min`;
  }

  consultorio(item: IFilaBackend): string {
    return (
      campo(item, [
        'Consultorio',
        'consultorio',
        'Servicio',
        'servicio',
        'DescripcionServicio',
      ]) || '—'
    );
  }

  medico(item: IFilaBackend): string {
    return (
      campo(item, [
        'Medico',
        'medico',
        'NombreMedico',
        'nombreMedico',
        'MedicoAsignado',
      ]) || '—'
    );
  }

  estadoClave(item: IFilaBackend): string {
    const raw = campo(item, [
      'Estado',
      'estado',
      'EstadoAtencion',
      'estadoAtencion',
      'DescEstado',
    ])
      .toLowerCase()
      .trim();
    if (!raw) return 'pendiente';
    if (raw.includes('atend')) return 'atendido';
    if (
      raw.includes('curso') ||
      raw.includes('atención') ||
      raw.includes('atencion')
    )
      return 'curso';
    if (raw.includes('pend')) return 'pendiente';
    return raw;
  }

  estadoLabel(item: IFilaBackend): string {
    const k = this.estadoClave(item);
    return ESTADO_LABEL[k] || campo(item, ['Estado', 'estado']) || '—';
  }

  /**
   * Fecha de nacimiento solo día + edad: "1978-09-11 (48 años)".
   * Usado en la cabecera del registro de atención.
   */
  fechaNacimiento(item: IFilaBackend): string {
    const partes = this.parseFechaSoloDia(item);
    if (!partes) return '—';

    const fechaSolo = `${partes.yyyy}-${String(partes.mm).padStart(2, '0')}-${String(partes.dd).padStart(2, '0')}`;
    const anios = this.edad(item);
    return anios ? `${fechaSolo} (${anios} años)` : fechaSolo;
  }

  estadoCivil(item: IFilaBackend): string {
    return (
      campo(item, [
        'Estado_Civil',
        'EstadoCivil',
        'estadoCivil',
        'DescEstadoCivil',
      ]) || '—'
    );
  }

  ocupacion(item: IFilaBackend): string {
    return campo(item, ['Ocupacion', 'ocupacion', 'DescOcupacion']) || '—';
  }

  direccion(item: IFilaBackend): string {
    return (
      campo(item, [
        'DireccionDomicilio',
        'direccionDomicilio',
        'Direccion',
        'direccion',
      ]) || '—'
    );
  }

  procedencia(item: IFilaBackend): string {
    return (
      campo(item, [
        'Direccion_Procedencia',
        'DireccionProcedencia',
        'direccion_procedencia',
        'LugarProcedencia',
        'lugarProcedencia',
        'Procedencia',
        'procedencia',
      ]) || '—'
    );
  }

  telefono(item: IFilaBackend): string {
    return campo(item, ['Telefono', 'telefono', 'Celular', 'celular']) || '—';
  }

  acompanante(item: IFilaBackend): string {
    const nom = campo(item, [
      'NombreAcompañante',
      'NombreAcompaniante',
      'nombreAcompaniante',
      'Acompanante',
      'acompanante',
    ]);
    const tel = campo(item, [
      'Telefono_Acompaniante',
      'TelefonoAcompaniante',
      'telefonoAcompaniante',
    ]);
    if (!nom && !tel) return '—';
    return tel ? `${nom || '—'} (${tel})` : nom;
  }

  /**
   * Algunos vitales llegan en Base64 desde SQL Server
   * (ej. temperatura "MzYuMA==" → "36.0", saturacion_oxigeno "OTguMDA=" → "98.00").
   * Glasgow suele venir numérico y no pasa por esto.
   */
  private decodificarSiBase64(valor: string): string {
    const v = valor.trim();
    if (!v || v.length < 4) return v;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(v) || v.length % 4 !== 0) return v;
    try {
      const dec = atob(v).replace(/\0/g, '').trim();
      if (!dec) return v;
      // Acepta "36.0", "98.00", "120/80", etc.
      if (/^[\d.,/\-\s]+$/.test(dec)) return dec.replace(',', '.');
      // Si es texto imprimible corto, también usarlo
      if (/^[\x20-\x7E]+$/.test(dec) && dec.length <= 32) return dec;
      return v;
    } catch {
      return v;
    }
  }

  vital(item: IFilaBackend, claves: string[]): string {
    const raw = campo(item, claves);
    if (!raw) return '—';
    return this.decodificarSiBase64(raw) || '—';
  }

  /**
   * Color del círculo de estado junto al título del vital.
   * Verde / amarillo / rojo según rangos clínicos acordados.
   * F.P.: 60–100 verde; 40–59 / 101–130 amarillo; <40 / >130 rojo.
   * PESO: neutro (sin rango definido).
   */
  colorEstadoVital(
    tipo:
      | 'temp'
      | 'fr'
      | 'fc'
      | 'fp'
      | 'peso'
      | 'spo2'
      | 'glasgow',
    item: IFilaBackend,
  ): string {
    const claves: Record<string, string[]> = {
      temp: ['temperatura', 'Temperatura', 'temp'],
      fr: ['frecuencia_respiratoria', 'FrecuenciaRespiratoria', 'fr'],
      fc: ['frecuencia_cardiaca', 'FrecuenciaCardiaca', 'fc'],
      fp: ['frecuencia_pulso', 'FrecuenciaPulso', 'fp'],
      peso: ['peso', 'Peso'],
      spo2: ['saturacion_oxigeno', 'Saturacion', 'spo2'],
      glasgow: ['escala_glasgow', 'Glasgow', 'glasgow'],
    };
    const n = this.parseNumeroVital(this.vital(item, claves[tipo]));
    if (n == null) return COLOR_VITAL.neutro;

    switch (tipo) {
      case 'temp':
        if (n >= 36.5 && n <= 37.3) return COLOR_VITAL.verde;
        if ((n >= 35.0 && n <= 36.4) || (n >= 37.4 && n <= 39.9))
          return COLOR_VITAL.amarillo;
        if (n < 35.0 || n >= 40.0) return COLOR_VITAL.rojo;
        return COLOR_VITAL.neutro;
      case 'fc':
        if (n >= 60 && n <= 100) return COLOR_VITAL.verde;
        if ((n >= 50 && n <= 59) || (n >= 101 && n <= 120))
          return COLOR_VITAL.amarillo;
        if (n < 50 || n > 120) return COLOR_VITAL.rojo;
        return COLOR_VITAL.neutro;
      case 'fp':
        // Rojo tiene prioridad sobre amarillo (<40 / >130 vs <60 / >100).
        if (n < 40 || n > 130) return COLOR_VITAL.rojo;
        if (n < 60 || n > 100) return COLOR_VITAL.amarillo;
        if (n >= 60 && n <= 100) return COLOR_VITAL.verde;
        return COLOR_VITAL.neutro;
      case 'fr':
        if (n >= 12 && n <= 18) return COLOR_VITAL.verde;
        if ((n >= 9 && n <= 11) || (n >= 19 && n <= 24))
          return COLOR_VITAL.amarillo;
        if (n <= 8 || n >= 25) return COLOR_VITAL.rojo;
        return COLOR_VITAL.neutro;
      case 'spo2':
        if (n >= 95 && n <= 100) return COLOR_VITAL.verde;
        if (n >= 90 && n <= 94) return COLOR_VITAL.amarillo;
        if (n < 90) return COLOR_VITAL.rojo;
        return COLOR_VITAL.neutro;
      case 'glasgow':
        if (n === 15) return COLOR_VITAL.verde;
        if (n >= 9 && n <= 14) return COLOR_VITAL.amarillo;
        if (n >= 3 && n <= 8) return COLOR_VITAL.rojo;
        return COLOR_VITAL.neutro;
      case 'peso':
      default:
        return COLOR_VITAL.neutro;
    }
  }

  /**
   * Color del valor numérico: mismo que el estado;
   * neutro → blanco.
   */
  colorTextoVital(
    tipo:
      | 'temp'
      | 'fr'
      | 'fc'
      | 'fp'
      | 'peso'
      | 'spo2'
      | 'glasgow',
    item: IFilaBackend,
  ): string {
    const c = this.colorEstadoVital(tipo, item);
    return c === COLOR_VITAL.neutro ? COLOR_VITAL.textoNeutro : c;
  }

  /**
   * P.A. para pintar: cada número con su color (sistólica / diastólica).
   */
  partesPaTexto(item: IFilaBackend): {
    sistolica: string;
    diastolica: string;
    colorSistolica: string;
    colorDiastolica: string;
  } | null {
    const raw = this.vital(item, [
      'presion_arterial',
      'PresionArterial',
      'pa',
    ]);
    const partes = this.parsePresionArterial(raw);
    if (!partes) return null;
    const colorSis = this.colorSistolica(partes.sistolica);
    const colorDia = this.colorDiastolica(partes.diastolica);
    return {
      sistolica: String(partes.sistolica),
      diastolica: String(partes.diastolica),
      colorSistolica:
        colorSis === COLOR_VITAL.neutro ? COLOR_VITAL.textoNeutro : colorSis,
      colorDiastolica:
        colorDia === COLOR_VITAL.neutro ? COLOR_VITAL.textoNeutro : colorDia,
    };
  }

  /**
   * P.A.: un círculo partido — mitad sistólica / mitad diastólica.
   * Cada número se evalúa por su propio rango (no como un solo valor).
   */
  coloresPa(item: IFilaBackend): { sistolica: string; diastolica: string } {
    const raw = this.vital(item, [
      'presion_arterial',
      'PresionArterial',
      'pa',
    ]);
    const partes = this.parsePresionArterial(raw);
    return {
      sistolica: this.colorSistolica(partes?.sistolica ?? null),
      diastolica: this.colorDiastolica(partes?.diastolica ?? null),
    };
  }

  estiloCirculoPa(item: IFilaBackend): string {
    const c = this.coloresPa(item);
    // Mitad izquierda = sistólica, derecha = diastólica
    return `conic-gradient(from 180deg, ${c.sistolica} 0deg 180deg, ${c.diastolica} 180deg 360deg)`;
  }

  private colorSistolica(n: number | null): string {
    if (n == null) return COLOR_VITAL.neutro;
    if (n < 120) return COLOR_VITAL.verde;
    if (n <= 139) return COLOR_VITAL.amarillo;
    return COLOR_VITAL.rojo; // ≥ 140
  }

  private colorDiastolica(n: number | null): string {
    if (n == null) return COLOR_VITAL.neutro;
    if (n < 80) return COLOR_VITAL.verde;
    if (n <= 89) return COLOR_VITAL.amarillo;
    return COLOR_VITAL.rojo; // ≥ 90
  }

  private parsePresionArterial(
    texto: string,
  ): { sistolica: number; diastolica: number } | null {
    if (!texto || texto === '—') return null;
    const m = texto.trim().match(/^(\d+(?:[.,]\d+)?)\s*[/]\s*(\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    const s = Number(m[1].replace(',', '.'));
    const d = Number(m[2].replace(',', '.'));
    if (Number.isNaN(s) || Number.isNaN(d)) return null;
    return { sistolica: s, diastolica: d };
  }

  private parseNumeroVital(texto: string): number | null {
    if (!texto || texto === '—') return null;
    const m = texto.trim().match(/^(\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    const n = Number(m[1].replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  }

  iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/);
    return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
  }

  /* ═══════════════════════════════════════════════════════════
     EXÁMENES — RecetaCabecera + RecetaDetalle (IdPuntoCarga del catálogo)
     Vista opción A: combo DX + buscar/agregar → tabla global por PuntoCarga
     ═══════════════════════════════════════════════════════════ */

  /** DX con CIE elegido (aptos para asociar exámenes/procedimientos). */
  diagnosticosConCie(): { indice: number; dx: DiagnosticoBorradorPA }[] {
    return this.diagnosticos
      .map((dx, indice) => ({ dx, indice }))
      .filter(
        ({ dx }) =>
          typeof dx.idDiagnostico === 'number' && dx.idDiagnostico > 0,
      );
  }

  private primerIdDiagnosticoValido(): number | null {
    const row = this.diagnosticosConCie()[0];
    if (!row) return null;
    return typeof row.dx.idDiagnostico === 'number' ? row.dx.idDiagnostico : null;
  }

  private vincularHuerfanosProcAlPrimerDx(): void {
    const idDx = this.primerIdDiagnosticoValido();
    if (idDx == null) return;
    for (const p of this.procedimientos) {
      if (p.idDiagnostico == null) p.idDiagnostico = idDx;
    }
  }

  asegurarDxActivoExamen(): void {
    const validos = this.diagnosticosConCie();
    if (validos.length === 0) {
      this.indiceDxExamenActivo = null;
      return;
    }
    if (
      this.indiceDxExamenActivo == null ||
      !validos.some((v) => v.indice === this.indiceDxExamenActivo)
    ) {
      this.indiceDxExamenActivo = validos[0].indice;
    }
  }

  asegurarDxActivoProc(): void {
    const validos = this.diagnosticosConCie();
    if (validos.length === 0) {
      this.indiceDxProcActivo = null;
      return;
    }
    if (
      this.indiceDxProcActivo == null ||
      !validos.some((v) => v.indice === this.indiceDxProcActivo)
    ) {
      this.indiceDxProcActivo = validos[0].indice;
    }
  }

  asegurarDxActivoMed(): void {
    const validos = this.diagnosticosConCie();
    if (validos.length === 0) {
      this.indiceDxMedActivo = null;
      return;
    }
    if (
      this.indiceDxMedActivo == null ||
      !validos.some((v) => v.indice === this.indiceDxMedActivo)
    ) {
      this.indiceDxMedActivo = validos[0].indice;
    }
  }

  seleccionarDxExamen(indice: number): void {
    this.indiceDxExamenActivo = indice;
    this.errorEx = '';
  }

  seleccionarDxProc(indice: number): void {
    this.indiceDxProcActivo = indice;
    this.errorProc = '';
  }

  seleccionarDxMed(indice: number): void {
    this.indiceDxMedActivo = indice;
    this.errorMedicamentos = '';
  }

  idDiagnosticoActivoExamen(): number | null {
    if (this.indiceDxExamenActivo == null) return null;
    const dx = this.diagnosticos[this.indiceDxExamenActivo];
    return typeof dx?.idDiagnostico === 'number' && dx.idDiagnostico > 0
      ? dx.idDiagnostico
      : null;
  }

  /** CIE-10 del DX activo (paso Exámenes) → RecetaDetalle.CodigoDiagnostico. */
  codigoDiagnosticoActivoExamen(): string {
    if (this.indiceDxExamenActivo == null) return '';
    const dx = this.diagnosticos[this.indiceDxExamenActivo];
    return (dx?.cie10 || '').trim();
  }

  idDiagnosticoActivoProc(): number | null {
    if (this.indiceDxProcActivo == null) return null;
    const dx = this.diagnosticos[this.indiceDxProcActivo];
    return typeof dx?.idDiagnostico === 'number' && dx.idDiagnostico > 0
      ? dx.idDiagnostico
      : null;
  }

  /** CIE-10 del DX activo (paso Procedimientos) → RecetaDetalle.CodigoDiagnostico. */
  codigoDiagnosticoActivoProc(): string {
    if (this.indiceDxProcActivo == null) return '';
    const dx = this.diagnosticos[this.indiceDxProcActivo];
    return (dx?.cie10 || '').trim();
  }

  idDiagnosticoActivoMed(): number | null {
    if (this.indiceDxMedActivo == null) return null;
    const dx = this.diagnosticos[this.indiceDxMedActivo];
    return typeof dx?.idDiagnostico === 'number' && dx.idDiagnostico > 0
      ? dx.idDiagnostico
      : null;
  }

  codigoDiagnosticoActivoMed(): string {
    if (this.indiceDxMedActivo == null) return '';
    const dx = this.diagnosticos[this.indiceDxMedActivo];
    return (dx?.cie10 || '').trim();
  }

  etiquetaDxActivoExamen(): string {
    if (this.indiceDxExamenActivo == null) return '—';
    const n =
      this.diagnosticosConCie().findIndex(
        (v) => v.indice === this.indiceDxExamenActivo,
      ) + 1;
    if (n <= 0) return '—';
    const cie = (
      this.diagnosticos[this.indiceDxExamenActivo]?.cie10 || ''
    ).trim();
    return cie ? `DX${n} · ${cie}` : `DX${n}`;
  }

  etiquetaDxActivoProc(): string {
    if (this.indiceDxProcActivo == null) return '—';
    const n =
      this.diagnosticosConCie().findIndex(
        (v) => v.indice === this.indiceDxProcActivo,
      ) + 1;
    if (n <= 0) return '—';
    const cie = (
      this.diagnosticos[this.indiceDxProcActivo]?.cie10 || ''
    ).trim();
    return cie ? `DX${n} · ${cie}` : `DX${n}`;
  }

  etiquetaDxActivoMed(): string {
    if (this.indiceDxMedActivo == null) return '—';
    const n =
      this.diagnosticosConCie().findIndex(
        (v) => v.indice === this.indiceDxMedActivo,
      ) + 1;
    if (n <= 0) return '—';
    const cie = (
      this.diagnosticos[this.indiceDxMedActivo]?.cie10 || ''
    ).trim();
    return cie ? `DX${n} · ${cie}` : `DX${n}`;
  }

  /**
   * Reconstruye la vista agrupada por IdPuntoCarga (todos los DX).
   * Llamar tras alta, baja o rehidratacion — no recalcular en el template.
   */
  private reconstruirGruposExamenes(): void {
    type Acc = {
      etiqueta: string;
      idPunto: number | null;
      indices: number[];
    };
    const map = new Map<string, Acc>();
    this.examenes.forEach((e, i) => {
      if (e.idProducto == null && !(e.nombre || '').trim()) return;
      const idPunto =
        typeof e.idPuntoCarga === 'number' && e.idPuntoCarga > 0
          ? e.idPuntoCarga
          : null;
      const etiqueta = (e.puntoCarga || '').trim() || 'Sin punto de carga';
      const clave = idPunto != null ? `id:${idPunto}` : `nom:${etiqueta}`;
      let g = map.get(clave);
      if (!g) {
        g = { etiqueta, idPunto, indices: [] };
        map.set(clave, g);
      }
      g.indices.push(i);
    });
    const ordenados = [...map.entries()].sort((a, b) => {
      if (a[1].etiqueta === 'Sin punto de carga') return 1;
      if (b[1].etiqueta === 'Sin punto de carga') return -1;
      return a[1].etiqueta.localeCompare(b[1].etiqueta, 'es');
    });
    let ordinal = 0;
    this.gruposExamenVista = ordenados.map(([clave, g]) => ({
      clave,
      etiqueta: g.etiqueta,
      claseCss: this.claseGrupoPuntoCarga(g.etiqueta),
      filas: g.indices.map((indice) => {
        ordinal += 1;
        return {
          indice,
          ordinal,
          cie10: this.cie10DeExamen(indice),
          tipo: this.tipoDeExamen(indice),
        };
      }),
    }));
  }

  private claseGrupoPuntoCarga(etiqueta: string): string {
    const t = etiqueta.toUpperCase();
    if (t.includes('PATOLOG') || t.includes('LAB')) {
      return 'pa-exa-grupo pa-exa-grupo--lab';
    }
    if (
      t.includes('RAYOS') ||
      t.includes('IMAGEN') ||
      t.includes('ECO') ||
      t.includes('TOMO')
    ) {
      return 'pa-exa-grupo pa-exa-grupo--rayos';
    }
    return 'pa-exa-grupo';
  }

  private cie10DeExamen(indiceFila: number): string {
    const id = this.examenes[indiceFila]?.idDiagnostico;
    if (id == null) return '';
    return this.cie10DeDiagnostico(id);
  }

  private tipoDeExamen(indiceFila: number): string {
    const id = this.examenes[indiceFila]?.idDiagnostico;
    if (id == null) return '—';
    const dx = this.diagnosticos.find(
      (d) => typeof d.idDiagnostico === 'number' && d.idDiagnostico === id,
    );
    if (!dx) return '—';
    return (
      this.etiquetaTipoDxPa(dx.idSubclasificacionDx) ||
      this.nombreDesdeTipoLetra(dx.tipo) ||
      '—'
    );
  }

  private resetBarraAltaExamen(): void {
    this.textoBusquedaExamen = '';
    this.sugerenciasAltaEx = [];
    this.cargandoAltaEx = false;
    this.altaExActiva = false;
    if (this.debounceAltaEx) {
      clearTimeout(this.debounceAltaEx);
      this.debounceAltaEx = null;
    }
  }

  indicesProcedimientosDxActivo(): number[] {
    const idDx = this.idDiagnosticoActivoProc();
    if (idDx == null) return [];
    return this.procedimientos
      .map((p, i) => (p.idDiagnostico === idDx ? i : -1))
      .filter((i) => i >= 0);
  }

  indicesMedicamentosDxActivo(): number[] {
    const idDx = this.idDiagnosticoActivoMed();
    if (idDx == null) return [];
    return this.medicamentos
      .map((m, i) => (m.idDiagnostico === idDx ? i : -1))
      .filter((i) => i >= 0);
  }

  conteoExamenesPorDx(indiceDx: number): number {
    const dx = this.diagnosticos[indiceDx];
    if (!dx || typeof dx.idDiagnostico !== 'number') return 0;
    const id = dx.idDiagnostico;
    return this.examenes.filter(
      (e) => e.idDiagnostico === id && (e.idProducto != null || !!e.nombre.trim()),
    ).length;
  }

  conteoProcedimientosPorDx(indiceDx: number): number {
    const dx = this.diagnosticos[indiceDx];
    if (!dx || typeof dx.idDiagnostico !== 'number') return 0;
    const id = dx.idDiagnostico;
    return this.procedimientos.filter(
      (p) =>
        p.idDiagnostico === id && (p.idProducto != null || !!p.nombre.trim()),
    ).length;
  }

  conteoMedicamentosPorDx(indiceDx: number): number {
    const dx = this.diagnosticos[indiceDx];
    if (!dx || typeof dx.idDiagnostico !== 'number') return 0;
    const id = dx.idDiagnostico;
    return this.medicamentos.filter(
      (m) =>
        m.idDiagnostico === id &&
        (m.idProducto !== '' || !!m.nombre.trim()),
    ).length;
  }

  onEscribeAltaExamen(valor: string): void {
    if (this.guardandoAltaEx) return;
    this.textoBusquedaExamen = valor;
    this.buscarAltaExamen(valor);
  }

  abrirSugerenciasAltaEx(): void {
    if (this.guardandoAltaEx) return;
    this.altaExActiva = true;
    const q = (this.textoBusquedaExamen || '').trim();
    if (q.length >= MIN_CARACTERES_EX) {
      this.buscarAltaExamen(q);
    }
  }

  buscarAltaExamen(texto: string): void {
    if (this.debounceAltaEx) clearTimeout(this.debounceAltaEx);
    this.altaExActiva = true;
    const q = (texto || '').trim();
    if (q.length < MIN_CARACTERES_EX) {
      this.sugerenciasAltaEx = [];
      this.cargandoAltaEx = false;
      return;
    }
    this.debounceAltaEx = setTimeout(() => {
      void this.consultarCatalogoAltaEx(q);
    }, DEBOUNCE_EX_MS);
  }

  cerrarSugerenciasAltaEx(): void {
    setTimeout(() => {
      this.altaExActiva = false;
      this.limpiarPosicionSugerencia();
      this.cdr.detectChanges();
    }, 200);
  }

  mostrarSugerenciasAltaEx(): boolean {
    if (this.guardandoAltaEx) return false;
    const q = (this.textoBusquedaExamen || '').trim();
    return (
      this.altaExActiva &&
      q.length >= MIN_CARACTERES_EX &&
      (this.cargandoAltaEx || this.sugerenciasAltaEx.length > 0)
    );
  }

  agregarExamenDesdeCatalogo(opcion: ItemExamenCat): void {
    void this.agregarExamenDesdeCatalogoAsync(opcion);
  }

  /**
   * Alta atomica: valida → POST BD → solo entonces inserta en examenes
   * y reconstruye grupos por PuntoCarga.
   */
  private async agregarExamenDesdeCatalogoAsync(
    opcion: ItemExamenCat,
  ): Promise<void> {
    if (this.guardandoAltaEx || this.eliminandoExIndex != null) return;

    this.asegurarDxActivoExamen();
    const idDx = this.idDiagnosticoActivoExamen();
    const codigoDx = this.codigoDiagnosticoActivoExamen();
    if (idDx == null) {
      this.errorEx =
        'Registre al menos un diagnóstico CIE en el paso 3 antes de agregar exámenes.';
      this.cdr.detectChanges();
      return;
    }
    if (!codigoDx) {
      this.errorEx =
        'El diagnóstico seleccionado no tiene código CIE-10 (CodigoDiagnostico).';
      this.cdr.detectChanges();
      return;
    }

    const idProducto = opcion.idProducto;
    const idPuntoCarga =
      typeof opcion.idPuntoCarga === 'number' && opcion.idPuntoCarga > 0
        ? opcion.idPuntoCarga
        : null;
    if (!idProducto || !idPuntoCarga) {
      this.errorEx =
        'El examen del catálogo no trae IdProducto o IdPuntoCarga.';
      this.cdr.detectChanges();
      return;
    }
    if (
      this.examenes.some(
        (e) => e.idProducto === idProducto && e.idDiagnostico === idDx,
      )
    ) {
      this.errorEx = 'Ese examen ya está asociado al diagnóstico seleccionado.';
      this.cdr.detectChanges();
      return;
    }

    const idAtencion = this.idAtencionActivo();
    const idPrimera = this.persistencia.idPrimeraAtencion;
    const ctx = this.idsContextoExamenGuardar();
    if (!idAtencion || !idPrimera || !ctx) {
      this.errorEx =
        'No se pudo guardar el examen: faltan cuenta, servicio o IdAtencion.';
      this.cdr.detectChanges();
      return;
    }

    const precio =
      typeof opcion.precioUnitario === 'number' ? opcion.precioUnitario : 0;
    const nombre = (opcion.nombre || '').trim();
    const codigo = (opcion.codigo || '').trim();
    const puntoCarga = (opcion.puntoCarga || '').trim() || null;

    this.guardandoAltaEx = true;
    this.errorEx = '';
    this.altaExActiva = false;
    this.cdr.detectChanges();

    try {
      const resp = await this.api.registrarExamen(idAtencion, {
        idPrimeraAtencion: idPrimera,
        idCuentaAtencion: ctx.idCuentaAtencion,
        idPuntoCarga,
        idServicioReceta: ctx.idServicioReceta,
        idPaciente: ctx.idPaciente,
        idUsuarioAuditoria: this.authService.getIdEmpleado() || 0,
        idProducto,
        precio,
        idDiagnostico: idDx,
        codigoDiagnostico: codigoDx,
      });

      const idReceta = resp.idReceta ?? null;
      if (idReceta == null || idReceta <= 0) {
        this.errorEx = 'El servidor no devolvió IdReceta al registrar el examen.';
        return;
      }

      this.examenes.push({
        nombre,
        codigo,
        idProducto: resp.idProducto || idProducto,
        idReceta,
        idPuntoCarga,
        puntoCarga,
        precioUnitario:
          typeof resp.precio === 'number' ? resp.precio : precio,
        total: typeof resp.total === 'number' ? resp.total : precio,
        idDiagnostico:
          resp.idDiagnostico != null && resp.idDiagnostico > 0
            ? resp.idDiagnostico
            : idDx,
      });
      this.resetBarraAltaExamen();
      this.reconstruirGruposExamenes();
    } catch (err: unknown) {
      this.errorEx =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo guardar el examen.';
    } finally {
      this.guardandoAltaEx = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * X: DELETE en BD (si esta persistido) y luego saca de la tabla agrupada.
   * Si falla el DELETE, la fila permanece.
   */
  quitarExamen(i: number): void {
    void this.quitarExamenAsync(i);
  }

  private async quitarExamenAsync(i: number): Promise<void> {
    if (this.guardandoAltaEx || this.eliminandoExIndex != null) return;
    const fila = this.examenes[i];
    if (!fila) return;

    // Optimistic: sale de la lista al instante; si el API falla, se restaura.
    const snapshot = { ...fila };
    const indiceOriginal = i;
    this.examenes.splice(i, 1);
    this.reconstruirGruposExamenes();
    this.eliminandoExIndex = null;
    this.errorEx = '';
    this.cdr.detectChanges();

    if (snapshot.idReceta == null || snapshot.idReceta <= 0 || snapshot.idProducto == null) {
      return;
    }

    try {
      const idAtencion = this.idAtencionActivo();
      const idPrimera = this.persistencia.idPrimeraAtencion;
      const ctx = this.idsContextoExamenGuardar();
      if (!idAtencion || !idPrimera || !ctx) {
        throw new Error(
          'No se pudo eliminar: faltan IdAtencion, IdPrimeraAtencion o cuenta.',
        );
      }
      await this.api.eliminarExamen(
        idAtencion,
        snapshot.idReceta,
        snapshot.idProducto,
        ctx.idCuentaAtencion,
        idPrimera,
      );
    } catch (err: unknown) {
      const insertAt = Math.min(indiceOriginal, this.examenes.length);
      this.examenes.splice(insertAt, 0, snapshot);
      this.reconstruirGruposExamenes();
      this.errorEx =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo eliminar el examen.';
      this.cdr.detectChanges();
    }
  }

  private cie10DeDiagnostico(idDiagnostico: number): string {
    const dx = this.diagnosticos.find(
      (d) =>
        typeof d.idDiagnostico === 'number' && d.idDiagnostico === idDiagnostico,
    );
    return (dx?.cie10 || '').trim();
  }

  /**
   * Contexto para guardar/eliminar examenes (cuenta, servicio, paciente).
   * El IdPuntoCarga de la cabecera del examen viene del catalogo por item.
   * El listado excluye farmacia (=5) en el backend; no usa bandeja.
   */
  private idsContextoExamenGuardar(): {
    idCuentaAtencion: number;
    idServicioReceta: number;
    idPaciente: number;
  } | null {
    const p = this.pacienteSeleccionado;
    if (!p) return null;
    const idCuentaAtencion = this.idCuentaAtencionActivo(p);
    const idServicioReceta = campoNum(p, [
      'IdServicio',
      'idServicio',
      'IdServicioReceta',
      'idServicioReceta',
    ]);
    const idPaciente = campoNum(p, ['IdPaciente', 'idPaciente']);
    if (!idCuentaAtencion || !idServicioReceta || !idPaciente) {
      return null;
    }
    return {
      idCuentaAtencion,
      idServicioReceta,
      idPaciente,
    };
  }

  /** IdFormaPago de la bandeja → @IdTipoFinanciamiento del catalogo de examenes. */
  private idTipoFinanciamientoExamen(): number | null {
    const p = this.pacienteSeleccionado;
    if (!p) return null;
    const id = campoNum(p, [
      'IdFormaPago',
      'idFormaPago',
      'IdTipoFinanciamiento',
      'idTipoFinanciamiento',
    ]);
    return id || null;
  }

  private async consultarCatalogoAltaEx(filtro: string): Promise<void> {
    const idTipoFinanciamiento = this.idTipoFinanciamientoExamen();
    if (!idTipoFinanciamiento) {
      this.errorEx =
        'No se pudo obtener IdFormaPago de la bandeja para buscar exámenes.';
      this.sugerenciasAltaEx = [];
      this.cargandoAltaEx = false;
      this.cdr.detectChanges();
      return;
    }
    const seq = this.secuenciaAltaEx + 1;
    this.secuenciaAltaEx = seq;
    this.cargandoAltaEx = true;
    this.errorEx = '';
    this.cdr.detectChanges();
    try {
      const items = await this.maestrosApi.getExamenesCatalogo({
        filtro,
        idTipoFinanciamiento,
      });
      if (this.secuenciaAltaEx !== seq) return;
      this.sugerenciasAltaEx = Array.isArray(items) ? items : [];
    } catch (err: unknown) {
      if (this.secuenciaAltaEx !== seq) return;
      this.sugerenciasAltaEx = [];
      this.errorEx =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo buscar exámenes.';
    } finally {
      if (this.secuenciaAltaEx === seq) {
        this.cargandoAltaEx = false;
      }
      this.cdr.detectChanges();
    }
  }
  /* ═══════════════════════════════════════════════════════════
     PROCEDIMIENTOS — RecetaCabecera fija IdPuntoCarga=26
     Combo DX + buscar/seleccionar → tabla global (sin agrupar)
     ═══════════════════════════════════════════════════════════ */

  /** Lista plana en orden de alta (todos los DX; sin grupos PuntoCarga). */
  private reconstruirVistaProcedimientos(): void {
    let ordinal = 0;
    this.procedimientosVista = [];
    this.procedimientos.forEach((p, indice) => {
      if (p.idProducto == null && !(p.nombre || '').trim()) return;
      ordinal += 1;
      this.procedimientosVista.push({
        indice,
        ordinal,
        cie10: this.cie10DeProc(indice),
        tipo: this.tipoDeProc(indice),
      });
    });
  }

  private cie10DeProc(indiceFila: number): string {
    const id = this.procedimientos[indiceFila]?.idDiagnostico;
    if (id == null) return '';
    return this.cie10DeDiagnostico(id);
  }

  private tipoDeProc(indiceFila: number): string {
    const id = this.procedimientos[indiceFila]?.idDiagnostico;
    if (id == null) return '—';
    const dx = this.diagnosticos.find(
      (d) => typeof d.idDiagnostico === 'number' && d.idDiagnostico === id,
    );
    if (!dx) return '—';
    return (
      this.etiquetaTipoDxPa(dx.idSubclasificacionDx) ||
      this.nombreDesdeTipoLetra(dx.tipo) ||
      '—'
    );
  }

  private resetBarraAltaProc(): void {
    this.textoBusquedaProc = '';
    this.sugerenciasAltaProc = [];
    this.cargandoAltaProc = false;
    this.altaProcActiva = false;
    if (this.debounceAltaProc) {
      clearTimeout(this.debounceAltaProc);
      this.debounceAltaProc = null;
    }
  }

  onEscribeAltaProc(valor: string): void {
    if (this.guardandoAltaProc) return;
    this.textoBusquedaProc = valor;
    this.buscarAltaProc(valor);
  }

  abrirSugerenciasAltaProc(): void {
    if (this.guardandoAltaProc) return;
    this.altaProcActiva = true;
    const q = (this.textoBusquedaProc || '').trim();
    if (q.length >= MIN_CARACTERES_PROC) {
      this.buscarAltaProc(q);
    }
  }

  buscarAltaProc(texto: string): void {
    if (this.debounceAltaProc) clearTimeout(this.debounceAltaProc);
    this.altaProcActiva = true;
    const q = (texto || '').trim();
    if (q.length < MIN_CARACTERES_PROC) {
      this.sugerenciasAltaProc = [];
      this.cargandoAltaProc = false;
      return;
    }
    this.debounceAltaProc = setTimeout(() => {
      void this.consultarCatalogoAltaProc(q);
    }, DEBOUNCE_PROC_MS);
  }

  cerrarSugerenciasAltaProc(): void {
    setTimeout(() => {
      this.altaProcActiva = false;
      this.limpiarPosicionSugerencia();
      this.cdr.detectChanges();
    }, 200);
  }

  mostrarSugerenciasAltaProc(): boolean {
    if (this.guardandoAltaProc) return false;
    const q = (this.textoBusquedaProc || '').trim();
    return (
      this.altaProcActiva &&
      q.length >= MIN_CARACTERES_PROC &&
      (this.cargandoAltaProc || this.sugerenciasAltaProc.length > 0)
    );
  }

  agregarProcedimientoDesdeCatalogo(opcion: ItemProcedimientoCat): void {
    void this.agregarProcedimientoDesdeCatalogoAsync(opcion);
  }

  /**
   * Alta atomica: valida → POST BD (cabecera 26) → inserta al final de la tabla.
   */
  private async agregarProcedimientoDesdeCatalogoAsync(
    opcion: ItemProcedimientoCat,
  ): Promise<void> {
    if (this.guardandoAltaProc || this.eliminandoProcIndex != null) return;

    this.asegurarDxActivoProc();
    const idDx = this.idDiagnosticoActivoProc();
    const codigoDx = this.codigoDiagnosticoActivoProc();
    if (idDx == null) {
      this.errorProc =
        'Registre al menos un diagnóstico CIE en el paso 3 antes de agregar procedimientos.';
      this.cdr.detectChanges();
      return;
    }
    if (!codigoDx) {
      this.errorProc =
        'El diagnóstico seleccionado no tiene código CIE-10 (CodigoDiagnostico).';
      this.cdr.detectChanges();
      return;
    }

    const idProducto = opcion.idProducto;
    if (!idProducto) {
      this.errorProc = 'El procedimiento del catálogo no trae IdProducto.';
      this.cdr.detectChanges();
      return;
    }
    if (
      this.procedimientos.some(
        (p) => p.idProducto === idProducto && p.idDiagnostico === idDx,
      )
    ) {
      this.errorProc =
        'Ese procedimiento ya está asociado al diagnóstico seleccionado.';
      this.cdr.detectChanges();
      return;
    }

    const idAtencion = this.idAtencionActivo();
    const idPrimera = this.persistencia.idPrimeraAtencion;
    const ctx = this.idsContextoExamenGuardar();
    if (!idAtencion || !idPrimera || !ctx) {
      this.errorProc =
        'No se pudo guardar el procedimiento: faltan cuenta, servicio o IdAtencion.';
      this.cdr.detectChanges();
      return;
    }

    const precio =
      typeof opcion.precioUnitario === 'number' ? opcion.precioUnitario : 0;
    const nombre = (opcion.nombre || '').trim();
    const codigo = (opcion.codigo || '').trim();

    this.guardandoAltaProc = true;
    this.errorProc = '';
    this.altaProcActiva = false;
    this.cdr.detectChanges();

    try {
      const resp = await this.api.registrarProcedimiento(idAtencion, {
        idPrimeraAtencion: idPrimera,
        idCuentaAtencion: ctx.idCuentaAtencion,
        idServicioReceta: ctx.idServicioReceta,
        idPaciente: ctx.idPaciente,
        idUsuarioAuditoria: this.authService.getIdEmpleado() || 0,
        idProducto,
        precio,
        idDiagnostico: idDx,
        codigoDiagnostico: codigoDx,
      });

      const idReceta = resp.idReceta ?? null;
      if (idReceta == null || idReceta <= 0) {
        this.errorProc =
          'El servidor no devolvió IdReceta al registrar el procedimiento.';
        return;
      }

      this.procedimientos.push({
        nombre,
        codigo,
        idProducto: resp.idProducto || idProducto,
        idReceta,
        idPuntoCarga:
          resp.idPuntoCarga != null && resp.idPuntoCarga > 0
            ? resp.idPuntoCarga
            : 26,
        puntoCarga: null,
        precioUnitario:
          typeof resp.precio === 'number' ? resp.precio : precio,
        total: typeof resp.total === 'number' ? resp.total : precio,
        idDiagnostico:
          resp.idDiagnostico != null && resp.idDiagnostico > 0
            ? resp.idDiagnostico
            : idDx,
      });
      this.resetBarraAltaProc();
      this.reconstruirVistaProcedimientos();
    } catch (err: unknown) {
      this.errorProc =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo guardar el procedimiento.';
    } finally {
      this.guardandoAltaProc = false;
      this.cdr.detectChanges();
    }
  }

  /** X: DELETE en BD y luego saca de la tabla (si falla, la fila permanece). */
  quitarProcedimiento(i: number): void {
    void this.quitarProcedimientoAsync(i);
  }

  private async quitarProcedimientoAsync(i: number): Promise<void> {
    if (this.guardandoAltaProc || this.eliminandoProcIndex != null) return;
    const fila = this.procedimientos[i];
    if (!fila) return;

    // Optimistic: sale de la lista al instante; si el API falla, se restaura.
    const snapshot = { ...fila };
    const indiceOriginal = i;
    this.procedimientos.splice(i, 1);
    this.reconstruirVistaProcedimientos();
    this.eliminandoProcIndex = null;
    this.errorProc = '';
    this.cdr.detectChanges();

    if (snapshot.idReceta == null || snapshot.idReceta <= 0 || snapshot.idProducto == null) {
      return;
    }

    try {
      const idAtencion = this.idAtencionActivo();
      const idPrimera = this.persistencia.idPrimeraAtencion;
      const ctx = this.idsContextoExamenGuardar();
      if (!idAtencion || !idPrimera || !ctx) {
        throw new Error(
          'No se pudo eliminar: faltan IdAtencion, IdPrimeraAtencion o cuenta.',
        );
      }
      await this.api.eliminarProcedimiento(
        idAtencion,
        snapshot.idReceta,
        snapshot.idProducto,
        ctx.idCuentaAtencion,
        idPrimera,
      );
    } catch (err: unknown) {
      const insertAt = Math.min(indiceOriginal, this.procedimientos.length);
      this.procedimientos.splice(insertAt, 0, snapshot);
      this.reconstruirVistaProcedimientos();
      this.errorProc =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo eliminar el procedimiento.';
      this.cdr.detectChanges();
    }
  }

  /** IdPuntoCarga + IdFormaPago (→ IdTipoFinanciamiento) desde bandeja — solo catálogo. */
  private idsContextoProcedimiento(): {
    idPuntoCarga: number;
    idTipoFinanciamiento: number;
  } | null {
    const p = this.pacienteSeleccionado;
    if (!p) return null;
    const idPuntoCarga = campoNum(p, ['IdPuntoCarga', 'idPuntoCarga']);
    const idTipoFinanciamiento = campoNum(p, [
      'IdFormaPago',
      'idFormaPago',
      'IdTipoFinanciamiento',
      'idTipoFinanciamiento',
    ]);
    if (!idPuntoCarga || !idTipoFinanciamiento) return null;
    return { idPuntoCarga, idTipoFinanciamiento };
  }

  private async consultarCatalogoAltaProc(filtro: string): Promise<void> {
    const ctx = this.idsContextoProcedimiento();
    if (!ctx) {
      this.errorProc =
        'No se pudo obtener IdPuntoCarga / IdFormaPago de la bandeja.';
      this.sugerenciasAltaProc = [];
      this.cargandoAltaProc = false;
      this.cdr.detectChanges();
      return;
    }
    const seq = this.secuenciaAltaProc + 1;
    this.secuenciaAltaProc = seq;
    this.cargandoAltaProc = true;
    this.errorProc = '';
    this.cdr.detectChanges();
    try {
      const items = await this.maestrosApi.getProcedimientosCatalogo({
        filtro,
        idPuntoCarga: ctx.idPuntoCarga,
        idTipoFinanciamiento: ctx.idTipoFinanciamiento,
      });
      if (this.secuenciaAltaProc !== seq) return;
      this.sugerenciasAltaProc = Array.isArray(items) ? items : [];
    } catch (err: unknown) {
      if (this.secuenciaAltaProc !== seq) return;
      this.sugerenciasAltaProc = [];
      this.errorProc =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo buscar procedimientos.';
    } finally {
      if (this.secuenciaAltaProc === seq) {
        this.cargandoAltaProc = false;
      }
      this.cdr.detectChanges();
    }
  }
  /* ═══════════════════════════════════════════════════════════
     INTERCONSULTA — borrador DX local + Registrar (SPs Interconsulta_*)
     ═══════════════════════════════════════════════════════════ */

  get fechaSolicitudInterconsulta(): string {
    return this.formatearFechaSolo(this.fechaHoraAtencion ?? new Date());
  }

  onInterconsultaChange(valor: number | ''): void {
    this.form.interconsulta = valor;
    // Solo UI: no PlanTrabajo INT.
  }

  private asegurarBorradorDxIntercDefault(): void {
    if (!this.borradorDxInterc.idSubclasificacionDx) {
      const idSub = this.idSubclasifDefaultInterc();
      this.borradorDxInterc.idSubclasificacionDx = idSub;
      this.borradorDxInterc.tipo = this.letraDeIdSubclasif(idSub);
    }
  }

  private resetBorradorDxInterc(): void {
    if (this.debounceBorradorDxInterc) {
      clearTimeout(this.debounceBorradorDxInterc);
      this.debounceBorradorDxInterc = null;
    }
    const idSub = this.idSubclasifDefaultInterc();
    this.borradorDxInterc = {
      idDiagnostico: '',
      nombre: '',
      cie10: '',
      tipo: this.letraDeIdSubclasif(idSub),
      idSubclasificacionDx: idSub,
    };
    this.sugerenciasBorradorDxInterc = [];
    this.cargandoBorradorDxInterc = false;
    this.filaBorradorDxIntercActiva = false;
  }

  onEscribeBorradorDxInterc(texto: string): void {
    this.borradorDxInterc.nombre = texto;
    this.borradorDxInterc.idDiagnostico = '';
    this.borradorDxInterc.cie10 = '';
    this.buscarBorradorDxInterc(texto);
  }

  buscarBorradorDxInterc(texto: string): void {
    if (this.debounceBorradorDxInterc) {
      clearTimeout(this.debounceBorradorDxInterc);
    }
    this.filaBorradorDxIntercActiva = true;
    const q = (texto || '').trim();
    if (q.length < MIN_CARACTERES_DX) {
      this.sugerenciasBorradorDxInterc = [];
      this.cargandoBorradorDxInterc = false;
      return;
    }
    this.debounceBorradorDxInterc = setTimeout(() => {
      void this.consultarBorradorDxInterc(q);
    }, DEBOUNCE_DX_MS);
  }

  seleccionarBorradorDxInterc(item: ItemCatalogoDx): void {
    this.borradorDxInterc.idDiagnostico = item.idDiagnostico;
    this.borradorDxInterc.nombre = (item.descripcion || '').trim();
    this.borradorDxInterc.cie10 = (item.codigoCIE10 || '').trim().slice(0, 7);
    this.sugerenciasBorradorDxInterc = [];
    this.filaBorradorDxIntercActiva = false;
    this.errorDxInterc = '';
    this.cdr.detectChanges();
  }

  /** CIE elegido del catálogo (habilita Agregar). */
  get borradorDxIntercListo(): boolean {
    return (
      Number(this.borradorDxInterc.idDiagnostico) > 0 &&
      !!this.borradorDxInterc.cie10.trim() &&
      this.borradorDxInterc.idSubclasificacionDx > 0
    );
  }

  cambiarTipoBorradorDxInterc(idSubclasificacionDx: number): void {
    if (!idSubclasificacionDx) return;
    this.borradorDxInterc.idSubclasificacionDx = idSubclasificacionDx;
    this.borradorDxInterc.tipo = this.letraDeIdSubclasif(idSubclasificacionDx);
  }

  mostrarSugerenciasBorradorDxInterc(): boolean {
    return (
      this.filaBorradorDxIntercActiva &&
      (this.cargandoBorradorDxInterc ||
        this.sugerenciasBorradorDxInterc.length > 0)
    );
  }

  cerrarSugerenciasBorradorDxInterc(): void {
    setTimeout(() => {
      this.filaBorradorDxIntercActiva = false;
      this.limpiarPosicionSugerencia();
      this.cdr.detectChanges();
    }, 200);
  }

  private async consultarBorradorDxInterc(filtro: string): Promise<void> {
    const ids = this.idsContextoDiagnostico();
    if (!ids) {
      this.errorDxInterc =
        'No se pudo obtener IdAtencion / IdPaciente para buscar CIE.';
      this.sugerenciasBorradorDxInterc = [];
      this.cdr.detectChanges();
      return;
    }
    const seq = this.secuenciaBorradorDxInterc + 1;
    this.secuenciaBorradorDxInterc = seq;
    this.cargandoBorradorDxInterc = true;
    this.cdr.detectChanges();
    try {
      const items = await this.maestrosApi.getDiagnosticosCatalogo({
        filtro,
        idAtencion: ids.idAtencion,
        idPaciente: ids.idPaciente,
      });
      if (this.secuenciaBorradorDxInterc !== seq) return;
      this.sugerenciasBorradorDxInterc = Array.isArray(items) ? items : [];
      this.errorDxInterc = '';
    } catch (err: unknown) {
      if (this.secuenciaBorradorDxInterc !== seq) return;
      this.sugerenciasBorradorDxInterc = [];
      this.errorDxInterc =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo buscar diagnósticos.';
    } finally {
      if (this.secuenciaBorradorDxInterc === seq) {
        this.cargandoBorradorDxInterc = false;
      }
      this.cdr.detectChanges();
    }
  }

  /** Apila DX en pila A (local). Si inválido o duplicado, no apila. */
  agregarDxInterconsultaDesdeBorrador(): void {
    this.mensajeInterc = '';
    this.asegurarBorradorDxIntercDefault();
    const b = this.borradorDxInterc;
    const idDx = Number(b.idDiagnostico);
    if (!idDx || idDx <= 0 || !b.cie10.trim()) {
      this.errorDxInterc =
        'Seleccione un diagnóstico del catálogo antes de agregar.';
      this.cdr.detectChanges();
      return;
    }
    if (!b.idSubclasificacionDx || b.idSubclasificacionDx <= 0) {
      this.errorDxInterc = 'Seleccione el tipo P / D / R.';
      this.cdr.detectChanges();
      return;
    }
    if (
      this.intercDxLista.some((d) => Number(d.idDiagnostico) === idDx)
    ) {
      this.errorDxInterc = 'Ese diagnóstico ya está en la lista.';
      this.cdr.detectChanges();
      return;
    }
    this.intercDxLista.push({
      idDiagnostico: idDx,
      nombre: b.nombre.trim(),
      cie10: b.cie10.trim().slice(0, 7),
      tipo: b.tipo,
      idSubclasificacionDx: b.idSubclasificacionDx,
    });
    this.errorDxInterc = '';
    this.resetBorradorDxInterc();
    this.persistirBorradorIntercSession();
    this.cdr.detectChanges();
  }

  /** ✕ pila A — solo UI local. */
  quitarDxInterconsulta(indice: number): void {
    this.intercDxLista.splice(indice, 1);
    this.persistirBorradorIntercSession();
    this.cdr.detectChanges();
  }

  private idsContextoInterconsulta(): {
    idAtencion: number;
    idEpisodio: number;
    idPrimeraAtencion: number;
    idServicio: number;
    idEmpleado: number;
  } | null {
    const p = this.pacienteSeleccionado;
    if (!p) return null;
    const idAtencion = this.idAtencionActivo();
    const idEpisodio = campoNum(p, ['IdEpisodio', 'idEpisodio']);
    const idPrimeraAtencion = this.persistencia.idPrimeraAtencion ?? 0;
    const idServicio = campoNum(p, [
      'IdServicio',
      'idServicio',
      'IdServicioReceta',
      'idServicioReceta',
    ]);
    const idEmpleado = this.authService.getIdEmpleado() || 0;
    if (
      !idAtencion ||
      !idEpisodio ||
      !idPrimeraAtencion ||
      !idServicio ||
      !idEmpleado
    ) {
      return null;
    }
    return { idAtencion, idEpisodio, idPrimeraAtencion, idServicio, idEmpleado };
  }

  async registrarSolicitudInterconsulta(): Promise<void> {
    if (this.guardandoInterc) return;
    this.mensajeInterc = '';
    this.errorDxInterc = '';

    if (!this.form.interconsulta) {
      this.mensajeInterc = 'Seleccione una especialidad.';
      return;
    }
    if (!this.intercPrioridad) {
      this.mensajeInterc = 'Seleccione la prioridad.';
      return;
    }
    if (this.intercMotivoId === '' || this.intercMotivoId == null) {
      this.mensajeInterc = 'Seleccione un motivo.';
      return;
    }
    if (!this.intercMotivoClinico.trim()) {
      this.mensajeInterc = 'Ingrese el motivo clínico.';
      return;
    }
    const dxOk = this.intercDxLista.filter(
      (d) =>
        Number(d.idDiagnostico) > 0 &&
        d.idSubclasificacionDx > 0 &&
        d.cie10.trim(),
    );
    if (dxOk.length === 0) {
      this.mensajeInterc =
        'Agregue al menos un diagnóstico CIE con el botón Agregar.';
      return;
    }

    const motivoOrden = this.opcionesMotivoInterconsulta.findIndex(
      (o) => o.id === Number(this.intercMotivoId),
    );
    if (motivoOrden < 0 || motivoOrden > 2) {
      this.mensajeInterc =
        'Motivo inválido: el catálogo debe tener 3 opciones (orden 0..2).';
      this.cdr.detectChanges();
      return;
    }

    const ctx = this.idsContextoInterconsulta();
    if (!ctx) {
      this.mensajeInterc =
        'Faltan IdEpisodio / IdPrimeraAtencion / IdServicio / empleado (bandeja o sesión).';
      this.cdr.detectChanges();
      return;
    }

    this.guardandoInterc = true;
    this.cdr.detectChanges();
    try {
      const resp = await this.api.registrarInterconsulta(ctx.idAtencion, {
        idEpisodio: ctx.idEpisodio,
        idPrimeraAtencion: ctx.idPrimeraAtencion,
        idServicio: ctx.idServicio,
        idEspecialidad: Number(this.form.interconsulta),
        idPrioridad: Number(this.intercPrioridad),
        idMotivoParametro: Number(this.intercMotivoId),
        motivoOrden,
        motivoClinico: this.intercMotivoClinico.trim(),
        idEmpleado: ctx.idEmpleado,
        diagnosticos: dxOk.map((d) => ({
          idDiagnostico: Number(d.idDiagnostico),
          idSubclasificacionDx: d.idSubclasificacionDx,
        })),
      });
      this.limpiarFormularioInterconsultaTrasRegistro();
      this.mensajeInterc = `Solicitud registrada (N.º ${resp.idInterconsulta}).`;
      await this.cargarListaInterconsultas();
    } catch (err: unknown) {
      this.mensajeInterc =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo registrar la interconsulta.';
    } finally {
      this.guardandoInterc = false;
      this.cdr.detectChanges();
    }
  }

  private limpiarFormularioInterconsultaTrasRegistro(): void {
    this.form.interconsulta = '';
    this.intercPrioridad = '';
    this.intercMotivoId = '';
    this.intercMotivoClinico = '';
    this.intercDxLista = [];
    this.resetBorradorDxInterc();
    this.limpiarBorradorIntercSession();
  }

  async cargarListaInterconsultas(): Promise<void> {
    const ctx = this.idsContextoInterconsulta();
    if (!ctx) {
      this.intercListaRegistradas = [];
      return;
    }
    this.cargandoIntercLista = true;
    this.errorIntercLista = '';
    this.cdr.detectChanges();
    try {
      const items = await this.api.listarInterconsultas(
        ctx.idAtencion,
        ctx.idEpisodio,
        ctx.idPrimeraAtencion,
      );
      this.intercListaRegistradas = Array.isArray(items) ? items : [];
    } catch (err: unknown) {
      this.intercListaRegistradas = [];
      this.errorIntercLista =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo listar interconsultas.';
    } finally {
      this.cargandoIntercLista = false;
      this.cdr.detectChanges();
    }
  }

  formatearFechaHoraInterc(raw: string): string {
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return `${this.formatearFechaSolo(d)} ${this.formatearHoraSolo(d)}`;
  }

  motivoListaInterc(row: InterconsultaListadoApi): string {
    const m = (row.motivo || '').trim();
    if (m) return m;
    return (row.resumenHC || '').trim() || '—';
  }

  puedeEliminarInterc(row: InterconsultaListadoApi): boolean {
    return String(row.estado || '').toUpperCase() === 'SOLICITUD';
  }

  async eliminarInterconsultaRegistrada(row: InterconsultaListadoApi): Promise<void> {
    if (!this.puedeEliminarInterc(row) || this.eliminandoIntercId != null) return;
    const ctx = this.idsContextoInterconsulta();
    if (!ctx) {
      this.errorIntercLista =
        'No se pudo eliminar: faltan IdEpisodio / atención.';
      this.cdr.detectChanges();
      return;
    }
    this.eliminandoIntercId = row.idInterconsulta;
    this.errorIntercLista = '';
    this.cdr.detectChanges();
    try {
      await this.api.eliminarInterconsulta(
        ctx.idAtencion,
        row.idInterconsulta,
        ctx.idEpisodio,
      );
      this.intercListaRegistradas = this.intercListaRegistradas.filter(
        (x) => x.idInterconsulta !== row.idInterconsulta,
      );
      this.mensajeInterc = 'Interconsulta eliminada.';
    } catch (err: unknown) {
      this.errorIntercLista =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo eliminar la interconsulta.';
    } finally {
      this.eliminandoIntercId = null;
      this.cdr.detectChanges();
    }
  }

  private claveSessionInterc(): string | null {
    const id = this.idAtencionActivo();
    return id ? `pa-interc-draft-${id}` : null;
  }

  persistirBorradorIntercSession(): void {
    const key = this.claveSessionInterc();
    if (!key || typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          interconsulta: this.form.interconsulta,
          prioridad: this.intercPrioridad,
          motivoId: this.intercMotivoId,
          motivoClinico: this.intercMotivoClinico,
          dx: this.intercDxLista,
        }),
      );
    } catch {
      /* ignore quota */
    }
  }

  private limpiarBorradorIntercSession(): void {
    const key = this.claveSessionInterc();
    if (!key || typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
