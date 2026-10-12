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
import { MaestrosApiService } from '../../../../../../../compartido/api/maestros.api.service';
import type { ICatalogoNombre } from '../../../../../../../compartido/tipos/api-tipos';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import { AtencionCeEstadoService } from '../../../../../aplicacion/atencion-ce-estado.service';
import type { ColaPacienteCEItem } from '../../../../../tipos/atencion-ce.tipos';
import { AtencionCEApiService } from '../../../../salida/http/atencion-ce.api.service';
import { TriajeCeModalComponent } from '../../componentes/triaje-ce-modal/triaje-ce-modal.component';

@Component({
  selector: 'app-atencion-ce-cola',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TriajeCeModalComponent,
    SelectGlobalComponent,
  ],
  templateUrl: './atencion-ce-cola.component.html',
})
export class AtencionCeColaComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(AtencionCEApiService);
  private readonly maestrosApi = inject(MaestrosApiService);
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
  readonly servicios = signal<readonly ICatalogoNombre[]>([]);

  readonly modalTriajeVisible = signal<boolean>(false);
  readonly modalTriajeSoloLectura = signal<boolean>(false);
  readonly pacienteSeleccionadoTriaje = signal<ColaPacienteCEItem | null>(null);

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

    const idServ = this.servicioFiltro();
    if (idServ > 0) {
      lista = lista.filter((p) => p.idServicioIngreso === idServ);
    }

    return lista;
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
      const idS = parseInt(queryServicio, 10);
      if (!Number.isNaN(idS) && idS > 0) {
        this.servicioFiltro.set(idS);
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
      const items = await this.maestrosApi.getServicios(2);
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
      const items = await this.apiService.listarCola({
        fecha: texto ? undefined : this.fechaSeleccionada(),
        filtro: texto || undefined,
        idServicio: this.servicioFiltro() || undefined,
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
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
    this.temporizadorBusqueda = setTimeout(async () => {
      await this.cargarCola();
    }, 400);
  }

  async alBuscar(): Promise<void> {
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
    await this.cargarCola();
  }

  async alLimpiarBusqueda(): Promise<void> {
    this.filtroTexto.set('');
    this.estadoService.establecerFiltroTexto('');
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
    void this.sincronizarParametrosRuta({
      estado: nuevoEstado || null,
    });
  }

  async alCambiarServicio(nuevoIdServicio: number): Promise<void> {
    this.servicioFiltro.set(nuevoIdServicio);
    await this.sincronizarParametrosRuta({
      servicio: nuevoIdServicio > 0 ? String(nuevoIdServicio) : null,
    });
    await this.cargarCola();
  }

  alCambiarTurno(nuevoTurno: string): void {
    this.turnoFiltro.set(nuevoTurno);
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
