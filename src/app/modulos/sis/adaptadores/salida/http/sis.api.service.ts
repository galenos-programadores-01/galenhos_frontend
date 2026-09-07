import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type { IFilaBackend } from '../../../../../compartido/tipos/api-tipos';

export interface SisAfiliado {
  idError: string;
  resultado: string;
  tipoDocumento: string;
  nroDocumento: string;
  apePaterno: string;
  apeMaterno: string;
  nombres: string;
  fecAfiliacion: string;
  eess: string;
  descEESS: string;
  eessUbigeo: string;
  descEessUbigeo: string;
  regimen: string;
  tipoSeguro: string;
  descTipoSeguro: string;
  contrato: string;
  fecCaducidad: string;
  estado: string;
  tabla: string;
  idNumReg: string;
  genero: string;
  fecNacimiento: string;
  idUbigeo: string;
  direccion: string;
  disa: string;
  tipoFormato: string;
  nroContrato: string;
  correlativo: string;
  idPlan: string;
  idGrupoPoblacional: string;
  msgConfidencial: string;
}

export interface SisAfiliacionPayload {
  idSiasis?: number;
  codigo?: string;
  afiliacionDisa?: string;
  afiliacionTipoFormato?: string;
  afiliacionNroFormato?: string;
  afiliacionNroIntegrante?: string;
  documentoTipo?: string;
  codigoEstablAdscripcion?: string;
  afiliacionFecha?: string;
  paterno?: string;
  materno?: string;
  pNombre?: string;
  oNombres?: string;
  genero?: string;
  fNacimiento?: string;
  idDistritoDomicilio?: string;
  estado?: string;
  fBaja?: string;
  documentoNumero?: string;
  motivoBaja?: string;
  fBajaOk?: string;
  descEESS?: string;
  descEessUbigeo?: string;
  regimen?: string;
  tipoSeguro?: string;
  descTipoSeguro?: string;
  contrato?: string;
  idPlan?: string;
  idGrupoPoblacional?: string;
  msgConfidencial?: string;
  idUsuarioAuditoria?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SisApiService {
  private apiClient = inject(ApiClientService);

  consultarAfiliado(
    nrodoc: string,
    tipoDocumento = 1,
    afiliacion?: { disa: string; tipoFormato: string; nroContrato: string },
  ): Promise<SisAfiliado> {
    const opcion = afiliacion ? 2 : 1;
    const query = new URLSearchParams();
    query.append('intOpcion', String(opcion));
    if (opcion === 1) {
      query.append('strTipoDocumento', String(tipoDocumento));
    } else if (afiliacion) {
      // En opción 2 la búsqueda es por afiliación y el número de documento no
      // es obligatorio; la ruta exige un segmento no vacío, así que se envía
      // un valor comodín que el backend ignora.
      query.append('strDisa', afiliacion.disa);
      query.append('strTipoFormato', afiliacion.tipoFormato);
      query.append('strNroContrato', afiliacion.nroContrato);
    }
    const docSegment = nrodoc.trim() || '0';
    return this.apiClient.request<SisAfiliado>(
      `/api/v1/sis/afiliado/${encodeURIComponent(docSegment)}?${query.toString()}`,
    );
  }

  gestionarAfiliacion(
    payload: SisAfiliacionPayload,
  ): Promise<{ estado: string }> {
    return this.apiClient.request<{ estado: string }>(
      '/api/v1/sis/filiaciones',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  forzarGuardadoFua(idCuentaAtencion: number): Promise<{ estado: string }> {
    return this.apiClient.request<{ estado: string }>('/api/v1/sis/fua', {
      method: 'POST',
      body: JSON.stringify({ idCuentaAtencion }),
    });
  }

  agregarFua(
    idCuentaAtencion: number,
    idEmpleado: number,
    nombrePc?: string,
  ): Promise<{ respuesta: string }> {
    return this.apiClient.request<{ respuesta: string }>(
      '/api/v1/sis/fua/agregar',
      {
        method: 'POST',
        body: JSON.stringify({
          idCuentaAtencion,
          idEmpleado,
          ...(nombrePc ? { nombrePc } : {}),
        }),
      },
    );
  }

  fuaImprimir(idCuentaAtencion: number): Promise<IFilaBackend> {
    return this.apiClient.request<IFilaBackend>(
      `/api/v1/sis/fua/imprimir?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  listarDiagnosticos(idAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/sis/diagnosticos?idAtencion=${idAtencion}`,
    );
  }

  listarMedicamentos(idCuentaAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/sis/medicamentos?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  listarProcedimientos(idCuentaAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/sis/procedimientos?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }

  listarConsumo(idCuentaAtencion: number): Promise<IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/sis/consumo?idCuentaAtencion=${idCuentaAtencion}`,
    );
  }
}
