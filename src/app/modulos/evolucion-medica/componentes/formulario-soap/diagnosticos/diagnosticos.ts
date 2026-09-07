import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
} from '@angular/core';
import {
  type FormArray,
  FormBuilder,
  type FormControl,
  type FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, type Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { PaginacionComponent } from '../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../compartido/ui/select-global/select-global';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import { ValidadoresGalenos } from '../../../../../compartido/utilidades/validadores';
import {
  type DiagnosticoBusqueda,
  EvolucionService,
} from '../../../servicios/evolucion.service';

export interface DxForm {
  idDiagnostico: FormControl<number | null>;
  cie10: FormControl<string | null>;
  descripcion: FormControl<string | null>;
  tipo: FormControl<string | null>;
  condicion: FormControl<string | null>;
  estado: FormControl<string | null>;
}

@Component({
  selector: 'app-diagnosticos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ErrorMensajeComponent,
    SelectGlobalComponent,
    PaginacionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diagnosticos.html',
})
export class DiagnosticosComponent implements OnInit, OnDestroy {
  @Input({ required: true }) formArray!: FormArray<FormGroup<DxForm>>;
  private readonly fb = inject(FormBuilder);
  private readonly evolucionService = inject(EvolucionService);

  public readonly activeSearchIndex = signal<number | null>(null);
  public readonly searchResults = signal<DiagnosticoBusqueda[]>([]);
  public readonly isSearching = signal(false);
  public readonly showWarning = signal<boolean>(false);

  public readonly paginaActual = signal<number>(1);
  public readonly elementosPorPagina = 5;

  private readonly searchSubject = new Subject<{
    texto: string;
    index: number;
  }>();
  private searchSubscription?: Subscription;

  get totalPaginas(): number {
    return (
      Math.ceil(this.formArray.controls.length / this.elementosPorPagina) || 1
    );
  }

  get diagnosticosPaginados(): {
    control: FormGroup<DxForm>;
    indiceOriginal: number;
  }[] {
    const inicio = (this.paginaActual() - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.formArray.controls.slice(inicio, fin).map((control, i) => ({
      control: control as FormGroup<DxForm>,
      indiceOriginal: inicio + i,
    }));
  }

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => prev.texto === curr.texto),
      )
      .subscribe(async ({ texto }) => {
        if (!texto || texto.trim().length < 2) {
          this.searchResults.set([]);
          this.isSearching.set(false);
          return;
        }

        this.isSearching.set(true);
        const paciente = this.evolucionService.activePatient();
        const idAtencion = paciente?.idRegAtencion || 0;
        const idPaciente = paciente?.idPaciente || 0;
        const resultados = await this.evolucionService.buscarDiagnosticos(
          texto.trim(),
          idAtencion,
          idPaciente,
        );
        this.searchResults.set(resultados);
        this.isSearching.set(false);
      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  agregarDx(): void {
    const condicionPorDefecto =
      this.formArray.length === 0 ? 'Principal' : 'Secundario';
    this.formArray.push(
      this.fb.group({
        idDiagnostico: [0],
        cie10: ['', [Validators.required, ValidadoresGalenos.cie10()]],
        descripcion: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(250),
          ],
        ],
        tipo: ['Presuntivo', [Validators.required]],
        condicion: [condicionPorDefecto, [Validators.required]],
        estado: ['Activo', [Validators.required]],
      }) as FormGroup<DxForm>,
    );
    this.paginaActual.set(this.totalPaginas);
  }

  removerDx(index: number): void {
    this.formArray.removeAt(index);
    if (this.paginaActual() > this.totalPaginas) {
      this.paginaActual.set(Math.max(1, this.totalPaginas));
    }
  }

  onBuscar(evento: Event, index: number): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.activeSearchIndex.set(index);
    this.searchSubject.next({ texto, index });
  }

  seleccionarDx(dx: DiagnosticoBusqueda, index: number): void {
    if (dx.yaRegistrado > 0) {
      this.showWarning.set(true);
      setTimeout(() => this.showWarning.set(false), 4000);
    }
    const fg = this.formArray.at(index);
    fg.patchValue({
      idDiagnostico: dx.idDiagnostico,
      cie10: dx.codigoCIE10.trim().toUpperCase(),
      descripcion: dx.descripcion.trim(),
    });
    fg.get('cie10')?.markAsTouched();
    fg.get('descripcion')?.markAsTouched();
    this.activeSearchIndex.set(null);
    this.searchResults.set([]);
  }

  cerrarBusqueda(): void {
    setTimeout(() => {
      this.activeSearchIndex.set(null);
    }, 200);
  }
}
