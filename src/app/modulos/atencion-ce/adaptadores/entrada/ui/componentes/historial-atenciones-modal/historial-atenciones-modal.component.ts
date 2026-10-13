import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import type {
  DetalleResultadoImagen,
  DetalleResultadoLab,
  ResultadoInfo,
} from '../../../../../../evolucion-medica/servicios/resultado.service';
import { ResultadoService } from '../../../../../../evolucion-medica/servicios/resultado.service';
import type {
  HistorialAtencionDetalle,
  HistorialAtencionItem,
  HistorialProcedimientoItem,
  HistorialReporteOperatorioItem,
} from '../../../../../tipos/atencion-ce.tipos';
import {
  descargarPdfHistorialAtencion,
  imprimirPdfHistorialAtencion,
  imprimirPdfInformeProcedimiento,
  imprimirPdfReporteOperatorio,
} from '../../../../../utilidades/pdf/historial-atencion-pdf.util';
import { AtencionCEApiService } from '../../../../salida/http/atencion-ce.api.service';

export interface PacienteHistorialDatos {
  idPaciente: number;
  idAtencion?: number;
  pacienteNombre: string;
  nroHistoriaClinica?: number | string;
  nroDocumento?: string;
  edad?: number;
  sexo?: string;
  fechaNacimiento?: string;
  fotoUrl?: string;
}

@Component({
  selector: 'app-historial-atenciones-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-atenciones-modal.component.html',
})
export class HistorialAtencionesModalComponent {
  private readonly atencionApi = inject(AtencionCEApiService);
  private readonly resultadoService = inject(ResultadoService);

  @Input() visible: boolean = false;
  @Input() set paciente(valor: PacienteHistorialDatos | null) {
    this.pacienteActual.set(valor);
    if (valor && valor.idPaciente > 0) {
      this.cargarDatosGenerales(valor.idPaciente, valor.idAtencion);
    }
  }
  @Output() alCerrar = new EventEmitter<void>();

  readonly pacienteActual = signal<PacienteHistorialDatos | null>(null);
  readonly pestanaActiva = signal<
    'ATENCIONES' | 'IMAGENIOLOGIA_LAB' | 'REPORTE_OPERATORIO' | 'PROCEDIMIENTOS'
  >('ATENCIONES');

  readonly seccionConsultoriosAbierta = signal<boolean>(true);
  readonly seccionEmergenciaAbierta = signal<boolean>(false);

  readonly atenciones = signal<HistorialAtencionItem[]>([]);
  readonly atencionSeleccionadaId = signal<number | null>(null);
  readonly detalleAtencion = signal<HistorialAtencionDetalle | null>(null);
  readonly cargandoAtenciones = signal<boolean>(false);
  readonly cargandoDetalle = signal<boolean>(false);

  readonly laboratorios = signal<ResultadoInfo[]>([]);
  readonly imagenes = signal<ResultadoInfo[]>([]);
  readonly cargandoResultados = signal<boolean>(false);

  readonly reportesOperatorios = signal<HistorialReporteOperatorioItem[]>([]);
  readonly procedimientos = signal<HistorialProcedimientoItem[]>([]);
  readonly cargandoQuirurgicos = signal<boolean>(false);
  readonly cargandoProcedimientos = signal<boolean>(false);

  readonly submodalImagenVisible = signal<boolean>(false);
  readonly submodalImagenData = signal<DetalleResultadoImagen | null>(null);
  readonly submodalImagenCargando = signal<boolean>(false);
  readonly examenImagenSeleccionadoNombre = signal<string>('');

  readonly submodalLaboratorioVisible = signal<boolean>(false);
  readonly submodalLaboratorioItems = signal<DetalleResultadoLab[]>([]);
  readonly submodalLaboratorioCargando = signal<boolean>(false);
  readonly examenLaboratorioSeleccionadoNombre = signal<string>('');

  readonly submodalReporteOperatorioVisible = signal<boolean>(false);
  readonly submodalReporteOperatorioItem = signal<HistorialReporteOperatorioItem | null>(null);

  readonly submodalProcedimientoVisible = signal<boolean>(false);
  readonly submodalProcedimientoItem = signal<HistorialProcedimientoItem | null>(null);

  readonly consultoriosExternos = computed(() => {
    return this.atenciones().filter(
      (a) => a.idTipoServicio === 1 || a.tipoServicioNombre === 'CONSULTORIOS EXTERNOS',
    );
  });

  readonly emergencias = computed(() => {
    return this.atenciones().filter(
      (a) => a.idTipoServicio !== 1 && a.tipoServicioNombre !== 'CONSULTORIOS EXTERNOS',
    );
  });

  readonly tieneReportesOperatorios = computed(() => {
    return this.reportesOperatorios().length > 0;
  });

  readonly tieneProcedimientos = computed(() => {
    return this.procedimientos().length > 0;
  });

  cerrarModal(): void {
    this.alCerrar.emit();
  }

  cambiarPestana(
    pestana: 'ATENCIONES' | 'IMAGENIOLOGIA_LAB' | 'REPORTE_OPERATORIO' | 'PROCEDIMIENTOS',
  ): void {
    this.pestanaActiva.set(pestana);
  }

  toggleSeccionConsultorios(): void {
    this.seccionConsultoriosAbierta.update((v) => !v);
  }

  toggleSeccionEmergencia(): void {
    this.seccionEmergenciaAbierta.update((v) => !v);
  }

  async cargarDatosGenerales(idPaciente: number, idAtencionActual?: number): Promise<void> {
    this.cargandoAtenciones.set(true);
    this.cargandoResultados.set(true);
    this.cargandoQuirurgicos.set(true);
    this.cargandoProcedimientos.set(true);

    try {
      const [
        listaAtenciones,
        listaLaboratorios,
        listaImagenes,
        listaReportesOperatorios,
        listaProcedimientos,
      ] = await Promise.all([
        this.atencionApi.obtenerHistorialAtenciones(idPaciente),
        this.resultadoService.listarLaboratorio(idPaciente),
        this.resultadoService.listarImagenes(idPaciente),
        this.atencionApi.obtenerHistorialQuirurgico(idPaciente),
        this.atencionApi.obtenerHistorialProcedimientos(idPaciente),
      ]);

      this.atenciones.set(listaAtenciones);
      this.laboratorios.set(listaLaboratorios);
      this.imagenes.set(listaImagenes);
      this.reportesOperatorios.set(listaReportesOperatorios);
      this.procedimientos.set(listaProcedimientos);

      const idSeleccionar =
        idAtencionActual && listaAtenciones.some((atencion: HistorialAtencionItem) => atencion.idAtencion === idAtencionActual)
          ? idAtencionActual
          : listaAtenciones.length > 0
            ? listaAtenciones[0].idAtencion
            : null;

      if (idSeleccionar) {
        this.seleccionarAtencion(idSeleccionar);
      }
    } finally {
      this.cargandoAtenciones.set(false);
      this.cargandoResultados.set(false);
      this.cargandoQuirurgicos.set(false);
      this.cargandoProcedimientos.set(false);
    }
  }

  async seleccionarAtencion(idAtencion: number): Promise<void> {
    this.atencionSeleccionadaId.set(idAtencion);
    this.cargandoDetalle.set(true);
    try {
      const detalle = await this.atencionApi.obtenerHistorialAtencionDetalle(idAtencion);
      this.detalleAtencion.set(detalle);
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  async verDetalleImagen(item: ResultadoInfo): Promise<void> {
    this.examenImagenSeleccionadoNombre.set(item.nombreExamen);
    this.submodalImagenVisible.set(true);
    this.submodalImagenCargando.set(true);
    try {
      const data = await this.resultadoService.obtenerDetalleImagen(item.idOrden, item.idProducto);
      this.submodalImagenData.set(data);
    } finally {
      this.submodalImagenCargando.set(false);
    }
  }

  cerrarSubmodalImagen(): void {
    this.submodalImagenVisible.set(false);
    this.submodalImagenData.set(null);
  }

  async verDetalleLaboratorio(item: ResultadoInfo): Promise<void> {
    this.examenLaboratorioSeleccionadoNombre.set(item.nombreExamen);
    this.submodalLaboratorioVisible.set(true);
    this.submodalLaboratorioCargando.set(true);
    try {
      const data = await this.resultadoService.obtenerDetalleLaboratorio(item.idOrden, item.idProducto);
      this.submodalLaboratorioItems.set(data);
    } finally {
      this.submodalLaboratorioCargando.set(false);
    }
  }

  cerrarSubmodalLaboratorio(): void {
    this.submodalLaboratorioVisible.set(false);
    this.submodalLaboratorioItems.set([]);
  }

  verReporteOperatorio(item: HistorialReporteOperatorioItem): void {
    this.submodalReporteOperatorioItem.set(item);
    this.submodalReporteOperatorioVisible.set(true);
  }

  cerrarSubmodalReporteOperatorio(): void {
    this.submodalReporteOperatorioVisible.set(false);
    this.submodalReporteOperatorioItem.set(null);
  }

  verProcedimiento(item: HistorialProcedimientoItem): void {
    this.submodalProcedimientoItem.set(item);
    this.submodalProcedimientoVisible.set(true);
  }

  cerrarSubmodalProcedimiento(): void {
    this.submodalProcedimientoVisible.set(false);
    this.submodalProcedimientoItem.set(null);
  }

  readonly edadDetallada = computed(() => {
    const paciente = this.pacienteActual();
    if (!paciente) return '';
    if (paciente.fechaNacimiento) {
      const partes = paciente.fechaNacimiento.split('/');
      if (partes.length === 3) {
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        const anio = parseInt(partes[2], 10);
        const fechaNacimiento = new Date(anio, mes, dia);
        const hoy = new Date();
        if (!isNaN(fechaNacimiento.getTime())) {
          let anios = hoy.getFullYear() - fechaNacimiento.getFullYear();
          let meses = hoy.getMonth() - fechaNacimiento.getMonth();
          let dias = hoy.getDate() - fechaNacimiento.getDate();
          if (dias < 0) {
            meses -= 1;
            dias += 30;
          }
          if (meses < 0) {
            anios -= 1;
            meses += 12;
          }
          return `${anios} Años ${meses} Meses ${dias} Días`;
        }
      }
    }
    return paciente.edad ? `${paciente.edad} Años` : '';
  });

  async imprimirAtencion(atencion: HistorialAtencionItem): Promise<void> {
    const detalle = await this.obtenerDetalleParaDocumento(atencion);
    if (!detalle) return;

    const tipoServicio = atencion.tipoServicioNombre || atencion.servicioNombre || 'CONSULTA MÉDICA';
    await imprimirPdfHistorialAtencion(detalle, tipoServicio);
  }

  async descargarAtencionPdf(atencion: HistorialAtencionItem): Promise<void> {
    const detalle = await this.obtenerDetalleParaDocumento(atencion);
    if (!detalle) return;

    const tipoServicio = atencion.tipoServicioNombre || atencion.servicioNombre || 'CONSULTA MÉDICA';
    await descargarPdfHistorialAtencion(detalle, tipoServicio);
  }

  async imprimirFichaOperatoria(): Promise<void> {
    const reporte = this.submodalReporteOperatorioItem();
    if (!reporte) return;

    const paciente = this.pacienteActual();
    const pacienteNombre = paciente?.pacienteNombre || 'PACIENTE';
    const historiaClinica = String(paciente?.nroHistoriaClinica || 'S/N');

    await imprimirPdfReporteOperatorio(reporte, pacienteNombre, historiaClinica);
  }

  async imprimirInformeProcedimiento(): Promise<void> {
    const procedimiento = this.submodalProcedimientoItem();
    if (!procedimiento) return;

    const paciente = this.pacienteActual();
    const pacienteNombre = paciente?.pacienteNombre || 'PACIENTE';
    const historiaClinica = String(paciente?.nroHistoriaClinica || 'S/N');

    await imprimirPdfInformeProcedimiento(procedimiento, pacienteNombre, historiaClinica);
  }

  private async obtenerDetalleParaDocumento(
    atencion: HistorialAtencionItem,
  ): Promise<HistorialAtencionDetalle | null> {
    const detalleActual = this.detalleAtencion();
    if (detalleActual && detalleActual.idAtencion === atencion.idAtencion) {
      return detalleActual;
    }

    const detalleRemoto = await this.atencionApi.obtenerHistorialAtencionDetalle(
      atencion.idAtencion,
    );
    if (detalleRemoto) {
      return detalleRemoto;
    }

    const paciente = this.pacienteActual();
    return {
      idAtencion: atencion.idAtencion,
      idCuentaAtencion: atencion.idCuentaAtencion,
      idPaciente: atencion.idPaciente,
      pacienteNombre: paciente?.pacienteNombre || 'PACIENTE',
      nroHistoriaClinica: Number(paciente?.nroHistoriaClinica) || 0,
      nroDocumento: paciente?.nroDocumento || '',
      edad: paciente?.edad || 0,
      sexo: paciente?.sexo || '',
      servicioNombre: atencion.servicioNombre,
      medicoNombre: atencion.medicoNombre,
      fechaAtencion: atencion.fechaIngreso,
      horaInicio: atencion.horaIngreso,
      horaFin: atencion.horaEgreso,
      diagnosticos: [],
      inforCompDiagMed: '',
      motivo: '',
      tratamiento: '',
      planTratamiento: '',
      observaciones: '',
      examenClinico: '',
    };
  }
}
