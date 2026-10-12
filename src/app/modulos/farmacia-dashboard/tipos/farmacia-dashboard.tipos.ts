export interface AlmacenFarmaciaItem {
  readonly idAlmacen: number;
  readonly descripcion: string;
  readonly estado: number;
}

export interface DisponibilidadKpis {
  readonly totalProductos: number;
  readonly disponibles: number;
  readonly enRiesgo: number;
  readonly enQuiebre: number;
  readonly normostock?: number;
  readonly substock?: number;
  readonly sobrestock?: number;
  readonly totalEsenciales?: number;
  readonly esencialesDisponibles?: number;
  readonly pctDisponibilidadEsenciales?: number;
  readonly porcentajeOptimo: number;
  readonly lotesPorVencer30: number;
  readonly lotesPorVencer60: number;
}

export interface ProductoDisponibilidadItem {
  readonly idProducto: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly concentracion: string;
  readonly formaFarmaceutica: string;
  readonly idAlmacen: number;
  readonly almacenNombre: string;
  readonly cantidad: number;
  readonly precio: number;
  readonly stockMinimo: number;
  readonly estadoSemaforo: 'NORMAL' | 'RIESGO' | 'QUIEBRE' | string;
  readonly totalLotes: number;
  readonly petitorio: boolean;
  readonly salidasPeriodo?: number;
}

export interface LoteItem {
  readonly lote: string;
  readonly fechaVencimiento: string;
  readonly cantidad: number;
  readonly precio: number;
  readonly nombreMarca: string;
  readonly diasParaVencer: number;
  readonly estadoVencimiento:
    | 'VENCIDO'
    | 'CRITICO_30'
    | 'ALERTA_60'
    | 'VIGENTE'
    | 'SIN_FECHA'
    | string;
}

export interface KardexMovimientoItem {
  readonly movNumero: number;
  readonly movTipo: string;
  readonly fechaCreacion: string;
  readonly almacenOrigen: string;
  readonly almacenDestino: string;
  readonly lote: string;
  readonly fechaVencimiento: string;
  readonly cantidad: number;
  readonly precio: number;
  readonly total: number;
  readonly documentoTipo: string;
  readonly documentoNumero: string;
  readonly concepto: string;
  readonly cuentaAtencion: string;
  readonly paciente: string;
  readonly usuario: string;
  readonly observaciones: string;
}

export type CanastaMedicamentos = 'DIGEMID' | 'SIS' | 'TODOS';

export interface FarmaciaDisponibilidadFiltros {
  readonly idAlmacen?: number;
  readonly filtro?: string;
  readonly estadoSemaforo?: string;
  readonly soloConStock?: boolean;
  readonly soloEsenciales?: boolean;
  readonly canastaTipo?: CanastaMedicamentos | string;
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
  readonly soloConMovimiento?: boolean;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface PaginacionDisponibilidad {
  readonly items: readonly ProductoDisponibilidadItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface SerieTendenciaSalida {
  readonly nombre: string;
  readonly data: readonly number[];
}

export interface TendenciasSalidasFarmacia {
  readonly periodos: readonly string[];
  readonly series: readonly SerieTendenciaSalida[];
}

export interface TopStockItem {
  readonly idProducto: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly consumoMensual?: number;
}

export interface ItemCanastaEvaluada {
  readonly idProducto: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly formaFarmaceutica: string;
  readonly cantidadTotal: number;
  readonly consumoMensual: number;
  readonly estadoSemaforo:
    | 'NORMOSTOCK'
    | 'SOBRESTOCK'
    | 'SUBSTOCK'
    | 'DESABASTECIDO'
    | string;
  readonly esDigemid: boolean;
  readonly esSis: boolean;
}

export interface FormaFarmaceuticaStockItem {
  readonly formaFarmaceutica: string;
  readonly totalItems: number;
  readonly conStock: number;
  readonly sinStock: number;
}

export interface AlmacenComparativaStock {
  readonly idAlmacen: number;
  readonly descripcion: string;
  readonly normales: number;
  readonly enRiesgo: number;
  readonly enQuiebre: number;
  readonly totalItems: number;
}

export interface VencimientoTramoItem {
  readonly rango: string;
  readonly cantidadLotes: number;
  readonly unidadesTotales: number;
  readonly nivelAlerta:
    | 'CRITICO'
    | 'ALERTA'
    | 'PRECAUCION'
    | 'SEGUIMIENTO'
    | 'OPTIMO'
    | string;
}

export interface EstadisticasFarmaciaDashboard {
  readonly topExistencias: readonly TopStockItem[];
  readonly comparativaAlmacenes: readonly AlmacenComparativaStock[];
  readonly distribucionVencimientos: readonly VencimientoTramoItem[];
  readonly esencialesCriticos?: readonly ItemCanastaEvaluada[];
  readonly esencialesPorForma?: readonly FormaFarmaceuticaStockItem[];
}

export interface LoteVencimientoDetalleItem {
  readonly idProducto: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly lote: string;
  readonly fechaVencimiento: string;
  readonly diasParaVencer: number;
  readonly estadoVencimiento: string;
  readonly cantidad: number;
  readonly precio: number;
  readonly nombreMarca: string;
}
