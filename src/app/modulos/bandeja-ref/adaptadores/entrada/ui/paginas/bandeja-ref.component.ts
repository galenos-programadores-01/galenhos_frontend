import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiRequestError } from '../../../../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../../compartido/componentes/tabla/tabla.component';
import type { IFilaBackend } from '../../../../../../compartido/tipos/api-tipos';
import {
  BuscadorRangoFechas,
  type CriteriosBusqueda,
} from '../../../../../../compartido/ui/buscador-rango-fechas/buscador-rango-fechas';
import { FiltrosGlobal } from '../../../../../../compartido/ui/filtros-global/filtros-global';
import { VentanaModal } from '../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { AuthService } from '../../../../../../modulos/auth/aplicacion/auth.service';
import {
  BandejaRefApiService,
  type BandejaReferenciaParams,
  type EspecialidadMinsa,
  type EstablecimientoBusqueda,
  type RespuestaSaveReferencia,
  type SaveCpt,
  type SaveDiagnostico,
  type SaveReferenciaPayload,
  type SaveTratamiento,
  type UpsMinsa,
} from '../../../salida/http/bandeja-ref.api.service';

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

@Component({
  selector: 'app-bandeja-ref',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BuscadorRangoFechas,
    FiltrosGlobal,
    TablaComponent,
    ColumnaTemplateDirective,
    VentanaModal,
  ],
  templateUrl: './bandeja-ref.component.html',
})
export class BandejaRefComponent {
  private readonly apiService = inject(BandejaRefApiService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  referencias: IFilaBackend[] = [];
  cargando = false;
  error = '';
  buscado = false;
  modalAbierto = false;
  datosReferencia: IFilaBackend | null = null;
  referenciaCab: IFilaBackend | null = null;
  diagnosticosDetalle: IFilaBackend[] = [];
  tratamientos: IFilaBackend[] = [];
  cpts: IFilaBackend[] = [];
  cargandoDetalle = false;
  idAtencionModal = '';
  enviando = false;
  errorEnvio = '';
  exitoEnvio = '';

  columnasTabla: readonly ColumnaTabla[] = [
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'docCustom', cabecera: 'Doc' },
    { campo: 'cuentaCustom', cabecera: 'Cuenta' },
    { campo: 'fechaCustom', cabecera: 'Fecha' },
    { campo: 'servicioCustom', cabecera: 'Servicio' },
    { campo: 'establecimientoCustom', cabecera: 'Establecimiento' },
    { campo: 'medicoCustom', cabecera: 'Medico' },
    { campo: 'estadoCustom', cabecera: 'Estado' },
    { campo: 'accionesCustom', cabecera: 'Acciones' },
  ];

  async buscar(criterios: CriteriosBusqueda): Promise<void> {
    this.error = '';
    if (!criterios.fechaDesde || !criterios.fechaHasta) {
      this.error = 'Debe indicar la fecha de inicio y la fecha de fin.';
      this.buscado = false;
      this.referencias = [];
      this.cdr.detectChanges();
      return;
    }

    const params: BandejaReferenciaParams = {
      fini: criterios.fechaDesde,
      ffin: criterios.fechaHasta,
      filtro: criterios.filtro,
    };

    this.cargando = true;
    this.buscado = true;
    try {
      const items = await this.apiService.listarReferencias(params);
      this.referencias = Array.isArray(items) ? items : [];
      if (this.referencias.length === 0) {
        this.error = 'No se encontraron referencias en el rango indicado.';
      }
    } catch (error: unknown) {
      this.referencias = [];
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo consultar la bandeja de referencias.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async enviarReferencia(item: IFilaBackend): Promise<void> {
    const idAtencion = Number(
      campo(item, ['idatencion', 'IdAtencion', 'idAtencion']),
    );
    const idCuentaAtencion = Number(
      campo(item, ['idcuentaatencion', 'IdCuentaAtencion', 'Cuenta']),
    );
    if (!idAtencion && !idCuentaAtencion) return;

    this.idAtencionModal = String(idAtencion || idCuentaAtencion);
    this.datosReferencia = null;
    this.referenciaCab = null;
    this.diagnosticosDetalle = [];
    this.tratamientos = [];
    this.cpts = [];
    this.modalAbierto = true;
    this.cargandoDetalle = true;
    this.cdr.detectChanges();

    try {
      const llamadas: Promise<void>[] = [this.cargarEspecialidades()];
      if (idAtencion) {
        llamadas.push(
          this.apiService.obtenerDatosReferencia(idAtencion).then((datos) => {
            this.datosReferencia = datos;
          }),
        );
      }
      if (idCuentaAtencion) {
        llamadas.push(
          this.apiService
            .obtenerCabeceraReferencia(idCuentaAtencion)
            .then((cab) => {
              this.referenciaCab = cab;
            }),
          this.cargarDetalleFichas(idCuentaAtencion),
        );
      }
      await Promise.all(llamadas);
      await this.precargarEstablecimiento(
        campo(this.datosReferencia, ['Nombre', 'nombre']),
      );
      this.preseleccionarEspecialidad();
    } catch (error: unknown) {
      this.datosReferencia = null;
      this.referenciaCab = null;
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudieron consultar los datos de la referencia.';
    } finally {
      this.cargandoDetalle = false;
      this.cdr.detectChanges();
    }
  }

  private async cargarDetalleFichas(idCuentaAtencion: number): Promise<void> {
    const [detalle, tratamiento, cpt] = await Promise.all([
      this.apiService.listarDiagnosticosReferencia(idCuentaAtencion),
      this.apiService.listarTratamientoReferencia(idCuentaAtencion),
      this.apiService.listarCptReferencia(idCuentaAtencion),
    ]);
    this.diagnosticosDetalle = Array.isArray(detalle) ? detalle : [];
    this.tratamientos = Array.isArray(tratamiento) ? tratamiento : [];
    this.cpts = Array.isArray(cpt) ? cpt : [];
  }

  private async precargarEstablecimiento(nombre: string): Promise<void> {
    this.buscarEstablecimiento = nombre;
    this.establecimientoSeleccionado = null;
    this.establecimientosSugeridos = [];
    this.listaServicios = [];
    this.servicioSeleccionado = '';
    this.errorServicios = '';
    if (!nombre) return;

    this.buscandoEstablecimiento = true;
    this.cdr.detectChanges();
    try {
      const resultado =
        (await this.apiService.buscarEstablecimientos(nombre)) ?? [];
      const coincidencia = resultado.find(
        (est) => est.nombre.toLowerCase() === nombre.toLowerCase(),
      );
      this.establecimientoSeleccionado = coincidencia ?? null;
    } catch {
      this.establecimientoSeleccionado = null;
    } finally {
      this.buscandoEstablecimiento = false;
    }
    if (!this.establecimientoSeleccionado) {
      this.establecimientoSeleccionado = {
        idEstablecimiento: 0,
        codigo: '',
        nombre,
        distrito: '',
        provincia: '',
        departamento: '',
        nombreLargo: nombre,
      };
    }
    if (this.establecimientoSeleccionado.codigo) {
      await this.cargarServicios(this.establecimientoSeleccionado.codigo, true);
    }
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.datosReferencia = null;
    this.referenciaCab = null;
    this.diagnosticosDetalle = [];
    this.tratamientos = [];
    this.cpts = [];
    this.cargandoDetalle = false;
    this.buscarEstablecimiento = '';
    this.establecimientosSugeridos = [];
    this.buscandoEstablecimiento = false;
    this.establecimientoSeleccionado = null;
    this.listaServicios = [];
    this.servicioSeleccionado = '';
    this.cargandoServicios = false;
    this.errorServicios = '';
    this.especialidades = [];
    this.especialidadSeleccionada = '';
    this.cargandoEspecialidades = false;
    this.errorEspecialidades = '';
    this.enviando = false;
    this.errorEnvio = '';
    this.exitoEnvio = '';
  }

  buscarEstablecimiento = '';
  establecimientosSugeridos: EstablecimientoBusqueda[] = [];
  buscandoEstablecimiento = false;
  establecimientoSeleccionado: EstablecimientoBusqueda | null = null;

  async onBuscarEstablecimiento(): Promise<void> {
    const termino = this.buscarEstablecimiento.trim();
    if (!termino) {
      this.establecimientosSugeridos = [];
      return;
    }
    this.buscandoEstablecimiento = true;
    this.cdr.detectChanges();
    try {
      this.establecimientosSugeridos =
        (await this.apiService.buscarEstablecimientos(termino)) ?? [];
    } catch {
      this.establecimientosSugeridos = [];
    } finally {
      this.buscandoEstablecimiento = false;
      this.cdr.detectChanges();
    }
  }

  seleccionarEstablecimiento(est: EstablecimientoBusqueda): void {
    this.establecimientoSeleccionado = est;
    this.buscarEstablecimiento = est.nombre;
    this.establecimientosSugeridos = [];
    this.cargarServicios(est.codigo);
  }

  listaServicios: UpsMinsa[] = [];
  servicioSeleccionado = '';
  cargandoServicios = false;
  errorServicios = '';

  private async cargarServicios(
    codigoRenipress: string,
    preseleccionar = false,
  ): Promise<void> {
    this.listaServicios = [];
    this.servicioSeleccionado = '';
    this.errorServicios = '';
    if (!codigoRenipress) return;

    this.cargandoServicios = true;
    this.cdr.detectChanges();
    try {
      const respuesta =
        (await this.apiService.listarUpssMinsa(codigoRenipress)) ?? null;
      this.listaServicios = respuesta?.datos ?? [];
      if (preseleccionar) {
        this.preseleccionarServicio();
      }
      if (this.listaServicios.length === 0) {
        this.errorServicios =
          'El establecimiento no tiene servicios registrados.';
      }
    } catch (error: unknown) {
      this.listaServicios = [];
      this.errorServicios =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudieron consultar los servicios del establecimiento.';
    } finally {
      this.cargandoServicios = false;
      this.cdr.detectChanges();
    }
  }

  private preseleccionarServicio(): void {
    const codigo = campo(this.referenciaCab, ['idupsdestino', 'UPS_Destino'])
      .trim()
      .replace(/^0+/, '');
    if (codigo) {
      const porCodigo = this.listaServicios.find(
        (ups) => ups.codUps === codigo,
      );
      if (porCodigo) {
        this.servicioSeleccionado = porCodigo.codUps;
        return;
      }
    }
    const descripcion = campo(this.datosReferencia, [
      'UPS_DestinoDescripcion',
      'ups_destinodescripcion',
    ]).trim();
    if (!descripcion) return;
    const norm = descripcion.toLowerCase();
    const porDescripcion = this.listaServicios.find(
      (ups) => ups.descripcion.toLowerCase() === norm,
    );
    if (porDescripcion) {
      this.servicioSeleccionado = porDescripcion.codUps;
    }
  }

  especialidades: EspecialidadMinsa[] = [];
  especialidadSeleccionada = '';
  cargandoEspecialidades = false;
  errorEspecialidades = '';

  async cargarEspecialidades(): Promise<void> {
    this.especialidades = [];
    this.especialidadSeleccionada = '';
    this.errorEspecialidades = '';
    this.cargandoEspecialidades = true;
    this.cdr.detectChanges();
    try {
      const respuesta =
        (await this.apiService.listarEspecialidadesMinsa()) ?? null;
      this.especialidades = respuesta?.data ?? [];
      this.preseleccionarEspecialidad();
    } catch (error: unknown) {
      this.especialidades = [];
      this.errorEspecialidades =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudieron consultar las especialidades.';
    } finally {
      this.cargandoEspecialidades = false;
      this.cdr.detectChanges();
    }
  }

  private preseleccionarEspecialidad(): void {
    const codigo = campo(this.referenciaCab, [
      'codEspecialidad',
      'CodEspecialidad',
    ]).trim();
    if (codigo) {
      const porCodigo = this.especialidades.find(
        (e) => e.codigo_especialidad === codigo,
      );
      if (porCodigo) {
        this.especialidadSeleccionada = porCodigo.codigo_especialidad;
        return;
      }
    }
    const descripcion = campo(this.datosReferencia, [
      'DestinoDescripcionEspecialidad',
      'destinodescripcionespecialidad',
    ]).trim();
    if (!descripcion) return;
    const norm = descripcion.toLowerCase();
    const porDescripcion = this.especialidades.find(
      (e) => e.especialidad.toLowerCase() === norm,
    );
    if (porDescripcion) {
      this.especialidadSeleccionada = porDescripcion.codigo_especialidad;
    }
  }

  cerrarSugerencias(): void {
    setTimeout(() => {
      this.establecimientosSugeridos = [];
    }, 150);
  }

  async enviarAhora(): Promise<void> {
    if (!this.establecimientoSeleccionado?.codigo) {
      this.errorEnvio = 'Seleccione un establecimiento de destino.';
      return;
    }
    if (!this.servicioSeleccionado) {
      this.errorEnvio = 'Seleccione un servicio (UPS) de destino.';
      return;
    }
    if (!this.especialidadSeleccionada) {
      this.errorEnvio = 'Seleccione una especialidad.';
      return;
    }

    this.errorEnvio = '';
    this.exitoEnvio = '';
    this.enviando = true;
    this.cdr.detectChanges();
    try {
      const respuesta = await this.apiService.enviarReferenciaMinsa(
        this.construirPayloadEnvio(),
      );
      const descEstado = this.mensajeEstadoEnvio(respuesta);
      if (respuesta.codigo && respuesta.codigo !== '0000') {
        this.errorEnvio =
          descEstado ||
          respuesta.mensaje ||
          `El servicio del MINSA respondió con el código ${respuesta.codigo}.`;
      } else {
        this.exitoEnvio =
          descEstado ||
          respuesta.mensaje ||
          'Referencia enviada correctamente.';
      }
    } catch (error: unknown) {
      this.errorEnvio =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo enviar la referencia.';
    } finally {
      this.enviando = false;
      this.cdr.detectChanges();
    }
  }

  private mensajeEstadoEnvio(respuesta: RespuestaSaveReferencia): string {
    if (!respuesta.datos || typeof respuesta.datos !== 'object') return '';
    const datos = respuesta.datos as Record<string, unknown>;
    const desc = datos['desc estado'];
    if (typeof desc === 'string' && desc.trim()) return desc.trim();
    const fg = datos.fg_estado;
    if (fg === '1') return 'Referencia registrada.';
    if (fg === '0') return 'La referencia fue rechazada.';
    return '';
  }

  private construirPayloadEnvio(): SaveReferenciaPayload {
    const cab = this.referenciaCab;
    const leer = (claves: string[], fallback = ''): string =>
      campo(cab, claves) || fallback;
    const numdoc = (valor: string): string => valor.trim();
    const celular9 = (valor: string): string =>
      valor.length === 9 && valor.startsWith('9') ? valor : '';
    const sinBarra = (valor: string): string => valor.replace(/\//g, '');
    const rellenar = (valor: string): string => valor.padEnd(40, '.');
    const perfil = this.authService.userProfile();

    const cpt: SaveCpt = { cpt_1: '', cpt_2: '', cpt_3: '' };
    this.cpts.slice(0, 3).forEach((item, idx) => {
      const valor = String(item.cpt ?? '');
      if (idx === 0) cpt.cpt_1 = valor;
      else if (idx === 1) cpt.cpt_2 = valor;
      else cpt.cpt_3 = valor;
    });

    const diagnostico: SaveDiagnostico[] = this.diagnosticosDetalle.length
      ? this.diagnosticosDetalle.map((d) => ({
          diagnostico: String(d.diagnostico ?? ''),
          nro_diagnostico: String(d.nro_diagnostico ?? ''),
          tipo_diagnostico: String(d.tipo_diagnostico ?? ''),
        }))
      : [{ diagnostico: '', nro_diagnostico: '', tipo_diagnostico: '' }];

    const tratamiento: SaveTratamiento[] = this.tratamientos.length
      ? this.tratamientos.map((t) => ({
          cantidad: String(t.Cantidad ?? ''),
          codigo_medicamento: String(t.codigo_medicamento ?? ''),
          frecuencia: String(t.frecuencia ?? ''),
          nro_diagnostico: String(t.nro_diagnostico ?? ''),
          nro_tratamiento: String(t.nro_tratamiento ?? ''),
          periodo: String(t.periodo ?? ''),
          unidad_tiempo: String(t.unidad_tiempo ?? ''),
        }))
      : [
          {
            cantidad: '',
            codigo_medicamento: '',
            frecuencia: '',
            nro_diagnostico: '',
            nro_tratamiento: '',
            periodo: '',
            unidad_tiempo: '',
          },
        ];

    return {
      cita: {
        fecha_vencimiento_sis: leer(['fecha_vencimiento_sis']),
        frecuencia_cardiaca: leer(['frecuencia_cardiaca']),
        frecuencia_respiratoria: leer(['frecuencia_respiratoria']),
        id_financiador: leer(['id_financiador']),
        num_afil: leer(['num_afil']),
        peso: leer(['Peso', 'peso']),
        presion_arterial_diastolica: sinBarra(
          leer(['presion_arterial_diastolica']),
        ),
        presion_arterial_sistolica: sinBarra(
          leer(['presion_arterial_sistolica']),
        ),
        resumeanamnesis: rellenar(leer(['resumeanamnesis'])),
        resumeexfisico: rellenar(leer(['resumeexfisico'])),
        talla: leer(['Talla', 'talla']),
        temperatura: leer(['Temperatura', 'temperatura']),
      },
      cpt,
      paciente: {
        apelmatpac: leer(['apelmatpac']),
        apelpatpac: leer(['apelpatpac']),
        celularpac: celular9(leer(['celularpac'])),
        correopac: '',
        direccion: leer(['direccion']),
        fechnacpac: leer(['fechnacpac']),
        idsexo: leer(['idsexo']),
        idtipodoc: leer(['idtipodoc']),
        nombpac: leer(['nombpac']),
        nrohis: leer(['nrohis']),
        numdoc: numdoc(leer(['numdoc'])),
        telefonopac: '',
        ubigeoactual: leer(['ubigeoactual']),
        ubigeoreniec: leer(['ubigeoreniec']),
      },
      datos_referencia: {
        codEspecialidad:
          this.especialidadSeleccionada || leer(['codEspecialidad']),
        condicion: leer(['condicion']),
        desc_Cartera_servicio: leer(['desc_Cartera_servicio']),
        fechaReferencia: leer(['fechaReferencia']),
        fgRegistro: leer(['fgRegistro'], '1'),
        horaReferencia: leer(['horaReferencia']),
        idCarteraServicio: leer(['idCarteraServicio']),
        idEnvio: leer(['idEnvio']),
        idTipoAtencion: leer(['idTipoAtencion']),
        idTipoTransporte: leer(['idTipoTransporte']),
        idestabDestino:
          this.establecimientoSeleccionado?.codigo || leer(['idestabDestino']),
        idestabOrigen: leer(['idestabOrigen']),
        idupsOrigen: leer(['idupsOrigen']),
        idupsdestino: this.servicioSeleccionado || leer(['idupsdestino']),
        motivo_referencia: {
          idmotivoref: leer(['idmotivoref']),
          obsmotivoref: leer(['obsmotivoref']),
        },
        notasobs: '',
      },
      diagnostico,
      persona_acompana: {
        apelmatacomp: '',
        apelpatacomp: '',
        fechanacacomp: '',
        idcolegioacomp: '',
        idprofesionacomp: '',
        idsexoacomp: '',
        idtipodocacmop: '',
        nombperacomp: '',
        numdocacomp: '',
      },
      persona_establecimiento: {
        apelmata: leer(['apelmatEst']),
        apelpata: leer(['apelpatEst']),
        fechanac: leer(['fechanacEst']),
        idcolegio: leer(['idcolegioEst']),
        idprofesion: leer(['idprofesionEst']),
        idsexo: leer(['idsexoEst']),
        idtipodoc: leer(['idtipodocEst']),
        nombper: leer(['nombperEst']),
        numdoc: numdoc(leer(['numdocEst'])),
      },
      personal_registra: {
        tipoDocumento: '1',
        nroDocumento: perfil?.dni ?? '',
        apellidoPaterno: perfil?.apellidoPaterno ?? '',
        apellidoMaterno: perfil?.apellidoMaterno ?? '',
        nombres: perfil?.nombres ?? '',
        fechaNacimiento: '',
        idcolegio: perfil?.colegiatura ?? '',
        idprofesion: perfil?.especialidad ?? '',
        sexo: '',
      },
      responsable_referencia: {
        apelmatrefiere: leer(['apelmatrefiere']),
        apelpatrefiere: leer(['apelpatrefiere']),
        fechanacrefiere: leer(['fechanacrefiere']),
        idcolegioref: leer(['idcolegioref']),
        idprofesionref: leer(['idprofesionref']),
        idsexorefiere: leer(['idsexorefiere']),
        idtipodocref: leer(['idtipodocref']),
        nombperrefiere: leer(['nombperrefiere']),
        numdocref: numdoc(leer(['numdocref'])),
      },
      tratamiento,
    };
  }

  texto(item: IFilaBackend, claves: string[]): string {
    return campo(item, claves);
  }

  fechaTexto(item: IFilaBackend, claves: string[]): string {
    const valor = campo(item, claves);
    if (!valor) return '—';
    const partes = valor.slice(0, 10).split('-');
    if (partes.length !== 3) return valor;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  estiloEstado(estado: string): string {
    const base =
      'padding:3px 10px;border-radius:8px;font-weight:700;font-size:12.5px;white-space:nowrap;';
    const estadoNormalizado = estado.toLowerCase();
    if (estadoNormalizado.includes('registrado'))
      return `${base}background:#eef2ff;color:#263c7a;`;
    if (estadoNormalizado.includes('admitido'))
      return `${base}background:#ecfdf5;color:#065f46;`;
    if (estadoNormalizado.includes('cancelado'))
      return `${base}background:#fef2f2;color:#991b1b;`;
    if (estadoNormalizado.includes('contrarref'))
      return `${base}background:#f5f3ff;color:#5b21b6;`;
    return `${base}background:#f1f5f9;color:#334155;`;
  }
}
