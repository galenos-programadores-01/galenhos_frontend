import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { type FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
import { EvolucionService } from '../../../servicios/evolucion.service';
import {
  type OrdenMedica,
  OrdenService,
} from '../../../servicios/orden.service';

@Component({
  selector: 'app-ordenes-medicas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErrorMensajeComponent],
  templateUrl: './ordenes-medicas.html',
})
export class OrdenesMedicasComponent {
  @Input({ required: true }) formGroup!: FormGroup;

  private readonly ordenService = inject(OrdenService);
  private readonly evolucionService = inject(EvolucionService);
  public readonly authService = inject(AuthService);

  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');
  public readonly successMessage = signal<string>('');

  get ordenesGroup(): FormGroup {
    return this.formGroup.get('ordenesMedicas') as FormGroup;
  }

  async guardarOrden() {
    const paciente = this.evolucionService.activePatient();
    if (!paciente) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    const ordenData = this.ordenesGroup.value;

    if (!ordenData.detalle && !ordenData.orden) {
      this.errorMessage.set(
        'Debe seleccionar una orden o ingresar el detalle de la misma.',
      );
      return;
    }

    this.isSubmitting.set(true);

    const request: OrdenMedica = {
      idRegAtencion: paciente.idRegAtencion,
      observacion: `${ordenData.orden ? `[${ordenData.orden}] ` : ''}${ordenData.detalle || ''}`,
      detalles: [],
    };

    const success = await this.ordenService.crearOrden(request);
    this.isSubmitting.set(false);

    if (success) {
      this.successMessage.set('Orden médica creada exitosamente.');
      this.ordenesGroup.reset();
      setTimeout(() => this.successMessage.set(''), 4000);
    } else {
      this.errorMessage.set(
        'Hubo un error al crear la orden médica. Inténtalo nuevamente.',
      );
    }
  }
}
