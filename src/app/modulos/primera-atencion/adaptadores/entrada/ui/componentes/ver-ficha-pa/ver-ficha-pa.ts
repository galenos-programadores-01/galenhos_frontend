import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { VerFichaPaVista } from '../../../../../aplicacion/ficha/ver-ficha-pa.tipos';
import type { PdfSignosVitales } from '../../../../../../../compartido/pdf/pdf.tipos';

type SignoVitalFicha = { etiqueta: string; valor: string };

@Component({
  selector: 'app-ver-ficha-pa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ver-ficha-pa.html',
})
export class VerFichaPaComponent {
  @Input({ required: true }) vista!: VerFichaPaVista;

  get datos() {
    return this.vista.datos;
  }

  get cabecera() {
    return this.datos.cabecera;
  }

  get paciente() {
    return this.datos.paciente;
  }

  get esFirmado(): boolean {
    return Boolean(this.vista.uuidFirma);
  }

  get signosVitales(): SignoVitalFicha[] {
    const sv = this.datos.signosVitales;
    const filas: [string, keyof PdfSignosVitales][] = [
      ['P/A', 'presionArterial'],
      ['FC', 'frecuenciaCardiaca'],
      ['FR', 'frecuenciaRespiratoria'],
      ['T°', 'temperatura'],
      ['SpO₂', 'saturacionOxigeno'],
      ['Peso', 'peso'],
      ['Talla', 'talla'],
      ['IMC', 'imc'],
      ['Glucemia', 'glucemia'],
    ];
    return filas
      .map(([etiqueta, clave]) => ({
        etiqueta,
        valor: this.textoVital(sv[clave]),
      }))
      .filter((fila) => fila.valor !== '—');
  }

  private textoVital(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    const texto = String(valor).trim();
    return texto || '—';
  }
}
