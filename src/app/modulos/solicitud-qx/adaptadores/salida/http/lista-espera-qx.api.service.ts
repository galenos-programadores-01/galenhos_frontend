import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type { IFilaBackend } from '../../../../../compartido/tipos/api-tipos';

export interface ListaEsperaQxParams {
  fecha: string;
  fechaFin: string;
  paciente?: string;
  idEspecialidad?: number;
}

export interface MedicoListaEspera {
  idMedico: number;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  dmedico?: string;
}

export interface ListaEsperaQxCrearPayload {
  idPaciente: number;
  idMedico: number;
  fechaOrden: string;
  diagnostico: number;
  idEspecialidad: number;
  fechaLaboratorio: string;
  fechaICCardio: string;
  fechaICNeumo: string;
  fechaICAnestesio: string;
  observacion: string;
}

export interface DiagnosticoItem {
  idDiagnostico: number;
  codigoCIE10: string;
  descripcion: string;
}

export interface EspecialidadItem {
  idEspecialidad: number;
  nombre: string;
}

export interface ListaEsperaQxReporteItem {
  id: number;
  nroHistoriaClinica: number;
  nroDocumento: string;
  paciente: string;
  edad: number;
  telefono: string;
  fechaOrden: string;
  especialidad: string;
  diagnostico: string;
  fechaLab: string;
  fechaICCardio: string;
  fechaICNeumo: string;
  fechaICAnestesio: string;
  medico: string;
  observacion: string;
  diasTranscurridos: number;
}

export interface ListaEsperaQxPaciente {
  nroDocumento: string;
  idDocIdentidad: number | null;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  direccion: string | null;
  telefono: string | null;
  idTipoSexo: number | null;
  fechaNacimiento: string;
  fechaOrden: string;
  diagnostico: string | null;
  idDiagnostico: number | null;
  idEspecialidad: number | null;
  fechaLab: string;
  fechaICCardio: string;
  fechaICNeumo: string;
  fechaICAnestesio: string;
  idMedico: number | null;
  medico: string | null;
  observacion: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ListaEsperaQxApiService {
  private apiClient = inject(ApiClientService);

  listar(params: ListaEsperaQxParams): Promise<IFilaBackend[]> {
    const query = new URLSearchParams({
      fecha: params.fecha,
      fechaFin: params.fechaFin,
    });
    if (params.paciente) query.append('paciente', params.paciente);
    if (params.idEspecialidad)
      query.append('idEspecialidad', String(params.idEspecialidad));
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/lista-espera-qx?${query.toString()}`,
    );
  }

  obtenerPorId(id: number): Promise<ListaEsperaQxPaciente> {
    return this.apiClient.request<ListaEsperaQxPaciente>(
      `/api/v1/lista-espera-qx/${id}`,
    );
  }

  listarMedicos(): Promise<MedicoListaEspera[]> {
    return this.apiClient.request<MedicoListaEspera[]>(
      '/api/v1/medicos-lista-espera',
    );
  }

  crear(payload: ListaEsperaQxCrearPayload): Promise<{ message: string }> {
    return this.apiClient.request<{ message: string }>(
      '/api/v1/lista-espera-qx',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  modificar(
    id: number,
    payload: ListaEsperaQxCrearPayload,
  ): Promise<{ message: string }> {
    return this.apiClient.request<{ message: string }>(
      `/api/v1/lista-espera-qx/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  }

  listarDiagnosticos(filtro: string): Promise<DiagnosticoItem[]> {
    const query = new URLSearchParams({ filtro });
    return this.apiClient.request<DiagnosticoItem[]>(
      `/api/v1/diagnosticos/listar?${query.toString()}`,
    );
  }

  listarEspecialidadesPorDepartamento(
    idDepartamento: number,
  ): Promise<EspecialidadItem[]> {
    return this.apiClient.request<EspecialidadItem[]>(
      `/api/v1/especialidades-departamento/${idDepartamento}`,
    );
  }

  listarEspecialidadesQx(): Promise<EspecialidadItem[]> {
    return this.apiClient.request<EspecialidadItem[]>(
      '/api/v1/especialidades-qx',
    );
  }

  reporte(
    fecha: string,
    fechaFin: string,
    idEspecialidad?: number,
  ): Promise<ListaEsperaQxReporteItem[]> {
    const query = new URLSearchParams({ fecha, fechaFin });
    if (idEspecialidad) query.append('idEspecialidad', String(idEspecialidad));
    return this.apiClient.request<ListaEsperaQxReporteItem[]>(
      `/api/v1/lista-espera-qx/reporte?${query.toString()}`,
    );
  }
}
