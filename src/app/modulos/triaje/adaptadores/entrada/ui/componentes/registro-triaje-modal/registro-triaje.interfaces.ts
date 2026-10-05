export interface FormRegistroTriaje {
  idDocIdentidad: string;
  nroDocumento: string;
  // Datos del paciente: copia de la busqueda que se envia al grabar el
  // triaje. Se separan de los campos de busqueda para que el operador
  // pueda corregir la identificacion sin volver a disparar la busqueda.
  idDocIdentidadPaciente: string;
  nroDocumentoPaciente: string;
  afiliacionDisa: string;
  afiliacionTipoFormato: string;
  afiliacionNroContrato: string;
  pacienteNn: boolean;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string;
  fechaNacimiento: string;
  idTipoSexo: string;
  idEstadoCivil: string;
  telefono: string;
  idDepartamentoDomicilio: string;
  idProvinciaDomicilio: string;
  idDistritoDomicilio: string;
  idCentroPobladoDomicilio: string;
  direccionDomicilio: string;
  idPaciente?: number;
  esAccidenteTransito: boolean;
  idFuenteFinanciamiento: string;
  idEstadoLlego: string;
  motivo: string;
  presionArterial: string;
  frecCardiaca: string;
  frecRespiratoria: string;
  temperatura: string;
  saturacion: string;
  fiO2: string;
  peso: string;
  talla: string;
  escalaDolor: string;
  escalaGlasgow: string;
  tiempoEvolucionCantidad: string;
  tiempoEvolucionCantidadUnidad: string;
  idServicio: string;
  idTipoPrioridad: string;
  idCausaExternaMorbilidad: string;
  fechaUltimaRegla: string;
  esGestante: boolean;
}
