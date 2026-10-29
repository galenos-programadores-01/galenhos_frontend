import { Component, inject, signal } from '@angular/core';
import { ApiRequestError } from '../../../../../../compartido/api-client/api-client.service';
import {
  type DatoDona,
  GraficoBarrasComponent,
  GraficoDonaComponent,
  type SerieBarras,
} from '../../../../../../compartido/ui/graficos';
import {
  DashrefconApiService,
  type ReferenciaPorMes,
} from '../../../salida/http/dashrefcon.api.service';

interface EstadoRefCon {
  id: number;
  nombre: string;
}

interface ResumenEstado {
  estado: string;
  total: number;
  color: string;
  porcentaje: number;
}

// Colores por estado para que barras y pastel usen la misma paleta.
const COLORES_ESTADO: Record<string, string> = {
  ACEPTADO: '#2563eb',
  RECHAZADO: '#dc2626',
  'PACIENTE RECIBIDO': '#059669',
  'PACIENTE CITADO': '#7c3aed',
  CONTRAREFERIDO: '#d97706',
};

const PALETA_ESTADOS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
];

const LISTA_ESTADOS: EstadoRefCon[] = [
  { id: 5, nombre: 'PACIENTE RECIBIDO' },
  { id: 8, nombre: 'CONTRAREFERIDO' },
  { id: 3, nombre: 'ACEPTADO' },
  { id: 7, nombre: 'PACIENTE CITADO' },
  { id: 4, nombre: 'RECHAZADO' },
];

@Component({
  selector: 'app-dashrefcon',
  standalone: true,
  imports: [GraficoBarrasComponent, GraficoDonaComponent],
  templateUrl: './dashrefcon.component.html',
  styles: ['.campo-fecha::-webkit-calendar-picker-indicator { opacity: 0; }'],
})
export class DashrefconComponent {
  private readonly apiService = inject(DashrefconApiService);

  estados: EstadoRefCon[] = LISTA_ESTADOS;

  fechaInicio = fechaHoy();
  fechaFin = fechaHoy();
  idEstado: number | null = null;

  readonly buscando = signal(false);
  readonly error = signal('');
  readonly resultado = signal('');

  // Datos para los gráficos.
  readonly hayDatos = signal(false);
  readonly barCategorias = signal<string[]>([]);
  readonly barSeries = signal<SerieBarras[]>([]);
  readonly donaDatos = signal<DatoDona[]>([]);

  // Tablero: cantidades por estado según los filtros.
  readonly resumen = signal<ResumenEstado[]>([]);
  readonly totalGeneral = signal(0);

  buscar(): void {
    this.error.set('');
    this.resultado.set('');

    if (!this.fechaInicio || !this.fechaFin) {
      this.error.set('Fecha inicio y fecha fin son obligatorias.');
      return;
    }
    if (this.fechaInicio > this.fechaFin) {
      this.error.set('La fecha inicio no puede ser mayor que la fecha fin.');
      return;
    }

    this.buscando.set(true);
    this.apiService
      .listarReferencias({
        fechaInicio: this.fechaInicio,
        fechaFin: this.fechaFin,
        estado: this.idEstado,
      })
      .then((filas) => this.aplicarDatos(filas))
      .catch((err: unknown) => {
        this.limpiarGraficos();
        this.error.set(
          err instanceof ApiRequestError
            ? err.message
            : 'No se pudieron obtener las referencias.',
        );
      })
      .finally(() => {
        this.buscando.set(false);
      });
  }

  onEstadoChange(valor: string) {
    this.idEstado = valor !== '' ? Number(valor) : null;
  }

  abrirCalendario(input: HTMLInputElement): void {
    const campo = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof campo.showPicker === 'function') {
      try {
        campo.showPicker();
        return;
      } catch {
        // Fallback si el navegador no permite abrir el selector.
      }
    }
    input.focus();
  }

  private limpiarGraficos(): void {
    this.hayDatos.set(false);
    this.barCategorias.set([]);
    this.barSeries.set([]);
    this.donaDatos.set([]);
    this.resumen.set([]);
    this.totalGeneral.set(0);
  }

  private aplicarDatos(filas: ReferenciaPorMes[]): void {
    if (!filas.length) {
      this.limpiarGraficos();
      this.resultado.set(
        'No se encontraron referencias en el rango seleccionado.',
      );
      return;
    }

    // Meses presentes, ordenados por número de mes.
    const meses = new Map<number, string>();
    for (const fila of filas) {
      if (!meses.has(fila.mes)) {
        meses.set(fila.mes, capitalizar(fila.nombreMes));
      }
    }
    const mesesOrden = [...meses.keys()].sort((a, b) => a - b);
    const indexMes = new Map(mesesOrden.map((mes, indice) => [mes, indice]));
    const categorias = mesesOrden.map((mes) => meses.get(mes) ?? '');

    // Estados presentes y su color.
    const estados = [...new Set(filas.map((fila) => fila.estado))];
    const colorDe = new Map(
      estados.map((estado, indice) => [estado, colorEstado(estado, indice)]),
    );

    // Una serie por estado (barras agrupadas por mes).
    const series: SerieBarras[] = estados.map((estado) => {
      const datos = new Array(mesesOrden.length).fill(0);
      for (const fila of filas) {
        if (fila.estado !== estado) continue;
        const indice = indexMes.get(fila.mes);
        if (indice !== undefined) datos[indice] = fila.cantidad;
      }
      return {
        nombre: estado,
        datos,
        color: colorDe.get(estado),
      };
    });

    // Pastel: total por estado.
    const totalPorEstado = new Map<string, number>();
    for (const fila of filas) {
      totalPorEstado.set(
        fila.estado,
        (totalPorEstado.get(fila.estado) ?? 0) + fila.cantidad,
      );
    }
    const dona: DatoDona[] = [...totalPorEstado.entries()].map(
      ([nombre, valor]) => ({
        nombre,
        valor,
        color: colorDe.get(nombre),
      }),
    );

    const total = filas.reduce(
      (acumulado, fila) => acumulado + fila.cantidad,
      0,
    );

    // Tablero: total por estado, ordenado según la lista de estados.
    const ordenEstados = new Map(
      LISTA_ESTADOS.map((estado, indice) => [estado.nombre, indice]),
    );
    const resumen: ResumenEstado[] = [...totalPorEstado.entries()]
      .map(([estado, cantidad]) => ({
        estado,
        total: cantidad,
        color: colorDe.get(estado) ?? '#64748b',
        porcentaje: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => {
        const indiceA = ordenEstados.get(a.estado.toUpperCase()) ?? 999;
        const indiceB = ordenEstados.get(b.estado.toUpperCase()) ?? 999;
        return indiceA - indiceB;
      });

    this.barCategorias.set(categorias);
    this.barSeries.set(series);
    this.donaDatos.set(dona);
    this.resumen.set(resumen);
    this.totalGeneral.set(total);
    this.hayDatos.set(true);
    this.resultado.set(
      `Se encontraron ${total.toLocaleString('es-PE')} referencias/contrarreferencias entre ${formatearFecha(this.fechaInicio)} y ${formatearFecha(this.fechaFin)}.`,
    );
  }
}

function colorEstado(nombre: string, indice: number): string {
  return (
    COLORES_ESTADO[nombre.toUpperCase()] ??
    PALETA_ESTADOS[indice % PALETA_ESTADOS.length]
  );
}

function capitalizar(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
