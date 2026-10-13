import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaginacionComponent } from '../../../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import { AuthService } from '../../../../../../auth/aplicacion/auth.service';
import { AtencionCeEstadoService } from '../../../../../aplicacion/atencion-ce-estado.service';
import type {
  ColaPacienteCEItem,
  ServicioMedicoItem,
} from '../../../../../tipos/atencion-ce.tipos';
import { AtencionCEApiService } from '../../../../salida/http/atencion-ce.api.service';
import {
  HistorialAtencionesModalComponent,
  type PacienteHistorialDatos,
} from '../../componentes/historial-atenciones-modal/historial-atenciones-modal.component';
import { TriajeCeModalComponent } from '../../componentes/triaje-ce-modal/triaje-ce-modal.component';

@Component({
  selector: 'app-atencion-ce-cola',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginacionComponent,
    TriajeCeModalComponent,
    HistorialAtencionesModalComponent,
    SelectGlobalComponent,
  ],
  templateUrl: './atencion-ce-cola.component.html',
})
export class AtencionCeColaComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(AtencionCEApiService);
  private readonly authService = inject(AuthService);
  private readonly estadoService = inject(AtencionCeEstadoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;
  private idPeticionActual = 0;

  readonly fechaSeleccionada = signal<string>(
    this.estadoService.fechaSeleccionada(),
  );
  readonly pacientesCola = signal<readonly ColaPacienteCEItem[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly filtroTexto = signal<string>(this.estadoService.filtroTexto());
  readonly estadoFiltro = signal<string>(this.estadoService.estadoFiltro());
  readonly turnoFiltro = signal<string>('');
  readonly servicioFiltro = signal<number>(0);
  readonly servicios = signal<readonly ServicioMedicoItem[]>([]);

  readonly modalTriajeVisible = signal<boolean>(false);
  readonly modalTriajeSoloLectura = signal<boolean>(false);
  readonly pacienteSeleccionadoTriaje = signal<ColaPacienteCEItem | null>(null);

  readonly modalHistorialVisible = signal<boolean>(false);
  readonly pacienteSeleccionadoHistorial = signal<PacienteHistorialDatos | null>(null);

  readonly paginaActual = signal<number>(1);
  readonly elementosPorPagina = signal<number>(10);
  readonly opcionesElementosPorPagina: readonly number[] = [10, 20, 50, 100];

  readonly totalCitados = computed(() => this.pacientesCola().length);

  readonly totalPendientes = computed(() => {
    return this.pacientesCola().filter(
      (paciente) => paciente.estadoAtencion === 'PENDIENTE',
    ).length;
  });

  readonly totalEnAtencion = computed(() => {
    return this.pacientesCola().filter(
      (paciente) => paciente.estadoAtencion === 'EN_ATENCION',
    ).length;
  });

  readonly totalAtendidos = computed(() => {
    return this.pacientesCola().filter(
      (paciente) => paciente.estadoAtencion === 'ATENDIDO',
    ).length;
  });

  readonly totalSinTriaje = computed(() => {
    return this.pacientesCola().filter((p) => !p.tieneTriaje).length;
  });

  readonly pacientesFiltrados = computed(() => {
    let lista = this.pacientesCola();

    const estado = this.estadoFiltro();
    if (estado === 'SIN_TRIAJE') {
      lista = lista.filter((p) => !p.tieneTriaje);
    } else if (estado) {
      lista = lista.filter((item) => item.estadoAtencion === estado);
    }

    const turno = this.turnoFiltro();
    if (turno) {
      lista = lista.filter(
        (p) => (p.turno || '').toUpperCase() === turno.toUpperCase(),
      );
    }

    const idServicio = Number(this.servicioFiltro()) || 0;
    if (idServicio > 0) {
      lista = lista.filter((p) => Number(p.idServicioIngreso) === idServicio);
    }

    const texto = this.filtroTexto().trim().toLowerCase();
    if (texto) {
      lista = lista.filter((p) => {
        const nombre = (p.pacienteNombre || '').toLowerCase();
        const documento = (p.nroDocumento || '').toLowerCase();
        const historia = String(p.nroHistoriaClinica || '').toLowerCase();
        const cuenta = String(p.idCuentaAtencion || '').toLowerCase();
        const telefono = (p.telefono || '').toLowerCase();
        return (
          nombre.includes(texto) ||
          documento.includes(texto) ||
          historia.includes(texto) ||
          cuenta.includes(texto) ||
          telefono.includes(texto)
        );
      });
    }

    return lista;
  });

  readonly totalFiltrados = computed(() => this.pacientesFiltrados().length);

  readonly totalPaginas = computed(() => {
    const total = this.totalFiltrados();
    const tamano = this.elementosPorPagina();
    return Math.max(1, Math.ceil(total / tamano));
  });

  readonly indiceInicio = computed(() => {
    if (this.totalFiltrados() === 0) return 0;
    return (this.paginaActual() - 1) * this.elementosPorPagina() + 1;
  });

  readonly indiceFin = computed(() => {
    return Math.min(
      this.paginaActual() * this.elementosPorPagina(),
      this.totalFiltrados(),
    );
  });

  readonly pacientesPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.elementosPorPagina();
    return this.pacientesFiltrados().slice(
      inicio,
      inicio + this.elementosPorPagina(),
    );
  });

  readonly esFechaHoy = computed(() => {
    return this.fechaSeleccionada() === this.estadoService.obtenerFechaHoy();
  });

  ngOnInit(): void {
    void this.cargarServicios();

    const queryFecha = this.route.snapshot.queryParamMap.get('fecha');
    const queryEstado = this.route.snapshot.queryParamMap.get('estado');
    const queryServicio = this.route.snapshot.queryParamMap.get('servicio');

    if (queryFecha && /^\d{4}-\d{2}-\d{2}$/.test(queryFecha)) {
      this.estadoService.establecerFecha(queryFecha);
      this.fechaSeleccionada.set(queryFecha);
    } else {
      this.fechaSeleccionada.set(this.estadoService.fechaSeleccionada());
    }

    if (queryEstado !== null && queryEstado !== undefined) {
      this.estadoService.establecerEstadoFiltro(queryEstado);
      this.estadoFiltro.set(queryEstado);
    } else {
      this.estadoFiltro.set(this.estadoService.estadoFiltro());
    }

    if (queryServicio) {
      const idServicioParametro = parseInt(queryServicio, 10);
      if (!Number.isNaN(idServicioParametro) && idServicioParametro > 0) {
        this.servicioFiltro.set(idServicioParametro);
      }
    }

    void this.cargarCola();
  }

  ngOnDestroy(): void {
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
  }

  async cargarServicios(): Promise<void> {
    try {
      const idEmpleado =
        this.authService.getIdEmpleado() ||
        this.authService.userProfile()?.idEmpleado ||
        -100;
      let items = await this.apiService.listarServiciosMedico(idEmpleado, 1);
      if (!items || items.length === 0) {
        items = await this.apiService.listarServiciosMedico(-100, 1);
      }
      if (Array.isArray(items)) {
        this.servicios.set(items);
      }
    } catch {
      this.servicios.set([]);
    }
  }

  async cargarCola(): Promise<void> {
    const idPeticion = ++this.idPeticionActual;
    this.cargando.set(true);
    try {
      const texto = this.filtroTexto().trim();
      const idServicio = Number(this.servicioFiltro()) || 0;
      const items = await this.apiService.listarCola({
        fecha: this.fechaSeleccionada(),
        filtro: texto || undefined,
        idServicio: idServicio > 0 ? idServicio : undefined,
      });
      if (idPeticion === this.idPeticionActual) {
        this.pacientesCola.set(items);
      }
    } catch {
      if (idPeticion === this.idPeticionActual) {
        this.pacientesCola.set([]);
      }
    } finally {
      if (idPeticion === this.idPeticionActual) {
        this.cargando.set(false);
      }
    }
  }

  alEscribirFiltro(nuevoTexto: string): void {
    this.filtroTexto.set(nuevoTexto);
    this.estadoService.establecerFiltroTexto(nuevoTexto);
    this.paginaActual.set(1);
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
  }

  async alBuscar(): Promise<void> {
    this.paginaActual.set(1);
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
    await this.cargarCola();
  }

  async alLimpiarBusqueda(): Promise<void> {
    this.filtroTexto.set('');
    this.estadoService.establecerFiltroTexto('');
    this.paginaActual.set(1);
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
    await this.cargarCola();
  }

  async alCambiarFecha(nuevaFecha: string): Promise<void> {
    this.fechaSeleccionada.set(nuevaFecha);
    this.estadoService.establecerFecha(nuevaFecha);
    this.filtroTexto.set('');
    this.estadoService.establecerFiltroTexto('');
    this.paginaActual.set(1);
    await this.sincronizarParametrosRuta({ fecha: nuevaFecha });
    await this.cargarCola();
  }

  async alIrAHoy(): Promise<void> {
    const fechaHoy = this.estadoService.obtenerFechaHoy();
    await this.alCambiarFecha(fechaHoy);
  }

  alCambiarEstado(nuevoEstado: string): void {
    this.estadoFiltro.set(nuevoEstado);
    this.estadoService.establecerEstadoFiltro(nuevoEstado);
    this.paginaActual.set(1);
    void this.sincronizarParametrosRuta({
      estado: nuevoEstado || null,
    });
  }

  async alCambiarServicio(nuevoIdServicio: unknown): Promise<void> {
    const idServicioNumerico = Number(nuevoIdServicio) || 0;
    this.servicioFiltro.set(idServicioNumerico);
    this.paginaActual.set(1);
    await this.sincronizarParametrosRuta({
      servicio: idServicioNumerico > 0 ? String(idServicioNumerico) : null,
    });
    await this.cargarCola();
  }

  alCambiarTurno(nuevoTurno: string): void {
    this.turnoFiltro.set(nuevoTurno);
    this.paginaActual.set(1);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas()) {
      this.paginaActual.set(nuevaPagina);
    }
  }

  cambiarElementosPorPagina(nuevoTamano: unknown): void {
    const tamanoNumerico = Number(nuevoTamano) || 10;
    this.elementosPorPagina.set(tamanoNumerico);
    this.paginaActual.set(1);
  }

  abrirHistorialPaciente(item: ColaPacienteCEItem): void {
    const datosPaciente: PacienteHistorialDatos = {
      idPaciente: item.idPaciente,
      idAtencion: item.idAtencion,
      pacienteNombre: item.pacienteNombre,
      nroHistoriaClinica: item.nroHistoriaClinica,
      nroDocumento: item.nroDocumento,
      edad: item.edad,
      sexo: item.sexo,
    };
    this.pacienteSeleccionadoHistorial.set(datosPaciente);
    this.modalHistorialVisible.set(true);
  }

  cerrarModalHistorial(): void {
    this.modalHistorialVisible.set(false);
    this.pacienteSeleccionadoHistorial.set(null);
  }

  abrirTriaje(item: ColaPacienteCEItem, soloLectura = false): void {
    this.pacienteSeleccionadoTriaje.set(item);
    this.modalTriajeSoloLectura.set(soloLectura);
    this.modalTriajeVisible.set(true);
  }

  cerrarModalTriaje(): void {
    this.modalTriajeVisible.set(false);
    this.modalTriajeSoloLectura.set(false);
    this.pacienteSeleccionadoTriaje.set(null);
  }

  alGuardarTriaje(): void {
    void this.cargarCola();
  }

  atenderPaciente(item: ColaPacienteCEItem): void {
    this.router.navigate(['/atencion-ce', item.idAtencion], {
      queryParams: {
        fecha: this.fechaSeleccionada(),
        estado: this.estadoFiltro() || undefined,
      },
    });
  }

  obtenerIniciales(nombre: string): string {
    if (!nombre) return 'PX';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'ATENDIDO':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'EN_ATENCION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }

  private async sincronizarParametrosRuta(
    parametros: Record<string, string | null>,
  ): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: parametros,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
