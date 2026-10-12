import type { IPacienteDatosAdicionales } from '../../../../../compartido/tipos/tipos';
import {
  COLOR_ALERTA_BORDE,
  COLOR_ALERTA_FONDO,
  COLOR_ALERTA_TEXTO,
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_PRIMARIO_OSCURO,
  COLOR_TEXTO_CUERPO,
} from '../evolucion-pdf.constantes';
import { formatearValor } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';

function obtenerTextoComorbilidades(
  antecedentes: IPacienteDatosAdicionales,
): string {
  const catalogoComorbilidades: [keyof IPacienteDatosAdicionales, string][] = [
    ['hipertensionArterial', 'Hipertensión Arterial'],
    ['anemia', 'Anemia'],
    ['tuberculosis', 'Tuberculosis'],
    ['obesidad', 'Obesidad'],
    ['higadoGraso', 'Hígado Graso'],
    ['fumaActualmente', 'Tabaquismo Activo'],
    ['dislipidemia', 'Dislipidemia'],
    ['enfTiroidea', 'Enfermedad Tiroidea'],
    ['cancer', 'Neoplasia / Cáncer'],
  ];

  const encontradas = catalogoComorbilidades
    .filter(([campo]) => antecedentes[campo] === 1)
    .map(([, nombre]) => nombre);

  return encontradas.length > 0
    ? encontradas.join(' • ')
    : 'Sin comorbilidades reportadas';
}

export function dibujarAntecedentes(
  lienzo: PdfLienzoEvolucion,
  antecedentes: IPacienteDatosAdicionales | null | undefined,
): void {
  if (!antecedentes) return;

  lienzo.dibujarTituloSeccion('HISTORIAL CLÍNICO Y ANTECEDENTES RELEVANTES');

  const filasAntecedentes = [
    {
      etiqueta1: 'QUIRÚRGICOS',
      valor1: formatearValor(antecedentes.antecedQuirurgico),
      etiqueta2: 'PATOLÓGICOS',
      valor2: formatearValor(antecedentes.antecedPatologico),
    },
    {
      etiqueta1: 'OBSTÉTRICOS',
      valor1: formatearValor(antecedentes.antecedObstetrico),
      etiqueta2: 'ALERGIAS / REACCIONES',
      valor2: formatearValor(antecedentes.antecedAlergico),
    },
    {
      etiqueta1: 'FAMILIARES',
      valor1: formatearValor(antecedentes.antecedFamiliar),
      etiqueta2: 'OTROS ANTECEDENTES',
      valor2: formatearValor(antecedentes.antecedentes),
    },
  ];

  const anchoMitad = (lienzo.anchoContenido - 2) / 2;

  for (const fila of filasAntecedentes) {
    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(5.8);
    const lineasValor1 = lienzo.doc.splitTextToSize(
      fila.valor1,
      anchoMitad - 34,
    );
    const lineasValor2 = lienzo.doc.splitTextToSize(
      fila.valor2,
      anchoMitad - 40,
    );
    const maxLineas = Math.max(lineasValor1.length, lineasValor2.length);
    const altoFila = Math.max(6.8, maxLineas * 3.2 + 3.4);

    lienzo.asegurarEspacio(altoFila + 2);

    const esAlergiaAlerta =
      fila.etiqueta2.includes('ALERGIAS') &&
      fila.valor2 !== '—' &&
      !fila.valor2.toLowerCase().includes('niega') &&
      !fila.valor2.toLowerCase().includes('ningun') &&
      !fila.valor2.toLowerCase().includes('no refiere');

    lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
    lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
    lienzo.doc.setLineWidth(0.18);
    lienzo.doc.roundedRect(
      lienzo.margenIzquierdo,
      lienzo.posicionVertical,
      anchoMitad,
      altoFila,
      0.8,
      0.8,
      'FD',
    );

    if (esAlergiaAlerta) {
      lienzo.doc.setFillColor(...COLOR_ALERTA_FONDO);
      lienzo.doc.setDrawColor(...COLOR_ALERTA_BORDE);
      lienzo.doc.setLineWidth(0.2);
    } else {
      lienzo.doc.setFillColor(...COLOR_FONDO_BLANCO);
      lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
      lienzo.doc.setLineWidth(0.18);
    }
    lienzo.doc.roundedRect(
      lienzo.margenIzquierdo + anchoMitad + 2,
      lienzo.posicionVertical,
      anchoMitad,
      altoFila,
      0.8,
      0.8,
      'FD',
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5);
    lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
    lienzo.doc.text(
      fila.etiqueta1,
      lienzo.margenIzquierdo + 2.5,
      lienzo.posicionVertical + 4.0,
    );

    lienzo.doc.setFont('helvetica', 'normal');
    lienzo.doc.setFontSize(5.8);
    lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
    lienzo.doc.text(
      lineasValor1,
      lienzo.margenIzquierdo + 32,
      lienzo.posicionVertical + 4.0,
    );

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5);
    lienzo.doc.setTextColor(
      ...(esAlergiaAlerta ? COLOR_ALERTA_TEXTO : COLOR_PRIMARIO_OSCURO),
    );
    lienzo.doc.text(
      fila.etiqueta2,
      lienzo.margenIzquierdo + anchoMitad + 4.5,
      lienzo.posicionVertical + 4.0,
    );

    lienzo.doc.setFont('helvetica', esAlergiaAlerta ? 'bold' : 'normal');
    lienzo.doc.setFontSize(5.8);
    lienzo.doc.setTextColor(
      ...(esAlergiaAlerta ? COLOR_ALERTA_TEXTO : COLOR_TEXTO_CUERPO),
    );
    lienzo.doc.text(
      lineasValor2,
      lienzo.margenIzquierdo + anchoMitad + 38,
      lienzo.posicionVertical + 4.0,
    );

    lienzo.posicionVertical += altoFila + 1.5;
  }

  const comorbilidadesTexto = obtenerTextoComorbilidades(antecedentes);
  lienzo.doc.setFont('helvetica', 'normal');
  lienzo.doc.setFontSize(5.8);
  const lineasComorb = lienzo.doc.splitTextToSize(
    comorbilidadesTexto,
    lienzo.anchoContenido - 35,
  );
  const altoComorb = Math.max(6.8, lineasComorb.length * 3.2 + 3.4);

  lienzo.asegurarEspacio(altoComorb + 2);

  lienzo.doc.setFillColor(...COLOR_FONDO_GRIS);
  lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
  lienzo.doc.setLineWidth(0.18);
  lienzo.doc.roundedRect(
    lienzo.margenIzquierdo,
    lienzo.posicionVertical,
    lienzo.anchoContenido,
    altoComorb,
    0.8,
    0.8,
    'FD',
  );

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(5);
  lienzo.doc.setTextColor(...COLOR_PRIMARIO_OSCURO);
  lienzo.doc.text(
    'COMORBILIDADES',
    lienzo.margenIzquierdo + 2.5,
    lienzo.posicionVertical + 4.0,
  );

  lienzo.doc.setFont('helvetica', 'normal');
  lienzo.doc.setFontSize(5.8);
  lienzo.doc.setTextColor(...COLOR_TEXTO_CUERPO);
  lienzo.doc.text(
    lineasComorb,
    lienzo.margenIzquierdo + 32,
    lienzo.posicionVertical + 4.0,
  );

  lienzo.posicionVertical += altoComorb + 2.5;
}
