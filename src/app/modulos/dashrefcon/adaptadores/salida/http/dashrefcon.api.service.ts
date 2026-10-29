import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';

// Fila devuelta por el endpoint que invoca el SP
// usp_go_ListarReferenciasPorMesyAnio: cantidad de referencias de un estado
// agrupadas por mes.
export interface ReferenciaPorMes {
  estado: string;
  conteo: number;
  mes: number;
  nombreMes: string;
  cantidad: number;
}

export interface ListarReferenciasParams {
  fechaInicio: string;
  fechaFin: string;
  estado?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class DashrefconApiService {
  private readonly apiClient = inject(ApiClientService);

  // Lista las referencias/contrarreferencias por rango de fechas y estado.
  // El estado es opcional: si no se envía, el SP devuelve todos (0).
  listarReferencias(
    params: ListarReferenciasParams,
  ): Promise<ReferenciaPorMes[]> {
    const query = new URLSearchParams({
      fechaInicio: params.fechaInicio,
      fechaFin: params.fechaFin,
    });
    if (params.estado !== null && params.estado !== undefined) {
      query.set('estado', String(params.estado));
    }
    return this.apiClient.request<ReferenciaPorMes[]>(
      `/api/v1/dashrefcon/referencias?${query.toString()}`,
    );
  }
}
