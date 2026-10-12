import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-botones-filtro',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 shrink-0">
      <button
        type="button"
        (click)="buscar.emit()"
        class="px-3 py-2 bg-[#07153a] hover:bg-[#0c2360] text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 cursor-pointer"
        [disabled]="cargando">
        @if (cargando) {
          Buscando...
        } @else {
          Buscar
        }
      </button>

      @if (mostrarLimpiar) {
        <button
          type="button"
          (click)="limpiar.emit()"
          class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          [disabled]="cargando">
          Limpiar
        </button>
      }
    </div>
  `,
})
export class BotonesFiltroComponent {
  @Input() cargando = false;
  @Input() mostrarLimpiar = true;
  @Output() buscar = new EventEmitter<void>();
  @Output() limpiar = new EventEmitter<void>();
}
