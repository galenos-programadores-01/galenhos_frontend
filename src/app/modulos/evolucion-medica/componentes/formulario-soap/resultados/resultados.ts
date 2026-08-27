import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { type FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ColumnaTemplateDirective } from '../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../compartido/componentes/tabla/tabla.component';
import { VentanaModal } from '../../../../../compartido/ui/ventana-modal/ventana-modal';
import { EvolucionService } from '../../../servicios/evolucion.service';
import {
  type DetalleResultadoImagen,
  type DetalleResultadoLab,
  type ResultadoInfo,
  ResultadoService,
} from '../../../servicios/resultado.service';

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TablaComponent,
    ColumnaTemplateDirective,
    VentanaModal,
  ],
  templateUrl: './resultados.html',
})
export class ResultadosComponent implements OnInit {
  @Input({ required: true }) formGroup!: FormGroup;

  private readonly resultadoService = inject(ResultadoService);
  private readonly evolucionService = inject(EvolucionService);
  private readonly cdr = inject(ChangeDetectorRef);

  public readonly laboratorios = signal<ResultadoInfo[]>([]);
  public readonly imagenes = signal<ResultadoInfo[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');

  public readonly modalDetalleOpen = signal<boolean>(false);
  public readonly modalDetalleTitulo = signal<string>('');
  public readonly modalDetalleCargando = signal<boolean>(false);
  public readonly modalDetalleItems = signal<DetalleResultadoLab[]>([]);

  public readonly modalImagenOpen = signal<boolean>(false);
  public readonly modalImagenTitulo = signal<string>('');
  public readonly modalImagenCargando = signal<boolean>(false);
  public readonly modalImagenDetalle = signal<DetalleResultadoImagen | null>(
    null,
  );

  columnasLaboratorio: ColumnaTabla[] = [
    { campo: 'examenCustom', cabecera: 'Examen' },
    { campo: 'fechaCustom', cabecera: 'Fecha' },
    { campo: 'resultadoCustom', cabecera: 'Resultado / Detalle' },
    { campo: 'estadoCustom', cabecera: 'Estado' },
    { campo: 'revisadoCustom', cabecera: 'Revisado', alineacion: 'center' },
  ];

  columnasImagenes: ColumnaTabla[] = [
    { campo: 'estudioCustom', cabecera: 'Estudio' },
    { campo: 'fechaCustom', cabecera: 'Fecha' },
    { campo: 'informeCustom', cabecera: 'Informe / Conclusión' },
    { campo: 'estadoCustom', cabecera: 'Estado' },
    { campo: 'revisadoCustom', cabecera: 'Revisado', alineacion: 'center' },
  ];

  ngOnInit(): void {
    this.cargarResultados();
  }

  async cargarResultados(): Promise<void> {
    const paciente = this.evolucionService.activePatient();
    const idPaciente = paciente?.idPaciente || 327254;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.cdr.markForCheck();

    try {
      const [labs, imgs] = await Promise.all([
        this.resultadoService.listarLaboratorio(idPaciente),
        this.resultadoService.listarImagenes(idPaciente),
      ]);
      this.laboratorios.set(labs);
      this.imagenes.set(imgs);
    } catch {
      this.errorMessage.set(
        'No se pudieron cargar los resultados. Intente nuevamente.',
      );
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async verDetalleLaboratorio(item: ResultadoInfo): Promise<void> {
    this.modalDetalleTitulo.set(item.nombreExamen);
    this.modalDetalleOpen.set(true);
    this.modalDetalleCargando.set(true);
    this.modalDetalleItems.set([]);
    this.cdr.markForCheck();

    try {
      const idOrden = item.idOrden > 0 ? item.idOrden : 7731573;
      const idProducto = item.idProducto > 0 ? item.idProducto : 50078;

      const detalles = await this.resultadoService.obtenerDetalleLaboratorio(
        idOrden,
        idProducto,
      );
      this.modalDetalleItems.set(detalles);
    } catch (err) {
      console.error('Error cargando detalle de laboratorio:', err);
      this.modalDetalleItems.set([]);
    } finally {
      this.modalDetalleCargando.set(false);
      this.cdr.markForCheck();
    }
  }

  cerrarModalDetalle(): void {
    this.modalDetalleOpen.set(false);
    this.cdr.markForCheck();
  }

  async verDetalleImagen(item: ResultadoInfo): Promise<void> {
    this.modalImagenTitulo.set(item.nombreExamen);
    this.modalImagenOpen.set(true);
    this.modalImagenCargando.set(true);
    this.modalImagenDetalle.set(null);
    this.cdr.markForCheck();

    try {
      const idOrden = item.idOrden > 0 ? item.idOrden : 7710774;
      const idProducto = item.idProducto > 0 ? item.idProducto : 53821;

      const detalle = await this.resultadoService.obtenerDetalleImagen(
        idOrden,
        idProducto,
      );

      if (detalle?.informeTexto) {
        detalle.informeTexto = detalle.informeTexto
          .replace(/^(\s*)\?\s*/gm, '$1• ')
          .replace(/\n\s*\?\s*/g, '\n• ');
      }

      this.modalImagenDetalle.set(detalle);
    } catch (err) {
      console.error('Error cargando detalle de imagen:', err);
      this.modalImagenDetalle.set(null);
    } finally {
      this.modalImagenCargando.set(false);
      this.cdr.markForCheck();
    }
  }

  cerrarModalImagen(): void {
    this.modalImagenOpen.set(false);
    this.cdr.markForCheck();
  }

  obtenerClaseEstado(estado: string): string {
    const clases: Record<string, string> = {
      SI: 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300',
      NO: 'bg-[#f1f5f9] text-slate-500 font-semibold',
      Normal: 'bg-green-100 text-green-700',
      Anormal: 'bg-red-100 text-red-700',
      Crítico: 'bg-red-200 text-red-900 font-bold',
      Pendiente: 'bg-slate-100 text-slate-500',
    };
    return clases[estado] ?? 'bg-slate-100 text-slate-500';
  }
}
