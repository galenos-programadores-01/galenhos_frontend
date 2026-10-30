import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type { IFilaBackend } from '../../../../../compartido/tipos/api-tipos';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
import type {
  AltaDomicilioRegistrarBody,
  AltaDomicilioRegistrarResponse,
  AltaHospitalizacionRegistrarBody,
  AltaHospitalizacionRegistrarResponse,
  AltaFugaRegistrarBody,
  AltaFugaRegistrarResponse,
  AltaFallecidoRegistrarBody,
  AltaFallecidoRegistrarResponse,
  DiagnosticoAtencionApi,
  ExamenAtencionApi,
  ExamenRegistrarBody,
  ExamenRegistrarResponse,
  MedicamentoAtencionApi,
  MedicamentoRegistrarBody,
  MedicamentoRegistrarResponse,
  PrimeraAtencionDetalle,
  PrimeraAtencionGuardarPayload,
  PrimeraAtencionIniciarResponse,
  PrimeraAtencionRegistrarDiagnosticosBody,
  PrimeraAtencionRegistrarDiagnosticosResponse,
  InterconsultaListadoApi,
  InterconsultaRegistrarBody,
  InterconsultaRegistrarResponse,
  PlanTrabajoItemApi,
  PlanTrabajoItemRegistrarBody,
  PlanTrabajoItemRegistrarResponse,
  ProcedimientoAtencionApi,
  ProcedimientoRegistrarBody,
  ProcedimientoRegistrarResponse,
} from '../../../aplicacion/primera-atencion.mapper';

export interface PrimeraAtencionListarParams {
  filtro?: string;
  idTipoServicio?: number;
}

export interface PrimeraAtencionIniciarBody {
  idAtencion: number;
  fechaAtencion?: string;
  tipoAnamnesis?: 'D' | 'I';
}

export interface DocumentoFirmadoCierreBody {
  tipoDocumento: 'PA' | 'EXAMEN' | 'MEDICAMENTO';
  idPuntoCarga?: number | null;
  idReceta?: number | null;
  nombreArchivo: string;
}

export interface PrimeraAtencionCerrarFirmaBody {
  uuidFirma: string;
  motivoRectificacion?: string;
  documentos?: DocumentoFirmadoCierreBody[];
}

export interface DocumentoFirmadoPaApi {
  NroEdicion?: number;
  nroEdicion?: number;
  TipoDocumento?: string;
  tipoDocumento?: string;
  IdPuntoCarga?: number | null;
  idPuntoCarga?: number | null;
  IdReceta?: number | null;
  idReceta?: number | null;
  NombreArchivo?: string;
  nombreArchivo?: string;
  UbicacionArchivo?: string;
  ubicacionArchivo?: string;
}

export interface PrimeraAtencionCerrarFirmaResponse {
  idPrimeraAtencion: number;
  ubicacionArchivo: string;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class PrimeraAtencionApiService {
  private readonly apiClient = inject(ApiClientService);
  private readonly authService = inject(AuthService);

  listarBandeja(
    params: PrimeraAtencionListarParams = {},
  ): Promise<IFilaBackend[]> {
    const query = new URLSearchParams();
    if (params.filtro) query.append('filtro', params.filtro);
    if (params.idTipoServicio != null) {
      query.append('idTipoServicio', String(params.idTipoServicio));
    }
    const qs = query.toString();
    return this.apiClient.request<IFilaBackend[]>(
      `/api/v1/primera-atencion${qs ? `?${qs}` : ''}`,
    );
  }

  /** POST /api/v1/primera-atencion/iniciar — SP usp_go_InsertarPrimeraAtencion (INSERT mínimo). */
  iniciarBorrador(
    body: PrimeraAtencionIniciarBody,
  ): Promise<PrimeraAtencionIniciarResponse> {
    return this.apiClient.request<PrimeraAtencionIniciarResponse>(
      '/api/v1/primera-atencion/iniciar',
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /** GET /api/v1/primera-atencion/detalle/:idAtencion — rehidrata borrador. */
  obtenerDetalle(idAtencion: number): Promise<PrimeraAtencionDetalle> {
    return this.apiClient.request<PrimeraAtencionDetalle>(
      `/api/v1/primera-atencion/detalle/${idAtencion}`,
    );
  }

  /** PATCH /api/v1/primera-atencion/:idAtencion — autoguardado parcial. */
  guardarParcial(
    idAtencion: number,
    payload: PrimeraAtencionGuardarPayload,
  ): Promise<PrimeraAtencionIniciarResponse> {
    return this.apiClient.request<PrimeraAtencionIniciarResponse>(
      `/api/v1/primera-atencion/${idAtencion}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    );
  }

  listarDocumentosFirmados(idAtencion: number): Promise<{
    nroEdicionVigente?: number;
    NroEdicionVigente?: number;
    documentos?: DocumentoFirmadoPaApi[];
  }> {
    return this.apiClient.request(
      `/api/v1/primera-atencion/${idAtencion}/documentos-firmados`,
    );
  }

  /** POST /api/v1/primera-atencion/:idAtencion/cerrar-firma — EstadoFirma + UUID. */
  cerrarFirma(
    idAtencion: number,
    body: PrimeraAtencionCerrarFirmaBody,
  ): Promise<PrimeraAtencionCerrarFirmaResponse> {
    return this.apiClient.request<PrimeraAtencionCerrarFirmaResponse>(
      `/api/v1/primera-atencion/${idAtencion}/cerrar-firma`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /**
   * GET /api/v1/primera-atencion/:idAtencion/documento
   * PDF firmado desde FTP/SFTP (binario, no envelope JSON).
   */
  async descargarDocumentoFirmado(
    idAtencion: number,
    opts: { tipo: 'pa' | 'receta'; idReceta?: number },
  ): Promise<Blob> {
    const query = new URLSearchParams();
    query.set('tipo', opts.tipo);
    if (opts.tipo === 'receta' && opts.idReceta != null && opts.idReceta > 0) {
      query.set('idReceta', String(opts.idReceta));
    }
    const headers: Record<string, string> = { Accept: 'application/pdf' };
    const token = this.authService.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `${this.apiClient.getApiBaseUrl()}/api/v1/primera-atencion/${idAtencion}/documento?${query}`,
      { headers },
    );
    if (!res.ok) {
      let mensaje = 'No se pudo obtener el documento firmado.';
      try {
        const env = (await res.json()) as { error?: { message?: string } };
        if (env?.error?.message) mensaje = env.error.message;
      } catch {
        /* cuerpo no JSON */
      }
      throw new Error(mensaje);
    }
    return res.blob();
  }

  /**
   * POST /api/v1/primera-atencion/:idAtencion/diagnosticos
   * SP usp_go_AtencionesDiagnosticosAgregar
   * (idEpisodio + idClasificacionDx + idSubclasificacionDx).
   */
  registrarDiagnosticos(
    idAtencion: number,
    body: PrimeraAtencionRegistrarDiagnosticosBody,
  ): Promise<PrimeraAtencionRegistrarDiagnosticosResponse> {
    return this.apiClient.request<PrimeraAtencionRegistrarDiagnosticosResponse>(
      `/api/v1/primera-atencion/${idAtencion}/diagnosticos`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /**
   * POST /api/v1/primera-atencion/:idAtencion/egreso/alta-domicilio
   * SP usp_go_RegistrarAltaHospitalaria (domicilio).
   */
  registrarAltaDomicilio(
    idAtencion: number,
    body: AltaDomicilioRegistrarBody,
  ): Promise<AltaDomicilioRegistrarResponse> {
    return this.apiClient.request<AltaDomicilioRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/egreso/alta-domicilio`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /**
   * POST /api/v1/primera-atencion/:idAtencion/egreso/alta-hospitalizacion
   * SP usp_go_RegistrarAltaHospitalaria (transferencia; MotivoTraslado).
   */
  registrarAltaHospitalizacion(
    idAtencion: number,
    body: AltaHospitalizacionRegistrarBody,
  ): Promise<AltaHospitalizacionRegistrarResponse> {
    return this.apiClient.request<AltaHospitalizacionRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/egreso/alta-hospitalizacion`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /**
   * POST /api/v1/primera-atencion/:idAtencion/egreso/alta-fuga
   * FechaEgreso = fuga; FechaFuga = último contacto.
   */
  registrarAltaFuga(
    idAtencion: number,
    body: AltaFugaRegistrarBody,
  ): Promise<AltaFugaRegistrarResponse> {
    return this.apiClient.request<AltaFugaRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/egreso/alta-fuga`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /**
   * POST /api/v1/primera-atencion/:idAtencion/egreso/alta-fallecido
   * Familiar → Observaciones; DX clasif.4 aparte.
   */
  registrarAltaFallecido(
    idAtencion: number,
    body: AltaFallecidoRegistrarBody,
  ): Promise<AltaFallecidoRegistrarResponse> {
    return this.apiClient.request<AltaFallecidoRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/egreso/alta-fallecido`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /** GET /api/v1/primera-atencion/:idAtencion/diagnosticos — rehidrata DX desde BD. */
  listarDiagnosticos(
    idAtencion: number,
    idPrimeraAtencion?: number | null,
  ): Promise<DiagnosticoAtencionApi[]> {
    const query = new URLSearchParams();
    if (idPrimeraAtencion != null && idPrimeraAtencion > 0) {
      query.set('idPrimeraAtencion', String(idPrimeraAtencion));
    }
    const qs = query.toString();
    return this.apiClient.request<DiagnosticoAtencionApi[]>(
      `/api/v1/primera-atencion/${idAtencion}/diagnosticos${qs ? `?${qs}` : ''}`,
    );
  }

  /**
   * DELETE /api/v1/primera-atencion/:idAtencion/diagnosticos/:idAtencionDiagnostico
   * ?idPrimeraAtencion= — SP usp_go_AtencionesDiagnosticosEliminar
   */
  eliminarDiagnostico(
    idAtencion: number,
    idAtencionDiagnostico: number,
    idPrimeraAtencion: number,
  ): Promise<{ idAtencionDiagnostico: number; mensaje: string }> {
    const query = new URLSearchParams({
      idPrimeraAtencion: String(idPrimeraAtencion),
    });
    return this.apiClient.request(
      `/api/v1/primera-atencion/${idAtencion}/diagnosticos/${idAtencionDiagnostico}?${query}`,
      { method: 'DELETE' },
    );
  }

  /**
   * POST /api/v1/primera-atencion/:idAtencion/interconsultas
   * usp_go_Interconsulta_Insertar + N× InterconsultaDiagnostico_Insertar.
   */
  registrarInterconsulta(
    idAtencion: number,
    body: InterconsultaRegistrarBody,
  ): Promise<InterconsultaRegistrarResponse> {
    return this.apiClient.request<InterconsultaRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/interconsultas`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /** GET /api/v1/primera-atencion/:idAtencion/interconsultas?idEpisodio=&idPrimeraAtencion= */
  listarInterconsultas(
    idAtencion: number,
    idEpisodio: number,
    idPrimeraAtencion: number,
  ): Promise<InterconsultaListadoApi[]> {
    const query = new URLSearchParams({
      idEpisodio: String(idEpisodio),
      idPrimeraAtencion: String(idPrimeraAtencion),
    });
    return this.apiClient.request<InterconsultaListadoApi[]>(
      `/api/v1/primera-atencion/${idAtencion}/interconsultas?${query}`,
    );
  }

  /**
   * DELETE /api/v1/primera-atencion/:idAtencion/interconsultas/:id?idEpisodio=
   * Cascada DX → cabecera (usp_go_Interconsulta_Eliminar).
   */
  eliminarInterconsulta(
    idAtencion: number,
    idInterconsulta: number,
    idEpisodio: number,
  ): Promise<{ idInterconsulta: number; mensaje: string }> {
    const query = new URLSearchParams({ idEpisodio: String(idEpisodio) });
    return this.apiClient.request(
      `/api/v1/primera-atencion/${idAtencion}/interconsultas/${idInterconsulta}?${query}`,
      { method: 'DELETE' },
    );
  }

  /**
   * POST /api/v1/primera-atencion/:idAtencion/plan-trabajo
   * SP temporal usp_go_PA_PlanTrabajoItemAgregar (EXA|INT|PRO).
   */
  registrarPlanTrabajoItem(
    idAtencion: number,
    body: PlanTrabajoItemRegistrarBody,
  ): Promise<PlanTrabajoItemRegistrarResponse> {
    return this.apiClient.request<PlanTrabajoItemRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/plan-trabajo`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /** GET /api/v1/primera-atencion/:idAtencion/plan-trabajo */
  listarPlanTrabajo(
    idAtencion: number,
    idPrimeraAtencion?: number | null,
    tipo?: string | null,
  ): Promise<PlanTrabajoItemApi[]> {
    const query = new URLSearchParams();
    if (idPrimeraAtencion != null && idPrimeraAtencion > 0) {
      query.set('idPrimeraAtencion', String(idPrimeraAtencion));
    }
    if (tipo) query.set('tipo', tipo);
    const qs = query.toString();
    return this.apiClient.request<PlanTrabajoItemApi[]>(
      `/api/v1/primera-atencion/${idAtencion}/plan-trabajo${qs ? `?${qs}` : ''}`,
    );
  }

  /**
   * DELETE /api/v1/primera-atencion/:idAtencion/plan-trabajo/:idPlanTrabajoItem
   * ?idPrimeraAtencion=
   */
  eliminarPlanTrabajoItem(
    idAtencion: number,
    idPlanTrabajoItem: number,
    idPrimeraAtencion: number,
  ): Promise<{ idPlanTrabajoItem: number; mensaje: string }> {
    const query = new URLSearchParams({
      idPrimeraAtencion: String(idPrimeraAtencion),
    });
    return this.apiClient.request(
      `/api/v1/primera-atencion/${idAtencion}/plan-trabajo/${idPlanTrabajoItem}?${query}`,
      { method: 'DELETE' },
    );
  }

  /** POST .../medicamentos — cabecera + detalle (usp_go_Receta*). */
  registrarMedicamento(
    idAtencion: number,
    body: MedicamentoRegistrarBody,
  ): Promise<MedicamentoRegistrarResponse> {
    return this.apiClient.request<MedicamentoRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/medicamentos`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /** GET .../medicamentos?idCuentaAtencion=&idPrimeraAtencion=&idPuntoCarga= */
  listarMedicamentos(
    idAtencion: number,
    params: {
      idCuentaAtencion: number;
      idPrimeraAtencion?: number | null;
      idPuntoCarga?: number | null;
    },
  ): Promise<MedicamentoAtencionApi[]> {
    const query = new URLSearchParams({
      idCuentaAtencion: String(params.idCuentaAtencion),
    });
    if (params.idPrimeraAtencion != null && params.idPrimeraAtencion > 0) {
      query.set('idPrimeraAtencion', String(params.idPrimeraAtencion));
    }
    if (params.idPuntoCarga != null && params.idPuntoCarga > 0) {
      query.set('idPuntoCarga', String(params.idPuntoCarga));
    }
    return this.apiClient.request<MedicamentoAtencionApi[]>(
      `/api/v1/primera-atencion/${idAtencion}/medicamentos?${query}`,
    );
  }

  /** DELETE .../medicamentos/:idReceta/:idProducto */
  eliminarMedicamento(
    idAtencion: number,
    idReceta: number,
    idProducto: number,
    idCuentaAtencion: number,
    idPrimeraAtencion: number,
  ): Promise<{ idReceta: number; idProducto: number; mensaje: string }> {
    const query = new URLSearchParams({
      idCuentaAtencion: String(idCuentaAtencion),
      idPrimeraAtencion: String(idPrimeraAtencion),
    });
    return this.apiClient.request(
      `/api/v1/primera-atencion/${idAtencion}/medicamentos/${idReceta}/${idProducto}?${query}`,
      { method: 'DELETE' },
    );
  }

  /** PATCH .../medicamentos/:idReceta/:idProducto — dosis/unidad/frecuencia/vía post-alta. */
  actualizarMedicamentoCampos(
    idAtencion: number,
    idReceta: number,
    idProducto: number,
    body: {
      idCuentaAtencion: number;
      idPrimeraAtencion: number;
      idDosis?: number | null;
      idUNIDDosis?: number | null;
      idFrecuencia?: number | null;
      idViaAdministracion?: number | null;
    },
  ): Promise<{ idReceta: number; idProducto: number; mensaje: string }> {
    return this.apiClient.request(
      `/api/v1/primera-atencion/${idAtencion}/medicamentos/${idReceta}/${idProducto}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  /** POST .../examenes — cabecera por IdPuntoCarga del examen + detalle (cant=1, precio, total). */
  registrarExamen(
    idAtencion: number,
    body: ExamenRegistrarBody,
  ): Promise<ExamenRegistrarResponse> {
    return this.apiClient.request<ExamenRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/examenes`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /**
   * GET .../examenes?idCuentaAtencion=&idPrimeraAtencion=
   * Backend excluye farmacia (IdPuntoCarga=5) en el SP.
   */
  listarExamenes(
    idAtencion: number,
    params: {
      idCuentaAtencion: number;
      idPrimeraAtencion?: number | null;
    },
  ): Promise<ExamenAtencionApi[]> {
    const query = new URLSearchParams({
      idCuentaAtencion: String(params.idCuentaAtencion),
    });
    if (params.idPrimeraAtencion != null && params.idPrimeraAtencion > 0) {
      query.set('idPrimeraAtencion', String(params.idPrimeraAtencion));
    }
    return this.apiClient.request<ExamenAtencionApi[]>(
      `/api/v1/primera-atencion/${idAtencion}/examenes?${query}`,
    );
  }

  /** DELETE .../examenes/:idReceta/:idProducto */
  eliminarExamen(
    idAtencion: number,
    idReceta: number,
    idProducto: number,
    idCuentaAtencion: number,
    idPrimeraAtencion: number,
  ): Promise<{ idReceta: number; idProducto: number; mensaje: string }> {
    const query = new URLSearchParams({
      idCuentaAtencion: String(idCuentaAtencion),
      idPrimeraAtencion: String(idPrimeraAtencion),
    });
    return this.apiClient.request(
      `/api/v1/primera-atencion/${idAtencion}/examenes/${idReceta}/${idProducto}?${query}`,
      { method: 'DELETE' },
    );
  }

  /** POST .../procedimientos — cabecera fija IdPuntoCarga=26 + detalle. */
  registrarProcedimiento(
    idAtencion: number,
    body: ProcedimientoRegistrarBody,
  ): Promise<ProcedimientoRegistrarResponse> {
    return this.apiClient.request<ProcedimientoRegistrarResponse>(
      `/api/v1/primera-atencion/${idAtencion}/procedimientos`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /** GET .../procedimientos — filtra IdPuntoCarga=26. */
  listarProcedimientos(
    idAtencion: number,
    params: {
      idCuentaAtencion: number;
      idPrimeraAtencion?: number | null;
    },
  ): Promise<ProcedimientoAtencionApi[]> {
    const query = new URLSearchParams({
      idCuentaAtencion: String(params.idCuentaAtencion),
    });
    if (params.idPrimeraAtencion != null && params.idPrimeraAtencion > 0) {
      query.set('idPrimeraAtencion', String(params.idPrimeraAtencion));
    }
    return this.apiClient.request<ProcedimientoAtencionApi[]>(
      `/api/v1/primera-atencion/${idAtencion}/procedimientos?${query}`,
    );
  }

  /** DELETE .../procedimientos/:idReceta/:idProducto */
  eliminarProcedimiento(
    idAtencion: number,
    idReceta: number,
    idProducto: number,
    idCuentaAtencion: number,
    idPrimeraAtencion: number,
  ): Promise<{ idReceta: number; idProducto: number; mensaje: string }> {
    const query = new URLSearchParams({
      idCuentaAtencion: String(idCuentaAtencion),
      idPrimeraAtencion: String(idPrimeraAtencion),
    });
    return this.apiClient.request(
      `/api/v1/primera-atencion/${idAtencion}/procedimientos/${idReceta}/${idProducto}?${query}`,
      { method: 'DELETE' },
    );
  }
}
