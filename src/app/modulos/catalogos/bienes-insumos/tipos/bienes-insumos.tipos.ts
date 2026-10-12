export interface IBienInsumoItem {
  idProducto: number;
  codigo: string;
  codigoSiga: string;
  codigoSunat: string;
  nombre: string;
  nombreComercial: string;
  idGrupoFarmacologico: number;
  grupoFarmacologico: string;
  precioCompra: number;
  precioDistribucion: number;
  precioUltimaCompra: number;
  stockMinimo: number;
  tipoProducto: number;
  concentracion: string;
  presentacion: string;
  formaFarmaceutica: string;
  petitorio: boolean;
  estado: number;
  esVital: boolean;
  esEstrategico: boolean;
  esOncologico: boolean;
  cargaEnFua: boolean;
  esIndicadorGestion?: boolean;
}

export interface IBienInsumoPrecioPlan {
  idPlanCatalogo: number;
  idTipoFinanciamiento: number;
  plan: string;
  precioUnitario: number;
  activo: boolean;
}

export interface IBienInsumoDetalle {
  idProducto: number;
  codigo: string;
  codigoSiga: string;
  codigoSunat: string;
  nombre: string;
  nombreComercial: string;
  idGrupoFarmacologico: number;
  grupoFarmacologico: string;
  idSubGrupoFarmacologico: number;
  subGrupoFarmacologico: string;
  idPartida: number;
  partida: string;
  idCentroCosto: number;
  centroCosto: string;
  precioCompra: number;
  precioDistribucion: number;
  precioDonacion: number;
  precioUltimaCompra: number;
  stockMinimo: number;
  tipoProducto: number;
  denominacion: string;
  concentracion: string;
  presentacion: string;
  formaFarmaceutica: string;
  materialEnvase: string;
  presentacionEnvase: string;
  fabricante: string;
  idPaisOrigen: number;
  paisOrigen: string;
  petitorio: boolean;
  tipoProductoSismed: string;
  estado: number;
  estadoDigemid: number;
  idTipoPrefijo: number;
  tipoPrefijo: string;
  politicaCanje: number;
  petitorioIst: boolean;
  comunes: boolean;
  comiteFarmacologico: boolean;
  especializados: boolean;
  esVital: boolean;
  esEstrategico: boolean;
  esOncologico: boolean;
  cargaEnFua: boolean;
  productoIndicadorGestion?: boolean;
  preciosPorPlan: IBienInsumoPrecioPlan[];
}

export interface IGrupoFarmacologico {
  idGrupoFarmacologico: number;
  descripcion: string;
}

export interface ISubGrupoFarmacologico {
  idSubGrupoFarmacologico: number;
  descripcion: string;
  idGrupoFarmacologico: number;
}

export interface ICentroCostoItem {
  idCentroCosto: number;
  codigo: string;
  descripcion: string;
}

export interface IPartidaPresupuestalItem {
  idPartidaPresupuestal: number;
  codigo: string;
  descripcion: string;
}

export interface IPaisItem {
  idPais: number;
  nombre: string;
}

export interface ITipoPrefijoItem {
  idTipoSufijos: number;
  descripcion: string;
}

export interface ITipoFinanciamientoItem {
  idTipoFinanciamiento: number;
  descripcion: string;
}

export interface ICatalogoBienesInsumosAuxiliares {
  centrosCosto: ICentroCostoItem[];
  partidas: IPartidaPresupuestalItem[];
  paises: IPaisItem[];
  prefijos: ITipoPrefijoItem[];
  financiamientos: ITipoFinanciamientoItem[];
  grupos: IGrupoFarmacologico[];
}

export interface IPaginacionBienesInsumos {
  items: IBienInsumoItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface IBienInsumoFiltros {
  filtro?: string;
  idGrupo?: number;
  tipoProducto?: number;
  petitorio?: boolean;
  indicadorGestion?: boolean;
  estado?: number;
  page?: number;
  pageSize?: number;
}

export interface IBienInsumoGuardarPayload {
  codigo: string;
  codigoSiga: string;
  codigoSunat: string;
  nombre: string;
  nombreComercial: string;
  idGrupoFarmacologico: number;
  idSubGrupoFarmacologico: number;
  idPartida: number;
  idCentroCosto: number;
  precioCompra: number;
  precioDistribucion: number;
  precioDonacion: number;
  precioUltimaCompra: number;
  stockMinimo: number;
  tipoProducto: number;
  denominacion: string;
  concentracion: string;
  presentacion: string;
  formaFarmaceutica: string;
  materialEnvase: string;
  presentacionEnvase: string;
  fabricante: string;
  idPaisOrigen: number;
  petitorio: boolean;
  tipoProductoSismed: string;
  estado: number;
  estadoDigemid: number;
  idTipoPrefijo: number;
  politicaCanje: number;
  petitorioIst: boolean;
  comunes: boolean;
  comiteFarmacologico: boolean;
  especializados: boolean;
  esVital: boolean;
  esEstrategico: boolean;
  esOncologico: boolean;
  cargaEnFua: boolean;
  productoIndicadorGestion?: boolean;
  preciosPorPlan: IBienInsumoPrecioPlan[];
}
