import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
} from '@angular/core';
import {
  type AbstractControl,
  type FormArray,
  FormBuilder,
  type FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import { PaginacionComponent } from '../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../compartido/ui/select-global/select-global';
import { ValidadoresGalenos } from '../../../../../compartido/utilidades/validadores';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
import { EvolucionService } from '../../../servicios/evolucion.service';
import { InterconsultasComponent } from '../interconsultas/interconsultas';

export interface CatalogOption {
  id: number;
  descripcion: string;
}

export interface MedicamentoResultado {
  idProducto: number;
  codigo: string;
  nombre: string;
  stock: number;
  precio: number;
  idDosisRecetada: number;
  idUNIDDosisReceta: number;
  idFrecuencia: number;
  idViaAdministracion: number;
}

export interface ExamenCatalogoResultado {
  idProducto: number;
  codigo: string;
  nombre: string;
  tipo: string;
  esCpt: boolean;
}

export type ValorIdentificadorCatalogo = string | number | null;

export interface DiagnosticoAtencionCatalogo {
  CodigoCIE10?: ValorIdentificadorCatalogo;
  codigoCIE10?: ValorIdentificadorCatalogo;
  Codigo?: ValorIdentificadorCatalogo;
  Descripcion?: string | null;
  descripcion?: string | null;
}

@Component({
  selector: 'app-plan-tratamiento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InterconsultasComponent,
    SelectGlobalComponent,
    PaginacionComponent,
  ],
  templateUrl: './plan-tratamiento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanTratamientoComponent implements OnInit, OnDestroy {
  @Input({ required: true }) formGroup!: FormGroup;
  public readonly authService = inject(AuthService);
  public readonly evolucionService = inject(EvolucionService);

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClientService);
  private readonly cdr = inject(ChangeDetectorRef);

  public readonly paginaFarmaco = signal<number>(1);
  public readonly elementosPorPaginaFarmaco = 5;

  public readonly paginaExamen = signal<number>(1);
  public readonly elementosPorPaginaExamen = 5;

  private readonly cacheLocalMedicamentos = new Map<
    string,
    MedicamentoResultado[]
  >();
  private readonly cacheLocalExamenes = new Map<
    string,
    ExamenCatalogoResultado[]
  >();
  private medDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private examenDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  public readonly frecuencias = signal<CatalogOption[]>([]);
  public readonly unidadesDosis = signal<CatalogOption[]>([]);
  public readonly viasAdministracion = signal<CatalogOption[]>([]);

  public readonly busquedaQuery = signal<string>('');
  public readonly busquedaResultados = signal<MedicamentoResultado[]>([]);
  public readonly cargandoBusqueda = signal<boolean>(false);
  public readonly diagnosticoSeleccionado = signal<string>('');
  public readonly diagnosticosAtencion = signal<
    { codigo: string; descripcion: string }[]
  >([]);

  public readonly busquedaExamenQuery = signal<string>('');
  public readonly busquedaExamenResultados = signal<ExamenCatalogoResultado[]>(
    [],
  );
  public readonly cargandoBusquedaExamen = signal<boolean>(false);
  public readonly indiceFilaActivaExamen = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarCatalogosReceta();
  }

  ngOnDestroy(): void {
    if (this.medDebounceTimer) {
      clearTimeout(this.medDebounceTimer);
    }
    if (this.examenDebounceTimer) {
      clearTimeout(this.examenDebounceTimer);
    }
  }

  async cargarCatalogosReceta(): Promise<void> {
    try {
      const idAtencion =
        this.evolucionService.activePatient()?.idRegAtencion || 0;
      const [frec, unidd, vias, dxsRes] = await Promise.all([
        this.api.request<CatalogOption[]>(
          '/api/v1/receta/frecuencias',
          { method: 'GET' },
          true,
        ),
        this.api.request<CatalogOption[]>(
          '/api/v1/receta/unidades-dosis',
          { method: 'GET' },
          true,
        ),
        this.api.request<CatalogOption[]>(
          '/api/v1/receta/vias-administracion',
          { method: 'GET' },
          true,
        ),
        idAtencion > 0
          ? this.api
              .request<Record<string, unknown>[]>(
                `/api/v1/diagnosticos/atencion/${idAtencion}`,
                { method: 'GET' },
                true,
              )
              .catch(() => [])
          : Promise.resolve([]),
      ]);

      this.frecuencias.set(frec ?? []);
      this.unidadesDosis.set(unidd ?? []);
      this.viasAdministracion.set(vias ?? []);

      if (dxsRes && Array.isArray(dxsRes)) {
        const dxsMapped = dxsRes
          .map((item) => {
            const d = item as DiagnosticoAtencionCatalogo;
            const cie = String(
              d.CodigoCIE10 ?? d.codigoCIE10 ?? d.Codigo ?? '',
            ).trim();
            const desc = String(d.Descripcion ?? d.descripcion ?? '').trim();
            return {
              codigo: cie,
              descripcion: cie ? `${cie} = ${desc}` : desc,
            };
          })
          .filter((d) => d.codigo !== '');

        this.diagnosticosAtencion.set(dxsMapped);
        if (dxsMapped.length > 0 && !this.diagnosticoSeleccionado()) {
          this.diagnosticoSeleccionado.set(dxsMapped[0].codigo);
        }
      }
    } catch (err) {
      console.error('Error cargando catálogos de receta:', err);
    } finally {
      this.cdr.markForCheck();
    }
  }

  get listaDiagnosticos(): { codigo: string; descripcion: string }[] {
    const listMap = new Map<string, string>();

    for (const d of this.diagnosticosAtencion()) {
      if (d.codigo) {
        listMap.set(d.codigo, d.descripcion);
      }
    }

    const root = this.formGroup?.root;
    if (root) {
      const dxArray = root.get('diagnosticos') as FormArray;
      if (dxArray) {
        for (const ctrl of dxArray.controls) {
          const val = ctrl.value;
          if (val?.cie10) {
            listMap.set(
              val.cie10,
              `${val.cie10} = ${val.descripcion || ''}`.trim(),
            );
          }
        }
      }
    }

    const result: { codigo: string; descripcion: string }[] = [];
    for (const [codigo, descripcion] of listMap.entries()) {
      result.push({ codigo, descripcion });
    }
    return result;
  }

  get farmacologicoArray(): FormArray {
    return this.formGroup.get('farmacologico') as FormArray;
  }

  get examenesArray(): FormArray {
    return this.formGroup.get('solicitudExamenes') as FormArray;
  }

  get totalPaginasFarmaco(): number {
    return (
      Math.ceil(
        this.farmacologicoArray.controls.length /
          this.elementosPorPaginaFarmaco,
      ) || 1
    );
  }

  get farmacosPaginados(): {
    control: AbstractControl;
    indiceOriginal: number;
  }[] {
    const inicio = (this.paginaFarmaco() - 1) * this.elementosPorPaginaFarmaco;
    const fin = inicio + this.elementosPorPaginaFarmaco;
    return this.farmacologicoArray.controls
      .slice(inicio, fin)
      .map((control, i) => ({
        control,
        indiceOriginal: inicio + i,
      }));
  }

  get totalPaginasExamen(): number {
    return (
      Math.ceil(
        this.examenesArray.controls.length / this.elementosPorPaginaExamen,
      ) || 1
    );
  }

  get examenesPaginados(): {
    control: AbstractControl;
    indiceOriginal: number;
  }[] {
    const inicio = (this.paginaExamen() - 1) * this.elementosPorPaginaExamen;
    const fin = inicio + this.elementosPorPaginaExamen;
    return this.examenesArray.controls.slice(inicio, fin).map((control, i) => ({
      control,
      indiceOriginal: inicio + i,
    }));
  }

  public readonly tiposExamen = [
    'Laboratorio',
    'Imágenes',
    'Procedimientos',
    'Otros',
  ];

  public readonly prioridadesExamen = ['Urgente', 'Rutina', 'Prioritario'];

  agregarExamen(
    tipo = 'Laboratorio',
    examen = '',
    indicacion = '',
    prioridad = 'Urgente',
  ): void {
    this.examenesArray.push(
      this.fb.group({
        tipo: [tipo, [Validators.required]],
        examen: [
          examen,
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(200),
          ],
        ],
        indicacion: [indicacion, [Validators.maxLength(300)]],
        prioridad: [prioridad, [Validators.required]],
      }),
    );
    this.paginaExamen.set(this.totalPaginasExamen);
    this.cdr.markForCheck();
  }

  removerExamen(index: number): void {
    this.examenesArray.removeAt(index);
    if (this.paginaExamen() > this.totalPaginasExamen) {
      this.paginaExamen.set(Math.max(1, this.totalPaginasExamen));
    }
    this.cdr.markForCheck();
  }

  getExamenFormGroup(index: number): FormGroup {
    return this.examenesArray.at(index) as FormGroup;
  }

  buscarExamenes(query: string, index: number): void {
    this.indiceFilaActivaExamen.set(index);
    this.busquedaExamenQuery.set(query);
    const clean = query.trim().toLowerCase();

    if (this.examenDebounceTimer) {
      clearTimeout(this.examenDebounceTimer);
    }

    if (clean.length < 2) {
      this.busquedaExamenResultados.set([]);
      this.cargandoBusquedaExamen.set(false);
      this.cdr.markForCheck();
      return;
    }

    if (this.cacheLocalExamenes.has(clean)) {
      this.busquedaExamenResultados.set(
        this.cacheLocalExamenes.get(clean) ?? [],
      );
      this.cargandoBusquedaExamen.set(false);
      this.cdr.markForCheck();
      return;
    }

    this.cargandoBusquedaExamen.set(true);
    this.cdr.markForCheck();

    this.examenDebounceTimer = setTimeout(async () => {
      try {
        const res = await this.api.request<ExamenCatalogoResultado[]>(
          `/api/v1/catalogos/examenes?q=${encodeURIComponent(clean)}`,
          { method: 'GET' },
          false,
        );
        const items = res ?? [];
        this.cacheLocalExamenes.set(clean, items);
        if (
          this.busquedaExamenQuery().trim().toLowerCase() === clean &&
          this.indiceFilaActivaExamen() === index
        ) {
          this.busquedaExamenResultados.set(items);
        }
      } catch {
        if (this.busquedaExamenQuery().trim().toLowerCase() === clean) {
          this.busquedaExamenResultados.set([]);
        }
      } finally {
        if (this.busquedaExamenQuery().trim().toLowerCase() === clean) {
          this.cargandoBusquedaExamen.set(false);
        }
        this.cdr.markForCheck();
      }
    }, 250);
  }

  seleccionarExamen(item: ExamenCatalogoResultado, index: number): void {
    const fg = this.getExamenFormGroup(index);
    if (fg) {
      fg.patchValue({
        examen: item.nombre,
        tipo: item.tipo || fg.get('tipo')?.value || 'Laboratorio',
      });
    }
    this.cerrarBusquedaExamenes();
  }

  cerrarBusquedaExamenes(): void {
    this.indiceFilaActivaExamen.set(null);
    this.busquedaExamenResultados.set([]);
    this.cdr.markForCheck();
  }

  get interconsultasGroup(): FormGroup {
    return this.formGroup.get('interconsultas') as FormGroup;
  }

  get indicacionesGroup(): FormGroup {
    return this.formGroup.get('indicacionesGenerales') as FormGroup;
  }

  buscarMedicamento(query: string): void {
    this.busquedaQuery.set(query);
    const clean = query.trim().toLowerCase();

    if (this.medDebounceTimer) {
      clearTimeout(this.medDebounceTimer);
    }

    if (clean.length < 2) {
      this.busquedaResultados.set([]);
      this.cargandoBusqueda.set(false);
      this.cdr.markForCheck();
      return;
    }

    if (this.cacheLocalMedicamentos.has(clean)) {
      this.busquedaResultados.set(this.cacheLocalMedicamentos.get(clean) ?? []);
      this.cargandoBusqueda.set(false);
      this.cdr.markForCheck();
      return;
    }

    this.cargandoBusqueda.set(true);
    this.cdr.markForCheck();

    this.medDebounceTimer = setTimeout(async () => {
      try {
        const idPaciente =
          this.evolucionService.activePatient()?.idPaciente || 0;
        const res = await this.api.request<MedicamentoResultado[]>(
          `/api/v1/receta/medicamentos?q=${encodeURIComponent(clean)}&idPaciente=${idPaciente}`,
          { method: 'GET' },
          false,
        );
        const items = res ?? [];
        this.cacheLocalMedicamentos.set(clean, items);
        if (this.busquedaQuery().trim().toLowerCase() === clean) {
          this.busquedaResultados.set(items);
        }
      } catch {
        if (this.busquedaQuery().trim().toLowerCase() === clean) {
          this.busquedaResultados.set([]);
        }
      } finally {
        if (this.busquedaQuery().trim().toLowerCase() === clean) {
          this.cargandoBusqueda.set(false);
        }
        this.cdr.markForCheck();
      }
    }, 250);
  }

  agregarMedicamentoDesdeCatalogo(item: MedicamentoResultado): void {
    const dxDefault =
      this.diagnosticoSeleccionado() ||
      (this.listaDiagnosticos.length > 0
        ? this.listaDiagnosticos[0].codigo
        : '');
    this.farmacologicoArray.push(
      this.fb.group({
        idProducto: [item.idProducto || 0],
        codigo: [item.codigo || ''],
        precio: [item.precio || 0],
        medicamento: [
          item.nombre,
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(200),
          ],
        ],
        diagnostico: [dxDefault, [Validators.required]],
        cantidad: [
          1,
          [
            Validators.required,
            ValidadoresGalenos.numeroEnteroPositivo(1, 999),
          ],
        ],
        dosis: [item.idDosisRecetada || 1, [Validators.required]],
        unidad: ['UNID', [Validators.required]],
        frecuencia: [String.raw`c\12 Horas`, [Validators.required]],
        via: ['Oral', [Validators.required]],
        duracion: [
          '30 días',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(50),
          ],
        ],
      }),
    );
    this.busquedaQuery.set('');
    this.busquedaResultados.set([]);
    this.paginaFarmaco.set(this.totalPaginasFarmaco);
    this.cdr.markForCheck();
  }

  agregarMedicamentoManual(): void {
    const dxDefault =
      this.diagnosticoSeleccionado() ||
      (this.listaDiagnosticos.length > 0
        ? this.listaDiagnosticos[0].codigo
        : '');
    this.farmacologicoArray.push(
      this.fb.group({
        idProducto: [0],
        codigo: [''],
        precio: [0],
        medicamento: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(200),
          ],
        ],
        diagnostico: [dxDefault, [Validators.required]],
        cantidad: [
          1,
          [
            Validators.required,
            ValidadoresGalenos.numeroEnteroPositivo(1, 999),
          ],
        ],
        dosis: [1, [Validators.required]],
        unidad: ['UNID', [Validators.required]],
        frecuencia: [String.raw`c\12 Horas`, [Validators.required]],
        via: ['Oral', [Validators.required]],
        duracion: [
          '30 días',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(50),
          ],
        ],
      }),
    );
    this.paginaFarmaco.set(this.totalPaginasFarmaco);
    this.cdr.markForCheck();
  }

  removerMedicamento(index: number): void {
    this.farmacologicoArray.removeAt(index);
    if (this.paginaFarmaco() > this.totalPaginasFarmaco) {
      this.paginaFarmaco.set(Math.max(1, this.totalPaginasFarmaco));
    }
    this.cdr.markForCheck();
  }

  getFormGroup(index: number): FormGroup {
    return this.farmacologicoArray.at(index) as FormGroup;
  }
}
