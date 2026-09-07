import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { PacienteItem } from '../../../servicios/evolucion.service';
import { AntecedentesComponent } from '../antecedentes/antecedentes';

@Component({
  selector: 'app-informacion-general',
  standalone: true,
  imports: [CommonModule, AntecedentesComponent],
  templateUrl: './informacion-general.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformacionGeneralComponent {
  @Input({ required: true }) paciente!: PacienteItem;
  @Input({ required: true }) numeroEvolucion = '—';
}
