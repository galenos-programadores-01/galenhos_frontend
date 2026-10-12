import type { jsPDF } from 'jspdf';
import {
  COLOR_BORDE_MEDIO,
  COLOR_FONDO_HEADER,
  COLOR_PRIMARIO,
  COLOR_PRIMARIO_ACENTO,
  COLOR_PRIMARIO_OSCURO,
  COLOR_PRIMARIO_PROFUNDO,
  COLOR_TEXTO_MUTED,
} from './evolucion-pdf.constantes';

export class PdfLienzoEvolucion {
  public readonly anchoPagina = 210;
  public readonly altoPagina = 297;
  public readonly margenIzquierdo = 14;
  public readonly margenDerecho = 14;
  public readonly anchoContenido: number;
  public posicionVertical = 10;
  private readonly limiteInferior = 276;
  public pacienteNombre = '';
  public pacienteHistoria = '';

  constructor(public readonly doc: jsPDF) {
    this.anchoContenido =
      this.anchoPagina - this.margenIzquierdo - this.margenDerecho;
  }

  asegurarEspacio(alturaNecesaria: number): void {
    if (this.posicionVertical + alturaNecesaria > this.limiteInferior) {
      this.doc.addPage();
      this.dibujarBandaSuperior();
      this.posicionVertical = 14;
    }
  }

  dibujarBandaSuperior(): void {
    this.doc.setFillColor(...COLOR_PRIMARIO_OSCURO);
    this.doc.rect(0, 0, this.anchoPagina, 2.8, 'F');
    this.doc.setFillColor(...COLOR_PRIMARIO_ACENTO);
    this.doc.rect(0, 2.8, this.anchoPagina, 0.8, 'F');
  }

  dibujarTituloSeccion(titulo: string, subtitulo?: string): void {
    this.asegurarEspacio(10);
    this.posicionVertical += 2.5;

    this.doc.setFillColor(...COLOR_FONDO_HEADER);
    this.doc.setDrawColor(...COLOR_BORDE_MEDIO);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(
      this.margenIzquierdo,
      this.posicionVertical,
      this.anchoContenido,
      5.8,
      1,
      1,
      'FD',
    );

    this.doc.setFillColor(...COLOR_PRIMARIO);
    this.doc.rect(this.margenIzquierdo, this.posicionVertical, 3, 5.8, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(...COLOR_PRIMARIO_PROFUNDO);
    this.doc.text(
      titulo.toUpperCase(),
      this.margenIzquierdo + 5.5,
      this.posicionVertical + 4.1,
    );

    if (subtitulo) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(...COLOR_TEXTO_MUTED);
      this.doc.text(
        subtitulo,
        this.anchoPagina - this.margenDerecho - 3,
        this.posicionVertical + 4.1,
        { align: 'right' },
      );
    }

    this.posicionVertical += 7.2;
  }
}
