import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../api-client/api-client.service';

export interface IRegistrarAuditoria {
  accion: string;
  idRegistro?: number;
  tabla?: string;
  idListItem?: number;
  nombrePC?: string;
  observaciones?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuditoriaApiService {
  private readonly apiClient = inject(ApiClientService);

  registrarAuditoria(datos: IRegistrarAuditoria): Promise<{ message: string }> {
    return this.apiClient.request<{ message: string }>('/api/v1/auditoria', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  }
}
