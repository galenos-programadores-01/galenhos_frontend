import type { FormArray, FormGroup } from '@angular/forms';

export interface ErrorValidacionSoap {
  panel: string;
  grupo: string;
  mensaje: string;
}

export function validarPasoApreciacion(soapForm: FormGroup): string | null {
  const motivoCtrl = soapForm.get('motivo');
  if (motivoCtrl?.invalid) {
    motivoCtrl.markAllAsTouched();
    return 'Ingrese la apreciación clínica o motivo de evolución (mínimo 5 caracteres).';
  }
  return null;
}

export function validarPasoSubjetivo(soapForm: FormGroup): string | null {
  const subjetivoCtrl = soapForm.get('subjetivo');
  if (subjetivoCtrl?.invalid) {
    subjetivoCtrl.markAllAsTouched();
    return 'Verifique que la escala de dolor EVA sea un valor numérico entre 0 y 10.';
  }
  return null;
}

export function validarPasoObjetivo(soapForm: FormGroup): string | null {
  const signosCtrl = soapForm.get('signosVitales') as FormGroup;
  if (signosCtrl?.invalid) {
    signosCtrl.markAllAsTouched();
    if (signosCtrl.get('presionArterial')?.invalid) {
      return 'En Signos Vitales: Ingrese la Presión Arterial en formato sistólica/diastólica (ej. 120/80).';
    }
    if (signosCtrl.get('frecuenciaCardiaca')?.invalid) {
      return 'En Signos Vitales: Ingrese una Frecuencia Cardíaca válida (30 a 250 lpm).';
    }
    if (signosCtrl.get('frecuenciaRespiratoria')?.invalid) {
      return 'En Signos Vitales: Ingrese una Frecuencia Respiratoria válida (8 a 60 rpm).';
    }
    if (signosCtrl.get('temperatura')?.invalid) {
      return 'En Signos Vitales: Ingrese una Temperatura válida (34 a 43 °C).';
    }
    if (signosCtrl.get('saturacionOxigeno')?.invalid) {
      return 'En Signos Vitales: Ingrese la Saturación de Oxígeno (50 a 100 %).';
    }
    return 'Verifique los valores y rangos biológicos de los signos vitales ingresados.';
  }
  const examenArray = soapForm.get('examenFisico') as FormArray;
  if (examenArray?.invalid) {
    examenArray.markAllAsTouched();
    return 'Detalle la descripción del hallazgo en los sistemas marcados como anormales (mínimo 3 caracteres).';
  }
  return null;
}

export function validarPasoEvaluacion(
  soapForm: FormGroup,
  diagnosticosArray: FormArray,
): string | null {
  if (!diagnosticosArray || diagnosticosArray.length === 0) {
    return 'Debe registrar al menos un diagnóstico CIE-10 para la evolución médica.';
  }
  if (diagnosticosArray.invalid) {
    diagnosticosArray.markAllAsTouched();
    return 'Complete el código CIE-10 y la descripción de cada diagnóstico registrado.';
  }
  const evolucionLibreCtrl = soapForm.get('evolucionLibre');
  if (evolucionLibreCtrl?.invalid) {
    evolucionLibreCtrl.markAsTouched();
    return 'Redacte la evolución clínica libre del paciente (mínimo 10 caracteres).';
  }
  return null;
}

function validarItemFarmaco(
  item: FormGroup,
  indice: number,
  dxPrincipal: string,
): string | null {
  if (!item.get('diagnostico')?.value) {
    item.get('diagnostico')?.setValue(dxPrincipal);
  }
  const nombreMed =
    item.get('medicamento')?.value || `Medicamento #${indice + 1}`;

  const validaciones = [
    {
      campo: 'medicamento',
      mensaje: `En Tratamiento Farmacológico (Fila #${indice + 1}): Ingrese el nombre del medicamento (mínimo 2 caracteres).`,
    },
    {
      campo: 'cantidad',
      mensaje: `En Tratamiento Farmacológico (Fila #${indice + 1} - "${nombreMed}"): Ingrese una cantidad válida mayor a 0.`,
    },
    {
      campo: 'dosis',
      mensaje: `En Tratamiento Farmacológico (Fila #${indice + 1} - "${nombreMed}"): Ingrese la dosis requerida.`,
    },
    {
      campo: 'unidad',
      mensaje: `En Tratamiento Farmacológico (Fila #${indice + 1} - "${nombreMed}"): Seleccione la unidad de dosis.`,
    },
    {
      campo: 'frecuencia',
      mensaje: `En Tratamiento Farmacológico (Fila #${indice + 1} - "${nombreMed}"): Seleccione la frecuencia de administración.`,
    },
    {
      campo: 'via',
      mensaje: `En Tratamiento Farmacológico (Fila #${indice + 1} - "${nombreMed}"): Seleccione la vía de administración.`,
    },
    {
      campo: 'duracion',
      mensaje: `En Tratamiento Farmacológico (Fila #${indice + 1} - "${nombreMed}"): Ingrese la duración del tratamiento (ej: "7 días").`,
    },
  ];

  for (const val of validaciones) {
    const ctrl = item.get(val.campo);
    if (ctrl?.invalid) {
      ctrl.markAsTouched();
      return val.mensaje;
    }
  }
  return null;
}

function validarItemExamen(item: FormGroup, indice: number): string | null {
  const nombreExamen = item.get('examen')?.value;
  if (item.get('tipo')?.invalid) {
    item.get('tipo')?.markAsTouched();
    return `En Solicitud de Exámenes (Fila #${indice + 1}): Seleccione el tipo de examen.`;
  }
  if (
    item.get('examen')?.invalid ||
    !nombreExamen ||
    String(nombreExamen).trim().length < 2
  ) {
    item.get('examen')?.markAsTouched();
    return `En Solicitud de Exámenes (Fila #${indice + 1}): Ingrese el nombre del examen o elimine la fila si no la requiere.`;
  }
  if (item.get('prioridad')?.invalid) {
    item.get('prioridad')?.markAsTouched();
    return `En Solicitud de Exámenes (Fila #${indice + 1}): Seleccione la prioridad (Urgente, Rutina, Prioritario).`;
  }
  return null;
}

function validarListaFarmacos(
  farmacosArray: FormArray,
  diagnosticosArray: FormArray,
): string | null {
  const dxPrincipal = diagnosticosArray.at(0)?.get('cie10')?.value || '';
  for (let i = 0; i < farmacosArray.length; i++) {
    const error = validarItemFarmaco(
      farmacosArray.at(i) as FormGroup,
      i,
      dxPrincipal,
    );
    if (error) return error;
  }
  return null;
}

function validarListaExamenes(examenesArray: FormArray): string | null {
  for (let i = 0; i < examenesArray.length; i++) {
    const error = validarItemExamen(examenesArray.at(i) as FormGroup, i);
    if (error) return error;
  }
  return null;
}

function validarGruposAdicionales(planForm: FormGroup): string | null {
  const interGroup = planForm.get('interconsultas') as FormGroup;
  if (interGroup?.get('otra')?.invalid) {
    interGroup.get('otra')?.markAsTouched();
    return 'En Interconsultas: El campo "Otra especialidad" supera los 200 caracteres permitidos.';
  }

  const indicGroup = planForm.get('indicacionesGenerales') as FormGroup;
  if (indicGroup?.invalid) {
    indicGroup.markAllAsTouched();
    return 'En Indicaciones Generales: Verifique la longitud de los textos de dieta, reposo o hidratación.';
  }

  return null;
}

export function validarPasoPlan(
  soapForm: FormGroup,
  diagnosticosArray: FormArray,
): string | null {
  const planForm = soapForm.get('plan') as FormGroup;
  if (!planForm) return null;

  const farmacosArray = planForm.get('farmacologico') as FormArray;
  if (farmacosArray) {
    const errorFarmacos = validarListaFarmacos(
      farmacosArray,
      diagnosticosArray,
    );
    if (errorFarmacos) return errorFarmacos;
  }

  const examenesArray = planForm.get('solicitudExamenes') as FormArray;
  if (examenesArray) {
    const errorExamenes = validarListaExamenes(examenesArray);
    if (errorExamenes) return errorExamenes;
  }

  return validarGruposAdicionales(planForm);
}

export function validarPasoActual(
  identificadorPanel: string,
  soapForm: FormGroup,
  diagnosticosArray: FormArray,
): string | null {
  switch (identificadorPanel) {
    case 'p2':
      return validarPasoApreciacion(soapForm);
    case 'p3':
      return validarPasoSubjetivo(soapForm);
    case 'p4':
      return validarPasoObjetivo(soapForm);
    case 'p6':
      return validarPasoEvaluacion(soapForm, diagnosticosArray);
    case 'p7':
      return validarPasoPlan(soapForm, diagnosticosArray);
    default:
      return null;
  }
}

export function obtenerErroresValidacion(
  soapForm: FormGroup,
  diagnosticosArray: FormArray,
): ErrorValidacionSoap[] {
  const errores: ErrorValidacionSoap[] = [];

  const motivoCtrl = soapForm.get('motivo');
  if (motivoCtrl?.invalid) {
    errores.push({
      panel: 'p2',
      grupo: 'encuentro',
      mensaje:
        'Paso 2 (Apreciación clínica): Ingrese una descripción de al menos 5 caracteres.',
    });
  }

  const subjetivoCtrl = soapForm.get('subjetivo');
  if (subjetivoCtrl?.invalid) {
    errores.push({
      panel: 'p3',
      grupo: 'soap',
      mensaje:
        'Paso 3 (Subjetivo): Ingrese una escala de dolor válida (0 a 10).',
    });
  }

  const signosCtrl = soapForm.get('signosVitales');
  if (signosCtrl?.invalid) {
    errores.push({
      panel: 'p4',
      grupo: 'soap',
      mensaje:
        'Paso 4 (Signos Vitales): Verifique los valores de PA, FC, FR, Temperatura, SatO2, Peso y Talla.',
    });
  }

  const examenArray = soapForm.get('examenFisico') as FormArray;
  if (examenArray?.invalid) {
    errores.push({
      panel: 'p4',
      grupo: 'soap',
      mensaje:
        'Paso 4 (Examen Físico): Describa el hallazgo en los sistemas anormales (mínimo 3 caracteres).',
    });
  }

  if (!diagnosticosArray || diagnosticosArray.length === 0) {
    errores.push({
      panel: 'p6',
      grupo: 'soap',
      mensaje:
        'Paso 6 (Evaluación): Debe registrar al menos un diagnóstico CIE-10.',
    });
  } else if (diagnosticosArray.invalid) {
    errores.push({
      panel: 'p6',
      grupo: 'soap',
      mensaje:
        'Paso 6 (Evaluación): Cada diagnóstico debe tener un código CIE-10 válido y descripción.',
    });
  }

  const evaluacionCtrl = soapForm.get('evaluacion');
  const evolucionLibreCtrl = soapForm.get('evolucionLibre');
  if (evaluacionCtrl?.invalid || evolucionLibreCtrl?.invalid) {
    errores.push({
      panel: 'p6',
      grupo: 'soap',
      mensaje:
        'Paso 6 (Evaluación): Redacte la evolución clínica libre (mínimo 10 caracteres).',
    });
  }

  const errorPlan = validarPasoPlan(soapForm, diagnosticosArray);
  if (errorPlan) {
    errores.push({
      panel: 'p7',
      grupo: 'soap',
      mensaje: `Paso 7 (Plan): ${errorPlan}`,
    });
  }

  return errores;
}
