import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MaestrosApiService } from '../../../compartido/api/maestros.api.service';
import { ApiRequestError } from '../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../compartido/componentes/tabla/tabla.component';
import type {
  ICatalogoDescripcion,
  ICatalogoNombre,
  IFilaBackend,
} from '../../../compartido/tipos/api-tipos';
import { BotonesFiltroComponent } from '../../../compartido/ui/botones-filtro/botones-filtro';
import { FiltrosGlobal } from '../../../compartido/ui/filtros-global/filtros-global';
import { ModalGlobalService } from '../../../compartido/ui/modal-global/modal-global.service';
import { PaginacionComponent } from '../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../compartido/ui/select-global/select-global';
import { ErrorMensajeComponent } from '../../../compartido/ui/validacion/error-mensaje.component';
import { VentanaModal } from '../../../compartido/ui/ventana-modal/ventana-modal';
import { AuthService } from '../../auth/aplicacion/auth.service';
import {
  type SisAfiliacionPayload,
  type SisAfiliado,
  SisApiService,
} from '../../sis/adaptadores/salida/http/sis.api.service';
import {
  type CrearAdmisionPayload,
  TriajeApiService,
} from '../../triaje/adaptadores/salida/http/triaje.api.service';
import type { AdmisionRealizada } from './buscar-paciente/buscar-paciente.component';
import { BuscarPacienteComponent } from './buscar-paciente/buscar-paciente.component';
import { FichaAdmisionComponent } from './ficha-admision/ficha-admision/ficha-admision.component';
import { SisFuaReportComponent } from './sis-fua-report.component';
import { TicketHospitalizacionReportComponent } from './ticket-hospitalizacion-report.component';

const TIPO_PRIORIDAD_INFO: Record<
  number,
  { label: string; bg: string; text: string; dot: string }
> = {
  1: {
    label: 'I. Emerg. o Gravedad',
    bg: '#fee2e2',
    text: '#b91c1c',
    dot: '#dc2626',
  },
  2: {
    label: 'II. Urgencia Mayor',
    bg: '#ffedd5',
    text: '#c2410c',
    dot: '#f97316',
  },
  3: {
    label: 'III. Urgencia Menor',
    bg: '#fef9c3',
    text: '#a16207',
    dot: '#eab308',
  },
  4: {
    label: 'IV. PatologÃ­a Aguda ComÃºn',
    bg: '#d1fae5',
    text: '#047857',
    dot: '#10b981',
  },
  5: {
    label: 'LlegÃ³ CadÃ¡ver',
    bg: '#dbeafe',
    text: '#1d4ed8',
    dot: '#3b82f6',
  },
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

// valorFila devuelve el valor de la primera clave que exista en la fila
// comparando sin distinguir mayÃºsculas (las columnas del SP llegan con el
// nombre exacto de SQL Server, que puede variar en mayÃºsculas/guiones).
function valorFila(
  item: IFilaBackend | null | undefined,
  nombre: string,
): string {
  if (!item) return '';
  const objetivo = nombre.toLowerCase();
  const claves = Object.keys(item);
  const clave =
    claves.find((k) => k.toLowerCase() === objetivo) ??
    claves.find((k) => k.toLowerCase().replace(/_/g, '') === objetivo);
  if (!clave) return '';
  const v = item[clave];
  if (v === undefined || v === null || v === '') return '';
  return typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
    ? String(v)
    : '';
}

@Component({
  selector: 'app-admision-hospitalizacion',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    VentanaModal,
    FichaAdmisionComponent,
    SisFuaReportComponent,
    BuscarPacienteComponent,
    TicketHospitalizacionReportComponent,
    ErrorMensajeComponent,
    TablaComponent,
    ColumnaTemplateDirective,
    FiltrosGlobal,
    SelectGlobalComponent,
    BotonesFiltroComponent,
    PaginacionComponent,
  ],
  templateUrl: './admision-hospitalizacion.component.html',
})
export class AdmisionHospitalizacionComponent implements OnInit {
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly triajeApi = inject(TriajeApiService);
  private readonly sisApi = inject(SisApiService);
  private readonly modalGlobal = inject(ModalGlobalService);
  private readonly cdr = inject(ChangeDetectorRef);
  public readonly authService = inject(AuthService);

  fecha = '';
  nroCuenta = '';
  nroDocumento = '';
  nroHistoria = '';
  IdEspecialidad = '0';
  idServicio = '0';

  especialidades: ICatalogoNombre[] = [];
  servicios: ICatalogoNombre[] = [];
  tiposDocumentos: ICatalogoDescripcion[] = [];

  items: IFilaBackend[] = [];
  cargando = false;
  error = '';
  buscar = false;

  filasPorPagina = 15;
  paginaActual = 1;
  totalPaginas = 1;
  totalRegistros = 0;

  modalAdmision: IFilaBackend | null = null;
  formAdmision: {
    nombreAcompanante: string;
    telefonoAcompanante: string;
    direccionPaciente: string;
    observacion: string;
    idMedico: number | '';
  } = {
    nombreAcompanante: '',
    telefonoAcompanante: '',
    direccionPaciente: '',
    observacion: '',
    idMedico: '',
  };
  guardando = false;
  errorAdmision = '';

  medicosDisponibles: IFilaBackend[] = [];
  medicosFiltrados: IFilaBackend[] = [];
  medicoBusqueda = '';
  mostrarSugerenciasMedico = false;
  cargandoMedicos = false;
  errorMedicos = '';

  columnasTabla: ColumnaTabla[] = [
    { campo: 'nroCuentaCustom', cabecera: 'Nro. cuenta' },
    { campo: 'pacienteCustom', cabecera: 'Nombres' },
    { campo: 'dniCustom', cabecera: 'DNI' },
    { campo: 'historiaCustom', cabecera: 'Historia' },
    { campo: 'fechaIngresoCustom', cabecera: 'Fecha ingreso' },
    { campo: 'fechaEgresoCustom', cabecera: 'Fecha egreso' },
    { campo: 'destinoAltaCustom', cabecera: 'Destino alta' },
    {
      campo: 'servicioActualCustom',
      cabecera: 'Servicio actual',
      ancho: '200px',
    },
    { campo: 'iafaCustom', cabecera: 'IAFA' },
    { campo: 'accionCustom', cabecera: 'Acción', alineacion: 'right' },
  ];

  mensajeExito = '';

  modalFichaId: number | null = null;
  modalFuaId: number | null = null;
  modalTicketId: number | null = null;
  fichaImpresionAutomatica = false;
  fuaImpresionAutomatica = false;

  // Cuenta pendiente de mostrar su FUA después de cerrar el ticket. Permite
  // entregar el ticket y la FUA en secuencia tras grabar una admisión.
  private fuaPendienteId: number | null = null;

  modalBuscarPaciente = false;

  ngOnInit() {
    this.cargarCatalogos();
  }

  async cargarCatalogos() {
    const [e, s, t] = await Promise.allSettled([
      this.maestrosApi.getEspecialidades(),
      this.maestrosApi.getServicios(3),
      this.maestrosApi.getTiposDocumentos(),
    ]);
    if (e.status === 'fulfilled' && Array.isArray(e.value))
      this.especialidades = e.value;
    if (s.status === 'fulfilled' && Array.isArray(s.value))
      this.servicios = s.value;
    if (t.status === 'fulfilled' && Array.isArray(t.value))
      this.tiposDocumentos = t.value;
    if (s.status === 'rejected') {
      this.error =
        s.reason instanceof ApiRequestError
          ? `No se pudieron cargar los servicios: ${s.reason.message}`
          : 'No se pudieron cargar los servicios.';
    }
    this.cdr.detectChanges();
  }

  // Indica si la bandeja tiene algún filtro de búsqueda activo (fecha, cuenta,
  // documento, historia o un servicio distinto de "Todos"). Sin filtros no se
  // debe disparar una búsqueda automática al grabar una admisión.
  private hayFiltros(): boolean {
    return Boolean(
      this.fecha.trim() ||
        this.nroCuenta.trim() ||
        this.nroDocumento.trim() ||
        this.nroHistoria.trim() ||
        (this.idServicio && this.idServicio !== '0'),
    );
  }

  async handleBuscar() {
    this.cargando = true;
    this.error = '';
    this.mensajeExito = '';
    try {
      const items = await this.triajeApi.listarAtencionesHospitalizacion({
        // La fecha es opcional: vacía se omite y el backend envía NULL al
        // SP (@Fecha) para no filtrar por fecha.
        fecha: this.fecha.trim() || undefined,
        idServicio: Number(this.idServicio) || 0,
        idCuenta: Number(this.nroCuenta.trim()) || undefined,
        nroHistoria: Number(this.nroHistoria.trim()) || undefined,
        nroDocumento: this.nroDocumento.trim() || undefined,
      });
      this.items = Array.isArray(items) ? items : [];
      this.totalRegistros = this.items.length;
      this.paginaActual = 1;
      this.totalPaginas = Math.max(
        1,
        Math.ceil(this.totalRegistros / this.filasPorPagina),
      );
      this.buscar = true;
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo obtener la bandeja de admisiones.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  get itemsPagina(): IFilaBackend[] {
    const inicio = (this.paginaActual - 1) * this.filasPorPagina;
    return this.items.slice(inicio, inicio + this.filasPorPagina);
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina < 1 || nuevaPagina > this.totalPaginas) return;
    this.paginaActual = nuevaPagina;
    this.cdr.detectChanges();
  }

  abrirModalAdmision(item: IFilaBackend) {
    this.modalAdmision = item;
    this.formAdmision = {
      nombreAcompanante: '',
      telefonoAcompanante: '',
      direccionPaciente:
        campo(item, ['Direccion', 'direccion', 'DireccionDomicilio']) || '',
      observacion: '',
      idMedico: '',
    };
    this.errorAdmision = '';
    this.medicoBusqueda = '';
    this.medicosFiltrados = [];
    this.mostrarSugerenciasMedico = false;
    this.cargarMedicos(item);
  }

  async cargarMedicos(item: IFilaBackend) {
    const IdEspecialidad = this.resolverIdEspecialidad(item);

    if (!IdEspecialidad) {
      this.medicosDisponibles = [];
      this.medicosFiltrados = [];
      this.mostrarSugerenciasMedico = false;
      this.errorMedicos =
        'No se pudo determinar la especialidad del triaje. Seleccione la especialidad en el filtro de la bandeja para listar los mÃ©dicos.';
      return;
    }

    this.cargandoMedicos = true;
    this.errorMedicos = '';
    try {
      const medicos =
        await this.triajeApi.medicosPorEspecialidad(IdEspecialidad);
      if (Array.isArray(medicos)) {
        this.medicosDisponibles = medicos.filter(
          (v, i, a) => a.findIndex((t) => t.idMedico === v.idMedico) === i,
        );
      } else {
        this.medicosDisponibles = [];
      }
      if (this.medicosDisponibles.length === 0) {
        this.errorMedicos =
          'No se encontraron mÃ©dicos para la especialidad seleccionada.';
      }
    } catch (err: unknown) {
      this.medicosDisponibles = [];
      this.errorMedicos =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudieron cargar los mÃ©dicos.';
    } finally {
      this.cargandoMedicos = false;
      this.cdr.detectChanges();
    }
  }

  private resolverIdEspecialidad(item: IFilaBackend): number {
    const numId = valorFila(item, 'IdEspecialidad');
    if (numId && Number(numId) > 0) return Number(numId);

    const numIdIngreso = valorFila(item, 'IdEspecialidadIngreso');
    if (numIdIngreso && Number(numIdIngreso) > 0) return Number(numIdIngreso);

    const nombreEspecialidad = (() => {
      for (const preferido of [
        'Especialidad',
        'EspecialidadDescripcion',
        'DescripcionEspecialidad',
        'descripcion',
      ]) {
        const texto = valorFila(item, preferido);
        if (texto) return texto;
      }
      return '';
    })();

    if (nombreEspecialidad) {
      const objetivo = this.normalizarEspecialidad(nombreEspecialidad);
      const coincidente = this.especialidades.find(
        (e) =>
          this.normalizarEspecialidad(String(e.nombre ?? e.id)) === objetivo,
      );
      if (coincidente) return coincidente.id;
    }

    return this.IdEspecialidad !== '0' ? Number(this.IdEspecialidad) || 0 : 0;
  }

  private normalizarEspecialidad(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  cerrarModalAdmision() {
    this.modalAdmision = null;
    this.medicosDisponibles = [];
    this.medicosFiltrados = [];
    this.mostrarSugerenciasMedico = false;
  }

  filtrarMedicos(valor: string) {
    const texto = valor.trim().toLowerCase();
    if (texto.length < 2) {
      this.medicosFiltrados = [];
      this.mostrarSugerenciasMedico = false;
      return;
    }
    this.medicosFiltrados = this.medicosDisponibles.filter((m) =>
      String(m.nombreCompleto ?? '')
        .toLowerCase()
        .includes(texto),
    );
    this.mostrarSugerenciasMedico = this.medicosFiltrados.length > 0;
  }

  seleccionarMedico(medico: IFilaBackend) {
    this.formAdmision.idMedico = Number(medico.idMedico) || '';
    this.medicoBusqueda = String(medico.nombreCompleto ?? '');
    this.mostrarSugerenciasMedico = false;
    this.medicosFiltrados = [];
  }

  onMedicoInput(valor: string) {
    this.formAdmision.idMedico = '';
    this.filtrarMedicos(valor);
  }

  cerrarSugerenciasMedico() {
    setTimeout(() => {
      this.mostrarSugerenciasMedico = false;
    }, 200);
  }

  async handleAdmisionExitosa(mensaje: string, filaAdmisionada: IFilaBackend) {
    this.modalAdmision = null;
    await this.handleBuscar();
    this.mensajeExito = mensaje || 'AdmisiÃ³n registrada correctamente.';
    this.dispararImpresionAutomatica(filaAdmisionada);
  }

  private dispararImpresionAutomatica(filaAdmisionada: IFilaBackend) {
    const filaActual =
      this.items.find((it) => this.mismaAdmision(it, filaAdmisionada)) ?? null;
    if (!filaActual) return;
    const idCuenta = this.idCuentaAtencion(filaActual);
    if (!idCuenta) return;
    this.modalFichaId = idCuenta;
    this.fichaImpresionAutomatica = true;
    this.modalTicketId = idCuenta;
    if (this.esSis(filaActual)) {
      this.modalFuaId = idCuenta;
      this.fuaImpresionAutomatica = true;
    }
  }

  private mismaAdmision(a: IFilaBackend, b: IFilaBackend): boolean {
    for (const claves of [
      ['IdTriaje', 'idTriaje', 'IDTriaje'],
      ['IdPacienteTriaje', 'idPacienteTriaje', 'IdpacienteTriaje'],
    ]) {
      const va = campoNum(a, claves);
      const vb = campoNum(b, claves);
      if (va && vb && va === vb) return true;
    }
    return false;
  }

  async admitir() {
    const item = this.modalAdmision;
    if (!item) return;
    const idTriaje = campoNum(item, ['IdTriaje', 'idTriaje', 'IDTriaje']);
    const idPacienteTriaje = campoNum(item, [
      'IdPacienteTriaje',
      'idPacienteTriaje',
      'IdpacienteTriaje',
      'IdPaciente',
      'idPaciente',
    ]);
    if (!idTriaje || !idPacienteTriaje) {
      this.errorAdmision = 'El registro no tiene un id de triaje vÃ¡lido.';
      return;
    }
    if (!this.formAdmision.nombreAcompanante.trim()) {
      this.errorAdmision = 'El nombre del acompaÃ±ante es obligatorio.';
      return;
    }
    if (!this.formAdmision.direccionPaciente.trim()) {
      this.errorAdmision = 'La direcciÃ³n del paciente es obligatoria.';
      return;
    }
    if (!this.formAdmision.idMedico) {
      this.errorAdmision = 'Debe seleccionar el mÃ©dico.';
      return;
    }
    this.guardando = true;
    this.errorAdmision = '';
    const payload: CrearAdmisionPayload = {
      idTriaje,
      idPacienteTriaje,
      nroDocumento: this.documento(item) || undefined,
      idEmpleado: this.authService.getIdEmpleado() || undefined,
      idMedico: this.formAdmision.idMedico
        ? Number(this.formAdmision.idMedico)
        : undefined,
      nombreAcompanante:
        this.formAdmision.nombreAcompanante.trim() || undefined,
      telefonoAcompanante:
        this.formAdmision.telefonoAcompanante.trim() || undefined,
      direccionPaciente:
        this.formAdmision.direccionPaciente.trim() || undefined,
      observacion: this.formAdmision.observacion.trim() || undefined,
    };
    try {
      const resp = await this.triajeApi.crearAdmision(payload);
      if (resp?.resultado?.startsWith('Error')) {
        this.errorAdmision =
          resp.resultado.replace(/^Error;\s*/, '') ||
          'No se pudo registrar la admisiÃ³n.';
        return;
      }
      await this.handleAdmisionExitosa(
        resp?.resultado || 'AdmisiÃ³n registrada correctamente.',
        item,
      );
    } catch (err: unknown) {
      this.errorAdmision =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo registrar la admisiÃ³n.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  abrirFicha(item: IFilaBackend) {
    const id = campoNum(item, [
      'IdCuentaAtencion',
      'idCuentaAtencion',
      'NroCuenta',
      'nroCuenta',
      'Cuenta',
      'cuenta',
    ]);
    if (id) {
      this.fichaImpresionAutomatica = false;
      this.modalFichaId = id;
    }
  }

  cerrarFicha() {
    this.modalFichaId = null;
    this.fichaImpresionAutomatica = false;
  }

  abrirFua(item: IFilaBackend) {
    const id = campoNum(item, ['IdCuentaAtencion', 'idCuentaAtencion']);
    if (id) {
      this.fuaImpresionAutomatica = false;
      this.modalFuaId = id;
    }
  }

  cerrarFua() {
    this.modalFuaId = null;
    this.fuaImpresionAutomatica = false;
  }

  abrirTicket(item: IFilaBackend) {
    const id = campoNum(item, ['IdCuentaAtencion', 'idCuentaAtencion']);
    if (id) {
      this.modalTicketId = id;
    }
  }

  cerrarTicket() {
    this.modalTicketId = null;
    // Tras cerrar el ticket se muestra la FUA pendiente de la admisión grabada.
    if (this.fuaPendienteId) {
      this.modalFuaId = this.fuaPendienteId;
      this.fuaPendienteId = null;
    }
  }

  abrirBuscarPaciente() {
    this.modalBuscarPaciente = true;
  }

  cerrarBuscarPaciente() {
    this.modalBuscarPaciente = false;
  }

  // El modal de búsqueda emite alGuardar cuando el SP graba la admisión.
  // Se cierra el modal, se muestra el mensaje del SP y se abre el ticket de la
  // atención; al cerrar el ticket se muestra la FUA de la misma cuenta.
  // La bandeja solo se refresca si hay un filtro activo (evita una búsqueda
  // completa que retrasa la aparición de los formatos).
  async onPacienteAdmitido(evento: AdmisionRealizada) {
    this.modalBuscarPaciente = false;
    if (this.hayFiltros()) {
      await this.handleBuscar();
    }
    this.mensajeExito = evento.mensaje || 'Admisión registrada correctamente.';
    if (evento.idCuentaAtencion > 0) {
      this.modalTicketId = evento.idCuentaAtencion;
      this.fuaPendienteId = evento.idCuentaAtencion;
    }
    this.cdr.detectChanges();
  }

  cerrarExito() {
    this.mensajeExito = '';
  }

  idCuentaAtencion(item: IFilaBackend): number {
    return campoNum(item, [
      'IdCuentaAtencion',
      'idCuentaAtencion',
      'NroCuenta',
      'nroCuenta',
      'Cuenta',
      'cuenta',
    ]);
  }

  idTipoPrioridad(item: IFilaBackend): number {
    return campoNum(item, [
      'IdTipoPrioridad',
      'idTiposGravedad',
      'IdTiposGravedad',
    ]);
  }

  prioridadInfo(
    item: IFilaBackend,
  ): { label: string; bg: string; text: string; dot: string } | null {
    const id = this.idTipoPrioridad(item);
    return TIPO_PRIORIDAD_INFO[id] || null;
  }

  prioridadTexto(item: IFilaBackend): string {
    return campo(item, [
      'Prioridad',
      'prioridad',
      'TipoPrioridad',
      'tipoPrioridad',
      'DescripcionPrioridad',
    ]);
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
    return campo(item, [
      'NroDocumento',
      'nroDocumento',
      'Documento',
      'documento',
    ]);
  }

  // Tipo de documento traÃ­do del endpoint de la bandeja (campo TipoDoc).
  // Se mapea con el catÃ¡logo de tipos de documento; si el valor ya es una
  // descripciÃ³n se muestra tal cual, y si no llega data se asume DNI.
  tipoDocumento(item: IFilaBackend): string {
    const codigo =
      valorFila(item, 'TipoDoc') ||
      valorFila(item, 'TipoDocumento') ||
      valorFila(item, 'IdTipoDocumento');
    if (!codigo) return 'DNI';
    const tipo = this.tiposDocumentos.find(
      (t) => String(t.id) === String(codigo),
    );
    return tipo?.descripcion || codigo;
  }

  servicio(item: IFilaBackend): string {
    return campo(item, ['Servicio', 'servicio', 'Descripcion', 'descripcion']);
  }

  tipoIngreso(item: IFilaBackend): string {
    return campo(item, ['TipoIngreso', 'tipoIngreso']);
  }

  iafa(item: IFilaBackend): string {
    return campo(item, [
      'IAFA',
      'iafa',
      'FuenteFinanciamiento',
      'Tipo_Seguro',
      'tipoSeguro',
      'TipoSeguro',
    ]);
  }

  observacion(item: IFilaBackend): string {
    return campo(item, [
      'Observacion',
      'observacion',
      'ObservaciÃ³n',
      'observaciÃ³n',
      'Observaciones',
      'observaciones',
    ]);
  }

  numeroCuenta(item: IFilaBackend): string {
    return campo(item, [
      'NroCuenta',
      'nroCuenta',
      'NumeroCuenta',
      'numeroCuenta',
      'Cuenta',
      'cuenta',
      'IdCuentaAtencion',
      'idCuentaAtencion',
    ]);
  }

  dni(item: IFilaBackend): string {
    return campo(item, [
      'NroDocumento',
      'nroDocumento',
      'NumeroDocumento',
      'numeroDocumento',
      'Documento',
      'documento',
      'Dni',
      'dni',
    ]);
  }

  historia(item: IFilaBackend): string {
    return campo(item, [
      'NroHistoriaClinica',
      'nroHistoriaClinica',
      'HistoriaClinica',
      'historiaClinica',
      'NroHistoria',
      'nroHistoria',
      'Historia',
      'historia',
    ]);
  }

  fechaIngreso(item: IFilaBackend): string {
    return this.formatFecha(
      valorFila(item, 'FechaIngreso') ||
        valorFila(item, 'fechaIngreso') ||
        valorFila(item, 'Fecha_Ingreso') ||
        valorFila(item, 'FechaRegistro'),
    );
  }

  fechaEgreso(item: IFilaBackend): string {
    return this.formatFecha(
      valorFila(item, 'FechaEgreso') ||
        valorFila(item, 'fechaEgreso') ||
        valorFila(item, 'FechaAlta') ||
        valorFila(item, 'fechaAlta'),
    );
  }

  destinoAlta(item: IFilaBackend): string {
    return campo(item, [
      'DestinoAtencion',
      'destinoAtencion',
      'DestinoAlta',
      'destinoAlta',
      'Destino',
      'destino',
      'TipoAlta',
      'tipoAlta',
      'CondicionAlta',
      'condicionAlta',
    ]);
  }

  // El SP de hospitalización puede devolver el servicio como "Servicio",
  // "ServicioActual" o "ServicioIngreso"; si no, se cae al servicio genérico.
  servicioActual(item: IFilaBackend): string {
    return (
      campo(item, [
        'ServicioActual',
        'servicioActual',
        'ServicioIngreso',
        'servicioIngreso',
      ]) || this.servicio(item)
    );
  }

  // Formatea fechas ISO/compactas (YYYY-MM-DD o YYYYMMDD) como dd/mm/yyyy sin
  // desfase de zona horaria (evita que un date-only se muestre con un día menos).
  private formatFecha(valor: string): string {
    const texto = (valor || '').trim();
    if (!texto) return '—';
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const compacto = texto.match(/^(\d{4})(\d{2})(\d{2})/);
    if (compacto) return `${compacto[3]}/${compacto[2]}/${compacto[1]}`;
    const d = new Date(texto);
    if (Number.isNaN(d.getTime())) return texto;
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  esSis(item: IFilaBackend): boolean {
    return (
      campoNum(item, ['IdFuenteFinanciamiento', 'idFuenteFinanciamiento']) ===
        3 || this.iafa(item).toUpperCase().includes('SIS')
    );
  }

  // El SP puede devolver el flag como nÃºmero (0/1) o como booleano.
  esAccidenteTransito(item: IFilaBackend): boolean {
    const bruto =
      valorFila(item, 'EsAccidenteTransito') ||
      valorFila(item, 'Es_Accidente_Transito') ||
      valorFila(item, 'idEsAccidenteTransito') ||
      valorFila(item, 'IdEsAccidenteTransito') ||
      campo(item, ['EsAccidenteTransito', 'esAccidenteTransito']);
    if (!bruto) return false;
    const normalizado = bruto.trim().toUpperCase();
    return normalizado === '1' || normalizado === 'TRUE';
  }

  // Paciente sin admisiÃ³n (sin cuenta de atenciÃ³n), sin afiliaciÃ³n SIS
  // registrada y sin condicionante de accidente de trÃ¡nsito: candidato a
  // consultar al SIS por documento.
  esParticularPorAdmisionar(item: IFilaBackend): boolean {
    return (
      this.idCuentaAtencion(item) === 0 &&
      !this.esSis(item) &&
      !this.esAccidenteTransito(item)
    );
  }

  async consultarSisPaciente(item: IFilaBackend) {
    const documento = this.documento(item) || '0';
    if (documento === '0') {
      this.error =
        'El paciente no tiene nÃºmero de documento para consultar al SIS.';
      return;
    }

    const confirmar = await this.modalGlobal.confirmar(
      `Â¿Desea consultar al SIS al paciente ${this.nombrePaciente(item)} (` +
        `${this.tipoDocumento(item)} ${documento})? ` +
        'La consulta quedarÃ¡ registrada en la auditorÃ­a y, si tiene ' +
        'afiliaciÃ³n SIS activa, se grabarÃ¡ la afiliaciÃ³n del paciente.',
      'Consultar al SIS',
      'SÃ­, consultar',
    );
    if (!confirmar) return;

    this.error = '';
    try {
      const sis = await this.sisApi.consultarAfiliado(
        documento,
        this.tipoDocSis(item),
      );
      if (sis && sis.estado === 'ACTIVO') {
        const mensajeRegistro = await this.registrarAfiliacionSis(sis, item);
        const iafa = await this.actualizarIafaTriaje(item);
        this.modalGlobal.info(
          `El paciente tiene afiliaciÃ³n SIS activa (${sis.descTipoSeguro || ''}). ` +
            mensajeRegistro +
            ' ' +
            iafa.mensaje,
          'Resultado SIS',
        );
        if (iafa.ok) await this.handleBuscar();
      } else {
        this.modalGlobal.info(
          `No se encontrÃ³ afiliaciÃ³n SIS activa${
            sis?.estado ? ` (estado: ${sis.estado})` : ''
          }.`,
          'Resultado SIS',
        );
      }
    } catch (error: unknown) {
      this.modalGlobal.error(
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo consultar al SIS.',
        'Error al consultar SIS',
      );
    }
  }

  // Graba la afiliaciÃ³n del paciente invocando la API que llama al SP
  // usp_go_webSisFiliacionesGestionar (POST /api/v1/sis/filiaciones).
  private async registrarAfiliacionSis(
    sis: SisAfiliado,
    item: IFilaBackend,
  ): Promise<string> {
    const payload = this.afiliacionDesdeConsulta(sis, item);
    try {
      await this.sisApi.gestionarAfiliacion(payload);
      return 'La afiliaciÃ³n SIS del paciente fue registrada correctamente.';
    } catch (error: unknown) {
      const detalle =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo registrar la afiliaciÃ³n SIS del paciente.';
      return detalle;
    }
  }

  // Actualiza la IAFA del triaje (fuente de financiamiento = SIS) invocando
  // la API que llama al SP usp_go_Triaje_EmergeciaActualizarIAFA, enviando
  // como parÃ¡metro el IdTriaje que devuelve el listado de triajes sin admisiÃ³n.
  private async actualizarIafaTriaje(
    item: IFilaBackend,
  ): Promise<{ ok: boolean; mensaje: string }> {
    const idTriaje = campoNum(item, ['IdTriaje', 'idTriaje', 'IDTriaje']);
    if (!idTriaje) {
      return {
        ok: false,
        mensaje: 'No se pudo actualizar la IAFA por falta de IdTriaje.',
      };
    }
    try {
      await this.triajeApi.actualizarIafa(idTriaje);
      return { ok: true, mensaje: 'La IAFA del triaje fue actualizada a SIS.' };
    } catch (error: unknown) {
      return error instanceof ApiRequestError
        ? {
            ok: false,
            mensaje: `No se pudo actualizar la IAFA: ${error.message}`,
          }
        : { ok: false, mensaje: 'No se pudo actualizar la IAFA.' };
    }
  }

  private afiliacionDesdeConsulta(
    sis: SisAfiliado,
    item: IFilaBackend,
  ): SisAfiliacionPayload {
    const payload: SisAfiliacionPayload = {
      // idSiasis â† IdNumReg y codigo â† Tabla, igual que en el registro de triaje.
      idSiasis: sis.idNumReg ? Number(sis.idNumReg) : undefined,
      codigo: sis.tabla || undefined,
      documentoTipo: sis.tipoDocumento || String(this.tipoDocSis(item)),
      documentoNumero: sis.nroDocumento || this.documento(item) || '',
    };

    const nombres = (sis.nombres || '').trim().split(/\s+/);
    const [pNombre = '', ...otrosNombres] = nombres;
    if (pNombre) payload.pNombre = pNombre;
    const oNombres = otrosNombres.join(' ');
    if (oNombres) payload.oNombres = oNombres;
    if (sis.apePaterno?.trim()) payload.paterno = sis.apePaterno.trim();
    if (sis.apeMaterno?.trim()) payload.materno = sis.apeMaterno.trim();
    if (sis.genero?.trim()) payload.genero = sis.genero.trim();

    const fNacimiento = this.aFechaIsoSis(sis.fecNacimiento);
    if (fNacimiento) payload.fNacimiento = fNacimiento;
    const fAfiliacion = this.aFechaIsoSis(sis.fecAfiliacion);
    if (fAfiliacion) payload.afiliacionFecha = fAfiliacion;

    if (sis.disa) payload.afiliacionDisa = sis.disa;
    if (sis.tipoFormato) payload.afiliacionTipoFormato = sis.tipoFormato;
    if (sis.nroContrato) payload.afiliacionNroFormato = sis.nroContrato;
    if (sis.eess) payload.codigoEstablAdscripcion = sis.eess;
    if (sis.descEESS) payload.descEESS = sis.descEESS;
    if (sis.descEessUbigeo) payload.descEessUbigeo = sis.descEessUbigeo;
    if (sis.regimen) payload.regimen = sis.regimen;
    if (sis.tipoSeguro) payload.tipoSeguro = sis.tipoSeguro;
    if (sis.descTipoSeguro) payload.descTipoSeguro = sis.descTipoSeguro;
    if (sis.contrato) payload.contrato = sis.contrato;
    if (sis.idPlan) payload.idPlan = sis.idPlan;
    if (sis.idGrupoPoblacional)
      payload.idGrupoPoblacional = sis.idGrupoPoblacional;
    if (sis.msgConfidencial) payload.msgConfidencial = sis.msgConfidencial;
    payload.estado = sis.estado || 'ACTIVO';

    const idEmpleado = this.authService.getIdEmpleado();
    if (idEmpleado > 0) payload.idUsuarioAuditoria = idEmpleado;

    return payload;
  }

  private aFechaIsoSis(valor?: string): string | undefined {
    const texto = (valor || '').trim();
    if (!texto) return undefined;
    const yyyymmdd = texto.match(/^(\d{4})(\d{2})(\d{2})/);
    if (yyyymmdd) {
      return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}T00:00:00Z`;
    }
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`;
    return undefined;
  }

  private tipoDocSis(item: IFilaBackend): number {
    // Fuente primaria: IdDocIdentidad (columna que devuelve el listado de
    // triajes; Id = 1 equivale a DNI, igual que en el registro de triaje).
    const idDoc = (
      valorFila(item, 'IdDocIdentidad') ||
      valorFila(item, 'idDocIdentidad') ||
      ''
    )
      .toString()
      .trim()
      .replace(/^0+/, '');
    if (idDoc !== '') return idDoc === '1' ? 1 : 3;

    // Respaldo: descripciÃ³n ya mapeada (tipoDocumento()), porque el cÃ³digo
    // crudo (TipoDoc) no siempre llega como '1' para DNI.
    const descripcion = this.tipoDocumento(item).trim().toUpperCase();
    const codigo = (
      valorFila(item, 'TipoDoc') ||
      valorFila(item, 'TipoDocumento') ||
      valorFila(item, 'IdTipoDocumento') ||
      ''
    )
      .toString()
      .trim()
      .replace(/^0+/, '');
    return descripcion === 'DNI' || codigo === '1' ? 1 : 3;
  }

  formatFechaTriaje(item: IFilaBackend): string {
    let raw = campo(item, [
      'fecha_Triaje',
      'FechaTriaje',
      'fechaTriaje',
      'FechaRegistro',
      'fechaRegistro',
    ]);
    if (!raw) return 'â€”';
    if (raw.endsWith('Z')) raw = raw.slice(0, -1);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return 'â€”';
    return (
      d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }) +
      ' ' +
      d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    );
  }

  sanitizar(texto: string): string {
    return texto.replace(/[\p{Cc}\u200B-\u200F\uFEFF]/gu, '').trim();
  }

  soloDigitos(event: KeyboardEvent) {
    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
    }
  }
}
