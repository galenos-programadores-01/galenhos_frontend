import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  type OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaestrosApiService } from '../../../../../../../compartido/api/maestros.api.service';
import { ApiRequestError } from '../../../../../../../compartido/api-client/api-client.service';
import type {
  ICatalogoDescripcion,
  IPaciente,
} from '../../../../../../../compartido/tipos/api-tipos';
import { VentanaModal } from '../../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { PacientesApiService } from '../../../../../../pacientes/adaptadores/salida/http/pacientes.api.service';

@Component({
  selector: 'app-buscar-paciente-obstetrico-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, VentanaModal],
  templateUrl: './buscar-paciente-modal.html',
  styles: ['@keyframes spin { to { transform: rotate(360deg); } }'],
})
export class BuscarPacienteObstetricoModal implements OnInit {
  @Output() alCerrar = new EventEmitter<void>();
  @Output() seleccionado = new EventEmitter<IPaciente>();

  private readonly pacientesApi = inject(PacientesApiService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  filtros = {
    apellidoPaterno: '',
    apellidoMaterno: '',
    primerNombre: '',
  };

  tiposDocumentos: ICatalogoDescripcion[] = [];
  resultados: IPaciente[] = [];
  cargando = false;
  buscado = false;
  error = '';

  ngOnInit(): void {
    void this.maestrosApi.getTiposDocumentos().then((tipos) => {
      this.tiposDocumentos = tipos || [];
    });
  }

  async buscar(): Promise<void> {
    const pat = this.filtros.apellidoPaterno.trim();
    const mat = this.filtros.apellidoMaterno.trim();
    const nom = this.filtros.primerNombre.trim();

    if (!pat && !mat && !nom) {
      this.error = 'Ingrese al menos un apellido o nombre para buscar.';
      return;
    }

    this.cargando = true;
    this.buscado = false;
    this.error = '';
    this.resultados = [];

    try {
      const query = new URLSearchParams();
      query.append('paterno', pat);
      query.append('materno', mat);
      query.append('nombres', nom);

      const res = await this.pacientesApi.buscar(query.toString());
      this.resultados = res || [];
      this.buscado = true;
    } catch (err: unknown) {
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo buscar al paciente.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  limpiar(): void {
    this.filtros = {
      apellidoPaterno: '',
      apellidoMaterno: '',
      primerNombre: '',
    };
    this.resultados = [];
    this.buscado = false;
    this.error = '';
  }

  descripcionTipoDocumento(id: unknown): string {
    const tipo = this.tiposDocumentos.find((t) => String(t.id) === String(id));
    return tipo?.descripcion ?? '—';
  }

  seleccionar(paciente: IPaciente): void {
    this.seleccionado.emit(paciente);
  }

  cerrar(): void {
    this.alCerrar.emit();
  }
}
