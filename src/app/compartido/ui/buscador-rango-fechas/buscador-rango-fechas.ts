import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface CriteriosBusqueda {
  filtro: string;
  fechaDesde: string;
  fechaHasta: string;
}

@Component({
  selector: 'buscador-rango-fechas',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buscador-rango-fechas.html',
})
export class BuscadorRangoFechas {
  @Input() placeholder = 'Buscar…';
  @Input() textoBoton = 'Buscar';
  @Input() cargando = false;

  @Input() set fechaDesdeInicial(valor: string) {
    this.fechaDesde = valor ?? '';
  }
  @Input() set fechaHastaInicial(valor: string) {
    this.fechaHasta = valor ?? '';
  }
  @Input() set filtroInicial(valor: string) {
    this.filtro = valor ?? '';
  }

  @Output() buscar = new EventEmitter<CriteriosBusqueda>();
  @Output() limpiarFiltros = new EventEmitter<void>();

  filtro = '';
  fechaDesde = '';
  fechaHasta = '';

  emitirBusqueda(): void {
    const filtroSaneado = this.filtro.trim().slice(0, 100);

    let inicio = this.fechaDesde;
    let fin = this.fechaHasta;

    if (inicio && fin && inicio > fin) {
      const temporal = inicio;
      inicio = fin;
      fin = temporal;
      this.fechaDesde = inicio;
      this.fechaHasta = fin;
    }

    this.buscar.emit({
      filtro: filtroSaneado,
      fechaDesde: inicio,
      fechaHasta: fin,
    });
  }

  limpiar(): void {
    this.filtro = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.limpiarFiltros.emit();
  }
}
