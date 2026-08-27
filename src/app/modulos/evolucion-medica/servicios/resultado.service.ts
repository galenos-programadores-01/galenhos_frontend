import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';

export interface ResultadoInfo {
  idResultado: number;
  idPaciente: number;
  idOrden: number;
  idProducto: number;
  tipoResultado: string;
  nombreExamen: string;
  fechaResultado: string;
  valores: string;
  observaciones: string;
  estado: string;
}

export interface DetalleResultadoLab {
  grupo: string;
  item: string;
  valorTexto: string;
  unidad: string;
  valorReferencial: string;
  metodo: string;
}

export interface DetalleResultadoImagen {
  idOrden: number;
  idProducto: number;
  nombreExamen: string;
  fechaInforme: string;
  informeTexto: string;
}

interface ResultadoBackend {
  idResultado: number;
  idPaciente: number;
  idOrden?: number;
  idProducto?: number;
  tipoResultado: string;
  nombreExamen: string;
  fechaExamen?: string;
  fechaResultado?: string;
  detalle?: string;
  valores?: string;
  observaciones?: string;
  estado?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ResultadoService {
  private readonly api = inject(ApiClientService);

  async listarLaboratorio(idPaciente: number): Promise<ResultadoInfo[]> {
    try {
      const datos = await this.api.request<ResultadoBackend[]>(
        `/api/v1/resultados/laboratorio/paciente/${idPaciente}`,
        { method: 'GET' },
      );
      return (datos ?? []).map((d) => this.normalizarResultado(d));
    } catch (error) {
      console.error('Error al listar resultados de laboratorio:', error);
      return [];
    }
  }

  async listarImagenes(idPaciente: number): Promise<ResultadoInfo[]> {
    try {
      const datos = await this.api.request<ResultadoBackend[]>(
        `/api/v1/resultados/imagenes/paciente/${idPaciente}`,
        { method: 'GET' },
      );
      return (datos ?? []).map((d) => this.normalizarResultado(d));
    } catch (error) {
      console.error('Error al listar resultados de imágenes:', error);
      return [];
    }
  }

  async obtenerDetalleLaboratorio(
    idOrden: number,
    idProducto: number,
  ): Promise<DetalleResultadoLab[]> {
    try {
      const datos = await this.api.request<DetalleResultadoLab[]>(
        `/api/v1/resultados/laboratorio/detalle?idOrden=${idOrden}&idProducto=${idProducto}`,
        { method: 'GET' },
      );
      return datos ?? [];
    } catch (error) {
      console.error('Error al obtener detalle de laboratorio:', error);
      return [];
    }
  }

  async obtenerDetalleImagen(
    idOrden: number,
    idProducto: number,
  ): Promise<DetalleResultadoImagen | null> {
    try {
      const datos = await this.api.request<DetalleResultadoImagen>(
        `/api/v1/resultados/imagenes/detalle?idOrden=${idOrden}&idProducto=${idProducto}`,
        { method: 'GET' },
      );
      return datos ?? null;
    } catch (error) {
      console.error('Error al obtener detalle de imagen:', error);
      return null;
    }
  }

  private normalizarResultado(item: ResultadoBackend): ResultadoInfo {
    return {
      idResultado: item.idResultado,
      idPaciente: item.idPaciente,
      idOrden: item.idOrden ?? 0,
      idProducto: item.idProducto ?? 0,
      tipoResultado: item.tipoResultado ?? '',
      nombreExamen: item.nombreExamen ?? '',
      fechaResultado: item.fechaExamen ?? item.fechaResultado ?? '',
      valores: item.detalle ?? item.valores ?? '',
      observaciones: item.observaciones ?? '',
      estado: item.estado ?? 'Pendiente',
    };
  }
}
