import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type {
  LoteItem,
  ProductoDisponibilidadItem,
} from '../../../../../tipos/farmacia-dashboard.tipos';

@Component({
  selector: 'app-lotes-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lotes-modal.component.html',
})
export class LotesModalComponent {
  readonly visible = input.required<boolean>();
  readonly producto = input<ProductoDisponibilidadItem | null>(null);
  readonly lotes = input.required<readonly LoteItem[]>();
  readonly cargando = input.required<boolean>();
  readonly cerrarModal = output<void>();

  alCerrar(): void {
    this.cerrarModal.emit();
  }

  obtenerClaseBadgeVencimiento(estado: string): string {
    switch (estado) {
      case 'VENCIDO':
        return 'bg-red-500/15 text-red-700 border-red-300 dark:text-red-400';
      case 'CRITICO_30':
        return 'bg-orange-500/15 text-orange-700 border-orange-300 dark:text-orange-400';
      case 'ALERTA_60':
        return 'bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-400';
      default:
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-400';
    }
  }

  obtenerTextoEstado(estado: string, dias: number): string {
    switch (estado) {
      case 'VENCIDO':
        return `Vencido hace ${Math.abs(dias)} d`;
      case 'CRITICO_30':
        return `Vence en ${dias} d`;
      case 'ALERTA_60':
        return `Vence en ${dias} d`;
      default:
        return `${dias} días vigentes`;
    }
  }
}
