import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type {
  AlmacenFarmaciaItem,
  DisponibilidadKpis,
  EstadisticasFarmaciaDashboard,
  FarmaciaDisponibilidadFiltros,
  KardexMovimientoItem,
  LoteItem,
  LoteVencimientoDetalleItem,
  PaginacionDisponibilidad,
  TendenciasSalidasFarmacia,
} from '../../../tipos/farmacia-dashboard.tipos';

@Injectable({
  providedIn: 'root',
})
export class FarmaciaDashboardApiService {
  private readonly apiClient = inject(ApiClientService);

  async listarAlmacenes(): Promise<AlmacenFarmaciaItem[]> {
    return this.apiClient.request<AlmacenFarmaciaItem[]>(
      '/api/v1/farmacia/almacenes',
      {
        method: 'GET',
      },
    );
  }

  async obtenerKpis(
    idAlmacen = 0,
    canastaTipo = 'TODOS',
  ): Promise<DisponibilidadKpis> {
    const queryParams = new URLSearchParams();
    if (idAlmacen > 0) queryParams.set('idAlmacen', String(idAlmacen));
    if (canastaTipo) queryParams.set('canastaTipo', canastaTipo);

    const query = queryParams.toString();
    return this.apiClient.request<DisponibilidadKpis>(
      `/api/v1/farmacia/kpis${query ? `?${query}` : ''}`,
      {
        method: 'GET',
      },
    );
  }

  async listarDisponibilidad(
    filtros: FarmaciaDisponibilidadFiltros,
  ): Promise<PaginacionDisponibilidad> {
    const queryParams = new URLSearchParams();
    if (filtros.page) queryParams.set('page', String(filtros.page));
    if (filtros.pageSize) queryParams.set('pageSize', String(filtros.pageSize));
    if (filtros.idAlmacen && filtros.idAlmacen > 0) {
      queryParams.set('idAlmacen', String(filtros.idAlmacen));
    }
    if (filtros.filtro) queryParams.set('filtro', filtros.filtro);
    if (filtros.estadoSemaforo)
      queryParams.set('estadoSemaforo', filtros.estadoSemaforo);
    if (filtros.soloConStock !== undefined) {
      queryParams.set('soloConStock', String(filtros.soloConStock));
    }
    if (filtros.soloEsenciales !== undefined) {
      queryParams.set('soloEsenciales', String(filtros.soloEsenciales));
    }
    if (filtros.canastaTipo) {
      queryParams.set('canastaTipo', filtros.canastaTipo);
    }
    if (filtros.fechaInicio) {
      queryParams.set('fechaInicio', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      queryParams.set('fechaFin', filtros.fechaFin);
    }
    if (filtros.soloConMovimiento !== undefined) {
      queryParams.set('soloConMovimiento', String(filtros.soloConMovimiento));
    }

    const query = queryParams.toString();
    const url = `/api/v1/farmacia/disponibilidad${query ? `?${query}` : ''}`;
    return this.apiClient.request<PaginacionDisponibilidad>(url, {
      method: 'GET',
    });
  }

  async listarLotesPorProducto(
    idProducto: number,
    idAlmacen = 0,
  ): Promise<LoteItem[]> {
    const query = idAlmacen > 0 ? `?idAlmacen=${idAlmacen}` : '';
    return this.apiClient.request<LoteItem[]>(
      `/api/v1/farmacia/productos/${idProducto}/lotes${query}`,
      {
        method: 'GET',
      },
    );
  }

  async consultarKardex(
    idProducto: number,
    idAlmacen = 0,
    fechaInicio = '',
    fechaFin = '',
  ): Promise<KardexMovimientoItem[]> {
    const queryParams = new URLSearchParams();
    if (idAlmacen > 0) queryParams.set('idAlmacen', String(idAlmacen));
    if (fechaInicio) queryParams.set('fechaInicio', fechaInicio);
    if (fechaFin) queryParams.set('fechaFin', fechaFin);

    const query = queryParams.toString();
    const url = `/api/v1/farmacia/productos/${idProducto}/kardex${query ? `?${query}` : ''}`;
    return this.apiClient.request<KardexMovimientoItem[]>(url, {
      method: 'GET',
    });
  }

  async obtenerTendenciasSalidas(
    idAlmacen = 0,
  ): Promise<TendenciasSalidasFarmacia> {
    const query = idAlmacen > 0 ? `?idAlmacen=${idAlmacen}` : '';
    return this.apiClient.request<TendenciasSalidasFarmacia>(
      `/api/v1/farmacia/tendencias-salidas${query}`,
      {
        method: 'GET',
      },
    );
  }

  async obtenerEstadisticas(
    idAlmacen = 0,
    canastaTipo = 'TODOS',
    fechaInicio = '',
    fechaFin = '',
  ): Promise<EstadisticasFarmaciaDashboard> {
    const queryParams = new URLSearchParams();
    if (idAlmacen > 0) queryParams.set('idAlmacen', String(idAlmacen));
    if (canastaTipo) queryParams.set('canastaTipo', canastaTipo);
    if (fechaInicio) queryParams.set('fechaInicio', fechaInicio);
    if (fechaFin) queryParams.set('fechaFin', fechaFin);

    const query = queryParams.toString();
    return this.apiClient.request<EstadisticasFarmaciaDashboard>(
      `/api/v1/farmacia/estadisticas${query ? `?${query}` : ''}`,
      {
        method: 'GET',
      },
    );
  }

  async listarLotesPorVencer(
    idAlmacen = 0,
    diasMax = 60,
  ): Promise<LoteVencimientoDetalleItem[]> {
    const queryParams = new URLSearchParams();
    if (idAlmacen > 0) queryParams.set('idAlmacen', String(idAlmacen));
    if (diasMax > 0) queryParams.set('diasMax', String(diasMax));

    const query = queryParams.toString();
    const url = `/api/v1/farmacia/lotes-por-vencer${query ? `?${query}` : ''}`;
    return this.apiClient.request<LoteVencimientoDetalleItem[]>(url, {
      method: 'GET',
    });
  }
}
