import { CommonModule } from '@angular/common';
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  effect,
  input,
  type OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts';
import type { ItemCanastaEvaluada } from '../../../../../tipos/farmacia-dashboard.tipos';

@Component({
  selector: 'app-grafico-esenciales-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full w-full gap-2">
      <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs">
        <div class="flex items-center gap-1.5 flex-1 min-w-[180px] max-w-xs">
          <div class="relative w-full">
            <input
              type="text"
              placeholder="Buscar fármaco (ej. meropenem, sodio)..."
              [ngModel]="filtroTexto()"
              (ngModelChange)="filtroTexto.set($event)"
              class="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded pl-7 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-[#07153a]" />
            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            @if (filtroTexto()) {
              <button
                type="button"
                (click)="filtroTexto.set('')"
                class="absolute right-2 top-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer">
                ✕
              </button>
            }
          </div>
        </div>

        @if (tieneFechas()) {
          <div class="inline-flex rounded p-0.5 bg-slate-200/80 border border-slate-300 text-[11px] font-semibold">
            <button
              type="button"
              (click)="modoMetrica.set('DISPENSACION')"
              [ngClass]="modoMetrica() === 'DISPENSACION' ? 'bg-[#07153a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              class="px-2 py-0.5 rounded transition-all cursor-pointer">
              Dispensación en Período
            </button>
            <button
              type="button"
              (click)="modoMetrica.set('STOCK')"
              [ngClass]="modoMetrica() === 'STOCK' ? 'bg-[#07153a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              class="px-2 py-0.5 rounded transition-all cursor-pointer">
              Stock Actual
            </button>
            <button
              type="button"
              (click)="modoMetrica.set('AMBOS')"
              [ngClass]="modoMetrica() === 'AMBOS' ? 'bg-[#07153a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              class="px-2 py-0.5 rounded transition-all cursor-pointer">
              Dispensado vs Stock
            </button>
          </div>
        }

        <div class="flex flex-wrap items-center gap-1">
          @if (tieneFechas()) {
            <button
              type="button"
              (click)="cambiarEstado('CON_SALIDAS')"
              class="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1"
              [ngClass]="filtroEstado() === 'CON_SALIDAS' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-blue-800 border-slate-200 hover:bg-blue-50'">
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="filtroEstado() === 'CON_SALIDAS' ? 'bg-white' : 'bg-blue-500'"></span>
              Con Salidas ({{ conteoDispensados() }})
            </button>

            <button
              type="button"
              (click)="cambiarEstado('SIN_SALIDAS')"
              class="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1"
              [ngClass]="filtroEstado() === 'SIN_SALIDAS' ? 'bg-slate-600 text-white border-slate-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="filtroEstado() === 'SIN_SALIDAS' ? 'bg-white' : 'bg-slate-400'"></span>
              Sin Salidas ({{ conteoSinDispensacion() }})
            </button>

            <button
              type="button"
              (click)="cambiarEstado('DESABASTECIDO')"
              class="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1"
              [ngClass]="filtroEstado() === 'DESABASTECIDO' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-white text-red-700 border-slate-200 hover:bg-red-50'">
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="filtroEstado() === 'DESABASTECIDO' ? 'bg-white' : 'bg-red-500'"></span>
              Agotados ({{ conteoDesabastecidos() }})
            </button>

            <button
              type="button"
              (click)="cambiarEstado('TODOS')"
              class="px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer border"
              [ngClass]="filtroEstado() === 'TODOS' ? 'bg-[#07153a] text-white border-[#07153a]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'">
              Todos ({{ items().length }})
            </button>
          } @else {
            <button
              type="button"
              (click)="cambiarEstado('CON_STOCK')"
              class="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1"
              [ngClass]="filtroEstado() === 'CON_STOCK' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-emerald-800 border-slate-200 hover:bg-emerald-50'">
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="filtroEstado() === 'CON_STOCK' ? 'bg-white' : 'bg-emerald-500'"></span>
              Con Stock ({{ conteoDisponibles() }})
            </button>

            <button
              type="button"
              (click)="cambiarEstado('DESABASTECIDO')"
              class="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1"
              [ngClass]="filtroEstado() === 'DESABASTECIDO' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-white text-red-700 border-slate-200 hover:bg-red-50'">
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="filtroEstado() === 'DESABASTECIDO' ? 'bg-white' : 'bg-red-500'"></span>
              Agotados ({{ conteoDesabastecidos() }})
            </button>

            <button
              type="button"
              (click)="cambiarEstado('SUBSTOCK')"
              class="px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1"
              [ngClass]="filtroEstado() === 'SUBSTOCK' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-amber-800 border-slate-200 hover:bg-amber-50'">
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="filtroEstado() === 'SUBSTOCK' ? 'bg-white' : 'bg-amber-500'"></span>
              Stock Bajo ({{ conteoSubstock() }})
            </button>

            <button
              type="button"
              (click)="cambiarEstado('TODOS')"
              class="px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer border"
              [ngClass]="filtroEstado() === 'TODOS' ? 'bg-[#07153a] text-white border-[#07153a]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'">
              Todos ({{ items().length }})
            </button>
          }
        </div>
      </div>

      @if (tieneFechas()) {
        <div class="flex items-center justify-between px-2.5 py-1 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-900">
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Período evaluado: <strong>{{ fechaInicio() }}</strong> al <strong>{{ fechaFin() }}</strong></span>
          </div>
          <span class="font-bold text-blue-800">Total dispensado en período: {{ totalDispensadoPeriodo() | number }} und</span>
        </div>
      }

      <div class="relative flex-1 w-full min-h-[300px]">
        @if (cargando()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <span class="text-xs font-semibold text-slate-500">Cargando fármacos esenciales...</span>
          </div>
        } @else if (itemsFiltrados().length === 0) {
          <div class="flex flex-col items-center justify-center h-full min-h-[290px] text-slate-400 text-xs">
            <svg class="w-8 h-8 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No se encontraron medicamentos esenciales para el criterio seleccionado.</span>
          </div>
        }
        <div #contenedorGrafico class="w-full h-full min-h-[300px]" [class.hidden]="itemsFiltrados().length === 0"></div>
      </div>
    </div>
  `,
})
export class GraficoEsencialesDetalleComponent
  implements AfterViewInit, OnDestroy
{
  @ViewChild('contenedorGrafico')
  private readonly contenedorGrafico?: ElementRef<HTMLDivElement>;

  readonly items = input<readonly ItemCanastaEvaluada[]>([]);
  readonly fechaInicio = input<string>('');
  readonly fechaFin = input<string>('');
  readonly cargando = input<boolean>(false);

  readonly tieneFechas = computed(() =>
    Boolean(this.fechaInicio() && this.fechaFin()),
  );

  readonly filtroTexto = signal<string>('');
  readonly filtroEstado = signal<string>('CON_STOCK');
  readonly modoMetrica = signal<'DISPENSACION' | 'STOCK' | 'AMBOS'>(
    'DISPENSACION',
  );

  readonly conteoDisponibles = computed(() => {
    return this.items().filter((i) => i.cantidadTotal > 0).length;
  });

  readonly conteoDesabastecidos = computed(() => {
    return this.items().filter((i) => i.cantidadTotal <= 0).length;
  });

  readonly conteoSubstock = computed(() => {
    return this.items().filter((i) => i.estadoSemaforo === 'SUBSTOCK').length;
  });

  readonly conteoDispensados = computed(() => {
    return this.items().filter((i) => i.consumoMensual > 0).length;
  });

  readonly conteoSinDispensacion = computed(() => {
    return this.items().filter((i) => i.consumoMensual <= 0).length;
  });

  readonly totalDispensadoPeriodo = computed(() => {
    return this.items().reduce((acum, item) => acum + item.consumoMensual, 0);
  });

  readonly itemsFiltrados = computed(() => {
    const todos = this.items();
    const texto = this.filtroTexto().trim().toLowerCase();
    const estado = this.filtroEstado();
    const conFechas = this.tieneFechas();

    let resultado = todos.filter((item) => {
      const coincideTexto =
        !texto ||
        item.nombre.toLowerCase().includes(texto) ||
        item.codigo.toLowerCase().includes(texto) ||
        item.formaFarmaceutica.toLowerCase().includes(texto);

      if (!coincideTexto) {
        return false;
      }

      if (estado === 'TODOS') {
        return true;
      }

      if (conFechas) {
        if (estado === 'CON_SALIDAS') {
          return item.consumoMensual > 0;
        }
        if (estado === 'SIN_SALIDAS') {
          return item.consumoMensual <= 0;
        }
        if (estado === 'DESABASTECIDO') {
          return item.cantidadTotal <= 0;
        }
      } else {
        if (estado === 'CON_STOCK') {
          return item.cantidadTotal > 0;
        }
        if (estado === 'DESABASTECIDO') {
          return item.cantidadTotal <= 0;
        }
        if (estado === 'SUBSTOCK') {
          return item.estadoSemaforo === 'SUBSTOCK';
        }
      }

      return true;
    });

    if (conFechas && this.modoMetrica() === 'DISPENSACION') {
      resultado = [...resultado].sort(
        (a, b) => b.consumoMensual - a.consumoMensual,
      );
    } else if (estado === 'DESABASTECIDO') {
      resultado = [...resultado].sort(
        (a, b) => b.consumoMensual - a.consumoMensual,
      );
    } else {
      resultado = [...resultado].sort(
        (a, b) => b.cantidadTotal - a.cantidadTotal,
      );
    }

    return resultado;
  });

  private instanciaGrafico: echarts.ECharts | null = null;
  private observadorRedimension: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const conFechas = this.tieneFechas();
      const estadoActual = this.filtroEstado();
      if (conFechas && estadoActual === 'CON_STOCK') {
        this.filtroEstado.set('CON_SALIDAS');
      } else if (!conFechas && estadoActual === 'CON_SALIDAS') {
        this.filtroEstado.set('CON_STOCK');
      }
    });

    effect(() => {
      this.itemsFiltrados();
      this.filtroEstado();
      this.modoMetrica();
      if (this.instanciaGrafico) {
        this.renderizarGrafico();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.contenedorGrafico?.nativeElement) {
      return;
    }

    this.instanciaGrafico = echarts.init(this.contenedorGrafico.nativeElement);
    this.renderizarGrafico();

    this.observadorRedimension = new ResizeObserver(() => {
      this.instanciaGrafico?.resize();
    });
    this.observadorRedimension.observe(this.contenedorGrafico.nativeElement);
  }

  ngOnDestroy(): void {
    this.observadorRedimension?.disconnect();
    this.instanciaGrafico?.dispose();
    this.instanciaGrafico = null;
  }

  cambiarEstado(estado: string): void {
    this.filtroEstado.set(estado);
  }

  private renderizarGrafico(): void {
    if (!this.instanciaGrafico) {
      return;
    }

    const items = [...this.itemsFiltrados()].reverse();
    if (items.length === 0) {
      this.instanciaGrafico.clear();
      return;
    }

    const conFechas = this.tieneFechas();
    const modo = conFechas ? this.modoMetrica() : 'STOCK';
    const nombres = items.map((i) => i.nombre);

    const seriesConfig: echarts.SeriesOption[] = [];

    if (modo === 'AMBOS') {
      seriesConfig.push({
        name: 'Dispensación Período',
        type: 'bar',
        barMaxWidth: 16,
        data: items.map((i) => ({
          value: i.consumoMensual,
          itemStyle: {
            color: '#2563eb',
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            color: '#1d4ed8',
            fontSize: 10,
            fontWeight: 'bold',
            formatter: () =>
              `${Number(i.consumoMensual).toLocaleString('es-PE')} sal`,
          },
        })),
      });

      seriesConfig.push({
        name: 'Stock Actual',
        type: 'bar',
        barMaxWidth: 16,
        data: items.map((i) => {
          const color =
            i.cantidadTotal <= 0
              ? '#dc2626'
              : i.estadoSemaforo === 'SUBSTOCK'
                ? '#d97706'
                : '#059669';
          return {
            value: i.cantidadTotal,
            itemStyle: {
              color: color,
              borderRadius: [0, 4, 4, 0],
            },
            label: {
              show: true,
              position: 'right',
              color: color,
              fontSize: 10,
              fontWeight: 'bold',
              formatter: () =>
                `${Number(i.cantidadTotal).toLocaleString('es-PE')} disp`,
            },
          };
        }),
      });
    } else {
      const esDispensacion = modo === 'DISPENSACION';
      const nombreSerie = esDispensacion
        ? 'Unidades Dispensadas en Período'
        : 'Stock Físico Disponible';

      seriesConfig.push({
        name: nombreSerie,
        type: 'bar',
        barMaxWidth: 24,
        data: items.map((i) => {
          const valor = esDispensacion ? i.consumoMensual : i.cantidadTotal;

          let color = '#07153a';
          if (esDispensacion) {
            color = i.consumoMensual > 0 ? '#1d4ed8' : '#94a3b8';
          } else {
            color =
              i.cantidadTotal <= 0
                ? '#dc2626'
                : i.estadoSemaforo === 'SUBSTOCK'
                  ? '#d97706'
                  : i.estadoSemaforo === 'SOBRESTOCK'
                    ? '#7c3aed'
                    : '#059669';
          }

          return {
            value: valor,
            itemStyle: {
              color: color,
              borderRadius: [0, 4, 4, 0],
            },
            label: {
              show: true,
              position: 'right',
              distance: 6,
              color: color,
              fontSize: 11,
              fontWeight: 'bold',
              formatter: () => {
                if (esDispensacion) {
                  if (valor <= 0) return '0 (Sin salidas)';
                  return `${Number(valor).toLocaleString('es-PE')} und dispensadas`;
                }
                if (i.cantidadTotal <= 0) return '0 (Agotado)';
                return `${Number(valor).toLocaleString('es-PE')} und`;
              },
            },
          };
        }),
      });
    }

    const cantidadMostrar = Math.min(12, items.length);
    const inicioZoom = Math.max(0, items.length - cantidadMostrar);

    const opciones: echarts.EChartsOption = {
      legend:
        modo === 'AMBOS'
          ? {
              show: true,
              top: 0,
              right: 20,
              textStyle: { fontSize: 11, color: '#334155' },
            }
          : { show: false },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#07153a',
        textStyle: { color: '#ffffff', fontSize: 12 },
        borderWidth: 0,
        padding: [10, 14],
        formatter: (params) => {
          const lista = params as Array<{ dataIndex: number }>;
          if (!lista || lista.length === 0) return '';
          const idx = lista[0].dataIndex;
          const med = items[idx];
          if (!med) return '';

          const stock = Number(med.cantidadTotal).toLocaleString('es-PE');
          const dispensado = Number(med.consumoMensual).toLocaleString('es-PE');
          const esAgotado = med.cantidadTotal <= 0;
          const colorBadge = esAgotado
            ? 'color:#f87171;'
            : med.estadoSemaforo === 'SUBSTOCK'
              ? 'color:#fbbf24;'
              : 'color:#34d399;';

          return `
            <div style="font-weight:700;font-size:12px;margin-bottom:6px;max-width:320px;line-height:1.3;">
              ${med.nombre}
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;font-size:11px;border-top:1px solid rgba(255,255,255,0.2);padding-top:6px;">
              <div>Código SISMED: <strong>${med.codigo}</strong></div>
              <div>Presentación: <strong>${med.formaFarmaceutica}</strong></div>
              <div>${conFechas ? 'Dispensado en Período' : 'Consumo Promedio'}: <strong style="font-size:13px;color:#60a5fa;">${dispensado} unidades</strong></div>
              <div>Stock en Almacén: <strong style="font-size:13px;${colorBadge}">${stock} unidades</strong></div>
              <div>Estado de Abastecimiento: <strong style="${colorBadge}">${esAgotado ? 'AGOTADO' : med.estadoSemaforo}</strong></div>
            </div>
          `;
        },
      },
      grid: {
        top: modo === 'AMBOS' ? 25 : 15,
        left: '2%',
        right: '22%',
        bottom: 15,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: nombres,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: {
          color: '#1e293b',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (val: string) =>
            val.length > 28 ? `${val.slice(0, 26)}...` : val,
        },
      },
      dataZoom: [
        {
          type: 'slider',
          yAxisIndex: 0,
          width: 14,
          right: 6,
          top: 15,
          bottom: 15,
          startValue: inicioZoom,
          endValue: items.length - 1,
          borderColor: '#cbd5e1',
          fillerColor: 'rgba(7, 21, 58, 0.12)',
          handleStyle: { color: '#07153a' },
          brushSelect: false,
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          startValue: inicioZoom,
          endValue: items.length - 1,
          zoomOnMouseWheel: false,
          moveOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      series: seriesConfig,
    };

    this.instanciaGrafico.setOption(opciones, true);
  }
}
