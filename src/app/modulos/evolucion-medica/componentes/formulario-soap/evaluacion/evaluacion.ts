import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  type FormArray,
  type FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { SelectGlobalComponent } from '../../../../../compartido/ui/select-global/select-global';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import { DiagnosticosComponent } from '../diagnosticos/diagnosticos';

@Component({
  selector: 'app-evaluacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectGlobalComponent,
    ErrorMensajeComponent,
    DiagnosticosComponent,
  ],
  templateUrl: './evaluacion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionComponent {
  @Input({ required: true }) soapForm!: FormGroup;
  @Input({ required: true }) diagnosticosArray!: FormArray;
}
