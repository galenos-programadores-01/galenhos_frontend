import {
  PA_ID_PUNTO_CARGA_FARMACIA,
  PA_ID_PUNTO_CARGA_PROCEDIMIENTOS,
  type DocumentoFirmaPa,
  type EntradaArmarDocumentosFirmaPa,
  type ItemExamenDocumentoFirmaPa,
  type ItemMedicamentoDocumentoFirmaPa,
} from './primera-atencion-firma.tipos';

type AccExamen = {
  idReceta: number;
  idPuntoCarga: number | null;
  etiquetaPunto: string;
  items: ItemExamenDocumentoFirmaPa[];
};

/**
 * Arma la lista de documentos del lote PA.
 * Orden: Primera Atención → Exámenes (A–Z) → Medicamentos.
 * Nombres canónicos (mismo basename que FTP):
 *   {idPrimeraAtencion}.pdf
 *   {idPrimeraAtencion}_{idReceta}.pdf
 * Satélites sin IdReceta no entran (no hay path mapeable).
 */
export function armarDocumentosFirmaPa(
  entrada: EntradaArmarDocumentosFirmaPa,
): DocumentoFirmaPa[] {
  const idPA =
    Number.isFinite(entrada.idPrimeraAtencion) && entrada.idPrimeraAtencion > 0
      ? entrada.idPrimeraAtencion
      : 0;

  const docs: DocumentoFirmaPa[] = [
    {
      clave: 'pa',
      etiqueta: 'Primera Atención',
      tipo: 'pa',
      idReceta: null,
      idPuntoCarga: null,
      cantidadItems: 1,
      nombreArchivoSugerido: nombreArchivoPa(idPA),
      examenes: [],
      medicamentos: [],
    },
  ];

  const porGrupo = new Map<string, AccExamen>();
  for (const e of entrada.examenes) {
    if (e.idProducto == null && !(e.nombre || '').trim()) continue;
    const idPunto =
      typeof e.idPuntoCarga === 'number' && e.idPuntoCarga > 0
        ? e.idPuntoCarga
        : null;
    if (idPunto === PA_ID_PUNTO_CARGA_PROCEDIMIENTOS) continue;

    const idReceta =
      typeof e.idReceta === 'number' && e.idReceta > 0 ? e.idReceta : null;
    // Sin IdReceta no hay path FTP mapeable.
    if (idReceta == null) continue;

    const etiquetaPunto = (e.puntoCarga || '').trim() || 'Sin punto de carga';
    const claveGrupo = `receta:${idReceta}`;

    const item: ItemExamenDocumentoFirmaPa = {
      idProducto: e.idProducto,
      idReceta,
      idPuntoCarga: idPunto,
      puntoCarga: e.puntoCarga ?? null,
      nombre: (e.nombre || '').trim(),
      codigo: (e.codigo || '').trim(),
      idDiagnostico: e.idDiagnostico ?? null,
      cie10Dx: (e.cie10Dx || '').trim() || '—',
    };

    const prev = porGrupo.get(claveGrupo);
    if (prev) {
      prev.items.push(item);
    } else {
      porGrupo.set(claveGrupo, {
        idReceta,
        idPuntoCarga: idPunto,
        etiquetaPunto,
        items: [item],
      });
    }
  }

  const examenesOrdenados = [...porGrupo.entries()].sort((a, b) => {
    if (a[1].etiquetaPunto === 'Sin punto de carga') return 1;
    if (b[1].etiquetaPunto === 'Sin punto de carga') return -1;
    return a[1].etiquetaPunto.localeCompare(b[1].etiquetaPunto, 'es');
  });

  for (const [claveGrupo, g] of examenesOrdenados) {
    docs.push({
      clave: `examen:${claveGrupo}`,
      etiqueta: `Examen - ${g.etiquetaPunto}`,
      tipo: 'examen',
      idReceta: g.idReceta,
      idPuntoCarga: g.idPuntoCarga,
      cantidadItems: g.items.length,
      nombreArchivoSugerido: nombreArchivoReceta(idPA, g.idReceta),
      examenes: g.items,
      medicamentos: [],
    });
  }

  const meds: ItemMedicamentoDocumentoFirmaPa[] = [];
  for (const m of entrada.medicamentos) {
    if (m.idProducto === '' || m.idProducto == null) continue;
    const idProducto = Number(m.idProducto);
    if (!Number.isFinite(idProducto) || idProducto <= 0) continue;
    const idReceta =
      typeof m.idReceta === 'number' && m.idReceta > 0 ? m.idReceta : null;
    if (idReceta == null) continue;
    meds.push({
      idProducto,
      idReceta,
      nombre: (m.nombre || '').trim(),
      cantidad: (m.cantidad || '').trim(),
      dosis: (m.dosis || '').trim(),
      unidad: (m.unidad || '').trim(),
      frecuencia: (m.frecuencia || '').trim(),
      via: (m.via || '').trim(),
      duracion: (m.duracion || '').trim(),
      idDiagnostico: m.idDiagnostico ?? null,
      cie10Dx: (m.cie10Dx || '').trim() || '—',
    });
  }

  if (meds.length > 0) {
    const idRecetaMed = meds[0].idReceta;
    if (idRecetaMed != null && idRecetaMed > 0) {
      docs.push({
        clave: 'medicamentos',
        etiqueta: 'Medicamentos',
        tipo: 'medicamentos',
        idReceta: idRecetaMed,
        idPuntoCarga: PA_ID_PUNTO_CARGA_FARMACIA,
        cantidadItems: meds.length,
        nombreArchivoSugerido: nombreArchivoReceta(idPA, idRecetaMed),
        examenes: [],
        medicamentos: meds,
      });
    }
  }

  return docs;
}

function nombreArchivoPa(idPrimeraAtencion: number): string {
  return idPrimeraAtencion > 0 ? `${idPrimeraAtencion}.pdf` : 'PA.pdf';
}

function nombreArchivoReceta(
  idPrimeraAtencion: number,
  idReceta: number,
): string {
  if (idPrimeraAtencion > 0 && idReceta > 0) {
    return `${idPrimeraAtencion}_${idReceta}.pdf`;
  }
  return idReceta > 0 ? `${idReceta}.pdf` : 'receta.pdf';
}
