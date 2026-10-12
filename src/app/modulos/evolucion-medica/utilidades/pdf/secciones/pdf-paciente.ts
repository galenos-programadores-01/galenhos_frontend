import {
  COLOR_BORDE_MEDIO,
  COLOR_BORDE_SUAVE,
  COLOR_FONDO_BLANCO,
  COLOR_FONDO_GRIS,
  COLOR_PRIMARIO,
  COLOR_TEXTO_MUTED,
  COLOR_TEXTO_TITULO,
} from '../evolucion-pdf.constantes';
import { convertirTexto, formatearValor } from '../evolucion-pdf.helpers';
import type { PdfLienzoEvolucion } from '../evolucion-pdf.lienzo';
import type { EvolucionPdfData } from '../evolucion-pdf.tipos';

export function dibujarTarjetaPaciente(
  lienzo: PdfLienzoEvolucion,
  paciente: EvolucionPdfData['paciente'],
  cabecera: EvolucionPdfData['cabecera'],
): void {
  lienzo.pacienteNombre = paciente.nombre;
  lienzo.pacienteHistoria = paciente.historia;

  lienzo.dibujarTituloSeccion(
    'IDENTIFICACIÓN DEL PACIENTE Y ATENCIÓN CLÍNICA',
    `REGISTRO N° EV-${paciente.idRegAtencion}`,
  );

  const servicioTexto =
    convertirTexto(paciente.servicio) ||
    convertirTexto(cabecera.servicio) ||
    convertirTexto(paciente.ubicacion);
  const especialidadTexto =
    convertirTexto(paciente.especialidad) ||
    convertirTexto(cabecera.especialidad);

  const camposFila1 = [
    { etiqueta: 'EDAD', valor: formatearValor(paciente.edad), ancho: 38 },
    { etiqueta: 'SEXO', valor: formatearValor(paciente.sexo), ancho: 20 },
    { etiqueta: 'ESTADO', valor: formatearValor(paciente.estado), ancho: 26 },
    {
      etiqueta: 'SERVICIO',
      valor: formatearValor(servicioTexto),
      ancho: 70,
    },
    {
      etiqueta: 'CAMA',
      valor: formatearValor(paciente.cama),
      ancho: 28,
    },
  ];

  const camposFila2 = [
    {
      etiqueta: 'MÉDICO TRATANTE',
      valor: formatearValor(cabecera.medicoTratante),
      ancho: 62,
    },
    {
      etiqueta: 'ESPECIALIDAD',
      valor: formatearValor(especialidadTexto),
      ancho: 52,
    },
    {
      etiqueta: 'TIPO DE ATENCIÓN',
      valor: formatearValor(cabecera.tipoAtencion),
      ancho: 32,
    },
    {
      etiqueta: 'FECHA Y HORA',
      valor: `${formatearValor(cabecera.fecha)}   ${formatearValor(cabecera.hora)}`,
      ancho: 36,
    },
  ];

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(6.5);

  let maxLineasFila1 = 1;
  const camposProcesadosFila1 = camposFila1.map((campo) => {
    const lineas = lienzo.doc.splitTextToSize(campo.valor, campo.ancho - 3);
    if (lineas.length > maxLineasFila1) {
      maxLineasFila1 = lineas.length;
    }
    return { ...campo, lineas };
  });
  const altoFila1 = Math.max(9, maxLineasFila1 * 3.4 + 4.8);

  let maxLineasFila2 = 1;
  const camposProcesadosFila2 = camposFila2.map((campo) => {
    const lineas = lienzo.doc.splitTextToSize(campo.valor, campo.ancho - 3);
    if (lineas.length > maxLineasFila2) {
      maxLineasFila2 = lineas.length;
    }
    return { ...campo, lineas };
  });
  const altoFila2 = Math.max(9, maxLineasFila2 * 3.4 + 4.8);

  const altoCabecera = 11.5;
  const alturaTarjeta = altoCabecera + altoFila1 + altoFila2 + 3.0;

  lienzo.asegurarEspacio(alturaTarjeta + 3);

  lienzo.doc.setFillColor(...COLOR_FONDO_GRIS);
  lienzo.doc.setDrawColor(...COLOR_BORDE_MEDIO);
  lienzo.doc.setLineWidth(0.2);
  lienzo.doc.roundedRect(
    lienzo.margenIzquierdo,
    lienzo.posicionVertical,
    lienzo.anchoContenido,
    alturaTarjeta,
    1.5,
    1.5,
    'FD',
  );

  lienzo.doc.setFillColor(...COLOR_PRIMARIO);
  lienzo.doc.rect(
    lienzo.margenIzquierdo,
    lienzo.posicionVertical,
    2.5,
    alturaTarjeta,
    'F',
  );

  const posX = lienzo.margenIzquierdo + 5;
  const posYHeader = lienzo.posicionVertical + 5.2;

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(5.5);
  lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
  lienzo.doc.text('PACIENTE:', posX, posYHeader);

  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(8.5);
  lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
  const nombrePaciente = (
    paciente.nombre || 'PACIENTE NO IDENTIFICADO'
  ).toUpperCase();
  lienzo.doc.text(nombrePaciente, posX + 16, posYHeader, {
    maxWidth: lienzo.anchoContenido - 85,
  });

  const textoBadges = `HC: ${paciente.historia || 'S/N'}  •  ATENCIÓN: EV-${paciente.idRegAtencion}`;
  const xBadges = lienzo.anchoPagina - lienzo.margenDerecho - 4;
  const anchoBadges = 58;

  lienzo.doc.setFillColor(...COLOR_PRIMARIO);
  lienzo.doc.roundedRect(
    xBadges - anchoBadges,
    posYHeader - 3.8,
    anchoBadges,
    5.2,
    1,
    1,
    'F',
  );
  lienzo.doc.setFont('helvetica', 'bold');
  lienzo.doc.setFontSize(5.8);
  lienzo.doc.setTextColor(...COLOR_FONDO_BLANCO);
  lienzo.doc.text(textoBadges, xBadges - anchoBadges / 2, posYHeader - 0.2, {
    align: 'center',
  });

  const yLineaDiv = posYHeader + 4.2;
  lienzo.doc.setDrawColor(...COLOR_BORDE_SUAVE);
  lienzo.doc.setLineWidth(0.18);
  lienzo.doc.line(
    posX,
    yLineaDiv,
    lienzo.anchoPagina - lienzo.margenDerecho - 4,
    yLineaDiv,
  );

  const yFila1 = yLineaDiv + 4.5;
  let xCampo1 = posX;
  for (const campo of camposProcesadosFila1) {
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5);
    lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
    lienzo.doc.text(campo.etiqueta, xCampo1, yFila1);

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(6.5);
    lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
    lienzo.doc.text(campo.lineas, xCampo1, yFila1 + 3.6);

    xCampo1 += campo.ancho;
  }

  const yFila2 = yFila1 + altoFila1;
  let xCampo2 = posX;
  for (const campo of camposProcesadosFila2) {
    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(5);
    lienzo.doc.setTextColor(...COLOR_TEXTO_MUTED);
    lienzo.doc.text(campo.etiqueta, xCampo2, yFila2);

    lienzo.doc.setFont('helvetica', 'bold');
    lienzo.doc.setFontSize(6.5);
    lienzo.doc.setTextColor(...COLOR_TEXTO_TITULO);
    lienzo.doc.text(campo.lineas, xCampo2, yFila2 + 3.6);

    xCampo2 += campo.ancho;
  }

  lienzo.posicionVertical += alturaTarjeta + 3;
}
