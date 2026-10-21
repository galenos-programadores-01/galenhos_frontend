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
import { PaginacionComponent } from '../../../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import { AuthService } from '../../../../../../auth/aplicacion/auth.service';
import { AtencionCeEstadoService } from '../../../../../aplicacion/atencion-ce-estado.service';
import {
  AtencionCeFirmaService,
  type DatosAtencionFirmaLote,
  type DocumentoAtencionFirmadoItem,
} from '../../../../../aplicacion/atencion-ce-firma.service';
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
import {
  type DatosPdfDescansoMedico,
  type DatosPdfHojaInterconsulta,
  type DatosPdfOrdenImagenologia,
  type DatosPdfOrdenLaboratorio,
  type DatosPdfRecetaMedica,
  type DatosPdfResumenConsulta,
  generarDocumentoPdfDescansoMedico,
  generarDocumentoPdfHojaInterconsulta,
  generarDocumentoPdfOrdenImagenologia,
  generarDocumentoPdfOrdenLaboratorio,
  generarDocumentoPdfRecetaMedica,
  generarDocumentoPdfResumenConsulta,
  imprimirPdfDescansoMedico,
  imprimirPdfHojaInterconsulta,
  imprimirPdfOrdenImagenologia,
  imprimirPdfOrdenLaboratorio,
  imprimirPdfRecetaMedica,
  imprimirPdfResumenConsulta,
} from '../../../../../utilidades/pdf/historial-atencion-pdf.util';
import { AtencionCEApiService } from '../../../../salida/http/atencion-ce.api.service';
import { DiagnosticosCeSeccionComponent } from '../../componentes/diagnosticos-ce-seccion/diagnosticos-ce-seccion.component';
import { DocumentosFirmadosModalComponent } from '../../componentes/documentos-firmados-modal/documentos-firmados-modal.component';
import {
  HistorialAtencionesModalComponent,
  type PacienteHistorialDatos,
} from '../../componentes/historial-atenciones-modal/historial-atenciones-modal.component';
import { OrdenesMedicasCeSeccionComponent } from '../../componentes/ordenes-medicas-ce-seccion/ordenes-medicas-ce-seccion.component';
import { TriajeCeModalComponent } from '../../componentes/triaje-ce-modal/triaje-ce-modal.component';

@Component({
  selector: 'app-atencion-ce-ficha',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DiagnosticosCeSeccionComponent,
    DocumentosFirmadosModalComponent,
    HistorialAtencionesModalComponent,
    OrdenesMedicasCeSeccionComponent,
    PaginacionComponent,
    SelectGlobalComponent,
    TriajeCeModalComponent,
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
  private readonly firmaService = inject(AtencionCeFirmaService);

  readonly idAtencion = signal<number>(0);
  readonly ficha = signal<FichaAtencionCEDetalle | null>(null);
  readonly triaje = signal<TriajeConsultaSignosVitales | null>(null);
  readonly destinos = signal<readonly DestinoAtencionItem[]>([]);

  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly firmandoDigitalmente = signal<boolean>(false);
  readonly atencionFirmadaDigitalmente = signal<boolean>(false);
  readonly modalDocumentosFirmadosVisible = signal<boolean>(false);
  readonly documentosFirmadosLista = signal<
    readonly DocumentoAtencionFirmadoItem[]
  >([]);
  readonly mensajeError = signal<string>('');
  readonly erroresValidacion = signal<string[]>([]);

  readonly pestanaActiva = signal<
    '3.1' | '3.2' | '3.3' | '3.4' | '3.5' | '3.6'
  >('3.1');

  readonly antecedQuirurgico = signal<string>('');
  readonly antecedPatologico = signal<string>('');
  readonly antecedObstetrico = signal<string>('');
  readonly antecedAlergico = signal<string>('');
  readonly antecedFamiliar = signal<string>('');
  readonly otrosAntecedentes = signal<string>('');

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

  readonly itemsReceta = signal<ItemRecetaPrescripcion[]>([]);
  readonly paginaPrescripcion = signal<number>(1);
  readonly elementosPorPaginaPrescripcion = 5;
  readonly totalPaginasPrescripcion = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.itemsReceta()?.length || 0) / this.elementosPorPaginaPrescripcion,
      ),
    ),
  );
  readonly itemsRecetaPaginados = computed(() => {
    const lista = this.itemsReceta() || [];
    const inicio =
      (this.paginaPrescripcion() - 1) * this.elementosPorPaginaPrescripcion;
    return lista.slice(inicio, inicio + this.elementosPorPaginaPrescripcion);
  });

  readonly procedimientos = signal<AtencionProcedimientoCEItem[]>([]);
  readonly ordenesApoyo = signal<OrdenApoyoDiagnosticoItem[]>([]);
  readonly paginaApoyoPlan = signal<number>(1);
  readonly elementosPorPaginaApoyoPlan = 5;
  readonly totalPaginasApoyoPlan = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.ordenesApoyo()?.length || 0) / this.elementosPorPaginaApoyoPlan,
      ),
    ),
  );
  readonly ordenesApoyoPaginadasPlan = computed(() => {
    const lista = this.ordenesApoyo() || [];
    const inicio =
      (this.paginaApoyoPlan() - 1) * this.elementosPorPaginaApoyoPlan;
    return lista.slice(inicio, inicio + this.elementosPorPaginaApoyoPlan);
  });

  readonly interconsultas = signal<InterconsultaCEItem[]>([]);
  readonly paginaInterconsultasPlan = signal<number>(1);
  readonly elementosPorPaginaInterconsultasPlan = 5;
  readonly totalPaginasInterconsultasPlan = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.interconsultas()?.length || 0) /
          this.elementosPorPaginaInterconsultasPlan,
      ),
    ),
  );
  readonly interconsultasPaginadasPlan = computed(() => {
    const lista = this.interconsultas() || [];
    const inicio =
      (this.paginaInterconsultasPlan() - 1) *
      this.elementosPorPaginaInterconsultasPlan;
    return lista.slice(
      inicio,
      inicio + this.elementosPorPaginaInterconsultasPlan,
    );
  });

  readonly ordenesProcedimientos = signal<OrdenProcedimientoCEItem[]>([]);
  readonly paginaProcedimientosPlan = signal<number>(1);
  readonly elementosPorPaginaProcedimientosPlan = 5;
  readonly totalPaginasProcedimientosPlan = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.ordenesProcedimientos()?.length || 0) /
          this.elementosPorPaginaProcedimientosPlan,
      ),
    ),
  );
  readonly ordenesProcedimientosPaginadasPlan = computed(() => {
    const lista = this.ordenesProcedimientos() || [];
    const inicio =
      (this.paginaProcedimientosPlan() - 1) *
      this.elementosPorPaginaProcedimientosPlan;
    return lista.slice(
      inicio,
      inicio + this.elementosPorPaginaProcedimientosPlan,
    );
  });

  readonly modalTriajeVisible = signal<boolean>(false);
  readonly modalHistorialAtencionesVisible = signal<boolean>(false);
  readonly modalHistorialTriajeVisible = signal<boolean>(false);
  readonly historialTriajes = signal<readonly PacienteHistorialTriajeItem[]>(
    [],
  );
  readonly cargandoHistorialTriaje = signal<boolean>(false);

  readonly celularPaciente = signal<string>('');
  readonly altaDefinitiva = signal<boolean>(false);
  readonly generarCita = signal<boolean>(false);
  readonly programacionCita = signal<string>('0');
  readonly horarioCita = signal<string>('0');
  readonly fechaPropuestaCita = signal<string>('');
  readonly fechaConsulta = signal<string>('');
  readonly fechaConsultaFormateada = computed<string>(() => {
    const valorOriginal =
      this.fechaConsulta() ||
      this.ficha()?.fechaAtencion ||
      this.ficha()?.fechaIngreso ||
      this.estadoService.fechaSeleccionada() ||
      '';
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

  readonly otorgarDescansoMedico = signal<boolean>(false);
  readonly diasDescanso = signal<number>(3);
  readonly fechaInicioDescanso = signal<string>('');
  readonly diagnosticoDescansoId = signal<number>(0);
  readonly tipoReposo = signal<'ABSOLUTO' | 'RELATIVO'>('ABSOLUTO');
  readonly observacionesDescanso = signal<string>('');

  readonly fechaFinDescanso = computed<string>(() => {
    const inicioStr =
      this.fechaInicioDescanso() ||
      this.fechaConsulta() ||
      this.ficha()?.fechaAtencion ||
      '';
    const dias = Math.max(1, this.diasDescanso());
    if (!inicioStr) return '';
    const partes = inicioStr.split('-');
    if (partes.length !== 3) return '';
    const fecha = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2]),
    );
    fecha.setDate(fecha.getDate() + (dias - 1));
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  });

  readonly alertaPresionArterial = computed<string | null>(() => {
    const pa = this.triaje()?.presionArterial;
    if (!pa) return null;
    const partes = pa.split('/');
    if (partes.length === 2) {
      const sistolica = parseInt(partes[0], 10);
      const diastolica = parseInt(partes[1], 10);
      if (sistolica >= 140 || diastolica >= 90)
        return 'Hipertensión / Cifras Elevadas';
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
  readonly totalOrdenesMedicas = computed(
    () =>
      this.cantidadReceta() +
      this.cantidadApoyo() +
      this.cantidadInterconsultas() +
      this.cantidadOrdenesProcedimientos(),
  );

  readonly estadoAtencion = computed(() => {
    const estado = this.ficha()?.estado;
    if (estado === 2) return 'ATENDIDO';
    if (estado === 1) return 'EN_ATENCION';
    return 'PENDIENTE';
  });

  readonly esModoEdicion = computed(() => {
    const estado = this.ficha()?.estado;
    const modoParametro = this.route.snapshot.queryParamMap.get('modo');
    return estado === 2 || modoParametro === 'edicion';
  });

  readonly esModoSoloLectura = computed(() => {
    const modoParametro = this.route.snapshot.queryParamMap.get('modo');
    return modoParametro === 'lectura';
  });

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

  readonly pacienteParaHistorial = computed<PacienteHistorialDatos | null>(
    () => {
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
    },
  );

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

      if (datosFicha?.planTratamiento) {
        datosFicha.planTratamiento = this.limpiarTextoGeneradoDePlanTratamiento(
          datosFicha.planTratamiento,
        );
      }

      if (datosFicha?.diagnosticos) {
        datosFicha.diagnosticos = datosFicha.diagnosticos.map(
          (diagnostico, indice) => {
            const valorLab1 = (diagnostico.labConfHIS1 || '').trim();
            const valorLabHis = (diagnostico.labConfHIS || '').trim();
            const lab1Final =
              valorLab1 !== ''
                ? valorLab1
                : valorLabHis !== 'P' &&
                    valorLabHis !== 'D' &&
                    valorLabHis !== 'R'
                  ? valorLabHis
                  : '';
            return {
              ...diagnostico,
              labConfHIS1: lab1Final,
              labConfHIS2: (diagnostico.labConfHIS2 || '').trim(),
              labConfHIS3: (diagnostico.labConfHIS3 || '').trim(),
              idSubclasificacionDx:
                diagnostico.idSubclasificacionDx === 1 || indice === 0 ? 1 : 2,
            };
          },
        );
      }

      const listaProcedimientosNormalizados = (
        datosFicha?.procedimientos || []
      ).map((procedimiento) => {
        if (
          !procedimiento.codigoCIE10Asociado &&
          datosFicha?.diagnosticos &&
          datosFicha.diagnosticos.length > 0
        ) {
          const diagnosticoPrincipal = datosFicha.diagnosticos[0];
          return {
            ...procedimiento,
            codigoCIE10Asociado: diagnosticoPrincipal.codigoCIE10,
            diagnosticoDescripcionAsociado: diagnosticoPrincipal.descripcion,
            idDiagnosticoAsociado: diagnosticoPrincipal.idDiagnostico,
          };
        }
        return procedimiento;
      });

      this.ficha.set(datosFicha);
      this.procedimientos.set(listaProcedimientosNormalizados);
      this.ordenesApoyo.set(datosFicha?.ordenesApoyoDiagnostico || []);
      this.interconsultas.set(datosFicha?.interconsultas || []);
      this.ordenesProcedimientos.set(datosFicha?.ordenesProcedimientos || []);
      this.itemsReceta.set(datosFicha?.itemsReceta || []);
      this.triaje.set(datosTriaje);
      this.destinos.set(listaDestinos);

      if (datosFicha?.diagnosticos && datosFicha.diagnosticos.length > 0) {
        if (this.diagnosticoDescansoId() === 0) {
          this.diagnosticoDescansoId.set(
            datosFicha.diagnosticos[0].idDiagnostico,
          );
        }
      }

      if (datosFicha?.telefono) {
        this.celularPaciente.set(datosFicha.telefono.trim());
      }
      const observaciones = datosFicha?.observaciones || '';
      if (!this.celularPaciente() && observaciones.includes('Celular:')) {
        const coincidenciaCelular = observaciones.match(/Celular:\s*(\d{9})/);
        if (coincidenciaCelular?.[1]) {
          this.celularPaciente.set(coincidenciaCelular[1]);
        }
      }
      if (observaciones.includes('[ALTA DEFINITIVA: SÍ]')) {
        this.altaDefinitiva.set(true);
      }
      if (observaciones.includes('[DESCANSO MÉDICO]')) {
        this.otorgarDescansoMedico.set(true);
        const coincidenciaDias = observaciones.match(/(\d+)\s+DÍA/i);
        if (coincidenciaDias?.[1]) {
          this.diasDescanso.set(Number(coincidenciaDias[1]));
        }
        if (observaciones.includes('REPOSO RELATIVO')) {
          this.tipoReposo.set('RELATIVO');
        } else if (observaciones.includes('REPOSO ABSOLUTO')) {
          this.tipoReposo.set('ABSOLUTO');
        }
      }

      if (datosFicha?.fechaProxCita) {
        this.fechaPropuestaCita.set(datosFicha.fechaProxCita);
      }
      if (datosFicha?.idDestinoAtencion === 1) {
        this.generarCita.set(true);
      }

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

  cambiarPestana(pestana: '3.1' | '3.2' | '3.3' | '3.4' | '3.5' | '3.6'): void {
    this.pestanaActiva.set(pestana);
    this.erroresValidacion.set([]);
  }

  actualizarDiagnosticos(nuevosDx: AtencionDiagnosticoCEItem[]): void {
    const fichaActual = this.ficha();
    if (fichaActual) {
      fichaActual.diagnosticos = nuevosDx;
      this.ficha.set({ ...fichaActual });
      if (
        nuevosDx.length > 0 &&
        (this.diagnosticoDescansoId() === 0 ||
          !nuevosDx.some(
            (d) => d.idDiagnostico === this.diagnosticoDescansoId(),
          ))
      ) {
        this.diagnosticoDescansoId.set(nuevosDx[0].idDiagnostico);
      }
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
    const maxPagina = Math.max(
      1,
      Math.ceil(nuevosItems.length / this.elementosPorPaginaPrescripcion),
    );
    if (this.paginaPrescripcion() > maxPagina) {
      this.paginaPrescripcion.set(maxPagina);
    }
  }

  actualizarOrdenesApoyo(items: OrdenApoyoDiagnosticoItem[]): void {
    this.ordenesApoyo.set(items);
    const maxPagina = Math.max(
      1,
      Math.ceil(items.length / this.elementosPorPaginaApoyoPlan),
    );
    if (this.paginaApoyoPlan() > maxPagina) {
      this.paginaApoyoPlan.set(maxPagina);
    }
  }

  actualizarInterconsultas(items: InterconsultaCEItem[]): void {
    this.interconsultas.set(items);
    const maxPagina = Math.max(
      1,
      Math.ceil(items.length / this.elementosPorPaginaInterconsultasPlan),
    );
    if (this.paginaInterconsultasPlan() > maxPagina) {
      this.paginaInterconsultasPlan.set(maxPagina);
    }
  }

  actualizarOrdenesProcedimientos(items: OrdenProcedimientoCEItem[]): void {
    this.ordenesProcedimientos.set(items);
    const maxPagina = Math.max(
      1,
      Math.ceil(items.length / this.elementosPorPaginaProcedimientosPlan),
    );
    if (this.paginaProcedimientosPlan() > maxPagina) {
      this.paginaProcedimientosPlan.set(maxPagina);
    }
  }

  agregarPautaAlPlanTratamiento(textoPauta: string): void {
    const fichaActual = this.ficha();
    if (!fichaActual) return;
    const actual = (fichaActual.planTratamiento || '').trim();
    if (actual.includes(textoPauta)) return;
    const nuevoTexto = actual
      ? `${actual}\n• ${textoPauta}`
      : `• ${textoPauta}`;
    fichaActual.planTratamiento = nuevoTexto;
    this.ficha.set({ ...fichaActual });
  }

  private limpiarTextoGeneradoDePlanTratamiento(texto: string): string {
    if (!texto) {
      return '';
    }
    const bloques = texto.split('\n\n');
    const bloquesLimpios = bloques.filter((bloque) => {
      const b = bloque.trim();
      if (b.startsWith('ÓRDENES DE EXÁMENES AUXILIARES')) return false;
      if (b.startsWith('SOLICITUDES DE INTERCONSULTA MÉDICA:')) return false;
      if (b.startsWith('ÓRDENES DE PROCEDIMIENTOS MÉDICOS:')) return false;
      if (
        b.includes('Justificación clínica:') &&
        b.includes('Diagnóstico asociado:')
      )
        return false;
      if (
        b.includes('Motivo de interconsulta:') &&
        b.includes('Resumen de cuadro clínico:')
      )
        return false;
      if (b.startsWith('[INTERCONSULTAS]') || b.startsWith('[PROCEDIMIENTOS]'))
        return false;
      return true;
    });
    return bloquesLimpios.join('\n\n').trim();
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

  private async guardarDatosAtencionInterno(): Promise<boolean> {
    const fichaActual = this.ficha();
    if (!fichaActual) return false;

    const antecedenteConsolidado = this.otrosAntecedentes().trim();

    let observacionesConsolidadas = (fichaActual.observaciones || '').trim();
    if (this.generarCita()) {
      const especialidad = fichaActual.especialidadNombre || 'CONSULTA EXTERNA';
      const programacion =
        this.opcionesProgramacion.find(
          (programacionItem) => programacionItem.id === this.programacionCita(),
        )?.nombre || 'ORDINARIA';
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
      const fechaInicio =
        this.fechaInicioDescanso() || this.fechaConsultaFormateada();
      const fechaFin =
        this.fechaFinDescanso() || this.fechaConsultaFormateada();
      const diagnosticoDescanso =
        (fichaActual.diagnosticos || []).find(
          (diagnosticoItem) =>
            diagnosticoItem.idDiagnostico === this.diagnosticoDescansoId(),
        ) || (fichaActual.diagnosticos || [])[0];
      const diagnosticoTexto = diagnosticoDescanso
        ? ` [CIE-10: ${diagnosticoDescanso.codigoCIE10}]`
        : '';
      const lineaDescanso = `[DESCANSO MÉDICO]: ${dias} DÍA(S) (DEL ${fechaInicio} AL ${fechaFin}) - REPOSO ${this.tipoReposo()}${diagnosticoTexto}`;
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
      diagnosticos: fichaActual.diagnosticos.map((diagnostico) => {
        const clasif = diagnostico.clasificacion || 'D';
        const idSub = clasif === 'P' ? 101 : clasif === 'R' ? 103 : 102;
        const idClas = clasif === 'P' ? 1 : clasif === 'R' ? 3 : 2;
        return {
          idDiagnostico: Number(diagnostico.idDiagnostico) || 0,
          idClasificacionDx: idClas,
          idSubclasificacionDx: idSub,
          clasificacion: clasif,
          labConfHIS: diagnostico.labConfHIS || clasif,
          labConfHIS1: diagnostico.labConfHIS1 || '',
          labConfHIS2: diagnostico.labConfHIS2 || '',
          labConfHIS3: diagnostico.labConfHIS3 || '',
        };
      }),
      procedimientos: this.procedimientos(),
      ordenesApoyoDiagnostico: this.ordenesApoyo(),
      interconsultas: this.interconsultas(),
      ordenesProcedimientos: this.ordenesProcedimientos(),
      itemsReceta: this.itemsReceta(),
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
      return true;
    } catch {
      this.mensajeError.set(
        'Ocurrió un error al intentar registrar la ficha médica.',
      );
      this.modalGlobal.error(
        'Ocurrió un error al registrar la ficha médica. Verifique la información ingresada.',
        'Error al Registrar',
      );
      return false;
    }
  }

  async construirPaqueteDocumentosParaFirma(): Promise<DatosAtencionFirmaLote | null> {
    const fichaActual = this.ficha();
    if (!fichaActual) return null;

    const datosRecetaMedica = await this.construirDatosPdfReceta();
    if (!datosRecetaMedica) return null;

    const diagnosticos = fichaActual.diagnosticos || [];
    const diagnosticoSeleccionado =
      diagnosticos.find(
        (diagnosticoItem) =>
          diagnosticoItem.idDiagnostico === this.diagnosticoDescansoId(),
      ) || diagnosticos[0];

    const primerDiagnostico = diagnosticos[0];
    const justificacionDefectoLab = primerDiagnostico
      ? `(${primerDiagnostico.codigoCIE10})${primerDiagnostico.descripcion}`
      : 'EVALUACIÓN CLÍNICA';
    const justificacionDefectoImg = primerDiagnostico
      ? `HACER EL SEGUIMIENTO AL TRATAMIENTO DE:(${primerDiagnostico.codigoCIE10})${primerDiagnostico.descripcion}`
      : 'EVALUACIÓN CLÍNICA';

    const listaLaboratorio = this.ordenesApoyo().filter((item) => {
      const servicio = (item.servicio || '').toUpperCase();
      const nombre = (item.nombreProcedimiento || '').toUpperCase();
      const esImagenologia =
        servicio.includes('IMAGEN') ||
        servicio.includes('ECOGRAF') ||
        servicio.includes('RAYOS') ||
        servicio.includes('TOMOGRAF') ||
        servicio.includes('RESONAN') ||
        servicio.includes('RX') ||
        nombre.includes('ECOGRAF') ||
        nombre.includes('RAYOS X') ||
        nombre.includes('TOMOGRAF');
      return !esImagenologia;
    });

    const ordenesLaboratorioPdf = listaLaboratorio.map((item) => ({
      codigoCPT: item.codigo || '--',
      descripcionCPT: item.nombreProcedimiento || '',
      cantidad: item.cantidad || 1,
      justificacion: item.justificacion || justificacionDefectoLab,
    }));

    const listaImagenologia = this.ordenesApoyo().filter((item) => {
      const servicio = (item.servicio || '').toUpperCase();
      const nombre = (item.nombreProcedimiento || '').toUpperCase();
      return (
        servicio.includes('IMAGEN') ||
        servicio.includes('ECOGRAF') ||
        servicio.includes('RAYOS') ||
        servicio.includes('TOMOGRAF') ||
        servicio.includes('RESONAN') ||
        servicio.includes('RX') ||
        nombre.includes('ECOGRAF') ||
        nombre.includes('RAYOS X') ||
        nombre.includes('TOMOGRAF')
      );
    });

    const ordenesImagenologiaPdf = listaImagenologia.map((item) => ({
      codigoCPT: item.codigo || '--',
      descripcionCPT: item.nombreProcedimiento || '',
      cantidad: item.cantidad || 1,
      justificacion: item.justificacion || justificacionDefectoImg,
    }));

    const perfilUsuario = this.authService.userProfile();
    const nombreMedicoGlobal =
      datosRecetaMedica?.medicoNombre ||
      perfilUsuario?.nombreCompleto ||
      'MÉDICO TRATANTE';
    const colegiaturaGlobal =
      datosRecetaMedica?.medicoColegiatura || perfilUsuario?.colegiatura || '';
    const registroEspecialidadGlobal =
      datosRecetaMedica?.medicoRegistroEspecialidad || perfilUsuario?.rne || '';
    const dniMedicoGlobal =
      datosRecetaMedica?.medicoDni || perfilUsuario?.dni || '';

    const datosAtencionMedica: DatosPdfResumenConsulta = {
      ficha: fichaActual,
      triaje: this.triaje(),
      itemsReceta: this.itemsReceta(),
      fechaConsultaFormateada: this.fechaConsultaFormateada(),
      medicoNombre: nombreMedicoGlobal,
      medicoColegiatura: colegiaturaGlobal,
      medicoRNE: registroEspecialidadGlobal,
      medicoDni: dniMedicoGlobal,
      usuarioImpresion: nombreMedicoGlobal,
      fechaImpresion: this.fechaConsultaFormateada(),
      numeroRecetaFarmacia: datosRecetaMedica?.numeroReceta || '2481981',
      numeroRecetaOrdenes: String(
        fichaActual.idCuentaAtencion || fichaActual.idAtencion || '2481984',
      ),
      ordenesLaboratorio: ordenesLaboratorioPdf.map((orden) => ({
        codigoCPT: orden.codigoCPT,
        descripcionCPT: orden.descripcionCPT,
      })),
      ordenesImagenes: ordenesImagenologiaPdf.map((orden) => ({
        codigoCPT: orden.codigoCPT,
        descripcionCPT: orden.descripcionCPT,
      })),
    };

    const datosOrdenLaboratorio: DatosPdfOrdenLaboratorio = {
      numeroOrden: String(fichaActual.idAtencion || this.idAtencion()),
      idCuentaAtencion: String(
        fichaActual.idCuentaAtencion ||
          fichaActual.idAtencion ||
          this.idAtencion(),
      ),
      nroHistoriaClinica: fichaActual.nroHistoriaClinica || '',
      fechaCita: this.fechaConsultaFormateada(),
      especialidadNombre: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
      tipoFinanciador: fichaActual.iafa || 'SIS',
      servicioProcedencia: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
      pacienteNombre: fichaActual.pacienteNombre || '',
      medicoNombre: nombreMedicoGlobal,
      medicoColegiatura: colegiaturaGlobal,
      medicoRegistroEspecialidad: registroEspecialidadGlobal,
      medicoDni: dniMedicoGlobal,
      edad: fichaActual.edad || 0,
      fechaAtencion: this.fechaConsultaFormateada(),
      sexo: fichaActual.sexo || '',
      ordenesLaboratorio: ordenesLaboratorioPdf,
      diagnosticos: diagnosticos.map((diag) => ({
        codigoCIE10: diag.codigoCIE10,
        descripcion: diag.descripcion,
      })),
      resumenHistoriaClinica:
        fichaActual.motivo ||
        fichaActual.inforCompDiagMed ||
        'EVALUACIÓN MÉDICA INTEGRAL',
      usuarioImpresion: nombreMedicoGlobal,
      fechaImpresion: this.fechaConsultaFormateada(),
    };

    const datosOrdenImagenologia: DatosPdfOrdenImagenologia = {
      numeroOrden: String(fichaActual.idAtencion || this.idAtencion()),
      numeroCaso: String(
        fichaActual.idCuentaAtencion ||
          fichaActual.idAtencion ||
          this.idAtencion(),
      ),
      subtipoEstudio: 'ECOGRAFÍA GENERAL',
      idCuentaAtencion: String(
        fichaActual.idCuentaAtencion ||
          fichaActual.idAtencion ||
          this.idAtencion(),
      ),
      nroHistoriaClinica: fichaActual.nroHistoriaClinica || '',
      fechaCita: this.fechaConsultaFormateada(),
      especialidadNombre: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
      tipoFinanciador: fichaActual.iafa || 'SIS',
      servicioProcedencia: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
      pacienteNombre: fichaActual.pacienteNombre || '',
      medicoNombre: nombreMedicoGlobal,
      medicoColegiatura: colegiaturaGlobal,
      medicoRegistroEspecialidad: registroEspecialidadGlobal,
      medicoDni: dniMedicoGlobal,
      edad: fichaActual.edad || 0,
      fechaAtencion: this.fechaConsultaFormateada(),
      sexo: fichaActual.sexo || '',
      ordenesImagenologia: ordenesImagenologiaPdf,
      sala: '(--:--)',
      fechaProgramada: '(--/--/----)',
      indicaciones:
        '*VENIR EN AYUNAS DE 8 HORAS\n*TRAER 01 PAPEL HIGIENICO\n*ACERCARSE 1 HORA ANTES DE LA CITA (RECORDAR QUE LA HORA PUEDE VARIAR SEGÚN EL TIPO DE EXAMEN)"',
      resumenHistoriaClinica:
        fichaActual.motivo ||
        fichaActual.inforCompDiagMed ||
        'EVALUACIÓN MÉDICA INTEGRAL',
      usuarioImpresion: nombreMedicoGlobal,
      fechaImpresion: this.fechaConsultaFormateada(),
    };

    const primeraInterconsulta = this.interconsultas()[0];
    const descripcionDiagnostico =
      diagnosticoSeleccionado?.descripcion || 'EVALUACIÓN MÉDICA INTEGRAL';
    const codigoDiagnostico = diagnosticoSeleccionado?.codigoCIE10 || 'Z00.0';

    const datosHojaInterconsulta: DatosPdfHojaInterconsulta = {
      nroHistoriaClinica: fichaActual.nroHistoriaClinica || '',
      idCuentaAtencion: String(
        fichaActual.idCuentaAtencion ||
          fichaActual.idAtencion ||
          this.idAtencion(),
      ),
      servicioOrigen: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
      servicioDestino:
        primeraInterconsulta?.nombreEspecialidad ||
        (this.interconsultas().length > 0
          ? this.interconsultas()
              .map((item) => item.nombreEspecialidad)
              .join(', ')
          : 'ESPECIALIDAD MÉDICA SOLICITADA'),
      pacienteNombre: fichaActual.pacienteNombre || '',
      nroDocumento: fichaActual.nroDocumento || '',
      codigoPaciente: String(fichaActual.nroHistoriaClinica || ''),
      edad: fichaActual.edad || 0,
      fechaSolicitud: this.fechaConsultaFormateada(),
      fechaPropuesta:
        primeraInterconsulta?.fechaPropuesta || this.fechaConsultaFormateada(),
      resumenEnfermedadActual:
        primeraInterconsulta?.resumenEnfermedad ||
        fichaActual.motivo ||
        fichaActual.inforCompDiagMed ||
        'PACIENTE AMBULATORIO EN ATENCIÓN INTEGRAL PARA VALORACIÓN ESPECIALIZADA.',
      motivoInterconsulta:
        primeraInterconsulta?.motivo ||
        fichaActual.planTratamiento ||
        'MANEJO CONJUNTO DEL PACIENTE',
      diagnosticoAtencion: `${codigoDiagnostico} = ${descripcionDiagnostico}`,
      usuarioImpresion: nombreMedicoGlobal,
      fechaImpresion: this.fechaConsultaFormateada(),
      medicoSolicitante: nombreMedicoGlobal,
      medicoColegiatura: colegiaturaGlobal,
      medicoRegistroEspecialidad: registroEspecialidadGlobal,
      medicoDni: dniMedicoGlobal,
    };

    const otorgaDescanso = this.otorgarDescansoMedico();
    const diasDescanso = otorgaDescanso ? Math.max(1, this.diasDescanso()) : 0;

    const datosDescansoMedico: DatosPdfDescansoMedico = {
      pacienteNombre: fichaActual.pacienteNombre || '',
      nroHistoriaClinica: fichaActual.nroHistoriaClinica || '',
      nroDocumento: fichaActual.nroDocumento || '',
      edad: fichaActual.edad || 0,
      sexo: fichaActual.sexo || '',
      fechaAtencion: this.fechaConsultaFormateada(),
      servicioNombre: fichaActual.especialidadNombre || 'CONSULTA EXTERNA',
      medicoNombre: nombreMedicoGlobal,
      medicoColegiatura: colegiaturaGlobal,
      medicoRegistroEspecialidad: registroEspecialidadGlobal,
      medicoDni: dniMedicoGlobal,
      diagnosticoPrincipal:
        diagnosticoSeleccionado?.descripcion || 'ATENCIÓN MÉDICA INTEGRAL',
      codigoCIE10: diagnosticoSeleccionado?.codigoCIE10 || 'Z00.0',
      diasDescanso: diasDescanso,
      fechaInicio: this.fechaInicioDescanso() || this.fechaConsultaFormateada(),
      fechaFin: this.fechaFinDescanso() || this.fechaConsultaFormateada(),
      tipoReposo: this.tipoReposo(),
      observaciones: this.observacionesDescanso() || '',
    };

    return {
      idAtencion: Number(fichaActual.idAtencion) || this.idAtencion(),
      nroHistoriaClinica: fichaActual.nroHistoriaClinica || '',
      datosAtencionMedica,
      datosRecetaMedica,
      datosOrdenLaboratorio,
      datosOrdenImagenologia,
      datosHojaInterconsulta,
      datosDescansoMedico,
    };
  }

  async generarDocumentosLocalesParaModal(): Promise<void> {
    const paquete = await this.construirPaqueteDocumentosParaFirma();
    if (!paquete) return;
    try {
      const docAtencionMedica = await generarDocumentoPdfResumenConsulta(
        paquete.datosAtencionMedica,
      );
      const docRecetaMedica = await generarDocumentoPdfRecetaMedica(
        paquete.datosRecetaMedica,
      );
      const docLaboratorio = await generarDocumentoPdfOrdenLaboratorio(
        paquete.datosOrdenLaboratorio,
      );
      const docImagenologia = await generarDocumentoPdfOrdenImagenologia(
        paquete.datosOrdenImagenologia,
      );
      const docInterconsulta = await generarDocumentoPdfHojaInterconsulta(
        paquete.datosHojaInterconsulta,
      );

      const blobAtencion = docAtencionMedica.output('blob');
      const blobReceta = docRecetaMedica.output('blob');
      const blobLaboratorio = docLaboratorio.output('blob');
      const blobImagenologia = docImagenologia.output('blob');
      const blobInterconsulta = docInterconsulta.output('blob');

      const historiaClinica = String(paquete.nroHistoriaClinica || 'HC').trim();
      const idAtencion = paquete.idAtencion;

      const items: DocumentoAtencionFirmadoItem[] = [
        {
          id: 'atencion-medica',
          titulo: 'Atención Médica del Paciente',
          descripcion:
            'Historia clínica ambulatoria completa (filiación, triaje, anamnesis, antecedentes, examen físico, diagnósticos CIE-10 y plan de tratamiento)',
          nombreArchivo: `ATENCION_MEDICA_${historiaClinica}_${idAtencion}.pdf`,
          blob: blobAtencion,
          url: window.URL.createObjectURL(blobAtencion),
          tamanoBytes: blobAtencion.size,
        },
        {
          id: 'receta-medica',
          titulo: 'Receta Médica Oficial (Farmacia y Paciente)',
          descripcion:
            'Formato oficial de prescripción y dispensación de medicamentos con doble talón (Farmacia y Paciente) y firma digital',
          nombreArchivo: `RECETA_MEDICA_${historiaClinica}_${idAtencion}.pdf`,
          blob: blobReceta,
          url: window.URL.createObjectURL(blobReceta),
          tamanoBytes: blobReceta.size,
        },
        {
          id: 'orden-laboratorio',
          titulo: 'Orden Médica - Patología Clínica / Laboratorio',
          descripcion:
            'Orden médica oficial con código de barras para análisis clínicos de laboratorio, justificación y resumen de historia clínica',
          nombreArchivo: `ORDEN_LABORATORIO_${historiaClinica}_${idAtencion}.pdf`,
          blob: blobLaboratorio,
          url: window.URL.createObjectURL(blobLaboratorio),
          tamanoBytes: blobLaboratorio.size,
        },
        {
          id: 'orden-imagenologia',
          titulo: 'Orden Médica - Imagenología (Ecografía / Rayos X)',
          descripcion:
            'Orden médica oficial con código de barras para estudios por imágenes, programación de sala, indicaciones y resumen clínico',
          nombreArchivo: `ORDEN_IMAGENOLOGIA_${historiaClinica}_${idAtencion}.pdf`,
          blob: blobImagenologia,
          url: window.URL.createObjectURL(blobImagenologia),
          tamanoBytes: blobImagenologia.size,
        },
        {
          id: 'hoja-interconsulta',
          titulo: 'Hoja de Interconsulta (Nueva Cita)',
          descripcion:
            'Solicitud médica oficial de interconsulta y referencia entre especialidades con motivo, resumen clínico y fecha propuesta',
          nombreArchivo: `HOJA_INTERCONSULTA_${historiaClinica}_${idAtencion}.pdf`,
          blob: blobInterconsulta,
          url: window.URL.createObjectURL(blobInterconsulta),
          tamanoBytes: blobInterconsulta.size,
        },
      ];

      if (
        paquete.datosDescansoMedico &&
        paquete.datosDescansoMedico.diasDescanso > 0
      ) {
        const docDescanso = await generarDocumentoPdfDescansoMedico(
          paquete.datosDescansoMedico,
        );
        const blobDescanso = docDescanso.output('blob');
        items.push({
          id: 'descanso-medico',
          titulo: 'Certificado de Descanso Médico',
          descripcion: `Incapacidad médica temporal por ${paquete.datosDescansoMedico.diasDescanso} días de reposo laboral domiciliario`,
          nombreArchivo: `CERTIFICADO_DESCANSO_${historiaClinica}_${idAtencion}.pdf`,
          blob: blobDescanso,
          url: window.URL.createObjectURL(blobDescanso),
          tamanoBytes: blobDescanso.size,
        });
      }

      this.documentosFirmadosLista.set(items);
    } catch {
      this.modalGlobal.error(
        'Ocurrió un error al preparar los documentos médicos para su visualización.',
        'Error de Documentos',
      );
    }
  }

  async abrirModalDocumentosFirmados(): Promise<void> {
    if (this.documentosFirmadosLista().length === 0) {
      await this.generarDocumentosLocalesParaModal();
    }
    this.modalDocumentosFirmadosVisible.set(true);
  }

  cerrarModalDocumentosFirmados(): void {
    this.modalDocumentosFirmadosVisible.set(false);
  }

  volverAColaDesdeModal(): void {
    this.cerrarModalDocumentosFirmados();
    this.navegarACola();
  }

  async guardarEdicionAtencion(): Promise<void> {
    const fichaActual = this.ficha();
    if (!fichaActual) return;

    if (this.guardando() || this.firmandoDigitalmente()) return;

    this.erroresValidacion.set([]);
    const errores = this.validarParaCerrar(fichaActual);
    if (errores.length > 0) {
      this.erroresValidacion.set(errores);
      this.modalGlobal.info(
        `Existen campos obligatorios pendientes de completar:\n\n• ${errores.join('\n• ')}`,
        'Información Incompleta',
      );
      return;
    }

    const confirmado = await this.modalGlobal.confirmar(
      '¿Desea guardar y actualizar las modificaciones realizadas a esta atención médica?',
      'Guardar Edición de Atención',
      'Sí, Guardar Edición',
    );
    if (!confirmado) {
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set('');

    const guardadoExitoso = await this.guardarDatosAtencionInterno();
    this.guardando.set(false);

    if (guardadoExitoso) {
      await this.generarDocumentosLocalesParaModal();
      this.modalGlobal.exito(
        'Los cambios de la atención médica fueron guardados y actualizados correctamente en el sistema.',
        'Edición Guardada',
      );
      this.modalDocumentosFirmadosVisible.set(true);
    }
  }

  async finalizarYFirmarConDniElectronico(): Promise<void> {
    const fichaActual = this.ficha();
    if (!fichaActual) return;

    if (this.guardando() || this.firmandoDigitalmente()) return;

    this.erroresValidacion.set([]);
    const errores = this.validarParaCerrar(fichaActual);
    if (errores.length > 0) {
      this.erroresValidacion.set(errores);
      return;
    }

    const confirmado = await this.modalGlobal.confirmar(
      'Para finalizar la atención médica se registrarán los datos clínicos y se iniciará la firma digital oficial con su DNI electrónico en Firma Perú.\n\n' +
        'Asegúrese de tener conectado su lector de tarjetas inteligentes con su DNI electrónico insertado.\n\n' +
        '¿Desea proceder a firmar los documentos médicos?',
      'Firma Digital Oficial con DNIe',
      'Sí, Firmar con DNIe',
    );
    if (!confirmado) {
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set('');

    const guardadoExitoso = await this.guardarDatosAtencionInterno();
    if (!guardadoExitoso) {
      this.guardando.set(false);
      return;
    }

    const paqueteParaFirma = await this.construirPaqueteDocumentosParaFirma();
    if (!paqueteParaFirma) {
      this.guardando.set(false);
      return;
    }

    this.firmandoDigitalmente.set(true);
    try {
      const resultadoFirma =
        await this.firmaService.firmarAtencionLoteCompleto(paqueteParaFirma);
      if (
        resultadoFirma.exito &&
        resultadoFirma.documentosFirmados.length > 0
      ) {
        this.documentosFirmadosLista.set(resultadoFirma.documentosFirmados);
        this.atencionFirmadaDigitalmente.set(true);
        const fichaActualizada = this.ficha();
        if (fichaActualizada) {
          this.ficha.set({
            ...fichaActualizada,
            estado: 2,
          });
        }
        this.modalDocumentosFirmadosVisible.set(true);
        this.modalGlobal.exito(
          'Los documentos médicos oficiales han sido firmados digitalmente con éxito con su DNI electrónico mediante la plataforma Firma Perú.',
          'Firma Digital Exitosa (DNIe)',
        );
      } else {
        this.atencionFirmadaDigitalmente.set(false);
        await this.generarDocumentosLocalesParaModal();
        const fichaActualizada = this.ficha();
        if (fichaActualizada) {
          this.ficha.set({
            ...fichaActualizada,
            estado: 2,
          });
        }
        this.modalDocumentosFirmadosVisible.set(true);
        this.modalGlobal.info(
          (resultadoFirma.mensajeError
            ? `${resultadoFirma.mensajeError}\n\n`
            : '') +
            'Asegúrese de ingresar su clave PIN de 4 dígitos en la ventana nativa de Firma Perú. Puede reintentar la firma presionando el botón "Firmar con DNIe (Firma Perú)".',
          'Firma Digital no Completada',
        );
      }
    } catch (errorCapturado) {
      this.atencionFirmadaDigitalmente.set(false);
      await this.generarDocumentosLocalesParaModal();
      this.modalDocumentosFirmadosVisible.set(true);
      const mensajeTexto =
        errorCapturado instanceof Error
          ? errorCapturado.message
          : 'No se pudo establecer comunicación con el aplicativo oficial Firma Perú (puerto 48596).';
      this.modalGlobal.error(
        `${mensajeTexto}\n\nVerifique que el aplicativo Firma Perú esté ejecutándose en su computadora con su lector y DNI electrónico conectado.`,
        'Error en Proceso de Firma Digital',
      );
    } finally {
      this.guardando.set(false);
      this.firmandoDigitalmente.set(false);
    }
  }

  async reintentarFirmaDigital(): Promise<void> {
    if (this.firmandoDigitalmente() || this.guardando()) {
      return;
    }

    const paqueteParaFirma = await this.construirPaqueteDocumentosParaFirma();
    if (!paqueteParaFirma) {
      this.modalGlobal.error(
        'No se pudieron preparar los documentos de la atención para la firma digital.',
        'Error de Documentos',
      );
      return;
    }

    this.firmandoDigitalmente.set(true);
    try {
      const resultadoFirma =
        await this.firmaService.firmarAtencionLoteCompleto(paqueteParaFirma);
      if (
        resultadoFirma.exito &&
        resultadoFirma.documentosFirmados.length > 0
      ) {
        this.documentosFirmadosLista.set(resultadoFirma.documentosFirmados);
        this.atencionFirmadaDigitalmente.set(true);
        this.modalDocumentosFirmadosVisible.set(true);
        this.modalGlobal.exito(
          'Los documentos médicos oficiales han sido firmados digitalmente con éxito con su DNI electrónico mediante Firma Perú.',
          'Firma Digital Exitosa (DNIe)',
        );
      } else {
        this.modalGlobal.info(
          resultadoFirma.mensajeError ||
            'No se completó la firma con DNI electrónico en Firma Perú. Asegúrese de ingresar su clave PIN de 4 dígitos en la ventana nativa de Firma Perú.',
          'Firma Digital Pendiente',
        );
      }
    } catch (errorCapturado) {
      const mensajeTexto =
        errorCapturado instanceof Error
          ? errorCapturado.message
          : 'No se pudo conectar con el componente local de Firma Perú en el puerto 48596.';
      this.modalGlobal.error(
        `${mensajeTexto}\n\nAsegúrese de que el software Firma Perú esté abierto en Windows y su DNI electrónico insertado en el lector.`,
        'Error de Comunicación con Firma Perú',
      );
    } finally {
      this.firmandoDigitalmente.set(false);
    }
  }

  irASiguientePestana(): void {
    const actual = this.pestanaActiva();
    if (actual === '3.1') this.cambiarPestana('3.2');
    else if (actual === '3.2') this.cambiarPestana('3.3');
    else if (actual === '3.3') this.cambiarPestana('3.4');
    else if (actual === '3.4') this.cambiarPestana('3.5');
    else if (actual === '3.5') this.cambiarPestana('3.6');
  }

  async construirDatosPdfReceta(): Promise<DatosPdfRecetaMedica | null> {
    const fichaActual = this.ficha();
    if (!fichaActual) {
      return null;
    }

    let datosImpresion = null;
    if (fichaActual.idCuentaAtencion) {
      datosImpresion = await this.apiService
        .obtenerFormatoImpresionReceta(
          0,
          fichaActual.idCuentaAtencion,
          fichaActual.idAtencion,
        )
        .catch(() => null);
    }

    const triajeActual = this.triaje();
    const pesoValor = triajeActual?.peso
      ? String(triajeActual.peso)
      : datosImpresion?.peso || '';
    const tallaValor = triajeActual?.talla
      ? String(triajeActual.talla)
      : datosImpresion?.talla || '';

    return {
      pacienteNombre:
        datosImpresion?.pacienteNombre || fichaActual.pacienteNombre || '',
      nroHistoriaClinica:
        datosImpresion?.nroHistoriaClinica ||
        fichaActual.nroHistoriaClinica ||
        '',
      nroDocumento:
        datosImpresion?.documentoIdentidad || fichaActual.nroDocumento || '',
      edad: datosImpresion?.edad || fichaActual.edad || 0,
      sexo: fichaActual.sexo || '',
      tipoFinanciador:
        datosImpresion?.tipoFinanciamiento || fichaActual.iafa || 'SIS',
      fechaAtencion:
        datosImpresion?.fechaAtencion || this.fechaConsultaFormateada(),
      servicioNombre:
        datosImpresion?.especialidadMedico ||
        fichaActual.especialidadNombre ||
        'CONSULTA EXTERNA',
      medicoNombre:
        datosImpresion?.medicoNombre ||
        this.authService.userProfile()?.nombreCompleto ||
        'MÉDICO TRATANTE',
      numeroReceta: datosImpresion?.numeroReceta || '2490118',
      direccion: datosImpresion?.direccion || '',
      numeroFua: datosImpresion?.numeroFua || '',
      tipoAtencion: datosImpresion?.tipoAtencion || 'CONSULTORIOS EXTERNOS',
      telefono: datosImpresion?.telefono || '',
      consultorio:
        datosImpresion?.consultorio || fichaActual.especialidadNombre || '',
      cuentaAtencion:
        datosImpresion?.cuentaAtencion || fichaActual.idCuentaAtencion || '',
      peso: pesoValor,
      talla: tallaValor,
      medicoColegiatura:
        datosImpresion?.medicoColegiatura ||
        this.authService.userProfile()?.colegiatura ||
        '',
      medicoRegistroEspecialidad:
        datosImpresion?.medicoRNE || this.authService.userProfile()?.rne || '',
      medicoDni: this.authService.userProfile()?.dni || '',
      usuario:
        datosImpresion?.usuario ||
        this.authService.userProfile()?.username ||
        'MÉDICO',
      diagnosticos: (fichaActual.diagnosticos || []).map((diagnostico) => ({
        codigoCIE10: diagnostico.codigoCIE10 || '',
        descripcion: diagnostico.descripcion || '',
        clasificacion: diagnostico.clasificacion || 'D',
      })),
      itemsReceta:
        this.itemsReceta().length > 0
          ? this.itemsReceta()
          : datosImpresion?.medicamentos?.map((medicamento) => ({
              idProducto: 0,
              codigo: medicamento.codigo,
              nombre: medicamento.nombre,
              formaFarmaceutica: medicamento.formaFarmaceutica,
              concentracion: '',
              cantidad: medicamento.cantidad,
              dosis: medicamento.dosis,
              via: 'ORAL',
              frecuencia: '',
              duracion: '',
              indicaciones: '',
            })) || [],
      indicacionesGenerales:
        fichaActual.planTratamiento || fichaActual.tratamiento || '',
      fechaProximaCita:
        this.fechaPropuestaCita() || fichaActual.fechaProxCita || '',
    };
  }

  async imprimirReceta(): Promise<void> {
    const datosReceta = await this.construirDatosPdfReceta();
    if (!datosReceta) {
      return;
    }
    try {
      await imprimirPdfRecetaMedica(datosReceta);
    } catch {
      this.modalGlobal.error(
        'No se pudo generar la receta médica en formato PDF.',
        'Error de Impresión',
      );
    }
  }

  async firmarRecetaDigitalmente(): Promise<void> {
    const datosReceta = await this.construirDatosPdfReceta();
    if (!datosReceta) {
      return;
    }
    if (!datosReceta.itemsReceta || datosReceta.itemsReceta.length === 0) {
      this.modalGlobal.info(
        'No se registran medicamentos en la receta médica para firmar.',
        'Receta Vacía',
      );
      return;
    }

    this.firmandoDigitalmente.set(true);
    try {
      const resultado =
        await this.firmaService.firmarRecetaDigitalmente(datosReceta);
      if (resultado.exito) {
        this.modalGlobal.exito(
          'La receta médica ha sido firmada digitalmente con éxito con su DNI electrónico.',
          'Firma Digital Exitosa',
        );
      } else {
        this.modalGlobal.info(
          resultado.mensajeError ||
            'No se completó la firma digital con Firma Perú.',
          'Firma no Completada',
        );
      }
    } catch {
      this.modalGlobal.error(
        'Ocurrió un error al comunicarse con el componente Firma Perú.',
        'Error en Firma Perú',
      );
    } finally {
      this.firmandoDigitalmente.set(false);
    }
  }

  async imprimirOrdenLaboratorio(): Promise<void> {
    const paquete = await this.construirPaqueteDocumentosParaFirma();
    if (!paquete) return;
    try {
      await imprimirPdfOrdenLaboratorio(paquete.datosOrdenLaboratorio);
    } catch {
      this.modalGlobal.error(
        'No se pudo generar la orden médica de laboratorio en formato PDF.',
        'Error de Impresión',
      );
    }
  }

  async imprimirOrdenImagenologia(): Promise<void> {
    const paquete = await this.construirPaqueteDocumentosParaFirma();
    if (!paquete) return;
    try {
      await imprimirPdfOrdenImagenologia(paquete.datosOrdenImagenologia);
    } catch {
      this.modalGlobal.error(
        'No se pudo generar la orden médica de imagenología en formato PDF.',
        'Error de Impresión',
      );
    }
  }

  async imprimirHojaInterconsulta(): Promise<void> {
    const paquete = await this.construirPaqueteDocumentosParaFirma();
    if (!paquete) return;
    try {
      await imprimirPdfHojaInterconsulta(paquete.datosHojaInterconsulta);
    } catch {
      this.modalGlobal.error(
        'No se pudo generar la hoja de interconsulta en formato PDF.',
        'Error de Impresión',
      );
    }
  }

  async imprimirOrdenesApoyo(): Promise<void> {
    await this.imprimirOrdenLaboratorio();
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
        medicoNombre:
          this.authService.userProfile()?.nombreCompleto || 'MÉDICO TRATANTE',
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
      diagnosticos.find(
        (d) => d.idDiagnostico === this.diagnosticoDescansoId(),
      ) || diagnosticos[0];
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
        medicoNombre:
          this.authService.userProfile()?.nombreCompleto || 'MÉDICO TRATANTE',
        diagnosticoPrincipal: diagnosticoSeleccionado.descripcion || '',
        codigoCIE10: diagnosticoSeleccionado.codigoCIE10 || '',
        diasDescanso: Math.max(1, this.diasDescanso()),
        fechaInicio:
          this.fechaInicioDescanso() || this.fechaConsultaFormateada(),
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

  async guardar(): Promise<void> {
    await this.finalizarYFirmarConDniElectronico();
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
