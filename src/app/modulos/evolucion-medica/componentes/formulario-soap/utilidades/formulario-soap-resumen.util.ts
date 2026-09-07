import type { FormArray, FormGroup } from '@angular/forms';
import type { PacienteItem } from '../../../servicios/evolucion.service';
import type { ItemResumenVerificacion } from '../constantes/formulario-soap.constantes';

export function calcularResumenVerificacion(
  soapForm: FormGroup,
  diagnosticosArray: FormArray,
  adjuntosArray: FormArray,
  paciente: PacienteItem | null,
  totalSintomasCount: number,
): ItemResumenVerificacion[] {
  const motivo = soapForm.get('motivo.descripcion')?.value;
  const evolucionTxt = soapForm.get('subjetivo.evolucionSintomas')?.value;
  const eva = soapForm.get('subjetivo.escalaDolor')?.value;

  const pa = soapForm.get('signosVitales.presionArterial')?.value;
  const fc = soapForm.get('signosVitales.frecuenciaCardiaca')?.value;
  const temp = soapForm.get('signosVitales.temperatura')?.value;
  const sat = soapForm.get('signosVitales.saturacionOxigeno')?.value;

  const totalDx = diagnosticosArray.length;
  const farmacosArray = soapForm.get('plan.farmacologico') as FormArray;
  const totalFarmacos = farmacosArray?.length ?? 0;
  const examenesArray = soapForm.get('plan.solicitudExamenes') as FormArray;
  const totalExamenes = examenesArray?.length ?? 0;
  const totalAdjuntos = adjuntosArray.length;

  return [
    {
      panelId: 'p1',
      numero: '01',
      titulo: 'Información general',
      completado: Boolean(paciente?.idPaciente || paciente?.idRegAtencion),
      detalle: paciente
        ? `HC: ${paciente.historia} · Cama: ${paciente.cama || '—'}`
        : 'Sin paciente seleccionado',
    },
    {
      panelId: 'p2',
      numero: '02',
      titulo: 'Apreciación y motivo',
      completado: Boolean(motivo && String(motivo).trim().length >= 3),
      detalle: motivo
        ? `Motivo: ${String(motivo).slice(0, 32)}...`
        : 'Motivo de consulta registrado',
    },
    {
      panelId: 'p3',
      numero: '03',
      titulo: 'Subjetivo (Síntomas y EVA)',
      completado: Boolean(
        totalSintomasCount > 0 ||
          (evolucionTxt && String(evolucionTxt).trim().length > 0),
      ),
      detalle: `${totalSintomasCount} síntoma(s) · Dolor EVA: ${eva ?? 0}/10`,
    },
    {
      panelId: 'p4',
      numero: '04',
      titulo: 'Objetivo (Signos y Examen)',
      completado: Boolean(pa && fc && temp),
      detalle: `PA: ${pa ?? '—'} · FC: ${fc ?? '—'} lpm · T°: ${temp ?? '—'}°C · Sat: ${sat ?? '—'}%`,
    },
    {
      panelId: 'p5',
      numero: '05',
      titulo: 'Resultados revisados',
      completado: true,
      detalle: 'Laboratorio e imágenes verificados',
    },
    {
      panelId: 'p6',
      numero: '06',
      titulo: 'Evaluación y Diagnósticos',
      completado: totalDx > 0,
      detalle:
        totalDx > 0
          ? `${totalDx} diagnóstico(s) CIE-10 asignado(s)`
          : 'Sin diagnósticos registrados',
    },
    {
      panelId: 'p7',
      numero: '07',
      titulo: 'Plan de Tratamiento y Receta',
      completado: Boolean(
        totalFarmacos > 0 ||
          totalExamenes > 0 ||
          soapForm.get('plan.indicacionesGenerales.dieta')?.value,
      ),
      detalle: `${totalFarmacos} medicamento(s) · ${totalExamenes} examen(es) auxiliar(es)`,
    },
    {
      panelId: 'p9',
      numero: '08',
      titulo: 'Documentación y Alta',
      completado: true,
      detalle: 'Procedimientos y certificados verificados',
    },
    {
      panelId: 'p14',
      numero: '09',
      titulo: 'Adjuntos e Imágenes',
      completado: true,
      detalle:
        totalAdjuntos > 0
          ? `${totalAdjuntos} archivo(s) adjunto(s)`
          : 'Sin archivos adjuntos',
    },
  ];
}
