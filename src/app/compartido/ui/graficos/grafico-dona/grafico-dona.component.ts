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

export interface DatoDona {
  readonly nombre: string;
  readonly valor: number;
  readonly color?: string;
}

@Component({
  selector: 'app-grafico-dona',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="sinContenedor() ? 'relative flex-1 w-full h-full min-h-[260px]' : 'bg-white border border-slate-200 rounded p-4 flex flex-col h-full shadow-xs'">
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
export class GraficoDonaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('contenedorGrafico')
  private readonly contenedorGrafico?: ElementRef<HTMLDivElement>;

  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  readonly datos = input<readonly DatoDona[]>([]);
  readonly cargando = input<boolean>(false);
  readonly radioInterno = input<string>('50%');
  readonly radioExterno = input<string>('75%');
  readonly sinContenedor = input<boolean>(false);

  private instanciaGrafico: echarts.ECharts | null = null;
  private observadorRedimension: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.datos();
      this.radioInterno();
      this.radioExterno();
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

    const seriesData = this.datos().map((item) => ({
      name: item.nombre,
      value: item.valor,
      itemStyle: item.color ? { color: item.color } : undefined,
    }));

    const opciones: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#07153a',
        textStyle: { color: '#ffffff', fontSize: 13 },
        borderWidth: 0,
        padding: [8, 12],
        formatter: (params) => {
          const p = params as { name: string; value: number; percent: number };
          return `<strong>${p.name}</strong><br/>Cantidad: <strong>${p.value}</strong> (${p.percent}%)`;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
      },
      series: [
        {
          type: 'pie',
          radius: [this.radioInterno(), this.radioExterno()],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          labelLine: {
            show: false,
          },
          data: seriesData,
        },
      ],
    };

    this.instanciaGrafico.setOption(opciones, true);
  }
}
