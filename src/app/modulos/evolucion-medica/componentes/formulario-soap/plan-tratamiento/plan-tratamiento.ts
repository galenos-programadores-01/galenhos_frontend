import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import {
  type FormArray,
  FormBuilder,
  type FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
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

@Component({
  selector: 'app-plan-tratamiento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorMensajeComponent,
    InterconsultasComponent,
  ],
  templateUrl: './plan-tratamiento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanTratamientoComponent implements OnInit {
  @Input({ required: true }) formGroup!: FormGroup;
  public readonly authService = inject(AuthService);

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClientService);
  private readonly cdr = inject(ChangeDetectorRef);

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

  ngOnInit(): void {
    this.cargarCatalogosReceta();
  }

  async cargarCatalogosReceta(): Promise<void> {
    try {
      const [frec, unidd, vias, dxsRes] = await Promise.all([
        this.api.request<CatalogOption[]>(
          '/api/v1/receta/frecuencias',
          { method: 'GET' },
          false,
        ),
        this.api.request<CatalogOption[]>(
          '/api/v1/receta/unidades-dosis',
          { method: 'GET' },
          false,
        ),
        this.api.request<CatalogOption[]>(
          '/api/v1/receta/vias-administracion',
          { method: 'GET' },
          false,
        ),
        this.api
          .request<Record<string, unknown>[]>(
            '/api/v1/sis/diagnosticos?idCuentaAtencion=3139802',
            { method: 'GET' },
            false,
          )
          .catch(() => []),
      ]);

      this.frecuencias.set(frec ?? []);
      this.unidadesDosis.set(unidd ?? []);
      this.viasAdministracion.set(vias ?? []);

      if (dxsRes && Array.isArray(dxsRes)) {
        const dxsMapped = dxsRes
          .map((d) => {
            const cie = String(
              d.CodigoCIE10 || d.codigoCIE10 || d.Codigo || '',
            ).trim();
            const desc = String(d.Descripcion || d.descripcion || '').trim();
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

    // 1. Diagnósticos provenientes de la atención/cuenta de la BD
    for (const d of this.diagnosticosAtencion()) {
      if (d.codigo) {
        listMap.set(d.codigo, d.descripcion);
      }
    }

    // 2. Diagnósticos añadidos activamente en el formulario SOAP
    const root = this.formGroup?.root;
    if (root) {
      const dxArray = root.get('diagnosticos') as FormArray;
      if (dxArray) {
        for (const ctrl of dxArray.controls) {
          const val = ctrl.value;
          if (val?.codigo) {
            listMap.set(
              val.codigo,
              `${val.codigo} = ${val.descripcion || ''}`.trim(),
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

  get procedimientosIndicadosGroup(): FormGroup {
    return this.formGroup.get('procedimientosIndicados') as FormGroup;
  }

  get examenesGroup(): FormGroup {
    return this.formGroup.get('solicitudExamenes') as FormGroup;
  }

  get interconsultasGroup(): FormGroup {
    return this.formGroup.get('interconsultas') as FormGroup;
  }

  get indicacionesGroup(): FormGroup {
    return this.formGroup.get('indicacionesGenerales') as FormGroup;
  }

  async buscarMedicamento(query: string): Promise<void> {
    this.busquedaQuery.set(query);
    if (!query || query.trim().length < 2) {
      this.busquedaResultados.set([]);
      this.cargandoBusqueda.set(false);
      this.cdr.markForCheck();
      return;
    }

    this.cargandoBusqueda.set(true);
    try {
      const res = await this.api.request<MedicamentoResultado[]>(
        `/api/v1/receta/medicamentos?q=${encodeURIComponent(query)}&idPaciente=908637`,
        { method: 'GET' },
        false,
      );
      this.busquedaResultados.set(res ?? []);
    } catch {
      this.busquedaResultados.set([]);
    } finally {
      this.cargandoBusqueda.set(false);
      this.cdr.markForCheck();
    }
  }

  agregarMedicamentoDesdeCatalogo(item: MedicamentoResultado): void {
    const dxDefault =
      this.diagnosticoSeleccionado() ||
      (this.listaDiagnosticos.length > 0
        ? this.listaDiagnosticos[0].codigo
        : '');
    this.farmacologicoArray.push(
      this.fb.group({
        medicamento: [item.nombre],
        diagnostico: [dxDefault],
        cantidad: [1],
        dosis: [item.idDosisRecetada || 1],
        unidad: ['UNID'],
        frecuencia: ['c\\12 Horas'],
        via: ['Oral'],
        duracion: ['30 días'],
      }),
    );
    this.busquedaQuery.set('');
    this.busquedaResultados.set([]);
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
        medicamento: [''],
        diagnostico: [dxDefault],
        cantidad: [1],
        dosis: [1],
        unidad: ['UNID'],
        frecuencia: ['c\\12 Horas'],
        via: ['Oral'],
        duracion: ['30 días'],
      }),
    );
  }

  removerMedicamento(index: number): void {
    this.farmacologicoArray.removeAt(index);
  }

  getFormGroup(index: number): FormGroup {
    return this.farmacologicoArray.at(index) as FormGroup;
  }
}
