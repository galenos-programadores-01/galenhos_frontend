import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  type OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginacionComponent } from '../../../../../../../compartido/ui/paginacion/paginacion';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import {
  obtenerReglaLabDiagnostico,
  type ReglaLabDiagnostico,
} from '../../../../../aplicacion/diagnosticos-labs-reglas.helper';
import type {
  AtencionDiagnosticoCEItem,
  AtencionProcedimientoCEItem,
  CatalogoLabHISItem,
} from '../../../../../tipos/atencion-ce.tipos';
import {
  AtencionCEApiService,
  type DiagnosticoBusquedaItem,
  type ProcedimientoBusquedaItem,
} from '../../../../salida/http/atencion-ce.api.service';

@Component({
  selector: 'app-diagnosticos-ce-seccion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectGlobalComponent,
    PaginacionComponent,
  ],
  templateUrl: './diagnosticos-ce-seccion.component.html',
})
export class DiagnosticosCeSeccionComponent implements OnInit {
  private readonly apiService = inject(AtencionCEApiService);

  readonly diagnosticos = input.required<AtencionDiagnosticoCEItem[]>();
  readonly diagnosticosCambio = output<AtencionDiagnosticoCEItem[]>();

  readonly procedimientos = input<AtencionProcedimientoCEItem[]>([]);
  readonly procedimientosCambio = output<AtencionProcedimientoCEItem[]>();

  readonly inforCompDiagMed = input<string>('');
  readonly inforCompDiagMedCambio = output<string>();

  readonly catalogoLabs = signal<readonly CatalogoLabHISItem[]>([]);

  readonly opcionesLabsCompletas = computed(() => {
    const opcionesEspeciales: readonly CatalogoLabHISItem[] = [
      { codigo: -1, valor: '1', descripcion: 'Control 1' },
      { codigo: -2, valor: '2', descripcion: 'Control 2' },
      { codigo: -3, valor: '3', descripcion: 'Control 3' },
      { codigo: -4, valor: '4', descripcion: 'Control 4' },
      { codigo: -5, valor: '5', descripcion: 'Control 5' },
      { codigo: -6, valor: '6', descripcion: 'Control 6' },
      { codigo: -12, valor: '12', descripcion: 'Semana 12' },
      { codigo: -24, valor: '24', descripcion: 'Semana 24' },
      { codigo: -36, valor: '36', descripcion: 'Semana 36' },
    ];
    return [...opcionesEspeciales, ...this.catalogoLabs()];
  });

  esOpcionCatalogo(valor: string | undefined): boolean {
    if (!valor || !valor.trim()) return true;
    const normalizado = valor.trim().toUpperCase();
    return this.opcionesLabsCompletas().some(
      (item) => item.valor.toUpperCase() === normalizado,
    );
  }

  readonly textoBusqueda = signal<string>('');
  readonly resultadosBusqueda = signal<readonly DiagnosticoBusquedaItem[]>([]);
  readonly buscando = signal<boolean>(false);
  readonly dropdownAbierto = signal<boolean>(false);
  readonly sinResultados = signal<boolean>(false);
  readonly diagnosticoSeleccionado = signal<DiagnosticoBusquedaItem | null>(
    null,
  );

  readonly tipoSeleccionado = signal<'P' | 'D' | 'R'>('D');
  readonly lab1Seleccionado = signal<string>('');
  readonly lab2Seleccionado = signal<string>('');
  readonly lab3Seleccionado = signal<string>('');
  readonly reglaDiagnosticoActivo = signal<ReglaLabDiagnostico | null>(null);

  private temporizadorBusquedaDiagnostico: ReturnType<
    typeof setTimeout
  > | null = null;
  private identificadorPeticionDiagnostico = 0;

  readonly paginaDiagnosticos = signal<number>(1);
  readonly elementosPorPaginaDiagnosticos = 5;

  readonly totalPaginasDiagnosticos = computed(() =>
    Math.max(
      1,
      Math.ceil(
        this.diagnosticos().length / this.elementosPorPaginaDiagnosticos,
      ),
    ),
  );

  readonly diagnosticosPaginados = computed(() => {
    const inicio =
      (this.paginaDiagnosticos() - 1) * this.elementosPorPaginaDiagnosticos;
    return this.diagnosticos().slice(
      inicio,
      inicio + this.elementosPorPaginaDiagnosticos,
    );
  });

  // Búsqueda y Registro de Procedimientos Médicos (CPMS / CPT)
  readonly paginaProcedimientos = signal<number>(1);
  readonly elementosPorPaginaProcedimientos = 5;

  readonly totalPaginasProcedimientos = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.procedimientos()?.length || 0) /
          this.elementosPorPaginaProcedimientos,
      ),
    ),
  );

  readonly procedimientosPaginados = computed(() => {
    const lista = this.procedimientos() || [];
    const inicio =
      (this.paginaProcedimientos() - 1) * this.elementosPorPaginaProcedimientos;
    return lista.slice(inicio, inicio + this.elementosPorPaginaProcedimientos);
  });

  readonly textoBusquedaProcedimiento = signal<string>('');
  readonly resultadosProcedimientos = signal<
    readonly ProcedimientoBusquedaItem[]
  >([]);
  readonly buscandoProcedimientos = signal<boolean>(false);
  readonly dropdownProcedimientosAbierto = signal<boolean>(false);
  readonly procedimientoSeleccionado = signal<ProcedimientoBusquedaItem | null>(
    null,
  );
  private temporizadorBusquedaProcedimiento: ReturnType<
    typeof setTimeout
  > | null = null;
  private identificadorPeticionProcedimiento = 0;

  readonly idDiagnosticoAsociado = signal<number>(0);
  readonly cantidadProcedimiento = signal<number>(1);
  readonly lab1Procedimiento = signal<string>('');
  readonly lab2Procedimiento = signal<string>('');
  readonly lab3Procedimiento = signal<string>('');

  // Modal de Detalle de Procedimiento
  readonly modalDetalleVisible = signal<boolean>(false);
  readonly procedimientoDetalle = signal<AtencionProcedimientoCEItem | null>(
    null,
  );

  async ngOnInit(): Promise<void> {
    await this.cargarCatalogoLabs();
  }

  async cargarCatalogoLabs(): Promise<void> {
    try {
      const items = await this.apiService.listarCatalogoLabs();
      this.catalogoLabs.set(items);
    } catch {
      this.catalogoLabs.set([]);
    }
  }

  alEscribirBusqueda(): void {
    if (this.temporizadorBusquedaDiagnostico) {
      clearTimeout(this.temporizadorBusquedaDiagnostico);
    }

    const texto = this.textoBusqueda().trim();
    if (texto.length < 2) {
      this.resultadosBusqueda.set([]);
      this.dropdownAbierto.set(false);
      this.sinResultados.set(false);
      this.buscando.set(false);
      return;
    }

    this.buscando.set(true);
    this.sinResultados.set(false);
    this.dropdownAbierto.set(true);

    this.temporizadorBusquedaDiagnostico = setTimeout(() => {
      this.ejecutarBusquedaDiagnostico(texto);
    }, 250);
  }

  buscarDiagnosticoInmediato(): void {
    if (this.temporizadorBusquedaDiagnostico) {
      clearTimeout(this.temporizadorBusquedaDiagnostico);
    }
    const texto = this.textoBusqueda().trim();
    if (texto.length < 2) {
      return;
    }
    this.ejecutarBusquedaDiagnostico(texto);
  }

  async ejecutarBusquedaDiagnostico(termino: string): Promise<void> {
    const texto = termino.trim();
    if (texto.length < 2) {
      this.resultadosBusqueda.set([]);
      this.dropdownAbierto.set(false);
      this.sinResultados.set(false);
      this.buscando.set(false);
      return;
    }

    this.buscando.set(true);
    this.sinResultados.set(false);
    this.dropdownAbierto.set(true);
    const identificadorActual = ++this.identificadorPeticionDiagnostico;

    try {
      const items = await this.apiService.buscarDiagnosticos(texto);
      if (identificadorActual === this.identificadorPeticionDiagnostico) {
        const itemsOrdenados = this.ordenarDiagnosticosPorRelevancia(
          items,
          texto,
        );
        this.resultadosBusqueda.set(itemsOrdenados);
        this.sinResultados.set(itemsOrdenados.length === 0);
        this.dropdownAbierto.set(true);
      }
    } catch {
      if (identificadorActual === this.identificadorPeticionDiagnostico) {
        this.resultadosBusqueda.set([]);
        this.sinResultados.set(true);
      }
    } finally {
      if (identificadorActual === this.identificadorPeticionDiagnostico) {
        this.buscando.set(false);
      }
    }
  }

  limpiarBusqueda(): void {
    if (this.temporizadorBusquedaDiagnostico) {
      clearTimeout(this.temporizadorBusquedaDiagnostico);
    }
    this.textoBusqueda.set('');
    this.resultadosBusqueda.set([]);
    this.sinResultados.set(false);
    this.dropdownAbierto.set(false);
    this.buscando.set(false);
  }

  cerrarDropdown(): void {
    setTimeout(() => {
      this.dropdownAbierto.set(false);
    }, 200);
  }

  private ordenarDiagnosticosPorRelevancia(
    items: readonly DiagnosticoBusquedaItem[],
    termino: string,
  ): readonly DiagnosticoBusquedaItem[] {
    const busqueda = termino.toUpperCase().trim();
    return [...items].sort((a, b) => {
      const codigoA = a.codigoCIE10.toUpperCase().trim();
      const codigoB = b.codigoCIE10.toUpperCase().trim();
      const descripcionA = a.descripcion.toUpperCase().trim();
      const descripcionB = b.descripcion.toUpperCase().trim();

      const exactoCodigoA = codigoA === busqueda ? 1 : 0;
      const exactoCodigoB = codigoB === busqueda ? 1 : 0;
      if (exactoCodigoA !== exactoCodigoB) return exactoCodigoB - exactoCodigoA;

      const prefijoCodigoA = codigoA.startsWith(busqueda) ? 1 : 0;
      const prefijoCodigoB = codigoB.startsWith(busqueda) ? 1 : 0;
      if (prefijoCodigoA !== prefijoCodigoB)
        return prefijoCodigoB - prefijoCodigoA;

      const prefijoDescripcionA = descripcionA.startsWith(busqueda) ? 1 : 0;
      const prefijoDescripcionB = descripcionB.startsWith(busqueda) ? 1 : 0;
      if (prefijoDescripcionA !== prefijoDescripcionB)
        return prefijoDescripcionB - prefijoDescripcionA;

      return descripcionA.localeCompare(descripcionB);
    });
  }

  seleccionarDiagnostico(item: DiagnosticoBusquedaItem): void {
    this.diagnosticoSeleccionado.set(item);
    this.textoBusqueda.set(
      `${item.codigoCIE10.trim()} - ${item.descripcion.trim()}`,
    );
    this.dropdownAbierto.set(false);
    this.sinResultados.set(false);

    const regla = obtenerReglaLabDiagnostico(item.codigoCIE10);
    this.reglaDiagnosticoActivo.set(regla);

    if (regla) {
      if (regla.lab1Defecto !== undefined) {
        this.lab1Seleccionado.set(regla.lab1Defecto);
      }
      if (regla.lab2Defecto !== undefined) {
        this.lab2Seleccionado.set(regla.lab2Defecto);
      }
      if (regla.lab3Defecto !== undefined) {
        this.lab3Seleccionado.set(regla.lab3Defecto);
      }
    } else {
      this.lab1Seleccionado.set('');
      this.lab2Seleccionado.set('');
      this.lab3Seleccionado.set('');
    }
  }

  deseleccionarDiagnostico(): void {
    this.diagnosticoSeleccionado.set(null);
    this.limpiarBusqueda();
    this.lab1Seleccionado.set('');
    this.lab2Seleccionado.set('');
    this.lab3Seleccionado.set('');
    this.reglaDiagnosticoActivo.set(null);
  }

  registrarDiagnostico(): void {
    const item = this.diagnosticoSeleccionado();
    if (!item) return;

    const listaActual = [...this.diagnosticos()];
    const yaExiste = listaActual.some(
      (dx) => dx.idDiagnostico === item.idDiagnostico,
    );
    if (yaExiste) {
      this.limpiarFormularioDiagnostico();
      return;
    }

    const idClasificacionDx = this.resolverIdClasificacion(
      this.tipoSeleccionado(),
    );

    const nuevoDx: AtencionDiagnosticoCEItem = {
      idDiagnostico: item.idDiagnostico,
      codigoCIE10: item.codigoCIE10,
      descripcion: item.descripcion,
      idClasificacionDx,
      clasificacion: this.tipoSeleccionado(),
      idSubclasificacionDx: listaActual.length === 0 ? 1 : 2,
      labConfHIS: this.tipoSeleccionado(),
      labConfHIS1: this.lab1Seleccionado(),
      labConfHIS2: this.lab2Seleccionado(),
      labConfHIS3: this.lab3Seleccionado(),
    };

    listaActual.push(nuevoDx);
    this.diagnosticosCambio.emit(listaActual);

    if (!this.idDiagnosticoAsociado() || this.idDiagnosticoAsociado() === 0) {
      this.idDiagnosticoAsociado.set(nuevoDx.idDiagnostico);
    }

    this.limpiarFormularioDiagnostico();
  }

  limpiarFormularioDiagnostico(): void {
    this.diagnosticoSeleccionado.set(null);
    this.textoBusqueda.set('');
    this.resultadosBusqueda.set([]);
    this.dropdownAbierto.set(false);
    this.lab1Seleccionado.set('');
    this.lab2Seleccionado.set('');
    this.lab3Seleccionado.set('');
    this.reglaDiagnosticoActivo.set(null);
  }

  eliminarDiagnostico(indice: number): void {
    const lista = [...this.diagnosticos()];
    const dxEliminado = lista[indice];
    lista.splice(indice, 1);
    if (
      lista.length > 0 &&
      !lista.some((dx) => dx.idSubclasificacionDx === 1)
    ) {
      lista[0].idSubclasificacionDx = 1;
    }
    this.diagnosticosCambio.emit(lista);

    const maxPagina = Math.max(
      1,
      Math.ceil(lista.length / this.elementosPorPaginaDiagnosticos),
    );
    if (this.paginaDiagnosticos() > maxPagina) {
      this.paginaDiagnosticos.set(maxPagina);
    }

    if (this.idDiagnosticoAsociado() === dxEliminado?.idDiagnostico) {
      this.idDiagnosticoAsociado.set(lista[0]?.idDiagnostico || 0);
    }
  }

  marcarComoPrincipal(indiceSeleccionado: number): void {
    const lista = [...this.diagnosticos()];
    if (indiceSeleccionado < 0 || indiceSeleccionado >= lista.length) {
      return;
    }

    const [dxPrincipal] = lista.splice(indiceSeleccionado, 1);
    dxPrincipal.idSubclasificacionDx = 1;

    for (const dx of lista) {
      dx.idSubclasificacionDx = 2;
    }

    const nuevaLista = [dxPrincipal, ...lista];
    this.diagnosticosCambio.emit(nuevaLista);
    this.idDiagnosticoAsociado.set(dxPrincipal.idDiagnostico);
  }

  cambiarTipoDiagnostico(indice: number, nuevoTipo: 'P' | 'D' | 'R'): void {
    const lista = [...this.diagnosticos()];
    lista[indice].clasificacion = nuevoTipo;
    lista[indice].idClasificacionDx = this.resolverIdClasificacion(nuevoTipo);
    lista[indice].labConfHIS = nuevoTipo;
    this.diagnosticosCambio.emit(lista);
  }

  private resolverIdClasificacion(tipo: 'P' | 'D' | 'R'): number {
    if (tipo === 'D') return 2;
    if (tipo === 'R') return 3;
    return 1;
  }

  actualizarLabFila(
    indice: number,
    campo: 'labConfHIS' | 'labConfHIS1' | 'labConfHIS2' | 'labConfHIS3',
    valor: unknown,
  ): void {
    const texto = typeof valor === 'string' ? valor.trim().toUpperCase() : '';
    const lista = [...this.diagnosticos()];
    lista[indice] = {
      ...lista[indice],
      [campo]: texto,
    };
    this.diagnosticosCambio.emit(lista);
  }

  cambiarClasificacionFila(indice: number, nuevaClasificacion: unknown): void {
    const valor =
      typeof nuevaClasificacion === 'string'
        ? (nuevaClasificacion.toUpperCase() as 'P' | 'D' | 'R')
        : 'D';
    const lista = [...this.diagnosticos()];
    if (indice >= 0 && indice < lista.length) {
      let idClasificacion = 1;
      if (valor === 'D') {
        idClasificacion = 2;
      } else if (valor === 'R') {
        idClasificacion = 3;
      }
      lista[indice] = {
        ...lista[indice],
        clasificacion: valor,
        idClasificacionDx: idClasificacion,
        labConfHIS: valor,
      };
      this.diagnosticosCambio.emit(lista);
    }
  }

  actualizarInformacionComplementaria(texto: string): void {
    this.inforCompDiagMedCambio.emit(texto);
  }

  // --- Procedimientos Médicos (CPMS / CPT) ---

  alEscribirBusquedaProcedimiento(): void {
    const texto = this.textoBusquedaProcedimiento().trim();
    if (this.temporizadorBusquedaProcedimiento) {
      clearTimeout(this.temporizadorBusquedaProcedimiento);
    }

    if (texto.length < 2) {
      this.resultadosProcedimientos.set([]);
      this.dropdownProcedimientosAbierto.set(false);
      this.buscandoProcedimientos.set(false);
      return;
    }

    this.buscandoProcedimientos.set(true);
    this.temporizadorBusquedaProcedimiento = setTimeout(async () => {
      const identificadorActual = ++this.identificadorPeticionProcedimiento;
      try {
        const items = await this.apiService.buscarProcedimientos(texto);
        if (identificadorActual === this.identificadorPeticionProcedimiento) {
          this.resultadosProcedimientos.set(items);
          this.dropdownProcedimientosAbierto.set(items.length > 0);
        }
      } catch {
        if (identificadorActual === this.identificadorPeticionProcedimiento) {
          this.resultadosProcedimientos.set([]);
        }
      } finally {
        if (identificadorActual === this.identificadorPeticionProcedimiento) {
          this.buscandoProcedimientos.set(false);
        }
      }
    }, 250);
  }

  seleccionarProcedimiento(item: ProcedimientoBusquedaItem): void {
    this.procedimientoSeleccionado.set(item);
    this.textoBusquedaProcedimiento.set(`${item.codigo} - ${item.nombre}`);
    this.dropdownProcedimientosAbierto.set(false);

    if (!this.idDiagnosticoAsociado() && this.diagnosticos().length > 0) {
      this.idDiagnosticoAsociado.set(this.diagnosticos()[0].idDiagnostico);
    }
  }

  cambiarDiagnosticoAsociado(valor: unknown): void {
    const idNumero = typeof valor === 'number' ? valor : Number(valor) || 0;
    this.idDiagnosticoAsociado.set(idNumero);
  }

  filtrarCantidad(evento: KeyboardEvent): void {
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

  actualizarCantidad(valor: string): void {
    const sanitizado = valor.replace(/[^0-9]/g, '');
    const num = Number(sanitizado);
    if (!num || num < 1) {
      this.cantidadProcedimiento.set(1);
    } else if (num > 99) {
      this.cantidadProcedimiento.set(99);
    } else {
      this.cantidadProcedimiento.set(num);
    }
  }

  registrarProcedimiento(): void {
    const proc = this.procedimientoSeleccionado();
    if (!proc) return;

    const listaProcedimientos = [...(this.procedimientos() || [])];
    const dxAsociado =
      this.diagnosticos().find(
        (dx) => dx.idDiagnostico === Number(this.idDiagnosticoAsociado()),
      ) || this.diagnosticos()[0];

    const nuevoItem: AtencionProcedimientoCEItem = {
      idProducto: proc.idProducto,
      codigoCPT: proc.cpt || proc.codigo,
      nombreProcedimiento: proc.nombre,
      idDiagnosticoAsociado: dxAsociado?.idDiagnostico,
      codigoCIE10Asociado: dxAsociado?.codigoCIE10 || '',
      diagnosticoDescripcionAsociado: dxAsociado?.descripcion || '',
      cantidad: Math.max(1, Number(this.cantidadProcedimiento()) || 1),
      observaciones: '',
      precio: proc.precioParticular || proc.precioSis || 0,
    };

    listaProcedimientos.push(nuevoItem);
    this.procedimientosCambio.emit(listaProcedimientos);

    this.procedimientoSeleccionado.set(null);
    this.textoBusquedaProcedimiento.set('');
    this.cantidadProcedimiento.set(1);
    this.lab1Procedimiento.set('');
    this.lab2Procedimiento.set('');
    this.lab3Procedimiento.set('');
    this.dropdownProcedimientosAbierto.set(false);
  }

  eliminarProcedimiento(indice: number): void {
    const lista = [...(this.procedimientos() || [])];
    lista.splice(indice, 1);
    this.procedimientosCambio.emit(lista);

    const maxPagina = Math.max(
      1,
      Math.ceil(lista.length / this.elementosPorPaginaProcedimientos),
    );
    if (this.paginaProcedimientos() > maxPagina) {
      this.paginaProcedimientos.set(maxPagina);
    }
  }

  verDetalleProcedimiento(proc: AtencionProcedimientoCEItem): void {
    this.procedimientoDetalle.set(proc);
    this.modalDetalleVisible.set(true);
  }

  cerrarDetalleProcedimiento(): void {
    this.modalDetalleVisible.set(false);
    this.procedimientoDetalle.set(null);
  }
}
