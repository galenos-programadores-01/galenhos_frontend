import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { LoteVencimientoDetalleItem } from '../../../../../tipos/farmacia-dashboard.tipos';

@Component({
  selector: 'app-lotes-vencimiento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lotes-vencimiento-modal.component.html',
})
export class LotesVencimientoModalComponent {
  readonly visible = input.required<boolean>();
  readonly lotes = input.required<readonly LoteVencimientoDetalleItem[]>();
  readonly cargando = input.required<boolean>();
  readonly filtroDias = input<number>(60);
  readonly almacenNombre = input<string>('Todos los Almacenes');

  readonly cerrarModal = output<void>();
  readonly cambiarFiltroDias = output<number>();

  readonly filtroTexto = signal<string>('');

  readonly lotesFiltrados = computed(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    const lista = this.lotes();

    if (!texto) {
      return lista;
    }

    return lista.filter((item) => {
      const coincideNombre = item.nombre.toLowerCase().includes(texto);
      const coincideCodigo = item.codigo.toLowerCase().includes(texto);
      const coincideLote = item.lote.toLowerCase().includes(texto);
      const coincideMarca = (item.nombreMarca || '')
        .toLowerCase()
        .includes(texto);
      return coincideNombre || coincideCodigo || coincideLote || coincideMarca;
    });
  });

  readonly totalUnidadesEnRiesgo = computed(() => {
    return this.lotesFiltrados().reduce((acumulado, item) => {
      return acumulado + item.cantidad;
    }, 0);
  });

  alCerrar(): void {
    this.filtroTexto.set('');
    this.cerrarModal.emit();
  }

  alSeleccionarFiltroDias(dias: number): void {
    this.cambiarFiltroDias.emit(dias);
  }

  obtenerClaseBadge(estado: string): string {
    switch (estado) {
      case 'VENCIDO':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'CRITICO_30':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'ALERTA_60':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  }

  obtenerTextoBadge(estado: string, diasParaVencer: number): string {
    switch (estado) {
      case 'VENCIDO':
        return `Vencido hace ${Math.abs(diasParaVencer)} días`;
      case 'CRITICO_30':
        return `Vence este mes (${diasParaVencer} días)`;
      case 'ALERTA_60':
        return `Vence próximo mes (${diasParaVencer} días)`;
      default:
        return `Vence en ${diasParaVencer} días`;
    }
  }
}
