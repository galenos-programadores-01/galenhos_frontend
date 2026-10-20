import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../../compartido/api-client/api-client.service';
import {
  mapearEstadoReceta,
  mapearHistoricoMedicamento,
  mapearMedicamentoReceta,
  mapearRecetaBandeja,
} from '../../../aplicacion/auditoria-qf.mapper';
import type {
  EstadoRecetaOpcion,
  FiltroBandejaRecetas,
  GuardarEstadoReceta,
  HistoricoMedicamento,
  MedicamentoReceta,
  RecetaBandeja,
} from '../../../aplicacion/auditoria-qf.tipos';

@Injectable({
  providedIn: 'root',
})
export class AuditoriaQfApiService {
  private readonly api = inject(ApiClientService);

  async listarBandeja(filtro: FiltroBandejaRecetas): Promise<RecetaBandeja[]> {
    const query = new URLSearchParams();
    query.set('fechaInicio', filtro.fechaInicio);
    query.set('fechaFin', filtro.fechaFin);
    if (filtro.idEstado != null) query.set('idEstado', String(filtro.idEstado));
    const filas = await this.api.request<Record<string, unknown>[]>(
      `/api/v1/farmacia/auditoria-qf/recetas?${query.toString()}`,
    );
    return (filas ?? []).map(mapearRecetaBandeja);
  }

  async listarEstados(): Promise<EstadoRecetaOpcion[]> {
    const filas = await this.api.request<Record<string, unknown>[]>(
      '/api/v1/farmacia/auditoria-qf/estados',
    );
    return (filas ?? [])
      .map(mapearEstadoReceta)
      .filter((estado) => estado.idEstado > 0 && estado.estado !== '');
  }

  async listarDetalle(idReceta: number): Promise<MedicamentoReceta[]> {
    const filas = await this.api.request<Record<string, unknown>[]>(
      `/api/v1/farmacia/auditoria-qf/recetas/${idReceta}/detalle`,
    );
    return (filas ?? [])
      .map(mapearMedicamentoReceta)
      .filter((medicamento) => medicamento.idProducto > 0);
  }

  async listarHistorico(idPaciente: number, idProducto: number): Promise<HistoricoMedicamento[]> {
    const query = new URLSearchParams();
    query.set('idPaciente', String(idPaciente));
    query.set('idProducto', String(idProducto));
    const filas = await this.api.request<Record<string, unknown>[]>(
      `/api/v1/farmacia/auditoria-qf/historico?${query.toString()}`,
    );
    return (filas ?? []).map(mapearHistoricoMedicamento);
  }

  async guardarEstado(idReceta: number, cuerpo: GuardarEstadoReceta): Promise<void> {
    await this.api.request(`/api/v1/farmacia/auditoria-qf/recetas/${idReceta}/estado`, {
      method: 'PUT',
      body: JSON.stringify(cuerpo),
    });
  }
}
