const PATTERNS: string[] = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212',
  '221213','221312','231212','112232','122132','122231','113222','123122','123221',
  '223211','221132','221231','213212','223112','312131','311222','321122','321221',
  '312212','322112','322211','212123','212321','232121','111323','131123','131321',
  '112313','132113','132311','211313','231113','231311','112133','112331','132131',
  '113123','113321','133121','313121','211331','231131','213113','213311','213131',
  '311123','311321','331121','312113','312311','332111','314111','221411','431111',
  '111224','111422','121124','121421','141122','141221','112214','112412','122114',
  '122411','142112','142211','241211','221114','413111','241112','134111','111242',
  '121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311',
  '113141','114131','311141','411131','211412','211214','211232',
];

const STOP_FINAL = '2331112';
const ZONA_SEGURA = 10;

function extraerDigitos(patron: string): number[] {
  return Array.from(patron, (ch) => Number(ch));
}

export function generarBarcodeHtml(valor: string, alto = 40): string {
  if (!valor) return '';

  const datos: number[] = [];
  for (const ch of valor) {
    const code = ch.charCodeAt(0);
    datos.push(code >= 32 && code <= 127 ? code - 32 : 63);
  }

  let suma = 104;
  for (let i = 0; i < datos.length; i++) {
    suma += datos[i] * (i + 1);
  }

  const simbolos: number[] = [104, ...datos, suma % 103];

  const celdas: number[] = [ZONA_SEGURA];
  for (const s of simbolos) celdas.push(...extraerDigitos(PATTERNS[s]));
  celdas.push(...extraerDigitos(STOP_FINAL));
  celdas.push(ZONA_SEGURA);

  const total = celdas.reduce((a, b) => a + b, 0);
  const td = (ancho: number, color: string) =>
    `<td style="width:${((ancho / total) * 100).toFixed(4)}%;padding:0;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact" bgcolor="${color}">&nbsp;</td>`;

  const cuerpo = celdas
    .map((ancho, i) => td(ancho, i % 2 === 0 ? '#ffffff' : '#000000'))
    .join('');

  return `<table border="0" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse;height:${alto}px;-webkit-print-color-adjust:exact;print-color-adjust:exact"><tr>${cuerpo}</tr></table>`;
}