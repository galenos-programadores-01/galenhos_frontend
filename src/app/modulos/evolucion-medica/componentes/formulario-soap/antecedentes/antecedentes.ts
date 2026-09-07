import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import {
  FormBuilder,
  type FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { IPacienteDatosAdicionales } from '../../../../../compartido/tipos/tipos';
import { ModalGlobalService } from '../../../../../compartido/ui/modal-global/modal-global.service';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import { PacientesApiService } from '../../../../pacientes/adaptadores/salida/http/pacientes.api.service';
import { EvolucionService } from '../../../servicios/evolucion.service';

@Component({
  selector: 'app-antecedentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErrorMensajeComponent],
  templateUrl: './antecedentes.html',
})
export class AntecedentesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly evolucionService = inject(EvolucionService);
  private readonly pacientesApi = inject(PacientesApiService);
  private readonly modalGlobal = inject(ModalGlobalService);

  public readonly cargando = signal<boolean>(false);
  public readonly guardando = signal<boolean>(false);
  public readonly modoEdicion = signal<boolean>(false);

  private datosOriginales: Record<string, unknown> = {};

  public readonly antecedentesForm: FormGroup = this.fb.group({
    quirurgicos: [{ value: '', disabled: true }, [Validators.maxLength(250)]],
    patologicos: [{ value: '', disabled: true }, [Validators.maxLength(250)]],
    obstetricos: [{ value: '', disabled: true }, [Validators.maxLength(250)]],
    alergias: [{ value: '', disabled: true }, [Validators.maxLength(250)]],
    familiares: [{ value: '', disabled: true }, [Validators.maxLength(250)]],
    otros: [{ value: '', disabled: true }, [Validators.maxLength(250)]],
    comorbilidades: this.fb.group({
      hipertension: [{ value: false, disabled: true }],
      anemia: [{ value: false, disabled: true }],
      tuberculosis: [{ value: false, disabled: true }],
      obesidad: [{ value: false, disabled: true }],
      higadoGraso: [{ value: false, disabled: true }],
      fuma: [{ value: false, disabled: true }],
      dislipidemia: [{ value: false, disabled: true }],
      enfTiroidea: [{ value: false, disabled: true }],
      cancer: [{ value: false, disabled: true }],
    }),
    otrasComorbilidades: [
      { value: '', disabled: true },
      [Validators.maxLength(250)],
    ],
  });

  constructor() {
    effect(() => {
      const paciente = this.evolucionService.activePatient();
      if (paciente?.idPaciente) {
        this.cargarAntecedentes(paciente.idPaciente);
      } else {
        this.antecedentesForm.reset();
        this.antecedentesForm.disable();
        this.modoEdicion.set(false);
      }
    });
  }

  public async cargarAntecedentes(idPaciente: number): Promise<void> {
    this.cargando.set(true);
    try {
      const datos = await this.pacientesApi.obtenerDatosAdicionales(idPaciente);
      if (datos) {
        const valores = {
          quirurgicos: datos.antecedQuirurgico || '',
          patologicos: datos.antecedPatologico || '',
          obstetricos: datos.antecedObstetrico || '',
          alergias: datos.antecedAlergico || '',
          familiares: datos.antecedFamiliar || '',
          otros: datos.antecedentes || '',
          comorbilidades: {
            hipertension: datos.hipertensionArterial === 1,
            anemia: datos.anemia === 1,
            tuberculosis: datos.tuberculosis === 1,
            obesidad: datos.obesidad === 1,
            higadoGraso: datos.higadoGraso === 1,
            fuma: datos.fumaActualmente === 1,
            dislipidemia: datos.dislipidemia === 1,
            enfTiroidea: datos.enfTiroidea === 1,
            cancer: datos.cancer === 1,
          },
          otrasComorbilidades: datos.otrosComorbilidad || '',
        };
        this.datosOriginales = { ...valores };
        this.antecedentesForm.patchValue(valores);
        this.evolucionService.antecedentesActivos.set(datos);
      }
    } catch {
      // Si ocurre error o no existen registros previos, se mantienen campos limpios
    } finally {
      this.antecedentesForm.disable();
      this.modoEdicion.set(false);
      this.cargando.set(false);
    }
  }

  public activarEdicion(): void {
    this.modoEdicion.set(true);
    this.antecedentesForm.enable();
  }

  public cancelarEdicion(): void {
    this.antecedentesForm.patchValue(this.datosOriginales);
    this.antecedentesForm.disable();
    this.modoEdicion.set(false);
  }

  public async guardarCambios(): Promise<void> {
    if (this.antecedentesForm.invalid) {
      this.antecedentesForm.markAllAsTouched();
      return;
    }

    const paciente = this.evolucionService.activePatient();
    if (!paciente?.idPaciente) {
      this.modalGlobal.error('No hay paciente activo seleccionado.', 'Error');
      return;
    }

    this.guardando.set(true);
    try {
      const comorb = this.antecedentesForm.get('comorbilidades')?.value;
      const payload = {
        antecedQuirurgico:
          this.antecedentesForm.get('quirurgicos')?.value || '',
        antecedPatologico:
          this.antecedentesForm.get('patologicos')?.value || '',
        antecedObstetrico:
          this.antecedentesForm.get('obstetricos')?.value || '',
        antecedAlergico: this.antecedentesForm.get('alergias')?.value || '',
        antecedFamiliar: this.antecedentesForm.get('familiares')?.value || '',
        antecedentes: this.antecedentesForm.get('otros')?.value || '',
        hipertensionArterial: comorb?.hipertension ? 1 : 0,
        anemia: comorb?.anemia ? 1 : 0,
        tuberculosis: comorb?.tuberculosis ? 1 : 0,
        obesidad: comorb?.obesidad ? 1 : 0,
        higadoGraso: comorb?.higadoGraso ? 1 : 0,
        fumaActualmente: comorb?.fuma ? 1 : 0,
        dislipidemia: comorb?.dislipidemia ? 1 : 0,
        enfTiroidea: comorb?.enfTiroidea ? 1 : 0,
        cancer: comorb?.cancer ? 1 : 0,
        otrosComorbilidad:
          this.antecedentesForm.get('otrasComorbilidades')?.value || '',
      };

      await this.pacientesApi.actualizarDatosAdicionales(
        paciente.idPaciente,
        payload,
      );

      this.datosOriginales = {
        quirurgicos: payload.antecedQuirurgico,
        patologicos: payload.antecedPatologico,
        obstetricos: payload.antecedObstetrico,
        alergias: payload.antecedAlergico,
        familiares: payload.antecedFamiliar,
        otros: payload.antecedentes,
        comorbilidades: {
          hipertension: payload.hipertensionArterial === 1,
          anemia: payload.anemia === 1,
          tuberculosis: payload.tuberculosis === 1,
          obesidad: payload.obesidad === 1,
          higadoGraso: payload.higadoGraso === 1,
          fuma: payload.fumaActualmente === 1,
          dislipidemia: payload.dislipidemia === 1,
          enfTiroidea: payload.enfTiroidea === 1,
          cancer: payload.cancer === 1,
        },
        otrasComorbilidades: payload.otrosComorbilidad,
      };

      const datosActualizados: IPacienteDatosAdicionales = {
        idPaciente: paciente.idPaciente,
        antecedentes: payload.antecedentes,
        antecedAlergico: payload.antecedAlergico,
        antecedObstetrico: payload.antecedObstetrico,
        antecedQuirurgico: payload.antecedQuirurgico,
        antecedFamiliar: payload.antecedFamiliar,
        antecedPatologico: payload.antecedPatologico,
        hipertensionArterial: payload.hipertensionArterial,
        obesidad: payload.obesidad,
        dislipidemia: payload.dislipidemia,
        anemia: payload.anemia,
        higadoGraso: payload.higadoGraso,
        enfTiroidea: payload.enfTiroidea,
        tuberculosis: payload.tuberculosis,
        fumaActualmente: payload.fumaActualmente,
        cancer: payload.cancer,
        otrosComorbilidad: payload.otrosComorbilidad,
      };
      this.evolucionService.antecedentesActivos.set(datosActualizados);

      this.antecedentesForm.disable();
      this.modoEdicion.set(false);
      this.modalGlobal.exito(
        'Los antecedentes y comorbilidades del paciente fueron actualizados correctamente.',
        'Antecedentes guardados',
      );
    } catch (error) {
      console.error('Error guardando antecedentes:', error);
      this.modalGlobal.error(
        'No se pudo actualizar los antecedentes del paciente. Intente nuevamente.',
        'Error al guardar',
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
