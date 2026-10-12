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

@Component({
  selector: 'app-grafico-gauge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="sinContenedor() ? 'relative flex-1 w-full h-full min-h-[300px]' : 'bg-white border border-slate-200 rounded p-4 flex flex-col h-full shadow-xs'">
      @if (!sinContenedor() && titulo()) {
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

      <div class="relative flex-1 w-full min-h-[300px]">
        @if (cargando()) {
          <div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <span class="text-sm font-medium text-slate-500">Cargando medidor...</span>
          </div>
        }
        <div #contenedorGrafico class="w-full h-full min-h-[300px]"></div>
      </div>
    </div>
  `,
})
export class GraficoGaugeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('contenedorGrafico')
  private readonly contenedorGrafico?: ElementRef<HTMLDivElement>;

  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  readonly porcentaje = input<number>(0);
  readonly meta = input<number>(85);
  readonly etiqueta = input<string>('Disponibilidad');
  readonly cargando = input<boolean>(false);
  readonly sinContenedor = input<boolean>(false);

  private instanciaGrafico: echarts.ECharts | null = null;
  private observadorRedimension: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.porcentaje();
      this.meta();
      this.etiqueta();
      this.sinContenedor();
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

    const pct = Number(this.porcentaje() || 0);

    const opciones: echarts.EChartsOption = {
      tooltip: {
        formatter: `{a} <br/>{b} : ${pct.toFixed(1)}%`,
      },
      series: [
        {
          name: 'Indicador Oficial',
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 10,
          radius: '90%',
          center: ['50%', '55%'],
          axisLine: {
            lineStyle: {
              width: 18,
              color: [
                [0.7, '#dc2626'],
                [0.85, '#d97706'],
                [1, '#059669'],
              ],
            },
          },
          pointer: {
            itemStyle: {
              color: '#07153a',
            },
            width: 5,
            length: '65%',
          },
          axisTick: {
            distance: -22,
            length: 6,
            lineStyle: {
              color: '#ffffff',
              width: 1.5,
            },
          },
          splitLine: {
            distance: -24,
            length: 12,
            lineStyle: {
              color: '#ffffff',
              width: 2.5,
            },
          },
          axisLabel: {
            color: '#64748b',
            distance: 24,
            fontSize: 11,
            fontWeight: 'bold',
            formatter: (val: number) => {
              if (val === 0) return '0%';
              if (val === 70) return '70%';
              if (val === 85) return 'Meta 85%';
              if (val === 100) return '100%';
              return '';
            },
          },
          title: {
            offsetCenter: [0, '72%'],
            fontSize: 12,
            fontWeight: 'bold',
            color: '#475569',
          },
          detail: {
            valueAnimation: true,
            fontSize: 32,
            fontWeight: 'bold',
            offsetCenter: [0, '36%'],
            formatter: (val: number) => `${val.toFixed(1)}%`,
            color: pct >= 85 ? '#059669' : pct >= 70 ? '#d97706' : '#dc2626',
          },
          data: [
            {
              value: pct,
              name: this.etiqueta(),
            },
          ],
        },
      ],
    };

    this.instanciaGrafico.setOption(opciones, true);
  }
}
