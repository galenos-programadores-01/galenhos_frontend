import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Input,
  type OnInit,
  type QueryList,
  ViewChildren,
} from '@angular/core';
import {
  type FormArray,
  type FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';

@Component({
  selector: 'app-examen-fisico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErrorMensajeComponent],
  templateUrl: './examen-fisico.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamenFisicoComponent implements OnInit {
  @Input({ required: true }) formArray!: FormArray;

  @ViewChildren('hallazgoInput') textareas!: QueryList<
    ElementRef<HTMLTextAreaElement>
  >;

  sistemas: { nombre: string; sub?: string }[] = [
    { nombre: 'Estado general' },
    { nombre: 'Piel' },
    {
      nombre: 'Cabeza y cuello',
      sub: 'Cabeza, cuello, ojos, oídos, nariz, boca',
    },
    { nombre: 'Tórax y pulmones' },
    { nombre: 'Corazón' },
    { nombre: 'Abdomen' },
    { nombre: 'Genitourinario' },
    { nombre: 'Extremidades y osteomuscular' },
    { nombre: 'Neurológico y estado mental' },
  ];

  ngOnInit(): void {
    this.aplicarValidadoresIniciales();
  }

  aplicarValidadoresIniciales(): void {
    for (let i = 0; i < this.formArray.length; i++) {
      const grupo = this.getFormGroup(i);
      const esNormal = grupo.get('normal')?.value === true;
      const hallazgoControl = grupo.get('hallazgo');
      if (hallazgoControl) {
        if (!esNormal) {
          hallazgoControl.setValidators([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(500),
          ]);
        } else {
          hallazgoControl.clearValidators();
        }
        hallazgoControl.updateValueAndValidity({ emitEvent: false });
      }
    }
  }

  getFormGroup(index: number): FormGroup {
    return this.formArray.at(index) as FormGroup;
  }

  esNormal(index: number): boolean {
    return this.getFormGroup(index).get('normal')?.value === true;
  }

  marcarNormal(index: number): void {
    const grupo = this.getFormGroup(index);
    const hallazgoControl = grupo.get('hallazgo');
    grupo.patchValue({ normal: true, hallazgo: '' });
    if (hallazgoControl) {
      hallazgoControl.clearValidators();
      hallazgoControl.updateValueAndValidity();
    }
  }

  marcarAnormal(index: number): void {
    const grupo = this.getFormGroup(index);
    const hallazgoControl = grupo.get('hallazgo');
    grupo.patchValue({ normal: false });
    if (hallazgoControl) {
      hallazgoControl.setValidators([
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(500),
      ]);
      hallazgoControl.updateValueAndValidity();
    }
    this.focusTextarea(index);
  }

  marcarTodoNormal(): void {
    for (let i = 0; i < this.formArray.length; i++) {
      this.marcarNormal(i);
    }
  }

  private focusTextarea(index: number): void {
    setTimeout(() => {
      const el = this.textareas?.get(index);
      el?.nativeElement.focus();
    });
  }
}
