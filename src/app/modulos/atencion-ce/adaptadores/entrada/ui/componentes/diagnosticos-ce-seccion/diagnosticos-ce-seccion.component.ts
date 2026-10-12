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
  imports: [CommonModule, FormsModule, SelectGlobalComponent],
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

  readonly textoBusqueda = signal<string>('');
  readonly resultadosBusqueda = signal<readonly DiagnosticoBusquedaItem[]>([]);
  readonly buscando = signal<boolean>(false);
  readonly dropdownAbierto = signal<boolean>(false);
  readonly diagnosticoSeleccionado = signal<DiagnosticoBusquedaItem | null>(
    null,
  );

  readonly tipoSeleccionado = signal<'P' | 'D' | 'R'>('D');
  readonly lab1Seleccionado = signal<string>('');
  readonly lab2Seleccionado = signal<string>('');
  readonly lab3Seleccionado = signal<string>('');
  readonly reglaDiagnosticoActivo = signal<ReglaLabDiagnostico | null>(null);

  // Búsqueda y Registro de Procedimientos Médicos (CPMS / CPT)
  readonly textoBusquedaProcedimiento = signal<string>('');
  readonly resultadosProcedimientos = signal<
    readonly ProcedimientoBusquedaItem[]
  >([]);
  readonly buscandoProcedimientos = signal<boolean>(false);
  readonly dropdownProcedimientosAbierto = signal<boolean>(false);
  readonly procedimientoSeleccionado = signal<ProcedimientoBusquedaItem | null>(
    null,
  );

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

  // --- Búsqueda de Diagnósticos ---

  async alEscribirBusqueda(): Promise<void> {
    const texto = this.textoBusqueda().trim();
    if (texto.length < 2) {
      this.resultadosBusqueda.set([]);
      this.dropdownAbierto.set(false);
      return;
    }

    this.buscando.set(true);
    try {
      const items = await this.apiService.buscarDiagnosticos(texto);
      this.resultadosBusqueda.set(items);
      this.dropdownAbierto.set(items.length > 0);
    } catch {
      this.resultadosBusqueda.set([]);
    } finally {
      this.buscando.set(false);
    }
  }

  seleccionarDiagnostico(item: DiagnosticoBusquedaItem): void {
    this.diagnosticoSeleccionado.set(item);
    this.textoBusqueda.set(`${item.codigoCIE10} - ${item.descripcion}`);
    this.dropdownAbierto.set(false);

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
      labConfHIS: this.lab1Seleccionado(),
      labConfHIS1: this.lab2Seleccionado(),
      labConfHIS2: this.lab3Seleccionado(),
      labConfHIS3: '',
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
    this.diagnosticosCambio.emit(lista);
  }

  private resolverIdClasificacion(tipo: 'P' | 'D' | 'R'): number {
    if (tipo === 'D') return 2;
    if (tipo === 'R') return 3;
    return 1;
  }

  actualizarLabFila(
    indice: number,
    campo: 'labConfHIS' | 'labConfHIS1' | 'labConfHIS2',
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

  actualizarInformacionComplementaria(texto: string): void {
    this.inforCompDiagMedCambio.emit(texto);
  }

  // --- Procedimientos Médicos (CPMS / CPT) ---

  async alEscribirBusquedaProcedimiento(): Promise<void> {
    const texto = this.textoBusquedaProcedimiento().trim();
    if (texto.length < 2) {
      this.resultadosProcedimientos.set([]);
      this.dropdownProcedimientosAbierto.set(false);
      return;
    }

    this.buscandoProcedimientos.set(true);
    try {
      const items = await this.apiService.buscarProcedimientos(texto);
      this.resultadosProcedimientos.set(items);
      this.dropdownProcedimientosAbierto.set(items.length > 0);
    } catch {
      this.resultadosProcedimientos.set([]);
    } finally {
      this.buscandoProcedimientos.set(false);
    }
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
