import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalGlobalService } from '../../../../../../../compartido/ui/modal-global/modal-global.service';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import { AuthService } from '../../../../../../auth/aplicacion/auth.service';
import { AtencionCeEstadoService } from '../../../../../aplicacion/atencion-ce-estado.service';
import type {
  AtencionCEGuardarPayload,
  AtencionDiagnosticoCEItem,
  AtencionProcedimientoCEItem,
  ColaPacienteCEItem,
  DestinoAtencionItem,
  FichaAtencionCEDetalle,
  InterconsultaCEItem,
  ItemRecetaPrescripcion,
  OrdenApoyoDiagnosticoItem,
  OrdenProcedimientoCEItem,
  PacienteDatosAdicionalesCE,
  PacienteHistorialTriajeItem,
  TriajeConsultaSignosVitales,
} from '../../../../../tipos/atencion-ce.tipos';
import { AtencionCEApiService } from '../../../../salida/http/atencion-ce.api.service';
import { DiagnosticosCeSeccionComponent } from '../../componentes/diagnosticos-ce-seccion/diagnosticos-ce-seccion.component';
import {
  HistorialAtencionesModalComponent,
  type PacienteHistorialDatos,
} from '../../componentes/historial-atenciones-modal/historial-atenciones-modal.component';
import { OrdenesMedicasCeSeccionComponent } from '../../componentes/ordenes-medicas-ce-seccion/ordenes-medicas-ce-seccion.component';
import { TriajeCeModalComponent } from '../../componentes/triaje-ce-modal/triaje-ce-modal.component';
import {
  imprimirPdfDescansoMedico,
  imprimirPdfOrdenesApoyo,
  imprimirPdfRecetaMedica,
  imprimirPdfResumenConsulta,
} from '../../../../../utilidades/pdf/historial-atencion-pdf.util';

@Component({
  selector: 'app-atencion-ce-ficha',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DiagnosticosCeSeccionComponent,
    HistorialAtencionesModalComponent,
    OrdenesMedicasCeSeccionComponent,
    SelectGlobalComponent,
    TriajeCeModalComponent
  ],
  templateUrl: './atencion-ce-ficha.component.html',
})
export class AtencionCeFichaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(AtencionCEApiService);
  private readonly estadoService = inject(AtencionCeEstadoService);
  private readonly modalGlobal = inject(ModalGlobalService);
  private readonly authService = inject(AuthService);

  readonly idAtencion = signal<number>(0);
  readonly ficha = signal<FichaAtencionCEDetalle | null>(null);
  readonly triaje = signal<TriajeConsultaSignosVitales | null>(null);
  readonly destinos = signal<readonly DestinoAtencionItem[]>([]);

  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly mensajeError = signal<string>('');
  readonly erroresValidacion = signal<string[]>([]);

  // Pestañas numeradas según la norma hospitalaria de Consulta Externa (HNSEB)
  readonly pestanaActiva = signal<'3.1' | '3.3' | '3.4' | '3.5' | '3.6'>('3.1');

  // Antecedentes relacionados a la consulta (PacientesDatosAdicionales)
  readonly antecedQuirurgico = signal<string>('');
  readonly antecedPatologico = signal<string>('');
  readonly antecedObstetrico = signal<string>('');
  readonly antecedAlergico = signal<string>('');
  readonly antecedFamiliar = signal<string>('');
  readonly otrosAntecedentes = signal<string>('');

  // Comorbilidades estructuradas (9 comorbilidades + texto adicional)
  readonly comorbHipertension = signal<boolean>(false);
  readonly comorbAnemia = signal<boolean>(false);
  readonly comorbTuberculosis = signal<boolean>(false);
  readonly comorbObesidad = signal<boolean>(false);
  readonly comorbHigadoGraso = signal<boolean>(false);
  readonly comorbFuma = signal<boolean>(false);
  readonly comorbDislipidemia = signal<boolean>(false);
  readonly comorbEnfTiroidea = signal<boolean>(false);
  readonly comorbCancer = signal<boolean>(false);
  readonly otrasComorbilidades = signal<string>('');

  // Datos diagnósticos, procedimientos, prescripciones y órdenes de apoyo
  readonly itemsReceta = signal<ItemRecetaPrescripcion[]>([]);
  readonly procedimientos = signal<AtencionProcedimientoCEItem[]>([]);
  readonly ordenesApoyo = signal<OrdenApoyoDiagnosticoItem[]>([]);
  readonly interconsultas = signal<InterconsultaCEItem[]>([]);
  readonly ordenesProcedimientos = signal<OrdenProcedimientoCEItem[]>([]);

  readonly modalTriajeVisible = signal<boolean>(false);
  readonly modalHistorialAtencionesVisible = signal<boolean>(false);
  readonly modalHistorialTriajeVisible = signal<boolean>(false);
  readonly historialTriajes = signal<readonly PacienteHistorialTriajeItem[]>([]);
  readonly cargandoHistorialTriaje = signal<boolean>(false);

  // Destino de Atención y Próxima Cita (HNSEB)
  readonly celularPaciente = signal<string>('');
  readonly altaDefinitiva = signal<boolean>(false);
  readonly generarCita = signal<boolean>(false);
  readonly programacionCita = signal<string>('0');
  readonly horarioCita = signal<string>('0');
  readonly fechaPropuestaCita = signal<string>('');
  readonly fechaConsulta = signal<string>('');
  readonly fechaConsultaFormateada = computed<string>(() => {
    const valorOriginal = this.fechaConsulta() || this.ficha()?.fechaAtencion || this.ficha()?.fechaIngreso || this.estadoService.fechaSeleccionada() || '';
    if (!valorOriginal) {
      const fechaActual = new Date();
      return `${String(fechaActual.getDate()).padStart(2, '0')}/${String(fechaActual.getMonth() + 1).padStart(2, '0')}/${fechaActual.getFullYear()}`;
    }
    if (valorOriginal.includes('-')) {
      const partes = valorOriginal.split('-');
      if (partes.length === 3) {
        return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
      }
    }
    return valorOriginal;
  });

  readonly opcionesProgramacion: readonly {
    readonly id: string;
    readonly nombre: string;
  }[] = [
    { id: '1', nombre: 'CONSULTORIO 1 - TURNO MAÑANA (08:00 - 13:00)' },
    { id: '2', nombre: 'CONSULTORIO 1 - TURNO TARDE (14:00 - 19:00)' },
    { id: '3', nombre: 'CONSULTORIO 2 - TURNO MAÑANA (08:00 - 13:00)' },
    { id: '4', nombre: 'CONSULTORIO 2 - TURNO TARDE (14:00 - 19:00)' },
    { id: '5', nombre: 'PROGRAMACIÓN ORDINARIA DE CONSULTA EXTERNA' },
  ];

  readonly opcionesHorarios: readonly string[] = [
    '08:00 - 08:20',
    '08:20 - 08:40',
    '08:40 - 09:00',
    '09:00 - 09:20',
    '09:20 - 09:40',
    '09:40 - 10:00',
    '10:00 - 10:20',
    '10:20 - 10:40',
    '10:40 - 11:00',
    '11:00 - 11:20',
    '11:20 - 11:40',
    '11:40 - 12:00',
    '14:00 - 14:20',
    '14:20 - 14:40',
    '14:40 - 15:00',
    '15:00 - 15:20',
    '15:20 - 15:40',
    '15:40 - 16:00',
    '16:00 - 16:20',
    '16:20 - 16:40',
    '16:40 - 17:00',
  ];

  // Descanso Médico / Certificado de Incapacidad Temporal
  readonly otorgarDescansoMedico = signal<boolean>(false);
  readonly diasDescanso = signal<number>(3);
  readonly fechaInicioDescanso = signal<string>('');
  readonly diagnosticoDescansoId = signal<number>(0);
  readonly tipoReposo = signal<'ABSOLUTO' | 'RELATIVO'>('ABSOLUTO');
  readonly observacionesDescanso = signal<string>('');

  readonly fechaFinDescanso = computed<string>(() => {
    const inicioStr = this.fechaInicioDescanso() || this.fechaConsulta() || this.ficha()?.fechaAtencion || '';
    const dias = Math.max(1, this.diasDescanso());
    if (!inicioStr) return '';
    const partes = inicioStr.split('-');
    if (partes.length !== 3) return '';
    const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    fecha.setDate(fecha.getDate() + (dias - 1));
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  });

  // Alertas clínicas de signos vitales (Semáforo de triaje)
  readonly alertaPresionArterial = computed<string | null>(() => {
    const pa = this.triaje()?.presionArterial;
    if (!pa) return null;
    const partes = pa.split('/');
    if (partes.length === 2) {
      const sistolica = parseInt(partes[0], 10);
      const diastolica = parseInt(partes[1], 10);
      if (sistolica >= 140 || diastolica >= 90) return 'Hipertensión / Cifras Elevadas';
      if (sistolica < 90 || diastolica < 60) return 'Hipotensión';
    }
    return null;
  });

  readonly alertaSaturacion = computed<string | null>(() => {
    const sat = this.triaje()?.saturacion;
    if (!sat) return null;
    if (sat < 95) return 'Hipoxemia';
    return null;
  });

  readonly alertaTemperatura = computed<string | null>(() => {
    const temp = this.triaje()?.temperatura;
    if (!temp) return null;
    if (temp >= 38.0) return 'Fiebre';
    if (temp >= 37.5) return 'Febrícula';
    if (temp < 35.5) return 'Hipotermia';
    return null;
  });

  readonly alertaFrecuenciaCardiaca = computed<string | null>(() => {
    const fc = this.triaje()?.frecuenciaCardiaca;
    if (!fc) return null;
    if (fc > 100) return 'Taquicardia';
    if (fc < 60) return 'Bradicardia';
    return null;
  });

  readonly esDestinoCitado = computed<boolean>(() => {
    const id = this.ficha()?.idDestinoAtencion;
    if (id === 1) return true;
    const destino = this.destinos().find((d) => d.idDestinoAtencion === id);
    return (destino?.descripcion || '').toUpperCase().includes('CITADO');
  });

  readonly cantidadDiagnosticos = computed(
    () => this.ficha()?.diagnosticos?.length ?? 0,
  );
  readonly cantidadProcedimientos = computed(
    () => this.procedimientos().length,
  );
  readonly cantidadReceta = computed(() => this.itemsReceta().length);
  readonly cantidadApoyo = computed(() => this.ordenesApoyo().length);
  readonly cantidadInterconsultas = computed(
    () => this.interconsultas().length,
  );
  readonly cantidadOrdenesProcedimientos = computed(
    () => this.ordenesProcedimientos().length,
  );

  readonly estadoAtencion = computed(() => {
    const estado = this.ficha()?.estado;
    if (estado === 2) return 'ATENDIDO';
    if (estado === 1) return 'EN_ATENCION';
    return 'PENDIENTE';
  });

  // Adaptador para pasar el paciente actual al componente de triaje reactivo
  readonly pacienteParaTriaje = computed<ColaPacienteCEItem | null>(() => {
    const f = this.ficha();
    if (!f) return null;
    return {
      idAtencion: f.idAtencion,
      idCuentaAtencion: f.idCuentaAtencion,
      idPaciente: f.idPaciente,
      nroHistoriaClinica: f.nroHistoriaClinica,
      nroDocumento: f.nroDocumento,
      pacienteNombre: f.pacienteNombre,
      fechaIngreso: '',
      horaIngreso: f.horaIngreso,
      horaEgreso: f.horaEgreso,
      edad: f.edad,
      idServicioIngreso: 0,
      servicioNombre: f.especialidadNombre || 'CONSULTORIOS EXTERNOS',
      idMedicoIngreso: 0,
      medicoNombre: '',
      estadoAtencion:
        f.estado === 2
          ? 'ATENDIDO'
          : f.estado === 1
            ? 'EN_ATENCION'
            : 'PENDIENTE',
      idCita: 0,
      tipoFinanciador: f.iafa || 'SIS',
      sexo: f.sexo,
      tieneTriaje: !!this.triaje(),
    };
  });

  readonly pacienteParaHistorial = computed<PacienteHistorialDatos | null>(() => {
    const f = this.ficha();
    if (!f) return null;
    return {
      idPaciente: f.idPaciente,
      idAtencion: f.idAtencion,
      pacienteNombre: f.pacienteNombre,
      nroHistoriaClinica: f.nroHistoriaClinica,
      nroDocumento: f.nroDocumento,
      edad: f.edad,
      sexo: f.sexo,
    };
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!id || id <= 0) {
      this.navegarACola();
      return;
    }

    const fechaQuery = this.route.snapshot.queryParamMap.get('fecha');
    if (fechaQuery) {
      this.fechaConsulta.set(fechaQuery);
    }

    this.idAtencion.set(id);
    void this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    try {
      const [datosFicha, datosTriaje, listaDestinos] = await Promise.all([
        this.apiService.obtenerFicha(this.idAtencion()),
        this.apiService.obtenerTriajePorAtencion(this.idAtencion()),
        this.apiService.listarDestinos(),
      ]);

      this.ficha.set(datosFicha);
      this.procedimientos.set(datosFicha?.procedimientos || []);
      this.ordenesApoyo.set(datosFicha?.ordenesApoyoDiagnostico || []);
      this.interconsultas.set(datosFicha?.interconsultas || []);
      this.ordenesProcedimientos.set(datosFicha?.ordenesProcedimientos || []);
      this.triaje.set(datosTriaje);
      this.destinos.set(listaDestinos);

      if (datosFicha?.fechaProxCita) {
        this.fechaPropuestaCita.set(datosFicha.fechaProxCita);
      }
      if (datosFicha?.idDestinoAtencion === 1) {
        this.generarCita.set(true);
      }

      // Cargar antecedentes y comorbilidades del paciente si existen
      if (datosFicha?.idPaciente && datosFicha.idPaciente > 0) {
        const adicionales = await this.apiService.obtenerDatosAdicionales(
          datosFicha.idPaciente,
        );
        if (adicionales) {
          this.antecedQuirurgico.set(adicionales.antecedQuirurgico || '');
          this.antecedPatologico.set(adicionales.antecedPatologico || '');
          this.antecedObstetrico.set(adicionales.antecedObstetrico || '');
          this.antecedAlergico.set(adicionales.antecedAlergico || '');
          this.antecedFamiliar.set(adicionales.antecedFamiliar || '');
          this.otrosAntecedentes.set(
            adicionales.antecedentes || datosFicha.antecedente || '',
          );

          this.comorbHipertension.set(adicionales.hipertensionArterial === 1);
          this.comorbAnemia.set(adicionales.anemia === 1);
          this.comorbTuberculosis.set(adicionales.tuberculosis === 1);
          this.comorbObesidad.set(adicionales.obesidad === 1);
          this.comorbHigadoGraso.set(adicionales.higadoGraso === 1);
          this.comorbFuma.set(adicionales.fumaActualmente === 1);
          this.comorbDislipidemia.set(adicionales.dislipidemia === 1);
          this.comorbEnfTiroidea.set(adicionales.enfTiroidea === 1);
          this.comorbCancer.set(adicionales.cancer === 1);
          this.otrasComorbilidades.set(adicionales.otrosComorbilidad || '');
        } else if (datosFicha.antecedente) {
          this.otrosAntecedentes.set(datosFicha.antecedente);
        }
      }
    } catch {
      this.mensajeError.set(
        'No fue posible cargar los datos de la atención médica.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarPestana(pestana: '3.1' | '3.3' | '3.4' | '3.5' | '3.6'): void {
    this.pestanaActiva.set(pestana);
    this.erroresValidacion.set([]);
  }

  actualizarDiagnosticos(nuevosDx: AtencionDiagnosticoCEItem[]): void {
    const fichaActual = this.ficha();
    if (fichaActual) {
      fichaActual.diagnosticos = nuevosDx;
      this.ficha.set({ ...fichaActual });
    }
  }

  actualizarProcedimientos(items: AtencionProcedimientoCEItem[]): void {
    this.procedimientos.set(items);
  }

  actualizarInforCompDiag(texto: string): void {
    const fichaActual = this.ficha();
    if (fichaActual) {
      fichaActual.inforCompDiagMed = texto;
      this.ficha.set({ ...fichaActual });
    }
  }

  actualizarReceta(nuevosItems: ItemRecetaPrescripcion[]): void {
    this.itemsReceta.set(nuevosItems);
  }

  actualizarOrdenesApoyo(items: OrdenApoyoDiagnosticoItem[]): void {
    this.ordenesApoyo.set(items);
  }

  actualizarTextoTratamiento(texto: string): void {
    const fichaActual = this.ficha();
    if (fichaActual) {
      fichaActual.tratamiento = texto;
      this.ficha.set({ ...fichaActual });
    }
  }

  actualizarTextoApoyo(texto: string): void {
    const fichaActual = this.ficha();
    if (fichaActual) {
      fichaActual.planTratamiento = texto;
      this.ficha.set({ ...fichaActual });
    }
  }

  actualizarInterconsultas(items: InterconsultaCEItem[]): void {
    this.interconsultas.set(items);
  }

  actualizarOrdenesProcedimientos(items: OrdenProcedimientoCEItem[]): void {
    this.ordenesProcedimientos.set(items);
  }

  actualizarTextoInterconsultas(texto: string): void {
    const fichaActual = this.ficha();
    if (fichaActual && texto) {
      const actual = fichaActual.planTratamiento
        ? `${fichaActual.planTratamiento}\n\n`
        : '';
      fichaActual.planTratamiento = `${actual}[INTERCONSULTAS]:\n${texto}`;
      this.ficha.set({ ...fichaActual });
    }
  }

  actualizarTextoProcedimientos(texto: string): void {
    const fichaActual = this.ficha();
    if (fichaActual && texto) {
      const actual = fichaActual.tratamiento
        ? `${fichaActual.tratamiento}\n\n`
        : '';
      fichaActual.tratamiento = `${actual}[PROCEDIMIENTOS]:\n${texto}`;
      this.ficha.set({ ...fichaActual });
    }
  }

  calcularFechaSugerida(dias = 30): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  establecerFechaSugerida(dias: number): void {
    const sugerida = this.calcularFechaSugerida(dias);
    this.fechaPropuestaCita.set(sugerida);
    const fichaActual = this.ficha();
    if (fichaActual) {
      fichaActual.fechaProxCita = sugerida;
    }
  }

  cambiarDestino(valor: unknown): void {
    const id = Number(valor) || 0;
    const fichaActual = this.ficha();
    if (fichaActual) {
      fichaActual.idDestinoAtencion = id;
      this.ficha.set({ ...fichaActual });
    }

    const destinoEncontrado = this.destinos().find(
      (d) => d.idDestinoAtencion === id,
    );
    const descripcion = (destinoEncontrado?.descripcion || '').toUpperCase();
    const esCitado = id === 1 || descripcion.includes('CITADO');

    if (esCitado) {
      this.generarCita.set(true);
      if (!this.fechaPropuestaCita()) {
        const sugerida = this.calcularFechaSugerida(30);
        this.fechaPropuestaCita.set(sugerida);
        if (fichaActual) {
          fichaActual.fechaProxCita = sugerida;
        }
      }
    } else {
      this.generarCita.set(false);
    }
  }

  alCambiarGenerarCita(checked: boolean): void {
    this.generarCita.set(checked);
    if (checked && !this.fechaPropuestaCita()) {
      const sugerida = this.calcularFechaSugerida(30);
      this.fechaPropuestaCita.set(sugerida);
      const fichaActual = this.ficha();
      if (fichaActual) {
        fichaActual.fechaProxCita = sugerida;
      }
    }
  }

  alCambiarFechaPropuesta(fecha: string): void {
    this.fechaPropuestaCita.set(fecha);
    const fichaActual = this.ficha();
    if (fichaActual) {
      fichaActual.fechaProxCita = fecha;
    }
  }

  filtrarSoloNumerosCelular(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const soloNumeros = input.value.replace(/\D/g, '').slice(0, 9);
    input.value = soloNumeros;
    this.celularPaciente.set(soloNumeros);
  }

  formatearTratamientoPosologia(item: ItemRecetaPrescripcion): string {
    const dosis = item.dosis || '1';
    const unidad = item.unidadMedida || 'TAB';
    const frecuencia = item.frecuencia || 'C\\24 HORAS';
    const duracion = item.duracion || '30 DÍAS';
    const via = item.via || 'ORAL';
    return `${dosis} ${unidad} ${frecuencia}, POR ${duracion}, VIA: ${via}`.toUpperCase();
  }

  abrirModalModificarTriaje(): void {
    this.modalTriajeVisible.set(true);
  }

  cerrarModalTriaje(): void {
    this.modalTriajeVisible.set(false);
  }

  async alGuardarTriajeExitoso(_evento: { idAtencion: number }): Promise<void> {
    this.modalTriajeVisible.set(false);
    this.modalGlobal.exito(
      'Los datos de triaje fueron actualizados y vinculados a la atención correctamente.',
      'Triaje Actualizado',
    );
    await this.cargarDatos();
  }

  abrirHistorialAtenciones(): void {
    this.modalHistorialAtencionesVisible.set(true);
  }

  cerrarHistorialAtenciones(): void {
    this.modalHistorialAtencionesVisible.set(false);
  }

  async abrirHistorialTriaje(): Promise<void> {
    this.modalHistorialTriajeVisible.set(true);
    const idPaciente = this.ficha()?.idPaciente;
    if (idPaciente && idPaciente > 0) {
      this.cargandoHistorialTriaje.set(true);
      try {
        const registros =
          await this.apiService.obtenerHistorialTriajePaciente(idPaciente);
        this.historialTriajes.set(registros);
      } catch {
        this.historialTriajes.set([]);
      } finally {
        this.cargandoHistorialTriaje.set(false);
      }
    }
  }

  cerrarHistorialTriaje(): void {
    this.modalHistorialTriajeVisible.set(false);
  }

  private validarParaCerrar(fichaActual: FichaAtencionCEDetalle): string[] {
    const errores: string[] = [];
    if (!fichaActual.motivo?.trim()) {
      errores.push(
        'El campo "Relato de la Enfermedad / Anamnesis" es obligatorio para finalizar la atención.',
      );
    }
    if (!fichaActual.diagnosticos || fichaActual.diagnosticos.length === 0) {
      errores.push(
        'Debe registrar al menos un diagnóstico CIE-10 antes de finalizar la atención.',
      );
    }
    if (this.generarCita()) {
      const fechaCita = this.fechaPropuestaCita().trim();
      if (!fechaCita) {
        errores.push(
          'Debe seleccionar una "Fecha Propuesta" válida para generar la próxima cita del paciente.',
        );
      } else {
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        const partes = fechaCita.split('-');
        if (partes.length === 3) {
          const fechaSeleccionada = new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2]),
          );
          if (fechaSeleccionada < fechaActual) {
            errores.push(
              'La "Fecha Propuesta" para la próxima cita no puede ser una fecha anterior al día de hoy.',
            );
          }
        }
      }
    }
    const celular = this.celularPaciente().trim();
    if (celular.length > 0 && celular.length !== 9) {
      errores.push(
        'El número de celular del paciente debe contener exactamente 9 dígitos numéricos.',
      );
    }
    return errores;
  }

  async registrarAtencion(): Promise<void> {
    const fichaActual = this.ficha();
    if (!fichaActual) return;

    this.erroresValidacion.set([]);

    const errores = this.validarParaCerrar(fichaActual);
    if (errores.length > 0) {
      this.erroresValidacion.set(errores);
      return;
    }

    const confirmado = await this.modalGlobal.confirmar(
      '¿Está seguro de registrar y finalizar la atención médica de Consulta Externa? El estado del paciente cambiará a ATENDIDO.',
      'Finalizar Atención Médica',
      'Sí, Finalizar',
    );
    if (!confirmado) {
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set('');

    // Sincronizar antecedentes consolidados
    const antecedenteConsolidado = this.otrosAntecedentes().trim();

    let observacionesConsolidadas = (fichaActual.observaciones || '').trim();
    if (this.generarCita()) {
      const especialidad = fichaActual.especialidadNombre || 'CONSULTA EXTERNA';
      const programacion =
        this.opcionesProgramacion.find((p) => p.id === this.programacionCita())
          ?.nombre || 'ORDINARIA';
      const horario =
        this.horarioCita() !== '0' ? this.horarioCita() : 'PROGRAMADO';
      const celular = this.celularPaciente().trim();
      const fechaCita =
        this.fechaPropuestaCita().trim() || fichaActual.fechaProxCita || '';

      const lineaCita = `[CITA GENERADA]: Especialidad: ${especialidad} | Prog: ${programacion} | Horario: ${horario} | Fecha: ${fechaCita}${celular ? ` | Celular: ${celular}` : ''}${this.altaDefinitiva() ? ' | ALTA DEFINITIVA: SÍ' : ''}`;

      if (!observacionesConsolidadas.includes('[CITA GENERADA]')) {
        observacionesConsolidadas = observacionesConsolidadas
          ? `${observacionesConsolidadas}\n${lineaCita}`
          : lineaCita;
      }
    } else if (
      this.altaDefinitiva() &&
      !observacionesConsolidadas.includes('[ALTA DEFINITIVA: SÍ]')
    ) {
      observacionesConsolidadas = observacionesConsolidadas
        ? `${observacionesConsolidadas}\n[ALTA DEFINITIVA: SÍ]`
        : '[ALTA DEFINITIVA: SÍ]';
    }

    if (this.otorgarDescansoMedico()) {
      const dias = Math.max(1, this.diasDescanso());
      const fechaInicio = this.fechaInicioDescanso() || this.fechaConsultaFormateada();
      const fechaFin = this.fechaFinDescanso() || this.fechaConsultaFormateada();
      const dxDescanso =
        (fichaActual.diagnosticos || []).find(
          (d) => d.idDiagnostico === this.diagnosticoDescansoId(),
        ) || (fichaActual.diagnosticos || [])[0];
      const dxTexto = dxDescanso ? ` [CIE-10: ${dxDescanso.codigoCIE10}]` : '';
      const lineaDescanso = `[DESCANSO MÉDICO]: ${dias} DÍA(S) (DEL ${fechaInicio} AL ${fechaFin}) - REPOSO ${this.tipoReposo()}${dxTexto}`;
      if (!observacionesConsolidadas.includes('[DESCANSO MÉDICO]')) {
        observacionesConsolidadas = observacionesConsolidadas
          ? `${observacionesConsolidadas}\n${lineaDescanso}`
          : lineaDescanso;
      }
    }

    const identificadorUsuario =
      this.authService.getIdEmpleado() ||
      this.authService.userProfile()?.idEmpleado ||
      1;

    const payload: AtencionCEGuardarPayload = {
      idAtencion: Number(fichaActual.idAtencion) || 0,
      idUsuario: identificadorUsuario,
      motivo: fichaActual.motivo || '',
      examenClinico: fichaActual.examenClinico || '',
      antecedente: antecedenteConsolidado,
      inforCompDiagMed: fichaActual.inforCompDiagMed || '',
      tratamiento: fichaActual.tratamiento || '',
      planTratamiento: fichaActual.planTratamiento || '',
      observaciones: observacionesConsolidadas,
      fechaProxCita:
        this.fechaPropuestaCita().trim() || fichaActual.fechaProxCita || '',
      idDestinoAtencion: Number(fichaActual.idDestinoAtencion) || 0,
      cerrarAtencion: true,
      diagnosticos: fichaActual.diagnosticos.map((diagnostico) => ({
        idDiagnostico: Number(diagnostico.idDiagnostico) || 0,
        idClasificacionDx: Number(diagnostico.idClasificacionDx) || 1,
        idSubclasificacionDx: Number(diagnostico.idSubclasificacionDx) || 1,
        clasificacion: diagnostico.clasificacion || 'D',
        labConfHIS: diagnostico.labConfHIS || '',
        labConfHIS1: diagnostico.labConfHIS1 || '',
        labConfHIS2: diagnostico.labConfHIS2 || '',
        labConfHIS3: diagnostico.labConfHIS3 || '',
      })),
      procedimientos: this.procedimientos(),
      ordenesApoyoDiagnostico: this.ordenesApoyo(),
      interconsultas: this.interconsultas(),
      ordenesProcedimientos: this.ordenesProcedimientos(),
    };

    try {
      await this.apiService.guardarFicha(payload);

      if (fichaActual.idPaciente && fichaActual.idPaciente > 0) {
        const datosAdicionalesPayload: PacienteDatosAdicionalesCE = {
          idPaciente: fichaActual.idPaciente,
          antecedentes: this.otrosAntecedentes().trim(),
          antecedAlergico: this.antecedAlergico().trim(),
          antecedObstetrico: this.antecedObstetrico().trim(),
          antecedQuirurgico: this.antecedQuirurgico().trim(),
          antecedFamiliar: this.antecedFamiliar().trim(),
          antecedPatologico: this.antecedPatologico().trim(),
          hipertensionArterial: this.comorbHipertension() ? 1 : 0,
          anemia: this.comorbAnemia() ? 1 : 0,
          tuberculosis: this.comorbTuberculosis() ? 1 : 0,
          obesidad: this.comorbObesidad() ? 1 : 0,
          higadoGraso: this.comorbHigadoGraso() ? 1 : 0,
          fumaActualmente: this.comorbFuma() ? 1 : 0,
          dislipidemia: this.comorbDislipidemia() ? 1 : 0,
          enfTiroidea: this.comorbEnfTiroidea() ? 1 : 0,
          cancer: this.comorbCancer() ? 1 : 0,
          otrosComorbilidad: this.otrasComorbilidades().trim(),
        };
        await this.apiService.guardarDatosAdicionales(
          fichaActual.idPaciente,
          datosAdicionalesPayload,
        );
      }

      this.modalGlobal.exito(
        'La atención médica ha sido registrada y finalizada con éxito.',
        'Atención Finalizada',
      );
      this.navegarACola();
    } catch {
      this.mensajeError.set('Ocurrió un error al intentar registrar la ficha.');
      this.modalGlobal.error(
        'Ocurrió un error al registrar la ficha médica. Verifique la información ingresada.',
        'Error al Registrar',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  irASiguientePestana(): void {
    const actual = this.pestanaActiva();
    if (actual === '3.1') this.cambiarPestana('3.3');
    else if (actual === '3.3') this.cambiarPestana('3.4');
    else if (actual === '3.4') this.cambiarPestana('3.5');
    else if (actual === '3.5') this.cambiarPestana('3.6');
  }

  irAPestanaAnterior(): void {
    const actual = this.pestanaActiva();
    if (actual === '3.6') this.cambiarPestana('3.5');
    else if (actual === '3.5') this.cambiarPestana('3.4');
    else if (actual === '3.4') this.cambiarPestana('3.3');
    else if (actual === '3.3') this.cambiarPestana('3.1');
  }

  async imprimirReceta(): Promise<void> {
    const fichaActual = this.ficha();
    if (!fichaActual) return;
    try {
      await imprimirPdfRecetaMedica({
        pacienteNombre: fichaActual.pacienteNombre || '',
        nroHistoriaClinica: fichaActual.nroHistoriaClinica || '',
        nroDocumento: fichaActual.nroDocumento || '',
        edad: fichaActual.edad || 0,
        sexo: fichaActual.sexo || '',
        tipoFinanciador: fichaActual.iafa || 'SIS',
        fechaAtencion: this.fechaConsultaFormateada(),
        servicioNombre: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
        medicoNombre: this.authService.userProfile()?.nombreCompleto || 'MÉDICO TRATANTE',
        diagnosticos: (fichaActual.diagnosticos || []).map((diagnostico) => ({
          codigoCIE10: diagnostico.codigoCIE10 || '',
          descripcion: diagnostico.descripcion || '',
          clasificacion: diagnostico.clasificacion || 'D',
        })),
        itemsReceta: this.itemsReceta(),
        indicacionesGenerales: fichaActual.planTratamiento || fichaActual.tratamiento || '',
        fechaProximaCita: this.fechaPropuestaCita() || fichaActual.fechaProxCita || '',
      });
    } catch {
      this.modalGlobal.error(
        'No se pudo generar la receta médica en formato PDF.',
        'Error de Impresión',
      );
    }
  }

  async imprimirOrdenesApoyo(): Promise<void> {
    const fichaActual = this.ficha();
    if (!fichaActual) return;
    try {
      await imprimirPdfOrdenesApoyo({
        pacienteNombre: fichaActual.pacienteNombre || '',
        nroHistoriaClinica: fichaActual.nroHistoriaClinica || '',
        nroDocumento: fichaActual.nroDocumento || '',
        edad: fichaActual.edad || 0,
        sexo: fichaActual.sexo || '',
        tipoFinanciador: fichaActual.iafa || 'SIS',
        fechaAtencion: this.fechaConsultaFormateada(),
        servicioNombre: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
        medicoNombre: this.authService.userProfile()?.nombreCompleto || 'MÉDICO TRATANTE',
        diagnosticos: (fichaActual.diagnosticos || []).map((diagnostico) => ({
          codigoCIE10: diagnostico.codigoCIE10 || '',
          descripcion: diagnostico.descripcion || '',
        })),
        ordenesApoyo: this.ordenesApoyo(),
        indicacionesGenerales: fichaActual.planTratamiento || '',
      });
    } catch {
      this.modalGlobal.error(
        'No se pudo generar la orden de exámenes en formato PDF.',
        'Error de Impresión',
      );
    }
  }

  async imprimirResumenConsulta(): Promise<void> {
    const fichaActual = this.ficha();
    if (!fichaActual) return;
    try {
      await imprimirPdfResumenConsulta({
        ficha: fichaActual,
        triaje: this.triaje(),
        itemsReceta: this.itemsReceta(),
        fechaConsultaFormateada: this.fechaConsultaFormateada(),
        medicoNombre: this.authService.userProfile()?.nombreCompleto || 'MÉDICO TRATANTE',
      });
    } catch {
      this.modalGlobal.error(
        'No se pudo generar el resumen de la atención médica en formato PDF.',
        'Error de Impresión',
      );
    }
  }

  async imprimirDescansoMedico(): Promise<void> {
    const fichaActual = this.ficha();
    if (!fichaActual) return;
    const diagnosticos = fichaActual.diagnosticos || [];
    const diagnosticoSeleccionado =
      diagnosticos.find((d) => d.idDiagnostico === this.diagnosticoDescansoId()) ||
      diagnosticos[0];
    if (!diagnosticoSeleccionado) {
      this.modalGlobal.info(
        'Debe registrar al menos un diagnóstico para emitir un descanso médico.',
        'Diagnóstico Requerido',
      );
      return;
    }
    try {
      await imprimirPdfDescansoMedico({
        pacienteNombre: fichaActual.pacienteNombre || '',
        nroHistoriaClinica: fichaActual.nroHistoriaClinica || '',
        nroDocumento: fichaActual.nroDocumento || '',
        edad: fichaActual.edad || 0,
        sexo: fichaActual.sexo || '',
        fechaAtencion: this.fechaConsultaFormateada(),
        servicioNombre: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
        medicoNombre: this.authService.userProfile()?.nombreCompleto || 'MÉDICO TRATANTE',
        diagnosticoPrincipal: diagnosticoSeleccionado.descripcion || '',
        codigoCIE10: diagnosticoSeleccionado.codigoCIE10 || '',
        diasDescanso: Math.max(1, this.diasDescanso()),
        fechaInicio: this.fechaInicioDescanso() || this.fechaConsultaFormateada(),
        fechaFin: this.fechaFinDescanso() || this.fechaConsultaFormateada(),
        tipoReposo: this.tipoReposo(),
        observaciones: this.observacionesDescanso() || '',
      });
    } catch {
      this.modalGlobal.error(
        'No se pudo generar el certificado de descanso médico.',
        'Error de Impresión',
      );
    }
  }

  // Alias para compatibilidad
  async guardar(): Promise<void> {
    await this.registrarAtencion();
  }

  volverACola(): void {
    this.navegarACola();
  }

  private navegarACola(): void {
    const fecha =
      this.route.snapshot.queryParamMap.get('fecha') ||
      this.estadoService.fechaSeleccionada();
    const estado =
      this.route.snapshot.queryParamMap.get('estado') ||
      this.estadoService.estadoFiltro();

    void this.router.navigate(['/atencion-ce'], {
      queryParams: {
        fecha,
        estado: estado || undefined,
      },
    });
  }
}
