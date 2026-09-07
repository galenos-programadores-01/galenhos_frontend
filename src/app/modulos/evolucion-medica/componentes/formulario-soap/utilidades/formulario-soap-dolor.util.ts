import type { FormGroup } from '@angular/forms';

export interface EtiquetaDolor {
  etiqueta: string;
  clase: string;
}

export function obtenerEtiquetaDolor(
  valor: number | string | null | undefined,
): EtiquetaDolor | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const num = Number(valor);
  if (Number.isNaN(num) || num < 0 || num > 10) return null;
  if (num === 0) {
    return {
      etiqueta: 'Sin dolor',
      clase: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }
  if (num <= 3) {
    return {
      etiqueta: 'Dolor leve',
      clase: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }
  if (num <= 6) {
    return {
      etiqueta: 'Dolor moderado',
      clase: 'bg-orange-100 text-orange-800 border-orange-200',
    };
  }
  return {
    etiqueta: 'Dolor severo',
    clase: 'bg-rose-100 text-rose-800 border-rose-200',
  };
}

export function procesarValidacionEscalaDolor(
  evento: Event,
  soapForm: FormGroup,
): void {
  const input = evento.target as HTMLInputElement;
  if (!input.value) return;
  const valorNumerico = Number.parseInt(input.value, 10);
  if (Number.isNaN(valorNumerico)) {
    input.value = '';
    soapForm.get('subjetivo.escalaDolor')?.setValue(null);
  } else if (valorNumerico > 10) {
    input.value = '10';
    soapForm.get('subjetivo.escalaDolor')?.setValue(10);
  } else if (valorNumerico < 0) {
    input.value = '0';
    soapForm.get('subjetivo.escalaDolor')?.setValue(0);
  }
}
