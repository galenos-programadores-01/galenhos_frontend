import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  type FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-antecedentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './antecedentes.html',
})
export class AntecedentesComponent {
  private readonly fb = inject(FormBuilder);

  public readonly antecedentesForm: FormGroup = this.fb.group({
    quirurgicos: [''],
    patologicos: [''],
    obstetricos: [''],
    alergias: [''],
    familiares: [''],
    otros: [''],
    comorbilidades: this.fb.group({
      hipertension: [false],
      anemia: [false],
      tuberculosis: [false],
      obesidad: [false],
      higadoGraso: [false],
      fuma: [false],
      dislipidemia: [false],
      enfTiroidea: [false],
      cancer: [false],
    }),
    otrasComorbilidades: [''],
  });
}
