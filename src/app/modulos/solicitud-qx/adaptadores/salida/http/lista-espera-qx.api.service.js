import { Injectable, inject } from '@angular/core';
import { __decorate } from 'tslib';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';

let ListaEsperaQxApiService = class ListaEsperaQxApiService {
  apiClient = inject(ApiClientService);
  listar(params) {
    const query = new URLSearchParams({ fecha: params.fecha });
    if (params.paciente) query.append('paciente', params.paciente);
    return this.apiClient.request(
      `/api/v1/lista-espera-qx?${query.toString()}`,
    );
  }
  crear(payload) {
    return this.apiClient.request('/api/v1/lista-espera-qx', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};
ListaEsperaQxApiService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  ListaEsperaQxApiService,
);

export { ListaEsperaQxApiService };
