import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type { IFilaBackend } from '../../../../../compartido/tipos/api-tipos';

export interface BandejaReferenciaParams {
  fini: string;
  ffin: string;
  filtro?: string;
}

export interface EstablecimientoBusqueda {
  idEstablecimiento: number;
  codigo: string;
  nombre: string;
  distrito: string;
  provincia: string;
  departamento: string;
  nombreLargo: string;
}

export interface UpsMinsa {
  codUps: string;
  descripcion: string;
}

export interface ListadoUpsMinsaResponse {
  codigo: string;
  mensaje: string;
  datos: UpsMinsa[];
}

export interface EspecialidadMinsa {
  codigo_especialidad: string;
  especialidad: string;
}

export interface ListadoEspecialidadesMinsaResponse {
  codigo: string;
  data: EspecialidadMinsa[];
}

export interface SaveCita {
  fecha_vencimiento_sis: string;
  frecuencia_cardiaca: string;
  frecuencia_respiratoria: string;
  id_financiador: string;
  num_afil: string;
  peso: string;
  presion_arterial_diastolica: string;
  presion_arterial_sistolica: string;
  resumeanamnesis: string;
  resumeexfisico: string;
  talla: string;
  temperatura: string;
}

export interface SaveCpt {
  cpt_1: string;
  cpt_2: string;
  cpt_3: string;
}

export interface SaveMotivoReferencia {
  idmotivoref: string;
  obsmotivoref: string;
}

export interface SaveDatosReferencia {
  codEspecialidad: string;
  condicion: string;
  desc_Cartera_servicio: string;
  fechaReferencia: string;
  fgRegistro: string;
  horaReferencia: string;
  idCarteraServicio: string;
  idEnvio: string;
  idTipoAtencion: string;
  idTipoTransporte: string;
  idestabDestino: string;
  idestabOrigen: string;
  idupsOrigen: string;
  idupsdestino: string;
  motivo_referencia: SaveMotivoReferencia;
  notasobs: string;
}

export interface SaveDiagnostico {
  diagnostico: string;
  nro_diagnostico: string;
  tipo_diagnostico: string;
}

export interface SavePaciente {
  apelmatpac: string;
  apelpatpac: string;
  celularpac: string;
  correopac: string;
  direccion: string;
  fechnacpac: string;
  idsexo: string;
  idtipodoc: string;
  nombpac: string;
  nrohis: string;
  numdoc: string;
  telefonopac: string;
  ubigeoactual: string;
  ubigeoreniec: string;
}

export interface SavePersonalRegistra {
  tipoDocumento: string;
  nroDocumento: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  fechaNacimiento: string;
  idcolegio: string;
  idprofesion: string;
  sexo: string;
}

export interface SavePersonaEstablecimiento {
  apelmata: string;
  apelpata: string;
  fechanac: string;
  idcolegio: string;
  idprofesion: string;
  idsexo: string;
  idtipodoc: string;
  nombper: string;
  numdoc: string;
}

export interface SaveResponsableReferencia {
  apelmatrefiere: string;
  apelpatrefiere: string;
  fechanacrefiere: string;
  idcolegioref: string;
  idprofesionref: string;
  idsexorefiere: string;
  idtipodocref: string;
  nombperrefiere: string;
  numdocref: string;
}

export interface SaveTratamiento {
  cantidad: string;
  codigo_medicamento: string;
  frecuencia: string;
  nro_diagnostico: string;
  nro_tratamiento: string;
  periodo: string;
  unidad_tiempo: string;
}

export interface SavePersonaAcompana {
  apelmatacomp: string;
  apelpatacomp: string;
  fechanacacomp: string;
  idcolegioacomp: string;
  idprofesionacomp: string;
  idsexoacomp: string;
  idtipodocacmop: string;
  nombperacomp: string;
  numdocacomp: string;
}

export interface SaveReferenciaPayload {
  cita: SaveCita;
  cpt: SaveCpt;
  datos_referencia: SaveDatosReferencia;
  diagnostico: SaveDiagnostico[];
  paciente: SavePaciente;
  persona_acompana: SavePersonaAcompana;
  persona_establecimiento: SavePersonaEstablecimiento;
  personal_registra: SavePersonalRegistra;
  responsable_referencia: SaveResponsableReferencia;
  tratamiento: SaveTratamiento[];
}

export interface RespuestaSaveReferencia {
  codigo: string;
  mensaje?: string;
  datos?: Record<string, unknown> | string;
}

@Injectable({ providedIn: 'root' })
export class BandejaRefApiService {
  private apiClient = inject(ApiClientService);

  listarReferencias(params: BandejaReferenciaParams): Promise<IFilaBackend[]> {
    const query = new URLSearchParams({
      fini: params.fini,
      ffin: params.ffin,
    });
    if (params.filtro) query.append('filtro', params.filtro);
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/referencias?${query.toString()}`,
    );
  }

  obtenerDatosReferencia(idAtencion: number): Promise<IFilaBackend> {
    return this.apiClient.request<IFilaBackend>(
      `/api/v1/triaje/referencias/${idAtencion}`,
    );
  }

  buscarEstablecimientos(filtro: string): Promise<EstablecimientoBusqueda[]> {
    const query = new URLSearchParams({ q: filtro, tipo: '1' });
    return this.apiClient.request<EstablecimientoBusqueda[]>(
      `/api/v1/establecimientos?${query.toString()}`,
    );
  }

  listarUpssMinsa(codigoRenipress: string): Promise<ListadoUpsMinsaResponse> {
    return this.apiClient.request<ListadoUpsMinsaResponse>(
      `/api/v1/dashrefcon/upss/${encodeURIComponent(codigoRenipress)}`,
    );
  }

  listarEspecialidadesMinsa(): Promise<ListadoEspecialidadesMinsaResponse> {
    return this.apiClient.request<ListadoEspecialidadesMinsaResponse>(
      '/api/v1/dashrefcon/especialidades-minsa',
    );
  }

  obtenerCabeceraReferencia(idCuentaAtencion: number): Promise<IFilaBackend> {
    return this.apiClient.request<IFilaBackend>(
      `/api/v1/triaje/referencias-cabecera/${idCuentaAtencion}`,
    );
  }

  listarDiagnosticosReferencia(
    idCuentaAtencion: number,
  ): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/referencias-detalle/${idCuentaAtencion}`,
    );
  }

  listarTratamientoReferencia(
    idCuentaAtencion: number,
  ): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/referencias-tratamiento/${idCuentaAtencion}`,
    );
  }

  listarCptReferencia(idCuentaAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/referencias-cpt/${idCuentaAtencion}`,
    );
  }

  enviarReferenciaMinsa(
    payload: SaveReferenciaPayload,
  ): Promise<RespuestaSaveReferencia> {
    return this.apiClient.request<RespuestaSaveReferencia>(
      '/api/v1/dashrefcon/enviar-referencia',
      { method: 'POST', body: JSON.stringify(payload) },
    );
  }
}
