// Directivas standalone que bloquean la escritura de caracteres no válidos
// en inputs numéricos, decimales y de presión arterial (además del pattern,
// que valida al enviar). Reutilizables en cualquier formulario del frontend.
import { Directive, HostListener } from '@angular/core';

function esTeclaModificadora(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}

@Directive({
  selector: 'input[appSoloNumerico]',
  standalone: true,
})
export class SoloNumericoDirective {
  @HostListener('keydown', ['$event'])
  bloquear(e: KeyboardEvent): void {
    if (esTeclaModificadora(e)) return;
    if (e.key.length === 1 && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  }
}

@Directive({
  selector: 'input[appSoloDecimal]',
  standalone: true,
})
export class SoloDecimalDirective {
  @HostListener('keydown', ['$event'])
  bloquear(e: KeyboardEvent): void {
    if (esTeclaModificadora(e)) return;
    if (e.key.length !== 1) return;
    const valor = (e.target as HTMLInputElement).value;
    if (!/^[0-9]$/.test(e.key)) {
      if (e.key === '.' && !valor.includes('.')) return;
      e.preventDefault();
    }
  }
}

@Directive({
  selector: 'input[appPresionArterial]',
  standalone: true,
})
export class PresionArterialDirective {
  @HostListener('keydown', ['$event'])
  bloquear(e: KeyboardEvent): void {
    if (esTeclaModificadora(e)) return;
    if (e.key.length !== 1) return;
    const valor = (e.target as HTMLInputElement).value;
    if (/^[0-9]$/.test(e.key)) return;
    if (e.key === '/' && !valor.includes('/')) return;
    e.preventDefault();
  }
}
