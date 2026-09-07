import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { PacienteItem } from '../../../servicios/evolucion.service';
import { PASOS_NAVEGACION } from '../constantes/formulario-soap.constantes';

@Component({
  selector: 'app-navegacion-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navegacion-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavegacionSidebarComponent {
  @Input({ required: true }) paciente!: PacienteItem;
  @Input({ required: true }) activePanel = 'p1';

  @Output() seleccionarPanel = new EventEmitter<string>();

  public readonly pasos = PASOS_NAVEGACION;
}
