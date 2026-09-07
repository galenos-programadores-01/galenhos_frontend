import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import {
  type AbstractControl,
  type FormArray,
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { PaginacionComponent } from '../../../../../compartido/ui/paginacion/paginacion';
import { VentanaModal } from '../../../../../compartido/ui/ventana-modal/ventana-modal';

const MAX_TAMANO_BYTES = 10 * 1024 * 1024;
const EXTENSIONES_PERMITIDAS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);

export interface AdjuntoVisualizacion {
  nombre: string;
  tipo: string;
  tamano: number;
  dataB64: string;
  safeUrl?: SafeResourceUrl;
}

@Component({
  selector: 'app-adjuntos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    VentanaModal,
    PaginacionComponent,
  ],
  templateUrl: './adjuntos.html',
})
export class AdjuntosComponent {
  @Input({ required: true }) formArray!: FormArray;

  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  public readonly arrastrando = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');
  public readonly leyendo = signal<boolean>(false);

  public readonly modalPreviewAbierto = signal<boolean>(false);
  public readonly archivoSeleccionado = signal<AdjuntoVisualizacion | null>(
    null,
  );

  public readonly paginaActual = signal<number>(1);
  public readonly elementosPorPagina = 8;

  private readonly mapaUrlsPdf = new Map<string, SafeResourceUrl>();

  public obtenerSafePdfUrl(dataB64: string): SafeResourceUrl {
    const cacheada = this.mapaUrlsPdf.get(dataB64);
    if (cacheada) {
      return cacheada;
    }
    const urlSegura = this.sanitizer.bypassSecurityTrustResourceUrl(
      `${dataB64}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`,
    );
    this.mapaUrlsPdf.set(dataB64, urlSegura);
    return urlSegura;
  }

  get adjuntosArray(): FormArray {
    return this.formArray;
  }

  get totalPaginas(): number {
    return Math.ceil(this.adjuntosArray.length / this.elementosPorPagina) || 1;
  }

  get adjuntosPaginados(): {
    control: AbstractControl;
    indiceOriginal: number;
  }[] {
    const inicio = (this.paginaActual() - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.adjuntosArray.controls.slice(inicio, fin).map((control, i) => ({
      control,
      indiceOriginal: inicio + i,
    }));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivos = input.files ? Array.from(input.files) : [];
    this.procesarArchivos(archivos);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
    const archivos = event.dataTransfer
      ? Array.from(event.dataTransfer.files)
      : [];
    this.procesarArchivos(archivos);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
  }

  private async procesarArchivos(archivos: File[]): Promise<void> {
    this.errorMessage.set('');

    const invalidos = archivos.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return !EXTENSIONES_PERMITIDAS.has(ext) || f.size > MAX_TAMANO_BYTES;
    });

    if (invalidos.length > 0) {
      this.errorMessage.set(
        'Solo se admiten JPG, PNG, WEBP o PDF con un máximo de 10MB por archivo.',
      );
      return;
    }

    this.leyendo.set(true);
    for (const archivo of archivos) {
      const dataB64 = await this.leerArchivo(archivo);
      if (dataB64) {
        this.adjuntosArray.push(
          this.fb.group({
            nombre: [archivo.name],
            tipo: [archivo.type],
            tamano: [archivo.size],
            dataB64: [dataB64],
          }),
        );
      }
    }
    this.leyendo.set(false);
  }

  private leerArchivo(archivo: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultado =
          typeof reader.result === 'string' ? reader.result : '';
        resolve(resultado);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(archivo);
    });
  }

  eliminarAdjunto(index: number): void {
    this.adjuntosArray.removeAt(index);
    if (this.paginaActual() > this.totalPaginas) {
      this.paginaActual.set(Math.max(1, this.totalPaginas));
    }
  }

  verArchivo(item: {
    nombre: string;
    tipo: string;
    tamano: number;
    dataB64: string;
  }): void {
    const safeUrl =
      item.tipo === 'application/pdf'
        ? this.sanitizer.bypassSecurityTrustResourceUrl(item.dataB64)
        : undefined;

    this.archivoSeleccionado.set({
      ...item,
      safeUrl,
    });
    this.modalPreviewAbierto.set(true);
  }

  cerrarModalPreview(): void {
    this.modalPreviewAbierto.set(false);
    this.archivoSeleccionado.set(null);
  }

  descargarArchivoActual(): void {
    const actual = this.archivoSeleccionado();
    if (!actual?.dataB64) return;

    const enlace = document.createElement('a');
    enlace.href = actual.dataB64;
    enlace.download = actual.nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }

  formatearTamano(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
