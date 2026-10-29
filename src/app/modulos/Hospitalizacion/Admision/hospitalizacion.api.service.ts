import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';
import type {
  IDiagnosticoBusqueda,
  IReporteTicketHospitalizacion,
  ISubclasificacionDxItem,
} from '../../../compartido/tipos/api-tipos';

// Cuerpo de POST /api/v1/hospitalizacion/admision. Los nombres coinciden con
// el DTO del backend (createAdmisionHospitalizacionRequest); cada campo es
// opcional porque el SP usp_go_AdmisionHospitalizacion persiste como NULL los
// que no se envían.
export interface AdmisionHospitalizacionPayload {
  idPaciente?: number;
  idDocIdentidad?: number;
  nroDocumento?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  primerNombre?: string;
  segundoNombre?: string;
  tercerNombre?: string;
  fechaNacimiento?: string;
  idTipoSexo?: number;
  estadoCivil?: number;
  gradoInstruccion?: number;
  ocupacion?: number;
  idEtnia?: number;
  idIdioma?: number;
  madreTipoDoc?: number;
  madreNroDoc?: string;
  madreApePaterno?: string;
  madreApeMaterno?: string;
  madrePrimerNombre?: string;
  madreSegundoNombre?: string;
  nombrePadre?: string;
  telefono?: string;
  correo?: string;
  idDepartamento?: number;
  idProvincia?: number;
  idDistrito?: number;
  idComunidadDomicilio?: number;
  direccion?: string;
  idNacionalidad?: number;
  idOrigen?: number;
  idServicio?: number;
  idCama?: number;
  fechaIngreso?: string;
  horaIngreso?: string;
  idMedicoIngreso?: number;
  idTipoPrioridad?: number;
  idEstadollego?: number;
  idFuenteFinanciamiento?: number;
  idEstablecimientoReferenciaOrigen?: number;
  nroReferencia?: string;
  idEmpleado?: number;
}

export interface AdmisionHospitalizacionRespuesta {
  resultado: string;
}

// Cuerpo de POST /api/v1/diagnosticos/atencion. Solo se envían los campos que
// la admisión puede capturar; el resto (labConfHIS, grupoHIS, subGrupoHIS,
// idEpisodio, idEvolucion, idPrimeraAtencion) los persiste el SP como NULL.
export interface AgregarDiagnosticoAtencionPayload {
  idAtencion: number;
  idDiagnostico: number;
  idSubclasificacionDiagnostico: number;
  idClasificacionDx: number;
  idPaciente: number;
  codigoCIE10?: string;
}

export interface AgregarDiagnosticoAtencionRespuesta {
  idAtencionDiagnostico: number;
  descripcionSubclasificacion: string;
}

@Injectable({
  providedIn: 'root',
})
export class HospitalizacionApiService {
  private readonly apiClient = inject(ApiClientService);

  // Registra la admisión de hospitalización. El backend devuelve el
  // @Resultado del SP: "OK; ..." si se grabó o "Error; ..." si falló.
  admisionar(
    payload: AdmisionHospitalizacionPayload,
  ): Promise<AdmisionHospitalizacionRespuesta> {
    return this.apiClient.request<AdmisionHospitalizacionRespuesta>(
      '/api/v1/hospitalizacion/admision',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  // Busca diagnósticos (CIE10) por texto. El idAtencion va siempre en 0
  // (la admisión aún no tiene cuenta); el idPaciente se envía si el paciente
  // ya existe en la base local, de lo contrario 0.
  buscarDiagnosticos(
    filtro: string,
    idPaciente: number,
  ): Promise<IDiagnosticoBusqueda[]> {
    const params = new URLSearchParams();
    params.set('filtro', filtro);
    params.set('idAtencion', '0');
    params.set('idPaciente', String(idPaciente || 0));
    return this.apiClient.request<IDiagnosticoBusqueda[]>(
      `/api/v1/diagnosticos/search?${params.toString()}`,
    );
  }

  // Lista los tipos (subclasificaciones) de diagnóstico. Por defecto el SP
  // usp_go_SubclasificacionDiagnosticos_Select recibe idTipoServicio=3 y
  // idClasificacionDx=9.
  getSubclasificacionesDiagnostico(
    idTipoServicio = 3,
    idClasificacionDx = 9,
  ): Promise<ISubclasificacionDxItem[]> {
    const params = new URLSearchParams();
    params.set('idTipoServicio', String(idTipoServicio));
    params.set('idClasificacionDx', String(idClasificacionDx));
    return this.apiClient.request<ISubclasificacionDxItem[]>(
      `/api/v1/catalogos/subclasificaciones-diagnosticos?${params.toString()}`,
    );
  }

  // Asocia un diagnóstico a la atención recién admitida (SP
  // usp_go_AtencionesDiagnosticosAgregar).
  agregarDiagnosticoAtencion(
    payload: AgregarDiagnosticoAtencionPayload,
  ): Promise<AgregarDiagnosticoAtencionRespuesta> {
    return this.apiClient.request<AgregarDiagnosticoAtencionRespuesta>(
      '/api/v1/diagnosticos/atencion',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  // Datos del ticket de admisión de hospitalización para una cuenta de
  // atención (SP usp_go_GenererReporteTicketHospi).
  getReporteTicket(idCuenta: number): Promise<IReporteTicketHospitalizacion> {
    return this.apiClient.request<IReporteTicketHospitalizacion>(
      `/api/v1/hospitalizacion/reporte-ticket/${idCuenta}`,
    );
  }
}
