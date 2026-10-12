import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../../compartido/api-client/api-client.service';
import type {
  IPaginacionServiciosCatalogo,
  IServicioCatalogoDetalle,
  IServicioCatalogoFiltros,
  IServicioCatalogoGuardarPayload,
  IServicioGrupo,
} from '../../../tipos/servicios-catalogo.tipos';

@Injectable({
  providedIn: 'root',
})
export class ServiciosCatalogoApiService {
  private readonly apiClient = inject(ApiClientService);

  async listar(
    filtros: IServicioCatalogoFiltros,
  ): Promise<IPaginacionServiciosCatalogo> {
    const queryParams = new URLSearchParams();
    if (filtros.page) queryParams.set('page', String(filtros.page));
    if (filtros.pageSize) queryParams.set('pageSize', String(filtros.pageSize));
    if (filtros.filtro) queryParams.set('filtro', filtros.filtro);
    if (filtros.idGrupo && filtros.idGrupo > 0) {
      queryParams.set('idGrupo', String(filtros.idGrupo));
    }
    if (filtros.cpt !== undefined) {
      queryParams.set('cpt', String(filtros.cpt));
    }
    if (filtros.quirurgico !== undefined) {
      queryParams.set('quirurgico', String(filtros.quirurgico));
    }
    if (filtros.estado !== undefined) {
      queryParams.set('estado', String(filtros.estado));
    }

    const query = queryParams.toString();
    const url = query
      ? `/api/v1/servicios-catalogo?${query}`
      : '/api/v1/servicios-catalogo';
    return this.apiClient.request<IPaginacionServiciosCatalogo>(url, {
      method: 'GET',
    });
  }

  async obtenerPorId(idProducto: number): Promise<IServicioCatalogoDetalle> {
    return this.apiClient.request<IServicioCatalogoDetalle>(
      `/api/v1/servicios-catalogo/${idProducto}`,
      { method: 'GET' },
    );
  }

  async crear(
    payload: IServicioCatalogoGuardarPayload,
  ): Promise<{ idProducto: number }> {
    return this.apiClient.request<{ idProducto: number }>(
      '/api/v1/servicios-catalogo',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  }

  async actualizar(
    idProducto: number,
    payload: IServicioCatalogoGuardarPayload,
  ): Promise<{ actualizado: boolean }> {
    return this.apiClient.request<{ actualizado: boolean }>(
      `/api/v1/servicios-catalogo/${idProducto}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  }

  async listarGrupos(): Promise<IServicioGrupo[]> {
    return this.apiClient.request<IServicioGrupo[]>(
      '/api/v1/servicios-catalogo/grupos',
      { method: 'GET' },
    );
  }

  async eliminar(idProducto: number): Promise<{ eliminado: boolean }> {
    return this.apiClient.request<{ eliminado: boolean }>(
      `/api/v1/servicios-catalogo/${idProducto}`,
      { method: 'DELETE' },
    );
  }
}
