import { Injectable, inject } from '@angular/core';
import { UbigeoService } from '../../../core/servicios/ubigeo.service';
import {
  type ActualizarPacientePayload,
  PacientesApiService,
} from '../../../modulos/pacientes/adaptadores/salida/http/pacientes.api.service';
import {
  type RegistroTriajePayload,
  TriajeApiService,
} from '../../../modulos/triaje/adaptadores/salida/http/triaje.api.service';
import { MaestrosApiService } from '../../api/maestros.api.service';
import { ApiRequestError } from '../../api-client/api-client.service';
import type {
  ICatalogoDescripcion,
  ICatalogoNombre,
  IFuenteFinanciamiento,
  RegistroPacientePayload,
} from '../../tipos/api-tipos';
import { ReniecMapper } from '../../utilidades/reniec.mapper';
import {
  type FormRegistroPaciente,
  formVacio,
  normalizarNombre,
  sanitizar,
  type TipoUbigeo,
} from './registro-paciente.interfaces';

@Injectable()
export class RegistroPacienteService {
  private readonly pacientesApi = inject(PacientesApiService);
  private readonly triajeApi = inject(TriajeApiService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly ubigeoService = inject(UbigeoService);
  private readonly reniecMapper = inject(ReniecMapper);

  form: FormRegistroPaciente = formVacio();
  guardando = false;
  consultandoReniec = false;
  cargandoDetalle = false;
  error = '';
  aviso = '';
  catalogoCargado = false;
  reniecConsumido = false;
  camposBloqueados = false;

  private detalleOriginal: Record<string, unknown> | null = null;

  tiposDocumento: ICatalogoDescripcion[] = [];
  tiposSexo: ICatalogoDescripcion[] = [];
  estadosCivil: ICatalogoDescripcion[] = [];
  gradosInstruccion: ICatalogoDescripcion[] = [];
  ocupaciones: ICatalogoDescripcion[] = [];
  etnias: ICatalogoDescripcion[] = [];
  idiomas: ICatalogoDescripcion[] = [];
  paises: ICatalogoNombre[] = [];
  fuentesFinanciamiento: IFuenteFinanciamiento[] = [];
  estadosLlego: ICatalogoDescripcion[] = [];

  departamentos: ICatalogoNombre[] = [];
  provincias: ICatalogoNombre[] = [];
  distritos: ICatalogoNombre[] = [];
  comunidades: ICatalogoNombre[] = [];

  depNacimiento: ICatalogoNombre[] = [];
  provNacimiento: ICatalogoNombre[] = [];
  distritosNacimiento: ICatalogoNombre[] = [];
  comunidadesNacimiento: ICatalogoNombre[] = [];

  depProcedencia: ICatalogoNombre[] = [];
  provProcedencia: ICatalogoNombre[] = [];
  distritosProcedencia: ICatalogoNombre[] = [];
  comunidadesProcedencia: ICatalogoNombre[] = [];

  depNacimientoSel = '';
  provNacimientoSel = '';
  depProcedenciaSel = '';
  provProcedenciaSel = '';

  tabUbigeo: TipoUbigeo = 'domicilio';

  limpiarEstado(): void {
    Object.assign(this.form, formVacio());
    this.error = '';
    this.aviso = '';
    this.reniecConsumido = false;
    this.camposBloqueados = false;
    this.depNacimientoSel = '';
    this.provNacimientoSel = '';
    this.depProcedenciaSel = '';
    this.provProcedenciaSel = '';
    this.tabUbigeo = 'domicilio';
    this.provincias = [];
    this.distritos = [];
    this.comunidades = [];
    this.provNacimiento = [];
    this.distritosNacimiento = [];
    this.comunidadesNacimiento = [];
    this.provProcedencia = [];
    this.distritosProcedencia = [];
    this.comunidadesProcedencia = [];
    this.detalleOriginal = null;
  }

  async cargarCatalogos(): Promise<void> {
    if (this.catalogoCargado) return;
    try {
      const p = (req: Promise<unknown>) => req.catch(() => []);
      const [
        docs,
        sexos,
        ec,
        grados,
        ocup,
        etnias,
        idiomas,
        paises,
        deps,
        ff,
        el,
      ] = await Promise.all([
        p(this.maestrosApi.getTiposDocumentos()),
        p(this.maestrosApi.getTiposSexo()),
        p(this.maestrosApi.getEstadosCivil()),
        p(this.maestrosApi.getGradosInstruccion()),
        p(this.maestrosApi.getOcupaciones()),
        p(this.maestrosApi.getEtnias()),
        p(this.maestrosApi.getIdiomas()),
        p(this.maestrosApi.getPaises()),
        p(this.maestrosApi.getDepartamentos()),
        p(this.maestrosApi.getFuentesFinanciamiento()),
        p(this.maestrosApi.getEstadosLlegoPaciente()),
      ]);

      const asArray = <TipoElemento>(val: unknown): TipoElemento[] =>
        Array.isArray(val) && val.length ? val : [];

      this.tiposDocumento = asArray(docs);
      this.tiposSexo = asArray(sexos);
      this.estadosCivil = asArray(ec);
      this.gradosInstruccion = asArray(grados);
      this.ocupaciones = asArray(ocup);
      this.etnias = asArray(etnias);
      this.idiomas = asArray(idiomas);
      this.paises = asArray(paises);
      this.departamentos = asArray(deps);
      this.fuentesFinanciamiento = asArray(ff);
      this.estadosLlego = asArray(el);

      this.catalogoCargado = true;
      this.aviso = '';
    } catch {
      this.aviso = 'No se pudieron cargar los catálogos.';
    }
  }

  async onCambioDepartamento(tipo: TipoUbigeo): Promise<void> {
    if (tipo === 'domicilio') {
      this.form.idProvinciaDomicilio = '';
      this.form.idDistritoDomicilio = '';
      this.form.idCentroPobladoDomicilio = '';
      this.distritos = [];
      this.comunidades = [];
      this.provincias = await this.ubigeoService.getProvincias(
        this.form.idDepartamentoDomicilio,
      );
    } else if (tipo === 'nacimiento') {
      this.form.idDistritoNacimiento = '';
      this.form.idCentroPobladoNacimiento = '';
      this.distritosNacimiento = [];
      this.comunidadesNacimiento = [];
      this.provNacimiento = await this.ubigeoService.getProvincias(
        this.depNacimientoSel,
      );
    } else if (tipo === 'procedencia') {
      this.form.idDistritoProcedencia = '';
      this.form.idCentroPobladoProcedencia = '';
      this.distritosProcedencia = [];
      this.comunidadesProcedencia = [];
      this.provProcedencia = await this.ubigeoService.getProvincias(
        this.depProcedenciaSel,
      );
    }
  }

  async onCambioProvincia(tipo: TipoUbigeo): Promise<void> {
    if (tipo === 'domicilio') {
      this.form.idDistritoDomicilio = '';
      this.form.idCentroPobladoDomicilio = '';
      this.comunidades = [];
      this.distritos = await this.ubigeoService.getDistritos(
        this.form.idProvinciaDomicilio,
      );
    } else if (tipo === 'nacimiento') {
      this.form.idDistritoNacimiento = '';
      this.form.idCentroPobladoNacimiento = '';
      this.comunidadesNacimiento = [];
      this.distritosNacimiento = await this.ubigeoService.getDistritos(
        this.provNacimientoSel,
      );
    } else if (tipo === 'procedencia') {
      this.form.idDistritoProcedencia = '';
      this.form.idCentroPobladoProcedencia = '';
      this.comunidadesProcedencia = [];
      this.distritosProcedencia = await this.ubigeoService.getDistritos(
        this.provProcedenciaSel,
      );
    }
  }

  async onCambioDistrito(tipo: TipoUbigeo): Promise<void> {
    if (tipo === 'domicilio') {
      this.form.idCentroPobladoDomicilio = '';
      this.comunidades = await this.ubigeoService.getCentrosPoblados(
        this.form.idDistritoDomicilio,
      );
    } else if (tipo === 'nacimiento') {
      this.form.idCentroPobladoNacimiento = '';
      this.comunidadesNacimiento = await this.ubigeoService.getCentrosPoblados(
        this.form.idDistritoNacimiento,
      );
    } else if (tipo === 'procedencia') {
      this.form.idCentroPobladoProcedencia = '';
      this.comunidadesProcedencia = await this.ubigeoService.getCentrosPoblados(
        this.form.idDistritoProcedencia,
      );
    }
  }

  async consultarReniec(): Promise<void> {
    const dni = this.form.nroDocumento.trim();
    if (!dni) {
      this.error = 'Ingrese el número de documento para consultar a RENIEC.';
      return;
    }

    if (this.form.idDocIdentidad !== '1') {
      return;
    }

    try {
      const param = await this.maestrosApi.getParametro(296);
      const paramArr = Array.isArray(param) ? param : [param];
      const parametro = paramArr[0];
      if (!parametro || parametro.valorTexto !== 'S') {
        return;
      }
    } catch {
      return;
    }

    if (!/^\d{8}$/.test(dni)) {
      this.error =
        'RENIEC solo consulta DNI de 8 dígitos. Verifique el número.';
      return;
    }

    this.consultandoReniec = true;
    this.error = '';

    try {
      const res = await this.maestrosApi.consultarReniec(dni);
      const datos = res?.datos;
      if (
        !datos ||
        (!datos.apellidoPaterno && !datos.primerNombre && !datos.nombres)
      ) {
        this.error = 'RENIEC no devolvió datos para ese documento.';
        return;
      }

      const mapeado = await this.reniecMapper.mapearDatos(
        datos as unknown as Record<string, unknown>,
        this.form,
        this.tiposSexo,
        this.estadosCivil,
      );
      Object.assign(this.form, mapeado.form);
      if (mapeado.depNacimientoSel)
        this.depNacimientoSel = mapeado.depNacimientoSel;
      if (mapeado.provNacimientoSel)
        this.provNacimientoSel = mapeado.provNacimientoSel;

      if (this.form.idDepartamentoDomicilio) {
        this.provincias = await this.ubigeoService.getProvincias(
          this.form.idDepartamentoDomicilio,
        );
      }
      if (this.form.idProvinciaDomicilio) {
        this.distritos = await this.ubigeoService.getDistritos(
          this.form.idProvinciaDomicilio,
        );
      }
      if (this.depNacimientoSel) {
        this.provNacimiento = await this.ubigeoService.getProvincias(
          this.depNacimientoSel,
        );
      }
      if (this.provNacimientoSel) {
        this.distritosNacimiento = await this.ubigeoService.getDistritos(
          this.provNacimientoSel,
        );
      }
      this.reniecConsumido = true;
      this.camposBloqueados = true;
      this.aviso = 'Datos cargados desde RENIEC. Los campos se encuentran bloqueados.';
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo consultar a RENIEC.';
    } finally {
      this.consultandoReniec = false;
    }
  }

  async onCambioTipoDocumento(): Promise<void> {
    this.reniecConsumido = false;
    this.aviso = '';
    if (this.form.idDocIdentidad !== '1') {
      this.camposBloqueados = false;
      return;
    }
    await this.verificarParametro296();
  }

  async verificarParametro296(): Promise<void> {
    try {
      const param = await this.maestrosApi.getParametro(296);
      const paramArr = Array.isArray(param) ? param : [param];
      const parametro = paramArr[0];
      this.camposBloqueados = parametro?.valorTexto === 'S';
    } catch {
      this.camposBloqueados = false;
    }
  }

  async cargarPaciente(pacienteId: number | string): Promise<void> {
    this.cargandoDetalle = true;
    this.error = '';
    try {
      const detalle = await this.pacientesApi.obtener(pacienteId);
      const d = detalle as unknown as Record<string, unknown>;
      this.detalleOriginal = d;
      this.form.idDocIdentidad = texto(d.docIdentityId);
      this.form.nroDocumento = texto(d.documentNumber);
      this.form.apellidoPaterno = texto(d.paternalSurname);
      this.form.apellidoMaterno = texto(d.maternalSurname);
      this.form.primerNombre = texto(d.firstName);
      this.form.segundoNombre = texto(d.secondName);
      this.form.tercerNombre = texto(d.thirdName);
      if (d.dateOfBirth) {
        this.form.fechaNacimiento = texto(d.dateOfBirth).slice(0, 10);
      }
      this.form.idTipoSexo = texto(d.sexTypeId);
      this.form.telefono = texto(d.phone);
      this.form.celular = texto(d.cellphone);
      this.form.email = texto(d.email);
      this.form.idPaisNacimiento = texto(d.birthCountryId);
      this.form.idDistritoNacimiento = texto(d.birthDistrictId);
      this.form.idCentroPobladoNacimiento = texto(d.birthCenterId);
      this.form.idPaisProcedencia = texto(d.originCountryId);
      this.form.idDistritoProcedencia = texto(d.originDistrictId);
      this.form.idCentroPobladoProcedencia = texto(d.originCenterId);
      this.form.idPaisDomicilio = texto(d.homeCountryId);
      this.form.idDistritoDomicilio = texto(d.homeDistrictId);
      this.form.idCentroPobladoDomicilio = texto(d.homeCenterId);
      this.form.direccionDomicilio = texto(d.homeAddress);
      this.form.idEstadoCivil = texto(d.maritalStatusId);
      this.form.idGradoInstruccion = texto(d.educationDegreeId);
      this.form.idTipoOcupacion = texto(d.occupationTypeId);
      this.form.nombrePadre = texto(d.fatherName);
      this.form.nombreMadre = texto(d.motherName);
      this.form.idEtnia = texto(d.ethnicityId);
      this.form.idIdioma = texto(d.languageId);
      this.form.discapacidad = texto(d.disabilityId);
      this.form.incapacidad = texto(d.incapacityId);

      await this.cargarUbigeoEdicion();
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudieron cargar los datos del paciente.';
    } finally {
      this.cargandoDetalle = false;
    }
  }

  // Al editar, el detalle solo trae distrito/centro poblado. Se deriva el
  // departamento y provincia del código de distrito y se recargan las listas
  // en cascada para que los selects muestren los valores guardados.
  private async cargarUbigeoEdicion(): Promise<void> {
    const derivar = (idDistrito: string): { dep: string; prov: string } => {
      const n = Number(idDistrito);
      if (!Number.isNaN(n) && n >= 100) {
        return {
          dep: String(Math.floor(n / 10000)),
          prov: String(Math.floor(n / 100)),
        };
      }
      return { dep: '', prov: '' };
    };

    if (this.form.idDistritoDomicilio) {
      const { dep, prov } = derivar(this.form.idDistritoDomicilio);
      if (dep) {
        this.form.idDepartamentoDomicilio = dep;
        this.provincias = await this.ubigeoService.getProvincias(dep);
      }
      if (prov) {
        this.form.idProvinciaDomicilio = prov;
        this.distritos = await this.ubigeoService.getDistritos(prov);
      }
      if (this.form.idDistritoDomicilio) {
        this.comunidades = await this.ubigeoService.getCentrosPoblados(
          this.form.idDistritoDomicilio,
        );
      }
    }

    if (this.form.idDistritoNacimiento) {
      const { dep, prov } = derivar(this.form.idDistritoNacimiento);
      if (dep) {
        this.depNacimientoSel = dep;
        this.provNacimiento = await this.ubigeoService.getProvincias(dep);
      }
      if (prov) {
        this.provNacimientoSel = prov;
        this.distritosNacimiento = await this.ubigeoService.getDistritos(prov);
      }
      this.comunidadesNacimiento = await this.ubigeoService.getCentrosPoblados(
        this.form.idDistritoNacimiento,
      );
    }

    if (this.form.idDistritoProcedencia) {
      const { dep, prov } = derivar(this.form.idDistritoProcedencia);
      if (dep) {
        this.depProcedenciaSel = dep;
        this.provProcedencia = await this.ubigeoService.getProvincias(dep);
      }
      if (prov) {
        this.provProcedenciaSel = prov;
        this.distritosProcedencia = await this.ubigeoService.getDistritos(prov);
      }
      this.comunidadesProcedencia = await this.ubigeoService.getCentrosPoblados(
        this.form.idDistritoProcedencia,
      );
    }
  }

  async guardar(
    pacienteId: number | string | null,
    modo: 'paciente' | 'triaje',
  ): Promise<string | null> {
    const errorValidacion = this.validarGuardado();
    if (errorValidacion) {
      this.error = errorValidacion;
      return null;
    }

    this.guardando = true;
    this.error = '';

    try {
      if (pacienteId) {
        await this.actualizarPaciente(pacienteId);
      } else if (modo === 'triaje') {
        await this.guardarComoTriaje();
      } else {
        await this.guardarComoPaciente();
      }
      return `${normalizarNombre(this.form.apellidoPaterno)} ${normalizarNombre(this.form.apellidoMaterno)}, ${normalizarNombre(this.form.primerNombre)} ${normalizarNombre(this.form.segundoNombre)}`.trim();
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo registrar el paciente.';
      return null;
    } finally {
      this.guardando = false;
    }
  }

  private validarGuardado(): string | null {
    const f = this.form;
    const nroDocumento = sanitizar(f.nroDocumento);
    const apellidoPaterno = normalizarNombre(f.apellidoPaterno);
    const primerNombre = normalizarNombre(f.primerNombre);
    if (!nroDocumento || !apellidoPaterno || !primerNombre) {
      return 'Complete al menos documento, apellido paterno y primer nombre.';
    }
    const email = sanitizar(f.email);
    if (
      email &&
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      return 'El correo electrónico no tiene un formato válido.';
    }
    if (f.fechaNacimiento) {
      const hoy = new Date().toISOString().slice(0, 10);
      if (f.fechaNacimiento > hoy) {
        return 'La fecha de nacimiento no puede ser futura.';
      }
    }
    const telefono = sanitizar(f.telefono);
    const celular = sanitizar(f.celular);
    if (telefono && !/^\d{6,15}$/.test(telefono)) {
      return 'El teléfono debe tener entre 6 y 15 dígitos.';
    }
    if (celular && !/^\d{6,15}$/.test(celular)) {
      return 'El celular debe tener entre 6 y 15 dígitos.';
    }
    return null;
  }

  private construirPayload(
    base: Record<string, unknown>,
  ): Record<string, unknown> {
    const f = this.form;
    const name = (v: string | undefined | null) =>
      normalizarNombre(v || '') || undefined;
    const san = (v: string | undefined | null) =>
      sanitizar(v || '') || undefined;

    const p: Record<string, unknown> = {
      ...base,
      nroDocumento: san(f.nroDocumento),
      apellidoPaterno: name(f.apellidoPaterno),
      primerNombre: name(f.primerNombre),
      apellidoMaterno: name(f.apellidoMaterno),
      segundoNombre: name(f.segundoNombre),
      tercerNombre: name(f.tercerNombre),
      fechaNacimiento: f.fechaNacimiento
        ? new Date(`${f.fechaNacimiento}T00:00:00`).toISOString()
        : undefined,
      email: san(f.email),
      telefono: san(f.telefono),
      celular: san(f.celular),
    };

    Object.keys(p).forEach((k) => {
      if (p[k] === undefined) delete p[k];
    });
    return p;
  }

  private async guardarComoTriaje(): Promise<void> {
    const f = this.form;
    const payload = this.construirPayload({
      idDocIdentidad: num(f.idDocIdentidad),
      idSexo: num(f.idTipoSexo),
      idEstadoCivil: num(f.idEstadoCivil),
      idDepartamentoDomicilio: num(f.idDepartamentoDomicilio),
      idProvinciaDomicilio: num(f.idProvinciaDomicilio),
      idDistritoDomicilio: num(f.idDistritoDomicilio),
      idComunidadDomicilio: num(f.idCentroPobladoDomicilio),
      idFuenteFinanciamiento: num(f.idFuenteFinanciamiento),
      idEsAccidenteTransito:
        f.idEsAccidenteTransito !== ''
          ? num(f.idEsAccidenteTransito)
          : undefined,
      idEstadollego: num(f.idEstadollego),
      gestante: f.gestante !== '' ? num(f.gestante) : undefined,
      direccion: sanitizar(f.direccionDomicilio) || undefined,
      motivo: sanitizar(f.motivo) || undefined,
    });
    await this.triajeApi.registrar(payload as RegistroTriajePayload);
  }

  private async guardarComoPaciente(): Promise<void> {
    const f = this.form;
    const payload = this.construirPayload({
      idDocIdentidad: num(f.idDocIdentidad),
      idTipoSexo: num(f.idTipoSexo),
      idPaisNacimiento: num(f.idPaisNacimiento),
      idDistritoNacimiento: num(f.idDistritoNacimiento),
      idCentroPobladoNacimiento: num(f.idCentroPobladoNacimiento),
      idPaisProcedencia: num(f.idPaisProcedencia),
      idDistritoProcedencia: num(f.idDistritoProcedencia),
      idCentroPobladoProcedencia: num(f.idCentroPobladoProcedencia),
      idPaisDomicilio: num(f.idPaisDomicilio),
      idDistritoDomicilio: num(f.idDistritoDomicilio),
      idCentroPobladoDomicilio: num(f.idCentroPobladoDomicilio),
      idEstadoCivil: num(f.idEstadoCivil),
      idGradoInstruccion: num(f.idGradoInstruccion),
      idTipoOcupacion: num(f.idTipoOcupacion),
      nombrePadre: normalizarNombre(f.nombrePadre) || undefined,
      nombreMadre: normalizarNombre(f.nombreMadre) || undefined,
      idEtnia: num(f.idEtnia),
      idIdioma: num(f.idIdioma),
      direccionDomicilio: sanitizar(f.direccionDomicilio) || undefined,
      discapacidad: f.discapacidad !== '' ? num(f.discapacidad) : undefined,
      incapacidad: f.incapacidad !== '' ? num(f.incapacidad) : undefined,
    });
    await this.pacientesApi.registrar(
      payload as unknown as RegistroPacientePayload,
    );
  }

  private async actualizarPaciente(pacienteId: number | string): Promise<void> {
    const f = this.form;
    const d = this.detalleOriginal ?? {};
    const name = (v: string | undefined | null) =>
      normalizarNombre(v || '') || undefined;

    const payload: ActualizarPacientePayload = {
      documentNumber: sanitizar(f.nroDocumento),
      paternalSurname: normalizarNombre(f.apellidoPaterno),
      firstName: normalizarNombre(f.primerNombre),
      birthCountryId: num(f.idPaisNacimiento) ?? num(texto(d.birthCountryId)),
      maternalSurname:
        name(f.apellidoMaterno) ?? name(texto(d.maternalSurname)),
      homeAddress:
        sanitizar(f.direccionDomicilio) ||
        sanitizar(texto(d.homeAddress)) ||
        undefined,
      originCountryId:
        num(f.idPaisProcedencia) ?? num(texto(d.originCountryId)),
      secondName: name(f.segundoNombre) ?? name(texto(d.secondName)),
      thirdName: name(f.tercerNombre) ?? name(texto(d.thirdName)),
      dateOfBirth: f.fechaNacimiento
        ? new Date(`${f.fechaNacimiento}T00:00:00`).toISOString()
        : undefined,
      phone: sanitizar(f.telefono) || sanitizar(texto(d.phone)) || undefined,
      cellphone:
        sanitizar(f.celular) || sanitizar(texto(d.cellphone)) || undefined,
      autoGenerated: texto(d.autoGenerated) || undefined,
      sexTypeId: num(f.idTipoSexo) ?? num(texto(d.sexTypeId)),
      originId: num(texto(d.originId)),
      educationDegreeId:
        num(f.idGradoInstruccion) ?? num(texto(d.educationDegreeId)),
      maritalStatusId: num(f.idEstadoCivil) ?? num(texto(d.maritalStatusId)),
      docIdentityId: num(f.idDocIdentidad) ?? num(texto(d.docIdentityId)),
      occupationTypeId:
        num(f.idTipoOcupacion) ?? num(texto(d.occupationTypeId)),
      homeCenterId:
        num(f.idCentroPobladoDomicilio) ?? num(texto(d.homeCenterId)),
      fatherName: name(f.nombrePadre) ?? name(texto(d.fatherName)),
      motherName: name(f.nombreMadre) ?? name(texto(d.motherName)),
      homeCountryId: num(f.idPaisDomicilio) ?? num(texto(d.homeCountryId)),
      birthCenterId:
        num(f.idCentroPobladoNacimiento) ?? num(texto(d.birthCenterId)),
      originCenterId:
        num(f.idCentroPobladoProcedencia) ?? num(texto(d.originCenterId)),
      originDistrictId:
        num(f.idDistritoProcedencia) ?? num(texto(d.originDistrictId)),
      homeDistrictId:
        num(f.idDistritoDomicilio) ?? num(texto(d.homeDistrictId)),
      birthDistrictId:
        num(f.idDistritoNacimiento) ?? num(texto(d.birthDistrictId)),
      ethnicityId:
        f.idEtnia !== '' && f.idEtnia !== undefined && f.idEtnia !== null
          ? String(f.idEtnia)
          : texto(d.ethnicityId) || undefined,
      languageId: num(f.idIdioma) ?? num(texto(d.languageId)),
      email: sanitizar(f.email) || sanitizar(texto(d.email)) || undefined,
      disabilityId:
        f.discapacidad === ''
          ? num(texto(d.disabilityId))
          : num(f.discapacidad),
      incapacityId:
        f.incapacidad === '' ? num(texto(d.incapacityId)) : num(f.incapacidad),
    };
    const hc = Number(texto(d.historyNumber));
    if (!Number.isNaN(hc)) payload.historyNumber = hc;

    Object.keys(payload).forEach((k) => {
      if (payload[k as keyof typeof payload] === undefined)
        delete payload[k as keyof typeof payload];
    });

    await this.pacientesApi.actualizar(pacienteId, payload);
  }
}

function texto(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function num(v: string | undefined | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
