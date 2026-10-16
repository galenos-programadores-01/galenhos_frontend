import { ChangeDetectorRef, Component, HostListener, inject, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ajustarRangoBandeja,
  fechaFinParam,
  fechaInicioParam,
  fechaIsoLocal,
  filtrarPorReceta,
  mensajeRangoBandeja,
} from '../../../../aplicacion/auditoria-qf.filtros';
import {
  DIAS_MAXIMOS_BANDEJA,
  TAMANO_PAGINA_BANDEJA,
  type EstadoRecetaOpcion,
  type RecetaBandeja,
} from '../../../../aplicacion/auditoria-qf.tipos';
import { ApiRequestError } from '../../../../../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../../../compartido/componentes/tabla/tabla.component';
import { AuditoriaQfApiService } from '../../../salida/http/auditoria-qf.api.service';

@Component({
  selector: 'app-auditoria-qf',
  standalone: true,
  imports: [FormsModule, TablaComponent, ColumnaTemplateDirective],
  templateUrl: './auditoria-qf.component.html',
  styleUrl: './auditoria-qf.component.css',
})
export class AuditoriaQfComponent implements OnInit {
  private readonly api = inject(AuditoriaQfApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly diasMaximos = DIAS_MAXIMOS_BANDEJA;
  readonly tamanoPagina = TAMANO_PAGINA_BANDEJA;
  readonly columnas: ColumnaTabla[] = [
    { campo: 'recetaCustom', cabecera: 'Receta', ancho: '110px' },
    { campo: 'horaCustom', cabecera: 'Hora', ancho: '80px' },
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'edadCustom', cabecera: 'Edad', ancho: '110px' },
    { campo: 'medicoCustom', cabecera: 'Médico' },
    { campo: 'servicioCustom', cabecera: 'Servicio' },
    { campo: 'firmaCustom', cabecera: 'Firma', ancho: '120px' },
    { campo: 'estadoCustom', cabecera: 'Estado', ancho: '140px' },
  ];

  fechaDesde = fechaIsoLocal();
  fechaHasta = fechaIsoLocal();
  avisoRango = '';
  idEstado = '';
  buscar = '';

  estados: EstadoRecetaOpcion[] = [];
  private recetasServidor: RecetaBandeja[] = [];
  recetas: RecetaBandeja[] = [];
  pagina = 1;
  recetaAbierta: RecetaBandeja | null = null;
  cargando = false;
  buscado = false;
  error = '';

  ngOnInit(): void {
    void this.cargarEstados();
    void this.cargarBandeja();
  }

  get hoy(): string {
    return fechaIsoLocal();
  }

  alCambiarDesde(valor: string): void {
    this.aplicarRango('desde', valor, this.fechaHasta);
  }

  alCambiarHasta(valor: string): void {
    this.aplicarRango('hasta', this.fechaDesde, valor);
  }

  private aplicarRango(ancla: 'desde' | 'hasta', desde: string, hasta: string): void {
    const ajuste = ajustarRangoBandeja(ancla, desde, hasta, this.diasMaximos, this.hoy);
    this.fechaDesde = ajuste.desde;
    this.fechaHasta = ajuste.hasta;
    this.avisoRango = ajuste.mensaje;
  }

  async cargarEstados(): Promise<void> {
    try {
      this.estados = await this.api.listarEstados();
    } catch (error) {
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo cargar los estados de la receta.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async cargarBandeja(): Promise<void> {
    this.error = mensajeRangoBandeja(this.fechaDesde, this.fechaHasta, this.diasMaximos);
    if (this.error) {
      this.recetasServidor = [];
      this.recetas = [];
      this.pagina = 1;
      this.buscado = true;
      return;
    }

    this.cargando = true;
    try {
      this.recetasServidor = await this.api.listarBandeja({
        fechaInicio: fechaInicioParam(this.fechaDesde),
        fechaFin: fechaFinParam(this.fechaHasta),
        idEstado: this.idEstadoNumero(),
      });
      this.buscado = true;
      this.aplicarBusqueda();
    } catch (error) {
      this.recetasServidor = [];
      this.recetas = [];
      this.pagina = 1;
      this.buscado = true;
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo cargar la bandeja de recetas.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  aplicarBusqueda(): void {
    this.recetas = filtrarPorReceta(this.recetasServidor, this.buscar);
    this.pagina = 1;
  }

  recetasPagina(): RecetaBandeja[] {
    const inicio = (this.pagina - 1) * this.tamanoPagina;
    return this.recetas.slice(inicio, inicio + this.tamanoPagina);
  }

  totalPaginas(): number {
    return Math.max(1, Math.ceil(this.recetas.length / this.tamanoPagina));
  }

  mostrarPaginacion(): boolean {
    return this.buscado && !this.cargando && this.recetas.length > this.tamanoPagina;
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
    this.recetaAbierta = fila as RecetaBandeja;
    this.cdr.detectChanges();
  }

  cerrarDetalle(): void {
    this.recetaAbierta = null;
    this.cdr.detectChanges();
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (!this.recetaAbierta) return;
    this.cerrarDetalle();
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
    const hoy = fechaIsoLocal();
    this.fechaDesde = hoy;
    this.fechaHasta = hoy;
    this.avisoRango = '';
    this.idEstado = '';
    this.buscar = '';
    void this.cargarBandeja();
  }

  numeroReceta(receta: RecetaBandeja): string {
    return receta.numReceta || receta.receta;
  }

  esFirmado(receta: RecetaBandeja): boolean {
    const firma = String(receta?.estadoFirma ?? '')
      .trim()
      .toLowerCase();
    return firma.startsWith('firm') && !firma.includes('sin');
  }

  esSinFirmar(receta: RecetaBandeja): boolean {
    return String(receta?.estadoFirma ?? '')
      .trim()
      .toLowerCase()
      .includes('sin');
  }

  tituloBandeja(): string {
    return this.idEstado ? 'Recetas filtradas' : 'Bandeja de recetas';
  }

  resumenBandeja(): string {
    if (!this.buscado) return 'Pulse Actualizar para cargar la bandeja.';
    const total = this.recetas.length;
    const etiqueta = total === 1 ? 'registro' : 'registros';
    return `${total} ${etiqueta}`;
  }

  private idEstadoNumero(): number | null {
    if (this.idEstado === '') return null;
    const id = Number(this.idEstado);
    return Number.isInteger(id) ? id : null;
  }
}
