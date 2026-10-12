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

export interface SerieBarras {
  readonly nombre: string;
  readonly datos: readonly number[];
  readonly color?: string;
  readonly apilado?: string;
}

@Component({
  selector: 'app-grafico-barras',
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
export class GraficoBarrasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('contenedorGrafico')
  private readonly contenedorGrafico?: ElementRef<HTMLDivElement>;

  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  readonly categorias = input<readonly string[]>([]);
  readonly datos = input<readonly number[]>([]);
  readonly series = input<readonly SerieBarras[]>([]);
  readonly coloresBarras = input<readonly string[]>([]);
  readonly color = input<string>('#07153a');
  readonly cargando = input<boolean>(false);
  readonly unidad = input<string>('');
  readonly horizontal = input<boolean>(true);
  readonly sinContenedor = input<boolean>(false);
  readonly mostrarPorcentaje = input<boolean>(false);

  private instanciaGrafico: echarts.ECharts | null = null;
  private observadorRedimension: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.categorias();
      this.datos();
      this.series();
      this.coloresBarras();
      this.color();
      this.unidad();
      this.horizontal();
      this.sinContenedor();
      this.mostrarPorcentaje();
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

    const esHorizontal = this.horizontal();
    const categorias = [...this.categorias()];
    const datos = [...this.datos()];
    const seriesPersonalizadas = this.series();
    const colores = this.coloresBarras();
    const tieneMultiplesSeries = seriesPersonalizadas.length > 0;

    let seriesConfiguradas: echarts.SeriesOption[];

    if (tieneMultiplesSeries) {
      seriesConfiguradas = seriesPersonalizadas.map((serie) => {
        const esApilado = Boolean(serie.apilado);
        return {
          name: serie.nombre,
          type: 'bar',
          barMaxWidth: 38,
          stack: serie.apilado,
          data: [...serie.datos],
          itemStyle: {
            color: serie.color,
            borderRadius: esApilado
              ? 0
              : esHorizontal
                ? [0, 4, 4, 0]
                : [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: esApilado ? 'inside' : esHorizontal ? 'right' : 'top',
            distance: esApilado ? 0 : 6,
            color: esApilado ? '#ffffff' : '#1e293b',
            fontSize: esApilado ? 11 : 10,
            fontWeight: 'bold',
            formatter: (parametro) => {
              const num = Number(parametro.value ?? 0);
              return num > 0 ? num.toLocaleString('es-PE') : '';
            },
          },
        };
      });
    } else {
      const maximoValor = datos.reduce(
        (acumulado, actual) => Math.max(acumulado, actual),
        0,
      );

      seriesConfiguradas = [
        {
          type: 'bar',
          barMaxWidth: 52,
          data: datos.map((valor, indice) => {
            const esCero = valor === 0;
            const esPequeno =
              esCero ||
              (esHorizontal && maximoValor > 0 && valor < maximoValor * 0.15);
            return {
              value: valor,
              itemStyle: {
                color: colores[indice] || this.color(),
                borderRadius: esHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
              },
              label: esHorizontal
                ? {
                    show: true,
                    position: esPequeno ? 'right' : 'insideRight',
                    distance: 8,
                    color: esCero
                      ? '#dc2626'
                      : esPequeno
                        ? '#1e293b'
                        : '#ffffff',
                    fontSize: 11,
                    fontWeight: 'bold',
                    formatter: () =>
                      esCero
                        ? '0 (AGOTADO)'
                        : Number(valor).toLocaleString('es-PE'),
                  }
                : {
                    show: true,
                    position: 'top',
                    color: esCero ? '#dc2626' : '#1e293b',
                    fontSize: 12,
                    fontWeight: 'bold',
                    formatter: () => {
                      if (esCero) {
                        return '0 (AGOTADO)';
                      }
                      const total = datos.reduce(
                        (acumulado, actual) => acumulado + actual,
                        0,
                      );
                      const porcentaje =
                        total > 0
                          ? ((Number(valor) / total) * 100).toFixed(1)
                          : '0';
                      return this.mostrarPorcentaje()
                        ? `${Number(valor).toLocaleString('es-PE')} (${porcentaje}%)`
                        : Number(valor).toLocaleString('es-PE');
                    },
                  },
            };
          }),
        },
      ];
    }

    const opciones: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#07153a',
        textStyle: { color: '#ffffff', fontSize: 13 },
        borderWidth: 0,
        padding: [8, 12],
        formatter: (params) => {
          const lista = params as Array<{
            name: string;
            value: number;
            seriesName?: string;
            marker?: string;
          }>;
          if (!lista || lista.length === 0) return '';
          if (tieneMultiplesSeries) {
            const totalFila = lista.reduce(
              (acumulado, actual) => acumulado + (Number(actual.value) || 0),
              0,
            );
            let html = `<div style="font-weight:700;font-size:12px;padding-bottom:3px;margin-bottom:3px;border-bottom:1px solid rgba(255,255,255,0.2);">${lista[0].name} (Total: ${totalFila.toLocaleString('es-PE')} ${this.unidad()})</div><div style="display:flex;flex-direction:column;gap:3px;">`;
            for (const item of lista) {
              const val = Number(item.value) || 0;
              const pct =
                totalFila > 0 ? ((val / totalFila) * 100).toFixed(1) : '0';
              html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><span>${item.marker ?? ''} ${item.seriesName}:</span><strong>${val.toLocaleString('es-PE')} (${pct}%)</strong></div>`;
            }
            html += '</div>';
            return html;
          }
          const primerElemento = lista[0];
          const total = datos.reduce(
            (acumulado, actual) => acumulado + actual,
            0,
          );
          const porcentaje =
            total > 0 ? ((primerElemento.value / total) * 100).toFixed(1) : '0';
          const textoPorcentaje = this.mostrarPorcentaje()
            ? ` (${porcentaje}%)`
            : '';
          return `<strong>${primerElemento.name}</strong><br/>Cantidad: <strong>${Number(primerElemento.value).toLocaleString('es-PE')}</strong> ${this.unidad()}${textoPorcentaje}`;
        },
      },
      legend: tieneMultiplesSeries
        ? {
            bottom: 0,
            textStyle: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
          }
        : undefined,
      grid: {
        top: 25,
        left: '3%',
        right: esHorizontal ? '12%' : '3%',
        bottom: tieneMultiplesSeries ? 35 : 15,
        containLabel: true,
      },
      xAxis: esHorizontal
        ? {
            type: 'value',
            splitLine: { lineStyle: { color: '#f1f5f9' } },
            axisLabel: { color: '#64748b', fontSize: 12 },
          }
        : {
            type: 'category',
            data: categorias,
            axisLabel: {
              color: '#475569',
              fontSize: 11,
              fontWeight: 'bold',
              interval: 0,
              formatter: (valor: string) => {
                if (valor.includes('\n')) return valor;
                if (valor.length > 18) {
                  const indiceEspacio = valor.indexOf(' ', 10);
                  if (indiceEspacio > 0) {
                    return `${valor.slice(0, indiceEspacio)}\n${valor.slice(indiceEspacio + 1)}`;
                  }
                }
                return valor;
              },
            },
            axisTick: { alignWithLabel: true },
          },
      yAxis: esHorizontal
        ? {
            type: 'category',
            data: categorias,
            axisLine: { lineStyle: { color: '#cbd5e1' } },
            axisLabel: {
              color: '#334155',
              fontSize: 12,
              fontWeight: 'bold',
              formatter: (valor: string) =>
                valor.length > 28 ? `${valor.slice(0, 26)}...` : valor,
            },
          }
        : {
            type: 'value',
            splitLine: { lineStyle: { color: '#f1f5f9' } },
            axisLabel: { color: '#64748b', fontSize: 12 },
          },
      series: seriesConfiguradas,
    };

    this.instanciaGrafico.setOption(opciones, true);
  }
}
