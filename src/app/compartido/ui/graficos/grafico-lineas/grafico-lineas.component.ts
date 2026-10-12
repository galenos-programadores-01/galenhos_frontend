import { CommonModule } from '@angular/common';
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  input,
  type OnDestroy,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';

export interface SerieLineas {
  readonly nombre: string;
  readonly datos: readonly number[];
  readonly color?: string;
  readonly relleno?: boolean;
}

@Component({
  selector: 'app-grafico-lineas',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white border border-slate-200 rounded p-4 flex flex-col h-full">
      @if (titulo()) {
        <div class="mb-3">
          <h3 class="text-sm font-bold text-[#07153a] uppercase tracking-wide">
            {{ titulo() }}
          </h3>
          @if (subtitulo()) {
            <p class="text-xs text-slate-500 mt-0.5">
              {{ subtitulo() }}
            </p>
          }
        </div>
      }

      <div class="relative flex-1 w-full min-h-[260px]">
        @if (cargando()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <span class="text-sm font-medium text-slate-500">Cargando gráfico...</span>
          </div>
        }
        <div #contenedorGrafico class="w-full h-full min-h-[260px]"></div>
      </div>
    </div>
  `,
})
export class GraficoLineasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('contenedorGrafico')
  private readonly contenedorGrafico?: ElementRef<HTMLDivElement>;

  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  readonly categorias = input<readonly string[]>([]);
  readonly series = input<readonly SerieLineas[]>([]);
  readonly cargando = input<boolean>(false);
  readonly unidad = input<string>('');

  private instanciaGrafico: echarts.ECharts | null = null;
  private observadorRedimension: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.categorias();
      this.series();
      this.unidad();
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

  private renderizarGrafico(): void {
    if (!this.instanciaGrafico) {
      return;
    }

    const seriesConfiguradas: echarts.SeriesOption[] = this.series().map(
      (serie) => ({
        name: serie.nombre,
        type: 'line',
        smooth: true,
        data: [...serie.datos],
        itemStyle: {
          color: serie.color || '#07153a',
        },
        lineStyle: {
          width: 2.5,
        },
        areaStyle: serie.relleno
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: serie.color
                    ? `${serie.color}35`
                    : 'rgba(7, 21, 58, 0.25)',
                },
                {
                  offset: 1,
                  color: serie.color
                    ? `${serie.color}05`
                    : 'rgba(7, 21, 58, 0.02)',
                },
              ]),
            }
          : undefined,
      }),
    );

    const opciones: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#07153a',
        textStyle: { color: '#ffffff', fontSize: 13 },
        borderWidth: 0,
        padding: [8, 12],
        valueFormatter: (valor) => `${valor} ${this.unidad()}`.trim(),
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
      },
      grid: {
        top: 20,
        left: '3%',
        right: '4%',
        bottom: 35,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [...this.categorias()],
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: 12 },
      },
      series: seriesConfiguradas,
    };

    this.instanciaGrafico.setOption(opciones, true);
  }
}
