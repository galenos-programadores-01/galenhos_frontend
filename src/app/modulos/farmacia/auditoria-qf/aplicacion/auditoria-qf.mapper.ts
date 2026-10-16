import { horaDesdeFechaReceta } from './auditoria-qf.filtros';
import type { EstadoRecetaOpcion, RecetaBandeja } from './auditoria-qf.tipos';

export function mapearRecetaBandeja(fila: Record<string, unknown>): RecetaBandeja {
  const numReceta = texto(fila, ['Num_Receta', 'numReceta', 'NumReceta']);
  const receta = texto(fila, ['Receta', 'receta']) || numReceta;
  return {
    numReceta,
    receta,
    hora: horaDesdeFechaReceta(texto(fila, ['FechaReceta', 'fechaReceta'])),
    paciente: texto(fila, ['Paciente', 'paciente']),
    edad: texto(fila, ['Edad', 'edad']),
    medico: texto(fila, ['Medico', 'Médico', 'medico']),
    servicio: texto(fila, ['Servicio', 'servicio']),
    estadoFirma: texto(fila, ['Estado_Firma', 'EstadoFirma', 'estadoFirma']),
    estado: texto(fila, ['Estado', 'estado']),
  };
}

export function mapearEstadoReceta(fila: Record<string, unknown>): EstadoRecetaOpcion {
  const id = Number(valor(fila, ['idEstado', 'IdEstado']));
  return {
    idEstado: Number.isFinite(id) ? id : 0,
    estado: texto(fila, ['Estado', 'estado']),
  };
}

function valor(fila: Record<string, unknown>, claves: string[]): unknown {
  for (const clave of claves) {
    if (fila[clave] !== undefined && fila[clave] !== null && fila[clave] !== '') {
      return fila[clave];
    }
  }
  const entradas = Object.entries(fila);
  for (const clave of claves) {
    const encontrada = entradas.find(([nombre]) => nombre.toLowerCase() === clave.toLowerCase());
    if (encontrada && encontrada[1] !== undefined && encontrada[1] !== null && encontrada[1] !== '') {
      return encontrada[1];
    }
  }
  return '';
}

function texto(fila: Record<string, unknown>, claves: string[]): string {
  return aTexto(valor(fila, claves));
}

function aTexto(crudo: unknown): string {
  if (typeof crudo === 'string') return crudo.replace(/\u0000/g, '').trim();
  if (typeof crudo === 'number' || typeof crudo === 'boolean') return String(crudo);
  if (crudo instanceof Date) return crudo.toISOString();
  if (crudo && typeof crudo === 'object') {
    const objeto = crudo as Record<string, unknown>;
    for (const clave of ['String', 'string', 'Value', 'value', 'Time', 'time']) {
      if (objeto[clave] !== undefined && objeto[clave] !== null && objeto[clave] !== '') {
        return aTexto(objeto[clave]);
      }
    }
  }
  return '';
}
