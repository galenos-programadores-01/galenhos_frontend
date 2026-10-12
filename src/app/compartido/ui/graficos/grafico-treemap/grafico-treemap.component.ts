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

export interface ItemTreemap {
  readonly idProducto?: number;
  readonly codigo?: string;
  readonly nombre: string;
  readonly formaFarmaceutica?: string;
  readonly stockActual?: number;
  readonly consumoMensual?: number;
  readonly estado?: string;
  readonly color?: string;
  readonly valor?: number;
}

export interface GrupoTreemap {
  readonly nombre: string;
  readonly color: string;
  readonly items: readonly ItemTreemap[];
}

@Component({
  selector: 'app-grafico-treemap',
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
            <span class="text-sm font-medium text-slate-500">Cargando visualización...</span>
          </div>
        }
        <div #contenedorGrafico class="w-full h-full min-h-[300px]"></div>
      </div>
    </div>
  `,
})
export class GraficoTreemapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('contenedorGrafico')
  private readonly contenedorGrafico?: ElementRef<HTMLDivElement>;

  readonly titulo = input<string>('');
  readonly subtitulo = input<string>('');
  readonly grupos = input<readonly GrupoTreemap[]>([]);
  readonly cargando = input<boolean>(false);
  readonly sinContenedor = input<boolean>(false);

  private instanciaGrafico: echarts.ECharts | null = null;
  private observadorRedimension: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.grupos();
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

    const grupos = this.grupos();
    if (!grupos || grupos.length === 0) {
      this.instanciaGrafico.clear();
      return;
    }

    const datosTreemap = grupos.map((grupo) => ({
      name: `${grupo.nombre} (${grupo.items.length})`,
      itemStyle: {
        color: grupo.color,
      },
      children: grupo.items.map((item) => ({
        name: item.nombre,
        value:
          item.valor && item.valor > 0
            ? Math.round(item.valor)
            : item.consumoMensual && item.consumoMensual > 0
              ? Math.round(item.consumoMensual)
              : 15,
        itemStyle: {
          color: item.color || grupo.color,
        },
        detalles: item,
      })),
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
            name: string;
            value: number;
            data?: { detalles?: ItemTreemap };
          };
          const detalle = parametro.data?.detalles;
          if (!detalle) {
            return `<strong>${parametro.name}</strong><br/>Total ítems agrupados: <strong>${Number(parametro.value ?? 0).toLocaleString('es-PE')}</strong>`;
          }
          const stock = Number(detalle.stockActual ?? 0).toLocaleString(
            'es-PE',
          );
          const consumo = Number(detalle.consumoMensual ?? 0).toLocaleString(
            'es-PE',
          );
          const colorEstado = detalle.color || '#38bdf8';
          return `
            <div style="min-width: 220px; line-height: 1.3;">
              <div style="font-weight: 700; font-size: 13px; color: #ffffff;">
                ${detalle.nombre}
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                Cód: <strong style="color: #cbd5e1;">${detalle.codigo ?? '-'}</strong> | Forma: <strong style="color: #cbd5e1;">${detalle.formaFarmaceutica ?? '-'}</strong>
              </div>
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #334155; display: flex; flex-direction: column; gap: 3px; font-size: 12px;">
                <div>Estado: <strong style="color: ${colorEstado};">${detalle.estado ?? '-'}</strong></div>
                <div>Stock Físico: <strong>${stock}</strong> und</div>
                <div>Demanda Mensual (CPA): <strong>${consumo}</strong> und</div>
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          leafDepth: 1,
          drillDownIcon: '▶',
          breadcrumb: {
            show: true,
            bottom: 2,
            left: 'center',
            itemStyle: {
              color: '#07153a',
              borderColor: '#1e293b',
              textStyle: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
            },
          },
          label: {
            show: true,
            position: 'insideTopLeft',
            distance: 4,
            formatter: (parametro: unknown) => {
              const p = parametro as { name: string };
              const texto = p.name ?? '';
              return texto.length > 24 ? `${texto.slice(0, 22)}...` : texto;
            },
            fontSize: 10,
            color: '#ffffff',
            fontWeight: 'bold',
          },
          upperLabel: {
            show: true,
            height: 22,
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: 11,
            backgroundColor: 'rgba(7, 21, 58, 0.75)',
            padding: [0, 8],
          },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 1.5,
            gapWidth: 1.5,
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#0f172a',
                borderWidth: 2,
                gapWidth: 2,
              },
              upperLabel: { show: false },
            },
            {
              itemStyle: {
                borderColor: '#ffffff',
                borderWidth: 1.5,
                gapWidth: 1.5,
              },
              upperLabel: { show: true },
            },
          ],
          data: datosTreemap,
        },
      ],
    };

    this.instanciaGrafico.setOption(opciones, true);
  }
}
