import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import type { DocumentoAtencionFirmadoItem } from '../../../../../aplicacion/atencion-ce-firma.service';
import { AtencionCeFirmaService } from '../../../../../aplicacion/atencion-ce-firma.service';

@Component({
  selector: 'app-documentos-firmados-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documentos-firmados-modal.component.html',
})
export class DocumentosFirmadosModalComponent {
  private readonly firmaService = inject(AtencionCeFirmaService);

  readonly visible = input<boolean>(false);
  readonly documentos = input<readonly DocumentoAtencionFirmadoItem[]>([]);
  readonly pacienteNombre = input<string>('');
  readonly nroHistoriaClinica = input<string | number>('');
  readonly nroDocumento = input<string>('');
  readonly idAtencion = input<number>(0);
  readonly firmando = input<boolean>(false);
  readonly firmadoDigitalmente = input<boolean>(false);

  readonly cerrar = output<void>();
  readonly volverACola = output<void>();
  readonly reintentarFirma = output<void>();

  verDocumento(documento: DocumentoAtencionFirmadoItem): void {
    if (!documento.url) {
      if (documento.blob) {
        const urlTemporal = window.URL.createObjectURL(documento.blob);
        window.open(urlTemporal, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(urlTemporal), 60000);
      }
      return;
    }
    window.open(documento.url, '_blank');
  }

  descargarDocumento(documento: DocumentoAtencionFirmadoItem): void {
    this.firmaService.descargarArchivoBlob(
      documento.blob,
      documento.nombreArchivo,
    );
  }

  async descargarTodos(): Promise<void> {
    const lista = this.documentos();
    for (let indice = 0; indice < lista.length; indice++) {
      const documento = lista[indice];
      this.descargarDocumento(documento);
      await new Promise((resolver) => setTimeout(resolver, 350));
    }
  }

  formatearTamano(bytes: number): string {
    if (!bytes || bytes <= 0) {
      return 'PDF Oficial';
    }
    const kilobytes = Math.round(bytes / 1024);
    return `${kilobytes} KB`;
  }
}
