import { horaDesdeFechaReceta } from './auditoria-qf.filtros';
import type {
  EstadoRecetaOpcion,
  HistoricoMedicamento,
  MedicamentoReceta,
  RecetaBandeja,
} from './auditoria-qf.tipos';

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

export function mapearMedicamentoReceta(fila: Record<string, unknown>): MedicamentoReceta {
  return {
    idPaciente: entero(fila, ['IdPaciente', 'idPaciente']),
    idProducto: entero(fila, ['IdProducto', 'idProducto']),
    codigo: texto(fila, ['Codigo', 'Código', 'codigo']),
    nombre: texto(fila, ['Nombre', 'nombre']),
    cantidadPedida: texto(fila, ['CantidadPedida', 'cantidadPedida']),
    via: viaVisible(texto(fila, ['VIA', 'Via', 'via'])),
    tratamiento: texto(fila, ['Tratamiento', 'tratamiento']),
    solicitadoAntes: esAfirmativo(texto(fila, ['SolicitadoAntes', 'solicitadoAntes'])),
  };
}

export function mapearHistoricoMedicamento(fila: Record<string, unknown>): HistoricoMedicamento {
  return {
    fecha: fechaVisible(texto(fila, ['Fecha', 'fecha'])),
    medico: texto(fila, ['Medico', 'Médico', 'medico']),
    tratamiento: texto(fila, ['Tratamiento', 'tratamiento']),
    cantidadDespachada: texto(fila, ['CantidadDespachada', 'cantidadDespachada']),
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

function entero(fila: Record<string, unknown>, claves: string[]): number {
  const numero = Number(texto(fila, claves));
  return Number.isInteger(numero) && numero > 0 ? numero : 0;
}

function viaVisible(via: string): string {
  if (!via || via === '--' || via === '-') return '';
  return via;
}

function esAfirmativo(valor: string): boolean {
  const limpio = valor.trim().toLowerCase();
  return limpio !== '' && limpio !== 'no' && limpio !== '0';
}

function fechaVisible(valor: string): string {
  const coincidencia = valor.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!coincidencia) return valor;
  return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]} · ${coincidencia[4]}:${coincidencia[5]}`;
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
