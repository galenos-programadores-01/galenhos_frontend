import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';

export interface SintomaCatalogo {
  idSintoma: number;
  sistema: string;
  sintoma: string;
  orden: number;
}

export interface SintomaSeleccionado {
  idSintoma: number;
  sistema: string;
  sintoma: string;
}

@Injectable({
  providedIn: 'root',
})
export class SintomaService {
  private readonly api = inject(ApiClientService);

  async listarCatalogo(): Promise<SintomaCatalogo[]> {
    try {
      const datos = await this.api.request<SintomaCatalogo[]>(
        '/api/v1/sintomas/catalogo',
        { method: 'GET' },
      );
      return datos ?? [];
    } catch (error) {
      console.error('Error al listar catálogo de síntomas:', error);
      return [];
    }
  }

  async agregarSintoma(sistema: string, sintoma: string): Promise<boolean> {
    try {
      await this.api.request('/api/v1/sintomas/catalogo', {
        method: 'POST',
        body: JSON.stringify({ sistema, sintoma }),
      });
      return true;
    } catch (error) {
      console.error('Error al agregar síntoma al catálogo:', error);
      return false;
    }
  }

  async guardarSintomas(
    idRegAtencion: number,
    sintomas: SintomaSeleccionado[],
  ): Promise<boolean> {
    try {
      await this.api.request(`/api/v1/evoluciones/${idRegAtencion}/sintomas`, {
        method: 'POST',
        body: JSON.stringify({ sintomas }),
      });
      return true;
    } catch (error) {
      console.error('Error al guardar síntomas de la evolución:', error);
      return false;
    }
  }

  async obtenerSintomas(idRegAtencion: number): Promise<SintomaSeleccionado[]> {
    try {
      const datos = await this.api.request<SintomaSeleccionado[]>(
        `/api/v1/evoluciones/${idRegAtencion}/sintomas`,
        { method: 'GET' },
      );
      return datos ?? [];
    } catch (error) {
      console.error('Error al obtener síntomas de la evolución:', error);
      return [];
    }
  }
}
