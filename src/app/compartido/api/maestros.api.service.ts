import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../api-client/api-client.service';
import type {
  ICatalogoDescripcion,
  ICatalogoNombre,
  IFilaBackend,
  IFuenteFinanciamiento,
  IReniecResultado,
} from '../tipos/api-tipos';

@Injectable({
  providedIn: 'root',
})
export class MaestrosApiService {
  private readonly apiClient = inject(ApiClientService);

  getTiposDocumentos(): Promise<ICatalogoDescripcion[]> {
    return this.apiClient.request<ICatalogoDescripcion[]>(
      '/api/v1/tipos-documentos',
    );
  }
  getIdiomas(): Promise<ICatalogoDescripcion[]> {
    interface IdiomaRaw {
      id: number;
      descripcion?: string;
      lengua?: string;
    }
    return this.apiClient
      .request<IdiomaRaw[]>('/api/v1/idiomas')
      .then((respuesta) =>
        respuesta.map((idioma) => ({
          id: idioma.id,
          descripcion: (idioma.lengua || idioma.descripcion) as string,
        })),
      );
  }
  getEtnias(): Promise<ICatalogoDescripcion[]> {
    return this.apiClient
      .request<{ codigo?: number; id?: number; descripcion?: string }[]>(
        '/api/v1/etnias',
      )
      .then((res) =>
        (res || []).map((e) => ({
          id: e.codigo ?? e.id ?? 0,
          descripcion: e.descripcion ?? '',
        })),
      );
  }
  getDepartamentos(): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>('/api/v1/departamentos');
  }
  getPaises(): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>('/api/v1/paises');
  }
  getTiposSexo(): Promise<ICatalogoDescripcion[]> {
    return this.apiClient.request<ICatalogoDescripcion[]>('/api/v1/tipos-sexo');
  }
  getEstadosCivil(): Promise<ICatalogoDescripcion[]> {
    return this.apiClient.request<ICatalogoDescripcion[]>(
      '/api/v1/estados-civil',
    );
  }
  getEstadosLlegoPaciente(): Promise<ICatalogoDescripcion[]> {
    return this.apiClient.request<ICatalogoDescripcion[]>(
      '/api/v1/estados-llego-paciente',
    );
  }
  getFuentesFinanciamiento(): Promise<IFuenteFinanciamiento[]> {
    return this.apiClient.request<IFuenteFinanciamiento[]>(
      '/api/v1/fuentes-financiamiento',
    );
  }
  getGradosInstruccion(): Promise<ICatalogoDescripcion[]> {
    return this.apiClient.request<ICatalogoDescripcion[]>(
      '/api/v1/grados-instruccion',
    );
  }
  getOcupaciones(): Promise<ICatalogoDescripcion[]> {
    return this.apiClient.request<ICatalogoDescripcion[]>(
      '/api/v1/ocupaciones',
    );
  }
  getProvincias(idDepartamento: number | string): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>(
      `/api/v1/provincias/${idDepartamento}`,
    );
  }
  getDistritos(idProvincia: number | string): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>(
      `/api/v1/distritos/${idProvincia}`,
    );
  }
  getCentrosPoblados(idDistrito: number | string): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>(
      `/api/v1/centros-poblados/${idDistrito}`,
    );
  }
  getEspecialidades(): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>('/api/v1/especialidades');
  }

  /**
   * Especialidades por tipo de servicio:
   * EXEC usp_go_EspecialidadesXidTipoServicio @IdTipoServicio
   * (2 = emergencia).
   */
  getEspecialidadesPorTipoServicio(
    idTipoServicio: number | string,
  ): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>(
      `/api/v1/especialidades-por-tipo-servicio/${idTipoServicio}`,
    );
  }

  /**
   * Especialidades interconsulta PA:
   * EXEC usp_go_Especialidades_Listar
   */
  getEspecialidadesListar(): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>(
      '/api/v1/especialidades-listar',
    );
  }

  /**
   * EXEC usp_go_ListarServicios @IdTipoServicio
   * Respuesta: IdServicio → id, Nombre → nombre.
   */
  getServicios(idTipoServicio: number | string): Promise<ICatalogoNombre[]> {
    return this.apiClient.request<ICatalogoNombre[]>(
      `/api/v1/servicios/${idTipoServicio}`,
    );
  }
  getServiciosPorPrioridad(
    idPrioridad: number | string,
    fechaNac: string,
  ): Promise<ICatalogoNombre[]> {
    const path = fechaNac
      ? `/api/v1/servicios-prioridad/${idPrioridad}/${fechaNac}`
      : `/api/v1/servicios-prioridad/${idPrioridad}`;
    return this.apiClient
      .request<{ idServicio: number; nombre: string }[]>(path)
      .then((items) =>
        (items || []).map((s) => ({
          id: s.idServicio,
          nombre: s.nombre,
        })),
      );
  }
  getDatosInstitucion(): Promise<IFilaBackend> {
    return this.apiClient.request<IFilaBackend>('/api/v1/datos-institucion');
  }
  getParametro(id: number | string): Promise<IFilaBackend | IFilaBackend[]> {
    return this.apiClient.request<IFilaBackend | IFilaBackend[]>(
      `/api/v1/parametros/${id}`,
    );
  }

  // Marca el parámetro con ValorTexto = 'N' (SP
  // usp_go_ActualizarParametroValorTextoPorId). El backend invalida la cache
  // de parámetros clínicos, así que el siguiente getParametro ya ve el 'N'.
  desactivarParametro(id: number | string): Promise<{ message: string }> {
    return this.apiClient.request<{ message: string }>(
      `/api/v1/catalogos/parametros/${id}/valor-texto`,
      { method: 'PATCH' },
    );
  }

  /**
   * Catálogo clínico: EXEC usp_go_Cat_ParametroClinico_Listar @IdGrupo
   * 1 = examen clínico (estado general)
   * 2 = estado de hidratación
   * 3 = nivel de conciencia
   * 4 = condición de egreso
   * 6 = motivos de interconsulta
   * 8 = tipo de alta (egreso domicilio)
   * 9 = condición de alta (egreso domicilio)
   * 10 = pronóstico (egreso domicilio)
   * 11 = destino del cadáver (egreso fallecido)
   * 12 = tipo de certificado (egreso fallecido)
   * 13 = tiempo de estancia hasta el deceso (egreso fallecido)
   */
  getParametrosClinicos(
    idGrupo: number | string,
  ): Promise<ICatalogoDescripcion[]> {
    return this.apiClient.request<ICatalogoDescripcion[]>(
      `/api/v1/parametros-clinicos/${idGrupo}`,
    );
  }

  /**
   * Prioridades PA (bandeja + interconsulta):
   * EXEC usp_go_Cat_Prioridad_PrimeraAtencion
   * id = IdTipoPrioridad
   */
  getPrioridadesPrimeraAtencion(): Promise<ICatalogoDescripcion[]> {
    return this.apiClient.request<ICatalogoDescripcion[]>(
      '/api/v1/prioridades-primera-atencion',
    );
  }

  /**
   * Subclasificación DX (P/D/R):
   * EXEC usp_go_SubclasificacionDiagnosticos_Select
   * @IdTipoServicio, @IdClasificacionDx (9=PA, 7=interconsulta, 3=egreso, 4=egreso fallecido)
   */
  getSubclasificacionesDiagnostico(params: {
    idTipoServicio: number | string;
    idClasificacionDx: number | string;
  }): Promise<
    {
      id: number;
      descripcionCorta?: string;
      descripcionLarga?: string;
    }[]
  > {
    const query = new URLSearchParams();
    query.append('idTipoServicio', String(params.idTipoServicio));
    query.append('idClasificacionDx', String(params.idClasificacionDx));
    return this.apiClient.request(
      `/api/v1/subclasificaciones-diagnostico?${query.toString()}`,
    );
  }

  /**
   * Catálogo CIE-10: EXEC usp_go_SelectDiagnosticos
   * @filtro, @IdAtencion, @IdPaciente
   */
  getDiagnosticosCatalogo(params: {
    filtro?: string;
    idAtencion: number;
    idPaciente: number;
  }): Promise<
    { idDiagnostico: number; descripcion: string; codigoCIE10: string }[]
  > {
    const query = new URLSearchParams();
    query.append('idAtencion', String(params.idAtencion));
    query.append('idPaciente', String(params.idPaciente));
    if (params.filtro != null) query.append('filtro', params.filtro);
    return this.apiClient.request(
      `/api/v1/diagnosticos-catalogo?${query.toString()}`,
    );
  }

  /**
   * Medicamentos: EXEC usp_go_SelectMedicamentosFiltro @Filtro, @IdPaciente
   */
  getMedicamentosCatalogo(params: {
    filtro?: string;
    idPaciente: number;
  }): Promise<
    {
      idProducto: number;
      codigo: string;
      nombre: string;
      precioUnitario: number;
    }[]
  > {
    const query = new URLSearchParams();
    query.append('idPaciente', String(params.idPaciente));
    if (params.filtro != null) query.append('filtro', params.filtro);
    return this.apiClient.request(
      `/api/v1/medicamentos-catalogo?${query.toString()}`,
    );
  }

  /**
   * Exámenes: EXEC webProcedimentosRecetasFiltarNombrePuntoCarga
   * idTipoFinanciamiento ← IdFormaPago bandeja (GestionPrimeraAtencionFiltrar)
   */
  getExamenesCatalogo(params: {
    filtro?: string;
    idTipoFinanciamiento: number;
  }): Promise<
    {
      idProducto: number;
      codigo: string;
      nombre: string;
      nombreLargo: string;
      idPuntoCarga: number;
      puntoCarga: string;
      servicio: string;
      precioUnitario: number;
    }[]
  > {
    const query = new URLSearchParams();
    query.append(
      'idTipoFinanciamiento',
      String(params.idTipoFinanciamiento),
    );
    if (params.filtro != null) query.append('filtro', params.filtro);
    return this.apiClient.request(
      `/api/v1/examenes-catalogo?${query.toString()}`,
    );
  }

  /**
   * Procedimientos: EXEC usp_go_ProcedimentosFiltarNombrePuntoCarga
   * idPuntoCarga ← IdPuntoCarga bandeja
   * idTipoFinanciamiento ← IdFormaPago bandeja
   */
  getProcedimientosCatalogo(params: {
    filtro?: string;
    idPuntoCarga: number;
    idTipoFinanciamiento: number;
  }): Promise<
    {
      idProducto: number;
      codigo: string;
      nombre: string;
      nombreLargo: string;
      idPuntoCarga: number;
      puntoCarga: string;
      precioUnitario: number;
      esCPT: boolean;
    }[]
  > {
    const query = new URLSearchParams();
    query.append('idPuntoCarga', String(params.idPuntoCarga));
    query.append('idTipoFinanciamiento', String(params.idTipoFinanciamiento));
    if (params.filtro != null) query.append('filtro', params.filtro);
    return this.apiClient.request(
      `/api/v1/procedimientos-catalogo?${query.toString()}`,
    );
  }

  /** EXEC usp_go_RecetaDosisSelecionarTodos */
  getRecetaDosis(): Promise<{ idDosis: number; numeroDosis: string }[]> {
    return this.apiClient.request('/api/v1/receta-dosis');
  }

  /** EXEC Usp_go_SelectRecetaUndDosisSelecionarTodos */
  getRecetaUnidadesDosis(): Promise<
    { idUNIDDosis: number; numeroUNIDDosis: string }[]
  > {
    return this.apiClient.request('/api/v1/receta-unidades-dosis');
  }

  /** EXEC usp_go_SelectRecetaFrecuenciaSelecionarTodos */
  getRecetaFrecuencias(): Promise<
    { idFrecuencia: number; descripcion: string }[]
  > {
    return this.apiClient.request('/api/v1/receta-frecuencias');
  }

  /** EXEC usp_go_RecetasListadoViasAdministracion */
  getViasAdministracion(): Promise<
    { idViaAdministracion: number; descripcion: string }[]
  > {
    return this.apiClient.request('/api/v1/vias-administracion');
  }

  // RENIEC puede devolver el objeto de datos con campos ausentes.
  consultarReniec(nroDocumento: string): Promise<IReniecResultado> {
    return this.apiClient.request<IReniecResultado>(
      `/api/v1/reniec/${encodeURIComponent(nroDocumento)}?operacion=completo`,
    );
  }
}
