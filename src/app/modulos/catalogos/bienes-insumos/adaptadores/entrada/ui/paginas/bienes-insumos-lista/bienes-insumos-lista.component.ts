import { CommonModule } from '@angular/common';
import { Component, inject, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonesFiltroComponent } from '../../../../../../../../compartido/ui/botones-filtro/botones-filtro';
import { FiltrosGlobal } from '../../../../../../../../compartido/ui/filtros-global/filtros-global';
import { ModalGlobalService } from '../../../../../../../../compartido/ui/modal-global/modal-global.service';
import { PaginacionComponent } from '../../../../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../../../../compartido/ui/select-global/select-global';
import type {
  IBienInsumoDetalle,
  IBienInsumoGuardarPayload,
  IBienInsumoItem,
  ICatalogoBienesInsumosAuxiliares,
  IGrupoFarmacologico,
  ISubGrupoFarmacologico,
} from '../../../../../tipos/bienes-insumos.tipos';
import { BienesInsumosApiService } from '../../../../salida/http/bienes-insumos.api.service';
import { BienInsumoModalComponent } from '../../componentes/bien-insumo-modal/bien-insumo-modal.component';

@Component({
  selector: 'app-bienes-insumos-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BienInsumoModalComponent,
    PaginacionComponent,
    BotonesFiltroComponent,
    FiltrosGlobal,
    SelectGlobalComponent,
  ],
  templateUrl: './bienes-insumos-lista.component.html',
})
export class BienesInsumosListaComponent implements OnInit {
  private readonly api = inject(BienesInsumosApiService);
  private readonly modalGlobal = inject(ModalGlobalService);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorMensajeModal = signal('');
  readonly errorGeneral = signal('');

  readonly items = signal<IBienInsumoItem[]>([]);
  readonly grupos = signal<IGrupoFarmacologico[]>([]);
  readonly subgrupos = signal<ISubGrupoFarmacologico[]>([]);
  readonly auxiliares = signal<ICatalogoBienesInsumosAuxiliares | null>(null);

  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly paginaActual = signal(1);
  readonly tamanoPagina = signal(20);

  filtroTexto = '';
  idGrupoSeleccionado = 0;
  tipoProductoSeleccionado = 0;
  soloPetitorio = false;
  soloEsencial = false;
  estadoSeleccionado: number | null = 1;

  modalVisible = false;
  esModoEdicion = false;
  soloLecturaModal = signal(false);
  detalleSeleccionado: IBienInsumoDetalle | null = null;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void Promise.all([this.cargarAuxiliares(), this.cargarDatos(1)]);
  }

  async cargarAuxiliares(): Promise<void> {
    try {
      const aux = await this.api.obtenerAuxiliares();
      this.auxiliares.set(aux);
      this.grupos.set(aux.grupos ?? []);
    } catch {
      try {
        const listaGrupos = await this.api.listarGrupos();
        this.grupos.set(listaGrupos);
        this.auxiliares.set({
          centrosCosto: [],
          partidas: [],
          paises: [],
          prefijos: [],
          financiamientos: [],
          grupos: listaGrupos,
        });
      } catch {}
    }
  }

  async cargarSubGrupos(idGrupo: number): Promise<void> {
    if (!idGrupo || idGrupo <= 0) {
      this.subgrupos.set([]);
      return;
    }
    try {
      const lista = await this.api.listarSubGrupos(idGrupo);
      this.subgrupos.set(lista);
    } catch {
      this.subgrupos.set([]);
    }
  }

  async cargarDatos(pagina = 1): Promise<void> {
    this.cargando.set(true);
    this.errorGeneral.set('');
    try {
      const respuesta = await this.api.listar({
        filtro: this.filtroTexto.trim() || undefined,
        idGrupo:
          this.idGrupoSeleccionado > 0 ? this.idGrupoSeleccionado : undefined,
        tipoProducto:
          this.tipoProductoSeleccionado > 0
            ? this.tipoProductoSeleccionado
            : undefined,
        petitorio: this.soloPetitorio ? true : undefined,
        indicadorGestion: this.soloEsencial ? true : undefined,
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
        error instanceof Error ? error.message : 'Error al cargar catálogo';
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

  cambiarTipoProducto(tipo: number): void {
    this.tipoProductoSeleccionado = tipo;
    this.cargarDatos(1);
  }

  togglePetitorio(): void {
    this.soloPetitorio = !this.soloPetitorio;
    this.cargarDatos(1);
  }

  toggleEsencial(): void {
    this.soloEsencial = !this.soloEsencial;
    this.cargarDatos(1);
  }

  cambiarEstado(estado: number | null): void {
    this.estadoSeleccionado = estado;
    this.cargarDatos(1);
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.idGrupoSeleccionado = 0;
    this.tipoProductoSeleccionado = 0;
    this.soloPetitorio = false;
    this.soloEsencial = false;
    this.estadoSeleccionado = 1;
    this.cargarDatos(1);
  }

  irPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPages()) return;
    this.cargarDatos(pagina);
  }

  async abrirModalCreacion(): Promise<void> {
    if (!this.auxiliares()) {
      await this.cargarAuxiliares();
    }
    this.esModoEdicion = false;
    this.soloLecturaModal.set(false);
    this.detalleSeleccionado = null;
    this.errorMensajeModal.set('');
    this.subgrupos.set([]);
    this.modalVisible = true;
  }

  async abrirModalEdicion(item: IBienInsumoItem): Promise<void> {
    this.cargando.set(true);
    try {
      if (!this.auxiliares()) {
        await this.cargarAuxiliares();
      }
      const detalle = await this.api.obtenerPorId(item.idProducto);
      if (detalle.idGrupoFarmacologico > 0) {
        await this.cargarSubGrupos(detalle.idGrupoFarmacologico);
      } else {
        this.subgrupos.set([]);
      }
      this.esModoEdicion = true;
      this.soloLecturaModal.set(false);
      this.detalleSeleccionado = detalle;
      this.errorMensajeModal.set('');
      this.modalVisible = true;
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al consultar producto';
      this.errorGeneral.set(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  async abrirModalConsulta(item: IBienInsumoItem): Promise<void> {
    this.cargando.set(true);
    try {
      if (!this.auxiliares()) {
        await this.cargarAuxiliares();
      }
      const detalle = await this.api.obtenerPorId(item.idProducto);
      if (detalle.idGrupoFarmacologico > 0) {
        await this.cargarSubGrupos(detalle.idGrupoFarmacologico);
      } else {
        this.subgrupos.set([]);
      }
      this.esModoEdicion = true;
      this.soloLecturaModal.set(true);
      this.detalleSeleccionado = detalle;
      this.errorMensajeModal.set('');
      this.modalVisible = true;
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al consultar producto';
      this.errorGeneral.set(mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.detalleSeleccionado = null;
    this.errorMensajeModal.set('');
    this.soloLecturaModal.set(false);
  }

  async guardarBienInsumo(evento: {
    idProducto?: number;
    payload: IBienInsumoGuardarPayload;
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
          ? 'Bien o insumo actualizado correctamente.'
          : 'Bien o insumo registrado correctamente en el catálogo.',
        'Catálogo de Bienes e Insumos',
      );
      await this.cargarDatos(this.paginaActual());
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al guardar producto';
      this.errorMensajeModal.set(mensaje);
      this.modalGlobal.error(mensaje, 'Error al Guardar');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminarBienInsumo(idProducto: number): Promise<void> {
    const confirmado = await this.modalGlobal.confirmar(
      '¿Está seguro de dar de baja este bien o insumo? El producto quedará como inactivo en el catálogo.',
      'Dar de Baja — Bien o Insumo',
      'Sí, Dar de Baja',
    );
    if (!confirmado) return;

    this.guardando.set(true);
    try {
      await this.api.eliminar(idProducto);
      this.cerrarModal();
      this.modalGlobal.exito(
        'El bien o insumo ha sido dado de baja del catálogo.',
        'Dado de Baja',
      );
      await this.cargarDatos(this.paginaActual());
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al dar de baja el producto';
      this.modalGlobal.error(mensaje, 'Error al Dar de Baja');
    } finally {
      this.guardando.set(false);
    }
  }
}
