import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { PacienteItem } from '../../../servicios/evolucion.service';

@Component({
  selector: 'app-cabecera-evolucion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cabecera-evolucion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabeceraEvolucionComponent {
  @Input({ required: true }) paciente!: PacienteItem;
  @Input({ required: true }) fechaEvolucion = '';
  @Input({ required: true }) horaEvolucion = '';
  @Input({ required: true }) medicoTratante = '';

  @Output() volverBandeja = new EventEmitter<void>();
}
