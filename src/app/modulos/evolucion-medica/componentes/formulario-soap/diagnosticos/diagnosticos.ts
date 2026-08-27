import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  signal,
} from '@angular/core';
import {
  type FormArray,
  FormBuilder,
  type FormControl,
  type FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
import {
  type DiagnosticoBusqueda,
  EvolucionService,
} from '../../../servicios/evolucion.service';

export interface DxForm {
  cie10: FormControl<string | null>;
  descripcion: FormControl<string | null>;
  tipo: FormControl<string | null>;
  condicion: FormControl<string | null>;
  estado: FormControl<string | null>;
}

import { ColumnaTemplateDirective } from '../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../compartido/componentes/tabla/tabla.component';
import { SelectGlobalComponent } from '../../../../../compartido/ui/select-global/select-global';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';

@Component({
  selector: 'app-diagnosticos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectGlobalComponent,
    ErrorMensajeComponent,
    TablaComponent,
    ColumnaTemplateDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diagnosticos.html',
})
export class DiagnosticosComponent {
  @Input({ required: true }) formArray!: FormArray<FormGroup<DxForm>>;
  private readonly fb = inject(FormBuilder);
  public readonly authService = inject(AuthService);
  private readonly evolucionService = inject(EvolucionService);

  public readonly activeSearchIndex = signal<number | null>(null);
  public readonly searchResults = signal<DiagnosticoBusqueda[]>([]);
  public readonly isSearching = signal(false);

  private readonly searchSubject = new Subject<{
    texto: string;
    index: number;
  }>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => prev.texto === curr.texto),
      )
      .subscribe(async ({ texto }) => {
        if (!texto || texto.length < 2) {
          this.searchResults.set([]);
          this.isSearching.set(false);
          return;
        }

        this.isSearching.set(true);
        const paciente = this.evolucionService.activePatient();
        const idAtencion = paciente?.idRegAtencion || 0;
        const idPaciente = paciente?.idPaciente || 0;
        const resultados = await this.evolucionService.buscarDiagnosticos(
          texto,
          idAtencion,
          idPaciente,
        );
        this.searchResults.set(resultados);
        this.isSearching.set(false);
      });
  }

  columnasDiagnosticos: ColumnaTabla[] = [
    {
      campo: 'detallesCustom',
      cabecera: 'Detalles del Diagnóstico',
      ancho: 'auto',
    },
    {
      campo: 'accionesCustom',
      cabecera: '',
      alineacion: 'center',
      ancho: '40px',
    },
  ];

  agregarDx() {
    this.formArray.push(
      this.fb.group({
        cie10: [''],
        descripcion: [''],
        tipo: ['Presuntivo'],
        condicion: ['Secundario'],
        estado: ['Activo'],
      }) as FormGroup<DxForm>,
    );
  }

  removerDx(index: number) {
    this.formArray.removeAt(index);
  }

  onBuscar(evento: Event, index: number) {
    const texto = (evento.target as HTMLInputElement).value;
    this.activeSearchIndex.set(index);
    this.searchSubject.next({ texto, index });
  }

  showWarning = signal<boolean>(false);

  seleccionarDx(dx: DiagnosticoBusqueda, index: number) {
    if (dx.yaRegistrado > 0) {
      this.showWarning.set(true);
      setTimeout(() => this.showWarning.set(false), 4000);
    }
    const fg = this.formArray.at(index);
    fg.patchValue({
      cie10: dx.codigoCIE10,
      descripcion: dx.descripcion,
    });
    this.activeSearchIndex.set(null);
    this.searchResults.set([]);
  }

  cerrarBusqueda() {
    setTimeout(() => {
      this.activeSearchIndex.set(null);
    }, 200);
  }
}
