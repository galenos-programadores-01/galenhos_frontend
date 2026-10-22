import type { FiltroDispensacion, RecetaDispensacion } from './dispensacion-receta.tipos';

export function etiquetaEstado(estado: RecetaDispensacion['estado']): string {
  return estado === 'atendido' ? 'Atendido' : 'Por atender';
}

export function etiquetaPrioridad(prioridad: RecetaDispensacion['prioridad']): string {
  return prioridad === 'urgente' ? 'Urgente' : 'Normal';
}

export function serviciosDe(recetas: readonly RecetaDispensacion[]): string[] {
  return [...new Set(recetas.map((receta) => receta.servicio))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

export function filtrarRecetas(
  recetas: readonly RecetaDispensacion[],
  filtro: FiltroDispensacion,
): RecetaDispensacion[] {
  const texto = filtro.buscar.trim().toLowerCase().replace(/^#/, '');
  return recetas.filter((receta) => {
    if (filtro.estado && receta.estado !== filtro.estado) return false;
    if (filtro.servicio && receta.servicio !== filtro.servicio) return false;
    if (filtro.prioridad && receta.prioridad !== filtro.prioridad) return false;
    if (!texto) return true;
    return (
      receta.paciente.toLowerCase().includes(texto) ||
      receta.dni.includes(texto) ||
      receta.numReceta.toLowerCase().includes(texto)
    );
  });
}
