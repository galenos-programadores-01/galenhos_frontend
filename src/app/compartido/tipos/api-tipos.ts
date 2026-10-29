export type IFilaBackend = Record<string, unknown>;

export interface IPaciente {
  patientId: string | number;
  documentNumber?: string;
  historyNumber?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  firstName?: string;
  secondName?: string;
  thirdName?: string;
  dateOfBirth?: string;
  [columna: string]: unknown;
}

export interface ICatalogoDescripcion {
  id: number;
  descripcion?: string;
  codigo?: string;
}

export interface ICatalogoNombre {
  id: number;
  nombre: string;
}

export interface IServicioAtencion extends ICatalogoNombre {
  idEspecialidad?: number;
}

export interface IEstablecimientoBusqueda {
  idEstablecimiento: number;
  codigo?: string;
  nombre?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  nombreLargo?: string;
}

export interface IMedico {
  idMedico: number;
  nombreCompleto?: string;
  especialidad?: string;
  [columna: string]: unknown;
}

export interface ICamaDisponible {
  idCama?: number;
  estado?: string;
  cama?: string;
  nroHistoriaClinica?: string;
  paciente?: string;
}

export interface IDiagnosticoBusqueda {
  idDiagnostico: number;
  codigoCIE10?: string;
  descripcion?: string;
  descripcionLarga?: string;
}

export interface ISubclasificacionDxItem {
  idSubclasificacionDx: number;
  descripcionCorta?: string;
  descripcionLarga?: string;
}

// Respuesta de GET /api/v1/hospitalizacion/reporte-ticket/:idCuenta
// (SP usp_go_GenererReporteTicketHospi): datos para el ticket de admisión.
export interface IReporteTicketHospitalizacion {
  paciente: string;
  nroHistoriaClinica: string;
  nroDocumento: string;
  idCuentaAtencion: number;
  servicio: string;
  medico: string;
  fecha: string | null;
  hora: string;
  iafa: string;
}

export interface IFuenteFinanciamiento {
  idFuenteFinanciamiento: number;
  descripcion?: string;
  idTipoFinanciamiento: number;
}

export interface IReniecDatos {
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  primerNombre: string;
  segundoNombre: string;
  tercerNombre: string;
  fechaNacimiento: string;
  sexo: string;
  estadoCivil: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  ubigeo: string;
  nombrePadre: string;
  nombreMadre: string;
  departamentoNacimiento: string;
  provinciaNacimiento: string;
  distritoNacimiento: string;
}

export interface IReniecResultado {
  dni: string;
  operacion: string;
  resultado: string[];
  datos: IReniecDatos;
}

export interface IListadoPacientes {
  items: IPaciente[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface RegistroPacientePayload {
  idPaisNacimiento?: number;
  apellidoMaterno?: string;
  direccionDomicilio?: string;
  idPaisProcedencia?: number;
  apellidoPaterno: string;
  primerNombre: string;
  segundoNombre?: string;
  tercerNombre?: string;
  fechaNacimiento?: string;
  idDocIdentidad?: number;
  nroDocumento: string;
  telefono?: string;
  celular?: string;
  idTipoSexo?: number;
  idProcedencia?: number;
  idGradoInstruccion?: number;
  idEstadoCivil?: number;
  idTipoOcupacion?: number;
  idCentroPobladoDomicilio?: number;
  nombrePadre?: string;
  nombreMadre?: string;
  idPaisDomicilio?: number;
  idCentroPobladoNacimiento?: number;
  idCentroPobladoProcedencia?: number;
  idDistritoProcedencia?: number;
  idDistritoDomicilio?: number;
  idDistritoNacimiento?: number;
  idEtnia?: number;
  idIdioma?: number;
  email?: string;
  discapacidad?: number;
  incapacidad?: number;
}

// RegistroPacienteConHistoriaPayload corresponde al cuerpo de
// POST /api/v1/pacientes/historia-clinica (SP usp_go_PacienteHistoriaClinicaAgregar).
// El SP acepta un subconjunto mas reducido que RegistroPacientePayload: no
// recibe tercerNombre, email, celular, datos de nacimiento/procedencia,
// centros poblados ni nombre de padres, y el idEmpleado lo toma del token, no
// del cuerpo.
export interface RegistroPacienteConHistoriaPayload {
  apellidoPaterno: string;
  primerNombre: string;
  nroDocumento: string;
  apellidoMaterno?: string;
  segundoNombre?: string;
  fechaNacimiento?: string;
  idDocIdentidad?: number;
  telefono?: string;
  direccionPaciente?: string;
  idTipoSexo?: number;
  idEstadoCivil?: number;
  idDistrito?: number;
  idPais?: number;
  idEtnia?: number;
  idIdioma?: number;
  idOcupacion?: number;
  idGradoInstruccion?: number;
  madreNroDocumento?: string;
  madreApellidoPaterno?: string;
  madreApellidoMaterno?: string;
  madrePrimerNombre?: string;
  madreSegundoNombre?: string;
  idFuenteFinanciamiento?: number;
  discapacidad?: number;
  incapacidad?: number;
}
