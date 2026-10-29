import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  type OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginacionComponent } from '../../../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import { BienesInsumosApiService } from '../../../../../../catalogos/bienes-insumos/adaptadores/salida/http/bienes-insumos.api.service';
import type { IBienInsumoItem } from '../../../../../../catalogos/bienes-insumos/tipos/bienes-insumos.tipos';
import type {
  AtencionDiagnosticoCEItem,
  InterconsultaCEItem,
  ItemRecetaPrescripcion,
  OrdenApoyoDiagnosticoItem,
  OrdenProcedimientoCEItem,
} from '../../../../../tipos/atencion-ce.tipos';
import {
  AtencionCEApiService,
  type EspecialidadCatalogoItem,
  type ExamenApoyoBusquedaItem,
} from '../../../../salida/http/atencion-ce.api.service';

export interface PaqueteFarmaciaItem {
  readonly idProducto?: number;
  readonly codigo?: string;
  readonly nombre: string;
  readonly concentracion: string;
  readonly formaFarmaceutica: string;
  readonly dosis: string;
  readonly unidad: string;
  readonly frecuencia: string;
  readonly via: string;
  readonly duracion: string;
  readonly cantidad: number;
}

export interface PaquetePlantilla {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly tipo: 'farmacia' | 'apoyo' | 'interconsultas' | 'procedimientos';
  readonly codigosCie10?: readonly string[];
  readonly itemsFarmacia?: readonly PaqueteFarmaciaItem[];
  readonly itemsApoyo?: readonly {
    readonly idProducto?: number;
    readonly codigo?: string;
    readonly nombre: string;
    readonly servicio: string;
    readonly cantidad: number;
    readonly justificacion: string;
  }[];
  readonly itemsInterconsulta?: readonly {
    readonly idEspecialidad: number;
    readonly nombreEspecialidad: string;
    readonly motivo: string;
    readonly resumen: string;
  }[];
  readonly itemsProcedimientos?: readonly {
    readonly idProducto: number;
    readonly codigo: string;
    readonly nombre: string;
    readonly observacion: string;
  }[];
}

@Component({
  selector: 'app-ordenes-medicas-ce-seccion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectGlobalComponent,
    PaginacionComponent,
  ],
  templateUrl: './ordenes-medicas-ce-seccion.component.html',
})
export class OrdenesMedicasCeSeccionComponent implements OnInit {
  private readonly bienesService = inject(BienesInsumosApiService);
  private readonly ceApiService = inject(AtencionCEApiService);

  readonly diagnosticos = input.required<AtencionDiagnosticoCEItem[]>();

  readonly itemsReceta = input<ItemRecetaPrescripcion[]>([]);
  readonly itemsRecetaCambio = output<ItemRecetaPrescripcion[]>();

  readonly ordenesApoyo = input<OrdenApoyoDiagnosticoItem[]>([]);
  readonly ordenesApoyoCambio = output<OrdenApoyoDiagnosticoItem[]>();

  readonly interconsultas = input<InterconsultaCEItem[]>([]);
  readonly interconsultasCambio = output<InterconsultaCEItem[]>();

  readonly ordenesProcedimientos = input<OrdenProcedimientoCEItem[]>([]);
  readonly ordenesProcedimientosCambio = output<OrdenProcedimientoCEItem[]>();

  readonly textoTratamientoGenerado = output<string>();
  readonly textoApoyoGenerado = output<string>();
  readonly textoInterconsultasGenerado = output<string>();
  readonly textoProcedimientosGenerado = output<string>();

  // Sub-pestañas: Farmacia, Apoyo al Diagnóstico, Interconsultas, Procedimientos
  readonly subPestanaActiva = signal<
    'farmacia' | 'apoyo' | 'interconsultas' | 'procedimientos'
  >('farmacia');

  // Paginación en sub-pestañas
  readonly paginaFarmacia = signal<number>(1);
  readonly elementosPorPaginaFarmacia = 5;
  readonly totalPaginasFarmacia = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.itemsReceta()?.length || 0) / this.elementosPorPaginaFarmacia,
      ),
    ),
  );
  readonly itemsRecetaPaginados = computed(() => {
    const lista = this.itemsReceta() || [];
    const inicio =
      (this.paginaFarmacia() - 1) * this.elementosPorPaginaFarmacia;
    return lista.slice(inicio, inicio + this.elementosPorPaginaFarmacia);
  });

  readonly paginaApoyo = signal<number>(1);
  readonly elementosPorPaginaApoyo = 5;
  readonly totalPaginasApoyo = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.ordenesApoyo()?.length || 0) / this.elementosPorPaginaApoyo,
      ),
    ),
  );
  readonly ordenesApoyoPaginadas = computed(() => {
    const lista = this.ordenesApoyo() || [];
    const inicio = (this.paginaApoyo() - 1) * this.elementosPorPaginaApoyo;
    return lista.slice(inicio, inicio + this.elementosPorPaginaApoyo);
  });

  readonly paginaInterconsultas = signal<number>(1);
  readonly elementosPorPaginaInterconsultas = 5;
  readonly totalPaginasInterconsultas = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.interconsultas()?.length || 0) /
          this.elementosPorPaginaInterconsultas,
      ),
    ),
  );
  readonly interconsultasPaginadas = computed(() => {
    const lista = this.interconsultas() || [];
    const inicio =
      (this.paginaInterconsultas() - 1) * this.elementosPorPaginaInterconsultas;
    return lista.slice(inicio, inicio + this.elementosPorPaginaInterconsultas);
  });

  readonly paginaProcedimientos = signal<number>(1);
  readonly elementosPorPaginaProcedimientos = 5;
  readonly totalPaginasProcedimientos = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.ordenesProcedimientos()?.length || 0) /
          this.elementosPorPaginaProcedimientos,
      ),
    ),
  );
  readonly ordenesProcedimientosPaginadas = computed(() => {
    const lista = this.ordenesProcedimientos() || [];
    const inicio =
      (this.paginaProcedimientos() - 1) * this.elementosPorPaginaProcedimientos;
    return lista.slice(inicio, inicio + this.elementosPorPaginaProcedimientos);
  });

  constructor() {
    effect(() => {
      const listaDiagnosticos = this.diagnosticos();
      if (!listaDiagnosticos || listaDiagnosticos.length === 0) {
        return;
      }
      const primerDiagnosticoId = listaDiagnosticos[0].idDiagnostico;
      const idsValidos = new Set(
        listaDiagnosticos.map((item) => item.idDiagnostico),
      );

      if (
        this.idDiagnosticoFarmacia() === 0 ||
        !idsValidos.has(this.idDiagnosticoFarmacia())
      ) {
        this.idDiagnosticoFarmacia.set(primerDiagnosticoId);
      }
      if (
        this.idDiagnosticoApoyo() === 0 ||
        !idsValidos.has(this.idDiagnosticoApoyo())
      ) {
        this.idDiagnosticoApoyo.set(primerDiagnosticoId);
      }
      if (
        this.idDiagnosticoInterconsulta() === 0 ||
        !idsValidos.has(this.idDiagnosticoInterconsulta())
      ) {
        this.idDiagnosticoInterconsulta.set(primerDiagnosticoId);
      }
      if (
        this.idDiagnosticoProcedimiento() === 0 ||
        !idsValidos.has(this.idDiagnosticoProcedimiento())
      ) {
        this.idDiagnosticoProcedimiento.set(primerDiagnosticoId);
      }
    });
  }

  // --- Sub-pestaña 1: FARMACIA ---
  readonly idDiagnosticoFarmacia = signal<number>(0);
  readonly textoBusquedaMedicamento = signal<string>('');
  readonly resultadosMedicamentos = signal<readonly IBienInsumoItem[]>([]);
  readonly buscandoMedicamento = signal<boolean>(false);
  readonly dropdownMedicamentoAbierto = signal<boolean>(false);
  readonly medicamentoSeleccionado = signal<IBienInsumoItem | null>(null);

  readonly cantidadMed = signal<number>(30);
  readonly dosisMed = signal<string>('1');
  readonly unidadMed = signal<string>('TABLETA');
  readonly frecuenciaMed = signal<string>('CADA 24 HORAS');
  readonly viaMed = signal<string>('ORAL');
  readonly duracionMed = signal<string>('30 DÍAS');

  readonly unidadesComunes = [
    'TABLETA',
    'CÁPSULA',
    'FRASCO',
    'AMPOLLA',
    'UNIDAD',
    'GEL',
    'CREMA',
    'SUSPENSIÓN',
    'INHALADOR',
    'SOBRE',
    'GOTAS',
  ];
  readonly viasComunes = [
    'ORAL',
    'INTRAVENOSA (EV)',
    'INTRAMUSCULAR (IM)',
    'SUBCUTÁNEA (SC)',
    'TÓPICA',
    'INHALATORIA',
    'OFTÁLMICA',
    'ÓTICA',
    'NASAL',
    'RECTAL',
  ];
  readonly frecuenciasComunes = [
    'CADA 24 HORAS',
    'CADA 12 HORAS',
    'CADA 8 HORAS',
    'CADA 6 HORAS',
    'CADA 4 HORAS',
    'CONDICIONAL A SÍNTOMAS',
    'DOSIS ÚNICA',
  ];

  // --- Sub-pestaña 2: APOYO AL DIAGNÓSTICO ---
  readonly idDiagnosticoApoyo = signal<number>(0);
  readonly textoBusquedaExamen = signal<string>('');
  readonly resultadosExamenes = signal<readonly ExamenApoyoBusquedaItem[]>([]);
  readonly buscandoExamen = signal<boolean>(false);
  readonly dropdownExamenAbierto = signal<boolean>(false);
  readonly examenSeleccionado = signal<ExamenApoyoBusquedaItem | null>(null);

  readonly servicioApoyo = signal<string>('LABORATORIO');
  readonly cantidadApoyo = signal<number>(1);
  readonly justificacionApoyo = signal<string>('');
  readonly observacionApoyo = signal<string>('');

  readonly serviciosApoyoComunes = [
    'LABORATORIO',
    'PATOLOGÍA CLÍNICA',
    'DIAGNÓSTICO POR IMÁGENES',
    'RADIOLOGÍA',
    'ECOGRAFÍA',
    'TOMOGRAFÍA',
    'BANCO DE SANGRE',
    'CARDIOLOGÍA',
  ];

  // --- Sub-pestaña 3: INTERCONSULTAS ---
  readonly idDiagnosticoInterconsulta = signal<number>(0);
  readonly idEspecialidadInterconsulta = signal<number>(0);
  readonly fechaPropuestaInterconsulta = signal<string>(
    new Date().toISOString().split('T')[0],
  );
  readonly motivoInterconsulta = signal<string>(
    'OPINIÓN DIAGNÓSTICO Y SUGERENCIA',
  );
  readonly resumenEnfermedadInterconsulta = signal<string>('');
  readonly listaEspecialidades = signal<readonly EspecialidadCatalogoItem[]>(
    [],
  );
  readonly cargandoEspecialidades = signal<boolean>(false);

  readonly especialidadesPredefinidas: readonly EspecialidadCatalogoItem[] = [
    { id: 152, nombre: 'ANESTESIOLOGIA' },
    { id: 101, nombre: 'CARDIOLOGÍA' },
    { id: 102, nombre: 'CIRUGÍA GENERAL' },
    { id: 105, nombre: 'DERMATOLOGÍA' },
    { id: 108, nombre: 'ENDOCRINOLOGÍA' },
    { id: 110, nombre: 'GASTROENTEROLOGÍA' },
    { id: 112, nombre: 'GINECOLOGÍA Y OBSTETRICIA' },
    { id: 114, nombre: 'MEDICINA INTERNA' },
    { id: 115, nombre: 'NEUMOLOGÍA' },
    { id: 116, nombre: 'NEUROLOGÍA' },
    { id: 118, nombre: 'OFTALMOLOGÍA' },
    { id: 120, nombre: 'ONCOLOGÍA' },
    { id: 122, nombre: 'OTORRINOLARINGOLOGÍA' },
    { id: 124, nombre: 'PEDIATRÍA' },
    { id: 126, nombre: 'PSIQUIATRÍA' },
    { id: 128, nombre: 'REUMATOLOGÍA' },
    { id: 130, nombre: 'TRAUMATOLOGÍA Y ORTOPEDIA' },
    { id: 132, nombre: 'UROLOGÍA' },
  ];

  // --- Sub-pestaña 4: PROCEDIMIENTOS CLÍNICOS ---
  readonly idDiagnosticoProcedimiento = signal<number>(0);
  readonly textoBusquedaProcedimiento = signal<string>('');
  readonly procedimientoSeleccionado = signal<ExamenApoyoBusquedaItem | null>(
    null,
  );
  readonly cantidadProcedimiento = signal<number>(1);
  readonly observacionProcedimiento = signal<string>('');
  readonly resultadosProcedimientos = signal<
    readonly ExamenApoyoBusquedaItem[]
  >([]);
  readonly buscandoProcedimiento = signal<boolean>(false);
  readonly dropdownProcedimientoAbierto = signal<boolean>(false);

  readonly procedimientosFrecuentes: readonly {
    readonly idProducto: number;
    readonly codigo: string;
    readonly nombre: string;
  }[] = [
    {
      idProducto: 1,
      codigo: '93306',
      nombre:
        'ECOCARDIOGRAFÍA, TRANSTORÁCICA, EN TIEMPO REAL CON MODO M Y DOPPLER',
    },
    {
      idProducto: 2,
      codigo: '93000',
      nombre: 'ELECTROCARDIOGRAMA DE 12 DERIVACIONES',
    },
    {
      idProducto: 3,
      codigo: '94010',
      nombre: 'ESPIROMETRÍA COMPUTARIZADA',
    },
    {
      idProducto: 4,
      codigo: '43235',
      nombre: 'ENDOSCOPÍA DIGESTIVA ALTA DIAGNÓSTICA',
    },
    {
      idProducto: 5,
      codigo: '45378',
      nombre: 'COLONOSCOPÍA TOTAL CON BIOPSIA',
    },
    {
      idProducto: 6,
      codigo: '10021',
      nombre: 'BIOPSIA POR ASPIRACIÓN CON AGUJA FINA (PAAF)',
    },
    {
      idProducto: 7,
      codigo: '92552',
      nombre: 'AUDIOMETRÍA TONAL LIMINAR',
    },
    {
      idProducto: 8,
      codigo: '92083',
      nombre: 'CAMPIMETRÍA COMPUTARIZADA',
    },
    {
      idProducto: 9,
      codigo: '92225',
      nombre: 'FONDO DE OJO CON DILATACIÓN',
    },
    {
      idProducto: 10,
      codigo: '88141',
      nombre: 'PAPANICOLAOU / TOMA DE MUESTRA CERVICAL',
    },
    {
      idProducto: 11,
      codigo: '93784',
      nombre: 'MONITOREO DE PRESIÓN ARTERIAL (MAPA 24 HORAS)',
    },
    {
      idProducto: 12,
      codigo: '93224',
      nombre: 'MONITOREO HOLTER DE 24 HORAS',
    },
  ];

  // --- Modal Gestión de Paquetes ---
  readonly modalPaquetesVisible = signal<boolean>(false);
  readonly filtroTipoPaquete = signal<
    'todos' | 'farmacia' | 'apoyo' | 'interconsultas' | 'procedimientos'
  >('todos');
  readonly filtroSoloSugeridos = signal<boolean>(true);

  readonly paquetesDisponibles: readonly PaquetePlantilla[] = [
    {
      id: 'paquete-hipertension-farmacia',
      titulo: 'Paquete HTA — Farmacia Antihipertensiva',
      descripcion:
        'Tratamiento antihipertensivo oral estándar para control mensual.',
      tipo: 'farmacia',
      codigosCie10: ['I10', 'I11', 'I15'],
      itemsFarmacia: [
        {
          nombre: 'LOSARTAN POTASICO',
          concentracion: '50 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 12 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 60,
        },
        {
          nombre: 'AMLODIPINO (COMO BESILATO)',
          concentracion: '10 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
        {
          nombre: 'BISOPROLOL FUMARATO',
          concentracion: '5 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
        {
          nombre: 'HIDROCLOROTIAZIDA',
          concentracion: '12.5 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
      ],
    },
    {
      id: 'paquete-hipertension-apoyo',
      titulo: 'Paquete HTA — Apoyo y Evaluación Cardiovascular',
      descripcion:
        'Batería analítica y diagnóstica para descarte de daño de órgano blanco en HTA.',
      tipo: 'apoyo',
      codigosCie10: ['I10', 'I11', 'I15'],
      itemsApoyo: [
        {
          nombre: 'ELECTROCARDIOGRAMA DE 12 DERIVACIONES',
          servicio: 'CARDIOLOGÍA',
          cantidad: 1,
          justificacion:
            'Evaluación de hipertrofia ventricular y arritmias por HTA',
        },
        {
          nombre: 'RADIOGRAFÍA DE TÓRAX (FRONTAL)',
          servicio: 'DIAGNÓSTICO POR IMÁGENES',
          cantidad: 1,
          justificacion:
            'Evaluación de índice cardiotorácico y parénquima pulmonar',
        },
        {
          nombre: 'CREATININA EN SUERO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Descarte de nefropatía hipertensiva basal',
        },
        {
          nombre: 'PERFIL LIPÍDICO COMPLETO (COLESTEROL Y TRIGLICÉRIDOS)',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Estratificación de riesgo cardiovascular global',
        },
      ],
    },
    {
      id: 'paquete-hipertension-interconsultas',
      titulo: 'Paquete HTA — Interconsultas Especializadas',
      descripcion:
        'Interconsultas médicas recomendadas para hipertensión arterial de control o refractaria.',
      tipo: 'interconsultas',
      codigosCie10: ['I10', 'I11', 'I15'],
      itemsInterconsulta: [
        {
          idEspecialidad: 101,
          nombreEspecialidad: 'CARDIOLOGÍA',
          motivo: 'EVALUACIÓN INTEGRAL Y CONTROL CARDIOLÓGICO',
          resumen:
            'Paciente con diagnóstico de hipertensión arterial para estratificación cardiovascular.',
        },
        {
          idEspecialidad: 118,
          nombreEspecialidad: 'OFTALMOLOGÍA',
          motivo: 'FONDO DE OJO / DESCARTE DE RETINOPATÍA HIPERTENSIVA',
          resumen:
            'Control oftalmológico anual para descarte de vasculopatía retiniana hipertensiva.',
        },
      ],
    },
    {
      id: 'paquete-hipertension-procedimientos',
      titulo: 'Paquete HTA — Procedimientos de Monitoreo',
      descripcion:
        'Monitoreo ambulatorio continuo y registros electrofisiológicos para HTA.',
      tipo: 'procedimientos',
      codigosCie10: ['I10', 'I11', 'I15'],
      itemsProcedimientos: [
        {
          idProducto: 11,
          codigo: '93784',
          nombre: 'MONITOREO DE PRESIÓN ARTERIAL (MAPA 24 HORAS)',
          observacion:
            'Descarte de hipertensión de bata blanca y evaluación de perfil circadiano',
        },
        {
          idProducto: 2,
          codigo: '93000',
          nombre: 'ELECTROCARDIOGRAMA DE 12 DERIVACIONES',
          observacion: 'Trazado basal electrocardiográfico',
        },
      ],
    },
    {
      id: 'paquete-diabetes-farmacia',
      titulo: 'Paquete Diabetes Tipo 2 — Farmacia Hipoglucemiante',
      descripcion:
        'Control glicémico oral mensual para diabetes mellitus no insulinodependiente.',
      tipo: 'farmacia',
      codigosCie10: ['E11', 'E14'],
      itemsFarmacia: [
        {
          nombre: 'METFORMINA CLORHIDRATO',
          concentracion: '850 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 12 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 60,
        },
        {
          nombre: 'GLIBENCLAMIDA',
          concentracion: '5 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
      ],
    },
    {
      id: 'paquete-diabetes-apoyo',
      titulo: 'Paquete Diabetes Tipo 2 — Monitoreo Metabólico y Renal',
      descripcion:
        'Perfil de laboratorio para control glicémico trimestral y función renal.',
      tipo: 'apoyo',
      codigosCie10: ['E11', 'E14'],
      itemsApoyo: [
        {
          nombre: 'GLUCOSA EN SUERO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Evaluación de glicemia basal en ayunas',
        },
        {
          nombre: 'HEMOGLOBINA GLICOSILADA (HBA1C)',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion:
            'Monitoreo de compensación metabólica de los últimos 3 meses',
        },
        {
          nombre: 'MICROALBUMINURIA EN ORINA MATUTINA',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Detección precoz de nefropatía diabética incipiente',
        },
        {
          nombre: 'CREATININA EN SUERO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Estimación de tasa de filtrado glomerular',
        },
        {
          nombre: 'PERFIL LIPÍDICO COMPLETO (COLESTEROL Y TRIGLICÉRIDOS)',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Control de dislipidemia aterogénica diabética',
        },
      ],
    },
    {
      id: 'paquete-diabetes-interconsultas',
      titulo: 'Paquete Diabetes Tipo 2 — Interconsultas Preventivas',
      descripcion:
        'Interconsultas multidisciplinarias para prevención de complicaciones de diabetes.',
      tipo: 'interconsultas',
      codigosCie10: ['E11', 'E14'],
      itemsInterconsulta: [
        {
          idEspecialidad: 108,
          nombreEspecialidad: 'ENDOCRINOLOGÍA',
          motivo: 'VALORACIÓN Y AJUSTE DE TERAPIA HIPOGLUCEMIANTE',
          resumen:
            'Paciente con diabetes mellitus tipo 2 en seguimiento de control metabólico.',
        },
        {
          idEspecialidad: 118,
          nombreEspecialidad: 'OFTALMOLOGÍA',
          motivo: 'EVALUACIÓN DE FONDO DE OJO / RETINOPATÍA DIABÉTICA',
          resumen:
            'Tamizaje anual protocolar para descartar microangiopatía retiniana diabética.',
        },
      ],
    },
    {
      id: 'paquete-diabetes-procedimientos',
      titulo: 'Paquete Diabetes Tipo 2 — Procedimientos Diagnósticos',
      descripcion:
        'Estudios de fondo de ojo y valoración retiniana en paciente diabético.',
      tipo: 'procedimientos',
      codigosCie10: ['E11', 'E14'],
      itemsProcedimientos: [
        {
          idProducto: 9,
          codigo: '92225',
          nombre: 'FONDO DE OJO CON DILATACIÓN',
          observacion:
            'Descarte y estadiaje de retinopatía diabética no proliferativa / proliferativa',
        },
      ],
    },
    {
      id: 'paquete-respiratorio-farmacia',
      titulo: 'Paquete Respiratorio — Infección y Broncoespasmo',
      descripcion:
        'Tratamiento sintomático y antimicrobiano para afecciones respiratorias agudas o reactivas.',
      tipo: 'farmacia',
      codigosCie10: ['J00', 'J02', 'J03', 'J06', 'J18', 'J20', 'J44', 'J45'],
      itemsFarmacia: [
        {
          nombre: 'AMOXICILINA + ACIDO CLAVULANICO',
          concentracion: '875 MG / 125 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 12 HORAS',
          via: 'ORAL',
          duracion: '7 DÍAS',
          cantidad: 14,
        },
        {
          nombre: 'SALBUTAMOL (COMO SULFATO)',
          concentracion: '100 MCG/DOSIS',
          formaFarmaceutica: 'AEROSOL',
          dosis: '2',
          unidad: 'INHALADOR',
          frecuencia: 'CADA 8 HORAS',
          via: 'INHALATORIA',
          duracion: '7 DÍAS',
          cantidad: 1,
        },
        {
          nombre: 'PARACETAMOL',
          concentracion: '500 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 8 HORAS',
          via: 'ORAL',
          duracion: '3 DÍAS',
          cantidad: 10,
        },
      ],
    },
    {
      id: 'paquete-respiratorio-apoyo',
      titulo: 'Paquete Respiratorio — Exámenes de Tórax e Inflamación',
      descripcion:
        'Imagenología pulmonar y marcadores de infección respiratoria aguda.',
      tipo: 'apoyo',
      codigosCie10: ['J00', 'J02', 'J03', 'J06', 'J18', 'J20', 'J44', 'J45'],
      itemsApoyo: [
        {
          nombre: 'RADIOGRAFÍA DE TÓRAX (FRONTAL)',
          servicio: 'DIAGNÓSTICO POR IMÁGENES',
          cantidad: 1,
          justificacion:
            'Descarte de condensación neumónica o infiltrados bronquiales',
        },
        {
          nombre: 'HEMOGRAMA COMPLETO AUTOMATIZADO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion:
            'Evaluación de leucocitosis y desviación izquierda bacteriana',
        },
        {
          nombre: 'PROTEÍNA C REACTIVA (PCR) CUANTITATIVA',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion:
            'Marcador de respuesta inflamatoria e infecciosa sistémica',
        },
      ],
    },
    {
      id: 'paquete-respiratorio-interconsultas',
      titulo: 'Paquete Respiratorio — Neumología',
      descripcion:
        'Derivación especializada para cuadros respiratorios crónicos o refractarios.',
      tipo: 'interconsultas',
      codigosCie10: ['J00', 'J02', 'J03', 'J06', 'J18', 'J20', 'J44', 'J45'],
      itemsInterconsulta: [
        {
          idEspecialidad: 115,
          nombreEspecialidad: 'NEUMOLOGÍA',
          motivo: 'EVALUACIÓN DE PATOLOGÍA PULMONAR CRÓNICA O RECIDIVANTE',
          resumen:
            'Paciente con síntomas respiratorios que requiere evaluación espirométrica y funcional.',
        },
      ],
    },
    {
      id: 'paquete-respiratorio-procedimientos',
      titulo: 'Paquete Respiratorio — Espirometría y Función Pulmonar',
      descripcion:
        'Pruebas funcionales de flujo espiratorio para diagnóstico de asma o EPOC.',
      tipo: 'procedimientos',
      codigosCie10: ['J44', 'J45', 'J20'],
      itemsProcedimientos: [
        {
          idProducto: 3,
          codigo: '94010',
          nombre: 'ESPIROMETRÍA COMPUTARIZADA',
          observacion: 'Prueba de función pulmonar con y sin broncodilatador',
        },
      ],
    },
    {
      id: 'paquete-gastritis-farmacia',
      titulo: 'Paquete Gastritis y Dispepsia — Gastroprotección Oral',
      descripcion:
        'Inhibición de la secreción ácida gástrica y alivio sintomático de dispepsia.',
      tipo: 'farmacia',
      codigosCie10: ['K29', 'K21', 'K30'],
      itemsFarmacia: [
        {
          nombre: 'OMEPRAZOL',
          concentracion: '20 MG',
          formaFarmaceutica: 'CÁPSULA',
          dosis: '1',
          unidad: 'CÁPSULA',
          frecuencia: 'CADA 24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
        {
          nombre: 'DIMETICONA',
          concentracion: '80 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 8 HORAS',
          via: 'ORAL',
          duracion: '10 DÍAS',
          cantidad: 30,
        },
      ],
    },
    {
      id: 'paquete-gastritis-apoyo',
      titulo: 'Paquete Gastritis — Apoyo Diagnóstico y Ecografía',
      descripcion:
        'Estudios no invasivos para evaluación epigástrica y descarte biliar.',
      tipo: 'apoyo',
      codigosCie10: ['K29', 'K21', 'K30'],
      itemsApoyo: [
        {
          nombre: 'ECOGRAFÍA ABDOMINAL SUPERIOR',
          servicio: 'DIAGNÓSTICO POR IMÁGENES',
          cantidad: 1,
          justificacion:
            'Descarte de litiasis vesicular y patología hepatobiliar',
        },
        {
          nombre: 'HEMOGRAMA COMPLETO AUTOMATIZADO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion:
            'Descarte de anemia microcítica por sangrado digestivo crónico',
        },
      ],
    },
    {
      id: 'paquete-gastritis-interconsultas',
      titulo: 'Paquete Gastritis — Gastroenterología',
      descripcion:
        'Interconsulta médica para sospecha de úlcera péptica o reflujo gastroesofágico severo.',
      tipo: 'interconsultas',
      codigosCie10: ['K29', 'K21', 'K30'],
      itemsInterconsulta: [
        {
          idEspecialidad: 110,
          nombreEspecialidad: 'GASTROENTEROLOGÍA',
          motivo: 'VALORACIÓN ENDOSCÓPICA Y MANEJO GASTROENTEROLÓGICO',
          resumen:
            'Paciente con dolor epigástrico crónico y dispepsia para valoración especializada.',
        },
      ],
    },
    {
      id: 'paquete-gastritis-procedimientos',
      titulo: 'Paquete Gastritis — Endoscopía Digestiva Alta',
      descripcion:
        'Procedimiento endoscópico directo con toma de biopsia gástrica.',
      tipo: 'procedimientos',
      codigosCie10: ['K29', 'K21', 'K30'],
      itemsProcedimientos: [
        {
          idProducto: 4,
          codigo: '43235',
          nombre: 'ENDOSCOPÍA DIGESTIVA ALTA DIAGNÓSTICA',
          observacion:
            'Toma de biopsia de antro gástrico y test rápido de ureasa para Helicobacter pylori',
        },
      ],
    },
    {
      id: 'paquete-urinario-farmacia',
      titulo: 'Paquete Urinario — Antibioticoterapia y Alivio Urinario',
      descripcion:
        'Esquema antimicrobiano para infección urinaria baja no complicada.',
      tipo: 'farmacia',
      codigosCie10: ['N39', 'N30', 'N10', 'N40'],
      itemsFarmacia: [
        {
          nombre: 'CIPROFLOXACINO (COMO CLORHIDRATO)',
          concentracion: '500 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 12 HORAS',
          via: 'ORAL',
          duracion: '7 DÍAS',
          cantidad: 14,
        },
        {
          nombre: 'FENAZOPIRIDINA CLORHIDRATO',
          concentracion: '100 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 8 HORAS',
          via: 'ORAL',
          duracion: '2 DÍAS',
          cantidad: 6,
        },
      ],
    },
    {
      id: 'paquete-urinario-apoyo',
      titulo: 'Paquete Urinario — Urocultivo y Bioquímica Renal',
      descripcion:
        'Confirmación microbiológica y evaluación de vías urinarias.',
      tipo: 'apoyo',
      codigosCie10: ['N39', 'N30', 'N10', 'N40'],
      itemsApoyo: [
        {
          nombre: 'EXAMEN COMPLETO DE ORINA CON SEDIMENTO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Evaluación de leucocituria, piuria y bacteriuria',
        },
        {
          nombre: 'UROCULTIVO CON ANTIBIOGRAMA AUTOMATIZADO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion:
            'Aislamiento e identificación del germen uropatógeno y sensibilidad antibiótica',
        },
        {
          nombre: 'CREATININA EN SUERO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Descarte de compromiso renal secundario',
        },
      ],
    },
    {
      id: 'paquete-urinario-interconsultas',
      titulo: 'Paquete Urinario — Urología',
      descripcion:
        'Evaluación por médico urólogo para infección urinaria recurrente o litiasis renal.',
      tipo: 'interconsultas',
      codigosCie10: ['N39', 'N30', 'N10', 'N40'],
      itemsInterconsulta: [
        {
          idEspecialidad: 132,
          nombreEspecialidad: 'UROLOGÍA',
          motivo: 'VALORACIÓN UROLÓGICA ESPECIALIZADA',
          resumen:
            'Paciente con síntomas urinarios recurrentes o prostatismo para estudio integral.',
        },
      ],
    },
    {
      id: 'paquete-reumatologia-farmacia',
      titulo: 'Paquete Osteoarticular — Analgesia y Antiinflamatorio',
      descripcion:
        'Alivio del dolor osteomuscular agudo o crónico con protección adecuada.',
      tipo: 'farmacia',
      codigosCie10: ['M19', 'M17', 'M54', 'M79'],
      itemsFarmacia: [
        {
          nombre: 'MELOXICAM',
          concentracion: '15 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 24 HORAS',
          via: 'ORAL',
          duracion: '10 DÍAS',
          cantidad: 10,
        },
        {
          nombre: 'PARACETAMOL',
          concentracion: '500 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 8 HORAS',
          via: 'ORAL',
          duracion: '7 DÍAS',
          cantidad: 20,
        },
        {
          nombre: 'COMPLEJO B (B1, B6, B12)',
          concentracion: 'TAB',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TABLETA',
          frecuencia: 'CADA 24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
      ],
    },
    {
      id: 'paquete-reumatologia-apoyo',
      titulo: 'Paquete Osteoarticular — Radiografías y Reactantes',
      descripcion: 'Estudios de imagen ósea y marcadores reumatológicos.',
      tipo: 'apoyo',
      codigosCie10: ['M19', 'M17', 'M54', 'M79'],
      itemsApoyo: [
        {
          nombre: 'RADIOGRAFÍA DE COLUMNA LUMBOSACRA (FRONTAL Y LATERAL)',
          servicio: 'DIAGNÓSTICO POR IMÁGENES',
          cantidad: 1,
          justificacion:
            'Evaluación de espacios discales, osteofitos y alineación vertebral',
        },
        {
          nombre: 'FACTOR REUMATOIDEO CUANTITATIVO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Descarte de artropatía inflamatoria autoinmune',
        },
        {
          nombre: 'ÁCIDO ÚRICO EN SUERO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Descarte de artritis gotosa',
        },
      ],
    },
    {
      id: 'paquete-reumatologia-interconsultas',
      titulo: 'Paquete Osteoarticular — Reumatología y Traumatología',
      descripcion:
        'Interconsultas para patologías articulares degenerativas o inflamatorias.',
      tipo: 'interconsultas',
      codigosCie10: ['M19', 'M17', 'M54', 'M79'],
      itemsInterconsulta: [
        {
          idEspecialidad: 128,
          nombreEspecialidad: 'REUMATOLOGÍA',
          motivo: 'VALORACIÓN DE POLIARTRALGIAS / DOLOR CRÓNICO',
          resumen:
            'Paciente con sintomatología osteoarticular para descarte y manejo reumatológico.',
        },
        {
          idEspecialidad: 130,
          nombreEspecialidad: 'TRAUMATOLOGÍA Y ORTOPEDIA',
          motivo:
            'EVALUACIÓN ARTICULAR Y TRATAMIENTO QUIRÚRGICO O INFILTRATIVO',
          resumen:
            'Evaluación articular estructural y prescripción de medidas mecánicas ortopédicas.',
        },
      ],
    },
    {
      id: 'paquete-preventivo-apoyo',
      titulo: 'Perfil Preventivo Básico — Chequeo de Rutina',
      descripcion:
        'Batería de análisis clínicos esenciales para control ambulatorio periódico del adulto.',
      tipo: 'apoyo',
      codigosCie10: ['Z00', 'Z01'],
      itemsApoyo: [
        {
          nombre: 'HEMOGRAMA COMPLETO AUTOMATIZADO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Chequeo preventivo anual / descarte de anemia',
        },
        {
          nombre: 'GLUCOSA EN SUERO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Descarte de hiperglicemia o diabetes subclínica',
        },
        {
          nombre: 'CREATININA EN SUERO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Evaluación de función renal basal',
        },
        {
          nombre: 'PERFIL LIPÍDICO COMPLETO (COLESTEROL Y TRIGLICÉRIDOS)',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Detección temprana de riesgo cardiovascular',
        },
        {
          nombre: 'EXAMEN COMPLETO DE ORINA CON SEDIMENTO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Descarte de patología renal silente y proteinuria',
        },
      ],
    },
    {
      id: 'paquete-preventivo-procedimientos',
      titulo: 'Perfil Preventivo — Electrocardiograma y Tamizaje',
      descripcion:
        'Procedimientos preventivos básicos recomendados en consulta médica.',
      tipo: 'procedimientos',
      codigosCie10: ['Z00', 'Z01'],
      itemsProcedimientos: [
        {
          idProducto: 2,
          codigo: '93000',
          nombre: 'ELECTROCARDIOGRAMA DE 12 DERIVACIONES',
          observacion: 'Trazado cardiovascular de rutina en paciente adulto',
        },
      ],
    },
  ];

  readonly paquetesFiltrados = computed(() => {
    let paquetes = this.paquetesDisponibles;
    const tipo = this.filtroTipoPaquete();
    if (tipo !== 'todos') {
      paquetes = paquetes.filter((paqueteItem) => paqueteItem.tipo === tipo);
    }
    if (this.filtroSoloSugeridos()) {
      const sugeridos = paquetes.filter((paqueteItem) => {
        return !!this.obtenerDiagnosticoCoincidenteParaPaquete(paqueteItem);
      });
      if (sugeridos.length > 0) {
        return sugeridos;
      }
    }
    return paquetes;
  });

  obtenerDiagnosticoCoincidenteParaPaquete(
    paquete: PaquetePlantilla,
  ): AtencionDiagnosticoCEItem | undefined {
    const listaDiagnosticos = this.diagnosticos();
    if (!listaDiagnosticos || listaDiagnosticos.length === 0) {
      return undefined;
    }
    if (!paquete.codigosCie10 || paquete.codigosCie10.length === 0) {
      return listaDiagnosticos[0];
    }
    for (const diagnostico of listaDiagnosticos) {
      const codigoCie10 = (diagnostico.codigoCIE10 || '').toUpperCase().trim();
      for (const prefijo of paquete.codigosCie10) {
        if (codigoCie10.startsWith(prefijo.toUpperCase())) {
          return diagnostico;
        }
      }
    }
    return undefined;
  }

  cambiarSubPestana(
    pestana: 'farmacia' | 'apoyo' | 'interconsultas' | 'procedimientos',
  ): void {
    this.subPestanaActiva.set(pestana);
  }

  // --- MÉTODOS DE FARMACIA ---
  private temporizadorBusquedaMedicamento: ReturnType<
    typeof setTimeout
  > | null = null;
  private identificadorPeticionMedicamento = 0;

  alEscribirMedicamento(): void {
    const termino = this.textoBusquedaMedicamento().trim();
    if (this.temporizadorBusquedaMedicamento) {
      clearTimeout(this.temporizadorBusquedaMedicamento);
    }

    if (termino.length < 2) {
      this.resultadosMedicamentos.set([]);
      this.dropdownMedicamentoAbierto.set(false);
      this.buscandoMedicamento.set(false);
      return;
    }

    this.buscandoMedicamento.set(true);
    this.temporizadorBusquedaMedicamento = setTimeout(async () => {
      const identificadorActual = ++this.identificadorPeticionMedicamento;
      try {
        const respuesta = await this.bienesService.listar({
          filtro: termino,
          page: 1,
          pageSize: 20,
        });
        if (identificadorActual === this.identificadorPeticionMedicamento) {
          this.resultadosMedicamentos.set(respuesta.items);
          this.dropdownMedicamentoAbierto.set(respuesta.items.length > 0);
        }
      } catch {
        if (identificadorActual === this.identificadorPeticionMedicamento) {
          this.resultadosMedicamentos.set([]);
        }
      } finally {
        if (identificadorActual === this.identificadorPeticionMedicamento) {
          this.buscandoMedicamento.set(false);
        }
      }
    }, 250);
  }

  seleccionarMedicamento(item: IBienInsumoItem): void {
    this.medicamentoSeleccionado.set(item);
    this.textoBusquedaMedicamento.set(
      `${item.codigo} - ${item.nombre} ${item.concentracion}`,
    );
    this.dropdownMedicamentoAbierto.set(false);

    // Ajustar unidad por forma farmacéutica si es conocida
    const forma = (item.formaFarmaceutica || '').toUpperCase();
    if (forma.includes('TAB')) this.unidadMed.set('TAB');
    else if (forma.includes('CAP')) this.unidadMed.set('CAP');
    else if (forma.includes('JAR') || forma.includes('FCO'))
      this.unidadMed.set('FCO');
    else if (forma.includes('AMP')) this.unidadMed.set('AMP');
  }

  private resolverDiagnosticoAsociado(
    idDiagnostico: number,
  ): AtencionDiagnosticoCEItem | undefined {
    const lista = this.diagnosticos();
    if (!lista || lista.length === 0) return undefined;
    if (idDiagnostico > 0) {
      const encontrado = lista.find((d) => d.idDiagnostico === idDiagnostico);
      if (encontrado) return encontrado;
    }
    const principal = lista.find((d) => d.idSubclasificacionDx === 1);
    return principal || lista[0];
  }

  agregarMedicamento(): void {
    const med = this.medicamentoSeleccionado();
    if (!med) return;

    const idDx = Number(this.idDiagnosticoFarmacia()) || 0;
    const dxEncontrado = this.resolverDiagnosticoAsociado(idDx);

    const nuevoItem: ItemRecetaPrescripcion = {
      idProducto: med.idProducto,
      codigo: med.codigo,
      nombre: med.nombre,
      concentracion: med.concentracion,
      formaFarmaceutica: med.formaFarmaceutica,
      dosis: this.dosisMed().trim() || '1',
      unidadMedida: this.unidadMed().trim() || 'TAB',
      frecuencia: this.frecuenciaMed().trim() || 'C\\24 HORAS',
      via: this.viaMed().trim() || 'ORAL',
      duracion: this.duracionMed().trim() || '30 DÍAS',
      cantidad: Math.max(1, Number(this.cantidadMed()) || 1),
      indicaciones: '',
      idDiagnostico: dxEncontrado?.idDiagnostico,
      codigoCIE10: dxEncontrado?.codigoCIE10 || '',
    };

    const lista = [...(this.itemsReceta() || []), nuevoItem];
    this.itemsRecetaCambio.emit(lista);
    this.emitirTextoTratamiento(lista);

    // Limpiar campos de inserción
    this.medicamentoSeleccionado.set(null);
    this.textoBusquedaMedicamento.set('');
    this.dropdownMedicamentoAbierto.set(false);
  }

  actualizarMedicamento(
    indice: number,
    campo: keyof ItemRecetaPrescripcion,
    valor: string | number,
  ): void {
    const lista = [...(this.itemsReceta() || [])];
    if (indice >= 0 && indice < lista.length) {
      lista[indice] = {
        ...lista[indice],
        [campo]: valor,
      };
      this.itemsRecetaCambio.emit(lista);
      this.emitirTextoTratamiento(lista);
    }
  }

  eliminarMedicamento(indice: number): void {
    const lista = [...(this.itemsReceta() || [])];
    lista.splice(indice, 1);
    this.itemsRecetaCambio.emit(lista);
    this.emitirTextoTratamiento(lista);

    const maxPagina = Math.max(
      1,
      Math.ceil(lista.length / this.elementosPorPaginaFarmacia),
    );
    if (this.paginaFarmacia() > maxPagina) {
      this.paginaFarmacia.set(maxPagina);
    }
  }

  private emitirTextoTratamiento(lista: ItemRecetaPrescripcion[]): void {
    if (!lista || lista.length === 0) {
      this.textoTratamientoGenerado.emit('');
      return;
    }

    const bloques: string[] = ['PLAN DE TRATAMIENTO FARMACOLÓGICO:'];
    for (const item of lista) {
      const unidad = item.unidadMedida || 'TABLETA';
      const cantidadTexto =
        item.cantidad > 1 ? ` (${item.cantidad} ${unidad}S)` : ` (1 ${unidad})`;
      bloques.push(`\n• ${item.nombre} ${item.concentracion}${cantidadTexto}`);
      bloques.push(
        `  - Posología: ${item.dosis} ${unidad} vía ${item.via}, ${item.frecuencia} por ${item.duracion}`,
      );
      if (item.codigoCIE10) {
        bloques.push(`  - Diagnóstico asociado: ${item.codigoCIE10}`);
      }
      if (item.indicaciones) {
        bloques.push(`  - Indicaciones: ${item.indicaciones}`);
      }
    }

    this.textoTratamientoGenerado.emit(bloques.join('\n'));
  }

  // --- MÉTODOS DE APOYO AL DIAGNÓSTICO ---
  private temporizadorBusquedaExamen: ReturnType<typeof setTimeout> | null =
    null;
  private identificadorPeticionExamen = 0;

  alEscribirExamen(): void {
    const termino = this.textoBusquedaExamen().trim();
    if (this.temporizadorBusquedaExamen) {
      clearTimeout(this.temporizadorBusquedaExamen);
    }

    if (termino.length < 2) {
      this.resultadosExamenes.set([]);
      this.dropdownExamenAbierto.set(false);
      this.buscandoExamen.set(false);
      return;
    }

    this.buscandoExamen.set(true);
    this.temporizadorBusquedaExamen = setTimeout(async () => {
      const identificadorActual = ++this.identificadorPeticionExamen;
      try {
        const items = await this.ceApiService.buscarExamenesApoyo(termino);
        if (identificadorActual === this.identificadorPeticionExamen) {
          this.resultadosExamenes.set(items);
          this.dropdownExamenAbierto.set(items.length > 0);
        }
      } catch {
        if (identificadorActual === this.identificadorPeticionExamen) {
          this.resultadosExamenes.set([]);
        }
      } finally {
        if (identificadorActual === this.identificadorPeticionExamen) {
          this.buscandoExamen.set(false);
        }
      }
    }, 250);
  }

  seleccionarExamen(item: ExamenApoyoBusquedaItem): void {
    this.examenSeleccionado.set(item);
    this.textoBusquedaExamen.set(`${item.codigo} - ${item.nombre}`);
    this.dropdownExamenAbierto.set(false);

    if (item.tipo) {
      const tipoNormalizado = item.tipo.toUpperCase();
      if (
        tipoNormalizado.includes('IMAG') ||
        tipoNormalizado.includes('RAY') ||
        tipoNormalizado.includes('ECO') ||
        tipoNormalizado.includes('TOMOG') ||
        tipoNormalizado.includes('MAMOG') ||
        tipoNormalizado.includes('RADIO')
      ) {
        this.servicioApoyo.set('DIAGNÓSTICO POR IMÁGENES');
      } else if (
        tipoNormalizado.includes('CARD') ||
        tipoNormalizado.includes('ELECTRO') ||
        tipoNormalizado.includes('MAPA') ||
        tipoNormalizado.includes('HOLTER') ||
        tipoNormalizado.includes('ESPIRO')
      ) {
        this.servicioApoyo.set('CARDIOLOGÍA / APOYO FUNCIONAL');
      } else if (
        tipoNormalizado.includes('LABORAT') ||
        tipoNormalizado.includes('PATOLOG') ||
        tipoNormalizado.includes('SANGRE') ||
        tipoNormalizado.includes('BIOQUIM')
      ) {
        this.servicioApoyo.set('LABORATORIO CLÍNICO');
      } else {
        this.servicioApoyo.set(tipoNormalizado);
      }
    }
  }

  agregarExamenApoyo(): void {
    const ex = this.examenSeleccionado();
    const textoManual = this.textoBusquedaExamen().trim();
    if (!ex && !textoManual) return;

    const idDx = Number(this.idDiagnosticoApoyo()) || 0;
    const dxEncontrado = this.resolverDiagnosticoAsociado(idDx);

    const idProductoFinal =
      ex && ex.idProducto
        ? ex.idProducto
        : Date.now() + Math.floor(Math.random() * 1000);

    const nuevoItem: OrdenApoyoDiagnosticoItem = {
      idProducto: idProductoFinal,
      codigo: ex ? ex.codigo : 'APOYO',
      nombreProcedimiento: ex ? ex.nombre : textoManual,
      servicio: this.servicioApoyo(),
      idDiagnostico: dxEncontrado?.idDiagnostico,
      codigoCIE10: dxEncontrado?.codigoCIE10 || '',
      cantidad: Math.max(1, Number(this.cantidadApoyo()) || 1),
      justificacion: this.justificacionApoyo().trim(),
      observacion: this.observacionApoyo().trim(),
    };

    const lista = [...(this.ordenesApoyo() || []), nuevoItem];
    this.ordenesApoyoCambio.emit(lista);
    this.emitirTextoApoyo(lista);

    // Limpiar campos
    this.examenSeleccionado.set(null);
    this.textoBusquedaExamen.set('');
    this.justificacionApoyo.set('');
    this.observacionApoyo.set('');
    this.dropdownExamenAbierto.set(false);
  }

  eliminarExamenApoyo(indice: number): void {
    const lista = [...(this.ordenesApoyo() || [])];
    lista.splice(indice, 1);
    this.ordenesApoyoCambio.emit(lista);
    this.emitirTextoApoyo(lista);

    const maxPagina = Math.max(
      1,
      Math.ceil(lista.length / this.elementosPorPaginaApoyo),
    );
    if (this.paginaApoyo() > maxPagina) {
      this.paginaApoyo.set(maxPagina);
    }
  }

  private emitirTextoApoyo(lista: OrdenApoyoDiagnosticoItem[]): void {
    if (!lista || lista.length === 0) {
      this.textoApoyoGenerado.emit('');
      return;
    }

    const grupos = new Map<string, OrdenApoyoDiagnosticoItem[]>();
    for (const item of lista) {
      const servicio = (item.servicio || 'SERVICIO GENERAL')
        .toUpperCase()
        .trim();
      if (!grupos.has(servicio)) {
        grupos.set(servicio, []);
      }
      grupos.get(servicio)!.push(item);
    }

    const bloques: string[] = [
      'ÓRDENES DE EXÁMENES AUXILIARES Y APOYO AL DIAGNÓSTICO:',
    ];
    for (const [servicio, items] of grupos.entries()) {
      bloques.push(`\n• SERVICIO DE ${servicio}:`);
      for (const item of items) {
        const cantidadTexto =
          item.cantidad > 1 ? ` (${item.cantidad} unidades)` : ' (1 unidad)';
        bloques.push(`  - ${item.nombreProcedimiento}${cantidadTexto}`);
        if (item.codigoCIE10) {
          bloques.push(`    Diagnóstico asociado: ${item.codigoCIE10}`);
        }
        if (item.justificacion) {
          bloques.push(`    Justificación clínica: ${item.justificacion}`);
        }
        if (item.observacion) {
          bloques.push(`    Indicación adicional: ${item.observacion}`);
        }
      }
    }

    this.textoApoyoGenerado.emit(bloques.join('\n'));
  }

  // --- GESTIÓN DE PAQUETES ---

  abrirGestionPaquetes(
    tipoFiltro?: 'farmacia' | 'apoyo' | 'interconsultas' | 'procedimientos',
  ): void {
    if (tipoFiltro) {
      this.filtroTipoPaquete.set(tipoFiltro);
    } else {
      this.filtroTipoPaquete.set(this.subPestanaActiva());
    }
    this.modalPaquetesVisible.set(true);
  }

  cerrarGestionPaquetes(): void {
    this.modalPaquetesVisible.set(false);
  }

  aplicarPaquete(paquete: PaquetePlantilla): void {
    const diagnosticoCoincidente =
      this.obtenerDiagnosticoCoincidenteParaPaquete(paquete) ||
      this.diagnosticos()[0];

    const idDiagnosticoAsociado = diagnosticoCoincidente?.idDiagnostico;
    const codigoCie10Asociado = diagnosticoCoincidente?.codigoCIE10 || '';

    if (idDiagnosticoAsociado) {
      if (paquete.tipo === 'farmacia') {
        this.idDiagnosticoFarmacia.set(idDiagnosticoAsociado);
      } else if (paquete.tipo === 'apoyo') {
        this.idDiagnosticoApoyo.set(idDiagnosticoAsociado);
      } else if (paquete.tipo === 'interconsultas') {
        this.idDiagnosticoInterconsulta.set(idDiagnosticoAsociado);
      } else if (paquete.tipo === 'procedimientos') {
        this.idDiagnosticoProcedimiento.set(idDiagnosticoAsociado);
      }
    }

    if (paquete.tipo === 'farmacia' && paquete.itemsFarmacia) {
      const nuevosItems: ItemRecetaPrescripcion[] = paquete.itemsFarmacia.map(
        (item) => ({
          idProducto: item.idProducto ?? 0,
          codigo: item.codigo ?? 'MED-PAQ',
          nombre: item.nombre,
          concentracion: item.concentracion,
          formaFarmaceutica: item.formaFarmaceutica,
          dosis: item.dosis,
          unidadMedida: item.unidad,
          frecuencia: item.frecuencia,
          via: item.via,
          duracion: item.duracion,
          cantidad: item.cantidad,
          indicaciones: '',
          idDiagnostico: idDiagnosticoAsociado,
          codigoCIE10: codigoCie10Asociado,
        }),
      );

      const lista = [...(this.itemsReceta() || []), ...nuevosItems];
      this.itemsRecetaCambio.emit(lista);
      this.emitirTextoTratamiento(lista);
      this.subPestanaActiva.set('farmacia');
    } else if (paquete.tipo === 'apoyo' && paquete.itemsApoyo) {
      const nuevosApoyos: OrdenApoyoDiagnosticoItem[] = paquete.itemsApoyo.map(
        (item, indicePaquete) => ({
          idProducto:
            item.idProducto ??
            Date.now() + indicePaquete + Math.floor(Math.random() * 1000),
          codigo: item.codigo ?? 'AP-PAQ',
          nombreProcedimiento: item.nombre,
          servicio: item.servicio,
          idDiagnostico: idDiagnosticoAsociado,
          codigoCIE10: codigoCie10Asociado,
          cantidad: item.cantidad,
          justificacion: item.justificacion,
          observacion: '',
        }),
      );

      const lista = [...(this.ordenesApoyo() || []), ...nuevosApoyos];
      this.ordenesApoyoCambio.emit(lista);
      this.emitirTextoApoyo(lista);
      this.subPestanaActiva.set('apoyo');
    } else if (
      paquete.tipo === 'interconsultas' &&
      paquete.itemsInterconsulta
    ) {
      const nuevasInterconsultas: InterconsultaCEItem[] =
        paquete.itemsInterconsulta.map((item) => ({
          idDiagnostico: idDiagnosticoAsociado,
          codigoCIE10: codigoCie10Asociado,
          diagnosticoDescripcion: diagnosticoCoincidente?.descripcion || '',
          idEspecialidad: item.idEspecialidad,
          codigoEspecialidad: String(item.idEspecialidad),
          nombreEspecialidad: item.nombreEspecialidad,
          fechaPropuesta:
            this.fechaPropuestaInterconsulta() ||
            new Date().toISOString().split('T')[0],
          motivo: item.motivo,
          resumenEnfermedad: item.resumen,
          fechaCita: '',
          horaCita: '',
          medico: '',
        }));

      const lista = [...(this.interconsultas() || []), ...nuevasInterconsultas];
      this.interconsultasCambio.emit(lista);
      this.emitirTextoInterconsultas(lista);
      this.subPestanaActiva.set('interconsultas');
    } else if (
      paquete.tipo === 'procedimientos' &&
      paquete.itemsProcedimientos
    ) {
      const nuevosProcedimientos: OrdenProcedimientoCEItem[] =
        paquete.itemsProcedimientos.map((item, indicePaquete) => ({
          idProducto:
            item.idProducto ||
            Date.now() + indicePaquete + Math.floor(Math.random() * 1000),
          codigoCPMS: item.codigo,
          nombreProcedimiento: item.nombre,
          idDiagnostico: idDiagnosticoAsociado,
          codigoCIE10: codigoCie10Asociado,
          diagnosticoDescripcion: diagnosticoCoincidente?.descripcion || '',
          cantidad: 1,
          observacion: item.observacion,
        }));

      const lista = [
        ...(this.ordenesProcedimientos() || []),
        ...nuevosProcedimientos,
      ];
      this.ordenesProcedimientosCambio.emit(lista);
      this.emitirTextoProcedimientos(lista);
      this.subPestanaActiva.set('procedimientos');
    }

    this.cerrarGestionPaquetes();
  }

  async ngOnInit(): Promise<void> {
    await this.cargarEspecialidades();
  }

  async cargarEspecialidades(): Promise<void> {
    this.cargandoEspecialidades.set(true);
    try {
      const listado = await this.ceApiService.listarEspecialidades();
      if (listado.length > 0) {
        this.listaEspecialidades.set(listado);
      } else {
        this.listaEspecialidades.set(this.especialidadesPredefinidas);
      }
    } catch {
      this.listaEspecialidades.set(this.especialidadesPredefinidas);
    } finally {
      this.cargandoEspecialidades.set(false);
    }
  }

  // --- MÉTODOS DE INTERCONSULTAS ---

  agregarInterconsulta(): void {
    const idEspecialidad = Number(this.idEspecialidadInterconsulta()) || 0;
    const motivo = this.motivoInterconsulta().trim();
    const resumen = this.resumenEnfermedadInterconsulta().trim();

    if (!idEspecialidad) return;

    const espEncontrada = this.listaEspecialidades().find(
      (e) => e.id === idEspecialidad,
    );
    const nombreEspecialidad = espEncontrada
      ? espEncontrada.nombre
      : `Especialidad ${idEspecialidad}`;

    const idDx = Number(this.idDiagnosticoInterconsulta()) || 0;
    const dxEncontrado = this.resolverDiagnosticoAsociado(idDx);

    const nuevaInterconsulta: InterconsultaCEItem = {
      idDiagnostico: dxEncontrado?.idDiagnostico,
      codigoCIE10: dxEncontrado?.codigoCIE10 || '',
      diagnosticoDescripcion: dxEncontrado?.descripcion || '',
      idEspecialidad,
      codigoEspecialidad: String(idEspecialidad),
      nombreEspecialidad,
      fechaPropuesta:
        this.fechaPropuestaInterconsulta() ||
        new Date().toISOString().split('T')[0],
      motivo: motivo || 'OPINIÓN DIAGNÓSTICO Y SUGERENCIA',
      resumenEnfermedad: resumen,
      fechaCita: '',
      horaCita: '',
      medico: '',
    };

    const lista = [...(this.interconsultas() || []), nuevaInterconsulta];
    this.interconsultasCambio.emit(lista);
    this.emitirTextoInterconsultas(lista);

    // Limpiar campo de resumen
    this.resumenEnfermedadInterconsulta.set('');
  }

  eliminarInterconsulta(indice: number): void {
    const lista = [...(this.interconsultas() || [])];
    lista.splice(indice, 1);
    this.interconsultasCambio.emit(lista);
    this.emitirTextoInterconsultas(lista);

    const maxPagina = Math.max(
      1,
      Math.ceil(lista.length / this.elementosPorPaginaInterconsultas),
    );
    if (this.paginaInterconsultas() > maxPagina) {
      this.paginaInterconsultas.set(maxPagina);
    }
  }

  private emitirTextoInterconsultas(lista: InterconsultaCEItem[]): void {
    if (!lista || lista.length === 0) {
      this.textoInterconsultasGenerado.emit('');
      return;
    }

    const bloques: string[] = ['SOLICITUDES DE INTERCONSULTA MÉDICA:'];
    for (const item of lista) {
      bloques.push(
        `\n• ESPECIALIDAD: ${item.nombreEspecialidad.toUpperCase()}`,
      );
      if (item.motivo) {
        bloques.push(`  - Motivo de interconsulta: ${item.motivo}`);
      }
      if (item.codigoCIE10) {
        bloques.push(`  - Diagnóstico asociado: ${item.codigoCIE10}`);
      }
      if (item.fechaPropuesta) {
        bloques.push(`  - Fecha sugerida: ${item.fechaPropuesta}`);
      }
      if (item.resumenEnfermedad) {
        bloques.push(
          `  - Resumen de cuadro clínico: ${item.resumenEnfermedad}`,
        );
      }
    }

    this.textoInterconsultasGenerado.emit(bloques.join('\n'));
  }

  // --- MÉTODOS DE PROCEDIMIENTOS CLÍNICOS ---
  private temporizadorBusquedaProcedimiento: ReturnType<
    typeof setTimeout
  > | null = null;
  private identificadorPeticionProcedimiento = 0;

  alEscribirProcedimiento(): void {
    const termino = this.textoBusquedaProcedimiento().trim();
    if (this.temporizadorBusquedaProcedimiento) {
      clearTimeout(this.temporizadorBusquedaProcedimiento);
    }

    if (termino.length < 2) {
      this.resultadosProcedimientos.set([]);
      this.dropdownProcedimientoAbierto.set(false);
      this.buscandoProcedimiento.set(false);
      return;
    }

    this.buscandoProcedimiento.set(true);
    this.temporizadorBusquedaProcedimiento = setTimeout(async () => {
      const identificadorActual = ++this.identificadorPeticionProcedimiento;
      try {
        const items = await this.ceApiService.buscarExamenesApoyo(termino);
        if (identificadorActual === this.identificadorPeticionProcedimiento) {
          this.resultadosProcedimientos.set(items);
          this.dropdownProcedimientoAbierto.set(items.length > 0);
        }
      } catch {
        if (identificadorActual === this.identificadorPeticionProcedimiento) {
          this.resultadosProcedimientos.set([]);
        }
      } finally {
        if (identificadorActual === this.identificadorPeticionProcedimiento) {
          this.buscandoProcedimiento.set(false);
        }
      }
    }, 250);
  }

  seleccionarProcedimiento(item: ExamenApoyoBusquedaItem): void {
    this.procedimientoSeleccionado.set(item);
    this.textoBusquedaProcedimiento.set(
      `${item.codigo ? `${item.codigo} - ` : ''}${item.nombre}`,
    );
    this.dropdownProcedimientoAbierto.set(false);
  }

  seleccionarProcedimientoFrecuente(idProducto: number): void {
    const encontrado = this.procedimientosFrecuentes.find(
      (p) => p.idProducto === idProducto,
    );
    if (!encontrado) return;
    this.procedimientoSeleccionado.set({
      idProducto: encontrado.idProducto,
      codigo: encontrado.codigo,
      nombre: encontrado.nombre,
      tipo: 'PROCEDIMIENTO',
      esCPT: true,
    });
    this.textoBusquedaProcedimiento.set(
      `${encontrado.codigo} - ${encontrado.nombre}`,
    );
  }

  agregarOrdenProcedimiento(): void {
    const proc = this.procedimientoSeleccionado();
    const textoManual = this.textoBusquedaProcedimiento().trim();
    if (!proc && !textoManual) return;

    const idDx = Number(this.idDiagnosticoProcedimiento()) || 0;
    const dxEncontrado = this.resolverDiagnosticoAsociado(idDx);

    const idProductoFinal =
      proc && proc.idProducto
        ? proc.idProducto
        : Date.now() + Math.floor(Math.random() * 1000);

    const nuevoProcedimiento: OrdenProcedimientoCEItem = {
      idProducto: idProductoFinal,
      codigoCPMS: proc ? proc.codigo : 'CPMS',
      nombreProcedimiento: proc ? proc.nombre : textoManual,
      idDiagnostico: dxEncontrado?.idDiagnostico,
      codigoCIE10: dxEncontrado?.codigoCIE10 || '',
      diagnosticoDescripcion: dxEncontrado?.descripcion || '',
      cantidad: Math.max(1, Number(this.cantidadProcedimiento()) || 1),
      observacion: this.observacionProcedimiento().trim() || 'HTA',
    };

    const lista = [...(this.ordenesProcedimientos() || []), nuevoProcedimiento];
    this.ordenesProcedimientosCambio.emit(lista);
    this.emitirTextoProcedimientos(lista);

    // Limpiar campos
    this.procedimientoSeleccionado.set(null);
    this.textoBusquedaProcedimiento.set('');
    this.observacionProcedimiento.set('');
    this.cantidadProcedimiento.set(1);
    this.dropdownProcedimientoAbierto.set(false);
  }

  eliminarOrdenProcedimiento(indice: number): void {
    const lista = [...(this.ordenesProcedimientos() || [])];
    lista.splice(indice, 1);
    this.ordenesProcedimientosCambio.emit(lista);
    this.emitirTextoProcedimientos(lista);

    const maxPagina = Math.max(
      1,
      Math.ceil(lista.length / this.elementosPorPaginaProcedimientos),
    );
    if (this.paginaProcedimientos() > maxPagina) {
      this.paginaProcedimientos.set(maxPagina);
    }
  }

  private emitirTextoProcedimientos(lista: OrdenProcedimientoCEItem[]): void {
    if (!lista || lista.length === 0) {
      this.textoProcedimientosGenerado.emit('');
      return;
    }

    const bloques: string[] = ['ÓRDENES DE PROCEDIMIENTOS MÉDICOS:'];
    for (const item of lista) {
      const cantidadTexto =
        item.cantidad > 1 ? ` (${item.cantidad} unidades)` : ' (1 unidad)';
      bloques.push(`\n• ${item.nombreProcedimiento}${cantidadTexto}`);
      if (item.codigoCIE10) {
        bloques.push(`  - Diagnóstico asociado: ${item.codigoCIE10}`);
      }
      if (item.observacion) {
        bloques.push(`  - Indicación clínica: ${item.observacion}`);
      }
    }

    this.textoProcedimientosGenerado.emit(bloques.join('\n'));
  }

  filtrarTeclasEntero(evento: KeyboardEvent): void {
    const permitidas = [
      'Backspace',
      'Delete',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
    ];
    if (permitidas.includes(evento.key)) return;
    if (evento.ctrlKey || evento.metaKey) return;
    if (!/^[0-9]$/.test(evento.key)) {
      evento.preventDefault();
    }
  }
}
