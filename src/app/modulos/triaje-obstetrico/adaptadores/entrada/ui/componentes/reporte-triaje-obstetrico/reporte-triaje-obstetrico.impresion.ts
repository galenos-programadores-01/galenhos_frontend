import {
  decodificarBase64Reporte,
  formatFecha,
} from './reporte-triaje-obstetrico.component';

type ValorImprimible = string | number | null | undefined;
type ValorPrimitivo = string | number | boolean;

export function generarHtmlReporteTriaje(
  cabecera: Record<string, unknown>,
  institucion: Record<string, unknown> | null,
  logoMinsa: string | null,
  idTriaje: string,
  fechaImp: string,
): string {
  const datosCabecera = cabecera;
  const datosInstitucion = institucion;

  const formatearValor = (valorFormato: ValorImprimible) =>
    valorFormato === null || valorFormato === undefined || valorFormato === ''
      ? '—'
      : String(valorFormato);

  const generarCelda = (value: ValorImprimible, centro = false) =>
    `<td style="border:1px solid #000;font-size:10px;text-align:${centro ? 'center' : 'left'};text-transform:uppercase;padding:2px 5px">${formatearValor(value)}</td>`;

  const generarCeldaExtendida = (
    columnas: number,
    value: ValorImprimible,
    centro = false,
  ) =>
    `<td colspan="${columnas}" style="border:1px solid #000;font-size:10px;text-align:${centro ? 'center' : 'left'};text-transform:uppercase;padding:2px 5px">${formatearValor(value)}</td>`;

  const generarEtiqueta = (textoEtiqueta: string) =>
    `<td style="background:#cccccc;border:1px solid #000;font-size:10px;text-align:center">${textoEtiqueta}</td>`;

  const obtenerTexto = (claveValor: string) => {
    const valor = datosCabecera[claveValor];
    return valor !== undefined && valor !== null && valor !== ''
      ? String(valor as ValorPrimitivo)
      : '';
  };

  const obtenerDecodificado = (claveValor: string) => {
    const valor = datosCabecera[claveValor];
    return valor !== undefined && valor !== null && valor !== ''
      ? decodificarBase64Reporte(String(valor as ValorPrimitivo))
      : '—';
  };

  const obtenerInstitucion = (claveValor: string) => {
    const valor = datosInstitucion?.[claveValor];
    return valor !== undefined && valor !== null && valor !== ''
      ? String(valor as ValorPrimitivo)
      : '—';
  };

  const logo = logoMinsa;

  const formatearDireccion = () => {
    const dir = obtenerTexto('Direccion');
    const dist = obtenerTexto('Distrito');
    if (dir === '—' || dir === '') return '—';
    return dist !== '—' && dist !== '' ? `${dir}, ${dist}` : dir;
  };

  return `<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Triaje N° ${idTriaje}</title>
    <style>
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 1cm; font-family: Arial; }
      body { font-family: Arial, sans-serif; margin: 1cm; color: #000; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 2px 5px; }
      .centrar { text-align: center; }
    </style></head><body>
      <table style="width:100%"><tr><td style="width:50%;text-align:left">${logo ? `<img src="data:image/png;base64,${logo}" style="width:90px">` : ''}</td>
      <td style="text-align:right;font-size:7px;color:#4c4c4c">Fecha: ${fechaImp}<br>U. Impresión: Usuario</td></tr></table>
      <table style="width:100%;margin-top:8px"><tr><td style="text-align:center;font-size:14px" class="centrar"><b>TRIAJE</b></td></tr></table>
      <table style="width:100%;text-align:center;font-size:9.5px">
        <tr><td style="text-align:center">RUC: ${obtenerInstitucion('rucEess')}</td></tr>
        <tr><td style="text-align:center">DIRECCIÓN: ${obtenerInstitucion('direccion')}</td></tr>
        <tr><td style="text-align:center">Telef.: ${obtenerInstitucion('telefono')}</td></tr>
        <tr><td colspan="35">&nbsp;</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr>
          ${generarEtiqueta('N° DOCUMENTO')} ${generarCeldaExtendida(3, obtenerTexto('NroDocumento'), false)} ${generarEtiqueta('N° DE TRIAJE')} ${generarCelda(datosCabecera.idTriaje as string | number, true)} ${generarEtiqueta('FUEN. FIN')} ${generarCelda(obtenerTexto('fuentefinanciamiento'), true)}
        </tr>
        <tr>${generarEtiqueta('PACIENTE')} ${generarCeldaExtendida(7, obtenerTexto('Paciente'), false)}</tr>
        <tr>
          ${generarEtiqueta('F.NACIMIENTO')} ${generarCeldaExtendida(2, formatFecha(obtenerTexto('FechaNacimiento')), false)}
          ${generarEtiqueta('ESTADO CIVIL')} ${generarCeldaExtendida(2, obtenerTexto('EstadoCivil'), true)}
          ${generarEtiqueta('SEXO')} ${generarCeldaExtendida(2, obtenerTexto('Sexo'), true)}
        </tr>
        <tr>
          ${generarEtiqueta('EDAD')} ${generarCelda(obtenerTexto('Edad'), true)}
          ${generarEtiqueta('DIRECCIÓN')} ${generarCeldaExtendida(5, formatearDireccion(), false)}
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <tr><td colspan="8" style="border:1px solid #000;background:#cccccc;text-align:center;font-size:6.5px;font-weight:bold">FUNCIONES VITALES</td></tr>
        <tr>
          ${['TEM.', 'P.A.', 'F.R.', 'F.C.', 'PESO', 'TALLA', 'IMC', 'GLASGOW / DOLOR'].map((encabezado) => generarEtiqueta(encabezado)).join('')}
        </tr>
        <tr>
          ${generarCelda(obtenerDecodificado('temperatura'), true)}
          ${generarCelda(obtenerTexto('presion_arterial'), true)}
          ${generarCelda(obtenerTexto('frecuencia_respiratoria'), true)}
          ${generarCelda(obtenerTexto('frecuencia_cardiaca'), true)}
          ${generarCelda(obtenerDecodificado('peso'), true)}
          ${generarCelda(obtenerTexto('talla'), true)}
          ${generarCelda(obtenerDecodificado('IMC'), true)}
          ${generarCelda(`${obtenerTexto('escala_glasgow') !== '—' ? obtenerTexto('escala_glasgow') : '—'} / ${obtenerTexto('escala_dolor') !== '—' ? obtenerTexto('escala_dolor') : '—'}`, true)}
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <tr><td colspan="8" style="border:1px solid #000;background:#cccccc;text-align:center;font-size:6.5px"><b>MOTIVO DE CONSULTA</b></td></tr>
        <tr>
          ${generarEtiqueta('Síntomas principales')} ${generarCeldaExtendida(5, obtenerTexto('sintoma_principal'), false)}
          ${generarEtiqueta('Tiempo de evolución')} ${generarCelda(`${obtenerTexto('tiempo_evolucion_cantidad') !== '—' ? obtenerTexto('tiempo_evolucion_cantidad') : ''} ${obtenerTexto('tiempo_evolucion_unidad') !== '—' ? obtenerTexto('tiempo_evolucion_unidad') : ''}`, true)}
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <tr><td colspan="8" style="border:1px solid #000;background:#cccccc;text-align:center;font-size:11px"><b>CLASIFICACIÓN Y DERIVACIÓN</b></td></tr>
        <tr>
          ${generarEtiqueta('Tipo de gravedad')} ${generarCeldaExtendida(3, obtenerTexto('Gravedad'), false)}
          ${generarEtiqueta('Servicio')} ${generarCeldaExtendida(3, obtenerTexto('Servicio'), true)}
        </tr>
      </table>
      ${(() => {
        const tieneDatosGestacion = ['FUR', 'FPP', 'EdadGestacional'].some(
          (clave) => {
            const val = datosCabecera[clave];
            return val !== undefined && val !== null && val !== '';
          },
        );
        if (!tieneDatosGestacion) return '';
        const gestante = datosCabecera.EsGestante;
        const textoGestante =
          gestante !== undefined && gestante !== null && gestante !== ''
            ? String(gestante).toLowerCase() === 'true' ||
              String(gestante) === '1' ||
              String(gestante).toLowerCase() === 'sí'
              ? 'SÍ'
              : 'NO'
            : formatearValor(gestante);
        return `
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <tr><td colspan="8" style="border:1px solid #000;background:#cccccc;text-align:center;font-size:11px"><b>DATOS DE GESTACIÓN</b></td></tr>
        <tr>
          ${generarEtiqueta('GESTANTE')} ${generarCelda(textoGestante, true)}
          ${generarEtiqueta('F.U.R.')} ${generarCelda(formatFecha(obtenerTexto('FUR')), true)}
          ${generarEtiqueta('EDAD GEST.')} ${generarCelda(obtenerTexto('EdadGestacional'), true)}
          ${generarEtiqueta('F.P.P.')} ${generarCelda(formatFecha(obtenerTexto('FPP')), true)}
        </tr>
        <tr>
          ${generarEtiqueta('N° CONTROLES PRENATALES')} ${generarCeldaExtendida(3, obtenerTexto('NroControlesPrenatales'), true)}
          ${generarEtiqueta('MOVIMIENTOS FETALES')} ${generarCeldaExtendida(3, obtenerTexto('MovimientosFetales'), true)}
        </tr>
      </table>
        `;
      })()}
    </body></html>`;
}
