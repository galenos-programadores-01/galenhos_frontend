import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import type { TriajeConsultaSignosVitales } from '../../../../../tipos/atencion-ce.tipos';

@Component({
  selector: 'app-signos-vitales-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signos-vitales-banner.component.html',
})
export class SignosVitalesBannerComponent {
  readonly triaje = input<TriajeConsultaSignosVitales | null>(null);

  obtenerClasificacionImc(imc?: number): string {
    if (!imc || imc <= 0) return 'N/D';
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  obtenerClaseTemperatura(temp?: number): string {
    if (!temp) return 'text-slate-800 dark:text-slate-200';
    if (temp >= 38) return 'text-red-600 dark:text-red-400 font-bold';
    if (temp >= 37.3) return 'text-amber-600 dark:text-amber-400 font-bold';
    return 'text-slate-800 dark:text-slate-200 font-bold';
  }

  obtenerClaseSaturacion(sat?: number): string {
    if (!sat) return 'text-slate-800 dark:text-slate-200';
    if (sat < 90) return 'text-red-600 dark:text-red-400 font-bold';
    if (sat < 95) return 'text-amber-600 dark:text-amber-400 font-bold';
    return 'text-slate-800 dark:text-slate-200 font-bold';
  }
}
