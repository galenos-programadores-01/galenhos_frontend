import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';

export interface ConsultaReferenciaDetalleResponse {
  codigo: string;
  mensaje: string;
  datos?: {
    paginas: number;
    porPagina: string;
    total: number;
    datos: ReferenciaPacienteItem[];
  };
}

export interface ReferenciaPacienteItem {
  rownum?: string | null;
  paciente?: {
    tipo_documento?: string | null;
    numero_documento?: string | null;
    nombres?: string | null;
    primer_apellido?: string | null;
    segundo_apellido?: string | null;
    fecha_nacimiento?: string | null;
    celular?: string | null;
    sexo?: string | null;
    direccion?: string | null;
    ubigeo1?: string | null;
    ubigeo2?: string | null;
    numero_seguro?: string | null;
    fecha_vencimiento_sis?: string | null;
  } | null;
  datos_tutor?: {
    tipo_documento?: string | null;
    numero_documento?: string | null;
    nombres?: string | null;
    primer_apellido?: string | null;
    segundo_apellido?: string | null;
    celular?: string | null;
    correo?: string | null;
  } | null;
  datos_referencia?: {
    codigo_especialidad?: string | null;
    codigoEstado?: string | null;
    estado?: string | null;
    fecha_referencia?: string | null;
    hora_referencia?: string | null;
    fecha_envio?: string | null;
    fecha_aceptacion?: string | null;
    numero_referencia?: string | null;
    id_referencia?: string | null;
    condicion?: string | null;
    tipo_transporte?: string | null;
    servicio_origen?: string | null;
    codigo_establecimiento_origen?: string | null;
    servicio_destino?: string | null;
    resume_anamnesis?: string | null;
    resume_exfisico?: string | null;
    motivo_referencia?: string | null;
    tipo_financiador?: string | null;
  } | null;
  diagnosticos?: {
    id?: string | null;
    codigo_ciex?: string | null;
    tipo_diagnostico?: string | null;
  }[];
  cpt_procedimiento?: string | null;
  cpt_laboratorio?: string | null;
  cpt_imagenes?: string | null;
  tratamiento?: string | null;
}

export interface UpsItem {
  codigo: string;
  descripcion: string;
}

export interface EstablecimientoItem {
  codigo: string;
  nombre: string;
}

export interface UbicacionItem {
  id: number;
  nombre: string;
}

export interface DistritoReniecItem {
  idDistrito: number;
  nombre: string;
  idReniec: number;
  idProvincia: number;
}

export interface GenerarHojaReferenciaParams {
  idreferencia: number;
  idestablecimiento: number;
  estadoreferencia: string;
}

export interface GenerarHojaReferenciaResult {
  archivoB64: string;
  urlFile: string;
  estadoreferencia: string;
  nombreReporte?: string;
}

export interface ConsultaReferenciaDetalleParams {
  numerodocumento: string;
  tipodocumento: string;
  pagina: string;
}

@Injectable({
  providedIn: 'root',
})
export class RefpacienteApiService {
  private readonly apiClient = inject(ApiClientService);

  consultarReferenciaDetalle(
    params: ConsultaReferenciaDetalleParams,
  ): Promise<ConsultaReferenciaDetalleResponse> {
    const query = new URLSearchParams({
      numerodocumento: params.numerodocumento,
      tipodocumento: params.tipodocumento,
      pagina: params.pagina,
    });
    return this.apiClient.request<ConsultaReferenciaDetalleResponse>(
      `/api/v1/dashrefcon/consulta-referencia-detalle?${query.toString()}`,
    );
  }

  listarUps(): Promise<UpsItem[]> {
    return this.apiClient.request<UpsItem[]>('/api/v1/refcon/ups');
  }

  listarEstablecimientos(): Promise<EstablecimientoItem[]> {
    return this.apiClient.request<EstablecimientoItem[]>(
      '/api/v1/refcon/establecimientos',
    );
  }

  listarDepartamentos(): Promise<UbicacionItem[]> {
    return this.apiClient.request<UbicacionItem[]>('/api/v1/departamentos');
  }

  listarProvincias(idDepartamento: number): Promise<UbicacionItem[]> {
    return this.apiClient.request<UbicacionItem[]>(
      `/api/v1/provincias/${idDepartamento}`,
    );
  }

  listarDistritos(idProvincia: number): Promise<UbicacionItem[]> {
    return this.apiClient.request<UbicacionItem[]>(
      `/api/v1/distritos/${idProvincia}`,
    );
  }

  listarDistritosPorIdReniec(idReniec: number): Promise<DistritoReniecItem[]> {
    return this.apiClient.request<DistritoReniecItem[]>(
      `/api/v1/refcon/distritos-reniec/${idReniec}`,
    );
  }

  generarHojaReferencia(
    params: GenerarHojaReferenciaParams,
  ): Promise<GenerarHojaReferenciaResult> {
    return this.apiClient.request<GenerarHojaReferenciaResult>(
      '/api/v1/refcon/hoja-referencia',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      true,
      90000,
    );
  }
}
