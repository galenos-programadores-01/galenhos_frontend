import { Injectable, inject } from '@angular/core';
import {
  ApiClientService,
  ApiRequestError,
} from '../../../../../compartido/api-client/api-client.service';
import type {
  IFilaBackend,
  IReniecResultado,
} from '../../../../../compartido/tipos/api-tipos';
import { AuthService } from '../../../../auth/aplicacion/auth.service';

export interface RegistroTriajePayload {
  idTriaje?: number;
  idDocIdentidad?: number;
  nroDocumento?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  primerNombre?: string;
  segundoNombre?: string;
  tercerNombre?: string;
  idSexo?: number;
  fechaNacimiento?: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  idEstadoCivil?: number;
  idDepartamentoDomicilio?: number;
  idProvinciaDomicilio?: number;
  idDistritoDomicilio?: number;
  idComunidadDomicilio?: number;
  idEsAccidenteTransito?: number;
  idFuenteFinanciamiento?: number;
  idEstadollego?: number;
  gestante?: number;
  motivo?: string;
  presionArterial?: string;
  frecCardiaca?: number;
  frecRespiratoria?: number;
  temperatura?: number;
  saturacion?: number;
  fiO2?: number;
  peso?: number;
  talla?: number;
  imc?: number;
  escalaDolor?: number;
  escalaGlasgow?: number;
  tiempoEvolucionCantidad?: number;
  tiempoEvolucionCantidadUnidad?: string;
  idServicio?: number;
  idTipoPrioridad?: number;
}

export interface PendientesAdmisionParams {
  fecha: string;
  filtro?: string;
  nroCta?: number;
  idDepartamento?: number;
  IdEspecialidad?: number;
  idServicio?: number;
  idTipoServicio?: number;
}

export interface CrearAdmisionPayload {
  idTriaje: number;
  idPacienteTriaje: number;
  idMedico?: number;
  nombreAcompanante?: string;
  telefonoAcompanante?: string;
  direccionPaciente?: string;
  observacion?: string;
}

export interface RespuestaSp {
  resultado: string;
}

export interface ReporteTriajeParams {
  id?: number;
  idPaciente?: number;
}

export interface TriajeConsultaPayload {
  idAtencion: number;
  idPaciente: number;
  idEmpleado: number;
  talla?: string;
  peso?: string;
  temperatura?: string;
  pulso?: string;
  frecRespiratoria?: string;
  frecCardiaca?: string;
  frecCardiacaFetal?: string;
  perimCefalico?: string;
  origen?: string;
  perimAbdominal?: string;
  sat02?: string;
  fi02?: string;
  presionArterial?: string;
  hemoglobina?: string;
  observacion?: string;
  imc?: string;
  gestante?: string;
}

export interface TriajeConsultaParams {
  fini: string;
  ffin: string;
  filtro?: string;
  idServicio?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TriajeApiService {
  private apiClient = inject(ApiClientService);
  private authService = inject(AuthService);

  private static readonly RENIEC_TIMEOUT_MS = 30000;

  consultarReniec(nroDocumento: string): Promise<IReniecResultado> {
    const promesa = this.apiClient.request<IReniecResultado>(
      `/api/v1/reniec/${encodeURIComponent(nroDocumento)}?operacion=completo`,
    );
    return Promise.race([
      promesa,
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new ApiRequestError(
                'RENIEC_TIMEOUT',
                'RENIEC tardó demasiado en responder. Intente nuevamente o complete los datos manualmente.',
                0,
              ),
            ),
          TriajeApiService.RENIEC_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  registrar(payload: RegistroTriajePayload): Promise<RespuestaSp> {
    return this.apiClient.request<RespuestaSp>('/api/v1/triaje', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  listar(
    fini: string,
    ffin: string,
    derivadoAServicio = '-100',
    idEstado = '-100',
  ): Promise<IFilaBackend[]> {
    const query = new URLSearchParams({
      fini,
      ffin,
      derivadoAServicio,
      idEstado,
    });
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje?${query.toString()}`,
    );
  }

  listarPendientesAdmision(
    params: PendientesAdmisionParams,
  ): Promise<IFilaBackend[]> {
    const query = new URLSearchParams();
    query.append('fecha', params.fecha);
    if (params.filtro) query.append('filtro', params.filtro);
    if (params.nroCta) query.append('nroCta', String(params.nroCta));
    if (params.idDepartamento)
      query.append('idDepartamento', String(params.idDepartamento));
    if (params.IdEspecialidad)
      query.append('IdEspecialidad', String(params.IdEspecialidad));
    if (params.idServicio)
      query.append('idServicio', String(params.idServicio));
    if (params.idTipoServicio)
      query.append('idTipoServicio', String(params.idTipoServicio));
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/pendientes-admision?${query.toString()}`,
    );
  }

  crearAdmision(payload: CrearAdmisionPayload): Promise<RespuestaSp> {
    return this.apiClient.request<RespuestaSp>('/api/v1/triaje/admision', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  obtenerReporte(params: ReporteTriajeParams): Promise<IFilaBackend[]> {
    const query = new URLSearchParams();
    if (params.id) query.append('id', String(params.id));
    if (params.idPaciente)
      query.append('idPaciente', String(params.idPaciente));
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/reporte?${query.toString()}`,
    );
  }

  obtenerFichaAdmision(idCuentaAtencion: number): Promise<IFilaBackend> {
    return this.apiClient.request<IFilaBackend>(
      `/api/v1/triaje/ficha-admision?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  obtenerDatosInstitucion(): Promise<IFilaBackend> {
    return this.apiClient.request<IFilaBackend>('/api/v1/datos-institucion');
  }

  async agregarFua(idCuentaAtencion: number): Promise<void> {
    try {
      const idEmpleado = this.authService.getIdEmpleado();
      await this.apiClient.request<unknown>('/api/v1/sis/fua/agregar', {
        method: 'POST',
        body: JSON.stringify({
          idCuentaAtencion,
          idEmpleado: idEmpleado > 0 ? idEmpleado : 1,
          nombrePc: '',
        }),
      });
    } catch {}
  }

  imprimirFua(idCuentaAtencion: number): Promise<IFilaBackend> {
    return this.apiClient.request<IFilaBackend>(
      `/api/v1/sis/fua/imprimir?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  diagnosticosFua(idCuentaAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/sis/diagnosticos?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  medicamentosFua(idCuentaAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/sis/medicamentos?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  procedimientosFua(idCuentaAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/sis/procedimientos?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  consumoFua(idCuentaAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/sis/consumo?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  medicosPorEspecialidad(IdEspecialidad: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/medicos/${IdEspecialidad}`,
    );
  }

  listarTriajeConsulta(params: TriajeConsultaParams): Promise<IFilaBackend[]> {
    const query = new URLSearchParams({ fini: params.fini, ffin: params.ffin });
    if (params.filtro) query.append('filtro', params.filtro);
    if (params.idServicio)
      query.append('idServicio', String(params.idServicio));
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/consulta?${query.toString()}`,
    );
  }

  registrarTriajeConsulta(
    payload: TriajeConsultaPayload,
  ): Promise<RespuestaSp> {
    return this.apiClient.request<RespuestaSp>('/api/v1/triaje/consulta', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  obtenerTriajeConsultaPorAtencion(
    idAtencion: number,
  ): Promise<IFilaBackend | null> {
    return this.apiClient.request<IFilaBackend | null>(
      `/api/v1/triaje/consulta/atencion/${idAtencion}`,
    );
  }

  actualizarEstadoTriajeConsulta(
    idTriaje: number,
    estado: string,
  ): Promise<{ ok: boolean }> {
    return this.apiClient.request<{ ok: boolean }>(
      `/api/v1/triaje/consulta/${idTriaje}/estado`,
      {
        method: 'PUT',
        body: JSON.stringify({ estado }),
      },
    );
  }
}
