/** Pasos del wizard de Primera Atención (alineados al sidebar). */
export type PasoAtencionPa =
  | 'anamnesis'
  | 'examen'
  | 'diagnosticos'
  | 'examenes'
  | 'interconsulta'
  | 'procedimientos'
  | 'medicamentos'
  | 'egreso'
  | 'cierre';

export type ReglaTextoPa = {
  /** Si false, no exige mínimo; sí puede aplicar max si hay texto. */
  enabled: boolean;
  min: number;
  max: number;
};

export type ReglaSelectPa = {
  enabled: boolean;
};

export type ReglaCantidadPa = {
  /** Si false, no exige cantidad mínima (sí valida filas incompletas). */
  enabled: boolean;
  min: number;
};

export type ConfigValidacionPa = {
  campos: {
    tiempoEnfermedad: ReglaTextoPa;
    signosSintomas: ReglaTextoPa;
    relatoCronologico: ReglaTextoPa;
    antecedentes: ReglaTextoPa;
    pielAnexos: ReglaTextoPa;
    examenRegional: ReglaTextoPa;
    referencia: ReglaTextoPa;
    evolucion: ReglaTextoPa;
    evaluacionEnfermeria: ReglaTextoPa;
  };
  selects: {
    estadoGeneral: ReglaSelectPa;
    hidratacion: ReglaSelectPa;
    conciencia: ReglaSelectPa;
    condicionEgreso: ReglaSelectPa;
  };
  cantidades: {
    diagnosticos: ReglaCantidadPa;
    examenes: ReglaCantidadPa;
    procedimientos: ReglaCantidadPa;
    medicamentos: ReglaCantidadPa;
  };
  egreso: {
    fechaHoraObligatoria: boolean;
  };
};

export type FormularioValidacionPa = {
  tiempoEnfermedad: string;
  signosSintomas: string;
  relatoCronologico: string;
  antecedentes: string;
  estadoGeneral: number | '';
  hidratacion: number | '';
  conciencia: number | '';
  pielAnexos: string;
  examenRegional: string;
  referencia: string;
  evolucion: string;
  evaluacionEnfermeria: string;
  condicionEgreso: number | '';
  fechaEgreso: string;
  horaEgreso: string;
};

export type DiagnosticoValidacionPa = {
  idDiagnostico: number | '';
  nombre: string;
  cie10: string;
};

export type ProductoValidacionPa = {
  nombre: string;
  idProducto: number | null;
};

export type MedicamentoValidacionPa = {
  idProducto: number | '';
  nombre: string;
  cantidad: string;
  dosis: string;
  idDosis: number | '';
  unidad: string;
  idUNIDDosis: number | '';
  frecuencia: string;
  idFrecuencia: number | '';
  idViaAdministracion: number | '';
  duracion: string;
};

export type ContextoValidacionPa = {
  form: FormularioValidacionPa;
  diagnosticos: DiagnosticoValidacionPa[];
  examenes: ProductoValidacionPa[];
  procedimientos: ProductoValidacionPa[];
  medicamentos: MedicamentoValidacionPa[];
  tienePaciente: boolean;
};

export type ErrorValidacionPa = {
  paso: PasoAtencionPa;
  mensaje: string;
};

export type ItemResumenVerificacionPa = {
  pasoId: PasoAtencionPa;
  numero: string;
  titulo: string;
  completado: boolean;
  detalle: string;
};
