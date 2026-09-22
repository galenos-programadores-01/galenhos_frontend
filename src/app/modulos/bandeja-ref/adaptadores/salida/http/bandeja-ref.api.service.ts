import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type { IFilaBackend } from '../../../../../compartido/tipos/api-tipos';

export interface BandejaReferenciaParams {
  fini: string;
  ffin: string;
  filtro?: string;
}

export interface EstablecimientoBusqueda {
  idEstablecimiento: number;
  codigo: string;
  nombre: string;
  distrito: string;
  provincia: string;
  departamento: string;
  nombreLargo: string;
}

export interface UpsMinsa {
  codUps: string;
  descripcion: string;
}

export interface ListadoUpsMinsaResponse {
  codigo: string;
  mensaje: string;
  datos: UpsMinsa[];
}

@Injectable({ providedIn: 'root' })
export class BandejaRefApiService {
  private apiClient = inject(ApiClientService);

  listarReferencias(params: BandejaReferenciaParams): Promise<IFilaBackend[]> {
    const query = new URLSearchParams({
      fini: params.fini,
      ffin: params.ffin,
    });
    if (params.filtro) query.append('filtro', params.filtro);
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/triaje/referencias?${query.toString()}`,
    );
  }

  obtenerDatosReferencia(idAtencion: number): Promise<IFilaBackend> {
    return this.apiClient.request<IFilaBackend>(
      `/api/v1/triaje/referencias/${idAtencion}`,
    );
  }

  buscarEstablecimientos(filtro: string): Promise<EstablecimientoBusqueda[]> {
    const query = new URLSearchParams({ q: filtro, tipo: '1' });
    return this.apiClient.request<EstablecimientoBusqueda[]>(
      `/api/v1/establecimientos?${query.toString()}`,
    );
  }

  listarUpssMinsa(codigoRenipress: string): Promise<ListadoUpsMinsaResponse> {
    return this.apiClient.request<ListadoUpsMinsaResponse>(
      `/api/v1/dashrefcon/upss/${encodeURIComponent(codigoRenipress)}`,
    );
  }
}
