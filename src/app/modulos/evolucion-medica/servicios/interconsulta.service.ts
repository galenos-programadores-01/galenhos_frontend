import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';

export interface Interconsulta {
  idInterconsulta?: number;
  idAtencionOrigen: number;
  IdEspecialidad: number;
  idMedicoDestino: number;
  motivo: string;
  fechaSolicitud?: string;
  estado?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InterconsultaService {
  private readonly api = inject(ApiClientService);

  async obtenerPorId(id: number): Promise<Interconsulta | null> {
    try {
      const data = await this.api.request<Interconsulta>(
        `/api/v1/interconsultas/${id}`,
        { method: 'GET' },
      );
      return data;
    } catch (error) {
      console.error('Error al obtener interconsulta:', error);
      return null;
    }
  }

  async listarPorServicio(tipoServicio: string): Promise<Interconsulta[]> {
    try {
      const data = await this.api.request<Interconsulta[]>(
        `/api/v1/interconsultas/servicio/${tipoServicio}`,
        { method: 'GET' },
      );
      return data || [];
    } catch (error) {
      console.error('Error al listar interconsultas:', error);
      return [];
    }
  }

  async listarPorAtencion(idAtencion: number): Promise<Interconsulta[]> {
    try {
      const data = await this.api.request<Interconsulta[]>(
        `/api/v1/interconsultas/atencion/${idAtencion}`,
        { method: 'GET' },
      );
      return data || [];
    } catch (error) {
      console.error('Error al listar interconsultas por atenci\u00f3n:', error);
      return [];
    }
  }

  async crear(interconsulta: Interconsulta): Promise<boolean> {
    try {
      await this.api.request('/api/v1/interconsultas', {
        method: 'POST',
        body: JSON.stringify(interconsulta),
      });
      return true;
    } catch (error) {
      console.error('Error al crear interconsulta:', error);
      return false;
    }
  }

  async actualizarEstado(id: number, estado: string): Promise<boolean> {
    try {
      await this.api.request(`/api/v1/interconsultas/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
      });
      return true;
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      return false;
    }
  }

  async firmar(id: number, dataB64: string): Promise<boolean> {
    try {
      await this.api.request(`/api/v1/interconsultas/${id}/firma`, {
        method: 'POST',
        body: JSON.stringify({ dataB64 }),
      });
      return true;
    } catch (error) {
      console.error('Error al firmar interconsulta:', error);
      return false;
    }
  }

  async listarEspecialidades(): Promise<EspecialidadInterconsulta[]> {
    try {
      const data = await this.api.request<EspecialidadInterconsulta[]>(
        '/api/v1/interconsultas/especialidades',
        { method: 'GET' },
      );
      return data || [];
    } catch (error) {
      console.error('Error al listar especialidades de interconsulta:', error);
      return [];
    }
  }

  async listarMedicosPorEspecialidad(
    IdEspecialidad: number,
  ): Promise<MedicoInterconsulta[]> {
    try {
      const data = await this.api.request<MedicoInterconsulta[]>(
        `/api/v1/interconsultas/medicos/${IdEspecialidad}`,
        { method: 'GET' },
      );
      return data || [];
    } catch (error) {
      console.error('Error al listar m\u00e9dicos por especialidad:', error);
      return [];
    }
  }
}

export interface EspecialidadInterconsulta {
  IdEspecialidad: number;
  nombre?: string | null;
  descripcionLarga?: string | null;
}

export interface MedicoInterconsulta {
  idMedico: number;
  idEmpleado: number;
  codigoPlanilla?: string | null;
  medico?: string | null;
}
