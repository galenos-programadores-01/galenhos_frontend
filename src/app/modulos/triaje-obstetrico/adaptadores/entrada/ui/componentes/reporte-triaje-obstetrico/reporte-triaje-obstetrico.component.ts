import { CommonModule } from '@angular/common';
import { generarHtmlReporteTriaje } from './reporte-triaje-obstetrico.impresion';

type ValorPrimitivo = string | number | boolean;

import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  inject,
  type OnInit,
  Output,
} from '@angular/core';
import { MaestrosApiService } from '../../../../../../../compartido/api/maestros.api.service';
import type { IFilaBackend } from '../../../../../../../compartido/tipos/api-tipos';
import { VentanaModal } from '../../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { imprimirHtml } from '../../../../../../../compartido/utilidades/print.util';
import { TriajeObstetricoApiService } from '../../../../salida/http/triaje-obstetrico.api.service';

function _v(x: string | number | null | undefined): string {
  if (x === null || x === undefined || x === '') return '—';
  return String(x);
}

export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-PE');
}

export function decodificarBase64Reporte(
  valor: string | null | undefined,
): string {
  if (!valor) return '—';
  try {
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(valor)) return atob(valor);
  } catch {}
  return valor;
}

@Component({
  selector: 'app-reporte-triaje-obstetrico',
  standalone: true,
  imports: [CommonModule, VentanaModal],
  templateUrl: './reporte-triaje-obstetrico.component.html',
})
export class ReporteTriajeObstetricoComponent implements OnInit {
  @Input() idTriaje!: number;
  @Output() alCerrar = new EventEmitter<void>();

  private readonly triajeApi = inject(TriajeObstetricoApiService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  cabecera: IFilaBackend | null = null;
  institucion: IFilaBackend | null = null;
  cargando = true;
  error = '';

  readonly fechaImp = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  ngOnInit(): void {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const [reporte, inst] = await Promise.all([
        this.triajeApi.obtenerReporte({ id: this.idTriaje }),
        this.maestrosApi.getDatosInstitucion(),
      ]);

      const arr = Array.isArray(reporte) ? reporte : [];
      if (arr.length === 0) {
        this.error = 'No se encontró el reporte del triaje.';
      } else {
        this.cabecera = arr[0];
      }
      this.institucion = inst as IFilaBackend | null;
    } catch {
      this.error = 'No se pudo cargar el reporte del triaje.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  campo(...claves: string[]): string {
    if (!this.cabecera) return '—';
    for (const k of claves) {
      const val = this.cabecera[k];
      if (val !== undefined && val !== null && val !== '')
        return String(val as ValorPrimitivo);
    }
    return '—';
  }

  campoBase64(...claves: string[]): string {
    if (!this.cabecera) return '—';
    for (const k of claves) {
      const val = this.cabecera[k];
      if (val !== undefined && val !== null && val !== '')
        return decodificarBase64Reporte(String(val as ValorPrimitivo));
    }
    return '—';
  }

  inst(campo: string): string {
    if (!this.institucion) return '—';
    const val = this.institucion[campo];
    return val !== undefined && val !== null && val !== ''
      ? String(val as ValorPrimitivo)
      : '—';
  }

  logoMinsa(): string {
    if (!this.institucion) return '';
    const val = this.institucion.logoMinsa;
    return val && typeof val === 'string' ? val : '';
  }

  imprimirReporte(): void {
    if (!this.cabecera) return;
    const tmpl = generarHtmlReporteTriaje(
      this.cabecera,
      this.institucion,
      this.logoMinsa(),
      String(this.idTriaje),
      this.fechaImp,
    );
    imprimirHtml(tmpl);
  }
}
