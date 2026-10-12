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
  type FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { ColumnaTemplateDirective } from '../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../compartido/componentes/tabla/tabla.component';
import { PaginacionComponent } from '../../../../../compartido/ui/paginacion/paginacion';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import { AuthService } from '../../../../auth/aplicacion/auth.service';

export interface ItemProcedimientoPaginado {
  control: FormGroup;
  indiceOriginal: number;
}

@Component({
  selector: 'app-procedimientos-certificados',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorMensajeComponent,
    TablaComponent,
    ColumnaTemplateDirective,
    PaginacionComponent,
  ],
  templateUrl: './procedimientos-certificados.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcedimientosCertificadosComponent {
  @Input({ required: true }) formGroup!: FormGroup;
  public readonly authService = inject(AuthService);

  private readonly fb = inject(FormBuilder);

  public readonly paginaActual = signal<number>(1);
  public readonly elementosPorPagina = 5;

  columnasProcedimientos: ColumnaTabla[] = [
    { campo: 'cie10cxCustom', cabecera: 'CIE-10 CX', alineacion: 'center' },
    { campo: 'descripcionCustom', cabecera: 'Descripción de Procedimiento' },
    { campo: 'complicacionesCustom', cabecera: 'Complicaciones' },
    { campo: 'accionesCustom', cabecera: '', alineacion: 'center' },
  ];

  get procedimientosArray(): FormArray {
    return this.formGroup.get('procedimientosRealizados') as FormArray;
  }

  get incapacidadGroup(): FormGroup {
    return this.formGroup.get('incapacidad') as FormGroup;
  }

  get certificadosGroup(): FormGroup {
    return this.formGroup.get('certificados') as FormGroup;
  }

  get totalPaginas(): number {
    return (
      Math.ceil(
        this.procedimientosArray.controls.length / this.elementosPorPagina,
      ) || 1
    );
  }

  get procedimientosPaginados(): ItemProcedimientoPaginado[] {
    const inicio = (this.paginaActual() - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.procedimientosArray.controls
      .slice(inicio, fin)
      .map((control, indice) => ({
        control: control as FormGroup,
        indiceOriginal: inicio + indice,
      }));
  }

  agregarProcedimiento() {
    this.procedimientosArray.push(
      this.fb.group({
        cie10cx: [''],
        descripcion: [''],
        complicaciones: [''],
      }),
    );
    this.paginaActual.set(this.totalPaginas);
  }

  removerProcedimiento(index: number) {
    this.procedimientosArray.removeAt(index);
    if (this.paginaActual() > this.totalPaginas) {
      this.paginaActual.set(Math.max(1, this.totalPaginas));
    }
  }

  getProcedimientoGroup(index: number): FormGroup {
    return this.procedimientosArray.at(index) as FormGroup;
  }
}
