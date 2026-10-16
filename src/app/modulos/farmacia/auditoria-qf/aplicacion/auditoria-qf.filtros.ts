import { DIAS_MAXIMOS_BANDEJA } from './auditoria-qf.tipos';
import type { RecetaBandeja } from './auditoria-qf.tipos';

export function fechaIsoLocal(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function fechaHoraLocal(fecha: Date = new Date()): string {
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  const segundo = String(fecha.getSeconds()).padStart(2, '0');
  return `${fechaIsoLocal(fecha)}T${hora}:${minuto}:${segundo}`;
}

export function sumarDiasIso(iso: string, dias: number): string {
  const fecha = new Date(`${iso}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fechaIsoLocal(fecha);
}

export function diasEntre(desde: string, hasta: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return null;
  }
  const inicio = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null;
  return Math.round((fin.getTime() - inicio.getTime()) / 86_400_000);
}

export function mensajeRangoBandeja(
  desde: string,
  hasta: string,
  maximo = DIAS_MAXIMOS_BANDEJA,
): string {
  if (!desde || !hasta) return 'Indique la fecha desde y la fecha hasta.';
  const dias = diasEntre(desde, hasta);
  if (dias === null) return 'Las fechas no son válidas.';
  if (dias < 0) return 'La fecha desde no puede ser posterior a la fecha hasta.';
  if (dias > maximo) return `El rango máximo es de ${maximo} días.`;
  return '';
}

export function fechaInicioParam(desde: string): string {
  return `${desde}T00:00:00`;
}

export function fechaFinParam(hasta: string, ahora: Date = new Date()): string {
  if (hasta === fechaIsoLocal(ahora)) return fechaHoraLocal(ahora);
  return `${hasta}T23:59:59`;
}

export function horaDesdeFechaReceta(valor: string): string {
  const coincidencia = valor.match(/(?:T|\s)(\d{2}):(\d{2})/);
  if (!coincidencia) return '';
  return `${coincidencia[1]}:${coincidencia[2]}`;
}

/** Busca por Num_Receta, Receta o nombre del paciente. */
export function filtrarPorReceta(
  recetas: readonly RecetaBandeja[],
  buscar: string,
): RecetaBandeja[] {
  const texto = buscar.trim().toLowerCase().replace(/^#/, '');
  if (!texto) return [...recetas];
  return recetas.filter((receta) => {
    const num = receta.numReceta.toLowerCase();
    const codigo = receta.receta.toLowerCase();
    const paciente = receta.paciente.toLowerCase();
    return num.includes(texto) || codigo.includes(texto) || paciente.includes(texto);
  });
}
