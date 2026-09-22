import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiRequestError } from '../../../../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../../compartido/componentes/tabla/tabla.component';
import type { IFilaBackend } from '../../../../../../compartido/tipos/api-tipos';
import {
  BuscadorRangoFechas,
  type CriteriosBusqueda,
} from '../../../../../../compartido/ui/buscador-rango-fechas/buscador-rango-fechas';
import { FiltrosGlobal } from '../../../../../../compartido/ui/filtros-global/filtros-global';
import { VentanaModal } from '../../../../../../compartido/ui/ventana-modal/ventana-modal';
import {
  BandejaRefApiService,
  type BandejaReferenciaParams,
  type EstablecimientoBusqueda,
  type UpsMinsa,
} from '../../../salida/http/bandeja-ref.api.service';

function campo(
  item: IFilaBackend | null | undefined,
  claves: string[],
): string {
  if (!item) return '';
  for (const k of claves) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== '') {
      if (typeof v === 'string') return v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return JSON.stringify(v);
    }
  }
  return '';
}

@Component({
  selector: 'app-bandeja-ref',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BuscadorRangoFechas,
    FiltrosGlobal,
    TablaComponent,
    ColumnaTemplateDirective,
    VentanaModal,
  ],
  templateUrl: './bandeja-ref.component.html',
})
export class BandejaRefComponent {
  private readonly apiService = inject(BandejaRefApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  referencias: IFilaBackend[] = [];
  cargando = false;
  error = '';
  buscado = false;
  modalAbierto = false;
  datosReferencia: IFilaBackend | null = null;
  cargandoDetalle = false;
  idAtencionModal = '';

  columnasTabla: readonly ColumnaTabla[] = [
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'docCustom', cabecera: 'Doc' },
    { campo: 'cuentaCustom', cabecera: 'Cuenta' },
    { campo: 'fechaCustom', cabecera: 'Fecha' },
    { campo: 'servicioCustom', cabecera: 'Servicio' },
    { campo: 'establecimientoCustom', cabecera: 'Establecimiento' },
    { campo: 'medicoCustom', cabecera: 'Medico' },
    { campo: 'estadoCustom', cabecera: 'Estado' },
    { campo: 'accionesCustom', cabecera: 'Acciones' },
  ];

  async buscar(criterios: CriteriosBusqueda): Promise<void> {
    this.error = '';
    if (!criterios.fechaDesde || !criterios.fechaHasta) {
      this.error = 'Debe indicar la fecha de inicio y la fecha de fin.';
      this.buscado = false;
      this.referencias = [];
      this.cdr.detectChanges();
      return;
    }

    const params: BandejaReferenciaParams = {
      fini: criterios.fechaDesde,
      ffin: criterios.fechaHasta,
      filtro: criterios.filtro,
    };

    this.cargando = true;
    this.buscado = true;
    try {
      const items = await this.apiService.listarReferencias(params);
      this.referencias = Array.isArray(items) ? items : [];
      if (this.referencias.length === 0) {
        this.error = 'No se encontraron referencias en el rango indicado.';
      }
    } catch (error: unknown) {
      this.referencias = [];
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo consultar la bandeja de referencias.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async enviarReferencia(item: IFilaBackend): Promise<void> {
    const idAtencion = Number(
      campo(item, ['idatencion', 'IdAtencion', 'idAtencion']),
    );
    if (!idAtencion) return;

    this.idAtencionModal = String(idAtencion);
    this.datosReferencia = null;
    this.modalAbierto = true;
    this.cargandoDetalle = true;
    this.cdr.detectChanges();

    try {
      this.datosReferencia =
        await this.apiService.obtenerDatosReferencia(idAtencion);
      await this.precargarEstablecimiento(
        campo(this.datosReferencia, ['Nombre', 'nombre']),
      );
    } catch (error: unknown) {
      this.datosReferencia = null;
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudieron consultar los datos de la referencia.';
    } finally {
      this.cargandoDetalle = false;
      this.cdr.detectChanges();
    }
  }

  private async precargarEstablecimiento(nombre: string): Promise<void> {
    this.buscarEstablecimiento = nombre;
    this.establecimientoSeleccionado = null;
    this.establecimientosSugeridos = [];
    this.listaServicios = [];
    this.servicioSeleccionado = '';
    this.errorServicios = '';
    if (!nombre) return;

    this.buscandoEstablecimiento = true;
    this.cdr.detectChanges();
    try {
      const resultado =
        (await this.apiService.buscarEstablecimientos(nombre)) ?? [];
      const coincidencia = resultado.find(
        (est) => est.nombre.toLowerCase() === nombre.toLowerCase(),
      );
      this.establecimientoSeleccionado = coincidencia ?? null;
    } catch {
      this.establecimientoSeleccionado = null;
    } finally {
      this.buscandoEstablecimiento = false;
    }
    if (!this.establecimientoSeleccionado) {
      this.establecimientoSeleccionado = {
        idEstablecimiento: 0,
        codigo: '',
        nombre,
        distrito: '',
        provincia: '',
        departamento: '',
        nombreLargo: nombre,
      };
    }
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.datosReferencia = null;
    this.cargandoDetalle = false;
    this.buscarEstablecimiento = '';
    this.establecimientosSugeridos = [];
    this.buscandoEstablecimiento = false;
    this.establecimientoSeleccionado = null;
    this.listaServicios = [];
    this.servicioSeleccionado = '';
    this.cargandoServicios = false;
    this.errorServicios = '';
  }

  buscarEstablecimiento = '';
  establecimientosSugeridos: EstablecimientoBusqueda[] = [];
  buscandoEstablecimiento = false;
  establecimientoSeleccionado: EstablecimientoBusqueda | null = null;

  async onBuscarEstablecimiento(): Promise<void> {
    const termino = this.buscarEstablecimiento.trim();
    if (!termino) {
      this.establecimientosSugeridos = [];
      return;
    }
    this.buscandoEstablecimiento = true;
    this.cdr.detectChanges();
    try {
      this.establecimientosSugeridos =
        (await this.apiService.buscarEstablecimientos(termino)) ?? [];
    } catch {
      this.establecimientosSugeridos = [];
    } finally {
      this.buscandoEstablecimiento = false;
      this.cdr.detectChanges();
    }
  }

  seleccionarEstablecimiento(est: EstablecimientoBusqueda): void {
    this.establecimientoSeleccionado = est;
    this.buscarEstablecimiento = est.nombre;
    this.establecimientosSugeridos = [];
    this.cargarServicios(est.codigo);
  }

  listaServicios: UpsMinsa[] = [];
  servicioSeleccionado = '';
  cargandoServicios = false;
  errorServicios = '';

  private async cargarServicios(codigoRenipress: string): Promise<void> {
    this.listaServicios = [];
    this.servicioSeleccionado = '';
    this.errorServicios = '';
    if (!codigoRenipress) return;

    this.cargandoServicios = true;
    this.cdr.detectChanges();
    try {
      const respuesta =
        (await this.apiService.listarUpssMinsa(codigoRenipress)) ?? null;
      this.listaServicios = respuesta?.datos ?? [];
      if (this.listaServicios.length === 0) {
        this.errorServicios =
          'El establecimiento no tiene servicios registrados.';
      }
    } catch (error: unknown) {
      this.listaServicios = [];
      this.errorServicios =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudieron consultar los servicios del establecimiento.';
    } finally {
      this.cargandoServicios = false;
      this.cdr.detectChanges();
    }
  }

  cerrarSugerencias(): void {
    setTimeout(() => {
      this.establecimientosSugeridos = [];
    }, 150);
  }

  texto(item: IFilaBackend, claves: string[]): string {
    return campo(item, claves);
  }

  fechaTexto(item: IFilaBackend, claves: string[]): string {
    const valor = campo(item, claves);
    if (!valor) return '—';
    const partes = valor.slice(0, 10).split('-');
    if (partes.length !== 3) return valor;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  estiloEstado(estado: string): string {
    const base =
      'padding:3px 10px;border-radius:8px;font-weight:700;font-size:12.5px;white-space:nowrap;';
    const estadoNormalizado = estado.toLowerCase();
    if (estadoNormalizado.includes('registrado'))
      return `${base}background:#eef2ff;color:#263c7a;`;
    if (estadoNormalizado.includes('admitido'))
      return `${base}background:#ecfdf5;color:#065f46;`;
    if (estadoNormalizado.includes('cancelado'))
      return `${base}background:#fef2f2;color:#991b1b;`;
    if (estadoNormalizado.includes('contrarref'))
      return `${base}background:#f5f3ff;color:#5b21b6;`;
    return `${base}background:#f1f5f9;color:#334155;`;
  }
}
