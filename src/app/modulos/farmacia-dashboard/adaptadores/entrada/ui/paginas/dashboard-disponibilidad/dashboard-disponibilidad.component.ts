import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotonesFiltroComponent } from '../../../../../../../compartido/ui/botones-filtro/botones-filtro';
import { FiltrosGlobal } from '../../../../../../../compartido/ui/filtros-global/filtros-global';
import {
  type DatoDona,
  GraficoBarrasComponent,
  GraficoDonaComponent,
  GraficoGaugeComponent,
  type SerieBarras,
} from '../../../../../../../compartido/ui/graficos';
import { PaginacionComponent } from '../../../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import type {
  AlmacenComparativaStock,
  AlmacenFarmaciaItem,
  CanastaMedicamentos,
  DisponibilidadKpis,
  EstadisticasFarmaciaDashboard,
  ItemCanastaEvaluada,
  KardexMovimientoItem,
  LoteItem,
  LoteVencimientoDetalleItem,
  ProductoDisponibilidadItem,
  TopStockItem,
  VencimientoTramoItem,
} from '../../../../../tipos/farmacia-dashboard.tipos';
import { FarmaciaDashboardApiService } from '../../../../salida/http/farmacia-dashboard.api.service';
import { GraficoEsencialesDetalleComponent } from '../../componentes/grafico-esenciales-detalle/grafico-esenciales-detalle.component';
import { KardexModalComponent } from '../../componentes/kardex-modal/kardex-modal.component';
import { LotesModalComponent } from '../../componentes/lotes-modal/lotes-modal.component';
import { LotesVencimientoModalComponent } from '../../componentes/lotes-vencimiento-modal/lotes-vencimiento-modal.component';

@Component({
  selector: 'app-dashboard-disponibilidad',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LotesModalComponent,
    LotesVencimientoModalComponent,
    KardexModalComponent,
    PaginacionComponent,
    BotonesFiltroComponent,
    FiltrosGlobal,
    GraficoBarrasComponent,
    GraficoDonaComponent,
    GraficoGaugeComponent,
    GraficoEsencialesDetalleComponent,
    SelectGlobalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-disponibilidad.component.html',
})
export class DashboardDisponibilidadComponent implements OnInit {
  private readonly apiService = inject(FarmaciaDashboardApiService);

  readonly almacenes = signal<readonly AlmacenFarmaciaItem[]>([]);
  readonly idAlmacenSeleccionado = signal<number>(0);
  readonly kpis = signal<DisponibilidadKpis | null>(null);
  readonly productos = signal<readonly ProductoDisponibilidadItem[]>([]);

  readonly cargandoKpis = signal<boolean>(false);
  readonly cargandoProductos = signal<boolean>(false);
  readonly cargandoEstadisticas = signal<boolean>(false);
  readonly cargandoCanasta = signal<boolean>(false);

  readonly filtroTexto = signal<string>('');
  readonly estadoSemaforo = signal<string>('');
  readonly soloConStock = signal<boolean>(false);
  readonly soloEsenciales = signal<boolean>(false);
  readonly soloConMovimiento = signal<boolean>(false);
  readonly paginaActual = signal<number>(1);
  readonly totalPaginas = signal<number>(1);
  readonly totalRegistros = signal<number>(0);
  readonly tamanoPagina = 20;

  readonly canastaSeleccionada = signal<CanastaMedicamentos>('DIGEMID');
  readonly fechaInicioGraficos = signal<string>('');
  readonly fechaFinGraficos = signal<string>('');
  readonly fechaInicioTabla = signal<string>('');
  readonly fechaFinTabla = signal<string>('');

  readonly subtituloVencimientos = computed(() => {
    const inicio = this.fechaInicioGraficos();
    const fin = this.fechaFinGraficos();
    if (inicio && fin) {
      return `Lotes activos con caducidad entre ${inicio} y ${fin}`;
    }
    if (inicio) {
      return `Lotes activos con caducidad a partir del ${inicio}`;
    }
    if (fin) {
      return `Lotes activos con caducidad hasta el ${fin}`;
    }
    return 'Lotes activos organizados según proximidad de fecha de vencimiento';
  });

  readonly tituloTopStock = computed(() => {
    return this.fechaInicioGraficos() && this.fechaFinGraficos()
      ? 'Top 10 Medicamentos con Mayor Salida / Demanda'
      : 'Top 10 Medicamentos con Mayor Stock';
  });

  readonly subtituloTopStock = computed(() => {
    const inicio = this.fechaInicioGraficos();
    const fin = this.fechaFinGraficos();
    if (inicio && fin) {
      return `Fármacos con mayor volumen dispensado entre ${inicio} y ${fin}`;
    }
    if (inicio) {
      return `Fármacos con mayor volumen dispensado a partir del ${inicio}`;
    }
    if (fin) {
      return `Fármacos con mayor volumen dispensado hasta el ${fin}`;
    }
    return 'Productos con mayor existencia física disponible en el almacén consultado';
  });

  readonly unidadTopStock = computed(() => {
    return this.fechaInicioGraficos() && this.fechaFinGraficos()
      ? 'und dispensadas'
      : 'und';
  });

  readonly tituloAlmacenes = computed(() => {
    return this.fechaInicioGraficos() && this.fechaFinGraficos()
      ? 'Dispensación por Almacén / Farmacia'
      : 'Estado de Medicamentos por Almacén / Farmacia';
  });

  readonly subtituloAlmacenes = computed(() => {
    const inicio = this.fechaInicioGraficos();
    const fin = this.fechaFinGraficos();
    if (inicio && fin) {
      return `Volumen de medicamentos dispensados por modalidad entre ${inicio} y ${fin}`;
    }
    return 'Distribución de productos con stock, en riesgo y en quiebre en cada punto';
  });

  readonly unidadAlmacenes = computed(() => {
    return this.fechaInicioGraficos() && this.fechaFinGraficos()
      ? 'und'
      : 'fármacos';
  });

  readonly tieneRangoFechasGraficos = computed(() => {
    return Boolean(this.fechaInicioGraficos() && this.fechaFinGraficos());
  });

  readonly tieneRangoFechasTabla = computed(() => {
    return Boolean(this.fechaInicioTabla() && this.fechaFinTabla());
  });

  readonly totalDispensadosEsenciales = computed(() => {
    return this.esencialesItems().reduce(
      (acum, item) => acum + (item.consumoMensual || 0),
      0,
    );
  });

  readonly conteoEsencialesConSalida = computed(() => {
    return this.esencialesItems().filter(
      (item) => (item.consumoMensual || 0) > 0,
    ).length;
  });

  readonly vistaEsenciales = signal<'INDIVIDUAL' | 'GAUGE' | 'DONA'>(
    'INDIVIDUAL',
  );
  readonly esencialesItems = signal<readonly ItemCanastaEvaluada[]>([]);
  readonly esencialesDonaDatos = signal<readonly DatoDona[]>([]);

  readonly topCategorias = signal<readonly string[]>([]);
  readonly topValores = signal<readonly number[]>([]);

  readonly vencimientosCategorias = signal<readonly string[]>([]);
  readonly vencimientosValores = signal<readonly number[]>([]);
  readonly vencimientosColores = signal<readonly string[]>([]);

  readonly almacenesComparativaCategorias = signal<readonly string[]>([]);
  readonly almacenesComparativaSeries = signal<readonly SerieBarras[]>([]);

  readonly lotesModalVisible = signal<boolean>(false);
  readonly productoSeleccionadoLotes =
    signal<ProductoDisponibilidadItem | null>(null);
  readonly lotes = signal<readonly LoteItem[]>([]);
  readonly cargandoLotes = signal<boolean>(false);

  readonly kardexModalVisible = signal<boolean>(false);
  readonly productoSeleccionadoKardex =
    signal<ProductoDisponibilidadItem | null>(null);
  readonly movimientosKardex = signal<readonly KardexMovimientoItem[]>([]);
  readonly cargandoKardex = signal<boolean>(false);

  readonly lotesPorVencerModalVisible = signal<boolean>(false);
  readonly lotesPorVencer = signal<readonly LoteVencimientoDetalleItem[]>([]);
  readonly cargandoLotesPorVencer = signal<boolean>(false);
  readonly filtroDiasLotesPorVencer = signal<number>(60);

  ngOnInit(): void {
    void this.inicializarDashboard();
  }

  private async inicializarDashboard(): Promise<void> {
    await this.cargarAlmacenes();
    await Promise.all([
      this.cargarKpis(),
      this.cargarProductos(),
      this.cargarEstadisticas(),
    ]);
  }

  async actualizarTodo(): Promise<void> {
    await Promise.all([
      this.cargarKpis(),
      this.cargarProductos(),
      this.cargarEstadisticas(),
    ]);
  }

  async cargarAlmacenes(): Promise<void> {
    try {
      const resultado = await this.apiService.listarAlmacenes();
      this.almacenes.set(resultado);
    } catch {
      this.almacenes.set([]);
    }
  }

  async cargarKpis(): Promise<void> {
    this.cargandoKpis.set(true);
    try {
      const resultado = await this.apiService.obtenerKpis(
        this.idAlmacenSeleccionado(),
        this.canastaSeleccionada(),
      );
      this.kpis.set(resultado);
      this.actualizarDatosMedicamentosEsenciales(resultado);
    } catch {
      this.kpis.set(null);
      this.actualizarDatosMedicamentosEsenciales(null);
    } finally {
      this.cargandoKpis.set(false);
    }
  }

  async cargarProductos(): Promise<void> {
    this.cargandoProductos.set(true);
    try {
      const respuesta = await this.apiService.listarDisponibilidad({
        idAlmacen: this.idAlmacenSeleccionado(),
        filtro: this.filtroTexto(),
        estadoSemaforo: this.estadoSemaforo(),
        soloConStock: this.soloConStock(),
        soloEsenciales: this.soloEsenciales(),
        canastaTipo: this.soloEsenciales()
          ? this.canastaSeleccionada()
          : 'TODOS',
        fechaInicio: this.fechaInicioTabla(),
        fechaFin: this.fechaFinTabla(),
        soloConMovimiento: this.soloConMovimiento(),
        page: this.paginaActual(),
        pageSize: this.tamanoPagina,
      });
      this.productos.set(respuesta.items);
      this.totalRegistros.set(respuesta.totalItems);
      this.totalPaginas.set(respuesta.totalPages || 1);
    } catch {
      this.productos.set([]);
      this.totalRegistros.set(0);
      this.totalPaginas.set(1);
    } finally {
      this.cargandoProductos.set(false);
    }
  }

  async cargarEstadisticas(): Promise<void> {
    this.cargandoEstadisticas.set(true);
    try {
      const stats: EstadisticasFarmaciaDashboard =
        await this.apiService.obtenerEstadisticas(
          this.idAlmacenSeleccionado(),
          this.canastaSeleccionada(),
          this.fechaInicioGraficos(),
          this.fechaFinGraficos(),
        );

      const topReverso: readonly TopStockItem[] = [
        ...stats.topExistencias,
      ].reverse();
      this.topCategorias.set(
        topReverso.map((item: TopStockItem) => item.nombre),
      );
      this.topValores.set(
        topReverso.map((item: TopStockItem) => item.cantidad),
      );

      this.vencimientosCategorias.set(
        stats.distribucionVencimientos.map(
          (item: VencimientoTramoItem) => item.rango,
        ),
      );
      this.vencimientosValores.set(
        stats.distribucionVencimientos.map(
          (item: VencimientoTramoItem) => item.cantidadLotes,
        ),
      );
      const coloresVencimiento: Record<string, string> = {
        CRITICO: '#dc2626',
        ALERTA: '#ea580c',
        PRECAUCION: '#d97706',
        SEGUIMIENTO: '#2563eb',
        OPTIMO: '#059669',
      };
      this.vencimientosColores.set(
        stats.distribucionVencimientos.map(
          (item: VencimientoTramoItem) =>
            coloresVencimiento[item.nivelAlerta] || '#07153a',
        ),
      );

      this.almacenesComparativaCategorias.set(
        stats.comparativaAlmacenes.map(
          (item: AlmacenComparativaStock) => item.descripcion,
        ),
      );
      const conFechas = Boolean(
        this.fechaInicioGraficos() && this.fechaFinGraficos(),
      );
      this.almacenesComparativaSeries.set([
        {
          nombre: conFechas ? 'Dispensación SIS' : 'Con Stock',
          datos: stats.comparativaAlmacenes.map(
            (item: AlmacenComparativaStock) => item.normales,
          ),
          color: '#059669',
        },
        {
          nombre: conFechas ? 'Venta Contado' : 'Por Agotarse',
          datos: stats.comparativaAlmacenes.map(
            (item: AlmacenComparativaStock) => item.enRiesgo,
          ),
          color: '#d97706',
        },
        {
          nombre: conFechas ? 'Servicios / Otros' : 'Agotados',
          datos: stats.comparativaAlmacenes.map(
            (item: AlmacenComparativaStock) => item.enQuiebre,
          ),
          color: conFechas ? '#2563eb' : '#dc2626',
        },
      ]);

      if (stats.esencialesCriticos && stats.esencialesCriticos.length > 0) {
        this.esencialesItems.set(stats.esencialesCriticos);
      } else {
        this.esencialesItems.set([]);
      }
    } catch {
      this.topCategorias.set([]);
      this.topValores.set([]);
      this.vencimientosCategorias.set([]);
      this.vencimientosValores.set([]);
      this.vencimientosColores.set([]);
      this.almacenesComparativaCategorias.set([]);
      this.almacenesComparativaSeries.set([]);
      this.esencialesItems.set([]);
    } finally {
      this.cargandoEstadisticas.set(false);
    }
  }

  cambiarVistaEsenciales(vista: 'INDIVIDUAL' | 'GAUGE' | 'DONA'): void {
    this.vistaEsenciales.set(vista);
  }

  filtrarAgotadosCanasta(): void {
    this.soloEsenciales.set(true);
    this.estadoSemaforo.set('QUIEBRE');
    this.paginaActual.set(1);
    void this.cargarProductos();
    const elemento = document.getElementById('tabla-disponibilidad-farmacia');
    elemento?.scrollIntoView({ behavior: 'smooth' });
  }

  private actualizarDatosMedicamentosEsenciales(
    infoKpis: DisponibilidadKpis | null,
  ): void {
    if (!infoKpis) {
      this.esencialesDonaDatos.set([]);
      return;
    }

    const normostock = infoKpis.normostock ?? 0;
    const substock = infoKpis.substock ?? 0;
    const sobrestock = infoKpis.sobrestock ?? 0;
    const desabastecidos = Math.max(
      0,
      (infoKpis.totalEsenciales ?? 0) - (infoKpis.esencialesDisponibles ?? 0),
    );

    const datosDona: readonly DatoDona[] = [
      {
        nombre: 'Normostock (Óptimo)',
        valor: normostock,
        color: '#059669',
      },
      {
        nombre: 'Sobrestock (Exceso)',
        valor: sobrestock,
        color: '#7c3aed',
      },
      {
        nombre: 'Substock (Stock Bajo)',
        valor: substock,
        color: '#d97706',
      },
      {
        nombre: 'Desabastecido (Sin Stock)',
        valor: desabastecidos,
        color: '#dc2626',
      },
    ];

    this.esencialesDonaDatos.set(datosDona);
  }

  async alCambiarCanasta(canasta: CanastaMedicamentos): Promise<void> {
    this.canastaSeleccionada.set(canasta);
    this.cargandoCanasta.set(true);
    try {
      const [kpisResultado, statsResultado] = await Promise.all([
        this.apiService.obtenerKpis(this.idAlmacenSeleccionado(), canasta),
        this.apiService.obtenerEstadisticas(
          this.idAlmacenSeleccionado(),
          canasta,
          this.fechaInicioGraficos(),
          this.fechaFinGraficos(),
        ),
      ]);

      this.kpis.set(kpisResultado);
      this.actualizarDatosMedicamentosEsenciales(kpisResultado);

      if (
        statsResultado.esencialesCriticos &&
        statsResultado.esencialesCriticos.length > 0
      ) {
        this.esencialesItems.set(statsResultado.esencialesCriticos);
      } else {
        this.esencialesItems.set([]);
      }

      if (this.soloEsenciales()) {
        this.paginaActual.set(1);
        await this.cargarProductos();
      }
    } catch {
      this.esencialesItems.set([]);
    } finally {
      this.cargandoCanasta.set(false);
    }
  }

  alCambiarFechaInicioGraficos(fecha: string): void {
    this.fechaInicioGraficos.set(fecha);
  }

  alCambiarFechaFinGraficos(fecha: string): void {
    this.fechaFinGraficos.set(fecha);
  }

  alCambiarFechaInicioTabla(fecha: string): void {
    this.fechaInicioTabla.set(fecha);
  }

  alCambiarFechaFinTabla(fecha: string): void {
    this.fechaFinTabla.set(fecha);
  }

  async alAplicarFiltrosGraficos(): Promise<void> {
    await Promise.all([this.cargarKpis(), this.cargarEstadisticas()]);
  }

  async alLimpiarFiltrosGraficos(): Promise<void> {
    this.fechaInicioGraficos.set('');
    this.fechaFinGraficos.set('');
    await Promise.all([this.cargarKpis(), this.cargarEstadisticas()]);
  }

  async alCambiarSoloEsenciales(valor: boolean): Promise<void> {
    this.soloEsenciales.set(valor);
    this.paginaActual.set(1);
    await this.cargarProductos();
  }

  async filtrarCanastaEsencial(): Promise<void> {
    this.soloEsenciales.set(true);
    this.paginaActual.set(1);
    await this.cargarProductos();
    const elementoTabla = document.getElementById(
      'tabla-disponibilidad-farmacia',
    );
    if (elementoTabla) {
      elementoTabla.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async alCambiarAlmacen(idAlmacen: number): Promise<void> {
    this.idAlmacenSeleccionado.set(idAlmacen);
    this.paginaActual.set(1);
    await Promise.all([
      this.cargarKpis(),
      this.cargarProductos(),
      this.cargarEstadisticas(),
    ]);
  }

  async alCambiarPagina(pagina: number): Promise<void> {
    this.paginaActual.set(pagina);
    await this.cargarProductos();
  }

  async alFiltrarSemaforo(semaforo: string): Promise<void> {
    this.estadoSemaforo.set(semaforo);
    this.paginaActual.set(1);
    await this.cargarProductos();
  }

  async alCambiarSoloConStock(soloConStock: boolean): Promise<void> {
    this.soloConStock.set(soloConStock);
    this.paginaActual.set(1);
    await this.cargarProductos();
  }

  async alCambiarSoloConMovimiento(valor: boolean): Promise<void> {
    this.soloConMovimiento.set(valor);
    this.paginaActual.set(1);
    await this.cargarProductos();
  }

  async alBuscarTexto(): Promise<void> {
    this.paginaActual.set(1);
    await this.cargarProductos();
  }

  async alLimpiarFiltrosTabla(): Promise<void> {
    this.filtroTexto.set('');
    this.fechaInicioTabla.set('');
    this.fechaFinTabla.set('');
    this.soloConMovimiento.set(false);
    this.paginaActual.set(1);
    await this.cargarProductos();
  }

  async alLimpiarFiltros(): Promise<void> {
    this.filtroTexto.set('');
    this.estadoSemaforo.set('');
    this.soloConStock.set(false);
    this.soloEsenciales.set(false);
    this.soloConMovimiento.set(false);
    this.fechaInicioTabla.set('');
    this.fechaFinTabla.set('');
    this.paginaActual.set(1);
    await this.cargarProductos();
  }

  async abrirModalLotes(producto: ProductoDisponibilidadItem): Promise<void> {
    this.productoSeleccionadoLotes.set(producto);
    this.lotesModalVisible.set(true);
    this.cargandoLotes.set(true);
    try {
      const lotesResultado = await this.apiService.listarLotesPorProducto(
        producto.idProducto,
        this.idAlmacenSeleccionado(),
      );
      this.lotes.set(lotesResultado);
    } catch {
      this.lotes.set([]);
    } finally {
      this.cargandoLotes.set(false);
    }
  }

  cerrarModalLotes(): void {
    this.lotesModalVisible.set(false);
    this.productoSeleccionadoLotes.set(null);
    this.lotes.set([]);
  }

  async abrirModalKardex(producto: ProductoDisponibilidadItem): Promise<void> {
    this.productoSeleccionadoKardex.set(producto);
    this.kardexModalVisible.set(true);
    this.cargandoKardex.set(true);
    try {
      const resultado = await this.apiService.consultarKardex(
        producto.idProducto,
        this.idAlmacenSeleccionado(),
        this.fechaInicioTabla() || this.fechaInicioGraficos(),
        this.fechaFinTabla() || this.fechaFinGraficos(),
      );
      this.movimientosKardex.set(resultado);
    } catch {
      this.movimientosKardex.set([]);
    } finally {
      this.cargandoKardex.set(false);
    }
  }

  cerrarModalKardex(): void {
    this.kardexModalVisible.set(false);
    this.productoSeleccionadoKardex.set(null);
    this.movimientosKardex.set([]);
  }

  async consultarKardexRango(fechas: {
    readonly fechaInicio: string;
    readonly fechaFin: string;
  }): Promise<void> {
    const productoActual = this.productoSeleccionadoKardex();
    if (!productoActual) return;

    this.cargandoKardex.set(true);
    try {
      const resultado = await this.apiService.consultarKardex(
        productoActual.idProducto,
        this.idAlmacenSeleccionado(),
        fechas.fechaInicio,
        fechas.fechaFin,
      );
      this.movimientosKardex.set(resultado);
    } catch {
      this.movimientosKardex.set([]);
    } finally {
      this.cargandoKardex.set(false);
    }
  }

  obtenerClaseSemaforo(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'NORMAL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'RIESGO':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'QUIEBRE':
        return 'bg-red-50 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  obtenerEstadoDisponibilidadTexto(porcentaje: number | undefined): string {
    const valor = porcentaje ?? 0;
    if (valor >= 85) {
      return 'Óptimo (Cumple Meta)';
    }
    if (valor >= 70) {
      return 'Alerta (Subóptimo)';
    }
    return 'Crítico (En Riesgo)';
  }

  obtenerEstadoDisponibilidadClase(porcentaje: number | undefined): string {
    const valor = porcentaje ?? 0;
    if (valor >= 85) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (valor >= 70) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-red-50 text-red-700 border-red-200';
  }

  async abrirModalLotesPorVencer(diasMax = 60): Promise<void> {
    this.filtroDiasLotesPorVencer.set(diasMax);
    this.lotesPorVencerModalVisible.set(true);
    this.cargandoLotesPorVencer.set(true);
    try {
      const resultado = await this.apiService.listarLotesPorVencer(
        this.idAlmacenSeleccionado(),
        diasMax,
      );
      this.lotesPorVencer.set(resultado);
    } catch {
      this.lotesPorVencer.set([]);
    } finally {
      this.cargandoLotesPorVencer.set(false);
    }
  }

  cerrarModalLotesPorVencer(): void {
    this.lotesPorVencerModalVisible.set(false);
    this.lotesPorVencer.set([]);
  }

  async cambiarFiltroDiasLotesPorVencer(dias: number): Promise<void> {
    await this.abrirModalLotesPorVencer(dias);
  }

  obtenerNombreAlmacenSeleccionado(): string {
    const idActual = this.idAlmacenSeleccionado();
    if (idActual === 0) {
      return 'Todo el Hospital (Todos los Almacenes)';
    }
    const almacen = this.almacenes().find((a) => a.idAlmacen === idActual);
    return almacen?.descripcion || 'Almacén Seleccionado';
  }
}
