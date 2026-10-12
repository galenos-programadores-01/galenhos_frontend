import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  KardexMovimientoItem,
  ProductoDisponibilidadItem,
} from '../../../../../tipos/farmacia-dashboard.tipos';

@Component({
  selector: 'app-kardex-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kardex-modal.component.html',
})
export class KardexModalComponent {
  readonly visible = input.required<boolean>();
  readonly producto = input<ProductoDisponibilidadItem | null>(null);
  readonly movimientos = input.required<readonly KardexMovimientoItem[]>();
  readonly cargando = input.required<boolean>();

  readonly fechaInicioSignal = signal<string>(this.obtenerFechaHaceUnMes());
  readonly fechaFinSignal = signal<string>(this.obtenerFechaHoy());

  readonly filtrarRango = output<{
    readonly fechaInicio: string;
    readonly fechaFin: string;
  }>();
  readonly cerrarModal = output<void>();

  readonly totalEntradas = computed(() => {
    return this.movimientos()
      .filter((movimiento) => movimiento.movTipo === 'E')
      .reduce((acumulador, item) => acumulador + item.cantidad, 0);
  });

  readonly totalSalidas = computed(() => {
    return this.movimientos()
      .filter((movimiento) => movimiento.movTipo === 'S')
      .reduce((acumulador, item) => acumulador + item.cantidad, 0);
  });

  readonly totalMonto = computed(() => {
    return this.movimientos().reduce(
      (acumulador, item) => acumulador + item.total,
      0,
    );
  });

  alCerrar(): void {
    this.cerrarModal.emit();
  }

  alBuscarRango(): void {
    this.filtrarRango.emit({
      fechaInicio: this.fechaInicioSignal(),
      fechaFin: this.fechaFinSignal(),
    });
  }

  obtenerClaseTipoMovimiento(tipo: string): string {
    if (tipo === 'E') {
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-400';
    }
    if (tipo === 'S') {
      return 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400';
    }
    return 'bg-slate-500/15 text-slate-700 border-slate-300 dark:text-slate-400';
  }

  private obtenerFechaHaceUnMes(): string {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - 1);
    return fecha.toISOString().split('T')[0];
  }

  private obtenerFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }
}
