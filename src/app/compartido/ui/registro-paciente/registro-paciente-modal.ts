import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  inject,
  type OnChanges,
  Output,
  type SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VentanaModal } from '../ventana-modal/ventana-modal';
import { normalizarNombre } from './registro-paciente.interfaces';
import { RegistroPacienteService } from './registro-paciente.service';

@Component({
  selector: 'registro-paciente-modal',
  standalone: true,
  imports: [FormsModule, VentanaModal],
  providers: [RegistroPacienteService],
  templateUrl: './registro-paciente-modal.html',
})
export class RegistroPacienteModal implements OnChanges {
  @Input() abierto = false;
  @Input() modo: 'paciente' | 'triaje' = 'paciente';
  @Input() pacienteId: number | string | null = null;
  @Input() titulo = 'Registrar Nuevo Paciente';
  @Input() subtitulo = 'Complete los datos del paciente';
  @Output() alCerrar = new EventEmitter<void>();
  @Output() registrado = new EventEmitter<string>();
  @Output() actualizado = new EventEmitter<string>();

  public readonly srv = inject(RegistroPacienteService);
  private readonly cdr = inject(ChangeDetectorRef);
  public normalizarNombre = normalizarNombre;

  async ngOnChanges(cambios: SimpleChanges): Promise<void> {
    if (cambios.abierto?.currentValue === true) {
      this.srv.limpiarEstado();
      await this.srv.cargarCatalogos();
      await this.srv.verificarParametro296();
      if (this.pacienteId) {
        await this.srv.cargarPaciente(this.pacienteId);
      }
      this.cdr.detectChanges();
    }
  }

  cerrar(): void {
    this.alCerrar.emit();
  }

  soloDigitos(event: KeyboardEvent): void {
    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
    }
  }

  async consultarReniec(): Promise<void> {
    await this.srv.consultarReniec();
  }

  async guardar(): Promise<void> {
    const nombre = await this.srv.guardar(this.pacienteId, this.modo);
    if (nombre) {
      if (this.pacienteId) {
        this.actualizado.emit(nombre);
      } else {
        this.registrado.emit(nombre);
      }
      this.cerrar();
    }
  }

  onCambioDepartamento(tipo: 'domicilio' | 'nacimiento' | 'procedencia'): void {
    this.srv.onCambioDepartamento(tipo);
  }
  onCambioProvincia(tipo: 'domicilio' | 'nacimiento' | 'procedencia'): void {
    this.srv.onCambioProvincia(tipo);
  }
  onCambioDistrito(tipo: 'domicilio' | 'nacimiento' | 'procedencia'): void {
    this.srv.onCambioDistrito(tipo);
  }
}
