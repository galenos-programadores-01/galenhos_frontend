export type TipoUbigeo = 'domicilio' | 'nacimiento' | 'procedencia';

export interface FormRegistroPaciente {
  idDocIdentidad: string;
  nroDocumento: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string;
  tercerNombre: string;
  fechaNacimiento: string;
  idTipoSexo: string;
  telefono: string;
  celular: string;
  email: string;
  idPaisNacimiento: string;
  idDistritoNacimiento: string;
  idCentroPobladoNacimiento: string;
  idPaisProcedencia: string;
  idDistritoProcedencia: string;
  idCentroPobladoProcedencia: string;
  idPaisDomicilio: string;
  idDepartamentoDomicilio: string;
  idProvinciaDomicilio: string;
  idDistritoDomicilio: string;
  idCentroPobladoDomicilio: string;
  direccionDomicilio: string;
  idEstadoCivil: string;
  idGradoInstruccion: string;
  idTipoOcupacion: string;
  nombrePadre: string;
  nombreMadre: string;
  idEtnia: string;
  idIdioma: string;
  discapacidad: string;
  incapacidad: string;
  madreTutorIdDocIdentidad: string;
  madreTutorNroDocumento: string;
  madreTutorApellidoPaterno: string;
  madreTutorApellidoMaterno: string;
  madreTutorPrimerNombre: string;
  madreTutorSegundoNombre: string;
  idFuenteFinanciamiento: string;
  idEstadollego: string;
  idEsAccidenteTransito: string;
  gestante: string;
  motivo: string;
}

export function formVacio(): FormRegistroPaciente {
  return {
    idDocIdentidad: '',
    nroDocumento: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    primerNombre: '',
    segundoNombre: '',
    tercerNombre: '',
    fechaNacimiento: '',
    idTipoSexo: '',
    telefono: '',
    celular: '',
    email: '',
    idPaisNacimiento: '',
    idDistritoNacimiento: '',
    idCentroPobladoNacimiento: '',
    idPaisProcedencia: '',
    idDistritoProcedencia: '',
    idCentroPobladoProcedencia: '',
    idPaisDomicilio: '',
    idDepartamentoDomicilio: '',
    idProvinciaDomicilio: '',
    idDistritoDomicilio: '',
    idCentroPobladoDomicilio: '',
    direccionDomicilio: '',
    idEstadoCivil: '',
    idGradoInstruccion: '',
    idTipoOcupacion: '',
    nombrePadre: '',
    nombreMadre: '',
    idEtnia: '',
    idIdioma: '',
    discapacidad: '',
    incapacidad: '',
    madreTutorIdDocIdentidad: '',
    madreTutorNroDocumento: '',
    madreTutorApellidoPaterno: '',
    madreTutorApellidoMaterno: '',
    madreTutorPrimerNombre: '',
    madreTutorSegundoNombre: '',
    idFuenteFinanciamiento: '',
    idEstadollego: '',
    idEsAccidenteTransito: '',
    gestante: '',
    motivo: '',
  };
}

export function normalizarTexto(texto: string): string {
  return texto
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizar(texto: string): string {
  return texto.replace(/[\p{Cc}\u200B-\u200F\uFEFF]/gu, '').trim();
}

export function normalizarNombre(texto: string): string {
  return sanitizar(texto).toUpperCase().replace(/\s+/g, ' ');
}
