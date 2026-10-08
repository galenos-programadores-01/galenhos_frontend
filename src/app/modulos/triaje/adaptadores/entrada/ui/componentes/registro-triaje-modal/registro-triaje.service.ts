import { Injectable, inject } from '@angular/core';
import { MaestrosApiService } from '../../../../../../../compartido/api/maestros.api.service';
import { ApiRequestError } from '../../../../../../../compartido/api-client/api-client.service';
import type {
  ICatalogoDescripcion,
  ICatalogoNombre,
  IFilaBackend,
  RegistroPacientePayload,
} from '../../../../../../../compartido/tipos/api-tipos';
import { ReniecMapper } from '../../../../../../../compartido/utilidades/reniec.mapper';
import { AuthService } from '../../../../../../auth/aplicacion/auth.service';
import { PacientesApiService } from '../../../../../../pacientes/adaptadores/salida/http/pacientes.api.service';
import {
  leerCampoFiliacion,
  type SisAfiliado,
  SisApiService,
  type SisFiliacionRegistrada,
} from '../../../../../../sis/adaptadores/salida/http/sis.api.service';
import {
  type RegistroTriajePayload,
  TriajeApiService,
} from '../../../../salida/http/triaje.api.service';
import type { FormRegistroTriaje } from './registro-triaje.interfaces';

// Parámetros que habilitan/deshabilitan la integración con webservices
// externos: 'S' habilita la consulta, 'N' la deshabilita.
const PARAMETRO_SIS_ID = 322;
const PARAMETRO_RENIEC_ID = 296;

// Valor de la prioridad "Llegó Cadáver".
const PRIORIDAD_CADAVER = '5';

@Injectable()
export class RegistroTriajeService {
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly pacientesApi = inject(PacientesApiService);
  private readonly sisApi = inject(SisApiService);
  private readonly triajeApi = inject(TriajeApiService);
  private readonly reniecMapper = inject(ReniecMapper);
  private readonly authService = inject(AuthService);

  formulario: FormRegistroTriaje = this.crearFormularioVacio();

  buscando = false;
  guardando = false;
  pacienteEncontrado = false;
  // True cuando la busqueda no resolvio al paciente y los datos del bloque
  // "Datos del paciente" los tiene que ingresar el operador a mano.
  datosPacienteManuales = false;
  mensajeError = '';
  mensajeInfo = '';

  sisConsultado = false;
  sisActivo = false;
  sisDescripcion = '';
  sisGuardado = false;
  sisIntegrado = false;
  // Distingue "no hay afiliación" de "la afiliación existe pero está cancelada
  // por Fbaja pasada", porque el aviso al usuario es distinto en cada caso.
  sisCancelado = false;
  sisFechaBaja = '';
  reniecIntegrado = false;

  ultimoTriajeId: number | null = null;
  private serviciosSolicitud = 0;

  tiposDocumentos: ICatalogoDescripcion[] = [];
  tiposSexo: ICatalogoDescripcion[] = [];
  estadosCivil: ICatalogoDescripcion[] = [];
  departamentos: ICatalogoNombre[] = [];
  provincias: ICatalogoNombre[] = [];
  distritos: ICatalogoNombre[] = [];
  centrosPoblados: ICatalogoNombre[] = [];
  fuentesFinanciamiento: Record<string, unknown>[] = [];
  estadosLlegoPaciente: ICatalogoDescripcion[] = [];
  servicios: ICatalogoNombre[] = [];
  causasExternas: IFilaBackend[] = [];

  prioridades = [
    { value: '1', label: 'I. Emerg. o Gravedad', color: '#3b82f6' },
    { value: '2', label: 'II. Urgencia Mayor', color: '#22c55e' },
    { value: '3', label: 'III. Urgencia Menor', color: '#eab308' },
    // { value: '4', label: 'IV. Patología Aguda Común', color: '#f97316' },
    { value: PRIORIDAD_CADAVER, label: 'Llegó Cadáver', color: '#ef4444' },
  ];

  readonly prioridadCadaver = PRIORIDAD_CADAVER;

  unidadesTiempo = [
    { value: 'Años', label: 'Años' },
    { value: 'Meses', label: 'Meses' },
    { value: 'Semanas', label: 'Semanas' },
    { value: 'Días', label: 'Días' },
    { value: 'Horas', label: 'Horas' },
    { value: 'Minutos', label: 'Minutos' },
  ];

  pasoActual = 1;

  crearFormularioVacio(): FormRegistroTriaje {
    return {
      idDocIdentidad: '1',
      nroDocumento: '',
      idDocIdentidadPaciente: '1',
      nroDocumentoPaciente: '',
      afiliacionDisa: '035',
      afiliacionTipoFormato: 'E',
      afiliacionNroContrato: '',
      pacienteNn: false,
      apellidoPaterno: '',
      apellidoMaterno: '',
      primerNombre: '',
      segundoNombre: '',
      fechaNacimiento: '',
      idTipoSexo: '',
      idEstadoCivil: '',
      telefono: '',
      idDepartamentoDomicilio: '',
      idProvinciaDomicilio: '',
      idDistritoDomicilio: '',
      idCentroPobladoDomicilio: '',
      direccionDomicilio: '',
      esAccidenteTransito: false,
      idFuenteFinanciamiento: '',
      idEstadoLlego: '',
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
      idCausaExternaMorbilidad: '',
      fechaUltimaRegla: '',
      esGestante: false,
    };
  }

  async cargarCatalogosIniciales(): Promise<void> {
    // Cada catalogo se asigna por separado en lugar de con un Promise.all
    // conjunto: "fuentes-financiamiento" tarda decenas de segundos, y con
    // Promise.all ningun select tendria valores hasta que terminara el mas
    // lento (y si ese agotaba el timeout, el catch dejaba todos vacios).
    const [docs, sexos, civiles, deptos, financiamiento, llegos] =
      await Promise.allSettled([
        this.maestrosApi.getTiposDocumentos(),
        this.maestrosApi.getTiposSexo(),
        this.maestrosApi.getEstadosCivil(),
        this.maestrosApi.getDepartamentos(),
        this.maestrosApi.getFuentesFinanciamiento() as unknown as Promise<
          Record<string, unknown>[]
        >,
        this.maestrosApi.getEstadosLlegoPaciente(),
      ]);

    const fallidos: string[] = [];
    if (docs.status === 'fulfilled') this.tiposDocumentos = docs.value;
    else fallidos.push('tipos de documento');
    if (sexos.status === 'fulfilled') this.tiposSexo = sexos.value;
    else fallidos.push('tipos de sexo');
    if (civiles.status === 'fulfilled') this.estadosCivil = civiles.value;
    else fallidos.push('estados civiles');
    if (deptos.status === 'fulfilled') this.departamentos = deptos.value;
    else fallidos.push('departamentos');
    if (financiamiento.status === 'fulfilled')
      this.fuentesFinanciamiento = financiamiento.value;
    else fallidos.push('fuentes de financiamiento');
    if (llegos.status === 'fulfilled') this.estadosLlegoPaciente = llegos.value;
    else fallidos.push('estados de llegada del paciente');

    if (fallidos.length > 0) {
      this.mensajeError = `No se pudieron cargar estos catálogos: ${fallidos.join(', ')}.`;
    }
    await this.cargarCausasExternas();
  }

  async cargarCausasExternas(): Promise<void> {
    try {
      this.causasExternas =
        await this.triajeApi.listarCausasExternasMorbilidad();
    } catch {
      this.causasExternas = [];
    }
  }

  async cargarServiciosPorPrioridad(): Promise<void> {
    const prioridad = this.formulario.idTipoPrioridad;
    const fechaNac = this.formulario.fechaNacimiento;
    const solicitud = ++this.serviciosSolicitud;
    this.servicios = [];
    try {
      const lista = prioridad
        ? await this.maestrosApi.getServiciosPorPrioridad(prioridad, fechaNac)
        : await this.maestrosApi.getServicios(2);
      if (solicitud !== this.serviciosSolicitud) return;
      this.servicios = lista;
    } catch {
      if (solicitud === this.serviciosSolicitud) {
        this.mensajeError = 'Error al cargar los servicios del triaje.';
      }
    }
  }

  avanzarPaso(): void {
    if (this.pasoActual === 1) this.pasoActual = 2;
    else if (this.pasoActual === 2) this.pasoActual = 3;
  }

  retrocederPaso(): void {
    if (this.pasoActual === 3) this.pasoActual = 2;
    else if (this.pasoActual === 2) this.pasoActual = 1;
  }

  limpiarEstado(): void {
    this.pasoActual = 1;
    this.formulario = this.crearFormularioVacio();
    this.pacienteEncontrado = false;
    this.buscando = false;
    this.guardando = false;
    this.mensajeError = '';
    this.mensajeInfo = '';
    this.sisConsultado = false;
    this.sisActivo = false;
    this.sisDescripcion = '';
    this.sisGuardado = false;
    this.sisCancelado = false;
    this.sisFechaBaja = '';
    this.sisIntegrado = false;
    this.reniecIntegrado = false;
    this.ultimoTriajeId = null;
    this.servicios = [];
  }

  // Copia el tipo y numero de documento de la barra de busqueda al bloque
  // "Datos del paciente". La identificacion que se graba en el triaje es la
  // de ese bloque, no la del buscador, para que el operador pueda corregir
  // la identificacion del paciente sin volver a disparar la busqueda.
  //
  // Con busqueda por afiliacion NO se copia nada: el 99 del select es la
  // opcion de buscar por afiliacion y no un tipo de documento, y el numero
  // esta vacio. Los campos se limpian para que el operador los ingrese.
  sincronizarDocumentoPaciente(): void {
    if (this.esFiliacion) {
      this.formulario.idDocIdentidadPaciente = '';
      this.formulario.nroDocumentoPaciente = '';
      return;
    }
    this.formulario.idDocIdentidadPaciente =
      this.formulario.idDocIdentidad ?? '';
    this.formulario.nroDocumentoPaciente = this.formulario.nroDocumento ?? '';
  }

  async buscarPaciente(): Promise<void> {
    this.datosPacienteManuales = false;

    if (this.formulario.pacienteNn) {
      this.habilitarModoNN();
      return;
    }

    if (this.esFiliacion) {
      await this.buscarPorAfiliacion();
      return;
    }

    if (!this.formulario.nroDocumento) {
      this.mensajeError = 'Ingrese un número de documento';
      return;
    }

    this.formulario.nroDocumento = this.formulario.nroDocumento.trim();

    if (
      this.formulario.idDocIdentidad === '1' &&
      this.formulario.nroDocumento.length !== 8
    ) {
      this.mensajeError = 'DNI incorrecto, debe tener 8 dígitos.';
      return;
    }
    this.buscando = true;
    this.mensajeError = '';
    this.mensajeInfo = '';
    this.pacienteEncontrado = false;
    this.sisConsultado = false;
    this.sisActivo = false;
    this.sisCancelado = false;
    this.sisFechaBaja = '';
    // Se limpia el IAFA de la búsqueda anterior: si el paciente nuevo tiene la
    // afiliación cancelada (Fbaja pasada), el combo no debe seguir mostrando el
    // SIS que quedó del paciente previo.
    this.formulario.idFuenteFinanciamiento = '';

    try {
      await this.cargarParametrosIntegracion();

      // El tipo SD (Sin Documento, valor 0) solo se busca en la base de
      // datos local; no se consulta RENIEC ni SIS.
      const esSinDocumento = this.esTipoDocumentoSinDocumento;

      const paciente = await this.buscarEnBaseDatosLocal();

      if (!paciente) {
        // SD solo se busca en la base de datos; RENIEC además únicamente
        // soporta DNI.
        const reniecOk = esSinDocumento ? false : await this.consultarReniec();
        if (reniecOk) {
          this.pacienteEncontrado = true;
          this.pasoActual = 2;
        }
      } else {
        this.mapearPacienteLocal(paciente as Record<string, unknown>);
        this.pacienteEncontrado = true;
        this.pasoActual = 2;
      }

      if (!esSinDocumento && this.sisIntegrado) {
        await this.consultarSis();
      } else if (!esSinDocumento && !this.sisIntegrado) {
        // Con la integración SIS desactivada (parámetro 322 en 'N') no se puede
        // consultar al SIS por SOAP, pero la afiliación ya registrada en la base
        // de datos local sigue siendo válida como fuente de la cobertura.
        await this.consultarFiliacionLocal();
      }

      // Si el paciente no se encontró en BD, RENIEC ni SIS, se habilitan
      // los textbox para que el usuario ingrese los datos manualmente.
      if (!this.pacienteEncontrado) {
        this.pacienteEncontrado = true;
        this.datosPacienteManuales = true;
        this.pasoActual = 2;
        // Con tipo de documento SD (sin documento) la IAFA por defecto es
        // PARTICULAR.
        if (esSinDocumento) {
          this.fijarFuenteParticular();
        }
        this.mensajeInfo =
          'El paciente no fue encontrado. Ingrese los datos manualmente.';
      }
    } catch (error: unknown) {
      this.mensajeError =
        error instanceof ApiRequestError
          ? error.message
          : 'Error inesperado al buscar paciente.';
    } finally {
      this.buscando = false;
    }
  }

  // Busca por afiliación SIS (intOpcion=2): requiere DISA, tipo de formato y
  // número de contrato, sin número de documento.
  private async buscarPorAfiliacion(): Promise<void> {
    const disa = this.formulario.afiliacionDisa.trim();
    const tipoFormato = this.formulario.afiliacionTipoFormato.trim();
    const nroContrato = this.formulario.afiliacionNroContrato.trim();

    if (!disa || !tipoFormato || !nroContrato) {
      this.mensajeError =
        'Ingrese DISA, tipo de formato y número de contrato de la afiliación.';
      return;
    }

    this.formulario.nroDocumento = '';
    this.buscando = true;
    this.mensajeError = '';
    this.pacienteEncontrado = false;
    this.sisConsultado = false;
    this.sisActivo = false;

    try {
      await this.cargarParametrosIntegracion();

      if (this.sisIntegrado) {
        this.formulario.afiliacionDisa = disa;
        this.formulario.afiliacionTipoFormato = tipoFormato;
        this.formulario.afiliacionNroContrato = nroContrato;
        await this.consultarSis();
      }

      if (!this.pacienteEncontrado && !this.mensajeError) {
        this.mensajeError =
          'No se encontró la afiliación en SIS. Complete los datos manualmente o active el modo Paciente NN.';
      }
    } catch (error: unknown) {
      this.mensajeError =
        error instanceof ApiRequestError
          ? error.message
          : 'Error inesperado al buscar la afiliación.';
    } finally {
      this.buscando = false;
    }
  }

  // Consulta los parámetros que activan las integraciones con SIS y RENIEC.
  // valorTexto === 'S' habilita la integración; cualquier otro valor la apaga.
  // Ante un error del endpoint se asume integración desactivada (fail-closed).
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
    }
  }

  // Detecta el idError 6 de SIS ("USUARIO FUERA DEL LIMITE DE CONSULTAS POR
  // DIA"). Se compara por idError y, como red de seguridad, por el texto del
  // resultado, porque el SISReport a veces devuelve el mensaje sin el id.
  private esLimiteConsultasSis(sis: SisAfiliado | undefined): boolean {
    if (!sis) return false;
    if (String(sis.idError ?? '').trim() === '6') return true;
    return (sis.resultado || '').toUpperCase().includes('LIMITE DE CONSULTAS');
  }

  // Deja la integración SIS desactivada en memoria para el resto de la sesión
  // del modal: si no, el siguiente buscarPaciente() volvería a activarla desde
  // el parámetro 322 que todavía no refleja el cambio.
  private async desactivarIntegracionSis(): Promise<void> {
    this.sisIntegrado = false;
    try {
      await this.maestrosApi.desactivarParametro(PARAMETRO_SIS_ID);
    } catch {
      // Si el PATCH falla, el estado local ya quedó en false, así que el
      // flujo continúa sin integración SIS. El backend se sincronizará en el
      // siguiente arranque cuando se vuelva a leer el parámetro.
    }
  }

  private parametroEsS(param: IFilaBackend | IFilaBackend[]): boolean {
    const fila = Array.isArray(param) ? param[0] : param;
    const claves: (keyof IFilaBackend)[] = [
      'valorTexto',
      'ValorTexto',
      'VALORTEXTO',
    ];
    for (const clave of claves) {
      const valor = fila?.[clave];
      if (valor !== undefined && valor !== null) {
        return String(valor).trim().toUpperCase() === 'S';
      }
    }
    return false;
  }

  private habilitarModoNN(): void {
    this.pacienteEncontrado = true;
    this.pasoActual = 2;
    this.formulario.apellidoPaterno = 'NN';
    this.formulario.apellidoMaterno = 'NN';
    this.formulario.primerNombre = 'NN';
  }

  private async buscarEnBaseDatosLocal(): Promise<unknown> {
    try {
      return await this.pacientesApi.porDocumento(
        this.formulario.nroDocumento,
        this.formulario.idDocIdentidad,
      );
    } catch (error: unknown) {
      // No se hace fallback a /pacientes/buscar: si no existe un paciente
      // con ese tipo y número de documento, se pasa a RENIEC y luego SIS.
      if (error instanceof ApiRequestError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async consultarReniec(): Promise<boolean> {
    if (!this.reniecIntegrado) return false;

    // RENIEC solo consulta DNI (idDocIdentidad = 1).
    const tipoDoc =
      this.formulario.idDocIdentidad || this.formulario.idDocIdentidadPaciente;
    const nroDoc =
      this.formulario.nroDocumento || this.formulario.nroDocumentoPaciente;
    if (tipoDoc !== '1') return false;

    try {
      const resultado = await this.pacientesApi.consultarReniec(nroDoc);

      if (resultado.datos) {
        const formComoPaciente = this
          .formulario as unknown as import('../../../../../../../compartido/ui/registro-paciente/registro-paciente.interfaces').FormRegistroPaciente;
        const mapeado = await this.reniecMapper.mapearDatos(
          resultado.datos as unknown as Record<string, unknown>,
          formComoPaciente,
          this.tiposSexo,
          this.estadosCivil,
        );

        Object.assign(this.formulario, mapeado.form);
        this.formulario.direccionDomicilio = (
          this.formulario.direccionDomicilio || ''
        ).slice(0, 70);

        if (this.formulario.idDepartamentoDomicilio)
          await this.cargarProvincias();
        if (this.formulario.idProvinciaDomicilio) await this.cargarDistritos();
        if (this.formulario.idDistritoDomicilio)
          await this.cargarCentrosPoblados();

        return true;
      } else {
        const msgRniec =
          resultado.resultado?.filter((r) => !!r?.trim()).join(' · ') ||
          'No se encontraron datos en la RENIEC.';
        this.mensajeError = msgRniec;
        return false;
      }
    } catch (error: unknown) {
      this.mensajeError =
        error instanceof ApiRequestError
          ? error.message ||
            'No se pudo consultar RENIEC. Complete los datos manualmente.'
          : 'No se pudo consultar RENIEC. Complete los datos manualmente.';
      return false;
    }
  }

  private async consultarSis(): Promise<void> {
    try {
      let sisResponse: SisAfiliado;
      if (this.esFiliacion) {
        sisResponse = await this.sisApi.consultarAfiliado('', 0, {
          disa: this.formulario.afiliacionDisa,
          tipoFormato: this.formulario.afiliacionTipoFormato,
          nroContrato: this.formulario.afiliacionNroContrato,
        });
      } else {
        const tipoDoc = this.formulario.idDocIdentidad === '1' ? 1 : 3;
        sisResponse = await this.sisApi.consultarAfiliado(
          this.formulario.nroDocumento,
          tipoDoc,
        );
      }

      this.sisConsultado = true;

      if (sisResponse?.estado === 'ACTIVO') {
        this.sisActivo = true;
        this.sisDescripcion = `${sisResponse.estado} - ${sisResponse.descTipoSeguro}`;

        this.mapearDatosSisAlFormulario(sisResponse);

        const fNacimientoIso = this.formatearFechaSis(
          sisResponse.fecNacimiento,
        );

        try {
          await this.sisApi.gestionarAfiliacion({
            idSiasis: sisResponse.idNumReg
              ? Number(sisResponse.idNumReg)
              : undefined,
            codigo: sisResponse.tabla || undefined,
            // Con busqueda por documento el formulario es la fuente del
            // documento. Con busqueda por afiliacion idDocIdentidad vale 99
            // ("Afiliacion", que no es un tipo de documento) y nroDocumento
            // esta vacio, asi que solo se usa lo que devuelve SIS.
            documentoTipo: this.esFiliacion
              ? sisResponse.tipoDocumento
              : sisResponse.tipoDocumento || this.formulario.idDocIdentidad,
            documentoNumero: this.esFiliacion
              ? sisResponse.nroDocumento
              : sisResponse.nroDocumento || this.formulario.nroDocumento,
            paterno: sisResponse.apePaterno,
            materno: sisResponse.apeMaterno,
            pNombre: sisResponse.nombres,
            genero: sisResponse.genero,
            fNacimiento: fNacimientoIso || undefined,
            idDistritoDomicilio: sisResponse.idUbigeo,
            estado: sisResponse.estado,
            afiliacionDisa: sisResponse.disa,
            afiliacionTipoFormato: sisResponse.tipoFormato,
            afiliacionNroFormato: sisResponse.nroContrato,
            afiliacionNroIntegrante: sisResponse.correlativo,
            codigoEstablAdscripcion: sisResponse.eess,
            descEESS: sisResponse.descEESS,
            descEessUbigeo: sisResponse.descEessUbigeo,
            regimen: sisResponse.regimen,
            tipoSeguro: sisResponse.tipoSeguro,
            descTipoSeguro: sisResponse.descTipoSeguro,
            contrato: sisResponse.contrato,
            idPlan: sisResponse.idPlan,
            idGrupoPoblacional: sisResponse.idGrupoPoblacional,
            msgConfidencial: sisResponse.msgConfidencial,
          });
          this.sisGuardado = true;
        } catch {
          this.sisGuardado = false;
        }
      } else {
        this.sisActivo = false;
      }

      // SIS responder con idError 6 significa que se agotó la cuota diaria de
      // consultas del usuario. Es un fallo de la cuenta, no del paciente, así
      // que se desactiva la integración SIS (parámetro 322) para no seguir
      // golpeando el endpoint. El mensaje de SIS se muestra igual al usuario.
      if (this.esLimiteConsultasSis(sisResponse)) {
        this.sisActivo = false;
        this.mensajeError =
          sisResponse.resultado?.trim() ||
          'Se alcanzó el límite de consultas diarias de SIS.';
        await this.desactivarIntegracionSis();
        // Aun sin cuota para consultar al SIS, la afiliación guardada en la base
        // de datos local puede vigente, así que se usa como respaldo.
        await this.consultarFiliacionLocal();
      }

      this.actualizarIafaAutomatico();
    } catch (error: unknown) {
      this.sisConsultado = true;
      this.sisActivo = false;
      this.actualizarIafaAutomatico();
      if (error instanceof ApiRequestError) {
        this.mensajeError = error.message;
      }
    }
  }

  // Respaldo local de la integración SIS: consulta la afiliación ya registrada
  // en la base de datos (SP usp_go_SisFiliacionesConsultar) cuando no se puede
  // llamar al SIS por SOAP, ya sea porque el parámetro 322 está en 'N' o porque
  // se agotó la cuota diaria de consultas.
  //
  // Solo se toma en cuenta cuando el SP devuelve exactamente un registro: con
  // varios, no hay forma de saber cuál es la vigente, así que se deja al
  // usuario resolverlo. La vigencia la define Fbaja: vacía o futura mantiene
  // la cobertura; una fecha ya pasada la cancela.
  private async consultarFiliacionLocal(): Promise<void> {
    const nroDocumento = (this.formulario.nroDocumento || '').trim();
    if (!nroDocumento) return;

    const idTipoDoc = this.tipoDocumentoParaSis();
    if (!idTipoDoc) return;

    try {
      const registros = await this.sisApi.listarFiliacionesRegistradas(
        nroDocumento,
        idTipoDoc,
      );

      if (registros?.length !== 1) {
        return;
      }

      const afiliacion = registros[0];
      if (!this.afiliacionSigueVigente(afiliacion)) {
        this.sisActivo = false;
        this.sisConsultado = true;
        this.sisDescripcion = '';
        // Fbaja pasada: la afiliación existe pero está cancelada. Se informa
        // como "SIS Cancelado" en vez de "SIS activo", y el combo de IAFA no
        // puede quedar en SIS. Se deja en PARTÍCULAR, que es lo que
        // corresponde a un paciente sin cobertura vigente.
        this.sisCancelado = true;
        this.sisFechaBaja = leerCampoFiliacion(afiliacion, 'fbaja');
        this.fijarFuenteParticular();
        return;
      }

      this.sisConsultado = true;
      this.sisActivo = true;
      this.sisDescripcion = this.descripcionFiliacionLocal(afiliacion);
      this.mapearFiliacionLocalAlFormulario(afiliacion);
    } catch {
      // Si la consulta local falla, el triaje sigue sin cobertura SIS y el
      // usuario completa los datos a mano. No se sobrescribe mensajeError
      // porque suele haber un aviso más relevante de RENIEC o SIS.
      this.sisActivo = false;
    }

    this.actualizarIafaAutomatico();
  }

  // Traduce el tipo de documento del formulario al valor que espera el SP:
  // 1 para DNI y 3 para Carnet de Extranjería. Otros tipos (SD, afiliación,
  // pasaporte) no tienen equivalencia en SisFiliaciones, así que no se consulta.
  private tipoDocumentoParaSis(): number | null {
    if (this.formulario.idDocIdentidad === '1') return 1;
    if (this.formulario.idDocIdentidad === '3') return 3;
    return null;
  }

  // Fbaja es la fecha en que terminó la afiliación. Vacía o nula significa que
  // sigue vigente. Viene como dd/mm/aaaa (ej. 17/10/2030) y se acepta también
  // el formato ISO que puede devolver el driver.
  private afiliacionSigueVigente(afiliacion: SisFiliacionRegistrada): boolean {
    const fbaja = leerCampoFiliacion(afiliacion, 'fbaja');
    if (!fbaja) return true;

    const baja = this.parsearFechaFiliacion(fbaja);
    if (!baja) {
      // Una Fbaja con formato desconocido no se puede comparar con la fecha
      // actual; se asume vigente para no quitarle la cobertura al paciente.
      return true;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return baja >= hoy;
  }

  private parsearFechaFiliacion(valor: string): Date | null {
    const texto = valor.trim();

    // dd/mm/aaaa, con o sin separadores, tal como lo muestra SIS.
    const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/.exec(texto);
    if (dmy) {
      return this.construirFecha(
        Number(dmy[3]),
        Number(dmy[2]),
        Number(dmy[1]),
      );
    }

    // aaaa-mm-dd, con o sin hora.
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
    if (ymd) {
      return this.construirFecha(
        Number(ymd[1]),
        Number(ymd[2]),
        Number(ymd[3]),
      );
    }

    return null;
  }

  // Construye la fecha validando el rango: new Date(2030, 12, 1) desborda a
  // enero del año siguiente en vez de fallar, y eso ocultaría un Fbaja inválido.
  private construirFecha(anio: number, mes: number, dia: number): Date | null {
    const fecha = new Date(anio, mes, dia);
    if (Number.isNaN(fecha.getTime())) return null;
    if (
      fecha.getFullYear() !== anio ||
      fecha.getMonth() !== mes ||
      fecha.getDate() !== dia
    ) {
      return null;
    }
    return fecha;
  }

  private descripcionFiliacionLocal(
    afiliacion: SisFiliacionRegistrada,
  ): string {
    const seguro =
      leerCampoFiliacion(afiliacion, 'descTipoSeguro') ||
      leerCampoFiliacion(afiliacion, 'tipoSeguro');
    const regimen = leerCampoFiliacion(afiliacion, 'regimen');
    return [seguro, regimen].filter((p) => !!p).join(' - ');
  }

  // Copia los datos de la afiliación local al formulario. Solo rellena campos
  // vacíos, para no pisar lo que el usuario ya escribió o lo que vino de BD.
  private mapearFiliacionLocalAlFormulario(
    afiliacion: SisFiliacionRegistrada,
  ): void {
    type CampoNombre =
      | 'apellidoPaterno'
      | 'apellidoMaterno'
      | 'primerNombre'
      | 'segundoNombre';

    const campos: (readonly [CampoNombre, string])[] = [
      ['apellidoPaterno', leerCampoFiliacion(afiliacion, 'paterno')],
      ['apellidoMaterno', leerCampoFiliacion(afiliacion, 'materno')],
      ['primerNombre', leerCampoFiliacion(afiliacion, 'pnombre')],
      ['segundoNombre', leerCampoFiliacion(afiliacion, 'onombres')],
    ];

    for (const [campo, valor] of campos) {
      if (valor && !String(this.formulario[campo] || '').trim()) {
        this.formulario[campo] = valor;
      }
    }

    const fNacimientoIso = this.formatearFechaSis(
      leerCampoFiliacion(afiliacion, 'fnacimiento'),
    );
    if (fNacimientoIso && !this.formulario.fechaNacimiento) {
      this.formulario.fechaNacimiento = fNacimientoIso;
    }
  }

  private formatearFechaSis(fecha: string | undefined): string {
    if (!fecha) return '';
    if (fecha.length === 8) {
      return `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}T00:00:00Z`;
    }
    return fecha;
  }

  // El IAFA se deriva de la cobertura efectiva del paciente, no de si la
  // integración con el SIS está prendida. Con el parámetro 322 en 'N' la
  // integración no se consulta, pero una afiliación local vigente igual cubre
  // al paciente y debe reflejarse como SIS en el combo. Por eso el corte se
  // hace sobre sisConsultado/sisActivo y no sobre sisIntegrado.
  actualizarIafaAutomatico(): void {
    if (!this.sisIntegrado && !this.sisActivo) return;

    const buscarIAFA = (termino: string) =>
      this.fuentesFinanciamiento.find((f) =>
        String((f.descripcion as string | number | boolean) || '')
          .toUpperCase()
          .includes(termino),
      );

    if (this.formulario.esAccidenteTransito) {
      const soat = buscarIAFA('SOAT');
      if (soat)
        this.formulario.idFuenteFinanciamiento = String(
          soat.idFuenteFinanciamiento,
        );
    } else if (this.sisActivo) {
      const sis = buscarIAFA('SIS');
      if (sis)
        this.formulario.idFuenteFinanciamiento = String(
          sis.idFuenteFinanciamiento,
        );
    } else {
      const particular = buscarIAFA('PARTICULAR');
      if (particular)
        this.formulario.idFuenteFinanciamiento = String(
          particular.idFuenteFinanciamiento,
        );
    }
  }

  fijarFuenteParticular(): void {
    const particular = this.fuentesFinanciamiento.find((f) =>
      String((f.descripcion as string | number | boolean) || '')
        .toUpperCase()
        .includes('PARTICULAR'),
    );
    if (particular) {
      this.formulario.idFuenteFinanciamiento = String(
        particular.idFuenteFinanciamiento,
      );
    }
  }

  private mapearNombresYApellidosSis(sis: SisAfiliado): void {
    if (!this.formulario.apellidoPaterno && sis.apePaterno)
      this.formulario.apellidoPaterno = sis.apePaterno;
    if (!this.formulario.apellidoMaterno && sis.apeMaterno)
      this.formulario.apellidoMaterno = sis.apeMaterno;
    if (!this.formulario.primerNombre && sis.nombres) {
      const partes = sis.nombres.trim().split(/\s+/);
      this.formulario.primerNombre = partes[0] || '';
      this.formulario.segundoNombre = partes.slice(1).join(' ');
    }
  }

  private mapearUbigeoSis(idUbigeo?: string): void {
    if (!this.formulario.idDistritoDomicilio && idUbigeo) {
      this.formulario.idDistritoDomicilio = idUbigeo;
    }
    const dist = this.formulario.idDistritoDomicilio;
    if (dist) {
      if (!this.formulario.idDepartamentoDomicilio && dist.length >= 2) {
        this.formulario.idDepartamentoDomicilio = dist.substring(0, 2);
      }
      if (!this.formulario.idProvinciaDomicilio && dist.length >= 4) {
        this.formulario.idProvinciaDomicilio = dist.substring(0, 4);
      }
    }
  }

  private mapearDatosSisAlFormulario(sis: SisAfiliado): void {
    this.mapearNombresYApellidosSis(sis);

    // Con busqueda por afiliacion NO se toca formulario.idDocIdentidad ni
    // formulario.nroDocumento. Antes se fijaba el tipo en SD y se copiaba el
    // numero de contrato al numero de documento, pero eso hacia que
    // esFiliacion pasara a false: el select de busqueda volvia a mostrar el
    // campo de documento, "Datos del paciente" quedaba bloqueado y se
    // autocompletaba con SD + numero de contrato. Ahora la identificacion se
    //-ingresa a mano en "Datos del paciente" y se valida al guardar.

    if (!this.formulario.fechaNacimiento && sis.fecNacimiento?.length === 8) {
      this.formulario.fechaNacimiento = `${sis.fecNacimiento.slice(0, 4)}-${sis.fecNacimiento.slice(4, 6)}-${sis.fecNacimiento.slice(6, 8)}`;
    }
    if (!this.formulario.idTipoSexo && sis.genero) {
      const esGeneroValido = sis.genero === '1' || sis.genero === '2';
      this.formulario.idTipoSexo = esGeneroValido ? sis.genero : '';
    }
    if (!this.formulario.direccionDomicilio && sis.direccion) {
      this.formulario.direccionDomicilio = sis.direccion.slice(0, 70);
    }

    this.mapearUbigeoSis(sis.idUbigeo);

    this.pacienteEncontrado = true;
    this.pasoActual = 2;

    this.cargarProvincias()
      .then(() => this.cargarDistritos())
      .then(() => this.cargarCentrosPoblados());
  }

  private mapearPacienteLocal(paciente: Record<string, unknown>): void {
    const v = (prop1: string, prop2: string, prop3?: string) => {
      const val =
        paciente[prop1] ||
        paciente[prop2] ||
        (prop3 ? paciente[prop3] : '') ||
        '';
      return String(val as string | number | boolean);
    };

    this.formulario.idPaciente = Number(
      paciente.patientId ||
        paciente.PatientID ||
        paciente.idPaciente ||
        paciente.IdPaciente ||
        0,
    );
    this.formulario.apellidoPaterno = v(
      'paternalSurname',
      'PaternalSurname',
      'apellidoPaterno',
    );
    this.formulario.apellidoMaterno = v(
      'maternalSurname',
      'MaternalSurname',
      'apellidoMaterno',
    );
    this.formulario.primerNombre = v('firstName', 'FirstName', 'primerNombre');
    this.formulario.segundoNombre = v(
      'secondName',
      'SecondName',
      'segundoNombre',
    );

    const fechaNac = v('dateOfBirth', 'DateOfBirth', 'fechaNacimiento');
    if (fechaNac) {
      this.formulario.fechaNacimiento = String(fechaNac).split('T')[0];
    }

    const idSexo = v('sexTypeId', 'SexTypeID', 'idTipoSexo');
    this.formulario.idTipoSexo = idSexo ? String(idSexo) : '';

    const idEstado = v('maritalStatusId', 'MaritalStatusID', 'idEstadoCivil');
    this.formulario.idEstadoCivil = idEstado ? String(idEstado) : '';

    this.formulario.telefono = v('phone', 'Phone', 'telefono');
    this.formulario.direccionDomicilio = v(
      'homeAddress',
      'HomeAddress',
      'direccionDomicilio',
    );

    const idDep = v(
      'homeDepartmentId',
      'HomeDepartmentID',
      'idDepartamentoDomicilio',
    );
    this.formulario.idDepartamentoDomicilio = idDep ? String(idDep) : '';

    const idProv = v(
      'homeProvinceId',
      'HomeProvinceID',
      'idProvinciaDomicilio',
    );
    this.formulario.idProvinciaDomicilio = idProv ? String(idProv) : '';

    const idDist = v('homeDistrictId', 'HomeDistrictID', 'idDistritoDomicilio');
    this.formulario.idDistritoDomicilio = idDist ? String(idDist) : '';

    if (
      !this.formulario.idDepartamentoDomicilio &&
      this.formulario.idDistritoDomicilio.length >= 2
    ) {
      this.formulario.idDepartamentoDomicilio =
        this.formulario.idDistritoDomicilio.substring(0, 2);
    }
    if (
      !this.formulario.idProvinciaDomicilio &&
      this.formulario.idDistritoDomicilio.length >= 4
    ) {
      this.formulario.idProvinciaDomicilio =
        this.formulario.idDistritoDomicilio.substring(0, 4);
    }

    const idCP = v('homeCenterId', 'HomeCenterID', 'idCentroPobladoDomicilio');
    this.formulario.idCentroPobladoDomicilio = idCP ? String(idCP) : '';

    this.cargarProvincias()
      .then(() => this.cargarDistritos())
      .then(() => this.cargarCentrosPoblados());
  }

  async cargarProvincias(): Promise<void> {
    if (!this.formulario.idDepartamentoDomicilio) {
      this.provincias = [];
      return;
    }
    this.provincias = await this.maestrosApi.getProvincias(
      this.formulario.idDepartamentoDomicilio,
    );
  }

  async cargarDistritos(): Promise<void> {
    if (!this.formulario.idProvinciaDomicilio) {
      this.distritos = [];
      return;
    }
    this.distritos = await this.maestrosApi.getDistritos(
      this.formulario.idProvinciaDomicilio,
    );
  }

  async cargarCentrosPoblados(): Promise<void> {
    if (!this.formulario.idDistritoDomicilio) {
      this.centrosPoblados = [];
      return;
    }
    this.centrosPoblados = await this.maestrosApi.getCentrosPoblados(
      this.formulario.idDistritoDomicilio,
    );
  }

  get esFiliacion(): boolean {
    return this.formulario.idDocIdentidad === '99';
  }

  // El bloque "Datos del paciente" queda de solo lectura cuando la
  // identificacion se resolvio con el buscador por tipo + numero de documento
  // y el paciente fue encontrado: en ese caso el dato ya fue verificado contra
  // la BD, RENIEC o SIS y no debe editarse.
  //
  // Queda editable en los tres casos en que el operador tiene que completar o
  // corregir la identificacion:
  //  - busqueda por afiliacion SIS: el buscador no captura ningun documento
  //    (muestra DISA / tipo de formato / nro de contrato).
  //  - paciente no encontrado: se informa "El paciente no fue encontrado.
  //    Ingrese los datos manualmente." y hay que tipear nombres y apellidos.
  //  - (el modo NN se resuelve aparte: siempre queda bloqueado porque los
  //    nombres los fija el propio sistema en 'NN').
  get datosPacienteBloqueados(): boolean {
    if (this.formulario.pacienteNn) return true;
    if (this.esFiliacion) return false;
    return !this.datosPacienteManuales;
  }

  // Catalogo de tipos de documento para el bloque "Datos del paciente".
  // Se excluye la opcion 99 "Afiliacion" que inyecta
  // usp_go_ListarTiposDocumentos con un "union all": es un modo de busqueda,
  // no un tipo de documento real del paciente.
  get tiposDocumentoPaciente(): ICatalogoDescripcion[] {
    return this.tiposDocumentos.filter((t) => Number(t.id) !== 99);
  }

  private idTipoDocumentoSinDocumento(): string {
    const sd = this.tiposDocumentos.find(
      (t) => (t.descripcion || '').toUpperCase() === 'SD',
    );
    return sd ? String(sd.id) : '';
  }

  // Identifica si el tipo de documento seleccionado es "SD" (Sin Documento,
  // valor 0). En ese caso la búsqueda solo consulta la base de datos local.
  private get esTipoDocumentoSinDocumento(): boolean {
    const id = this.formulario.idDocIdentidad;
    if (id === '0') return true;
    const sd = this.idTipoDocumentoSinDocumento();
    return !!sd && id === sd;
  }

  // Convierte el tipo de documento a número conservando el valor 0 (SD -
  // Sin Documento). Si viene vacío o no es numérico usa 1 (DNI).
  private idDocIdentidadNumero(): number {
    const v = this.formulario.idDocIdentidad?.trim();
    if (!v) return 1;
    const n = Number(v);
    return Number.isNaN(n) ? 1 : n;
  }

  // Igual que idDocIdentidadNumero pero sobre el dato del bloque "Datos del
  // paciente", que es el que se envia al grabar el triaje.
  private idDocIdentidadPacienteNumero(): number {
    const v = this.formulario.idDocIdentidadPaciente?.trim();
    if (!v) return 1;
    const n = Number(v);
    return Number.isNaN(n) ? 1 : n;
  }

  get esCadaver(): boolean {
    return this.formulario.idTipoPrioridad === PRIORIDAD_CADAVER;
  }

  get tiene15OMas(): boolean {
    const fecha = this.formulario.fechaNacimiento;
    if (!fecha) return false;
    const nac = new Date(fecha);
    if (Number.isNaN(nac.getTime())) return false;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
      edad--;
    }
    return edad >= 15;
  }

  async guardarYContinuar(idTriaje?: number): Promise<void> {
    this.mensajeError = '';

    if (!this.pacienteEncontrado) {
      this.mensajeError = 'Debe buscar un paciente antes de continuar.';
      return;
    }

    if (!this.formulario.apellidoPaterno || !this.formulario.primerNombre) {
      this.mensajeError = 'Complete los nombres y apellidos del paciente.';
      return;
    }

    // Con busqueda por afiliacion el documento no se autocompleta: el
    // operador tiene que ingresarlo a mano en "Datos del paciente".
    if (this.esFiliacion) {
      if (!this.formulario.idDocIdentidadPaciente) {
        this.mensajeError =
          'Seleccione el tipo de documento del paciente en "Datos del paciente".';
        return;
      }
      if (!this.formulario.nroDocumentoPaciente.trim()) {
        this.mensajeError =
          'Ingrese el número de documento del paciente en "Datos del paciente".';
        return;
      }
    }

    if (!this.formulario.idTipoSexo) {
      this.mensajeError = 'Seleccione el sexo del paciente.';
      return;
    }

    if (!this.formulario.idFuenteFinanciamiento) {
      this.mensajeError = 'Seleccione la fuente de financiamiento (IAFA).';
      return;
    }

    if (!this.formulario.idTipoPrioridad) {
      this.mensajeError = 'Seleccione el tipo de prioridad.';
      return;
    }

    if (!this.formulario.idEstadoLlego) {
      this.mensajeError = 'Seleccione cómo llegó el paciente.';
      return;
    }

    if (!this.formulario.idServicio) {
      this.mensajeError = 'Seleccione el servicio derivado.';
      return;
    }

    if (!this.formulario.idCausaExternaMorbilidad) {
      this.mensajeError = 'Seleccione la causa externa de morbilidad.';
      return;
    }

    if (!this.esCadaver) {
      if (!this.formulario.motivo) {
        this.mensajeError = 'Ingrese los síntomas principales.';
        return;
      }
      if (!this.formulario.peso) {
        this.mensajeError = 'Ingrese el peso del paciente.';
        return;
      }
      if (!/^[0-9]{1,3}(\.[0-9]{1,3})?$/.test(this.formulario.peso)) {
        this.mensajeError =
          'El peso debe ser numérico (hasta 3 decimales, ej: 5.400).';
        return;
      }
      if (!this.formulario.talla) {
        this.mensajeError = 'Ingrese la talla del paciente.';
        return;
      }
      if (!/^[0-9]{1,3}$/.test(this.formulario.talla)) {
        this.mensajeError = 'La talla debe ser numérica.';
        return;
      }
      if (this.tiene15OMas && !this.formulario.presionArterial) {
        this.mensajeError = 'Ingrese la presión arterial.';
        return;
      }
      if (
        this.formulario.presionArterial &&
        !/^[0-9]{2,3}\/[0-9]{2,3}$/.test(this.formulario.presionArterial)
      ) {
        this.mensajeError = 'La presión arterial debe tener el formato 120/80.';
        return;
      }
      if (!this.formulario.saturacion) {
        this.mensajeError = 'Ingrese la saturación de O₂.';
        return;
      }
      if (!/^[0-9]{1,3}$/.test(this.formulario.saturacion)) {
        this.mensajeError = 'La saturación de O₂ debe ser numérica.';
        return;
      }
      if (!this.formulario.temperatura) {
        this.mensajeError = 'Ingrese la temperatura.';
        return;
      }
      if (!/^[0-9]{1,2}(\.[0-9]{1,2})?$/.test(this.formulario.temperatura)) {
        this.mensajeError =
          'La temperatura debe ser numérica con decimales (ej: 39.5).';
        return;
      }
      if (!this.formulario.tiempoEvolucionCantidad) {
        this.mensajeError = 'Ingrese el tiempo de síntomas.';
        return;
      }
      if (!/^[0-9]{1,4}$/.test(this.formulario.tiempoEvolucionCantidad)) {
        this.mensajeError = 'El tiempo de síntomas debe ser numérico.';
        return;
      }
      if (!this.formulario.tiempoEvolucionCantidadUnidad) {
        this.mensajeError = 'Seleccione la frecuencia del tiempo de síntomas.';
        return;
      }
      if (!this.formulario.frecCardiaca) {
        this.mensajeError = 'Ingrese la frecuencia cardíaca.';
        return;
      }
      if (!/^[0-9]{1,3}$/.test(this.formulario.frecCardiaca)) {
        this.mensajeError = 'La frecuencia cardíaca debe ser numérica.';
        return;
      }
      if (
        this.formulario.frecRespiratoria &&
        !/^[0-9]{1,3}$/.test(this.formulario.frecRespiratoria)
      ) {
        this.mensajeError = 'La frecuencia respiratoria debe ser numérica.';
        return;
      }
      if (
        this.formulario.fiO2 &&
        !/^[0-9]{1,2}(\.[0-9]{1,2})?$/.test(this.formulario.fiO2)
      ) {
        this.mensajeError =
          'El FIO₂ debe ser numérico con decimales (ej: 0.21).';
        return;
      }
      if (!this.formulario.escalaDolor && this.formulario.escalaDolor !== '0') {
        this.mensajeError = 'Seleccione la escala de dolor.';
        return;
      }
      if (!this.formulario.escalaGlasgow) {
        this.mensajeError = 'Seleccione la escala de Glasgow.';
        return;
      }
    }

    this.guardando = true;

    try {
      const idPacienteFinal = this.formulario.idPaciente;

      const fechaNacIso = this.formulario.fechaNacimiento
        ? `${this.formulario.fechaNacimiento}T00:00:00Z`
        : undefined;

      const payloadPaciente = {
        nroDocumento: this.formulario.nroDocumento,
        idDocIdentidad: this.idDocIdentidadNumero(),
        apellidoPaterno: this.formulario.apellidoPaterno,
        apellidoMaterno: this.formulario.apellidoMaterno,
        primerNombre: this.formulario.primerNombre,
        segundoNombre: this.formulario.segundoNombre,
        fechaNacimiento: fechaNacIso,
        idTipoSexo: Number(this.formulario.idTipoSexo) || undefined,
        idEstadoCivil: Number(this.formulario.idEstadoCivil) || undefined,
        telefono: this.formulario.telefono,
        direccionDomicilio: this.formulario.direccionDomicilio,
        idDepartamentoDomicilio:
          Number(this.formulario.idDepartamentoDomicilio) || undefined,
        idProvinciaDomicilio:
          Number(this.formulario.idProvinciaDomicilio) || undefined,
        idDistritoDomicilio:
          Number(this.formulario.idDistritoDomicilio) || undefined,
        idCentroPobladoDomicilio:
          Number(this.formulario.idCentroPobladoDomicilio) || undefined,
      };

      // if (
      //   !idPacienteFinal &&
      //   !this.formulario.pacienteNn &&
      //   this.formulario.nroDocumento
      // ) {
      //   await this.pacientesApi.registrar(
      //     payloadPaciente as unknown as RegistroPacientePayload,
      //   );
      // } else if (idPacienteFinal) {
      //   await this.pacientesApi.actualizar(
      //     idPacienteFinal,
      //     payloadPaciente as unknown as RegistroPacientePayload,
      //   );
      // }

      const payloadTriaje: RegistroTriajePayload = {
        idTriaje,
        idDocIdentidad: this.idDocIdentidadPacienteNumero(),
        nroDocumento: this.formulario.nroDocumentoPaciente,
        apellidoPaterno: this.formulario.apellidoPaterno,
        apellidoMaterno: this.formulario.apellidoMaterno,
        primerNombre: this.formulario.primerNombre,
        segundoNombre: this.formulario.segundoNombre,
        fechaNacimiento: fechaNacIso,
        idSexo: Number(this.formulario.idTipoSexo) || undefined,
        idEstadoCivil: Number(this.formulario.idEstadoCivil) || undefined,
        telefono: this.formulario.telefono,
        direccion: this.formulario.direccionDomicilio,
        idDepartamentoDomicilio:
          Number(this.formulario.idDepartamentoDomicilio) || undefined,
        idProvinciaDomicilio:
          Number(this.formulario.idProvinciaDomicilio) || undefined,
        idDistritoDomicilio:
          Number(this.formulario.idDistritoDomicilio) || undefined,
        idComunidadDomicilio:
          Number(this.formulario.idCentroPobladoDomicilio) || undefined,
        idEsAccidenteTransito: this.formulario.esAccidenteTransito ? 1 : 0,
        idFuenteFinanciamiento:
          Number(this.formulario.idFuenteFinanciamiento) || undefined,
        idEstadollego: Number(this.formulario.idEstadoLlego) || undefined,
        motivo: this.formulario.motivo,
        presionArterial: this.formulario.presionArterial,
        frecCardiaca: Number(this.formulario.frecCardiaca) || undefined,
        frecRespiratoria: Number(this.formulario.frecRespiratoria) || undefined,
        temperatura: Number(this.formulario.temperatura) || undefined,
        saturacion: Number(this.formulario.saturacion) || undefined,
        fiO2: Number(this.formulario.fiO2) || undefined,
        peso: Number(this.formulario.peso) || undefined,
        talla: Number(this.formulario.talla) || undefined,
        escalaDolor: Number(this.formulario.escalaDolor) || undefined,
        escalaGlasgow: Number(this.formulario.escalaGlasgow) || undefined,
        tiempoEvolucionCantidad:
          Number(this.formulario.tiempoEvolucionCantidad) || undefined,
        tiempoEvolucionCantidadUnidad:
          this.formulario.tiempoEvolucionCantidadUnidad,
        idServicio: Number(this.formulario.idServicio) || undefined,
        idTipoPrioridad: Number(this.formulario.idTipoPrioridad) || undefined,
        idCausaExternaMorbilidad:
          Number(this.formulario.idCausaExternaMorbilidad) || undefined,
        gestante: this.formulario.esGestante ? 1 : 0,
        esGestante: this.formulario.esGestante ?? false,
        imc: this.calcularImcPayload(),
        fechaUltimaRegla: this.formulario.fechaUltimaRegla || undefined,
        fur: this.formulario.fechaUltimaRegla || null,
        edadGestacional: null,
        fpp: null,
        nroControlesPrenatales: null,
        movimientosFetales: null,
        idEmpleado:
          this.authService.getIdEmpleado() > 0
            ? this.authService.getIdEmpleado()
            : 1,
      };

      const resp = idTriaje
        ? await this.triajeApi.modificarTriaje(idTriaje, payloadTriaje)
        : await this.triajeApi.registrar(payloadTriaje);

      if (resp?.resultado?.toUpperCase().startsWith('ERROR')) {
        this.mensajeError = resp.resultado.replace(/^(ERROR|Error);\s*/i, '');
        return;
      }

      this.ultimoTriajeId = idTriaje
        ? idTriaje
        : await this.obtenerUltimoTriajeId();
    } catch (error: unknown) {
      this.mensajeError =
        error instanceof ApiRequestError
          ? error.message
          : 'Error al guardar el triaje.';
    } finally {
      this.guardando = false;
    }
  }

  private calcularImcPayload(): number | undefined {
    const p = parseFloat(this.formulario.peso);
    const t = parseFloat(this.formulario.talla);
    if (!p || !t || p <= 0 || t <= 0) return undefined;
    return Number((p / (t / 100) ** 2).toFixed(1));
  }

  private async obtenerUltimoTriajeId(): Promise<number | null> {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const items = await this.triajeApi.listar(
        hoy,
        hoy,
        this.formulario.nroDocumento.trim(),
      );
      const arregloItems = Array.isArray(items) ? items : [];
      if (arregloItems.length === 0) return null;
      const ids = arregloItems.map((item: Record<string, unknown>) =>
        Number(item.IdTriaje ?? item.idTriaje ?? item.IDTriaje ?? 0),
      );
      const max = Math.max(...ids);
      return max > 0 ? max : null;
    } catch {
      return null;
    }
  }
}
