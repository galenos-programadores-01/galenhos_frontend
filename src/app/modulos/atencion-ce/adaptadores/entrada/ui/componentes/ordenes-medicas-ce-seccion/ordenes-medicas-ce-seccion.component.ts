import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  input,
  type OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  readonly tipo: 'farmacia' | 'apoyo';
  readonly itemsFarmacia?: readonly PaqueteFarmaciaItem[];
  readonly itemsApoyo?: readonly {
    readonly nombre: string;
    readonly servicio: string;
    readonly cantidad: number;
    readonly justificacion: string;
  }[];
}

@Component({
  selector: 'app-ordenes-medicas-ce-seccion',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectGlobalComponent],
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

  // --- Sub-pestaña 1: FARMACIA ---
  readonly idDiagnosticoFarmacia = signal<number>(0);
  readonly textoBusquedaMedicamento = signal<string>('');
  readonly resultadosMedicamentos = signal<readonly IBienInsumoItem[]>([]);
  readonly buscandoMedicamento = signal<boolean>(false);
  readonly dropdownMedicamentoAbierto = signal<boolean>(false);
  readonly medicamentoSeleccionado = signal<IBienInsumoItem | null>(null);

  readonly cantidadMed = signal<number>(30);
  readonly dosisMed = signal<string>('1');
  readonly unidadMed = signal<string>('TAB');
  readonly frecuenciaMed = signal<string>('C\\24 HORAS');
  readonly viaMed = signal<string>('ORAL');
  readonly duracionMed = signal<string>('30 DÍAS');

  readonly unidadesComunes = [
    'TAB',
    'CAP',
    'FCO',
    'AMP',
    'UNID',
    'GEL',
    'CREMA',
    'SUSP',
    'INHAL',
  ];
  readonly viasComunes = [
    'ORAL',
    'EV',
    'IM',
    'SUBCUTÁNEA',
    'TÓPICA',
    'INHALATORIA',
    'OFTÁLMICA',
    'NASAL',
    'RECTAL',
  ];
  readonly frecuenciasComunes = [
    'C\\24 HORAS',
    'C\\12 HORAS',
    'C\\8 HORAS',
    'C\\6 HORAS',
    'C\\4 HORAS',
    'CONDICIONAL',
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
  readonly paquetesDisponibles: readonly PaquetePlantilla[] = [
    {
      id: 'paq-hta',
      titulo: 'Paquete HTA (Hipertensión Arterial)',
      descripcion:
        'Tratamiento antihipertensivo oral estándar para control mensual.',
      tipo: 'farmacia',
      itemsFarmacia: [
        {
          nombre: 'LOSARTAN POTASICO',
          concentracion: '50 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TAB',
          frecuencia: 'C\\12 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 60,
        },
        {
          nombre: 'AMLODIPINO (COMO BESILATO)',
          concentracion: '10 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TAB',
          frecuencia: 'C\\24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
        {
          nombre: 'BISOPROLOL FUMARATO',
          concentracion: '5 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TAB',
          frecuencia: 'C\\24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
        {
          nombre: 'HIDROCLOROTIAZIDA',
          concentracion: '12.5 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TAB',
          frecuencia: 'C\\24 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 30,
        },
        {
          nombre: 'LOSARTAN POTASICO',
          concentracion: '50 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TAB',
          frecuencia: 'C\\12 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 60,
        },
      ],
    },
    {
      id: 'paq-dm2',
      titulo: 'Paquete Diabetes Mellitus Tipo 2',
      descripcion: 'Control glicémico oral mensual.',
      tipo: 'farmacia',
      itemsFarmacia: [
        {
          nombre: 'METFORMINA CLORHIDRATO',
          concentracion: '850 MG',
          formaFarmaceutica: 'TABLETA',
          dosis: '1',
          unidad: 'TAB',
          frecuencia: 'C\\12 HORAS',
          via: 'ORAL',
          duracion: '30 DÍAS',
          cantidad: 60,
        },
      ],
    },
    {
      id: 'paq-lab-basico',
      titulo: 'Perfil Metabólico y Renal Básico',
      descripcion:
        'Batería de análisis clínicos esenciales para control crónico.',
      tipo: 'apoyo',
      itemsApoyo: [
        {
          nombre: 'HEMOGRAMA COMPLETO AUTOMATIZADO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Control ambulatorio anual / descarte de anemia',
        },
        {
          nombre: 'GLUCOSA EN SUERO',
          servicio: 'LABORATORIO',
          cantidad: 1,
          justificacion: 'Descarte y monitoreo glicémico',
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
          justificacion: 'Control de riesgo cardiovascular',
        },
      ],
    },
    {
      id: 'paq-cardio-imagen',
      titulo: 'Evaluación Cardiovascular e Imágenes',
      descripcion:
        'Estudio de radiografía y electrocardiografía para paciente ambulatorio.',
      tipo: 'apoyo',
      itemsApoyo: [
        {
          nombre: 'ELECTROCARDIOGRAMA DE 12 DERIVACIONES',
          servicio: 'CARDIOLOGÍA',
          cantidad: 1,
          justificacion: 'Control de arritmia / evaluación cardiológica',
        },
        {
          nombre: 'RADIOGRAFÍA DE TÓRAX (FRONTAL)',
          servicio: 'DIAGNÓSTICO POR IMÁGENES',
          cantidad: 1,
          justificacion: 'Evaluación de silueta cardíaca y campos pulmonares',
        },
      ],
    },
  ];

  cambiarSubPestana(
    pestana: 'farmacia' | 'apoyo' | 'interconsultas' | 'procedimientos',
  ): void {
    this.subPestanaActiva.set(pestana);
  }

  // --- MÉTODOS DE FARMACIA ---

  async alEscribirMedicamento(): Promise<void> {
    const termino = this.textoBusquedaMedicamento().trim();
    if (termino.length < 2) {
      this.resultadosMedicamentos.set([]);
      this.dropdownMedicamentoAbierto.set(false);
      return;
    }

    this.buscandoMedicamento.set(true);
    try {
      const respuesta = await this.bienesService.listar({
        filtro: termino,
        page: 1,
        pageSize: 10,
      });
      this.resultadosMedicamentos.set(respuesta.items);
      this.dropdownMedicamentoAbierto.set(respuesta.items.length > 0);
    } catch {
      this.resultadosMedicamentos.set([]);
    } finally {
      this.buscandoMedicamento.set(false);
    }
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

  agregarMedicamento(): void {
    const med = this.medicamentoSeleccionado();
    if (!med) return;

    // Obtener diagnóstico seleccionado o el primero disponible
    const idDx = Number(this.idDiagnosticoFarmacia()) || 0;
    const dxEncontrado =
      this.diagnosticos().find((d) => d.idDiagnostico === idDx) ||
      this.diagnosticos()[0];

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

  eliminarMedicamento(indice: number): void {
    const lista = [...(this.itemsReceta() || [])];
    lista.splice(indice, 1);
    this.itemsRecetaCambio.emit(lista);
    this.emitirTextoTratamiento(lista);
  }

  private emitirTextoTratamiento(lista: ItemRecetaPrescripcion[]): void {
    const lineas = lista.map((item, index) => {
      return `${index + 1}. ${item.nombre} ${item.concentracion} (${item.formaFarmaceutica || item.unidadMedida}) - Cant: ${item.cantidad}\n   Indicación: ${item.dosis} ${item.unidadMedida || 'TAB'} vía ${item.via}, ${item.frecuencia} por ${item.duracion} [Dx: ${item.codigoCIE10 || 'General'}].`;
    });
    this.textoTratamientoGenerado.emit(lineas.join('\n\n'));
  }

  // --- MÉTODOS DE APOYO AL DIAGNÓSTICO ---

  async alEscribirExamen(): Promise<void> {
    const termino = this.textoBusquedaExamen().trim();
    if (termino.length < 2) {
      this.resultadosExamenes.set([]);
      this.dropdownExamenAbierto.set(false);
      return;
    }

    this.buscandoExamen.set(true);
    try {
      const items = await this.ceApiService.buscarExamenesApoyo(termino);
      this.resultadosExamenes.set(items);
      this.dropdownExamenAbierto.set(items.length > 0);
    } catch {
      this.resultadosExamenes.set([]);
    } finally {
      this.buscandoExamen.set(false);
    }
  }

  seleccionarExamen(item: ExamenApoyoBusquedaItem): void {
    this.examenSeleccionado.set(item);
    this.textoBusquedaExamen.set(`${item.codigo} - ${item.nombre}`);
    this.dropdownExamenAbierto.set(false);

    if (item.tipo) {
      const tipoUp = item.tipo.toUpperCase();
      if (
        tipoUp.includes('IMAG') ||
        tipoUp.includes('RAY') ||
        tipoUp.includes('ECO')
      ) {
        this.servicioApoyo.set('DIAGNÓSTICO POR IMÁGENES');
      } else {
        this.servicioApoyo.set('LABORATORIO');
      }
    }
  }

  agregarExamenApoyo(): void {
    const ex = this.examenSeleccionado();
    const textoManual = this.textoBusquedaExamen().trim();
    if (!ex && !textoManual) return;

    const idDx = Number(this.idDiagnosticoApoyo()) || 0;
    const dxEncontrado =
      this.diagnosticos().find((d) => d.idDiagnostico === idDx) ||
      this.diagnosticos()[0];

    const nuevoItem: OrdenApoyoDiagnosticoItem = {
      idProducto: ex ? ex.idProducto : 0,
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
  }

  private emitirTextoApoyo(lista: OrdenApoyoDiagnosticoItem[]): void {
    const lineas = lista.map((item, index) => {
      let l = `${index + 1}. [${item.servicio}] ${item.nombreProcedimiento} (Cant: ${item.cantidad}) - Dx: ${item.codigoCIE10 || 'General'}`;
      if (item.justificacion) l += ` | Justif: ${item.justificacion}`;
      if (item.observacion) l += ` | Obs: ${item.observacion}`;
      return l;
    });
    this.textoApoyoGenerado.emit(lineas.join('\n'));
  }

  // --- GESTIÓN DE PAQUETES ---

  abrirGestionPaquetes(): void {
    this.modalPaquetesVisible.set(true);
  }

  cerrarGestionPaquetes(): void {
    this.modalPaquetesVisible.set(false);
  }

  aplicarPaquete(paquete: PaquetePlantilla): void {
    const idDxSeleccionado =
      paquete.tipo === 'farmacia'
        ? Number(this.idDiagnosticoFarmacia())
        : Number(this.idDiagnosticoApoyo());

    const dxActivo =
      this.diagnosticos().find((d) => d.idDiagnostico === idDxSeleccionado) ||
      this.diagnosticos()[0];

    if (paquete.tipo === 'farmacia' && paquete.itemsFarmacia) {
      const nuevosItems: ItemRecetaPrescripcion[] = paquete.itemsFarmacia.map(
        (item) => ({
          idProducto: Math.floor(Math.random() * 100000) + 1000,
          codigo: 'MED-PAQ',
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
          idDiagnostico: dxActivo?.idDiagnostico,
          codigoCIE10:
            dxActivo?.codigoCIE10 ||
            (paquete.id === 'paq-hta' ? 'I11.9' : 'E11.9'),
        }),
      );

      const lista = [...(this.itemsReceta() || []), ...nuevosItems];
      this.itemsRecetaCambio.emit(lista);
      this.emitirTextoTratamiento(lista);
    } else if (paquete.tipo === 'apoyo' && paquete.itemsApoyo) {
      const nuevosApoyos: OrdenApoyoDiagnosticoItem[] = paquete.itemsApoyo.map(
        (item) => ({
          idProducto: Math.floor(Math.random() * 100000) + 1000,
          codigo: 'AP-PAQ',
          nombreProcedimiento: item.nombre,
          servicio: item.servicio,
          idDiagnostico: dxActivo?.idDiagnostico,
          codigoCIE10:
            dxActivo?.codigoCIE10 ||
            (paquete.id === 'paq-lab-basico' ? 'Z00.0' : 'I11.9'),
          cantidad: item.cantidad,
          justificacion: item.justificacion,
          observacion: '',
        }),
      );

      const lista = [...(this.ordenesApoyo() || []), ...nuevosApoyos];
      this.ordenesApoyoCambio.emit(lista);
      this.emitirTextoApoyo(lista);
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
    const dxEncontrado =
      this.diagnosticos().find((d) => d.idDiagnostico === idDx) ||
      this.diagnosticos()[0];

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
  }

  private emitirTextoInterconsultas(lista: InterconsultaCEItem[]): void {
    const lineas = lista.map((item, index) => {
      let l = `${index + 1}. Interconsulta a ${item.nombreEspecialidad} (Fecha Propuesta: ${item.fechaPropuesta}) - Motivo: ${item.motivo}`;
      if (item.codigoCIE10) l += ` [Dx: ${item.codigoCIE10}]`;
      if (item.resumenEnfermedad)
        l += `\n   Resumen: ${item.resumenEnfermedad}`;
      return l;
    });
    this.textoInterconsultasGenerado.emit(lineas.join('\n\n'));
  }

  // --- MÉTODOS DE PROCEDIMIENTOS CLÍNICOS ---

  async alEscribirProcedimiento(): Promise<void> {
    const termino = this.textoBusquedaProcedimiento().trim();
    if (termino.length < 2) {
      this.resultadosProcedimientos.set([]);
      this.dropdownProcedimientoAbierto.set(false);
      return;
    }

    this.buscandoProcedimiento.set(true);
    try {
      const items = await this.ceApiService.buscarExamenesApoyo(termino);
      this.resultadosProcedimientos.set(items);
      this.dropdownProcedimientoAbierto.set(items.length > 0);
    } catch {
      this.resultadosProcedimientos.set([]);
    } finally {
      this.buscandoProcedimiento.set(false);
    }
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
    const dxEncontrado =
      this.diagnosticos().find((d) => d.idDiagnostico === idDx) ||
      this.diagnosticos()[0];

    const nuevoProcedimiento: OrdenProcedimientoCEItem = {
      idProducto: proc ? proc.idProducto : 0,
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
  }

  private emitirTextoProcedimientos(lista: OrdenProcedimientoCEItem[]): void {
    const lineas = lista.map((item, index) => {
      let l = `${index + 1}. Orden de Procedimiento: ${item.nombreProcedimiento} (Cant: ${item.cantidad})`;
      if (item.codigoCIE10) l += ` [Dx: ${item.codigoCIE10}]`;
      if (item.observacion) l += ` | Obs: ${item.observacion}`;
      return l;
    });
    this.textoProcedimientosGenerado.emit(lineas.join('\n'));
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
