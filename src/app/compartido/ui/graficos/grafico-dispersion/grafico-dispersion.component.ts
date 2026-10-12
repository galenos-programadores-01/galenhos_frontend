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

export interface PuntoDispersion {
  readonly idProducto?: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly formaFarmaceutica: string;
  readonly stockActual: number;
  readonly consumoMensual: number;
  readonly estado: string;
  readonly color: string;
}

@Component({
  selector: 'app-grafico-dispersion',
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
            <span class="text-sm font-medium text-slate-500">Cargando matriz...</span>
          </div>
        }
        <div #contenedorGrafico class="w-full h-full min-h-[300px]"></div>
      </div>
    </div>
  `,
})
export class GraficoDispersionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('contenedorGrafico')
  private readonly contenedorGrafico?: ElementRef<HTMLDivElement>;

  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  readonly puntos = input<readonly PuntoDispersion[]>([]);
  readonly cargando = input<boolean>(false);
  readonly sinContenedor = input<boolean>(false);

  private instanciaGrafico: echarts.ECharts | null = null;
  private observadorRedimension: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.puntos();
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

    const puntos = this.puntos();
    if (!puntos || puntos.length === 0) {
      this.instanciaGrafico.clear();
      return;
    }

    const seriesData = puntos.map((p) => ({
      value: [p.consumoMensual, p.stockActual],
      itemStyle: {
        color: p.color,
        shadowBlur: 4,
        shadowColor: 'rgba(0, 0, 0, 0.2)',
      },
      detalles: p,
    }));

    const opciones: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#07153a',
        borderColor: '#1e293b',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: unknown) => {
          const parametro = params as {
            data?: { detalles?: PuntoDispersion };
          };
          const detalle = parametro.data?.detalles;
          if (!detalle) {
            return '';
          }
          const stock = Number(detalle.stockActual).toLocaleString('es-PE');
          const consumo = Number(detalle.consumoMensual).toLocaleString(
            'es-PE',
          );
          return `
            <div style="min-width: 220px; line-height: 1.3;">
              <div style="font-weight: 700; font-size: 13px; color: #ffffff;">
                ${detalle.nombre}
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                Cód: <strong style="color: #cbd5e1;">${detalle.codigo}</strong> | Forma: <strong style="color: #cbd5e1;">${detalle.formaFarmaceutica}</strong>
              </div>
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #334155; display: flex; flex-direction: column; gap: 3px; font-size: 12px;">
                <div>Estado: <strong style="color: ${detalle.color};">${detalle.estado}</strong></div>
                <div>Stock Físico: <strong>${stock}</strong> und</div>
                <div>Demanda Mensual (CPA): <strong>${consumo}</strong> und</div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 25,
        left: '6%',
        right: '6%',
        bottom: 35,
        containLabel: true,
      },
      xAxis: {
        name: 'Demanda CPA',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: (v: number) => Number(v).toLocaleString('es-PE'),
        },
      },
      yAxis: {
        name: 'Stock Físico',
        nameTextStyle: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: (v: number) => Number(v).toLocaleString('es-PE'),
        },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (data: unknown) => {
            const arr = data as number[];
            const dem = arr[0] ?? 0;
            return Math.min(26, Math.max(9, Math.sqrt(dem) / 5 + 8));
          },
          data: seriesData,
        },
      ],
    };

    this.instanciaGrafico.setOption(opciones, true);
  }
}
