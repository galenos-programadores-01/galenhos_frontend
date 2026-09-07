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
  type SisAfiliado,
  SisApiService,
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
  mensajeError = '';
  mensajeInfo = '';

  sisConsultado = false;
  sisActivo = false;
  sisDescripcion = '';
  sisGuardado = false;
  sisIntegrado = false;
  reniecIntegrado = false;

  ultimoTriajeId: number | null = null;

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

  prioridades = [
    { value: '1', label: 'I. Emerg. o Gravedad', color: '#3b82f6' },
    { value: '2', label: 'II. Urgencia Mayor', color: '#22c55e' },
    { value: '3', label: 'III. Urgencia Menor', color: '#eab308' },
    { value: '4', label: 'IV. Patología Aguda Común', color: '#f97316' },
    { value: '6', label: 'Llegó Cadáver', color: '#ef4444' },
  ];

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
      fechaUltimaRegla: '',
      esGestante: false,
    };
  }

  async cargarCatalogosIniciales(): Promise<void> {
    try {
      [
        this.tiposDocumentos,
        this.tiposSexo,
        this.estadosCivil,
        this.departamentos,
        this.fuentesFinanciamiento,
        this.estadosLlegoPaciente,
        this.servicios,
      ] = await Promise.all([
        this.maestrosApi.getTiposDocumentos(),
        this.maestrosApi.getTiposSexo(),
        this.maestrosApi.getEstadosCivil(),
        this.maestrosApi.getDepartamentos(),
        this.maestrosApi.getFuentesFinanciamiento() as unknown as Promise<
          Record<string, unknown>[]
        >,
        this.maestrosApi.getEstadosLlegoPaciente(),
        this.maestrosApi.getServicios(2),
      ]);
    } catch {
      this.mensajeError = 'Error al cargar catálogos iniciales.';
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
    this.sisIntegrado = false;
    this.reniecIntegrado = false;
    this.ultimoTriajeId = null;
  }

  async buscarPaciente(): Promise<void> {
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
    this.buscando = true;
    this.mensajeError = '';
    this.mensajeInfo = '';
    this.pacienteEncontrado = false;
    this.sisConsultado = false;
    this.sisActivo = false;

    try {
      await this.cargarParametrosIntegracion();

      const paciente = await this.buscarEnBaseDatosLocal();

      if (!paciente) {
        const reniecOk = await this.consultarReniec();
        if (reniecOk) {
          this.pacienteEncontrado = true;
          this.pasoActual = 2;
        }
      } else {
        this.mapearPacienteLocal(paciente as Record<string, unknown>);
        this.pacienteEncontrado = true;
        this.pasoActual = 2;
      }

      if (this.sisIntegrado) {
        await this.consultarSis();
      }

      // Si el paciente no se encontró en BD, RENIEC ni SIS, se habilitan
      // los textbox para que el usuario ingrese los datos manualmente.
      if (!this.pacienteEncontrado) {
        this.pacienteEncontrado = true;
        this.pasoActual = 2;
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
      if (error instanceof ApiRequestError && error.status === 404) {
        return await this.buscarPorDocumentoSinTipo();
      }
      throw error;
    }
  }

  private async buscarPorDocumentoSinTipo(): Promise<unknown> {
    try {
      const query = new URLSearchParams();
      query.append('documento', this.formulario.nroDocumento);
      query.append('hc', '');
      query.append('paterno', '');
      query.append('materno', '');
      query.append('nombres', '');
      const resultados = await this.pacientesApi.buscar(query.toString());
      return resultados.length > 0 ? resultados[0] : null;
    } catch {
      return null;
    }
  }

  private async consultarReniec(): Promise<boolean> {
    if (!this.reniecIntegrado) return false;

    // RENIEC solo consulta DNI (idDocIdentidad = 1).
    if (this.formulario.idDocIdentidad !== '1') return false;

    try {
      const resultado = await this.pacientesApi.consultarReniec(
        this.formulario.nroDocumento,
      );

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

        if (this.formulario.idDepartamentoDomicilio)
          await this.cargarProvincias();
        if (this.formulario.idProvinciaDomicilio) await this.cargarDistritos();
        if (this.formulario.idDistritoDomicilio)
          await this.cargarCentrosPoblados();

        return true;
      } else {
        this.mensajeError = 'No se encontraron datos en la RENIEC.';
        return false;
      }
    } catch {
      this.mensajeError =
        'No se pudo consultar RENIEC. Complete los datos manualmente.';
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
            documentoTipo:
              sisResponse.tipoDocumento || this.formulario.idDocIdentidad,
            documentoNumero:
              sisResponse.nroDocumento || this.formulario.nroDocumento,
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

  private formatearFechaSis(fecha: string | undefined): string {
    if (!fecha) return '';
    if (fecha.length === 8) {
      return `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}T00:00:00Z`;
    }
    return fecha;
  }

  actualizarIafaAutomatico(): void {
    if (!this.sisIntegrado) return;

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

    // Si se buscó por afiliación (sin documento), el SIS puede devolver el
    // tipo y número de documento real del paciente, o un recién nacido sin
    // documento. Con número se usa tal cual; sin número se trata como
    // "Sin Documento" (SD), igual que el modo NN, para poder grabar el triaje.
    if (this.esFiliacion) {
      if (sis.nroDocumento) {
        this.formulario.nroDocumento = sis.nroDocumento;
        if (sis.tipoDocumento && sis.tipoDocumento !== '99') {
          this.formulario.idDocIdentidad = sis.tipoDocumento;
        }
      } else {
        this.formulario.idDocIdentidad = this.idTipoDocumentoSinDocumento();
      }
    }

    if (!this.formulario.fechaNacimiento && sis.fecNacimiento?.length === 8) {
      this.formulario.fechaNacimiento = `${sis.fecNacimiento.slice(0, 4)}-${sis.fecNacimiento.slice(4, 6)}-${sis.fecNacimiento.slice(6, 8)}`;
    }
    if (!this.formulario.idTipoSexo && sis.genero) {
      const esGeneroValido = sis.genero === '1' || sis.genero === '2';
      this.formulario.idTipoSexo = esGeneroValido ? sis.genero : '';
    }
    if (!this.formulario.direccionDomicilio && sis.direccion) {
      this.formulario.direccionDomicilio = sis.direccion;
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

  private idTipoDocumentoSinDocumento(): string {
    const sd = this.tiposDocumentos.find(
      (t) => (t.descripcion || '').toUpperCase() === 'SD',
    );
    return sd ? String(sd.id) : '';
  }

  get esCadaver(): boolean {
    return this.formulario.idTipoPrioridad === '6';
  }

  async guardarYContinuar(): Promise<void> {
    this.mensajeError = '';

    if (!this.pacienteEncontrado) {
      this.mensajeError = 'Debe buscar un paciente antes de continuar.';
      return;
    }

    if (!this.formulario.apellidoPaterno || !this.formulario.primerNombre) {
      this.mensajeError = 'Complete los nombres y apellidos del paciente.';
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

    if (!this.esCadaver) {
      if (!this.formulario.motivo) {
        this.mensajeError = 'Ingrese los síntomas principales.';
        return;
      }
      if (!this.formulario.peso) {
        this.mensajeError = 'Ingrese el peso del paciente.';
        return;
      }
      if (!this.formulario.talla) {
        this.mensajeError = 'Ingrese la talla del paciente.';
        return;
      }
      if (!this.formulario.presionArterial) {
        this.mensajeError = 'Ingrese la presión arterial.';
        return;
      }
      if (!this.formulario.saturacion) {
        this.mensajeError = 'Ingrese la saturación de O₂.';
        return;
      }
      if (!this.formulario.temperatura) {
        this.mensajeError = 'Ingrese la temperatura.';
        return;
      }
      if (!this.formulario.tiempoEvolucionCantidad) {
        this.mensajeError = 'Ingrese el tiempo de síntomas.';
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
        idDocIdentidad: Number(this.formulario.idDocIdentidad) || 1,
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

      if (
        !idPacienteFinal &&
        !this.formulario.pacienteNn &&
        this.formulario.nroDocumento
      ) {
        await this.pacientesApi.registrar(
          payloadPaciente as unknown as RegistroPacientePayload,
        );
      } else if (idPacienteFinal) {
        await this.pacientesApi.actualizar(
          idPacienteFinal,
          payloadPaciente as unknown as RegistroPacientePayload,
        );
      }

      const payloadTriaje: RegistroTriajePayload = {
        idDocIdentidad: Number(this.formulario.idDocIdentidad) || 1,
        nroDocumento: this.formulario.nroDocumento,
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
        gestante: this.formulario.esGestante ? 1 : 0,
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

      await this.triajeApi.registrar(payloadTriaje);

      this.ultimoTriajeId = await this.obtenerUltimoTriajeId();
    } catch (error: unknown) {
      this.mensajeError =
        error instanceof ApiRequestError
          ? error.message
          : 'Error al guardar el triaje.';
    } finally {
      this.guardando = false;
    }
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
