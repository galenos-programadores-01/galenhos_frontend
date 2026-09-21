import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  inject,
  type OnChanges,
  type OnInit,
  type SimpleChanges,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IFilaBackend, IPaciente } from '../../../../../../../compartido/tipos/api-tipos';
import {
  PresionArterialDirective,
  SoloDecimalDirective,
  SoloNumericoDirective,
} from '../../../../../../../compartido/ui/validacion/entrada-numerica.directive';
import { ErrorMensajeComponent } from '../../../../../../../compartido/ui/validacion/error-mensaje.component';
import { VentanaModal } from '../../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { TriajeApiService } from '../../../../salida/http/triaje.api.service';
import { BuscarPacienteModal } from '../buscar-paciente-modal/buscar-paciente-modal';
import { ReporteTriajeComponent } from '../reporte-triaje/reporte-triaje.component';
import { RegistroTriajeService } from './registro-triaje.service';

@Component({
  selector: 'app-registro-triaje-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VentanaModal,
    ReporteTriajeComponent,
    ErrorMensajeComponent,
    BuscarPacienteModal,
    SoloNumericoDirective,
    SoloDecimalDirective,
    PresionArterialDirective,
  ],
  providers: [RegistroTriajeService],
  templateUrl: './registro-triaje-modal.html',
  styles: [`@keyframes spin { to { transform: rotate(360deg); } }`],
})
export class RegistroTriajeModal implements OnInit, OnChanges {
  @Input() abierto = false;
  @Input() idTriajeEditar: number | null = null;
  @Output() alCerrar = new EventEmitter<void>();
  @Output() triajeIniciado = new EventEmitter<void>();

  public readonly srv = inject(RegistroTriajeService);
  private readonly triajeApi = inject(TriajeApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  reporteId: number | null = null;
  mostrarPaciente = true;
  buscarAbierto = false;
  imc = '';
  hoy = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    void this.srv.cargarCatalogosIniciales();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['abierto']?.currentValue === true && this.idTriajeEditar) {
      void this.precargarTriaje(this.idTriajeEditar);
    }
  }

  get modoEdicion(): boolean {
    return !!this.idTriajeEditar;
  }

  get tituloModal(): string {
    return this.modoEdicion ? 'Editar Triaje' : 'Registrar Triaje';
  }

  get subtituloModal(): string {
    return this.modoEdicion
      ? 'Datos del triaje seleccionado. Puede editar los valores y guardar los cambios.'
      : 'Identificación por documento para la bandeja de triaje.';
  }

  private async precargarTriaje(idTriaje: number): Promise<void> {
    this.srv.mensajeError = '';
    try {
      await this.srv.cargarCatalogosIniciales();
      const fila = await this.triajeApi.obtenerTriajePorId(idTriaje);
      if (!fila) {
        this.srv.mensajeError = 'No se encontró el triaje seleccionado.';
        return;
      }
      this.cargarFormularioDesdeFila(fila);
      this.mostrarPaciente = true;
      this.srv.pacienteEncontrado = true;
      this.srv.pasoActual = 3;
      await Promise.all([
        this.srv.cargarServiciosPorPrioridad(),
        this.idDepartamentoSeleccionado()
          ? this.srv.cargarProvincias()
          : Promise.resolve(),
      ]);
      if (this.idProvinciaSeleccionada()) {
        await this.srv.cargarDistritos();
      }
      if (this.idDistritoSeleccionado()) {
        await this.srv.cargarCentrosPoblados();
      }
      this.calcularImc();
      this.cdr.detectChanges();
    } catch {
      this.srv.mensajeError = 'No se pudo cargar el triaje seleccionado.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  private idDepartamentoSeleccionado(): boolean {
    const id = this.srv.formulario.idDepartamentoDomicilio;
    return id !== undefined && id !== null && id !== '';
  }

  private idProvinciaSeleccionada(): boolean {
    const id = this.srv.formulario.idProvinciaDomicilio;
    return id !== undefined && id !== null && id !== '';
  }

  private idDistritoSeleccionado(): boolean {
    const id = this.srv.formulario.idDistritoDomicilio;
    return id !== undefined && id !== null && id !== '';
  }

  private texto(valor: unknown): string {
    if (valor === null || valor === undefined) return '';
    return String(valor).trim();
  }

  private textoEntero(valor: unknown): string {
    const texto = this.texto(valor);
    if (!texto) return '';
    const numero = Number(texto);
    return Number.isFinite(numero) ? String(Math.trunc(numero)) : texto;
  }

  private cargarFormularioDesdeFila(fila: IFilaBackend): void {
    const f = this.srv.formulario;
    f.idDocIdentidad = this.texto(fila.IdDocIdentidad) || '1';
    f.nroDocumento = this.texto(fila.NroDocumento);
    f.apellidoPaterno = this.texto(fila.ApellidoPaterno);
    f.apellidoMaterno = this.texto(fila.ApellidoMaterno);
    f.primerNombre = this.texto(fila.PrimerNombre);
    f.segundoNombre = this.texto(fila.SegundoNombre);
    f.fechaNacimiento = this.texto(fila.FechaNacimiento).slice(0, 10);
    f.idTipoSexo = this.texto(fila.IdTipoSexo);
    f.idEstadoCivil = this.texto(fila.IdEstadoCivil);
    f.telefono = this.texto(fila.Telefono);
    f.idDepartamentoDomicilio = this.texto(fila.IdDepartamentoDomicilio);
    f.idProvinciaDomicilio = this.texto(fila.IdProvinciaDomicilio);
    f.idDistritoDomicilio =
      this.texto(fila.idDistritoDomicilio) || this.texto(fila.IdDistritoDomicilio);
    f.idCentroPobladoDomicilio =
      this.texto(fila.idComunidadDomicilio) || this.texto(fila.IdComunidadDomicilio);
    f.direccionDomicilio = this.texto(fila.Direccion);
    f.esAccidenteTransito = this.texto(fila.EsAccidenteTransito) === '1';
    f.idFuenteFinanciamiento = this.texto(fila.IdFuenteFinanciamiento);
    f.idEstadoLlego = this.texto(fila.IdEstadollego);
    f.motivo = this.texto(fila.Motivo);
    f.presionArterial = this.texto(fila.presion_arterial);
    f.frecCardiaca = this.texto(fila.frecuencia_cardiaca);
    f.frecRespiratoria = this.texto(fila.frecuencia_respiratoria);
    f.temperatura = this.texto(fila.temperatura);
    f.saturacion = this.textoEntero(fila.saturacion_oxigeno);
    f.peso = this.texto(fila.peso);
    f.talla = this.texto(fila.talla);
    f.escalaDolor = this.texto(fila.escala_dolor);
    f.escalaGlasgow = this.texto(fila.escala_glasgow);
    f.tiempoEvolucionCantidad = this.texto(fila.tiempo_evolucion_cantidad);
    f.tiempoEvolucionCantidadUnidad = this.texto(
      fila.tiempo_evolucion_unidad,
    );
    f.idServicio = this.texto(fila.IdServicio);
    f.idTipoPrioridad = this.texto(fila.IdTipoPrioridad);
    f.idCausaExternaMorbilidad = this.texto(fila.IdCausaExternaMorbilidad);
    f.fechaUltimaRegla =
      this.texto(fila.FUR).slice(0, 10) ||
      this.texto(fila.fur).slice(0, 10);
    f.esGestante = this.texto(fila.EsGestante) === '1';
    f.pacienteNn = false;
  }

  cerrar(): void {
    this.srv.limpiarEstado();
    this.reporteId = null;
    this.mostrarPaciente = true;
    this.imc = '';
    this.alCerrar.emit();
  }

  async buscarPaciente(): Promise<void> {
    await this.srv.buscarPaciente();
    this.mostrarPaciente = true;
    this.cdr.detectChanges();
  }

  onEnterDocumento(_event: Event): void {
    if (!this.srv.buscando && !this.srv.formulario.pacienteNn) {
      this.buscarPaciente();
    }
  }

  onTipoDocumentoChange(valor: string): void {
    if (valor === '99') {
      this.srv.formulario.nroDocumento = '';
      this.srv.pacienteEncontrado = false;
      this.srv.mensajeError = '';
      this.srv.sisConsultado = false;
      this.srv.sisActivo = false;
    }
  }

  abrirBuscador(): void {
    this.buscarAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarBuscador(): void {
    this.buscarAbierto = false;
    this.cdr.detectChanges();
  }

  onPacienteSeleccionado(paciente: IPaciente): void {
    this.buscarAbierto = false;

    // Autocompleta tipo de documento y número de documento del formulario de triaje.
    const idTipo = (paciente as unknown as Record<string, unknown>)
      .docIdentityId;
    if (idTipo !== undefined && idTipo !== null) {
      this.srv.formulario.idDocIdentidad = String(idTipo);
    }
    if (paciente.documentNumber) {
      this.srv.formulario.nroDocumento = String(paciente.documentNumber);
    }

    this.cdr.detectChanges();
  }

  toggleNN(checked: boolean): void {
    this.srv.formulario.pacienteNn = checked;
    this.srv.mensajeError = '';
    this.srv.sisConsultado = false;
    this.srv.sisActivo = false;
    this.srv.sisGuardado = false;
    if (checked) {
      const sd = this.srv.tiposDocumentos.find(
        (t) => (t.descripcion || '').toUpperCase() === 'SD',
      );
      this.srv.formulario.idDocIdentidad = sd ? String(sd.id) : '';
      this.srv.formulario.nroDocumento = '';
      this.srv.formulario.apellidoPaterno = 'NN';
      this.srv.formulario.apellidoMaterno = 'NN';
      this.srv.formulario.primerNombre = 'NN';
      this.srv.formulario.segundoNombre = '';
      this.srv.pacienteEncontrado = true;
      this.srv.actualizarIafaAutomatico();
      this.srv.fijarFuenteParticular();
      this.srv.avanzarPaso();
      this.mostrarPaciente = true;
    } else {
      this.srv.formulario.idDocIdentidad = '1';
      this.srv.formulario.nroDocumento = '';
      this.srv.formulario.apellidoPaterno = '';
      this.srv.formulario.apellidoMaterno = '';
      this.srv.formulario.primerNombre = '';
      this.srv.formulario.segundoNombre = '';
      this.srv.pacienteEncontrado = false;
      this.srv.pasoActual = 1;
      this.mostrarPaciente = true;
    }
    this.cdr.detectChanges();
  }

  cargarProvincias(): void {
    this.srv.formulario.idProvinciaDomicilio = '';
    this.srv.formulario.idDistritoDomicilio = '';
    this.srv.formulario.idCentroPobladoDomicilio = '';
    this.srv.cargarProvincias();
  }

  cargarDistritos(): void {
    this.srv.formulario.idDistritoDomicilio = '';
    this.srv.formulario.idCentroPobladoDomicilio = '';
    this.srv.cargarDistritos();
  }

  cargarCentrosPoblados(): void {
    this.srv.formulario.idCentroPobladoDomicilio = '';
    this.srv.cargarCentrosPoblados();
  }

  calcularImc(): void {
    const p = parseFloat(this.srv.formulario.peso);
    const t = parseFloat(this.srv.formulario.talla);
    if (!p || !t || p <= 0 || t <= 0) {
      this.imc = '';
      return;
    }
    const result = p / (t / 100) ** 2;
    this.imc = result.toFixed(1);
  }

  toggleAccidente(): void {
    this.srv.formulario.esAccidenteTransito =
      !this.srv.formulario.esAccidenteTransito;
    this.srv.actualizarIafaAutomatico();
    this.cdr.detectChanges();
  }

  get esMujer(): boolean {
    const id = this.srv.formulario.idTipoSexo;
    return (
      id === '2' ||
      id?.toUpperCase() === 'FEMENINO' ||
      id?.toUpperCase() === 'MUJER'
    );
  }

  obtenerSexo(): string {
    const id = this.srv.formulario.idTipoSexo;
    if (!id) return '—';
    const sexo = this.srv.tiposSexo.find((s) => String(s.id) === String(id));
    return sexo ? (sexo.descripcion ?? '—') : '—';
  }

  continuar(): void {
    if (!this.srv.pacienteEncontrado) {
      this.srv.mensajeError =
        'Busque el documento del paciente antes de continuar.';
      this.cdr.detectChanges();
      return;
    }
    this.srv.mensajeError = '';
    this.srv.avanzarPaso();
    this.mostrarPaciente = false;
    this.cdr.detectChanges();
  }

  async seleccionarPrioridad(value: string): Promise<void> {
    this.srv.formulario.idTipoPrioridad = value;
    this.srv.formulario.idServicio = '';
    if (value === this.srv.prioridadCadaver) {
      this.srv.formulario.frecCardiaca = '';
      this.srv.formulario.temperatura = '';
      this.srv.formulario.presionArterial = '';
      this.srv.formulario.saturacion = '';
      this.srv.formulario.frecRespiratoria = '';
      this.srv.formulario.fiO2 = '';
      this.srv.formulario.peso = '';
      this.srv.formulario.talla = '';
      this.imc = '';
    }
    await this.srv.cargarServiciosPorPrioridad();
    this.cdr.detectChanges();
  }

  async onFechaNacimientoChange(): Promise<void> {
    this.srv.formulario.idServicio = '';
    await this.srv.cargarServiciosPorPrioridad();
    this.cdr.detectChanges();
  }

  async registrar(): Promise<void> {
    await this.srv.guardarYContinuar(
      this.modoEdicion ? this.idTriajeEditar ?? undefined : undefined,
    );
    this.cdr.detectChanges();
    if (!this.srv.mensajeError) {
      if (this.modoEdicion) {
        this.triajeIniciado.emit();
        this.cerrar();
      } else if (this.srv.ultimoTriajeId) {
        this.reporteId = this.srv.ultimoTriajeId;
        this.cdr.detectChanges();
      } else {
        this.triajeIniciado.emit();
        this.cerrar();
      }
    }
  }

  cerrarReporte(): void {
    this.reporteId = null;
    this.triajeIniciado.emit();
    this.cerrar();
  }
}
