import { CommonModule } from '@angular/common';
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
import { ApiClientService } from '../../../../../../../compartido/api-client/api-client.service';
import { VentanaModal } from '../../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { AuthService } from '../../../../../../auth/aplicacion/auth.service';
import {
  firmarTriajesMasivamente,
  generarPdfsTriajes,
  type ResultadoFirmaMasiva,
} from './firma-triaje-obstetrico-masivo.util';

type FaseFirmaMasiva =
  | 'generando'
  | 'firmando'
  | 'resultados'
  | 'error'
  | 'cancelado';

export interface ResumenFirmaMasiva {
  firmados: number;
  fallidos: number;
}

@Component({
  selector: 'app-firma-masiva-obstetrico-modal',
  standalone: true,
  imports: [CommonModule, VentanaModal],
  templateUrl: './firma-masiva-obstetrico-modal.html',
})
export class FirmaMasivaObstetricoModal implements OnInit {
  @Input() ids: number[] = [];
  @Output() alCerrar = new EventEmitter<void>();
  @Output() firmaCompletada = new EventEmitter<ResumenFirmaMasiva>();

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly apiClient = inject(ApiClientService);
  private readonly authService = inject(AuthService);

  fase: FaseFirmaMasiva = 'generando';
  progresoActual = 0;
  progresoTotal = 0;
  progresoId = 0;
  cancelado = false;
  resultados: ResultadoFirmaMasiva[] = [];
  errorGlobal = '';

  ngOnInit(): void {
    void this.ejecutar();
  }

  get documentoGenerados(): number {
    return this.resultados.filter((r) => r.ok).length;
  }

  get documentoFallidos(): number {
    return this.resultados.filter((r) => !r.ok).length;
  }

  cancelarOperacion(): void {
    this.cancelado = true;
  }

  private apagarCancelacion(): void {
    this.cancelado = false;
  }

  private conexion() {
    return {
      baseUrl: this.apiClient.getApiBaseUrl(),
      token: this.authService.getToken(),
    };
  }

  private async ejecutar(): Promise<void> {
    this.fase = 'generando';
    this.progresoActual = 0;
    this.progresoTotal = this.ids.length;
    this.apagarCancelacion();
    try {
      const institucion = (await this.maestrosApi.getDatosInstitucion()) as {
        rucEess?: string;
        nombre?: string;
        direccion?: string;
        telefono?: string;
        logoMinsa?: string;
        logoHospi?: string;
      } | null;

      const generados = await generarPdfsTriajes(
        this.ids,
        institucion,
        this.conexion(),
        this.authService.username() ?? '',
        (actual, total, idTriaje) => {
          if (this.cancelado) return false;
          this.progresoActual = actual;
          this.progresoTotal = total;
          this.progresoId = idTriaje;
          this.cdr.detectChanges();
          return true;
        },
      );
      if (this.cancelado) {
        this.fase = 'cancelado';
        this.cdr.detectChanges();
        return;
      }

      this.fase = 'firmando';
      this.progresoActual = 1;
      this.progresoTotal = generados.filter((g) => g.doc).length;
      this.cdr.detectChanges();

      const resultados = await firmarTriajesMasivamente(
        generados,
        institucion,
        this.conexion(),
        this.authService.username() ?? '',
        (actual, _total, idTriaje) => {
          if (this.cancelado) return false;
          this.progresoActual = actual;
          this.progresoId = idTriaje;
          this.cdr.detectChanges();
          return true;
        },
        { cancelado: () => this.cancelado },
      );
      if (this.cancelado) {
        this.fase = 'cancelado';
        this.cdr.detectChanges();
        return;
      }

      this.resultados = resultados;
      this.fase = 'resultados';
      this.cdr.detectChanges();

      const resumen: ResumenFirmaMasiva = {
        firmados: this.documentoGenerados,
        fallidos: this.documentoFallidos,
      };
      if (resumen.firmados > 0) {
        this.firmaCompletada.emit(resumen);
        setTimeout(() => this.alCerrar.emit(), 1500);
      }
    } catch (e) {
      this.errorGlobal =
        e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
      this.fase = 'error';
      this.cdr.detectChanges();
    }
  }
}
