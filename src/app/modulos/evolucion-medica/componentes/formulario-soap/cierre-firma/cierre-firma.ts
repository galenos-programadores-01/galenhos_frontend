import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { ItemResumenVerificacion } from '../constantes/formulario-soap.constantes';

@Component({
  selector: 'app-cierre-firma',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cierre-firma.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CierreFirmaComponent {
  @Input({ required: true }) logoInstitucion = '';
  @Input({ required: true }) nombreMedicoFirmante = '';
  @Input({ required: true }) dniMedico = '';
  @Input({ required: true }) fechaEvolucion = '';
  @Input({ required: true }) horaEvolucion = '';
  @Input({ required: true }) cargoCompletoFirmante = '';
  @Input({ required: true }) isSigning = false;
  @Input({ required: true })
  resumenVerificacionEvolucion: ItemResumenVerificacion[] = [];
  @Input({ required: true }) totalSeccionesCompletadas = 0;

  @Output() firmar = new EventEmitter<void>();
  @Output() activarPanel = new EventEmitter<string>();
}
