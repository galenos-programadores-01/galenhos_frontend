import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaestrosApiService } from '../../../../../../../compartido/api/maestros.api.service';
import { ApiRequestError } from '../../../../../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../../../compartido/componentes/tabla/tabla.component';
import type {
  ICatalogoNombre,
  IFilaBackend,
} from '../../../../../../../compartido/tipos/api-tipos';
import { AuthService } from '../../../../../../auth/aplicacion/auth.service';
import {
  type RegistroTriajePayload,
  TriajeApiService,
} from '../../../../salida/http/triaje.api.service';
import { FirmaMasivaModal } from '../../componentes/firma-masiva/firma-masiva-modal';
import { RegistroTriajeModal } from '../../componentes/registro-triaje-modal/registro-triaje-modal';
import { ReporteTriajeComponent } from '../../componentes/reporte-triaje/reporte-triaje.component';

interface FormEvaluacion {
  motivo: string;
  presionArterial: string;
  frecCardiaca: string;
  frecRespiratoria: string;
  temperatura: string;
  saturacion: string;
  fiO2: string;
  peso: string;
  talla: string;
  escalaDolor: string;
  escalaGlasgow: string;
  tiempoEvolucionCantidad: string;
  tiempoEvolucionCantidadUnidad: string;
  idServicio: string;
  idTipoPrioridad: string;
}

function formEvaluacionVacio(): FormEvaluacion {
  return {
    motivo: '',
    presionArterial: '',
    frecCardiaca: '',
    frecRespiratoria: '',
    temperatura: '',
    saturacion: '',
    fiO2: '',
    peso: '',
    talla: '',
    escalaDolor: '',
    escalaGlasgow: '',
    tiempoEvolucionCantidad: '',
    tiempoEvolucionCantidadUnidad: '',
    idServicio: '',
    idTipoPrioridad: '',
  };
}

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

const PRIORIDADES = [
  { value: '1', label: 'Rojo · Emergencia' },
  { value: '2', label: 'Naranja · Muy urgente' },
  { value: '3', label: 'Amarillo · Urgente' },
  { value: '4', label: 'Verde · Poco urgente' },
  { value: '5', label: 'Azul · No urgente' },
];

const UNIDADES_TIEMPO = [
  { value: 'MINUTOS', label: 'Minutos' },
  { value: 'HORAS', label: 'Horas' },
  { value: 'DIAS', label: 'Días' },
  { value: 'SEMANAS', label: 'Semanas' },
];

const SI_NO = [
  { value: '0', label: 'No' },
  { value: '1', label: 'Sí' },
];

@Component({
  selector: 'app-triaje',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RegistroTriajeModal,
    ReporteTriajeComponent,
    FirmaMasivaModal,
    TablaComponent,
    ColumnaTemplateDirective,
  ],
  templateUrl: './triaje.component.html',
})
export class TriajeComponent implements OnInit {
  private readonly triajeApi = inject(TriajeApiService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  public readonly authService = inject(AuthService);

  pacientes: IFilaBackend[] = [];
  cargando = false;
  error = '';
  mensajeExito = '';

  filtro = '';
  fechaInicio = ((d) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(
    new Date(),
  );
  fechaFin = ((d) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(
    new Date(),
  );
  servicioFiltro = '';
  serviciosFiltro: ICatalogoNombre[] = [];
  triajesBuscados = false;

  modalRegistro = false;
  reporteTriajeId: number | null = null;

  columnasTabla: ColumnaTabla[] = [
    {
      campo: 'seleccionCustom',
      cabecera: '',
      alineacion: 'center',
      ancho: '44px',
    },
    { campo: 'idTriajeCustom', cabecera: 'N.º Triaje' },
    { campo: 'documentoCustom', cabecera: 'Documento' },
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'sexoCustom', cabecera: 'Sexo', alineacion: 'center' },
    { campo: 'fechaCustom', cabecera: 'Fecha registro' },
    { campo: 'servicioCustom', cabecera: 'Servicio' },
    { campo: 'gravedadCustom', cabecera: 'Tipo gravedad' },
    { campo: 'estadoCustom', cabecera: 'Estado' },
    { campo: 'accionCustom', cabecera: 'Reporte', alineacion: 'right' },
  ];

  modalFirma = false;
  firmaIds: number[] = [];
  seleccionFirma = new Set<number>();

  modalReporte = false;
  reporte: IFilaBackend[] = [];
  cargandoReporte = false;
  errorReporte = '';

  modalFicha = false;
  ficha: IFilaBackend | null = null;
  filasFicha: { clave: string; valor: string }[] = [];
  cargandoFicha = false;
  errorFicha = '';

  pacienteEvaluar: IFilaBackend | null = null;
  formEvaluacion: FormEvaluacion = formEvaluacionVacio();
  guardandoEvaluacion = false;
  errorEvaluacion = '';
  servicios: ICatalogoNombre[] = [];

  readonly prioridades = PRIORIDADES;
  readonly unidadesTiempo = UNIDADES_TIEMPO;
  readonly opcionesSiNo = SI_NO;

  ngOnInit() {
    this.cargarCatalogos();
    this.cargarLista();
  }

  async cargarLista() {
    this.cargando = true;
    this.error = '';
    this.triajesBuscados = true;
    try {
      const derivado = this.servicioFiltro || '-100';
      const items = await this.triajeApi.listar(
        this.fechaInicio,
        this.fechaFin,
        derivado,
      );
      this.pacientes = Array.isArray(items) ? items : [];
    } catch (error: unknown) {
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo cargar el listado de triaje.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async cargarCatalogos() {
    try {
      const serv = await this.maestrosApi.getServicios(2);
      if (Array.isArray(serv)) this.serviciosFiltro = serv;
      if (Array.isArray(serv)) this.servicios = serv;
    } catch {}
  }

  abrirReporte(idTriaje?: number) {
    if (idTriaje) {
      this.reporteTriajeId = idTriaje;
    } else {
      this.modalReporte = true;
      this.errorReporte = '';
      this.generarReporte();
    }
  }

  toggleSeleccionFirma(idTriaje: number) {
    if (this.seleccionFirma.has(idTriaje)) {
      this.seleccionFirma.delete(idTriaje);
    } else {
      this.seleccionFirma.add(idTriaje);
    }
    this.cdr.detectChanges();
  }

  seleccionarTodosVisibles() {
    for (const p of this.pacientes) {
      const id = this.idTriaje(p);
      if (id) this.seleccionFirma.add(id);
    }
    this.cdr.detectChanges();
  }

  limpiarSeleccionFirma() {
    this.seleccionFirma.clear();
    this.cdr.detectChanges();
  }

  abrirFirmaMasiva() {
    const ids = Array.from(this.seleccionFirma).sort((a, b) => a - b);
    if (ids.length === 0) return;
    this.firmaIds = ids;
    this.modalFirma = true;
    this.limpiarSeleccionFirma();
  }

  cerrarFirmaMasiva() {
    this.modalFirma = false;
    this.firmaIds = [];
    this.limpiarSeleccionFirma();
    this.cargarLista();
  }

  onFirmaMasivaCompletada(resumen: { firmados: number; fallidos: number }) {
    this.mensajeExito =
      resumen.fallidos > 0
        ? `Se firmaron ${resumen.firmados} documento(s). ${resumen.fallidos} no se pudieron firmar.`
        : `Se firmaron los ${resumen.firmados} documento(s) correctamente.`;
    setTimeout(() => (this.mensajeExito = ''), 6000);
  }

  cerrarReporte() {
    if (this.reporteTriajeId) {
      this.reporteTriajeId = null;
    } else {
      this.modalReporte = false;
      this.reporte = [];
    }
  }

  async generarReporte() {
    this.cargandoReporte = true;
    this.errorReporte = '';
    try {
      const items = await this.triajeApi.obtenerReporte({});
      this.reporte = Array.isArray(items) ? items : [];
    } catch (error: unknown) {
      this.errorReporte =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo generar el reporte de triaje.';
    } finally {
      this.cargandoReporte = false;
      this.cdr.detectChanges();
    }
  }

  clavesReporte(): string[] {
    if (this.reporte.length === 0) return [];
    const claves = new Set<string>();
    for (const fila of this.reporte) {
      for (const k of Object.keys(fila)) claves.add(k);
    }
    return Array.from(claves);
  }

  valorCelda(fila: IFilaBackend, clave: string): string {
    const v = fila[clave];
    if (v === null || v === undefined) return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'object') return JSON.stringify(v);
    return '—';
  }

  idCuentaAtencion(item: IFilaBackend): number {
    return (
      Number(
        campo(item, [
          'IdCuentaAtencion',
          'idCuentaAtencion',
          'NroCuenta',
          'nroCuenta',
          'Cuenta',
          'cuenta',
        ]),
      ) || 0
    );
  }

  async abrirFicha(item: IFilaBackend) {
    const id = this.idCuentaAtencion(item);
    if (!id) {
      this.error = 'El registro no tiene una cuenta de atención asociada.';
      return;
    }
    this.modalFicha = true;
    this.ficha = null;
    this.filasFicha = [];
    this.errorFicha = '';
    this.cargandoFicha = true;
    try {
      const ficha = await this.triajeApi.obtenerFichaAdmision(id);
      this.ficha = ficha;
      this.filasFicha = Object.entries(ficha).map(([clave, valor]) => {
        let strValor = '';
        if (valor !== null && valor !== undefined) {
          if (typeof valor === 'string') strValor = valor;
          else if (typeof valor === 'number' || typeof valor === 'boolean')
            strValor = String(valor);
          else if (typeof valor === 'object') strValor = JSON.stringify(valor);
        }
        return { clave, valor: strValor };
      });
    } catch (error: unknown) {
      this.errorFicha =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo obtener la ficha de admisión.';
    } finally {
      this.cargandoFicha = false;
      this.cdr.detectChanges();
    }
  }

  cerrarFicha() {
    this.modalFicha = false;
    this.ficha = null;
  }

  abrirModalRegistro() {
    this.modalRegistro = true;
  }

  cerrarModalRegistro() {
    this.modalRegistro = false;
  }

  onPacienteRegistrado() {
    this.modalRegistro = false;
    this.mensajeExito = 'Paciente registrado en la bandeja de triaje.';
    setTimeout(() => (this.mensajeExito = ''), 5000);
    this.cargarLista();
  }

  sanitizar(texto: string): string {
    return texto.replace(/[\p{Cc}\u200B-\u200F\uFEFF]/gu, '').trim();
  }

  abrirEvaluacion(paciente: IFilaBackend) {
    const ev = (paciente.evaluacion ?? undefined) as
      | Record<string, unknown>
      | undefined;
    const texto = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return JSON.stringify(v);
    };
    this.pacienteEvaluar = paciente;
    this.formEvaluacion = ev
      ? {
          motivo: texto(ev.motivo),
          presionArterial: texto(ev.pa ?? ev.presionArterial),
          frecCardiaca: texto(ev.fc ?? ev.frecCardiaca),
          frecRespiratoria: texto(ev.fr ?? ev.frecRespiratoria),
          temperatura: texto(ev.temp ?? ev.temperatura),
          saturacion: texto(ev.spo2 ?? ev.saturacion),
          fiO2: texto(ev.fiO2),
          peso: texto(ev.peso),
          talla: texto(ev.talla),
          escalaDolor: texto(ev.escalaDolor),
          escalaGlasgow: texto(ev.escalaGlasgow),
          tiempoEvolucionCantidad: texto(ev.tiempoEvolucionCantidad),
          tiempoEvolucionCantidadUnidad: texto(
            ev.tiempoEvolucionCantidadUnidad,
          ),
          idServicio: texto(ev.idServicio),
          idTipoPrioridad: texto(ev.idTipoPrioridad),
        }
      : formEvaluacionVacio();
    this.errorEvaluacion = '';
  }

  cerrarEvaluacion() {
    this.pacienteEvaluar = null;
  }

  async guardarEvaluacion() {
    const f = this.formEvaluacion;
    const idTriaje = Number(
      campo(this.pacienteEvaluar, ['IdTriaje', 'idTriaje', 'IDTriaje']),
    );
    if (!idTriaje) {
      this.errorEvaluacion = 'El registro no tiene un id de triaje válido.';
      return;
    }
    const motivo = this.sanitizar(f.motivo);
    const presionArterial = this.sanitizar(f.presionArterial);
    if (
      !motivo ||
      !presionArterial ||
      !f.frecCardiaca.trim() ||
      !f.frecRespiratoria.trim() ||
      !f.temperatura.trim() ||
      !f.saturacion.trim()
    ) {
      this.errorEvaluacion =
        'Complete el motivo de consulta y todos los signos vitales.';
      return;
    }
    if (!/^\d{2,3}\/\d{2,3}$/.test(presionArterial)) {
      this.errorEvaluacion =
        'La presión arterial debe tener el formato 120/80.';
      return;
    }
    this.guardandoEvaluacion = true;
    this.errorEvaluacion = '';
    const payload = this.construirPayloadEvaluacion(
      idTriaje,
      f,
      motivo,
      presionArterial,
    );

    try {
      await this.triajeApi.registrar(payload);
      this.pacienteEvaluar = null;
      this.mensajeExito = 'Evaluación de triaje guardada.';
      setTimeout(() => (this.mensajeExito = ''), 5000);
      this.cargarLista();
    } catch (error: unknown) {
      this.errorEvaluacion =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo guardar la evaluación.';
    } finally {
      this.guardandoEvaluacion = false;
      this.cdr.detectChanges();
    }
  }

  private asignarValoresNumericos(
    payload: Record<string, unknown>,
    f: FormEvaluacion,
  ) {
    const parse = (v: string) => Number(v.replace(',', '.'));
    const set = (key: string, v: string, minVal?: number) => {
      const num = parse(v);
      if (!Number.isNaN(num) && (minVal === undefined || num > minVal))
        payload[key] = num;
    };

    set('frecCardiaca', f.frecCardiaca);
    set('frecRespiratoria', f.frecRespiratoria);
    set('temperatura', f.temperatura);
    set('saturacion', f.saturacion);
    set('peso', f.peso, 0);
    set('talla', f.talla, 0);
    set('fiO2', f.fiO2);
    set('escalaDolor', f.escalaDolor);
    set('escalaGlasgow', f.escalaGlasgow);
    set('tiempoEvolucionCantidad', f.tiempoEvolucionCantidad);
    set('idServicio', f.idServicio);
    set('idTipoPrioridad', f.idTipoPrioridad);
  }

  private construirPayloadEvaluacion(
    idTriaje: number,
    f: FormEvaluacion,
    motivo: string,
    presionArterial: string,
  ): RegistroTriajePayload {
    const payload: RegistroTriajePayload = {
      idTriaje,
      motivo,
      presionArterial,
    };

    this.asignarValoresNumericos(
      payload as unknown as Record<string, unknown>,
      f,
    );

    if (payload.peso && payload.talla) {
      const imc = payload.peso / (payload.talla / 100) ** 2;
      payload.imc = Math.round(imc * 100) / 100;
    }

    if (f.tiempoEvolucionCantidadUnidad) {
      payload.tiempoEvolucionCantidadUnidad = f.tiempoEvolucionCantidadUnidad;
    }

    return payload;
  }

  campo(item: IFilaBackend, claves: string[]): string {
    return campo(item, claves);
  }

  idTriaje(item: IFilaBackend): number {
    return Number(campo(item, ['IdTriaje', 'idTriaje', 'IDTriaje'])) || 0;
  }

  documento(item: IFilaBackend): string {
    return campo(item, [
      'NroDocumento',
      'nroDocumento',
      'Documento',
      'documento',
    ]);
  }

  tipoDocumento(item: IFilaBackend): string {
    return campo(item, [
      'TipoDocumento',
      'tipoDocumento',
      'DescripcionTipoDocumento',
      'DescripcionDoc',
    ]);
  }

  nombrePaciente(item: IFilaBackend): string {
    const completo = campo(item, [
      'NombreCompleto',
      'nombreCompleto',
      'Paciente',
      'paciente',
      'Nombre',
      'nombre',
    ]);
    if (completo) return completo;
    const partes = [
      campo(item, ['ApellidoPaterno', 'apellidoPaterno', 'Paterno', 'paterno']),
      campo(item, ['ApellidoMaterno', 'apellidoMaterno', 'Materno', 'materno']),
      campo(item, [
        'PrimerNombre',
        'primerNombre',
        'PrimerNmobre',
        'Nombres',
        'nombres',
      ]),
      campo(item, ['SegundoNombre', 'segundoNombre']),
    ].filter(Boolean);
    return partes.join(' ') || '—';
  }

  sexo(item: IFilaBackend): string {
    return (
      campo(item, [
        'Sexo',
        'sexo',
        'TipoSexo',
        'tipoSexo',
        'IdTipoSexo',
        'idTipoSexo',
        'SexTypeID',
        'sexTypeId',
        'Genero',
        'genero',
        'IdGenero',
        'idGenero',
        'Sex',
        'sex',
        'SEXO',
        'GENERO',
      ])?.toString() || ''
    );
  }

  hora(item: IFilaBackend): string {
    let raw = campo(item, [
      'FechaTriaje',
      'fechaTriaje',
      'FechaRegistro',
      'fechaRegistro',
      'fecha_registro',
      'FechaIngreso',
      'fechaIngreso',
      'Fecha',
      'fecha',
      'HoraRegistro',
    ]);
    if (!raw) return '—';
    if (raw.endsWith('Z')) raw = raw.slice(0, -1);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  prioridad(item: IFilaBackend): string {
    return campo(item, [
      'Prioridad',
      'prioridad',
      'TipoPrioridad',
      'tipoPrioridad',
      'DescripcionPrioridad',
    ]);
  }

  estadoTriaje(item: IFilaBackend): string {
    const estado = campo(item, [
      'Estado',
      'estado',
      'IdEstado',
      'idEstado',
      'NombreEstado',
    ]);
    const vitals = campo(item, ['PresionArterial', 'presionArterial', 'PA']);
    return estado || vitals ? 'triado' : 'sin-triaje';
  }

  tiempoEspera(item: IFilaBackend): string {
    let raw = campo(item, [
      'FechaTriaje',
      'fechaTriaje',
      'FechaRegistro',
      'fechaRegistro',
      'fecha_registro',
      'FechaIngreso',
      'fechaIngreso',
      'Fecha',
      'fecha',
      'HoraRegistro',
    ]);
    if (!raw) return '—';
    if (raw.endsWith('Z')) raw = raw.slice(0, -1);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return `${Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))} min`;
  }

  fechaRegistro(item: IFilaBackend): string {
    let raw = campo(item, [
      'FechaTriaje',
      'fechaTriaje',
      'FechaRegistro',
      'fechaRegistro',
      'fecha_registro',
      'FechaIngreso',
      'fechaIngreso',
    ]);
    if (!raw) return '—';
    if (raw.endsWith('Z')) raw = raw.slice(0, -1);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
}
