import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type { IFilaBackend } from '../../../../../compartido/tipos/api-tipos';

export interface ListaEsperaQxParams {
  fecha: string;
  paciente?: string;
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
  idTipoDocumento: number;
  nroDocumento: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string;
  fechaNacimiento: string;
  idSexo: number;
  telefono: string;
  direccion: string;
  fechaOrden: string;
  diagnostico: string;
  fechaLaboratorio: string;
  fechaICCardio: string;
  fechaICNeumo: string;
  fechaICAnestesio: string;
  medico: string;
  observacion: string;
}

@Injectable({
  providedIn: 'root',
})
export class ListaEsperaQxApiService {
  private apiClient = inject(ApiClientService);

  listar(params: ListaEsperaQxParams): Promise<IFilaBackend[]> {
    const query = new URLSearchParams({ fecha: params.fecha });
    if (params.paciente) query.append('paciente', params.paciente);
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/lista-espera-qx?${query.toString()}`,
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
}
