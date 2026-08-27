import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import {
  type FormArray,
  FormBuilder,
  type FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ApiClientService } from '../../../../compartido/api-client/api-client.service';
import { ModalGlobalService } from '../../../../compartido/ui/modal-global/modal-global.service';
import { SelectGlobalComponent } from '../../../../compartido/ui/select-global/select-global';
import {
  type FirmaPeruConexion,
  iniciarFirmaDocumento,
} from '../../../../compartido/utilidades/firma-peru.util';
import { AuthService } from '../../../auth/aplicacion/auth.service';
import { EvolucionService } from '../../servicios/evolucion.service';
import {
  type SintomaCatalogo,
  type SintomaSeleccionado,
  SintomaService,
} from '../../servicios/sintoma.service';
import { AdjuntosComponent } from './adjuntos/adjuntos';
import { AntecedentesComponent } from './antecedentes/antecedentes';
import { DiagnosticosComponent } from './diagnosticos/diagnosticos';
import {
  construirPdfEvolucion,
  type DatosInstitucion,
  type EvolucionPdfData,
} from './evolucion-pdf.util';
import { ExamenFisicoComponent } from './examen-fisico/examen-fisico';
import { MotivoComponent } from './motivo/motivo';
import { OrdenesMedicasComponent } from './ordenes-medicas/ordenes-medicas';
import { PlanTratamientoComponent } from './plan-tratamiento/plan-tratamiento';
import { ResultadosComponent } from './resultados/resultados';
import { SignosVitalesComponent } from './signos-vitales/signos-vitales';

interface GrupoSintomasVista {
  clave: string;
  etiqueta: string;
  sintomas: SintomaCatalogo[];
}

interface RegistroAuditoria {
  fecha: string;
  hora: string;
  usuario: string;
  ip: string;
}

@Component({
  selector: 'app-formulario-soap',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SelectGlobalComponent,
    SignosVitalesComponent,
    DiagnosticosComponent,
    ExamenFisicoComponent,
    ResultadosComponent,
    PlanTratamientoComponent,
    OrdenesMedicasComponent,
    AdjuntosComponent,
    MotivoComponent,
    AntecedentesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-soap.html',
})
export class FormularioSoapComponent implements OnInit {
  public readonly evolucionService = inject(EvolucionService);
  public readonly authService = inject(AuthService);
  public readonly apiClient = inject(ApiClientService);
  private readonly modalGlobal = inject(ModalGlobalService);
  private readonly sintomaService = inject(SintomaService);
  private readonly constructorFormulario = inject(FormBuilder);

  public readonly activePanel = signal<string>('p1');
  public readonly openGroup = signal<string>('encuentro');
  public readonly isSaving = signal<boolean>(false);
  public readonly isSigning = signal<boolean>(false);

  public fechaEvolucion = new Date().toISOString().slice(0, 10);
  public horaEvolucion = new Date().toTimeString().slice(0, 5);
  public tipoAtencion = 'Emergencia';
  public estadoAtencion = 'Pendiente';

  public readonly auditoria = signal<RegistroAuditoria | null>(null);

  public readonly sintomasCatalogo = signal<SintomaCatalogo[]>([]);
  public readonly sintomasSeleccionados = signal<Set<number>>(new Set());
  public readonly sintomasCargando = signal<boolean>(false);
  public readonly grupoSintomasAbierto = signal<string>('general');
  public nuevoSintomaTexto = '';
  public nuevoSintomaSistema = 'general';

  private static readonly ETIQUETAS_SISTEMA: Record<string, string> = {
    general: 'General',
    'respiratorio-cv': 'Respiratorio / Cardiovascular',
    gastrointestinal: 'Gastrointestinal',
    neurologico: 'Neurológico',
    otros: 'Otros',
  };

  private static readonly GRUPO_DE_PANEL: Record<string, string> = {
    p1: 'encuentro',
    p2: 'encuentro',
    p3: 'soap',
    p4: 'soap',
    p5: 'soap',
    p6: 'soap',
    p7: 'soap',
    p9: 'doc',
    p14: 'doc',
    p15: 'cierre',
  };

  private static readonly ORDEN_PANELES = [
    'p1',
    'p2',
    'p3',
    'p4',
    'p5',
    'p6',
    'p7',
    'p9',
    'p14',
    'p15',
  ];

  readonly sintomasPorSistema = computed<GrupoSintomasVista[]>(() => {
    const mapaPorSistema = new Map<string, SintomaCatalogo[]>();
    for (const sintoma of this.sintomasCatalogo()) {
      const listadoExistente = mapaPorSistema.get(sintoma.sistema) ?? [];
      listadoExistente.push(sintoma);
      mapaPorSistema.set(sintoma.sistema, listadoExistente);
    }
    const gruposGenerados: GrupoSintomasVista[] = [];
    for (const [clave, lista] of mapaPorSistema) {
      gruposGenerados.push({
        clave,
        etiqueta: FormularioSoapComponent.ETIQUETAS_SISTEMA[clave] ?? clave,
        sintomas: [...lista].sort(
          (sintomaA, sintomaB) => sintomaA.orden - sintomaB.orden,
        ),
      });
    }
    return gruposGenerados;
  });

  readonly totalSintomasSeleccionados = computed(
    () => this.sintomasSeleccionados().size,
  );

  public readonly soapForm = this.constructorFormulario.group({
    motivo: this.constructorFormulario.group({
      motivoConsulta: [true],
      seguimiento: [false],
      control: [false],
      reevaluacion: [false],
      postoperatorio: [false],
      interconsulta: [false],
      emergencia: [true],
      detalle: [
        'Paciente de 45 años ingresa por dolor abdominal agudo en fosa ilíaca derecha de 24 horas de evolución, tipo cólico intenso (8/10), náuseas y alza térmica.',
      ],
    }),
    subjetivo: this.constructorFormulario.group({
      dolor: [true],
      fiebre: [true],
      tos: [false],
      nauseas: [true],
      vomitos: [false],
      mareos: [false],
      disnea: [false],
      evolucionSintomas: [
        'Dolor inició en epigastrio y migró a fosa ilíaca derecha hace 12 horas. Se exacerba con la deambulación.',
      ],
      escalaDolor: [8],
    }),
    signosVitales: this.constructorFormulario.group({
      presionArterial: ['120/80'],
      frecuenciaCardiaca: [84],
      frecuenciaRespiratoria: [18],
      temperatura: [38.2],
      saturacionOxigeno: [98],
      peso: [72.5],
      talla: [1.7],
      imc: ['25.08'],
      glucemia: [95],
    }),
    examenFisico: this.constructorFormulario.array([
      this.constructorFormulario.group({
        sistema: ['Estado general'],
        normal: [false],
        hallazgo: [
          'Paciente en regular estado general, febril al tacto, fascie álgica.',
        ],
      }),
      this.constructorFormulario.group({
        sistema: ['Piel'],
        normal: [true],
        hallazgo: [''],
      }),
      this.constructorFormulario.group({
        sistema: ['Cabeza y cuello'],
        normal: [true],
        hallazgo: [''],
      }),
      this.constructorFormulario.group({
        sistema: ['Tórax y pulmones'],
        normal: [true],
        hallazgo: [''],
      }),
      this.constructorFormulario.group({
        sistema: ['Corazón'],
        normal: [true],
        hallazgo: [''],
      }),
      this.constructorFormulario.group({
        sistema: ['Abdomen'],
        normal: [false],
        hallazgo: [
          'Abdomen distendido, doloroso a la palpación profunda en fosa ilíaca derecha. McBurney (+) Blumberg (+).',
        ],
      }),
      this.constructorFormulario.group({
        sistema: ['Genitourinario'],
        normal: [true],
        hallazgo: [''],
      }),
      this.constructorFormulario.group({
        sistema: ['Extremidades y osteomuscular'],
        normal: [true],
        hallazgo: [''],
      }),
      this.constructorFormulario.group({
        sistema: ['Neurológico y estado mental'],
        normal: [true],
        hallazgo: [''],
      }),
    ]),
    resultados: this.constructorFormulario.group({
      laboratorio: this.constructorFormulario.array([]),
      imagenes: this.constructorFormulario.array([]),
      otros: this.constructorFormulario.array([]),
    }),
    evaluacion: this.constructorFormulario.group({
      estadoClinico: ['Mejoría'],
      pronostico: ['Bueno'],
    }),
    diagnosticos: this.constructorFormulario.array([
      this.constructorFormulario.group({
        cie10: ['K35.8'],
        descripcion: ['Apendicitis aguda, no especificada'],
        tipo: ['Presuntivo'],
        condicion: ['Principal'],
        estado: ['Activo'],
      }),
    ]),
    plan: this.constructorFormulario.group({
      farmacologico: this.constructorFormulario.array([]),
      procedimientosIndicados: this.constructorFormulario.group({
        curaciones: [false],
        suturas: [false],
        cateter: [true],
        intubacion: [false],
        otro: [''],
      }),
      solicitudExamenes: this.constructorFormulario.group({
        laboratorio: ['Hemograma completo, PCR, Examen completo de orina'],
        imagenes: ['Ecografía abdominal'],
        otros: [''],
      }),
      interconsultas: this.constructorFormulario.group({
        cardiologia: [false],
        cirugia: [true],
        nutricion: [false],
        psicologia: [false],
        otra: [''],
      }),
      indicacionesGenerales: this.constructorFormulario.group({
        dieta: ['NPO (Nada por vía oral)'],
        reposo: ['Reposo absoluto en cama a 30°'],
        hidratacion: ['NaCl 0.9% 1000 mL EV a 45 gtt/min'],
        oxigeno: ['CBN 2L/min si SatO2 < 95%'],
        restricciones: ['Sin deambulación'],
      }),
    }),
    evolucionLibre: [
      'Paciente varón de 45 años con cuadro compatible con Apendicitis Aguda. Se solicita evaluación prioritaria por Cirugía General y preparación para sala de operaciones.',
    ],
    ordenesMedicas: this.constructorFormulario.group({
      orden: [''],
      detalle: [''],
    }),
    prescripcion: this.constructorFormulario.array([]),
    procedimientosRealizados: this.constructorFormulario.array([]),
    incapacidad: this.constructorFormulario.group({
      dias: [null],
      fechaInicio: [''],
      fechaFin: [''],
      motivo: [''],
    }),
    certificados: this.constructorFormulario.group({
      certificadoMedico: [false],
      informeMedico: [false],
      epicrisis: [false],
      constancias: [false],
      observaciones: [''],
    }),
    adjuntos: this.constructorFormulario.array([]),
  });

  get signosVitalesForm(): FormGroup {
    return this.soapForm.get('signosVitales') as FormGroup;
  }

  get diagnosticosArray(): FormArray {
    return this.soapForm.get('diagnosticos') as FormArray;
  }

  get examenFisicoArray(): FormArray {
    return this.soapForm.get('examenFisico') as FormArray;
  }

  get resultadosForm(): FormGroup {
    return this.soapForm.get('resultados') as FormGroup;
  }

  get planForm(): FormGroup {
    return this.soapForm.get('plan') as FormGroup;
  }

  get adjuntosArray(): FormArray {
    return this.soapForm.get('adjuntos') as FormArray;
  }

  get esPrimerPanel(): boolean {
    return (
      FormularioSoapComponent.ORDEN_PANELES.indexOf(this.activePanel()) === 0
    );
  }

  get esUltimoPanel(): boolean {
    return (
      FormularioSoapComponent.ORDEN_PANELES.indexOf(this.activePanel()) ===
      FormularioSoapComponent.ORDEN_PANELES.length - 1
    );
  }

  ngOnInit(): void {
    const pacienteSeleccionado = this.evolucionService.activePatient();
    if (pacienteSeleccionado?.estado) {
      this.estadoAtencion = pacienteSeleccionado.estado;
    }
    void this.cargarSintomas();
  }

  async cargarSintomas(): Promise<void> {
    this.sintomasCargando.set(true);
    const catalogo = await this.sintomaService.listarCatalogo();
    this.sintomasCatalogo.set(catalogo);
    this.sintomasCargando.set(false);
  }

  contarSintomasSistema(claveSistema: string): number {
    const seleccionados = this.sintomasSeleccionados();
    return this.sintomasCatalogo().filter(
      (sintoma) =>
        sintoma.sistema === claveSistema &&
        seleccionados.has(sintoma.idSintoma),
    ).length;
  }

  toggleSintoma(idSintoma: number): void {
    const nuevoConjunto = new Set(this.sintomasSeleccionados());
    if (nuevoConjunto.has(idSintoma)) {
      nuevoConjunto.delete(idSintoma);
    } else {
      nuevoConjunto.add(idSintoma);
    }
    this.sintomasSeleccionados.set(nuevoConjunto);
  }

  toggleGrupoSintomas(claveSistema: string): void {
    this.grupoSintomasAbierto.set(
      this.grupoSintomasAbierto() === claveSistema ? '' : claveSistema,
    );
  }

  async agregarSintomaNuevo(): Promise<void> {
    const textoIngresado = this.nuevoSintomaTexto.trim();
    if (!textoIngresado) {
      return;
    }
    const sistemaSeleccionado = this.nuevoSintomaSistema;
    const guardadoExitoso = await this.sintomaService.agregarSintoma(
      sistemaSeleccionado,
      textoIngresado,
    );
    if (guardadoExitoso) {
      await this.cargarSintomas();
      const sintomaAgregado = this.sintomasCatalogo().find(
        (sintoma) =>
          sintoma.sistema === sistemaSeleccionado &&
          sintoma.sintoma === textoIngresado,
      );
      if (sintomaAgregado) {
        const nuevoConjunto = new Set(this.sintomasSeleccionados());
        nuevoConjunto.add(sintomaAgregado.idSintoma);
        this.sintomasSeleccionados.set(nuevoConjunto);
      }
      this.grupoSintomasAbierto.set(sistemaSeleccionado);
      this.nuevoSintomaTexto = '';
    }
  }

  activarPanel(identificadorPanel: string): void {
    this.activePanel.set(identificadorPanel);
    const grupo = FormularioSoapComponent.GRUPO_DE_PANEL[identificadorPanel];
    if (grupo) {
      this.openGroup.set(grupo);
    }
  }

  irAnterior(): void {
    const indiceActual = FormularioSoapComponent.ORDEN_PANELES.indexOf(
      this.activePanel(),
    );
    if (indiceActual > 0) {
      this.activarPanel(
        FormularioSoapComponent.ORDEN_PANELES[indiceActual - 1],
      );
    }
  }

  irSiguiente(): void {
    const indiceActual = FormularioSoapComponent.ORDEN_PANELES.indexOf(
      this.activePanel(),
    );
    if (indiceActual < FormularioSoapComponent.ORDEN_PANELES.length - 1) {
      this.activarPanel(
        FormularioSoapComponent.ORDEN_PANELES[indiceActual + 1],
      );
    }
  }

  toggleGroup(identificadorGrupo: string): void {
    this.openGroup.set(
      this.openGroup() === identificadorGrupo ? '' : identificadorGrupo,
    );
  }

  numeroEvolucion(): string {
    const paciente = this.evolucionService.activePatient();
    if (!paciente) {
      return '—';
    }
    return `EV-${paciente.idRegAtencion}`;
  }

  async firmar(): Promise<void> {
    const confirmado = await this.modalGlobal.confirmar(
      'Se generará el PDF de la evolución y se abrirá el Firmador de Firma Perú para firmar con su DNIe. ¿Desea continuar?',
      'Firmar evolución con DNIe',
      'Firmar',
    );
    if (!confirmado) {
      return;
    }

    this.isSigning.set(true);

    try {
      const paciente = this.evolucionService.activePatient();
      if (!paciente) {
        this.modalGlobal.error('No hay paciente seleccionado.', 'Error');
        return;
      }

      const catalogoSintomas = this.sintomasCatalogo();
      const seleccionSintomas = this.sintomasSeleccionados();
      const listaSintomasSeleccionados: SintomaSeleccionado[] = catalogoSintomas
        .filter((sintoma) => seleccionSintomas.has(sintoma.idSintoma))
        .map((sintoma) => ({
          idSintoma: sintoma.idSintoma,
          sistema: sintoma.sistema,
          sintoma: sintoma.sintoma,
        }));

      if (listaSintomasSeleccionados.length > 0) {
        await this.sintomaService.guardarSintomas(
          paciente.idRegAtencion,
          listaSintomasSeleccionados,
        );
      }

      const valoresFormulario = this.soapForm.value;
      const datosPdf: EvolucionPdfData = {
        paciente: {
          nombre: paciente.nombre,
          historia: paciente.historia,
          idRegAtencion: paciente.idRegAtencion,
          edad: paciente.edad,
          sexo: paciente.sexo,
          ubicacion: paciente.ubicacion,
          cama: paciente.cama,
          estado: paciente.estado,
        },
        cabecera: {
          fecha: this.fechaEvolucion,
          hora: this.horaEvolucion,
          medicoTratante: this.authService.username() ?? '',
          tipoAtencion: this.tipoAtencion,
        },
        motivo: valoresFormulario.motivo || {},
        subjetivo: valoresFormulario.subjetivo || {},
        signosVitales: valoresFormulario.signosVitales || {},
        examenFisico: Array.isArray(valoresFormulario.examenFisico)
          ? valoresFormulario.examenFisico
          : [],
        evaluacion: valoresFormulario.evaluacion || {},
        diagnosticos: Array.isArray(valoresFormulario.diagnosticos)
          ? valoresFormulario.diagnosticos
          : [],
        evolucionLibre: valoresFormulario.evolucionLibre || '',
        plan: (valoresFormulario.plan as EvolucionPdfData['plan']) || {},
        sintomas: listaSintomasSeleccionados.map((sintoma) => sintoma.sintoma),
      };

      const datosInstitucion: DatosInstitucion | null = null;
      const fechaImpresion = new Date().toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const documentoPdf = await construirPdfEvolucion(
        datosPdf,
        datosInstitucion,
        this.authService.username() ?? '',
        fechaImpresion,
      );

      if (!documentoPdf) {
        this.modalGlobal.error(
          'No se pudo generar el PDF de la evolución.',
          'Error',
        );
        return;
      }

      const conexionFirma: FirmaPeruConexion = {
        baseUrl: this.apiClient.getApiBaseUrl(),
        token: this.authService.getToken(),
      };

      const documentoBlob = documentoPdf.output('blob');
      const resultadoFirma = await iniciarFirmaDocumento(
        {
          blob: documentoBlob,
          nombre: `EVOLUCION_${paciente.idRegAtencion}.pdf`,
        },
        conexionFirma,
        {
          motivo: 'Firma de evolución médica',
          rol: this.authService.username() ?? '',
          positionX: 430,
          positionY: 10,
        },
      );

      if (!resultadoFirma?.firmado) {
        this.modalGlobal.error(
          'No se recibió el documento firmado. Verifique que completó la firma en Firma Perú.',
          'Firma no completada',
        );
        return;
      }

      const datosSignosVitales = valoresFormulario.signosVitales || {};
      const listaExamenFisico = Array.isArray(valoresFormulario.examenFisico)
        ? valoresFormulario.examenFisico
        : [];
      const indicacionesGenerales =
        valoresFormulario.plan?.indicacionesGenerales || {};

      let presionArterialSistolica: number | null = null;
      let presionArterialDiastolica: number | null = null;
      if (
        datosSignosVitales.presionArterial &&
        typeof datosSignosVitales.presionArterial === 'string'
      ) {
        const partesPresion = datosSignosVitales.presionArterial.split('/');
        if (partesPresion.length === 2) {
          const sistolica = Number(partesPresion[0].trim());
          const diastolica = Number(partesPresion[1].trim());
          if (!Number.isNaN(sistolica)) {
            presionArterialSistolica = sistolica;
          }
          if (!Number.isNaN(diastolica)) {
            presionArterialDiastolica = diastolica;
          }
        }
      }

      const obtenerHallazgoExamen = (indiceExamen: number): string | null => {
        const itemExamen = listaExamenFisico[indiceExamen];
        return itemExamen &&
          typeof itemExamen === 'object' &&
          'hallazgo' in itemExamen
          ? (itemExamen.hallazgo as string) || null
          : null;
      };

      const payloadRegistro = {
        idAtencion: paciente.idRegAtencion,
        idPaciente: paciente.idPaciente,
        idMedico: 0,
        motivoConsulta: valoresFormulario.motivo?.detalle || null,
        paSistolica: presionArterialSistolica,
        paDiastolica: presionArterialDiastolica,
        frecuenciaCardiaca: datosSignosVitales.frecuenciaCardiaca
          ? Number(datosSignosVitales.frecuenciaCardiaca)
          : null,
        frecuenciaRespiratoria: datosSignosVitales.frecuenciaRespiratoria
          ? Number(datosSignosVitales.frecuenciaRespiratoria)
          : null,
        temperatura: datosSignosVitales.temperatura
          ? Number(datosSignosVitales.temperatura)
          : null,
        saturacionOxigeno: datosSignosVitales.saturacionOxigeno
          ? Number(datosSignosVitales.saturacionOxigeno)
          : null,
        peso: datosSignosVitales.peso ? Number(datosSignosVitales.peso) : null,
        talla: datosSignosVitales.talla
          ? Number(datosSignosVitales.talla)
          : null,
        imc:
          datosSignosVitales.imc && datosSignosVitales.imc !== '—'
            ? Number(datosSignosVitales.imc)
            : null,
        glicemia: datosSignosVitales.glucemia
          ? Number(datosSignosVitales.glucemia)
          : null,
        examenFisicoGeneral: obtenerHallazgoExamen(0),
        examenFisicoPiel: obtenerHallazgoExamen(1),
        examenFisicoCabezaCuello: obtenerHallazgoExamen(2),
        examenFisicoToraxPulmon: obtenerHallazgoExamen(3),
        examenFisicoCorazon: obtenerHallazgoExamen(4),
        examenFisicoAbdomen: obtenerHallazgoExamen(5),
        examenFisicoGenitourinario: obtenerHallazgoExamen(6),
        examenFisicoExtremidadesOsteomuscular: obtenerHallazgoExamen(7),
        examenFisicoNeurologicoMental: obtenerHallazgoExamen(8),
        indicacionDieta: indicacionesGenerales.dieta || null,
        indicacionReposo: indicacionesGenerales.reposo || null,
        indicacionHidratacion: indicacionesGenerales.hidratacion || null,
        indicacionOxigeno: indicacionesGenerales.oxigeno || null,
        indicacionRestriccion: indicacionesGenerales.restricciones || null,
        sugerencia: valoresFormulario.evolucionLibre || null,
        usuarioCreacion: 0,
      };

      await this.evolucionService.guardarEvolucionMedica(payloadRegistro);

      const datosCompletosEvolucion = {
        timestamp: new Date().toISOString(),
        cabecera: {
          numeroEvolucion: this.numeroEvolucion(),
          fecha: this.fechaEvolucion,
          hora: this.horaEvolucion,
          medicoTratante: this.authService.username() ?? '',
          tipoAtencion: this.tipoAtencion,
          estado: this.estadoAtencion,
          firmaDni: resultadoFirma.uuid,
        },
        sintomas: listaSintomasSeleccionados.map((sintoma) => sintoma.sintoma),
        ...valoresFormulario,
      };

      const contenidoBase64 = btoa(
        encodeURIComponent(JSON.stringify(datosCompletosEvolucion)).replace(
          /%([0-9A-F]{2})/g,
          (_coincidencia, parHexadecimal) =>
            String.fromCodePoint(Number(`0x${parHexadecimal}`)),
        ),
      );

      const respuestaGuardado =
        await this.evolucionService.guardarEvolucion(contenidoBase64);

      if (respuestaGuardado) {
        this.auditoria.set({
          fecha: respuestaGuardado.fecha,
          hora: respuestaGuardado.hora,
          usuario: this.authService.username() ?? '',
          ip: respuestaGuardado.ipCliente,
        });
        this.modalGlobal.exito(
          'La evolución fue firmada con el DNIe y guardada correctamente.',
          'Evolución firmada',
        );
        this.evolucionService.clearSelection();
      } else {
        this.modalGlobal.error(
          'La firma fue exitosa pero no se pudo guardar la evolución. Verifique la conexión.',
          'Error al guardar',
        );
      }
    } catch (errorFirma) {
      console.error('Error en flujo de firma:', errorFirma);
      const mensaje =
        errorFirma instanceof Error
          ? errorFirma.message
          : 'Ocurrió un error durante el proceso de firma. Intente de nuevo.';
      this.modalGlobal.error(mensaje, 'Error');
    } finally {
      this.isSigning.set(false);
    }
  }
}
