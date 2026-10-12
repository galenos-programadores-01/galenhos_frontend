export interface IServicioCatalogoItem {
  idProducto: number;
  codigo: string;
  codigoHis: string;
  nombre: string;
  nombreCorto: string;
  idServicioGrupo: number;
  grupoNombre: string;
  codMinsa: string;
  nombreMinsa: string;
  esCpt: boolean;
  esQuirurgico: boolean;
  codigoSis: string;
  codigoSoat: string;
  cpms: string;
  precioParticular: number;
  precioSis: number;
  idEstado: number;
  cargaEnFua: boolean;
  cargaEnHis: boolean;
}

export interface ITarifaFinanciamiento {
  idTipoFinanciamiento: number;
  financiamientoNombre: string;
  precioUnitario: number;
  activo: boolean;
}

export interface IServicioCatalogoDetalle {
  idProducto: number;
  codigo: string;
  codigoHis: string;
  codigoSunat: string;
  nombre: string;
  nombreCorto: string;
  idServicioGrupo: number;
  grupoNombre: string;
  codMinsa: string;
  nombreMinsa: string;
  esCpt: boolean;
  esQuirurgico: boolean;
  codigoSis: string;
  codigoSoat: string;
  cpms: string;
  idEstado: number;
  cargaEnFua: boolean;
  cargaEnHis: boolean;
  precioParticular?: number;
  precioSis?: number;
  tarifas: ITarifaFinanciamiento[];
}

export interface IServicioGrupo {
  idServicioGrupo: number;
  codigo?: string;
  descripcion: string;
}

export interface IPaginacionServiciosCatalogo {
  items: IServicioCatalogoItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface IServicioCatalogoFiltros {
  filtro?: string;
  idGrupo?: number;
  cpt?: boolean;
  quirurgico?: boolean;
  estado?: number;
  page?: number;
  pageSize?: number;
}

export interface IServicioCatalogoGuardarPayload {
  codigo: string;
  codigoHis: string;
  codigoSunat: string;
  nombre: string;
  nombreCorto: string;
  idServicioGrupo: number;
  codMinsa: string;
  nombreMinsa: string;
  esCpt: boolean;
  esQuirurgico: boolean;
  codigoSis: string;
  codigoSoat: string;
  cpms: string;
  precioParticular: number;
  precioSis: number;
  idEstado: number;
  cargaEnFua: boolean;
  cargaEnHis: boolean;
}
