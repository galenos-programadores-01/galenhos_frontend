import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import type { ErrorCampoUi } from '../../validacion/error-campo.tipos';
import { tituloResumenErrores } from '../../validacion/error-campo.util';

/**
 * Resumen de errores de un paso (patrón wizard / WCAG).
 * Reutilizable: PA, Evolución u otros módulos.
 */
@Component({
  selector: 'app-resumen-errores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen-errores.component.html',
  styleUrl: './resumen-errores.component.css',
})
export class ResumenErroresComponent {
  @Input() errores: ErrorCampoUi[] = [];
  @Input() titulo = '';
  /** Emite el ancla o campoId al elegir un ítem. */
  @Output() readonly irACampo = new EventEmitter<string>();

  @ViewChild('raiz', { read: ElementRef })
  private raiz?: ElementRef<HTMLElement>;

  get visible(): boolean {
    return this.errores.length > 0;
  }

  get tituloEfectivo(): string {
    return this.titulo.trim() || tituloResumenErrores(this.errores.length);
  }

  /** Llamar tras mostrar errores para accesibilidad. */
  enfocar(): void {
    queueMicrotask(() => this.raiz?.nativeElement?.focus());
  }

  onClickItem(error: ErrorCampoUi): void {
    this.irACampo.emit(error.ancla || error.campoId);
  }
}
