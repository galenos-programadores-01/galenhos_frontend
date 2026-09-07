import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { type FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
import { EvolucionService } from '../../../servicios/evolucion.service';
import { MotivoService } from '../../../servicios/motivo.service';

interface TipoMotivo {
  readonly valor: string;
  readonly etiqueta: string;
  readonly icono: string;
}

@Component({
  selector: 'app-motivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErrorMensajeComponent],
  templateUrl: './motivo.html',
})
export class MotivoComponent {
  @Input({ required: true }) formGroup!: FormGroup;

  private readonly motivoService = inject(MotivoService);
  private readonly evolucionService = inject(EvolucionService);
  public readonly authService = inject(AuthService);

  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');
  public readonly guardadoExitoso = signal<boolean>(false);

  public readonly tiposMotivo: readonly TipoMotivo[] = [
    { valor: 'Consulta', etiqueta: 'Consulta general', icono: 'usuario' },
    { valor: 'Seguimiento', etiqueta: 'Seguimiento', icono: 'pulso' },
    { valor: 'Control', etiqueta: 'Control', icono: 'check' },
    { valor: 'Reevaluación', etiqueta: 'Reevaluación', icono: 'refresh' },
    { valor: 'Postoperatorio', etiqueta: 'Postoperatorio', icono: 'cruz' },
    { valor: 'Interconsulta', etiqueta: 'Interconsulta', icono: 'mensaje' },
    { valor: 'Emergencia', etiqueta: 'Emergencia', icono: 'campana' },
  ];

  async registrarMotivo(): Promise<void> {
    if (this.formGroup.invalid) {
      return;
    }

    const paciente = this.evolucionService.activePatient();
    if (!paciente?.idRegAtencion) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.guardadoExitoso.set(false);

    const { tipo, descripcion } = this.formGroup.value as {
      tipo: string;
      descripcion: string;
    };

    const exito = await this.motivoService.crearMotivo(paciente.idRegAtencion, {
      idRegAtencion: paciente.idRegAtencion,
      tipo,
      descripcion,
    });

    this.isSubmitting.set(false);

    if (exito) {
      this.guardadoExitoso.set(true);
      setTimeout(() => {
        this.guardadoExitoso.set(false);
      }, 3000);
    } else {
      this.errorMessage.set(
        'No se pudo registrar el motivo. Inténtalo de nuevo.',
      );
    }
  }
}
