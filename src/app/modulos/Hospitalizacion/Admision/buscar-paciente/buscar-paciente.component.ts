import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  inject,
  type OnChanges,
  Output,
  type SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaestrosApiService } from '../../../../compartido/api/maestros.api.service';
import { ApiRequestError } from '../../../../compartido/api-client/api-client.service';
import type {
  ICamaDisponible,
  ICatalogoDescripcion,
  ICatalogoNombre,
  IDiagnosticoBusqueda,
  IEstablecimientoBusqueda,
  IFilaBackend,
  IFuenteFinanciamiento,
  IMedico,
  IPaciente,
  IReniecDatos,
  IServicioAtencion,
  ISubclasificacionDxItem,
} from '../../../../compartido/tipos/api-tipos';
import {
  type FormRegistroPaciente,
  formVacio,
  normalizarNombre,
} from '../../../../compartido/ui/registro-paciente/registro-paciente.interfaces';
import { SelectGlobalComponent } from '../../../../compartido/ui/select-global/select-global';
import { VentanaModal } from '../../../../compartido/ui/ventana-modal/ventana-modal';
import { ReniecMapper } from '../../../../compartido/utilidades/reniec.mapper';
import { UbigeoService } from '../../../../core/servicios/ubigeo.service';
import { AuthService } from '../../../auth/aplicacion/auth.service';
import { PacientesApiService } from '../../../pacientes/adaptadores/salida/http/pacientes.api.service';
import {
  type SisAfiliado,
  SisApiService,
} from '../../../sis/adaptadores/salida/http/sis.api.service';
import {
  type AdmisionHospitalizacionPayload,
  HospitalizacionApiService,
} from '../hospitalizacion.api.service';

function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number') return String(valor);
  if (valor === null || valor === undefined) return '';
  return '';
}

function formatFecha(valor: string): string {
  const textoF = (valor || '').trim();
  if (!textoF) return '';
  const iso = textoF.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const compacto = textoF.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compacto) return `${compacto[3]}/${compacto[2]}/${compacto[1]}`;
  return textoF;
}

function toIsoFecha(valor: string): string {
  const textoF = (valor || '').trim();
  if (!textoF) return '';
  const iso = textoF.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const compacto = textoF.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compacto) return `${compacto[1]}-${compacto[2]}-${compacto[3]}`;
  const invertida = textoF.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (invertida) return `${invertida[3]}-${invertida[2]}-${invertida[1]}`;
  return textoF;
}

// Convierte un valor de formulario (string) a número; vacío o inválido
// devuelve undefined para que el backend guarde NULL en ese parámetro del SP.
function aNumero(valor: string | number | undefined): number | undefined {
  const limpio = String(valor ?? '').trim();
  if (!limpio) return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

// Normaliza un texto de formulario; vacío devuelve undefined (NULL en el SP).
function aTexto(valor: string | undefined): string | undefined {
  const limpio = (valor ?? '').trim();
  return limpio ? limpio : undefined;
}

// El backend espera las fechas como time.Time (RFC3339); las fechas de la UI
// llegan como yyyy-mm-dd, así que se les agrega la hora en UTC.
function aFechaIso(valor: string): string | undefined {
  const iso = toIsoFecha(valor);
  return iso ? `${iso}T00:00:00Z` : undefined;
}

interface DatosPacienteBusqueda {
  origen: 'bd' | 'reniec' | 'afiliacion';
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string;
  tercerNombre: string;
  tipoDocumento: string;
  nroDocumento: string;
  fechaNacimiento: string;
  sexo: string;
  estadoCivil: string;
  direccion: string;
  ubigeo: string;
  telefono: string;
  historiaClinica: string;
}

const ID_TIPO_SERVICIO_HOSPITALIZACION = 3;

// Clasificación de diagnóstico (CIE-10) que espera el SP de diagnósticos.
const ID_CLASIFICACION_DX = 9;

// Parámetros que activan las integraciones externas (valorTexto === 'S').
// Son los mismos que usa el triaje de emergencia.
const PARAMETRO_SIS_ID = 322;
const PARAMETRO_RENIEC_ID = 296;

interface PrioridadOpcion {
  value: string;
  label: string;
}

const PRIORIDADES_INGRESO: PrioridadOpcion[] = [
  { value: '1', label: 'I. Emergencia o Gravedad' },
  { value: '2', label: 'II. Urgencia Mayor' },
  { value: '3', label: 'III. Urgencia Menor' },
  { value: '5', label: 'Llegó Cadáver' },
];

export interface FormDatosIngreso {
  idOrigen: string;
  idServicioIngreso: string;
  cama: string;
  idCama: string;
  fechaIngreso: string;
  horaIngreso: string;
  idMedicoIngreso: string;
  idTipoPrioridad: string;
  idEstadoLlego: string;
  idFuenteFinanciamiento: string;
  idEstablecimientoReferencia: string;
  establecimientoReferencia: string;
  nroReferencia: string;
}

export interface DiagnosticoAgregado {
  idDiagnostico: number;
  codigoCIE10: string;
  descripcion: string;
  idSubclasificacionDx: number;
  subclasificacion: string;
}

// Resultado de grabar la admisión. El SP responde "OK;<idCuentaAtencion>;<idAtencion>".
export interface AdmisionRealizada {
  mensaje: string;
  idCuentaAtencion: number;
  idAtencion: number;
}

function ingresoVacio(): FormDatosIngreso {
  const ahora = new Date();
  const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  return {
    idOrigen: '',
    idServicioIngreso: '',
    cama: '',
    idCama: '',
    fechaIngreso: fecha,
    horaIngreso: hora,
    idMedicoIngreso: '',
    idTipoPrioridad: '',
    idEstadoLlego: '',
    idFuenteFinanciamiento: '',
    idEstablecimientoReferencia: '',
    establecimientoReferencia: '',
    nroReferencia: '',
  };
}

type TabIngreso = 'identificacion' | 'ingreso';

@Component({
  selector: 'app-buscar-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, VentanaModal, SelectGlobalComponent],
  templateUrl: './buscar-paciente.component.html',
})
export class BuscarPacienteComponent implements OnChanges {
  @Input() abierto = false;
  @Output() alCerrar = new EventEmitter<void>();
  @Output() alGuardar = new EventEmitter<AdmisionRealizada>();

  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly pacientesApi = inject(PacientesApiService);
  private readonly sisApi = inject(SisApiService);
  private readonly reniecMapper = inject(ReniecMapper);
  private readonly ubigeoService = inject(UbigeoService);
  private readonly authService = inject(AuthService);
  private readonly hospitalizacionApi = inject(HospitalizacionApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  tiposDocumento: ICatalogoDescripcion[] = [];
  tiposSexo: ICatalogoDescripcion[] = [];
  estadosCivil: ICatalogoDescripcion[] = [];
  gradosInstruccion: ICatalogoDescripcion[] = [];
  ocupaciones: ICatalogoDescripcion[] = [];
  etnias: ICatalogoDescripcion[] = [];
  idiomas: ICatalogoDescripcion[] = [];

  departamentos: ICatalogoNombre[] = [];
  provincias: ICatalogoNombre[] = [];
  distritos: ICatalogoNombre[] = [];
  comunidades: ICatalogoNombre[] = [];
  paises: ICatalogoNombre[] = [];

  idTipoDoc = '1';
  nroDocumento = '';
  afiliacionDisa = '035';
  afiliacionTipoFormato = 'E';
  afiliacionNroContrato = '';
  buscando = false;
  error = '';

  public normalizarNombre = normalizarNombre;

  form: FormRegistroPaciente = formVacio();

  resultado: DatosPacienteBusqueda | null = null;
  afiliacion: SisAfiliado | null = null;

  // Estado de las integraciones externas: parámetro 322 (SIS) y 296 (RENIEC).
  // sisIntegrado bloquea el select de fuente de financiamiento (IAFA), igual
  // que en el triaje de emergencia.
  sisIntegrado = false;
  reniecIntegrado = false;
  sisActivo = false;
  sisConsultado = false;
  sisGuardado = false;

  // IdPaciente del paciente encontrado en la base local. Si el paciente es
  // nuevo (solo en RENIEC/afiliación o cargado a mano) queda en 0 para que el
  // SP usp_go_AdmisionHospitalizacion lo registre como nuevo.
  idPaciente = 0;

  // Estado del guardado de la admisión.
  guardando = false;
  errorGuardar = '';

  tabActivo: TabIngreso = 'identificacion';
  readonly prioridades = PRIORIDADES_INGRESO;

  origenes: ICatalogoDescripcion[] = [];
  serviciosIngreso: IServicioAtencion[] = [];
  medicosIngreso: IMedico[] = [];
  estadosLlego: ICatalogoDescripcion[] = [];
  fuentesFinanciamiento: IFuenteFinanciamiento[] = [];
  establecimientos: IEstablecimientoBusqueda[] = [];
  busquedaEstablecimiento = '';
  mostrarEstablecimientos = false;

  // Modal de selección de camas por servicio de ingreso.
  camas: ICamaDisponible[] = [];
  mostrarModalCamas = false;
  cargandoCamas = false;
  errorCamas = '';

  // Búsqueda de diagnósticos (CIE10) para la admisión.
  diagnosticoFiltro = '';
  diagnosticos: IDiagnosticoBusqueda[] = [];
  mostrarDiagnosticos = false;
  buscandoDiagnosticos = false;
  diagnosticoSeleccionado: IDiagnosticoBusqueda | null = null;
  private diagnosticoTimer: ReturnType<typeof setTimeout> | null = null;

  // Tipos (subclasificaciones) de diagnóstico y diagnósticos agregados.
  subclasificacionesDx: ISubclasificacionDxItem[] = [];
  subclasificacionSeleccionada = '';
  diagnosticosAgregados: DiagnosticoAgregado[] = [];
  errorDiagnostico = '';

  ingreso: FormDatosIngreso = ingresoVacio();

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios.abierto?.currentValue === true) {
      this.reiniciar();
      void this.cargarCatalogos();
      void this.cargarCatalogosIngreso();
      void this.cargarParametrosIntegracion();
    }
  }

  private reiniciar(): void {
    this.idTipoDoc = '1';
    this.nroDocumento = '';
    this.afiliacionDisa = '035';
    this.afiliacionTipoFormato = 'E';
    this.afiliacionNroContrato = '';
    this.buscando = false;
    this.error = '';
    this.resultado = null;
    this.afiliacion = null;
    this.sisIntegrado = false;
    this.reniecIntegrado = false;
    this.sisActivo = false;
    this.sisConsultado = false;
    this.sisGuardado = false;
    this.idPaciente = 0;
    this.guardando = false;
    this.errorGuardar = '';
    this.form = formVacio();
    this.provincias = [];
    this.distritos = [];
    this.comunidades = [];
    this.tabActivo = 'identificacion';
    this.ingreso = ingresoVacio();
    this.medicosIngreso = [];
    this.establecimientos = [];
    this.busquedaEstablecimiento = '';
    this.mostrarEstablecimientos = false;
    this.camas = [];
    this.mostrarModalCamas = false;
    this.cargandoCamas = false;
    this.errorCamas = '';
    this.diagnosticoFiltro = '';
    this.diagnosticos = [];
    this.mostrarDiagnosticos = false;
    this.buscandoDiagnosticos = false;
    this.diagnosticoSeleccionado = null;
    this.subclasificacionSeleccionada = '';
    this.diagnosticosAgregados = [];
    this.errorDiagnostico = '';
  }

  private async cargarCatalogos(): Promise<void> {
    const p = (req: Promise<unknown>) => req.catch(() => []);
    const [docs, sexos, ec, grados, ocup, etnias, idiomas, deps, paisesCat] =
      await Promise.all([
        p(this.maestrosApi.getTiposDocumentos()),
        p(this.maestrosApi.getTiposSexo()),
        p(this.maestrosApi.getEstadosCivil()),
        p(this.maestrosApi.getGradosInstruccion()),
        p(this.maestrosApi.getOcupaciones()),
        p(this.maestrosApi.getEtnias()),
        p(this.maestrosApi.getIdiomas()),
        p(this.maestrosApi.getDepartamentos()),
        p(this.maestrosApi.getPaises()),
      ]);
    const asArray = <T>(val: unknown): T[] =>
      Array.isArray(val) && val.length ? (val as T[]) : [];
    this.tiposDocumento = asArray<ICatalogoDescripcion>(docs);
    this.tiposSexo = asArray<ICatalogoDescripcion>(sexos);
    this.estadosCivil = asArray<ICatalogoDescripcion>(ec);
    this.gradosInstruccion = asArray<ICatalogoDescripcion>(grados);
    this.ocupaciones = asArray<ICatalogoDescripcion>(ocup);
    this.etnias = asArray<ICatalogoDescripcion>(etnias);
    this.idiomas = asArray<ICatalogoDescripcion>(idiomas);
    this.departamentos = asArray<ICatalogoNombre>(deps);
    this.paises = asArray<ICatalogoNombre>(paisesCat);
    this.cdr.detectChanges();
  }

  private async cargarCatalogosIngreso(): Promise<void> {
    const cargar = async (
      req: Promise<unknown>,
      etiqueta: string,
    ): Promise<unknown[]> => {
      try {
        const val = await req;
        return Array.isArray(val) ? val : [];
      } catch (err: unknown) {
        console.error(`No se pudo cargar ${etiqueta}:`, err);
        return [];
      }
    };

    const [origenes, servicios, estados, fuentes, subclasificaciones] =
      await Promise.all([
        cargar(
          this.maestrosApi.getOrigenesAtencion(
            ID_TIPO_SERVICIO_HOSPITALIZACION,
          ),
          'orígenes de atención',
        ),
        cargar(
          this.maestrosApi.getServicios(ID_TIPO_SERVICIO_HOSPITALIZACION),
          'servicios de ingreso',
        ),
        cargar(
          this.maestrosApi.getEstadosLlegoPaciente(),
          'estados como llegó',
        ),
        cargar(
          this.maestrosApi.getFuentesFinanciamiento(),
          'fuentes de financiamiento',
        ),
        cargar(
          this.hospitalizacionApi.getSubclasificacionesDiagnostico(),
          'tipos de diagnóstico',
        ),
      ]);
    this.origenes = origenes as ICatalogoDescripcion[];
    this.serviciosIngreso = servicios as IServicioAtencion[];
    this.estadosLlego = estados as ICatalogoDescripcion[];
    this.fuentesFinanciamiento = fuentes as IFuenteFinanciamiento[];
    this.subclasificacionesDx = subclasificaciones as ISubclasificacionDxItem[];
    this.actualizarIafaAutomatico();
    this.cdr.detectChanges();
  }

  // Lee los parámetros 322 (SIS) y 296 (RENIEC). valorTexto === 'S' habilita
  // la integración; ante un error se asume desactivada (fail-closed).
  private async cargarParametrosIntegracion(): Promise<void> {
    try {
      const [sisParam, reniecParam] = await Promise.all([
        this.maestrosApi.getParametro(PARAMETRO_SIS_ID),
        this.maestrosApi.getParametro(PARAMETRO_RENIEC_ID),
      ]);
      this.sisIntegrado = this.parametroEsS(sisParam);
      this.reniecIntegrado = this.parametroEsS(reniecParam);
    } catch {
      this.sisIntegrado = false;
      this.reniecIntegrado = false;
    } finally {
      this.cdr.detectChanges();
    }
  }

  private parametroEsS(param: IFilaBackend | IFilaBackend[]): boolean {
    const fila = Array.isArray(param) ? param[0] : param;
    for (const clave of ['valorTexto', 'ValorTexto', 'VALORTEXTO']) {
      const valor = fila?.[clave];
      if (valor !== undefined && valor !== null) {
        return String(valor).trim().toUpperCase() === 'S';
      }
    }
    return false;
  }

  // Desactiva la integración SIS en memoria y en el parámetro 322 cuando el
  // SIS responde que se agotó la cuota diaria de consultas.
  private async desactivarIntegracionSis(): Promise<void> {
    this.sisIntegrado = false;
    try {
      await this.maestrosApi.desactivarParametro(PARAMETRO_SIS_ID);
    } catch {
      // El estado local ya quedó en false; el backend se sincroniza luego.
    }
  }

  cambiarTab(tab: TabIngreso): void {
    this.tabActivo = tab;
  }

  async onCambioServicioIngreso(): Promise<void> {
    this.ingreso.idMedicoIngreso = '';
    this.ingreso.cama = '';
    this.ingreso.idCama = '';
    this.camas = [];
    this.medicosIngreso = [];
    const servicio = this.serviciosIngreso.find(
      (s) => String(s.id) === this.ingreso.idServicioIngreso,
    );
    const idEspecialidad = servicio?.idEspecialidad;
    if (!idEspecialidad) return;
    try {
      this.medicosIngreso =
        await this.maestrosApi.getMedicosPorEspecialidad(idEspecialidad);
    } catch {
      this.medicosIngreso = [];
    } finally {
      this.cdr.detectChanges();
    }
  }

  async onBuscarEstablecimiento(): Promise<void> {
    const filtro = this.busquedaEstablecimiento.trim();
    this.ingreso.idEstablecimientoReferencia = '';
    this.ingreso.establecimientoReferencia = '';
    if (filtro.length < 2) {
      this.establecimientos = [];
      this.mostrarEstablecimientos = false;
      return;
    }
    try {
      this.establecimientos =
        await this.maestrosApi.getEstablecimientos(filtro);
      this.mostrarEstablecimientos = this.establecimientos.length > 0;
    } catch {
      this.establecimientos = [];
      this.mostrarEstablecimientos = false;
    } finally {
      this.cdr.detectChanges();
    }
  }

  seleccionarEstablecimiento(establecimiento: IEstablecimientoBusqueda): void {
    this.ingreso.idEstablecimientoReferencia = String(
      establecimiento.idEstablecimiento,
    );
    this.ingreso.establecimientoReferencia =
      establecimiento.nombreLargo ||
      establecimiento.nombre ||
      establecimiento.codigo ||
      '';
    this.busquedaEstablecimiento = this.ingreso.establecimientoReferencia;
    this.mostrarEstablecimientos = false;
  }

  // Abre el modal de camas del servicio de ingreso elegido. Solo se listan
  // (y permiten seleccionar) las camas en estado disponible.
  async abrirModalCamas(): Promise<void> {
    if (!this.ingreso.idServicioIngreso) {
      this.errorCamas = 'Seleccione primero un servicio de ingreso.';
      return;
    }
    this.mostrarModalCamas = true;
    this.cargandoCamas = true;
    this.errorCamas = '';
    this.camas = [];
    try {
      this.camas = await this.maestrosApi.getCamasPorServicio(
        this.ingreso.idServicioIngreso,
      );
    } catch {
      this.errorCamas = 'No se pudieron cargar las camas del servicio.';
      this.camas = [];
    } finally {
      this.cargandoCamas = false;
      this.cdr.detectChanges();
    }
  }

  cerrarModalCamas(): void {
    this.mostrarModalCamas = false;
  }

  esCamaDisponible(cama: ICamaDisponible): boolean {
    const estado = (cama.estado || '').trim().toUpperCase();
    return estado.includes('DISPONIBLE') || estado.includes('LIBRE');
  }

  seleccionarCama(cama: ICamaDisponible): void {
    if (!this.esCamaDisponible(cama)) return;
    this.ingreso.cama = (cama.cama || '').trim();
    this.ingreso.idCama =
      cama.idCama !== undefined && cama.idCama !== null
        ? String(cama.idCama)
        : '';
    this.mostrarModalCamas = false;
  }

  // Al digitar en el buscador de diagnósticos se consulta el endpoint con
  // debounce. El idAtencion va en 0 y el idPaciente es el del paciente
  // encontrado (0 si es nuevo).
  onDiagnosticoInput(valor: string): void {
    this.diagnosticoFiltro = valor;
    this.diagnosticoSeleccionado = null;
    if (this.diagnosticoTimer) clearTimeout(this.diagnosticoTimer);

    const filtro = this.diagnosticoFiltro.trim();
    if (filtro.length < 2) {
      this.diagnosticos = [];
      this.mostrarDiagnosticos = false;
      return;
    }
    this.diagnosticoTimer = setTimeout(() => {
      void this.buscarDiagnosticos(filtro);
    }, 300);
  }

  private async buscarDiagnosticos(filtro: string): Promise<void> {
    this.buscandoDiagnosticos = true;
    try {
      this.diagnosticos = await this.hospitalizacionApi.buscarDiagnosticos(
        filtro,
        this.idPaciente || 0,
      );
      this.mostrarDiagnosticos = this.diagnosticos.length > 0;
    } catch {
      this.diagnosticos = [];
      this.mostrarDiagnosticos = false;
    } finally {
      this.buscandoDiagnosticos = false;
      this.cdr.detectChanges();
    }
  }

  seleccionarDiagnostico(diagnostico: IDiagnosticoBusqueda): void {
    this.diagnosticoSeleccionado = diagnostico;
    this.diagnosticoFiltro = this.textoDiagnostico(diagnostico);
    this.mostrarDiagnosticos = false;
    this.diagnosticos = [];
  }

  textoDiagnostico(diagnostico: IDiagnosticoBusqueda): string {
    const codigo = (diagnostico.codigoCIE10 || '').trim();
    const descripcion = (
      diagnostico.descripcionLarga ||
      diagnostico.descripcion ||
      ''
    ).trim();
    if (codigo && descripcion) return `${codigo} - ${descripcion}`;
    return codigo || descripcion;
  }

  cerrarSugerenciasDiagnostico(): void {
    setTimeout(() => {
      this.mostrarDiagnosticos = false;
    }, 200);
  }

  // Agrega el diagnóstico seleccionado (textbox) con su tipo (select) al grid.
  agregarDiagnostico(): void {
    this.errorDiagnostico = '';
    if (!this.diagnosticoSeleccionado) {
      this.errorDiagnostico = 'Seleccione un diagnóstico de la lista.';
      return;
    }
    if (!this.subclasificacionSeleccionada) {
      this.errorDiagnostico = 'Seleccione un tipo de diagnóstico.';
      return;
    }
    const idSubclasificacionDx = Number(this.subclasificacionSeleccionada);
    const yaExiste = this.diagnosticosAgregados.some(
      (d) =>
        d.idDiagnostico === this.diagnosticoSeleccionado?.idDiagnostico &&
        d.idSubclasificacionDx === idSubclasificacionDx,
    );
    if (yaExiste) {
      this.errorDiagnostico = 'Ese diagnóstico ya fue agregado.';
      return;
    }

    const subclasificacion = this.subclasificacionesDx.find(
      (s) => s.idSubclasificacionDx === idSubclasificacionDx,
    );
    this.diagnosticosAgregados = [
      ...this.diagnosticosAgregados,
      {
        idDiagnostico: this.diagnosticoSeleccionado.idDiagnostico,
        codigoCIE10: (this.diagnosticoSeleccionado.codigoCIE10 || '').trim(),
        descripcion: (
          this.diagnosticoSeleccionado.descripcionLarga ||
          this.diagnosticoSeleccionado.descripcion ||
          ''
        ).trim(),
        idSubclasificacionDx,
        subclasificacion:
          subclasificacion?.descripcionCorta ||
          subclasificacion?.descripcionLarga ||
          '',
      },
    ];

    this.diagnosticoSeleccionado = null;
    this.diagnosticoFiltro = '';
    this.diagnosticos = [];
    this.mostrarDiagnosticos = false;
    this.cdr.detectChanges();
  }

  quitarDiagnostico(index: number): void {
    this.diagnosticosAgregados = this.diagnosticosAgregados.filter(
      (_, i) => i !== index,
    );
    this.cdr.detectChanges();
  }

  // El IAFA se deriva de la cobertura efectiva del paciente, igual que en el
  // triaje de emergencia: SIS si la afiliación está vigente y, si no, Particular.
  // Sin integración SIS activa no se fuerza nada (el usuario elige).
  private actualizarIafaAutomatico(): void {
    if (!this.sisIntegrado && !this.sisActivo) return;
    if (!this.fuentesFinanciamiento.length) return;

    const buscar = (termino: string) =>
      this.fuentesFinanciamiento.find((f) =>
        String(f.descripcion || '')
          .toUpperCase()
          .includes(termino),
      );

    if (this.sisActivo) {
      const sis = buscar('SIS');
      if (sis)
        this.ingreso.idFuenteFinanciamiento = String(
          sis.idFuenteFinanciamiento,
        );
    } else {
      const particular = buscar('PARTICULAR');
      if (particular)
        this.ingreso.idFuenteFinanciamiento = String(
          particular.idFuenteFinanciamiento,
        );
    }
  }

  // idError 6 de SIS: "USUARIO FUERA DEL LIMITE DE CONSULTAS POR DIA".
  private esLimiteConsultasSis(sis: SisAfiliado | undefined): boolean {
    if (!sis) return false;
    if (String(sis.idError ?? '').trim() === '6') return true;
    return (sis.resultado || '').toUpperCase().includes('LIMITE DE CONSULTAS');
  }

  get esDni(): boolean {
    return this.idTipoDoc === '1';
  }

  get esAfiliacion(): boolean {
    return this.idTipoDoc === '99';
  }

  // Origen "referencia": obliga a registrar establecimiento y número de
  // referencia en los datos de ingreso.
  get esOrigenReferencia(): boolean {
    const origen = this.origenes.find(
      (o) => String(o.id) === this.ingreso.idOrigen,
    );
    return (origen?.descripcion || '').toUpperCase().includes('REFERENCIA');
  }

  cerrar(): void {
    this.alCerrar.emit();
  }

  // Registra la admisión de hospitalización con los datos del formulario y de
  // la pestaña "Datos de ingreso". El IdPaciente es 0 cuando el paciente es
  // nuevo (no vino de la base local).
  async guardar(): Promise<void> {
    const f = this.form;
    const faltanIdentificacion: string[] = [];
    if (!f.idDocIdentidad.trim())
      faltanIdentificacion.push('el tipo de documento');
    if (!f.nroDocumento.trim())
      faltanIdentificacion.push('el número de documento');
    if (!f.apellidoPaterno.trim())
      faltanIdentificacion.push('el apellido paterno');
    if (!f.apellidoMaterno.trim())
      faltanIdentificacion.push('el apellido materno');
    if (!f.primerNombre.trim()) faltanIdentificacion.push('el primer nombre');
    if (!f.fechaNacimiento.trim())
      faltanIdentificacion.push('la fecha de nacimiento');
    if (!f.idTipoSexo.trim()) faltanIdentificacion.push('el sexo');
    if (!f.idEtnia.trim()) faltanIdentificacion.push('la etnia');
    if (!f.idIdioma.trim()) faltanIdentificacion.push('el idioma');
    if (!f.idPaisDomicilio.trim())
      faltanIdentificacion.push('el país de domicilio');
    if (!f.idDepartamentoDomicilio.trim())
      faltanIdentificacion.push('el departamento de domicilio');
    if (!f.idProvinciaDomicilio.trim())
      faltanIdentificacion.push('la provincia de domicilio');
    if (!f.idDistritoDomicilio.trim())
      faltanIdentificacion.push('el distrito de domicilio');

    const faltanIngreso: string[] = [];
    if (!this.ingreso.idOrigen) faltanIngreso.push('el origen');
    if (!this.ingreso.idServicioIngreso)
      faltanIngreso.push('el servicio de ingreso');
    if (!this.ingreso.fechaIngreso.trim())
      faltanIngreso.push('la fecha de ingreso');
    if (!this.ingreso.horaIngreso.trim())
      faltanIngreso.push('la hora de ingreso');
    if (!this.ingreso.idMedicoIngreso)
      faltanIngreso.push('el médico de ingreso');
    if (!this.ingreso.idFuenteFinanciamiento)
      faltanIngreso.push('la fuente de financiamiento');
    if (this.esOrigenReferencia) {
      if (!this.ingreso.idEstablecimientoReferencia)
        faltanIngreso.push('el establecimiento de referencia');
      if (!this.ingreso.nroReferencia.trim())
        faltanIngreso.push('el N.º de referencia');
    }

    if (faltanIdentificacion.length) {
      this.tabActivo = 'identificacion';
      this.errorGuardar = `Complete los datos de identificación: ${faltanIdentificacion.join(', ')}.`;
      return;
    }
    if (faltanIngreso.length) {
      this.tabActivo = 'ingreso';
      this.errorGuardar = `Complete los datos de ingreso: ${faltanIngreso.join(', ')}.`;
      return;
    }
    // La admisión exige al menos un diagnóstico (CIE-10) con su tipo.
    if (!this.diagnosticosAgregados.length) {
      this.tabActivo = 'ingreso';
      this.errorGuardar =
        'Agregue al menos un diagnóstico para registrar la admisión.';
      return;
    }

    this.guardando = true;
    this.errorGuardar = '';
    const payload: AdmisionHospitalizacionPayload = {
      idPaciente: this.idPaciente || 0,
      idDocIdentidad: aNumero(this.form.idDocIdentidad),
      nroDocumento: aTexto(this.form.nroDocumento),
      apellidoPaterno: aTexto(this.form.apellidoPaterno),
      apellidoMaterno: aTexto(this.form.apellidoMaterno),
      primerNombre: aTexto(this.form.primerNombre),
      segundoNombre: aTexto(this.form.segundoNombre),
      tercerNombre: aTexto(this.form.tercerNombre),
      fechaNacimiento: aFechaIso(this.form.fechaNacimiento),
      idTipoSexo: aNumero(this.form.idTipoSexo),
      estadoCivil: aNumero(this.form.idEstadoCivil),
      gradoInstruccion: aNumero(this.form.idGradoInstruccion),
      ocupacion: aNumero(this.form.idTipoOcupacion),
      idEtnia: aNumero(this.form.idEtnia),
      idIdioma: aNumero(this.form.idIdioma),
      madreTipoDoc: aNumero(this.form.madreTutorIdDocIdentidad),
      madreNroDoc: aTexto(this.form.madreTutorNroDocumento),
      madreApePaterno: aTexto(this.form.madreTutorApellidoPaterno),
      madreApeMaterno: aTexto(this.form.madreTutorApellidoMaterno),
      madrePrimerNombre: aTexto(this.form.madreTutorPrimerNombre),
      madreSegundoNombre: aTexto(this.form.madreTutorSegundoNombre),
      nombrePadre: aTexto(this.form.nombrePadre),
      telefono: aTexto(this.form.telefono),
      correo: aTexto(this.form.email),
      idDepartamento: aNumero(this.form.idDepartamentoDomicilio),
      idProvincia: aNumero(this.form.idProvinciaDomicilio),
      idDistrito: aNumero(this.form.idDistritoDomicilio),
      idComunidadDomicilio: aNumero(this.form.idCentroPobladoDomicilio),
      direccion: aTexto(this.form.direccionDomicilio),
      idNacionalidad: aNumero(this.form.idPaisDomicilio),
      idOrigen: aNumero(this.ingreso.idOrigen),
      idServicio: aNumero(this.ingreso.idServicioIngreso),
      idCama: aNumero(this.ingreso.idCama),
      fechaIngreso: aFechaIso(this.ingreso.fechaIngreso),
      horaIngreso: aTexto(this.ingreso.horaIngreso),
      idMedicoIngreso: aNumero(this.ingreso.idMedicoIngreso),
      idTipoPrioridad: 0,
      idEstadollego: 0,
      idFuenteFinanciamiento: aNumero(this.ingreso.idFuenteFinanciamiento),
      idEstablecimientoReferenciaOrigen: aNumero(
        this.ingreso.idEstablecimientoReferencia,
      ),
      nroReferencia: aTexto(this.ingreso.nroReferencia),
      idEmpleado: this.authService.getIdEmpleado() || undefined,
    };

    try {
      const resp = await this.hospitalizacionApi.admisionar(payload);
      const resultado = (resp?.resultado || '').trim();
      if (/^error/i.test(resultado)) {
        this.errorGuardar =
          resultado.replace(/^error;?\s*/i, '') ||
          'No se pudo registrar la admisión.';
        return;
      }
      const idAtencion = this.extraerIdAtencion(resultado);
      const idCuentaAtencion = this.extraerIdCuentaAtencion(resultado);
      const errorDiagnosticos =
        idAtencion > 0 && this.diagnosticosAgregados.length
          ? await this.guardarDiagnosticosAtencion(idAtencion)
          : '';
      if (errorDiagnosticos) {
        this.errorGuardar = errorDiagnosticos;
        return;
      }
      this.alGuardar.emit({
        mensaje: resultado || 'Admisión registrada correctamente.',
        idCuentaAtencion,
        idAtencion,
      });
    } catch (err: unknown) {
      this.errorGuardar =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo registrar la admisión.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  // El SP de admisión devuelve "OK;<idCuentaAtencion>;<idAtencion>".
  private extraerIdAtencion(resultado: string): number {
    const partes = resultado.split(';').map((p) => p.trim());
    const candidato = partes.length >= 3 ? partes[2] : '';
    const id = Number(candidato);
    return Number.isFinite(id) && id > 0 ? id : 0;
  }

  // El SP de admisión devuelve "OK;<idCuentaAtencion>;<idAtencion>".
  private extraerIdCuentaAtencion(resultado: string): number {
    const partes = resultado.split(';').map((p) => p.trim());
    const candidato = partes.length >= 2 ? partes[1] : '';
    const id = Number(candidato);
    return Number.isFinite(id) && id > 0 ? id : 0;
  }

  // Asocia cada diagnóstico agregado al grid con la atención creada.
  // Devuelve un mensaje de error si alguno falla, o '' si todos se guardan.
  private async guardarDiagnosticosAtencion(
    idAtencion: number,
  ): Promise<string> {
    const fallidos: string[] = [];
    for (const dx of this.diagnosticosAgregados) {
      try {
        await this.hospitalizacionApi.agregarDiagnosticoAtencion({
          idAtencion,
          idDiagnostico: dx.idDiagnostico,
          idSubclasificacionDiagnostico: dx.idSubclasificacionDx,
          idClasificacionDx: ID_CLASIFICACION_DX,
          idPaciente: this.idPaciente || 0,
        });
      } catch {
        fallidos.push(dx.codigoCIE10 || String(dx.idDiagnostico));
      }
    }
    if (fallidos.length) {
      return `La admisión se registró, pero no se pudieron guardar ${fallidos.length} diagnóstico(s): ${fallidos.join(', ')}.`;
    }
    return '';
  }

  soloDigitos(event: KeyboardEvent): void {
    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
    }
  }

  async buscar(): Promise<void> {
    if (this.esAfiliacion) {
      await this.buscarPorAfiliacion();
      return;
    }

    const nro = this.nroDocumento.trim();
    if (!nro) {
      this.error = 'Ingrese el número de documento para buscar al paciente.';
      return;
    }
    if (!this.idTipoDoc) {
      this.error = 'Seleccione el tipo de documento.';
      return;
    }

    this.buscando = true;
    this.error = '';
    this.resultado = null;
    this.afiliacion = null;
    this.sisActivo = false;
    this.sisConsultado = false;
    this.sisGuardado = false;
    this.idPaciente = 0;
    this.ingreso.idFuenteFinanciamiento = '';
    this.form = formVacio();
    this.provincias = [];
    this.distritos = [];
    this.comunidades = [];

    try {
      await this.cargarParametrosIntegracion();

      let encontrado: DatosPacienteBusqueda | null = null;

      try {
        const paciente = await this.pacientesApi.porDocumento(
          nro,
          Number(this.idTipoDoc),
        );
        if (paciente && texto(paciente.patientId)) {
          encontrado = await this.datosDesdeBase(paciente);
        }
      } catch (err: unknown) {
        const esNoEncontrado =
          err instanceof ApiRequestError &&
          (err.status === 404 || err.code === 'PATIENT_NOT_FOUND');
        if (!esNoEncontrado) {
          throw err;
        }
      }

      // RENIEC solo se consulta si su web service está activo (parámetro 296),
      // es DNI de 8 dígitos y el paciente no está en la base de datos local.
      if (
        !encontrado &&
        this.reniecIntegrado &&
        this.esDni &&
        /^\d{8}$/.test(nro)
      ) {
        encontrado = await this.datosDesdeReniec(nro);
      }

      // SIS se consulta igual que en el triaje de emergencia: solo si su web
      // service está activo (parámetro 322) y aun cuando el paciente no se haya
      // encontrado en la base local ni en RENIEC, porque una afiliación activa
      // sirve como fuente de datos.
      let sisAportaDatos = false;
      if (this.sisIntegrado) {
        sisAportaDatos = await this.consultarSis(nro);
      }

      const afiliacionSis = this.afiliacion;
      if (!encontrado && sisAportaDatos && afiliacionSis) {
        encontrado = this.datosDesdeAfiliacion(afiliacionSis);
        await this.cargarUbigeoDomicilio();
      }

      if (!encontrado) {
        const fuentes = ['la base de datos'];
        if (this.esDni && this.reniecIntegrado) fuentes.push('RENIEC');
        if (this.sisIntegrado) fuentes.push('SIS');
        this.error = `No se encontró el paciente con el documento indicado en ${fuentes.join(' ni en ')}.`;
        return;
      }

      this.resultado = encontrado;
      // Refleja en "Identificación" el tipo y número de documento buscados,
      // sin pisar los que ya hayan venido de la base local.
      if (!this.form.idDocIdentidad) this.form.idDocIdentidad = this.idTipoDoc;
      if (!this.form.nroDocumento) this.form.nroDocumento = nro;
      this.actualizarIafaAutomatico();
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo realizar la búsqueda del paciente.';
    } finally {
      this.buscando = false;
      this.cdr.detectChanges();
    }
  }

  private async buscarPorAfiliacion(): Promise<void> {
    const disa = this.afiliacionDisa.trim();
    const tipoFormato = this.afiliacionTipoFormato.trim();
    const nroContrato = this.afiliacionNroContrato.trim();
    if (!nroContrato) {
      this.error = 'Ingrese el número de contrato de la afiliación.';
      return;
    }
    if (!disa || !tipoFormato) {
      this.error = 'Ingrese la DISA y el tipo de formato de la afiliación.';
      return;
    }

    this.buscando = true;
    this.error = '';
    this.resultado = null;
    this.afiliacion = null;
    this.sisActivo = false;
    this.sisConsultado = false;
    this.sisGuardado = false;
    this.idPaciente = 0;
    this.ingreso.idFuenteFinanciamiento = '';
    this.form = formVacio();
    this.provincias = [];
    this.distritos = [];
    this.comunidades = [];

    try {
      await this.cargarParametrosIntegracion();
      if (!this.sisIntegrado) {
        this.error =
          'La integración con el SIS no está activa. Busque al paciente por documento.';
        return;
      }

      const sis = await this.sisApi.consultarAfiliado('', 0, {
        disa,
        tipoFormato,
        nroContrato,
      });
      if (!sis || (!texto(sis.apePaterno) && !texto(sis.nombres))) {
        this.error =
          'No se encontró una afiliación con los datos de DISA, tipo de formato y número de contrato indicados.';
        return;
      }

      this.afiliacion = sis;
      this.sisConsultado = true;
      this.sisActivo = sis.estado === 'ACTIVO';
      this.mapearAfiliacionAlFormulario(sis);
      this.resultado = this.datosDesdeAfiliacion(sis);
      await this.gestionarAfiliacionSis(sis);
      this.actualizarIafaAutomatico();
      await this.cargarUbigeoDomicilio();
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo consultar la afiliación al SIS.';
    } finally {
      this.buscando = false;
      this.cdr.detectChanges();
    }
  }

  // Copia los datos del SIS al formulario rellenando solo campos vacíos, para
  // no pisar lo que ya vino de la base de datos o de RENIEC.
  private mapearAfiliacionAlFormulario(sis: SisAfiliado): void {
    const f = this.form;
    if (!f.apellidoPaterno && texto(sis.apePaterno))
      f.apellidoPaterno = texto(sis.apePaterno);
    if (!f.apellidoMaterno && texto(sis.apeMaterno))
      f.apellidoMaterno = texto(sis.apeMaterno);
    if (!f.primerNombre && texto(sis.nombres)) {
      const partes = sis.nombres.trim().split(/\s+/);
      f.primerNombre = partes[0] || '';
      if (!f.segundoNombre) f.segundoNombre = partes.slice(1).join(' ');
    }
    if (!f.fechaNacimiento && sis.fecNacimiento?.length === 8) {
      f.fechaNacimiento = `${sis.fecNacimiento.slice(0, 4)}-${sis.fecNacimiento.slice(4, 6)}-${sis.fecNacimiento.slice(6, 8)}`;
    }
    if (!f.idTipoSexo && (sis.genero === '1' || sis.genero === '2')) {
      f.idTipoSexo = sis.genero;
    }
    if (!f.direccionDomicilio && texto(sis.direccion)) {
      f.direccionDomicilio = sis.direccion.slice(0, 70);
    }
    // Refleja el documento de la afiliación si aún no hay uno en el formulario.
    if (!f.nroDocumento && texto(sis.nroDocumento)) {
      f.nroDocumento = texto(sis.nroDocumento);
    }
    if (!f.idDocIdentidad) {
      const tipoSis = texto(sis.tipoDocumento);
      const td = this.tiposDocumento.find(
        (t) =>
          String(t.id) === tipoSis ||
          t.descripcion?.toUpperCase() === tipoSis.toUpperCase(),
      );
      f.idDocIdentidad = td ? String(td.id) : this.idTipoDoc;
    }
    const idUbigeo = texto(sis.idUbigeo);
    if (idUbigeo) {
      if (!f.idDepartamentoDomicilio)
        f.idDepartamentoDomicilio = idUbigeo.slice(0, 2);
      if (!f.idProvinciaDomicilio)
        f.idProvinciaDomicilio = idUbigeo.slice(0, 4);
      if (!f.idDistritoDomicilio) f.idDistritoDomicilio = idUbigeo;
    }
  }

  private async cargarUbigeoDomicilio(): Promise<void> {
    const f = this.form;
    if (f.idDepartamentoDomicilio) {
      this.departamentos = await this.ubigeoService.getDepartamentos();
      this.provincias = await this.ubigeoService.getProvincias(
        f.idDepartamentoDomicilio,
      );
    } else {
      this.provincias = [];
      this.distritos = [];
      this.comunidades = [];
    }
    if (f.idProvinciaDomicilio) {
      this.distritos = await this.ubigeoService.getDistritos(
        f.idProvinciaDomicilio,
      );
    }
    if (f.idDistritoDomicilio) {
      this.comunidades = await this.ubigeoService.getCentrosPoblados(
        f.idDistritoDomicilio,
      );
    }
  }

  private asignarUbigeoDomicilio(idDistrito: string): void {
    const n = Number(idDistrito);
    if (Number.isNaN(n) || n < 100) return;
    const s = String(n);
    this.form.idDepartamentoDomicilio = s.slice(0, 2);
    this.form.idProvinciaDomicilio = s.slice(0, 4);
    this.form.idDistritoDomicilio = s;
  }

  private datosDesdeAfiliacion(sis: SisAfiliado): DatosPacienteBusqueda {
    const partes = texto(sis.nombres).split(/\s+/);
    return {
      origen: 'afiliacion',
      apellidoPaterno: texto(sis.apePaterno),
      apellidoMaterno: texto(sis.apeMaterno),
      primerNombre: partes[0] || '',
      segundoNombre: partes.slice(1).join(' '),
      tercerNombre: '',
      tipoDocumento:
        this.tiposDocumento.find((t) => String(t.id) === '99')?.descripcion ||
        'Afiliación',
      nroDocumento: texto(sis.nroDocumento) || this.afiliacionNroContrato,
      fechaNacimiento: formatFecha(texto(sis.fecNacimiento)),
      sexo: this.descripcionCatalogo(this.tiposSexo, texto(sis.genero)),
      estadoCivil: '',
      direccion: texto(sis.direccion).slice(0, 70),
      ubigeo: '',
      telefono: '',
      historiaClinica: '',
    };
  }

  async onCambioDepartamento(): Promise<void> {
    this.form.idProvinciaDomicilio = '';
    this.form.idDistritoDomicilio = '';
    this.form.idCentroPobladoDomicilio = '';
    this.comunidades = [];
    this.provincias = [];
    if (this.form.idDepartamentoDomicilio) {
      this.provincias = await this.ubigeoService.getProvincias(
        this.form.idDepartamentoDomicilio,
      );
    }
  }

  async onCambioProvincia(): Promise<void> {
    this.form.idDistritoDomicilio = '';
    this.form.idCentroPobladoDomicilio = '';
    this.comunidades = [];
    this.distritos = [];
    if (this.form.idProvinciaDomicilio) {
      this.distritos = await this.ubigeoService.getDistritos(
        this.form.idProvinciaDomicilio,
      );
    }
  }

  async onCambioDistrito(): Promise<void> {
    this.form.idCentroPobladoDomicilio = '';
    this.comunidades = [];
    if (this.form.idDistritoDomicilio) {
      this.comunidades = await this.ubigeoService.getCentrosPoblados(
        this.form.idDistritoDomicilio,
      );
    }
  }

  private async datosDesdeBase(
    paciente: IPaciente,
  ): Promise<DatosPacienteBusqueda> {
    const d = paciente as unknown as Record<string, unknown>;
    const apPaterno = texto(d.paternalSurname);
    const apMaterno = texto(d.maternalSurname);
    const pNombre = texto(d.firstName);
    const sNombre = texto(d.secondName ?? d.segundoNombre);
    const tNombre = texto(d.thirdName);

    const sexo = this.descripcionCatalogo(this.tiposSexo, texto(d.sexTypeId));
    const estadoCivil = this.descripcionCatalogo(
      this.estadosCivil,
      texto(d.maritalStatusId),
    );

    this.idPaciente = Number(paciente.patientId) || 0;
    this.form = formVacio();
    const f = this.form;
    f.apellidoPaterno = apPaterno;
    f.apellidoMaterno = apMaterno;
    f.primerNombre = pNombre;
    f.segundoNombre = sNombre;
    f.tercerNombre = tNombre;
    f.nroDocumento = texto(d.documentNumber);
    f.fechaNacimiento = toIsoFecha(texto(d.dateOfBirth));
    f.idTipoSexo = texto(d.sexTypeId);
    f.idEstadoCivil = texto(d.maritalStatusId);
    f.idGradoInstruccion = texto(d.educationDegreeId);
    f.idTipoOcupacion = texto(d.occupationTypeId);
    f.idEtnia = texto(d.ethnicityId);
    f.idIdioma = texto(d.languageId);
    f.idPaisDomicilio = texto(d.homeCountryId);
    f.direccionDomicilio = texto(d.homeAddress);
    f.telefono = texto(d.phone);
    f.celular = texto(d.cellphone);
    f.email = texto(d.email);
    const tipoDesc = texto(d.tipoDocumento);
    const tipoDoc = this.tiposDocumento.find(
      (v) => v.descripcion?.toUpperCase() === tipoDesc.toUpperCase(),
    );
    f.idDocIdentidad =
      texto(d.documentTypeId) || (tipoDoc ? String(tipoDoc.id) : '');
    f.madreTutorNroDocumento = texto(d.motherDocument);
    f.madreTutorApellidoPaterno = texto(d.motherPaternalSurname);
    f.madreTutorApellidoMaterno = texto(d.motherMaternalSurname);
    f.madreTutorPrimerNombre = texto(d.motherFirstName);
    f.madreTutorSegundoNombre = texto(d.motherSecondName);
    const madreTipo = texto(d.motherDocType);
    const madreDoc = this.tiposDocumento.find(
      (v) =>
        String(v.id) === madreTipo ||
        v.descripcion?.toUpperCase() === madreTipo.toUpperCase(),
    );
    f.madreTutorIdDocIdentidad = madreDoc ? String(madreDoc.id) : '';
    this.asignarUbigeoDomicilio(texto(d.homeDistrictId));
    f.idCentroPobladoDomicilio = texto(d.homeCenterId);
    await this.cargarUbigeoDomicilio();

    return {
      origen: 'bd',
      apellidoPaterno: apPaterno,
      apellidoMaterno: apMaterno,
      primerNombre: pNombre,
      segundoNombre: sNombre,
      tercerNombre: tNombre,
      tipoDocumento: texto(d.tipoDocumento) || (this.esDni ? 'DNI' : '') || '',
      nroDocumento: texto(d.documentNumber),
      fechaNacimiento: formatFecha(texto(d.dateOfBirth)),
      sexo,
      estadoCivil,
      direccion: texto(d.homeAddress),
      ubigeo: await this.ubigeoDesdeDistrito(texto(d.homeDistrictId)),
      telefono: texto(d.phone),
      historiaClinica: texto(d.historyNumber),
    };
  }

  private async datosDesdeReniec(
    nroDni: string,
  ): Promise<DatosPacienteBusqueda | null> {
    const res = await this.pacientesApi.consultarReniec(nroDni);
    const datos: IReniecDatos = res?.datos;
    if (
      !datos ||
      (!texto(datos.apellidoPaterno) &&
        !texto(datos.primerNombre) &&
        !texto(datos.nombres))
    ) {
      return null;
    }

    const mapeado = await this.reniecMapper.mapearDatos(
      datos,
      formVacio(),
      this.tiposSexo,
      this.estadosCivil,
    );
    const f = mapeado.form;
    this.form = {
      ...formVacio(),
      ...f,
      fechaNacimiento: toIsoFecha(texto(f.fechaNacimiento)),
    };
    await this.cargarUbigeoDomicilio();

    const deps = await this.ubigeoService.getDepartamentos();
    const nombreDep =
      deps.find((v) => String(v.id) === texto(f.idDepartamentoDomicilio))
        ?.nombre ?? '';
    let nombreProv = '';
    if (f.idDepartamentoDomicilio) {
      const provs = await this.ubigeoService.getProvincias(
        f.idDepartamentoDomicilio,
      );
      nombreProv =
        provs.find((v) => String(v.id) === texto(f.idProvinciaDomicilio))
          ?.nombre ?? '';
    }
    let nombreDist = '';
    if (f.idProvinciaDomicilio) {
      const dists = await this.ubigeoService.getDistritos(
        f.idProvinciaDomicilio,
      );
      nombreDist =
        dists.find((v) => String(v.id) === texto(f.idDistritoDomicilio))
          ?.nombre ?? '';
    }

    return {
      origen: 'reniec',
      apellidoPaterno: texto(f.apellidoPaterno),
      apellidoMaterno: texto(f.apellidoMaterno),
      primerNombre: texto(f.primerNombre),
      segundoNombre: texto(f.segundoNombre),
      tercerNombre: texto(f.tercerNombre),
      tipoDocumento: 'DNI',
      nroDocumento: nroDni,
      fechaNacimiento: formatFecha(texto(f.fechaNacimiento)),
      sexo: this.descripcionCatalogo(this.tiposSexo, texto(f.idTipoSexo)),
      estadoCivil: this.descripcionCatalogo(
        this.estadosCivil,
        texto(f.idEstadoCivil),
      ),
      direccion: texto(f.direccionDomicilio),
      ubigeo: [nombreDep, nombreProv, nombreDist].filter(Boolean).join(', '),
      telefono: '',
      historiaClinica: '',
    };
  }

  private async ubigeoDesdeDistrito(idDistrito: string): Promise<string> {
    const n = Number(idDistrito);
    if (Number.isNaN(n) || n < 100) return '';

    const dep = String(Math.floor(n / 10000));
    const prov = String(Math.floor(n / 100));

    const deps = await this.ubigeoService.getDepartamentos();
    const nombreDep = deps.find((v) => String(v.id) === dep)?.nombre || '';
    const provs = await this.ubigeoService.getProvincias(dep);
    const nombreProv = provs.find((v) => String(v.id) === prov)?.nombre || '';
    const dists = await this.ubigeoService.getDistritos(prov);
    const nombreDist =
      dists.find((v) => String(v.id) === idDistrito)?.nombre || '';

    return [nombreDep, nombreProv, nombreDist].filter(Boolean).join(', ');
  }

  private descripcionCatalogo(
    catalogo: ICatalogoDescripcion[],
    id: string,
  ): string {
    if (!id) return '';
    return catalogo.find((v) => String(v.id) === id)?.descripcion || '';
  }

  // Consulta al SIS por SOAP (solo cuando la integración está activa) y, si la
  // afiliación está vigente, graba la filiación igual que el triaje de
  // emergencia y Ajusta el IAFA a SIS.
  // Devuelve true cuando el SIS reporta una afiliación ACTIVA (queda en
  // this.afiliacion y sus datos se copian al formulario), o false si no hay
  // afiliación activa o falla la consulta. Igual que en el triaje, se usa como
  // fuente de datos cuando el paciente no aparece en la base local ni RENIEC.
  private async consultarSis(nro: string): Promise<boolean> {
    try {
      const tipoSis = this.esDni ? 1 : 3;
      const sis = await this.sisApi.consultarAfiliado(nro, tipoSis);
      this.sisConsultado = true;

      if (sis?.estado === 'ACTIVO') {
        this.sisActivo = true;
        this.afiliacion = sis;
        this.mapearAfiliacionAlFormulario(sis);
        await this.gestionarAfiliacionSis(sis);
      } else {
        this.sisActivo = false;
      }

      // idError 6 = cuota diaria de consultas agotada: se desactiva la
      // integración para no seguir golpeando al SIS.
      if (this.esLimiteConsultasSis(sis)) {
        this.sisActivo = false;
        this.error =
          sis.resultado?.trim() ||
          'Se alcanzó el límite de consultas diarias del SIS.';
        await this.desactivarIntegracionSis();
      }

      this.actualizarIafaAutomatico();
      return this.sisActivo;
    } catch {
      this.sisConsultado = true;
      this.sisActivo = false;
      this.actualizarIafaAutomatico();
      return false;
    }
  }

  // Graba la filiación en la base de datos local (igual que el triaje). Un
  // fallo no bloquea la búsqueda: el paciente ya fue encontrado.
  private async gestionarAfiliacionSis(sis: SisAfiliado): Promise<void> {
    try {
      await this.sisApi.gestionarAfiliacion({
        idSiasis: sis.idNumReg ? Number(sis.idNumReg) : undefined,
        codigo: sis.tabla || undefined,
        documentoTipo: sis.tipoDocumento || this.idTipoDoc,
        documentoNumero: sis.nroDocumento || this.nroDocumento,
        paterno: sis.apePaterno,
        materno: sis.apeMaterno,
        pNombre: sis.nombres,
        genero: sis.genero,
        fNacimiento: this.fechaSis(sis.fecNacimiento) || undefined,
        idDistritoDomicilio: sis.idUbigeo,
        estado: sis.estado,
        afiliacionDisa: sis.disa,
        afiliacionTipoFormato: sis.tipoFormato,
        afiliacionNroFormato: sis.nroContrato,
        afiliacionNroIntegrante: sis.correlativo,
        codigoEstablAdscripcion: sis.eess,
        descEESS: sis.descEESS,
        descEessUbigeo: sis.descEessUbigeo,
        regimen: sis.regimen,
        tipoSeguro: sis.tipoSeguro,
        descTipoSeguro: sis.descTipoSeguro,
        contrato: sis.contrato,
        idPlan: sis.idPlan,
        idGrupoPoblacional: sis.idGrupoPoblacional,
        msgConfidencial: sis.msgConfidencial,
      });
      this.sisGuardado = true;
    } catch {
      this.sisGuardado = false;
    }
  }

  private fechaSis(fecha: string | undefined): string {
    if (!fecha) return '';
    if (fecha.length === 8) {
      return `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}T00:00:00Z`;
    }
    return fecha;
  }

  get nombreCompleto(): string {
    if (!this.resultado) return '';
    return [
      this.resultado.apellidoPaterno,
      this.resultado.apellidoMaterno,
      this.resultado.primerNombre,
      this.resultado.segundoNombre,
      this.resultado.tercerNombre,
    ]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();
  }

  get domicilioCompleto(): string {
    if (!this.resultado) return '';
    return [this.resultado.direccion, this.resultado.ubigeo]
      .filter((v) => !!v)
      .join(' — ');
  }
}
