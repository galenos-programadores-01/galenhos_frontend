export interface ReglaLabDiagnostico {
  readonly lab1Defecto?: string;
  readonly lab2Defecto?: string;
  readonly lab3Defecto?: string;
  readonly esObligatorio: boolean;
  readonly indicacion: string;
}

const REGLAS_LAB_POR_CODIGO: Readonly<Record<string, ReglaLabDiagnostico>> = {
  'Z35.91': {
    lab1Defecto: '1',
    lab2Defecto: '12',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Gestante 1er Trimestre (12 sem): Lab 1 = N° Control (1-3), Lab 2 = Semanas gestacionales',
  },
  'Z35.92': {
    lab1Defecto: '2',
    lab2Defecto: '24',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Gestante 2do Trimestre (24 sem): Lab 1 = N° Control (1-5), Lab 2 = Semanas gestacionales',
  },
  'Z35.93': {
    lab1Defecto: '3',
    lab2Defecto: '36',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Gestante 3er Trimestre (36 sem): Lab 1 = N° Control, Lab 2 = Semanas, Lab 3 = TA si culmina',
  },
  'Z34.91': {
    lab1Defecto: '1',
    lab2Defecto: '12',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Supervisión embarazo normal 1er Trimestre: Lab 1 = N° Control, Lab 2 = Semanas',
  },
  'Z34.92': {
    lab1Defecto: '2',
    lab2Defecto: '24',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Supervisión embarazo normal 2do Trimestre: Lab 1 = N° Control, Lab 2 = Semanas',
  },
  'Z34.93': {
    lab1Defecto: '3',
    lab2Defecto: '36',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Supervisión embarazo normal 3er Trimestre: Lab 1 = N° Control, Lab 2 = Semanas',
  },
  'O34.2': {
    lab1Defecto: '',
    lab2Defecto: '36',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion: 'Cesárea anterior: Lab 2 = Semanas gestacionales',
  },
  'Z39.2': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Seguimiento puerperal / postparto: Lab 1 = N° Control puerperal (1 o 2)',
  },
  'U30.7': {
    lab1Defecto: '',
    lab2Defecto: '1',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion: 'Atención preconcepcional: Lab 2 = N° de atención (1 o 2)',
  },
  'Z00.1': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Control rutinario del niño (CRED): Lab 1 = N° de Control del menor',
  },
  'Z00.6': {
    lab1Defecto: 'ED',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion: 'Evaluación de desarrollo: Lab 1 = ED',
  },
  'Z29.8': {
    lab1Defecto: 'SF1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion:
      'Suplementación de hierro: Lab 1 = Frasco Sulfato Ferroso (SF1-SF7) o Ácido Fólico (AF1-AF3)',
  },
  'Z30.03': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Planificación Familiar: Prescripción inicial de método oral combinado',
  },
  'Z30.051': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Planificación Familiar: Prescripción inicial de inyectable mensual',
  },
  'Z30.052': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Planificación Familiar: Prescripción inicial de inyectable trimestral',
  },
  'Z30.06': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion: 'Planificación Familiar: Prescripción inicial de implante',
  },
  'Z30.08': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Planificación Familiar: Prescripción inicial de preservativo masculino',
  },
  'Z30.09': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Planificación Familiar: Prescripción inicial de preservativo femenino',
  },
  'Z30.091': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion:
      'Planificación Familiar: Prescripción método abstinencia periódica',
  },
  'U16.92': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion: 'Plan de atención de parto: Lab 1 = N° de sesión',
  },
  'O47.9': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion: 'Falso trabajo de parto: Lab 1 = N° de episodio',
  },
  'U26.2': {
    lab1Defecto: 'N',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion:
      'Entrega de resultados diagnóstico: Lab 1 = N (Normal) o A (Anormal)',
  },
  'E66.0': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion: 'Sobrepeso / Obesidad: Lab 1 = Grado o percentil',
  },
  'A00.0': {
    lab1Defecto: '1',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: true,
    indicacion: 'Cólera: Lab 1 debe contener 1, 2 o 3',
  },
  'U14.0': {
    lab1Defecto: 'VIF',
    lab2Defecto: '',
    lab3Defecto: '',
    esObligatorio: false,
    indicacion:
      'Entrevista de tamizaje: Lab 1 = VIF (Violencia), AD (Alcohol/Drogas), EP (Psicosis) o TD (Depresión)',
  },
};

export function obtenerReglaLabDiagnostico(
  codigoCie10: string,
): ReglaLabDiagnostico | null {
  if (!codigoCie10) {
    return null;
  }

  const codigoLimpio = codigoCie10.trim().toUpperCase();

  const reglaExacta = REGLAS_LAB_POR_CODIGO[codigoLimpio];
  if (reglaExacta) {
    return reglaExacta;
  }

  if (codigoLimpio.startsWith('Z35.') || codigoLimpio.startsWith('Z34.')) {
    return {
      lab1Defecto: '1',
      lab2Defecto: '',
      lab3Defecto: '',
      esObligatorio: true,
      indicacion:
        'Control Gestante: Lab 1 = N° Control, Lab 2 = Semanas de gestación',
    };
  }

  if (
    codigoLimpio.startsWith('K02') ||
    codigoLimpio.startsWith('K04') ||
    codigoLimpio.startsWith('K05')
  ) {
    return {
      lab1Defecto: '',
      lab2Defecto: '',
      lab3Defecto: '',
      esObligatorio: false,
      indicacion:
        'Salud Bucal: Lab 1 = Pieza dental afectada (ej: 16, 21, 54), Lab 2 = ABO si es alta básica',
    };
  }

  if (codigoLimpio === 'O99.0') {
    return {
      lab1Defecto: 'MOD',
      lab2Defecto: '',
      lab3Defecto: '',
      esObligatorio: false,
      indicacion:
        'Anemia en gestante: Lab 1 = Severidad (LEV = Leve, MOD = Moderada, SEV = Severa)',
    };
  }

  return null;
}
