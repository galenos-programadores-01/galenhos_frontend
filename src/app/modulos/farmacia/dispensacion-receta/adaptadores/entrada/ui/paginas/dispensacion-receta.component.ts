import {
  ChangeDetectorRef,
  Component,
  HostListener,
  inject,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { recetasEjemplo } from '../../../../aplicacion/dispensacion-receta.datos';
import {
  etiquetaEstado,
  etiquetaPrioridad,
  filtrarRecetas,
  serviciosDe,
} from '../../../../aplicacion/dispensacion-receta.filtros';
import {
  TAMANO_PAGINA_DISPENSACION,
  type EstadoDispensacion,
  type MedicamentoDispensacion,
  type PrioridadDispensacion,
  type RecetaDispensacion,
} from '../../../../aplicacion/dispensacion-receta.tipos';
import { ColumnaTemplateDirective } from '../../../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../../../compartido/componentes/tabla/tabla.component';

@Component({
  selector: 'app-dispensacion-receta',
  standalone: true,
  imports: [FormsModule, TablaComponent, ColumnaTemplateDirective],
  templateUrl: './dispensacion-receta.component.html',
  styleUrl: './dispensacion-receta.component.css',
})
export class DispensacionRecetaComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly tamanoPagina = TAMANO_PAGINA_DISPENSACION;
  readonly columnas: ColumnaTabla[] = [
    { campo: 'recetaCustom', cabecera: 'Receta', ancho: '110px' },
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'servicioCustom', cabecera: 'Servicio', ancho: '160px' },
    { campo: 'prioridadCustom', cabecera: 'Prioridad', ancho: '120px' },
    { campo: 'medicoCustom', cabecera: 'Médico' },
    { campo: 'itemsCustom', cabecera: 'Ítems', ancho: '80px' },
    { campo: 'estadoCustom', cabecera: 'Estado', ancho: '140px' },
  ];

  estado: '' | EstadoDispensacion = 'por_atender';
  servicio = '';
  prioridad: '' | PrioridadDispensacion = '';
  buscar = '';

  servicios: string[] = [];
  private recetasServidor: RecetaDispensacion[] = [];
  recetas: RecetaDispensacion[] = [];
  pagina = 1;
  recetaAbierta: RecetaDispensacion | null = null;
  private sinStock = new Set<number>();
  entregadoA = '';
  observacion = '';
  avisoAccion = '';
  cargando = false;

  ngOnInit(): void {
    this.cargarBandeja();
  }

  cargarBandeja(): void {
    this.cargando = true;
    this.cdr.detectChanges();
    this.recetasServidor = recetasEjemplo();
    this.servicios = serviciosDe(this.recetasServidor);
    this.aplicarFiltros();
    this.cargando = false;
    this.cdr.detectChanges();
  }

  aplicarFiltros(): void {
    this.recetas = filtrarRecetas(this.recetasServidor, {
      estado: this.estado,
      servicio: this.servicio,
      prioridad: this.prioridad,
      buscar: this.buscar,
    });
    this.pagina = 1;
  }

  recetasPagina(): RecetaDispensacion[] {
    const inicio = (this.pagina - 1) * this.tamanoPagina;
    return this.recetas.slice(inicio, inicio + this.tamanoPagina);
  }

  totalPaginas(): number {
    return Math.max(1, Math.ceil(this.recetas.length / this.tamanoPagina));
  }

  mostrarPaginacion(): boolean {
    return !this.cargando && this.recetas.length > this.tamanoPagina;
  }

  paginasVisibles(): number[] {
    const actual = this.pagina;
    const total = this.totalPaginas();
    const maximo = 5;
    const mitad = Math.floor(maximo / 2);
    let inicio = actual - mitad;
    let fin = actual + mitad;
    if (inicio < 1) {
      fin += 1 - inicio;
      inicio = 1;
    }
    if (fin > total) {
      inicio = Math.max(1, fin - maximo + 1);
      fin = total;
    }
    if (fin < maximo) fin = Math.min(total, maximo);
    const paginas: number[] = [];
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  }

  irAPagina(nuevaPagina: number): void {
    const total = this.totalPaginas();
    if (nuevaPagina < 1 || nuevaPagina > total || nuevaPagina === this.pagina) return;
    this.pagina = nuevaPagina;
  }

  abrirDetalle(fila: unknown): void {
    if (!fila || typeof fila !== 'object') return;
    this.recetaAbierta = fila as RecetaDispensacion;
    this.sinStock = new Set<number>();
    this.entregadoA = '';
    this.observacion = '';
    this.avisoAccion = '';
    this.cdr.detectChanges();
  }

  cerrarDetalle(): void {
    this.recetaAbierta = null;
    this.sinStock = new Set<number>();
    this.entregadoA = '';
    this.observacion = '';
    this.avisoAccion = '';
    this.cdr.detectChanges();
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (!this.recetaAbierta) return;
    this.cerrarDetalle();
  }

  yaAtendida(receta: RecetaDispensacion): boolean {
    return receta.estado === 'atendido';
  }

  estaSinStock(medicamento: MedicamentoDispensacion): boolean {
    return this.sinStock.has(medicamento.id);
  }

  stockInsuficiente(medicamento: MedicamentoDispensacion): boolean {
    const pedida = Number(medicamento.cantidad);
    return Number.isFinite(pedida) && medicamento.stock < pedida;
  }

  marcarSinStock(medicamento: MedicamentoDispensacion): void {
    if (this.recetaAbierta && this.yaAtendida(this.recetaAbierta)) return;
    this.sinStock.add(medicamento.id);
    this.avisoAccion = '';
  }

  deshacerSinStock(medicamento: MedicamentoDispensacion): void {
    if (this.recetaAbierta && this.yaAtendida(this.recetaAbierta)) return;
    this.sinStock.delete(medicamento.id);
    this.avisoAccion = '';
  }

  marcarAtendido(): void {
    const receta = this.recetaAbierta;
    if (!receta || this.yaAtendida(receta)) return;
    this.avisoAccion = 'El guardado se conecta cuando exista el procedimiento.';
  }

  textoEstado(receta: RecetaDispensacion): string {
    return etiquetaEstado(receta.estado);
  }

  textoPrioridad(receta: RecetaDispensacion): string {
    return etiquetaPrioridad(receta.prioridad);
  }

  inicialesPaciente(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter((parte) => parte.length > 0);
    const letras = partes.slice(0, 2).map((parte) => parte.charAt(0));
    return letras.join('').toUpperCase() || '—';
  }

  rangoVisible(): string {
    if (this.recetas.length === 0) return '';
    const inicio = (this.pagina - 1) * this.tamanoPagina + 1;
    const fin = Math.min(this.pagina * this.tamanoPagina, this.recetas.length);
    return `${inicio}–${fin}`;
  }

  limpiarFiltros(): void {
    this.estado = 'por_atender';
    this.servicio = '';
    this.prioridad = '';
    this.buscar = '';
    this.cargarBandeja();
  }

  tituloBandeja(): string {
    if (this.estado === 'atendido') return 'Recetas atendidas';
    if (this.estado === 'por_atender') return 'Recetas por atender';
    return 'Bandeja de dispensación';
  }

  resumenBandeja(): string {
    const total = this.recetas.length;
    const etiqueta = total === 1 ? 'registro' : 'registros';
    return `${total} ${etiqueta}`;
  }

  etiquetaItems(receta: RecetaDispensacion): string {
    const total = receta.medicamentos.length;
    return total === 1 ? '1 ítem' : `${total} ítems`;
  }
}
