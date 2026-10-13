import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type {
  AtencionCEGuardarPayload,
  CatalogoLabHISItem,
  ColaFiltrosCE,
  ColaPacienteCEItem,
  DestinoAtencionItem,
  FichaAtencionCEDetalle,
  HistorialAtencionDetalle,
  HistorialAtencionItem,
  HistorialProcedimientoItem,
  HistorialReporteOperatorioItem,
  PacienteDatosAdicionalesCE,
  PacienteHistorialTriajeItem,
  ServicioMedicoItem,
  TriajeConsultaSignosVitales,
} from '../../../tipos/atencion-ce.tipos';

export interface DiagnosticoBusquedaItem {
  readonly idDiagnostico: number;
  readonly codigoCIE10: string;
  readonly descripcion: string;
}

@Injectable({
  providedIn: 'root',
})
export class AtencionCEApiService {
  private readonly apiClient = inject(ApiClientService);

  async listarCola(filtros: ColaFiltrosCE): Promise<ColaPacienteCEItem[]> {
    const queryParams = new URLSearchParams();
    if (filtros.idMedico && filtros.idMedico > 0) {
      queryParams.set('idMedico', String(filtros.idMedico));
    }
    if (filtros.idServicio && filtros.idServicio > 0) {
      queryParams.set('idServicio', String(filtros.idServicio));
    }
    if (filtros.fecha) {
      queryParams.set('fecha', filtros.fecha);
    }
    if (filtros.filtro && filtros.filtro.trim() !== '') {
      queryParams.set('filtro', filtros.filtro.trim());
    }

    const query = queryParams.toString();
    const url = `/api/v1/atencion-ce/cola${query ? `?${query}` : ''}`;
    return this.apiClient.request<ColaPacienteCEItem[]>(url, {
      method: 'GET',
    });
  }

  async obtenerFicha(idAtencion: number): Promise<FichaAtencionCEDetalle> {
    return this.apiClient.request<FichaAtencionCEDetalle>(
      `/api/v1/atencion-ce/${idAtencion}`,
      {
        method: 'GET',
      },
    );
  }

  async guardarFicha(
    payload: AtencionCEGuardarPayload,
  ): Promise<{ guardado: boolean }> {
    return this.apiClient.request<{ guardado: boolean }>(
      '/api/v1/atencion-ce',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  }

  async listarDestinos(): Promise<DestinoAtencionItem[]> {
    return this.apiClient.request<DestinoAtencionItem[]>(
      '/api/v1/atencion-ce/destinos',
      {
        method: 'GET',
      },
    );
  }

  async listarCatalogoLabs(): Promise<CatalogoLabHISItem[]> {
    try {
      const respuesta = await this.apiClient.request<CatalogoLabHISItem[]>(
        '/api/v1/atencion-ce/catalogo-labs',
        {
          method: 'GET',
        },
      );
      return respuesta || [];
    } catch {
      return [];
    }
  }

  async obtenerTriajePorAtencion(
    idAtencion: number,
  ): Promise<TriajeConsultaSignosVitales | null> {
    try {
      const respuesta = await this.apiClient.request<Record<
        string,
        unknown
      > | null>(`/api/v1/triaje/consulta/atencion/${idAtencion}`, {
        method: 'GET',
      });
      if (!respuesta) return null;

      return {
        presionArterial:
          (respuesta.PresionArterial as string) ||
          (respuesta.PA as string) ||
          '',
        frecuenciaCardiaca:
          Number(respuesta.FrecuenciaCardiaca || respuesta.FC) || undefined,
        frecuenciaRespiratoria:
          Number(respuesta.FrecuenciaRespiratoria || respuesta.FR) || undefined,
        temperatura:
          Number(respuesta.Temperatura || respuesta.Temp) || undefined,
        saturacion:
          Number(respuesta.Saturacion || respuesta.SatO2) || undefined,
        peso: Number(respuesta.Peso) || undefined,
        talla: Number(respuesta.Talla) || undefined,
        imc: Number(respuesta.IMC) || undefined,
        fechaRegistro: (respuesta.FechaRegistro as string) || '',
        observacion: (respuesta.Observacion as string) || '',
      };
    } catch {
      return null;
    }
  }

  async buscarDiagnosticos(
    termino: string,
  ): Promise<DiagnosticoBusquedaItem[]> {
    if (!termino || termino.trim().length < 2) return [];
    try {
      return await this.apiClient.request<DiagnosticoBusquedaItem[]>(
        `/api/v1/diagnosticos/search?q=${encodeURIComponent(termino.trim())}`,
        { method: 'GET' },
      );
    } catch {
      return [];
    }
  }

  async buscarProcedimientos(
    termino: string,
  ): Promise<ProcedimientoBusquedaItem[]> {
    if (!termino || termino.trim().length < 2) return [];
    try {
      const respuesta = await this.apiClient.request<{
        items: ProcedimientoBusquedaItem[];
      }>(
        `/api/v1/servicios-catalogo?filtro=${encodeURIComponent(termino.trim())}&pageSize=20`,
        { method: 'GET' },
      );
      return respuesta?.items || [];
    } catch {
      return [];
    }
  }

  async obtenerDatosAdicionales(
    idPaciente: number,
  ): Promise<PacienteDatosAdicionalesCE | null> {
    if (!idPaciente || idPaciente <= 0) return null;
    try {
      return await this.apiClient.request<PacienteDatosAdicionalesCE>(
        `/api/v1/pacientes/${idPaciente}/datos-adicionales`,
        { method: 'GET' },
      );
    } catch {
      return null;
    }
  }

  async guardarDatosAdicionales(
    idPaciente: number,
    datos: PacienteDatosAdicionalesCE,
  ): Promise<void> {
    if (!idPaciente || idPaciente <= 0) return;
    try {
      await this.apiClient.request(
        `/api/v1/pacientes/${idPaciente}/datos-adicionales`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datos),
        },
      );
    } catch {}
  }

  async buscarExamenesApoyo(
    termino: string,
  ): Promise<ExamenApoyoBusquedaItem[]> {
    if (!termino || termino.trim().length < 2) return [];
    try {
      return await this.apiClient.request<ExamenApoyoBusquedaItem[]>(
        `/api/v1/catalogos/examenes?q=${encodeURIComponent(termino.trim())}`,
        { method: 'GET' },
      );
    } catch {
      return [];
    }
  }

  async listarEspecialidades(): Promise<EspecialidadCatalogoItem[]> {
    try {
      const respuesta = await this.apiClient.request<
        Array<{
          id?: number;
          IdEspecialidad?: number;
          idEspecialidad?: number;
          nombre?: string;
          descripcionLarga?: string;
        }>
      >('/api/v1/especialidades', { method: 'GET' });

      if (!respuesta || !Array.isArray(respuesta)) return [];

      return respuesta.map((esp) => {
        const idFinal = esp.id ?? esp.IdEspecialidad ?? esp.idEspecialidad ?? 0;
        const nombreFinal = (
          esp.nombre ||
          esp.descripcionLarga ||
          'Especialidad'
        ).trim();
        return {
          id: idFinal,
          nombre: nombreFinal,
        };
      });
    } catch {
      return [];
    }
  }

  async obtenerHistorialAtenciones(
    idPaciente: number,
  ): Promise<HistorialAtencionItem[]> {
    try {
      const respuesta = await this.apiClient.request<HistorialAtencionItem[]>(
        `/api/v1/atencion-ce/historial-paciente/${idPaciente}`,
        { method: 'GET' },
      );
      return respuesta || [];
    } catch {
      return [];
    }
  }

  async obtenerHistorialAtencionDetalle(
    idAtencion: number,
  ): Promise<HistorialAtencionDetalle | null> {
    try {
      return await this.apiClient.request<HistorialAtencionDetalle>(
        `/api/v1/atencion-ce/historial-atencion-detalle/${idAtencion}`,
        { method: 'GET' },
      );
    } catch {
      return null;
    }
  }

  async obtenerHistorialQuirurgico(
    idPaciente: number,
  ): Promise<HistorialReporteOperatorioItem[]> {
    try {
      const respuesta = await this.apiClient.request<
        HistorialReporteOperatorioItem[]
      >(`/api/v1/atencion-ce/historial-quirurgico-paciente/${idPaciente}`, {
        method: 'GET',
      });
      return respuesta || [];
    } catch {
      return [];
    }
  }

  async obtenerHistorialProcedimientos(
    idPaciente: number,
  ): Promise<HistorialProcedimientoItem[]> {
    try {
      const respuesta = await this.apiClient.request<
        HistorialProcedimientoItem[]
      >(`/api/v1/atencion-ce/historial-procedimientos-paciente/${idPaciente}`, {
        method: 'GET',
      });
      return respuesta || [];
    } catch {
      return [];
    }
  }

  async obtenerHistorialTriajePaciente(
    idPaciente: number,
  ): Promise<PacienteHistorialTriajeItem[]> {
    try {
      const respuesta = await this.apiClient.request<
        PacienteHistorialTriajeItem[]
      >(`/api/v1/atencion-ce/historial-triaje-paciente/${idPaciente}`, {
        method: 'GET',
      });
      return respuesta || [];
    } catch {
      return [];
    }
  }

  async listarServiciosMedico(
    idEmpleado: number,
    idTipoServicio: number = 1,
  ): Promise<ServicioMedicoItem[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('idEmpleado', String(idEmpleado || -100));
      queryParams.set('idTipoServicio', String(idTipoServicio || 1));
      const respuesta = await this.apiClient.request<ServicioMedicoItem[]>(
        `/api/v1/atencion-ce/servicios-medico?${queryParams.toString()}`,
        {
          method: 'GET',
        },
      );
      return respuesta || [];
    } catch {
      return [];
    }
  }
}

export interface ProcedimientoBusquedaItem {
  readonly idProducto: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly cpt?: string;
  readonly precioParticular?: number;
  readonly precioSis?: number;
}

export interface ExamenApoyoBusquedaItem {
  readonly idProducto: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly esCPT?: boolean;
}

export interface EspecialidadCatalogoItem {
  readonly id: number;
  readonly nombre: string;
}
