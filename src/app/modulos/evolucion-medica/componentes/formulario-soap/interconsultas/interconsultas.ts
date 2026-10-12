import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  type FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, type Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ColumnaTemplateDirective } from '../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../compartido/componentes/tabla/tabla.component';
import { PaginacionComponent } from '../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../compartido/ui/select-global/select-global';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
import {
  type DiagnosticoBusqueda,
  EvolucionService,
} from '../../../servicios/evolucion.service';
import {
  type EspecialidadInterconsulta,
  type Interconsulta,
  InterconsultaService,
  type MedicoInterconsulta,
} from '../../../servicios/interconsulta.service';

export interface DetalleMotivoInterconsulta {
  titulo: string;
  codigoCie10?: string;
  diagnostico?: string;
}

@Component({
  selector: 'app-interconsultas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectGlobalComponent,
    TablaComponent,
    ColumnaTemplateDirective,
    ErrorMensajeComponent,
    PaginacionComponent,
  ],
  templateUrl: './interconsultas.html',
})
export class InterconsultasComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly interconsultaService = inject(InterconsultaService);
  public readonly evolucionService = inject(EvolucionService);
  public readonly authService = inject(AuthService);

  public readonly interconsultaForm: FormGroup = this.fb.group({
    prioridad: ['NORMAL', [Validators.required]],
    IdEspecialidad: ['', [Validators.required]],
    idMedicoDestino: [''],
    chkOpinion: [false],
    chkManejo: [false],
    chkTransferencia: [false],
    chkOtro: [false],
    motivoOtro: ['', [Validators.maxLength(300)]],
    idDiagnostico: [null as number | null],
    cie10: [''],
    diagnosticoDescripcion: [''],
    resumenHC: ['', [Validators.maxLength(5000)]],
  });

  public readonly fechaActual = new Date();

  public readonly interconsultas = signal<Interconsulta[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');
  public readonly modalResumenAbierto = signal<boolean>(false);
  public readonly interconsultaSeleccionada = signal<Interconsulta | null>(
    null,
  );

  public readonly paginaActual = signal<number>(1);
  public readonly elementosPorPagina = 5;

  get totalPaginas(): number {
    return (
      Math.ceil(this.interconsultas().length / this.elementosPorPagina) || 1
    );
  }

  get interconsultasPaginadas(): Interconsulta[] {
    const inicio = (this.paginaActual() - 1) * this.elementosPorPagina;
    return this.interconsultas().slice(
      inicio,
      inicio + this.elementosPorPagina,
    );
  }

  public readonly especialidades = signal<EspecialidadInterconsulta[]>([]);
  public readonly medicos = signal<MedicoInterconsulta[]>([]);
  public readonly medicosCargando = signal<boolean>(false);
  public readonly diagnosticoSeleccionado = signal<DiagnosticoBusqueda | null>(
    null,
  );
  public readonly searchResults = signal<DiagnosticoBusqueda[]>([]);
  public readonly isSearching = signal<boolean>(false);
  public readonly showDropdown = signal<boolean>(false);
  private readonly searchSubject = new Subject<string>();
  private readonly cacheDiagnosticos = new Map<string, DiagnosticoBusqueda[]>();
  private searchSubscription?: Subscription;

  constructor() {
    effect(() => {
      const paciente = this.evolucionService.activePatient();
      if (paciente?.idRegAtencion) {
        this.cargarHistorial();
      } else {
        this.interconsultas.set([]);
      }
    });

    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(async (texto) => {
        const filtro = texto?.trim().toLowerCase() ?? '';
        if (filtro.length < 2) {
          this.searchResults.set([]);
          this.showDropdown.set(false);
          return;
        }

        if (this.cacheDiagnosticos.has(filtro)) {
          this.searchResults.set(this.cacheDiagnosticos.get(filtro) ?? []);
          this.showDropdown.set(true);
          return;
        }

        const paciente = this.evolucionService.activePatient();
        const idAtencion = paciente?.idRegAtencion ?? 0;
        const idPaciente = paciente?.idPaciente ?? 0;

        this.isSearching.set(true);
        try {
          const res = await this.evolucionService.buscarDiagnosticos(
            texto.trim(),
            idAtencion,
            idPaciente,
          );
          const lista = (res || []).slice(0, 30);
          this.cacheDiagnosticos.set(filtro, lista);
          this.searchResults.set(lista);
          this.showDropdown.set(true);
        } finally {
          this.isSearching.set(false);
        }
      });

    this.interconsultaForm
      .get('chkOpinion')
      ?.valueChanges.subscribe((marcado) => {
        if (!marcado) {
          this.limpiarDiagnostico();
        }
      });

    this.interconsultaForm.get('chkOtro')?.valueChanges.subscribe((marcado) => {
      const motivoControl = this.interconsultaForm.get('motivoOtro');
      if (marcado) {
        motivoControl?.setValidators([
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(300),
        ]);
      } else {
        motivoControl?.clearValidators();
        motivoControl?.setValue('');
      }
      motivoControl?.updateValueAndValidity();
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  onBuscarDiagnostico(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.searchSubject.next(valor);
  }

  seleccionarDiagnostico(dx: DiagnosticoBusqueda): void {
    this.diagnosticoSeleccionado.set(dx);
    this.interconsultaForm.patchValue({
      idDiagnostico: dx.idDiagnostico,
      cie10: dx.codigoCIE10,
      diagnosticoDescripcion: dx.descripcion,
    });
    this.showDropdown.set(false);
    this.searchResults.set([]);
  }

  limpiarDiagnostico(): void {
    this.diagnosticoSeleccionado.set(null);
    this.interconsultaForm.patchValue({
      idDiagnostico: null,
      cie10: '',
      diagnosticoDescripcion: '',
    });
    this.showDropdown.set(false);
    this.searchResults.set([]);
  }

  cerrarDropdown(): void {
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  get columnasInterconsultas(): ColumnaTabla[] {
    const cols: ColumnaTabla[] = [
      { campo: 'fechaCustom', cabecera: 'Fecha', ancho: '135px' },
      { campo: 'especialidadCustom', cabecera: 'Especialidad', ancho: '160px' },
      { campo: 'motivoCustom', cabecera: 'Motivo' },
      { campo: 'diagnosticoCustom', cabecera: 'Diagnóstico (CIE-10)' },
      { campo: 'resumenCustom', cabecera: 'Resumen H.C.' },
      { campo: 'estadoCustom', cabecera: 'Estado', ancho: '110px' },
    ];
    if (this.authService.hasPermission('modificar')) {
      cols.push({
        campo: 'accionesCustom',
        cabecera: 'Acciones',
        ancho: '90px',
      });
    }
    return cols;
  }

  obtenerDetallesMotivo(
    motivo: string | null | undefined,
  ): DetalleMotivoInterconsulta[] {
    if (!motivo) return [];

    const items = motivo.includes(' | ')
      ? motivo.split(' | ')
      : motivo.includes(' - Dx:')
        ? [motivo]
        : motivo.split(', ');

    return items.map((item) => {
      const matchDx = /^(.*?)\s*-\s*Dx:\s*\[([^\]]+)\]\s*(.*)$/.exec(item);
      if (matchDx) {
        return {
          titulo: matchDx[1].trim(),
          codigoCie10: matchDx[2].trim(),
          diagnostico: matchDx[3].trim(),
        };
      }
      return {
        titulo: item.trim(),
      };
    });
  }

  obtenerMotivos(motivo: string | null | undefined): string[] {
    const detalles = this.obtenerDetallesMotivo(motivo);
    return detalles
      .map((item) => item.titulo)
      .filter((titulo) => titulo.length > 0);
  }

  obtenerDiagnosticos(
    motivo: string | null | undefined,
  ): Array<{ codigoCie10: string; diagnostico: string }> {
    const detalles = this.obtenerDetallesMotivo(motivo);
    const lista: Array<{ codigoCie10: string; diagnostico: string }> = [];
    for (const item of detalles) {
      if (item.codigoCie10) {
        lista.push({
          codigoCie10: item.codigoCie10,
          diagnostico: item.diagnostico || 'Sin descripción',
        });
      }
    }
    return lista;
  }

  ngOnInit(): void {
    this.cargarHistorial();
    this.cargarEspecialidades();
  }

  async cargarEspecialidades(): Promise<void> {
    const lista = await this.interconsultaService.listarEspecialidades();
    this.especialidades.set(lista);
  }

  async cambiarEspecialidad(IdEspecialidad: number): Promise<void> {
    this.interconsultaForm.patchValue({ idMedicoDestino: '' });
    this.medicos.set([]);

    if (!IdEspecialidad) return;

    this.medicosCargando.set(true);
    const lista =
      await this.interconsultaService.listarMedicosPorEspecialidad(
        IdEspecialidad,
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
    if (this.interconsultaForm.invalid) {
      this.interconsultaForm.markAllAsTouched();
      return;
    }

    const paciente = this.evolucionService.activePatient();
    const idAtencion = paciente?.idRegAtencion ?? 0;

    this.isSubmitting.set(true);

    const formData = this.interconsultaForm.value;

    const motivosSeleccionados: string[] = [];
    if (formData.chkOpinion) {
      const dx = this.diagnosticoSeleccionado();
      if (!dx) {
        this.errorMessage.set(
          'Debe buscar y seleccionar un diagnóstico CIE-10 para la opinión médica.',
        );
        this.isSubmitting.set(false);
        return;
      }
      motivosSeleccionados.push(
        `Opinión, diagnósticos y sugerencias - Dx: [${dx.codigoCIE10}] ${dx.descripcion}`,
      );
    }
    if (formData.chkManejo)
      motivosSeleccionados.push('Manejo conjunto del paciente');
    if (formData.chkTransferencia)
      motivosSeleccionados.push('Transferencia del paciente');
    if (formData.chkOtro && formData.motivoOtro)
      motivosSeleccionados.push(formData.motivoOtro.trim());

    if (motivosSeleccionados.length === 0) {
      this.errorMessage.set(
        'Debe seleccionar al menos un motivo para la interconsulta.',
      );
      this.isSubmitting.set(false);
      return;
    }

    const motivoFinal = motivosSeleccionados.join(' | ');

    const request: Interconsulta = {
      idAtencionOrigen: idAtencion,
      IdEspecialidad: Number(formData.IdEspecialidad),
      idMedicoDestino: formData.idMedicoDestino
        ? Number(formData.idMedicoDestino)
        : 0,
      motivo: motivoFinal,
      resumenHC: formData.resumenHC ? formData.resumenHC.trim() : '',
    };

    const exito = await this.interconsultaService.crear(request);
    this.isSubmitting.set(false);

    if (exito) {
      this.interconsultaForm.reset({
        prioridad: 'NORMAL',
        IdEspecialidad: '',
        idMedicoDestino: '',
        chkOpinion: false,
        chkManejo: false,
        chkTransferencia: false,
        chkOtro: false,
        motivoOtro: '',
        idDiagnostico: null,
        cie10: '',
        diagnosticoDescripcion: '',
        resumenHC: '',
      });
      this.limpiarDiagnostico();
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

  abrirModalResumen(ic: Interconsulta): void {
    this.interconsultaSeleccionada.set(ic);
    this.modalResumenAbierto.set(true);
  }

  cerrarModalResumen(): void {
    this.modalResumenAbierto.set(false);
    this.interconsultaSeleccionada.set(null);
  }

  obtenerNombreEspecialidad(IdEspecialidad?: number): string {
    if (!IdEspecialidad) return '-';
    const especialidad = this.especialidades().find(
      (e) => e.IdEspecialidad === IdEspecialidad,
    );
    return especialidad?.nombre ?? `Esp. #${IdEspecialidad}`;
  }

  obtenerFechaHora(fechaRaw: unknown): string {
    if (!fechaRaw || typeof fechaRaw !== 'string') return '-';
    const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(fechaRaw);
    if (match) {
      const [, yyyy, mm, dd, hh, min] = match;
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
    return fechaRaw;
  }
}
