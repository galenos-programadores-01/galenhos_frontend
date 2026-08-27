import { CommonModule } from '@angular/common';
import { Component, inject, type OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  type FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ColumnaTemplateDirective } from '../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../compartido/componentes/tabla/tabla.component';
import { SelectGlobalComponent } from '../../../../../compartido/ui/select-global/select-global';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
import { EvolucionService } from '../../../servicios/evolucion.service';
import {
  type EspecialidadInterconsulta,
  type Interconsulta,
  InterconsultaService,
  type MedicoInterconsulta,
} from '../../../servicios/interconsulta.service';

@Component({
  selector: 'app-interconsultas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectGlobalComponent,
    TablaComponent,
    ColumnaTemplateDirective,
  ],
  templateUrl: './interconsultas.html',
})
export class InterconsultasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly interconsultaService = inject(InterconsultaService);
  public readonly evolucionService = inject(EvolucionService);
  public readonly authService = inject(AuthService);

  public readonly interconsultaForm: FormGroup = this.fb.group({
    prioridad: ['', Validators.required],
    idEspecialidad: ['', Validators.required],
    idMedicoDestino: [''],
    chkOpinion: [false],
    chkManejo: [false],
    chkTransferencia: [false],
    chkOtro: [false],
    motivoOtro: [''],
  });

  public readonly fechaActual = new Date();

  public readonly interconsultas = signal<Interconsulta[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');

  public readonly especialidades = signal<EspecialidadInterconsulta[]>([]);
  public readonly medicos = signal<MedicoInterconsulta[]>([]);
  public readonly medicosCargando = signal<boolean>(false);

  get columnasInterconsultas(): ColumnaTabla[] {
    const cols: ColumnaTabla[] = [
      { campo: 'fechaCustom', cabecera: 'Fecha' },
      { campo: 'especialidadCustom', cabecera: 'Especialidad' },
      { campo: 'motivoCustom', cabecera: 'Motivo' },
      { campo: 'estadoCustom', cabecera: 'Estado' },
    ];
    if (this.authService.hasPermission('modificar')) {
      cols.push({ campo: 'accionesCustom', cabecera: 'Acciones' });
    }
    return cols;
  }

  ngOnInit(): void {
    this.cargarHistorial();
    this.cargarEspecialidades();
  }

  async cargarEspecialidades(): Promise<void> {
    const lista = await this.interconsultaService.listarEspecialidades();
    this.especialidades.set(lista);
  }

  async cambiarEspecialidad(idEspecialidad: number): Promise<void> {
    this.interconsultaForm.patchValue({ idMedicoDestino: '' });
    this.medicos.set([]);

    if (!idEspecialidad) return;

    this.medicosCargando.set(true);
    const lista =
      await this.interconsultaService.listarMedicosPorEspecialidad(
        idEspecialidad,
      );
    this.medicos.set(lista);
    this.medicosCargando.set(false);
  }

  onEspecialidadChange(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.cambiarEspecialidad(valor ? Number(valor) : 0);
  }

  async cargarHistorial(): Promise<void> {
    const paciente = this.evolucionService.activePatient();
    if (!paciente?.idRegAtencion) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const datos = await this.interconsultaService.listarPorAtencion(
        paciente.idRegAtencion,
      );
      this.interconsultas.set(datos);
    } catch {
      this.errorMessage.set(
        'No se pudieron cargar las interconsultas previas.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async solicitar(): Promise<void> {
    if (this.interconsultaForm.invalid) return;

    const paciente = this.evolucionService.activePatient();
    const idAtencion = paciente?.idRegAtencion ?? 0;

    this.isSubmitting.set(true);

    const formData = this.interconsultaForm.value;

    // Build the "motivo" string from checkboxes
    const motivosSeleccionados: string[] = [];
    if (formData.chkOpinion)
      motivosSeleccionados.push('Opinion diagnosticos y sugerencias');
    if (formData.chkManejo)
      motivosSeleccionados.push('Manejo conjunto del paciente');
    if (formData.chkTransferencia)
      motivosSeleccionados.push('Transferencia del paciente');
    if (formData.chkOtro && formData.motivoOtro)
      motivosSeleccionados.push(formData.motivoOtro);

    const motivoFinal = motivosSeleccionados.join(', ');

    const request: Interconsulta = {
      idAtencionOrigen: idAtencion,
      idEspecialidad: Number(formData.idEspecialidad),
      idMedicoDestino: formData.idMedicoDestino
        ? Number(formData.idMedicoDestino)
        : 0,
      motivo: motivoFinal,
      // TODO: Mandar Prioridad al backend cuando se actualice el struct
      // prioridad: formData.prioridad
    };

    const exito = await this.interconsultaService.crear(request);
    this.isSubmitting.set(false);

    if (exito) {
      this.interconsultaForm.reset({
        prioridad: '',
        idEspecialidad: '',
        idMedicoDestino: '',
        chkOpinion: false,
        chkManejo: false,
        chkTransferencia: false,
        chkOtro: false,
        motivoOtro: '',
      });
      this.medicos.set([]);
      await this.cargarHistorial();
    } else {
      this.errorMessage.set(
        'Error al solicitar la interconsulta. Inténtalo de nuevo.',
      );
    }
  }

  async atender(idInterconsulta: number): Promise<void> {
    const exito = await this.interconsultaService.actualizarEstado(
      idInterconsulta,
      'En Progreso',
    );
    if (exito) {
      await this.cargarHistorial();
    }
  }

  obtenerNombreEspecialidad(idEspecialidad: number): string {
    const especialidad = this.especialidades().find(
      (e) => e.idEspecialidad === idEspecialidad,
    );
    return especialidad?.nombre ?? `Esp. #${idEspecialidad}`;
  }
}
