import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../../compartido/api-client/api-client.service';
import type {
  IBienInsumoDetalle,
  IBienInsumoFiltros,
  IBienInsumoGuardarPayload,
  IBienInsumoPrecioPlan,
  ICatalogoBienesInsumosAuxiliares,
  IGrupoFarmacologico,
  IPaginacionBienesInsumos,
  ISubGrupoFarmacologico,
} from '../../../tipos/bienes-insumos.tipos';

@Injectable({
  providedIn: 'root',
})
export class BienesInsumosApiService {
  private readonly apiClient = inject(ApiClientService);

  async listar(filtros: IBienInsumoFiltros): Promise<IPaginacionBienesInsumos> {
    const queryParams = new URLSearchParams();
    if (filtros.page) queryParams.set('page', String(filtros.page));
    if (filtros.pageSize) queryParams.set('pageSize', String(filtros.pageSize));
    if (filtros.filtro) queryParams.set('filtro', filtros.filtro);
    if (filtros.idGrupo && filtros.idGrupo > 0) {
      queryParams.set('idGrupo', String(filtros.idGrupo));
    }
    if (filtros.tipoProducto && filtros.tipoProducto > 0) {
      queryParams.set('tipoProducto', String(filtros.tipoProducto));
    }
    if (filtros.petitorio !== undefined) {
      queryParams.set('petitorio', String(filtros.petitorio));
    }
    if (filtros.indicadorGestion !== undefined) {
      queryParams.set('indicadorGestion', String(filtros.indicadorGestion));
    }
    if (filtros.estado !== undefined) {
      queryParams.set('estado', String(filtros.estado));
    }

    const query = queryParams.toString();
    const url = query
      ? `/api/v1/bienes-insumos?${query}`
      : '/api/v1/bienes-insumos';
    return this.apiClient.request<IPaginacionBienesInsumos>(url, {
      method: 'GET',
    });
  }

  async obtenerPorId(idProducto: number): Promise<IBienInsumoDetalle> {
    return this.apiClient.request<IBienInsumoDetalle>(
      `/api/v1/bienes-insumos/${idProducto}`,
      { method: 'GET' },
    );
  }

  async crear(
    payload: IBienInsumoGuardarPayload,
  ): Promise<{ idProducto: number }> {
    return this.apiClient.request<{ idProducto: number }>(
      '/api/v1/bienes-insumos',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  }

  async actualizar(
    idProducto: number,
    payload: IBienInsumoGuardarPayload,
  ): Promise<{ actualizado: boolean }> {
    return this.apiClient.request<{ actualizado: boolean }>(
      `/api/v1/bienes-insumos/${idProducto}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  }

  async listarGrupos(): Promise<IGrupoFarmacologico[]> {
    return this.apiClient.request<IGrupoFarmacologico[]>(
      '/api/v1/bienes-insumos/grupos',
      { method: 'GET' },
    );
  }

  async listarSubGrupos(idGrupo: number): Promise<ISubGrupoFarmacologico[]> {
    return this.apiClient.request<ISubGrupoFarmacologico[]>(
      `/api/v1/bienes-insumos/subgrupos/${idGrupo}`,
      { method: 'GET' },
    );
  }

  async obtenerAuxiliares(): Promise<ICatalogoBienesInsumosAuxiliares> {
    return this.apiClient.request<ICatalogoBienesInsumosAuxiliares>(
      '/api/v1/bienes-insumos/auxiliares',
      { method: 'GET' },
    );
  }

  async listarPrecios(idProducto: number): Promise<IBienInsumoPrecioPlan[]> {
    return this.apiClient.request<IBienInsumoPrecioPlan[]>(
      `/api/v1/bienes-insumos/${idProducto}/precios`,
      { method: 'GET' },
    );
  }

  async guardarPrecios(
    idProducto: number,
    precios: IBienInsumoPrecioPlan[],
  ): Promise<{ guardado: boolean }> {
    return this.apiClient.request<{ guardado: boolean }>(
      `/api/v1/bienes-insumos/${idProducto}/precios`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(precios),
      },
    );
  }

  async eliminar(idProducto: number): Promise<{ eliminado: boolean }> {
    return this.apiClient.request<{ eliminado: boolean }>(
      `/api/v1/bienes-insumos/${idProducto}`,
      { method: 'DELETE' },
    );
  }
}
