export interface ColaPacienteCEItem {
  readonly idAtencion: number;
  readonly idCuentaAtencion: number;
  readonly idPaciente: number;
  readonly nroHistoriaClinica: number;
  readonly nroDocumento: string;
  readonly pacienteNombre: string;
  readonly fechaIngreso: string;
  readonly horaIngreso: string;
  readonly horaEgreso: string;
  readonly edad: number;
  readonly idServicioIngreso: number;
  readonly servicioNombre: string;
  readonly idMedicoIngreso: number;
  readonly medicoNombre: string;
  readonly estadoAtencion: 'PENDIENTE' | 'EN_ATENCION' | 'ATENDIDO';
  readonly idCita: number;
  readonly tipoFinanciador: string;
  readonly sexo?: string;
  readonly telefono?: string;
  readonly tieneTriaje?: boolean;
  readonly turno?: string;
}

export interface AtencionDiagnosticoCEItem {
  readonly idAtencionDiagnostico?: number;
  readonly idDiagnostico: number;
  readonly codigoCIE10: string;
  readonly descripcion: string;
  idClasificacionDx: number;
  clasificacion: 'P' | 'D' | 'R';
  idSubclasificacionDx: number;
  labConfHIS?: string;
  labConfHIS1?: string;
  labConfHIS2?: string;
  labConfHIS3?: string;
}

export interface PacienteDatosAdicionalesCE {
  idPaciente: number;
  antecedentes: string;
  antecedAlergico: string;
  antecedObstetrico: string;
  antecedQuirurgico: string;
  antecedFamiliar: string;
  antecedPatologico: string;
  hipertensionArterial: number;
  obesidad: number;
  dislipidemia: number;
  anemia: number;
  higadoGraso: number;
  enfTiroidea: number;
  tuberculosis: number;
  fumaActualmente: number;
  cancer: number;
  otrosComorbilidad: string;
}

export interface FichaAtencionCEDetalle {
  readonly idAtencion: number;
  readonly idCuentaAtencion: number;
  readonly idPaciente: number;
  readonly pacienteNombre: string;
  readonly nroHistoriaClinica: number;
  readonly nroDocumento: string;
  readonly edad: number;
  readonly sexo: string;
  motivo: string;
  examenClinico: string;
  antecedente: string;
  inforCompDiagMed: string;
  tratamiento: string;
  planTratamiento: string;
  observaciones: string;
  fechaProxCita: string;
  idDestinoAtencion: number;
  readonly destinoNombre: string;
  readonly horaIngreso: string;
  readonly horaEgreso: string;
  readonly estado: number;
  readonly especialidadNombre?: string;
  readonly iafa?: string;
  diagnosticos: AtencionDiagnosticoCEItem[];
  procedimientos?: AtencionProcedimientoCEItem[];
  ordenesApoyoDiagnostico?: OrdenApoyoDiagnosticoItem[];
  interconsultas?: InterconsultaCEItem[];
  ordenesProcedimientos?: OrdenProcedimientoCEItem[];
}

export interface AtencionProcedimientoCEItem {
  idProcedimiento?: number;
  idProducto: number;
  codigoCPT: string;
  nombreProcedimiento: string;
  idDiagnosticoAsociado?: number;
  codigoCIE10Asociado?: string;
  diagnosticoDescripcionAsociado?: string;
  cantidad: number;
  observaciones?: string;
  precio?: number;
}

export interface InterconsultaCEItem {
  idInterconsulta?: number;
  idDiagnostico?: number;
  codigoCIE10: string;
  diagnosticoDescripcion?: string;
  idEspecialidad: number;
  codigoEspecialidad?: string;
  nombreEspecialidad: string;
  fechaPropuesta: string;
  motivo: string;
  resumenEnfermedad: string;
  fechaCita?: string;
  horaCita?: string;
  medico?: string;
  idMedico?: number;
}

export interface OrdenProcedimientoCEItem {
  idProcedimiento?: number;
  idProducto?: number;
  codigoCPMS?: string;
  nombreProcedimiento: string;
  idDiagnostico?: number;
  codigoCIE10?: string;
  diagnosticoDescripcion?: string;
  cantidad: number;
  observacion: string;
}

export interface AtencionDiagnosticoGuardarItem {
  readonly idDiagnostico: number;
  readonly idClasificacionDx: number;
  readonly idSubclasificacionDx: number;
  readonly clasificacion?: string;
  readonly labConfHIS?: string;
  readonly labConfHIS1?: string;
  readonly labConfHIS2?: string;
  readonly labConfHIS3?: string;
}

export interface AtencionCEGuardarPayload {
  readonly idAtencion: number;
  readonly motivo: string;
  readonly examenClinico: string;
  readonly antecedente: string;
  readonly inforCompDiagMed: string;
  readonly tratamiento: string;
  readonly planTratamiento: string;
  readonly observaciones: string;
  readonly fechaProxCita: string;
  readonly idDestinoAtencion: number;
  readonly idUsuario?: number;
  readonly cerrarAtencion: boolean;
  readonly diagnosticos: readonly AtencionDiagnosticoGuardarItem[];
  readonly procedimientos?: readonly AtencionProcedimientoCEItem[];
  readonly ordenesApoyoDiagnostico?: readonly OrdenApoyoDiagnosticoItem[];
  readonly interconsultas?: readonly InterconsultaCEItem[];
  readonly ordenesProcedimientos?: readonly OrdenProcedimientoCEItem[];
}

export interface DestinoAtencionItem {
  readonly idDestinoAtencion: number;
  readonly descripcion: string;
}

export interface ColaFiltrosCE {
  readonly idMedico?: number;
  readonly idServicio?: number;
  readonly fecha?: string;
  readonly filtro?: string;
}

export interface TriajeConsultaSignosVitales {
  readonly presionArterial?: string;
  readonly frecuenciaCardiaca?: number;
  readonly frecuenciaRespiratoria?: number;
  readonly temperatura?: number;
  readonly saturacion?: number;
  readonly peso?: number;
  readonly talla?: number;
  readonly imc?: number;
  readonly fechaRegistro?: string;
  readonly observacion?: string;
}

export interface ItemRecetaPrescripcion {
  idProducto: number;
  codigo: string;
  nombre: string;
  concentracion: string;
  formaFarmaceutica: string;
  dosis: string;
  via: string;
  frecuencia: string;
  duracion: string;
  cantidad: number;
  indicaciones: string;
  idDiagnostico?: number;
  codigoCIE10?: string;
  unidadMedida?: string;
}

export interface OrdenApoyoDiagnosticoItem {
  idProducto: number;
  codigo: string;
  nombreProcedimiento: string;
  servicio: string;
  idDiagnostico?: number;
  codigoCIE10?: string;
  cantidad: number;
  justificacion: string;
  observacion: string;
}

export interface CatalogoLabHISItem {
  readonly codigo: number;
  readonly valor: string;
  readonly descripcion: string;
}
