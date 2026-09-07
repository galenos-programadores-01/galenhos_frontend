import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { type FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { Subscription } from 'rxjs';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';

@Component({
  selector: 'app-signos-vitales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErrorMensajeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signos-vitales.html',
})
export class SignosVitalesComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  private subscripcion?: Subscription;

  ngOnInit(): void {
    this.subscripcion = this.form.valueChanges.subscribe((valores) => {
      const peso = Number(valores.peso);
      let talla = Number(valores.talla);

      if (talla > 30) {
        talla = Number((talla / 100).toFixed(2));
        this.form.patchValue({ talla }, { emitEvent: false });
      }

      if (peso > 0 && talla > 0) {
        const imcCalculado = (peso / (talla * talla)).toFixed(2);
        this.form.patchValue({ imc: imcCalculado }, { emitEvent: false });
      } else {
        this.form.patchValue({ imc: '—' }, { emitEvent: false });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscripcion?.unsubscribe();
  }

  bloquearTeclasNoNumericas(evento: KeyboardEvent): void {
    if (['e', 'E', '+', '-', '.', ','].includes(evento.key)) {
      evento.preventDefault();
    }
  }

  bloquearTeclasNoDecimales(evento: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(evento.key)) {
      evento.preventDefault();
    }
  }

  filtrarPresion(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    let limpio = input.value.replace(/[^0-9/]/g, '');

    const partes = limpio.split('/');
    if (partes.length > 2) {
      limpio = `${partes[0]}/${partes.slice(1).join('')}`;
    }

    if (limpio.length > 7) {
      limpio = limpio.slice(0, 7);
    }

    input.value = limpio;
    this.form.get('presionArterial')?.setValue(limpio);
    this.form.get('presionArterial')?.markAsDirty();
  }

  limitarEntero(evento: Event, campo: string, maxDigitos: number): void {
    const input = evento.target as HTMLInputElement;
    let valor = input.value.replace(/[^0-9]/g, '');

    if (valor.length > maxDigitos) {
      valor = valor.slice(0, maxDigitos);
      input.value = valor;
    }

    this.form.get(campo)?.setValue(valor ? Number(valor) : null);
    this.form.get(campo)?.markAsDirty();
  }

  limitarDecimal(evento: Event, campo: string, maxCaracteres: number): void {
    const input = evento.target as HTMLInputElement;
    let valor = input.value;

    if (valor.length > maxCaracteres) {
      valor = valor.slice(0, maxCaracteres);
      input.value = valor;
    }

    this.form.get(campo)?.setValue(valor ? Number(valor) : null);
    this.form.get(campo)?.markAsDirty();
  }

  formatearPresionEnBlur(): void {
    const control = this.form.get('presionArterial');
    if (!control) return;

    let valor = String(control.value || '').trim();
    if (!valor) return;

    if (/^\d{4}$/.test(valor)) {
      valor = `${valor.slice(0, 2)}/${valor.slice(2)}`;
      control.setValue(valor);
    } else if (/^\d{5,6}$/.test(valor)) {
      valor = `${valor.slice(0, 3)}/${valor.slice(3)}`;
      control.setValue(valor);
    }
    control.markAsTouched();
  }

  formatearTallaEnBlur(): void {
    const control = this.form.get('talla');
    if (!control) return;

    const valor = Number(control.value);
    if (valor > 30) {
      const tallaEnMetros = Number((valor / 100).toFixed(2));
      control.setValue(tallaEnMetros);
    }
    control.markAsTouched();
  }

  obtenerClasificacionImc(): { etiqueta: string; clase: string } | null {
    const valorImc = Number(this.form.get('imc')?.value);
    if (Number.isNaN(valorImc) || valorImc <= 0) return null;

    if (valorImc < 18.5) {
      return {
        etiqueta: 'Bajo peso',
        clase: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    }
    if (valorImc < 25.0) {
      return {
        etiqueta: 'Normal',
        clase: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    }
    if (valorImc < 30.0) {
      return {
        etiqueta: 'Sobrepeso',
        clase: 'bg-orange-100 text-orange-800 border-orange-200',
      };
    }
    return {
      etiqueta: 'Obesidad',
      clase: 'bg-rose-100 text-rose-800 border-rose-200',
    };
  }
}
