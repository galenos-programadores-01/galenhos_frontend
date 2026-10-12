import { CommonModule } from '@angular/common';
import { Component, inject, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonesFiltroComponent } from '../../../../../../../../compartido/ui/botones-filtro/botones-filtro';
import { FiltrosGlobal } from '../../../../../../../../compartido/ui/filtros-global/filtros-global';
import { ModalGlobalService } from '../../../../../../../../compartido/ui/modal-global/modal-global.service';
import { PaginacionComponent } from '../../../../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../../../../compartido/ui/select-global/select-global';
import type {
  IServicioCatalogoDetalle,
  IServicioCatalogoGuardarPayload,
  IServicioCatalogoItem,
  IServicioGrupo,
} from '../../../../../tipos/servicios-catalogo.tipos';
import { ServiciosCatalogoApiService } from '../../../../salida/http/servicios-catalogo.api.service';
import { ServicioModalComponent } from '../../componentes/servicio-modal/servicio-modal.component';

@Component({
  selector: 'app-servicios-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ServicioModalComponent,
    PaginacionComponent,
    BotonesFiltroComponent,
    FiltrosGlobal,
    SelectGlobalComponent,
  ],
  templateUrl: './servicios-lista.component.html',
})
export class ServiciosListaComponent implements OnInit {
  private readonly api = inject(ServiciosCatalogoApiService);
  private readonly modalGlobal = inject(ModalGlobalService);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorMensajeModal = signal('');
  readonly errorGeneral = signal('');

  readonly items = signal<IServicioCatalogoItem[]>([]);
  readonly grupos = signal<IServicioGrupo[]>([]);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly paginaActual = signal(1);
  readonly tamanoPagina = signal(20);

  filtroTexto = '';
  idGrupoSeleccionado = 0;
  soloCpt: boolean | null = null;
  soloQuirurgico: boolean | null = null;
  estadoSeleccionado: number | null = 1;

  readonly soloLecturaModal = signal(false);

  modalVisible = false;
  esModoEdicion = false;
  detalleSeleccionado: IServicioCatalogoDetalle | null = null;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void Promise.all([this.cargarGrupos(), this.cargarDatos(1)]);
  }

  async cargarGrupos(): Promise<void> {
    try {
      const lista = await this.api.listarGrupos();
      this.grupos.set(lista);
    } catch {}
  }

  async cargarDatos(pagina = 1): Promise<void> {
    this.cargando.set(true);
    this.errorGeneral.set('');
    try {
      const respuesta = await this.api.listar({
        filtro: this.filtroTexto.trim() || undefined,
        idGrupo:
          this.idGrupoSeleccionado > 0 ? this.idGrupoSeleccionado : undefined,
        cpt: this.soloCpt ?? undefined,
        quirurgico: this.soloQuirurgico ?? undefined,
        estado: this.estadoSeleccionado ?? undefined,
        page: pagina,
        pageSize: this.tamanoPagina(),
      });

      this.items.set(respuesta.items ?? []);
      this.totalItems.set(respuesta.totalItems ?? 0);
      this.totalPages.set(respuesta.totalPages ?? 1);
      this.paginaActual.set(respuesta.page ?? pagina);
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al cargar catálogo de servicios';
      this.errorGeneral.set(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  onFiltroTextoChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.cargarDatos(1);
    }, 350);
  }

  cambiarGrupo(idGrupo: number): void {
    this.idGrupoSeleccionado = idGrupo;
    this.cargarDatos(1);
  }

  cambiarFiltroCpt(valor: boolean | null): void {
    this.soloCpt = valor;
    this.cargarDatos(1);
  }

  cambiarFiltroQuirurgico(valor: boolean | null): void {
    this.soloQuirurgico = valor;
    this.cargarDatos(1);
  }

  cambiarEstado(estado: number | null): void {
    this.estadoSeleccionado = estado;
    this.cargarDatos(1);
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.idGrupoSeleccionado = 0;
    this.soloCpt = null;
    this.soloQuirurgico = null;
    this.estadoSeleccionado = 1;
    this.cargarDatos(1);
  }

  irPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPages()) return;
    this.cargarDatos(pagina);
  }

  abrirModalCreacion(): void {
    this.esModoEdicion = false;
    this.soloLecturaModal.set(false);
    this.detalleSeleccionado = null;
    this.errorMensajeModal.set('');
    this.modalVisible = true;
  }

  async abrirModalEdicion(item: IServicioCatalogoItem): Promise<void> {
    this.cargando.set(true);
    try {
      const detalle = await this.api.obtenerPorId(item.idProducto);
      this.esModoEdicion = true;
      this.soloLecturaModal.set(false);
      this.detalleSeleccionado = this.combinarDetalleConItem(detalle, item);
      this.errorMensajeModal.set('');
      this.modalVisible = true;
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al consultar servicio';
      this.errorGeneral.set(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  async abrirModalConsulta(item: IServicioCatalogoItem): Promise<void> {
    this.cargando.set(true);
    try {
      const detalle = await this.api.obtenerPorId(item.idProducto);
      this.esModoEdicion = true;
      this.soloLecturaModal.set(true);
      this.detalleSeleccionado = this.combinarDetalleConItem(detalle, item);
      this.errorMensajeModal.set('');
      this.modalVisible = true;
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al consultar servicio';
      this.errorGeneral.set(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  private combinarDetalleConItem(
    detalle: IServicioCatalogoDetalle,
    item: IServicioCatalogoItem,
  ): IServicioCatalogoDetalle {
    return {
      ...detalle,
      codMinsa: detalle.codMinsa || item.codMinsa || '',
      nombreCorto: detalle.nombreCorto || item.nombreCorto || '',
      codigoHis: detalle.codigoHis || item.codigoHis || '',
      cpms: detalle.cpms || item.cpms || '',
      codigoSis: detalle.codigoSis || item.codigoSis || '',
      codigoSoat: detalle.codigoSoat || item.codigoSoat || '',
      precioParticular:
        detalle.precioParticular && detalle.precioParticular > 0
          ? detalle.precioParticular
          : item.precioParticular || 0,
      precioSis:
        detalle.precioSis && detalle.precioSis > 0
          ? detalle.precioSis
          : item.precioSis || 0,
    };
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.detalleSeleccionado = null;
    this.errorMensajeModal.set('');
    this.soloLecturaModal.set(false);
  }

  async guardarServicio(evento: {
    idProducto?: number;
    payload: IServicioCatalogoGuardarPayload;
  }): Promise<void> {
    this.guardando.set(true);
    this.errorMensajeModal.set('');
    try {
      if (evento.idProducto && evento.idProducto > 0) {
        await this.api.actualizar(evento.idProducto, evento.payload);
      } else {
        await this.api.crear(evento.payload);
      }
      this.cerrarModal();
      this.modalGlobal.exito(
        evento.idProducto && evento.idProducto > 0
          ? 'Procedimiento / servicio actualizado correctamente.'
          : 'Procedimiento / servicio registrado en el catálogo institucional.',
        'Catálogo de Servicios',
      );
      await this.cargarDatos(this.paginaActual());
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al guardar servicio';
      this.errorMensajeModal.set(mensaje);
      this.modalGlobal.error(mensaje, 'Error al Guardar');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminarServicio(idProducto: number): Promise<void> {
    const confirmado = await this.modalGlobal.confirmar(
      '¿Está seguro de dar de baja este servicio o procedimiento? Quedará como inactivo en el catálogo.',
      'Dar de Baja — Servicio / Procedimiento',
      'Sí, Dar de Baja',
    );
    if (!confirmado) return;

    this.guardando.set(true);
    try {
      await this.api.eliminar(idProducto);
      this.cerrarModal();
      this.modalGlobal.exito(
        'El servicio / procedimiento ha sido dado de baja del catálogo.',
        'Dado de Baja',
      );
      await this.cargarDatos(this.paginaActual());
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al dar de baja el servicio';
      this.modalGlobal.error(mensaje, 'Error al Dar de Baja');
    } finally {
      this.guardando.set(false);
    }
  }
}
