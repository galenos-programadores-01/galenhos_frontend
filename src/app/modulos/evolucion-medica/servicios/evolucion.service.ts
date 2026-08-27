import { computed, Injectable, inject, signal } from '@angular/core';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';

export type ViewMode = 'tray' | 'form';

export interface PacienteItem {
  idRegAtencion: number;
  idPaciente: number;
  historia: string;
  nombre: string;
  edad: string;
  sexo: string;
  ubicacion: string;
  cama: string;
  estado: string;
}

export interface PaginaResponse<TipoPaginacion> {
  items: TipoPaginacion[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface EvolucionFirma {
  idRegAtencion: number;
  idFirma: number;
  nombreDocumento: string;
  nombreArchivo: string;
  rutaBase: string;
  dataB64: string;
  idEmpleadoRegistra: number;
  fechaRegistro: string;
  estado: number;
}

export interface DiagnosticoBusqueda {
  idDiagnostico: number;
  intrahospitalario: number;
  descripcion: string;
  codigoCIE10: string;
  esActivo: number;
  descripcionLarga: string;
  edadMaxDias: number;
  edadMinDias: number;
  idTipoSexo: number;
  cancer: number;
  yaRegistrado: number;
}

@Injectable({
  providedIn: 'root',
})
export class EvolucionService {
  private readonly api = inject(ApiClientService);

  public readonly viewMode = signal<ViewMode>('tray');
  public readonly patientSearch = signal<string>('');
  public readonly fechaDesde = signal<string>('');
  public readonly fechaHasta = signal<string>('');

  public readonly pacientes = signal<PacienteItem[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly page = signal<number>(1);
  public readonly totalPages = signal<number>(1);
  public readonly totalItems = signal<number>(0);
  public readonly pageSize = signal<number>(6);

  public readonly activePatient = signal<PacienteItem | null>(null);

  public readonly filteredPacientes = computed(() => {
    const term = this.patientSearch().toLowerCase();
    if (!term) return this.pacientes();
    return this.pacientes().filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.historia.toLowerCase().includes(term),
    );
  });

  public async cargarPacientes(resetPage = true) {
    if (resetPage) this.page.set(1);
    this.isLoading.set(true);
    try {
      const params = new URLSearchParams();
      let fini = this.fechaDesde();
      if (!fini) {
        const now = new Date();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        fini = `${now.getFullYear()}-${mes}-01`;
      }
      params.append('fini', fini);
      if (this.fechaHasta()) params.append('ffin', this.fechaHasta());
      params.append('page', this.page().toString());
      params.append('pageSize', this.pageSize().toString());
      const qs = params.toString();
      const url = `/api/v1/evoluciones/pacientes?${qs}`;
      const data = await this.api.request<PaginaResponse<PacienteItem>>(url, {
        method: 'GET',
      });
      if (data) {
        this.pacientes.set(data.items ?? (data as unknown as PacienteItem[]));
        if (Array.isArray(data)) {
          this.totalPages.set(1);
          this.totalItems.set(data.length);
        } else {
          this.page.set(data.page ?? 1);
          this.totalPages.set(data.totalPages ?? 1);
          this.totalItems.set(data.totalItems ?? data.items?.length ?? 0);
        }
      }
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  public irAPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPages() || pagina === this.page())
      return;
    this.page.set(pagina);
    this.cargarPacientes(false);
  }

  async guardarEvolucion(
    dataB64: string,
  ): Promise<{ ipCliente: string; fecha: string; hora: string } | null> {
    const paciente = this.activePatient();
    if (!paciente) return null;

    try {
      const data = await this.api.request<{
        ipCliente?: string;
        fecha?: string;
        hora?: string;
      }>('/api/v1/evoluciones', {
        method: 'POST',
        body: JSON.stringify({
          idRegAtencion: paciente.idRegAtencion,
          dataB64: dataB64,
        }),
      });
      return {
        ipCliente: data?.ipCliente ?? '',
        fecha: data?.fecha ?? '',
        hora: data?.hora ?? '',
      };
    } catch (error) {
      console.error('Error guardando evolución:', error);
      return null;
    }
  }

  async listarEvoluciones(idRegAtencion: number): Promise<EvolucionFirma[]> {
    try {
      const data = await this.api.request<EvolucionFirma[]>(
        `/api/v1/evoluciones/paciente/${idRegAtencion}`,
        { method: 'GET' },
      );
      return data ?? [];
    } catch (error) {
      console.error('Error listando evoluciones del paciente:', error);
      return [];
    }
  }

  async decodificarB64(cadenaB64: string): Promise<string> {
    return atob(cadenaB64);
  }

  async buscarDiagnosticos(
    filtro: string,
    idAtencion: number,
    idPaciente: number,
  ): Promise<DiagnosticoBusqueda[]> {
    const params = new URLSearchParams();
    params.set('filtro', filtro);
    params.set('idAtencion', idAtencion.toString());
    params.set('idPaciente', idPaciente.toString());

    try {
      return await this.api.request<DiagnosticoBusqueda[]>(
        `/api/v1/diagnosticos/search?${params.toString()}`,
        { method: 'GET' },
        true,
      );
    } catch {
      return [];
    }
  }

  decodificarEvolucion(dataB64: string): Record<string, unknown> | null {
    try {
      const binario = atob(dataB64);
      let texto = '';
      for (let i = 0; i < binario.length; i++) {
        const code = binario.codePointAt(i) || 0;
        texto +=
          code > 127 ? `%${code.toString(16).padStart(2, '0')}` : binario[i];
      }
      return JSON.parse(decodeURIComponent(texto));
    } catch (error) {
      console.error('Error decodificando evolución:', error);
      return null;
    }
  }

  public setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
  }

  public normalizarEdad(edad: string): string {
    if (!edad) return 'N/A';
    const regexEdad = /^\D*(-?\d+)\D+(-?\d+)\D+(-?\d+)\D*$/;
    const match = regexEdad.exec(edad);
    if (!match) return edad;

    let anios = Number(match[1]);
    let meses = Number(match[2]);
    let dias = Number(match[3]);

    while (dias < 0) {
      meses -= 1;
      dias += 30;
    }
    while (meses < 0) {
      anios -= 1;
      meses += 12;
    }

    return `${anios} años, ${meses} meses, ${dias} días`;
  }

  public selectPatient(paciente: PacienteItem) {
    this.activePatient.set(paciente);
  }

  public clearSelection() {
    this.activePatient.set(null);
    this.setViewMode('tray');
    this.cargarPacientes();
  }

  async obtenerBandeja(
    fechaInicio?: string,
    fechaFin?: string,
    filtro?: string,
  ) {
    const params = new URLSearchParams();
    if (fechaInicio) params.set('fechaInicio', fechaInicio);
    if (fechaFin) params.set('fechaFin', fechaFin);
    if (filtro) params.set('filtro', filtro);

    return this.api.request<Record<string, unknown>[]>(
      `/api/v1/evoluciones/bandeja?${params.toString()}`,
      { method: 'GET' },
      true,
    );
  }

  async guardarEvolucionMedica(
    datos: Record<string, unknown>,
  ): Promise<{ idEvolucion: number; mensaje: string }> {
    return this.api.request<{ idEvolucion: number; mensaje: string }>(
      '/api/v1/evoluciones/registro',
      {
        method: 'POST',
        body: JSON.stringify(datos),
      },
      true,
    );
  }
}
