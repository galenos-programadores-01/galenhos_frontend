import {
  ChangeDetectorRef,
  Component,
  type ElementRef,
  EventEmitter,
  Input,
  inject,
  type OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { VentanaModal } from '../../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { imprimirHtml } from '../../../../../../../compartido/utilidades/print.util';
import { TriajeApiService } from '../../../../../../triaje/adaptadores/salida/http/triaje.api.service';

type Row = Record<string, unknown>;

function val(row: Row | null | undefined, ...names: string[]): string {
  if (!row) return '';
  for (const name of names) {
    const key = Object.keys(row).find(
      (k) => k.toLowerCase() === name.toLowerCase(),
    );
    if (key !== undefined && row[key] != null) return String(row[key]);
  }
  return '';
}

function marcaSi(valorCampo: string, esperado: string): string {
  return valorCampo === esperado ? 'X' : '';
}

function generarBarras(valor: string, alto = 34): string {
  let barras = '';
  let x = 0;
  const seed = valor.split('').map((c) => c.charCodeAt(0));
  for (let i = 0; i < 46; i++) {
    const w = (seed[i % seed.length] % 3) + 1;
    if (i % 2 === 0)
      barras += `<rect x="${x}" y="0" width="${w}" height="${alto}" fill="#000"/>`;
    x += w + 1;
  }
  return `<svg width="${x}" height="${alto}" viewBox="0 0 ${x} ${alto}" xmlns="http://www.w3.org/2000/svg">${barras}</svg>`;
}

interface FuaDatos {
  datos: Row | null;
  diagnosticos: Row[];
  medicamentos: Row[];
  procedimientos: Row[];
  consumo: Row[];
}

interface DatosInstitucion {
  logoMinsa?: string | null;
}

@Component({
  selector: 'app-sis-fua-report',
  standalone: true,
  imports: [VentanaModal],
  styles: [`@keyframes spin { to { transform: rotate(360deg); } }`],
  templateUrl: './sis-fua-report.component.html',
})
export class SisFuaReportComponent implements OnInit {
  @Input() idCuentaAtencion!: number;
  @Output() alCerrar = new EventEmitter<void>();
  @ViewChild('fuaFrame') fuaFrame!: ElementRef<HTMLIFrameElement>;

  private readonly triajeApi = inject(TriajeApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  cargando = true;
  error = '';
  fua: FuaDatos | null = null;
  institucion: DatosInstitucion | null = null;
  htmlFua = '';

  private static institucionCache: DatosInstitucion | null = null;

  async ngOnInit(): Promise<void> {
    if (!this.idCuentaAtencion) {
      this.cargando = false;
      return;
    }
    try {
      await this.triajeApi.agregarFua(this.idCuentaAtencion);

      const instPromise = SisFuaReportComponent.institucionCache
        ? Promise.resolve(SisFuaReportComponent.institucionCache)
        : this.triajeApi.obtenerDatosInstitucion().then((r) => {
            SisFuaReportComponent.institucionCache =
              r as unknown as DatosInstitucion;
            return SisFuaReportComponent.institucionCache;
          });

      const [rImp, rInst] = await Promise.all([
        this.triajeApi.imprimirFua(this.idCuentaAtencion),
        instPromise,
      ]);

      if (!rImp) {
        this.error = 'No se encontraron los datos del FUA.';
        this.cargando = false;
        this.cdr.detectChanges();
        return;
      }

      this.institucion = rInst || null;
      const datos = rImp as unknown as Row;

      const [diag, med, proc, cons] = await Promise.all([
        this.triajeApi.diagnosticosFua(this.idCuentaAtencion),
        this.triajeApi.medicamentosFua(this.idCuentaAtencion),
        this.triajeApi.procedimientosFua(this.idCuentaAtencion),
        this.triajeApi.consumoFua(this.idCuentaAtencion),
      ]);

      this.fua = {
        datos,
        diagnosticos: diag as unknown as Row[],
        medicamentos: med as unknown as Row[],
        procedimientos: proc as unknown as Row[],
        consumo: cons as unknown as Row[],
      };
      this.htmlFua = this.generarHtmlFua();
      this.cargando = false;
      this.cdr.detectChanges();
      setTimeout(() => this.escribirIframe(), 0);
    } catch {
      this.error = 'No se pudo cargar el FUA.';
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  private escribirIframe(): void {
    const el = this.fuaFrame?.nativeElement;
    if (!el || !this.htmlFua) return;
    const doc = el.contentDocument || el.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(this.htmlFua);
      doc.close();
    }
  }

  imprimir(): void {
    imprimirHtml(this.htmlFua);
  }

  private generarHtmlFua(): string {
    if (!this.fua) return '';
    const { datos, diagnosticos, medicamentos, procedimientos, consumo } =
      this.fua;
    const institucion = this.institucion;
    const idCuentaAtencion = this.idCuentaAtencion;
    const usuario = 'Usuario';
    const fechaImp = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const g = (...names: string[]) => val(datos, ...names);
    const v = (x: unknown) =>
      x === null || x === undefined || x === '' ? '&nbsp;' : String(x);

    const cabeceraSuperior = `
      <table style="width:100%">
        <tr><td style="width:50%;text-align:left">
          ${institucion?.logoMinsa ? `<img src="data:image/png;base64,${institucion.logoMinsa}" width="70" height="70">` : ''}
        </td></tr>
        <tr><td colspan="2" style="text-align:left;font-size:7px;color:#4c4c4c">
          Fecha: ${fechaImp}<br>
          U. Impresión: ${usuario}<br>
          Cuenta: CTA: ${v(g('Cta') || idCuentaAtencion)}
        </td></tr>
      </table>`;

    const tituloYNumero = `
      <table style="width:100%;text-align:center" border="1" cellpadding="0" cellspacing="0">
        <tr><td colspan="5" style="text-align:center;font-size:9px;background-color:#b3b3b3">FORMATO UNICO DE ATENCIÓN</td></tr>
        <tr>
          <td rowspan="2" style="text-align:center;font-size:6.5px;width:30%;padding-left:25px">${generarBarras(String(idCuentaAtencion))}</td>
          <td colspan="3" style="text-align:center;font-size:9px;background-color:#b3b3b3;width:40%">NUMERO DE FORMATO</td>
          <td rowspan="2" style="width:30%">&nbsp;</td>
        </tr>
        <tr>
          <td class="datosfua" style="font-size:12px" height="18px">${v(g('FuaDisa'))}</td>
          <td class="datosfua" style="font-size:12px">${v(g('FuaLote'))}</td>
          <td class="datosfua" style="font-size:12px">${v(g('FuaNumero'))}</td>
        </tr>
      </table>`;

    const institucionTabla = `
      <table style="width:100%;text-align:center;padding-top:1.5px" border="1" cellpadding="0" cellspacing="0">
        <colgroup><col style="width:10%"><col style="width:5%"><col style="width:10%"><col style="width:10%"><col style="width:5%"><col style="width:10%"><col style="width:5%"><col style="width:10%"><col style="width:20%"><col style="width:10%"></colgroup>
        <tr><td colspan="10" style="text-align:center;font-size:8px;background-color:#b3b3b3">DE LA INSTITUCION PRESTADORA DE SERVICIOS DE SALUD</td></tr>
        <tr>
          <td colspan="3" class="datoscabecerafua">CÓDIGO RENAES DE LA IPRESS</td>
          <td colspan="7" class="datoscabecerafua">NOMBRE DE LA IPRESS QUE REALIZA A LA ATENCIÓN</td>
        </tr>
        <tr>
          <td colspan="3" class="datosfua">${v(g('Codigo_Renaes'))}</td>
          <td colspan="7" class="datosfua">${v(g('NombreHosp'))}</td>
        </tr>
        <tr>
          <td colspan="3" class="datoscabecerafua">PERSONAL QUE ATIENDE</td>
          <td colspan="2" class="datoscabecerafua">LUGAR DE ATENCIÓN</td>
          <td colspan="2" class="datoscabecerafua">ATENCIÓN</td>
          <td colspan="3" class="datoscabecerafua">REFERENCIA REALIZADA POR</td>
        </tr>
        <tr>
          <td class="datoscabecerafua">DE LA IPRESS</td>
          <td class="datosfua">${marcaSi(g('FuaPersonalQatiende'), '1')}</td>
          <td class="datoscabecerafua">CODIGO DE LA OFERTA FLEXIBLE</td>
          <td class="datoscabecerafua">INTRAMURAL</td>
          <td class="datosfua">${marcaSi(g('FuaAtencionLugar'), '1')}</td>
          <td class="datoscabecerafua">AMBULATORIA</td>
          <td class="datosfua">${marcaSi(g('Atencion'), '1')}</td>
          <td class="datoscabecerafua">COD RENAES</td>
          <td class="datoscabecerafua">NOMBRE DE LA IPRESS U OFERTA FLEXIBLE</td>
          <td class="datoscabecerafua">N° HOJA DE REFERENCIA</td>
        </tr>
        <tr>
          <td class="datoscabecerafua">ITINERANTE</td>
          <td class="datosfua">${marcaSi(g('FuaPersonalQatiende'), '2')}</td>
          <td rowspan="2" class="datosfua">${v(g('FuaCodOferFlexible'))}</td>
          <td class="datoscabecerafua">EXTRAMURAL</td>
          <td class="datosfua">${marcaSi(g('FuaAtencionLugar'), '2')}</td>
          <td class="datoscabecerafua">REFERENCIA</td>
          <td class="datosfua">${marcaSi(g('Atencion'), '2')}</td>
          <td rowspan="2" class="datosfua">${v(g('Codigo_Referencia'))}</td>
          <td rowspan="2" class="datosfua">${v(g('Nombre_Referencia'))}</td>
          <td rowspan="2" class="datosfua">${v(g('Num_Referencia'))}</td>
        </tr>
        <tr>
          <td class="datoscabecerafua">OFERTA FLEXIBLE</td>
          <td class="datosfua">${marcaSi(g('FuaPersonalQatiende'), '3')}</td>
          <td colspan="2" class="datosfua"></td>
          <td class="datoscabecerafua">EMERGENCIA</td>
          <td class="datosfua">${marcaSi(g('Atencion'), '3')}</td>
        </tr>
      </table>`;

    const aseguradoIdentTabla = `
      <table style="width:100%;text-align:center;padding-top:1.5px" border="1" cellpadding="0" cellspacing="0">
        <colgroup><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:6%"><col style="width:6%"><col style="width:4%"><col style="width:4%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:10%"><col style="width:20%"><col style="width:10%"><col style="width:10%"></colgroup>
        <tr><td colspan="14" style="text-align:center;font-size:8px;background-color:#b3b3b3">DEL ASEGURADO / USUARIO</td></tr>
        <tr>
          <td colspan="4" style="text-align:center;font-size:6.5px;background-color:#b3b3b3">IDENTIFICACIÓN</td>
          <td colspan="6" class="datoscabecerafua">CODIGO DEL ASEGURADO SIS</td>
          <td colspan="4" class="datoscabecerafua">ASEGURADO DE OTRA IAFAS</td>
        </tr>
        <tr>
          <td style="text-align:center;font-size:6.5px;background-color:#b3b3b3">TDI</td>
          <td colspan="3" class="datoscabecerafua">N° DOCUMENTO DE IDENTIDAD</td>
          <td colspan="2" class="datoscabecerafua">DIRESA / OTROS</td>
          <td colspan="4" class="datoscabecerafua">NÚMERO</td>
          <td class="datoscabecerafua">INSTITUCIÓN</td>
          <td colspan="3" class="datosfua"> - </td>
        </tr>
        <tr>
          <td class="datosfua">${v(g('TD_Identificacion'))}</td>
          <td colspan="3" class="datosfua">${v(g('Num_Identificacion'))}</td>
          <td colspan="2" class="datosfua">${v(g('Asegurado_Disa'))}</td>
          <td colspan="2" class="datosfua">${v(g('Asegurado_TipoAfilicion'))}</td>
          <td colspan="2" class="datosfua">${v(g('Asegurado_Numero'))}</td>
          <td style="text-align:center;font-size:6.5px;background-color:#b3b3b3">COD. SEGURO</td>
          <td colspan="3" class="datosfua"></td>
        </tr>
        <tr>
          <td colspan="10" class="datoscabecerafua">APELLIDO PATERNO</td>
          <td colspan="4" class="datoscabecerafua">APELLIDO MATERNO</td>
        </tr>
        <tr>
          <td colspan="10" class="datosfua">${v(g('pd_ApellidoPaterno'))}</td>
          <td colspan="4" class="datosfua">${v(g('pd_ApellidoMaterno'))}</td>
        </tr>
        <tr>
          <td colspan="10" class="datoscabecerafua">PRIMER NOMBRE</td>
          <td colspan="4" class="datoscabecerafua">OTROS NOMBRES</td>
        </tr>
        <tr>
          <td colspan="10" class="datosfua">${v(g('pd_PrimerNombre'))}</td>
          <td colspan="4" class="datosfua">${v(g('pd_SegundoNombre'))}</td>
        </tr>
        <tr>
          <td colspan="3" class="datoscabecerafua">SEXO</td>
          <td colspan="2" class="datoscabecerafua">FECHA</td>
          <td colspan="2" class="datoscabecerafua">DIA</td>
          <td colspan="2" class="datoscabecerafua">MES</td>
          <td colspan="2" class="datoscabecerafua">AÑO</td>
          <td class="datoscabecerafua">N° HISTORIA CLÍNICA</td>
          <td colspan="2" class="datoscabecerafua">ETNIA</td>
        </tr>
        <tr>
          <td colspan="2" class="datoscabecerafua">MASCULINO</td>
          <td class="datosfua">${marcaSi(g('Tp_Sexo'), 'M')}</td>
          <td colspan="2" rowspan="2" class="datoscabecerafua">FECHA PROBABLE PARTO / FECHA DE PARTO</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('FP_Dia'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('FP_Mes'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('FP_Year'))}</td>
          <td rowspan="2" class="datosfua">${v(g('NroHistoriaClinica'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('etnias'))}</td>
        </tr>
        <tr>
          <td colspan="2" class="datoscabecerafua">FEMENINO</td>
          <td class="datosfua">${marcaSi(g('Tp_Sexo'), 'F')}</td>
        </tr>
        <tr>
          <td colspan="3" class="datoscabecerafua">SALUD MATERNA</td>
          <td colspan="2" rowspan="2" class="datoscabecerafua">FECHA DE NACIMIENTO</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('P_Dia'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('P_Mes'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('P_Year'))}</td>
          <td colspan="2" class="datoscabecerafua">DNI / CNV / AFILIACIÓN RN 1</td>
          <td class="datosfua"></td>
        </tr>
        <tr>
          <td colspan="2" rowspan="2" class="datoscabecerafua">GESTANTE</td>
          <td rowspan="2" class="datosfua">${marcaSi(g('Salud_Materno'), '1')}</td>
          <td colspan="2" rowspan="2" class="datoscabecerafua">DNI / CNV / AFILIACIÓN RN 2</td>
          <td rowspan="2" class="datosfua"></td>
        </tr>
        <tr>
          <td colspan="2" rowspan="2" class="datoscabecerafua">FECHA DE FALLECIMIENTO</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('F_Dia'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('F_Mes'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('F_Anio'))}</td>
        </tr>
        <tr>
          <td colspan="2" class="datoscabecerafua">PUERPERA</td>
          <td class="datosfua">${marcaSi(g('Salud_Materno'), '2')}</td>
          <td colspan="2" class="datoscabecerafua">DNI / CNV / AFILIACIÓN RN 3</td>
          <td class="datosfua"></td>
        </tr>
      </table>`;

    const esConsultaExterna = g('FuaCodigoPrestacion') === '056';
    const servicioTabla = `
      <table style="width:100%;text-align:center;padding-top:1.5px" border="1" cellpadding="0" cellspacing="0">
        <colgroup>${Array.from({ length: 20 })
          .map(() => '<col style="width:5%">')
          .join('')}</colgroup>
        <tr><td colspan="20" style="text-align:center;font-size:8px;background-color:#b3b3b3">DEL ASEGURADO / USUARIO</td></tr>
        <tr>
          <td colspan="4" style="text-align:center;font-size:6.5px;background-color:#b3b3b3">FECHA DE ATENCIÓN</td>
          <td class="datoscabecerafua">HORA</td>
          <td colspan="2" class="datoscabecerafua">UPS</td>
          <td colspan="3" class="datoscabecerafua">COD. PRESTA.</td>
          <td colspan="3" class="datoscabecerafua">COD. PRESTACION(ES) ADICONAL(ES)</td>
          <td rowspan="5" class="datoscabecerafua"><span style="writing-mode:vertical-lr;transform:rotate(180deg);display:inline-block">HOSPITALIZACION</span></td>
          <td colspan="2" class="datoscabecerafua">FECHA</td>
          <td class="datoscabecerafua">DIA</td>
          <td class="datoscabecerafua">MES</td>
          <td colspan="2" class="datoscabecerafua">AÑO</td>
        </tr>
        <tr>
          <td class="datoscabecerafua">DIA</td>
          <td class="datoscabecerafua">MES</td>
          <td colspan="2" class="datoscabecerafua">AÑO</td>
          <td rowspan="2" class="datosfua">${v(g('A_Hora'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('FuaUPS'))}</td>
          <td colspan="3" class="datosfua">${v(g('FuaCodigoPrestacion'))}</td>
          <td colspan="3" rowspan="2" class="datosfua"></td>
          <td colspan="2" class="datoscabecerafua">DE INGRESO</td>
          <td class="datosfua">${v(g('H_FI_Dia'))}</td>
          <td class="datosfua">${v(g('H_FI_Mes'))}</td>
          <td colspan="2" class="datosfua">${v(g('H_FI_Anio'))}</td>
        </tr>
        <tr>
          <td class="datosfua">${v(g('A_Dia'))}</td>
          <td class="datosfua">${v(g('A_Mes'))}</td>
          <td colspan="2" class="datosfua">${v(g('asA_Year'))}</td>
          <td colspan="3" class="datosfua">${esConsultaExterna ? 'CONSULTA EXTERNA' : ''}</td>
          <td colspan="2" class="datoscabecerafua">DE ALTA</td>
          <td style="text-align:center;font-size:6.5px">${v(g('H_FE_Dia'))}</td>
          <td class="datosfua">${v(g('H_FE_Mes'))}</td>
          <td colspan="2" class="datosfua">${v(g('H_FE_Anio'))}</td>
        </tr>
        <tr>
          <td colspan="3" rowspan="2" class="datoscabecerafua">REPORTE VINCULADO</td>
          <td colspan="5" class="datoscabecerafua">COD. AUTORIZACIÓN</td>
          <td colspan="5" class="datoscabecerafua">N° FUA A VINCULAR</td>
          <td colspan="2" rowspan="2" class="datoscabecerafua">DE CORTE ADMINISTRATIVO</td>
          <td rowspan="2" class="datosfua">${v(g('H_FEA_Dia'))}</td>
          <td rowspan="2" class="datosfua">${v(g('H_FEA_Mes'))}</td>
          <td colspan="2" rowspan="2" class="datosfua">${v(g('H_FEA_Anio'))}</td>
        </tr>
        <tr>
          <td colspan="5" class="datosfua"></td>
          <td colspan="5" class="datosfua"></td>
        </tr>
        <tr><td colspan="20" style="text-align:center;font-size:8px;background-color:#b3b3b3">CONCEPTO PRESTACIONAL</td></tr>
        <tr>
          <td colspan="2" rowspan="3" class="datoscabecerafua">ATENCION DIRECTA</td>
          <td rowspan="3" class="datosfua">X</td>
          <td colspan="3" class="datoscabecerafua">COB EXTRAORDINARIA</td>
          <td colspan="3" class="datoscabecerafua">CARTA DE GARANTÍA</td>
          <td colspan="2" rowspan="3" class="datoscabecerafua">TRASLADO</td>
          <td colspan="2" rowspan="3" class="datosfua">X</td>
          <td colspan="7" class="datoscabecerafua">SEPELIO</td>
        </tr>
        <tr>
          <td colspan="2" class="datoscabecerafua">N° AUTORIZACUIB</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="2" class="datoscabecerafua">N° AUTORIZACUIB</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="2" rowspan="2" class="datoscabecerafua">NATOMUERTO</td>
          <td rowspan="2" class="datosfua"></td>
          <td rowspan="2" class="datoscabecerafua">OBITO</td>
          <td rowspan="2" class="datosfua"></td>
          <td rowspan="2" class="datoscabecerafua">OTRO</td>
          <td rowspan="2" class="datosfua"></td>
        </tr>
        <tr>
          <td colspan="2" style="text-align:center;font-size:6.5px;background-color:#b3b3b3">MONTO S/.</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="2" style="text-align:center;font-size:6.5px;background-color:#b3b3b3">MONTO S/.</td>
          <td class="datosfua">&nbsp;</td>
        </tr>
      </table>`;

    const destinoTabla = `
      <table style="width:100%;text-align:center;padding-top:1.5px" border="1" cellpadding="0" cellspacing="0">
        <colgroup>${Array.from({ length: 20 })
          .map(() => '<col style="width:5%">')
          .join('')}</colgroup>
        <tr><td colspan="20" style="text-align:center;font-size:8px;background-color:#b3b3b3">DEL DESTINO DEL ASEGURADO/USUARIO</td></tr>
        <tr>
          <td rowspan="2" class="datoscabecerafua">ALTA</td>
          <td rowspan="2" class="datosfua">${marcaSi(g('Dest_At'), 'X')}</td>
          <td rowspan="2" class="datoscabecerafua">CITA</td>
          <td rowspan="2" class="datosfua">${marcaSi(g('Dest_C'), 'X')}</td>
          <td colspan="2" rowspan="2" class="datoscabecerafua">HOSPITALIZACION</td>
          <td rowspan="2" class="datosfua">${marcaSi(g('Dest_H'), 'X')}</td>
          <td colspan="6" class="datoscabecerafua">REFERIDO</td>
          <td colspan="2" rowspan="2" class="datoscabecerafua">CONTRAREFERIDO</td>
          <td rowspan="2" class="datosfua">${marcaSi(g('Dest_COT_REDF'), 'X')}</td>
          <td rowspan="2" class="datoscabecerafua">FALLECIDO</td>
          <td rowspan="2" class="datosfua">${marcaSi(g('Dest_FALL'), 'X')}</td>
          <td rowspan="2" class="datoscabecerafua">CORTE ADMINIS</td>
          <td rowspan="2" class="datosfua">${marcaSi(g('D_CAD'), 'X')}</td>
        </tr>
        <tr>
          <td class="datoscabecerafua">EMERGENCIA</td>
          <td class="datosfua">${marcaSi(g('Dest_E'), 'X')}</td>
          <td class="datoscabecerafua">CONSULTA EXTERNA</td>
          <td class="datosfua">${marcaSi(g('Dest_CE'), 'X')}</td>
          <td class="datoscabecerafua">APOYO AL DIAGNOSTICO</td>
          <td class="datosfua">${marcaSi(g('Dest_AP'), 'X')}</td>
        </tr>
        <tr><td colspan="20" style="text-align:center;font-size:8px;background-color:#b3b3b3">SE REFIERE / CONTRAREFIERE A:</td></tr>
        <tr>
          <td colspan="4" class="datoscabecerafua">CÓDIGO RENAES DE LA IPRESS</td>
          <td colspan="10" style="text-align:center;font-size:6.5px;background-color:#b3b3b3">NOMBRE DE LA IPRESS A LA QUE SE REFIERE / CONTRAREFIERE</td>
          <td colspan="6" class="datoscabecerafua">N° HOJA DE REFER / CONTRARR</td>
        </tr>
        <tr>
          <td colspan="4" class="datosfua">${v(g('RF_Codigo'))}</td>
          <td colspan="10" class="datosfua">${v(g('RF_Nombre'))}</td>
          <td colspan="6" class="datosfua">${v(g('RF_Numero'))}</td>
        </tr>
      </table>`;

    const actividadesTabla = `
      <table style="width:100%;text-align:center;padding-top:1.5px" border="1" cellpadding="0" cellspacing="0">
        <colgroup><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:11%"><col style="width:3%"><col style="width:7%"><col style="width:3%"><col style="width:5%"><col style="width:3%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:7%"></colgroup>
        <tr>
          <td colspan="13" style="text-align:center;font-size:8px;background-color:#b3b3b3">ACTIVIDADES PREVENTIVAS Y OTROS</td>
          <td colspan="7" style="text-align:center;font-size:8px;background-color:#b3b3b3">VACUNAS N° DE DOSIS</td>
        </tr>
        <tr>
          <td colspan="3" class="datoscabecerafua">PESO(Kg)</td>
          <td class="datosfua">${v(g('TR_Peso'))}</td>
          <td colspan="3" class="datoscabecerafua">TALLA(cm)</td>
          <td class="datosfua">${v(g('TR_Talla'))}</td>
          <td colspan="3" class="datoscabecerafua">P.A.(mmHg)</td>
          <td colspan="2" class="datosfua">${v(g('TR_PA'))}</td>
          <td colspan="2" class="datoscabecerafua">BCG</td>
          <td class="datosfua">&nbsp;</td>
          <td style="text-align:center;font-size:6.5px;background-color:#b3b3b3">INFLUENZA</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">ANTIAMARILICA</td>
          <td class="datosfua"></td>
        </tr>
        <tr>
          <td colspan="2" class="datoscabecerafua">DE LA GESTANTE</td>
          <td colspan="5" style="text-align:center;font-size:6.5px;background-color:#b3b3b3">DEL RECIEN NACIDO</td>
          <td colspan="4" class="datoscabecerafua">GESTANTE / RN / NIÑO / ADOLESCENTE / JOVEN Y ADULTO / ADULTO MAYOR</td>
          <td colspan="2" class="datoscabecerafua">JOVEN Y ADULTO</td>
          <td colspan="2" class="datoscabecerafua">DPT</td>
          <td class="datosfua">&nbsp;</td>
          <td style="text-align:center;font-size:6.5px;background-color:#b3b3b3">PAROTID</td>
          <td style="text-align:center;font-size:6.5px">&nbsp;</td>
          <td class="datoscabecerafua">ANTINEUMOC</td>
          <td class="datosfua"></td>
        </tr>
        <tr>
          <td class="datoscabecerafua">CPN(N°)</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="4" class="datoscabecerafua">EDAD GEST RN (SEM)</td>
          <td class="datosfua"></td>
          <td class="datoscabecerafua">CRED</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">PAB</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">EVALUACION INTEGRAL</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="2" class="datoscabecerafua">APO</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">RUBEOLA</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">ANTITETANICA</td>
          <td class="datosfua"></td>
        </tr>
        <tr>
          <td class="datoscabecerafua">EDAD GEST</td>
          <td class="datosfua">&nbsp;</td>
          <td rowspan="2" class="datosfua"> - </td>
          <td rowspan="2" class="datoscabecerafua">1°</td>
          <td rowspan="2" class="datosfua">&nbsp;</td>
          <td rowspan="2" class="datoscabecerafua">5°</td>
          <td rowspan="2" class="datosfua"></td>
          <td class="datoscabecerafua">R.N. PREMATURO</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">TAP / EEDP O TEPSI</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="2" class="datoscabecerafua">ADULTO MAYOR</td>
          <td colspan="2" class="datoscabecerafua">ASA</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">ROTAVIRUS</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">COMPLETAS PARA LA EDAD</td>
          <td class="datosfua"></td>
        </tr>
        <tr>
          <td class="datoscabecerafua">ALTURA UTERINA</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">BAJO PESO AL NACER</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">CONSEJERIA NUTRICIONAL</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">VACAM</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="2" class="datoscabecerafua">SPR</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">DT ADULTO (N° DOSIS)</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">VPH</td>
          <td class="datosfua"></td>
        </tr>
        <tr>
          <td rowspan="2" class="datoscabecerafua">PARTO VERTICAL</td>
          <td rowspan="2" class="datosfua">&nbsp;</td>
          <td colspan="4" rowspan="2" class="datosfua">--</td>
          <td rowspan="2" class="datosfua"></td>
          <td rowspan="2" class="datoscabecerafua">ENFER. CONGENITA / SECULA AL NACER</td>
          <td rowspan="2" class="datosfua">&nbsp;</td>
          <td rowspan="2" class="datoscabecerafua">CONSEJERIA INTEGRAL</td>
          <td rowspan="2" class="datosfua">&nbsp;</td>
          <td rowspan="2" class="datoscabecerafua">TAMIZAJE DE SALUD MENTAL</td>
          <td rowspan="2" class="datosfua">&nbsp;</td>
          <td colspan="2" class="datoscabecerafua">SR</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">IPV</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">OTRA VACUNA</td>
          <td class="datosfua"></td>
        </tr>
        <tr>
          <td colspan="2" class="datoscabecerafua">HVB</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">PENTAVAL</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">&nbsp;</td>
          <td class="datosfua"></td>
        </tr>
        <tr>
          <td class="datoscabecerafua">CONTROL PUERP (N°)</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="5" class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">N° FAMILIARES DE GEST / PUERP. CASA MAT.</td>
          <td class="datosfua">&nbsp;</td>
          <td class="datoscabecerafua">IMC(Kg/m2)</td>
          <td class="datosfua">${v(g('IMC'))}</td>
          <td colspan="2" class="datosfua">PAT. O NOR</td>
          <td colspan="2" class="datoscabecerafua">GRUPO DE RIESGO HVB</td>
          <td class="datosfua">&nbsp;</td>
          <td colspan="4" style="text-align:center;font-size:4px;line-height:4px">GRUPO DE RIESGO HVB 1. TRABAJADOR DE SAÑUD 2. TRABAJAD. SEXUAL 3. HSH 4. PRIVADO LIBERTAD 5. FF.AA. 6. POLICIA NACIONAL 7. ESTUDIANTES DE SALUD 8. POLITRANSFUNDIDOS 9. DROGODEPENDIENTES</td>
        </tr>
      </table>`;

    const filasDiag = diagnosticos
      .slice(0, 15)
      .map((dx, i) => {
        const desc = val(dx, 'Descripcion');
        const texto = desc.length > 78 ? `${desc.slice(0, 78)}...` : desc;
        const tipo = val(dx, 'TipoDx');
        return `<tr>
        <td class="datoscabecerafua">${i + 1}</td>
        <td colspan="12" class="datosfuadiag" style="text-align:left;font-size:8px">${texto}</td>
        <td class="datosfuadiag">${marcaSi(tipo, 'Presuntivo')}</td>
        <td class="datosfuadiag">${marcaSi(tipo, 'Definitivo')}</td>
        <td class="datosfuadiag">${marcaSi(tipo, 'Repetido')}</td>
        <td class="datosfuadiag">${v(val(dx, 'CodigoCIE10'))}</td>
        <td class="datosfuadiag">&nbsp;</td>
        <td class="datosfuadiag">&nbsp;</td>
        <td class="datosfuadiag">&nbsp;</td>
      </tr>`;
      })
      .join('');

    const filasDiagVacias = [1, 2, 3, 4]
      .map(
        (n) => `<tr>
      <td class="datoscabecerafua">${n}</td>
      <td colspan="12" class="datosfuadiag" style="text-align:left;font-size:8px">&nbsp;</td>
      <td class="datosfuadiag">&nbsp;</td>
      <td class="datosfuadiag">&nbsp;</td>
      <td class="datosfuadiag">&nbsp;</td>
      <td class="datosfuadiag">&nbsp;</td>
      <td class="datosfuadiag">&nbsp;</td>
      <td class="datosfuadiag">&nbsp;</td>
      <td class="datosfuadiag">&nbsp;</td>
    </tr>`,
      )
      .join('');

    const diagnosticosTabla = `
      <table style="width:100%;text-align:center;padding-top:1.5px" border="1" cellpadding="0" cellspacing="0">
        <colgroup>${Array.from({ length: 20 })
          .map(() => '<col style="width:5%">')
          .join('')}</colgroup>
        <tr><td colspan="20" style="text-align:center;font-size:8px;background-color:#b3b3b3">DIAGNOSTICOS</td></tr>
        <tr>
          <td rowspan="2" class="datoscabecerafua">N°</td>
          <td colspan="12" rowspan="2" class="datoscabecerafua">DESCRIPCION</td>
          <td colspan="4" class="datoscabecerafua">INGRESO</td>
          <td colspan="3" class="datoscabecerafua">EGRESO</td>
        </tr>
        <tr>
          <td class="datoscabecerafua">P</td>
          <td class="datoscabecerafua">D</td>
          <td class="datoscabecerafua">R</td>
          <td class="datoscabecerafua">CIE - 10</td>
          <td class="datoscabecerafua">D</td>
          <td class="datoscabecerafua">R</td>
          <td class="datoscabecerafua">CIE - 10</td>
        </tr>
        ${filasDiag || filasDiagVacias}
        <tr>
          <td colspan="3" class="datoscabecerafua">N° DE DNI</td>
          <td colspan="14" class="datoscabecerafua"> NOMBRE DEL RESPONSABLE DE LA ATENCIÓN</td>
          <td colspan="3" class="datoscabecerafua">N° DE COLEGIATURA</td>
        </tr>
        <tr>
          <td colspan="3" class="datosfua">${v(g('M_NumDocumento2'))}</td>
          <td colspan="14" class="datosfua">${v(g('M_Nombres2'))}</td>
          <td colspan="3" class="datosfua">${v(g('M_Colegiatura2'))}</td>
        </tr>        
        <tr>
          <td colspan="3" class="datoscabecerafua">RESPONSABLE DE LA ATENCIÓN</td>
          <td class="datosfua">${v(g('Respo_Atencion2'))}</td>
          <td colspan="2" class="datoscabecerafua">ESPECIALIDAD</td>
          <td colspan="7" class="datosfua">&nbsp;</td>
          <td colspan="2" class="datoscabecerafua">N° RNE</td>
          <td colspan="2" class="datosfua">&nbsp;</td>
          <td colspan="2" class="datoscabecerafua">EGRESADO</td>
          <td class="datosfua">&nbsp;</td>
        </tr>
      </table>
      <div style="text-align:left;font-size:6.1px;margin-top:1px">
        1. MÉDICO 2. FARMACEUTICO 3. CIRUJANO DENTISTA 4. BIÓLOGO 5. OBSTETRIZ 6. ENFERMERA 7. TRABAJADORA SOCIAL 8. PSCOLOGA 9. TECNOLOGO MEDICO 10. NUTRICIÓN 11. TECNICO ENFERMERIA 12. AUXILIAR DE ENFERMERIA 13. OTRO
      </div>`;

    const firmaTabla = `
      <table style="width:100%;text-align:center;padding-top:8px">
        <tr>
          <td colspan="8" rowspan="4" style="vertical-align:bottom"></td>
          <td colspan="2" style="text-align:left;font-size:6.5px">FIRMA</td>
          <td colspan="7" rowspan="2" style="vertical-align:bottom"></td>
          <td colspan="3" rowspan="5" style="text-align:center;font-size:6.5px;border:1px solid #4c4c4c"></td>
        </tr>
        <tr>
          <td style="text-align:left;font-size:6.5px">ASEGURADO</td>
          <td style="text-align:left;font-size:6.5px;border:1px solid #4c4c4c;width:4%;height:19px">&nbsp;</td>
        </tr>
        <tr>
          <td style="text-align:left;font-size:6.5px">APODERADO</td>
          <td style="text-align:left;font-size:6.5px;border:1px solid #4c4c4c;width:4%;height:25px">&nbsp;</td>
          <td colspan="7" style="text-align:center;font-size:6.5px">____________________________________________________________</td>
        </tr>
        <tr>
          <td colspan="2" style="text-align:left;font-size:6.5px">APODERADO:</td>
          <td colspan="7" class="datosfua">&nbsp;</td>
        </tr>
        <tr>
          <td colspan="8" style="text-align:center;font-size:6.5px">____________________________________________________________</td>
          <td colspan="2" style="text-align:left;font-size:6.5px">NOMBRES Y APELLIDOS</td>
          <td colspan="7" style="text-align:center;font-size:6.5px">____________________________________________________________</td>
        </tr>
        <tr>
          <td colspan="8" valign="top" style="text-align:center;font-size:6.5px">
            FIRMA Y SELLO DEL RESPONSABLE DE LA ATENCIÓN<br>
            <b>${v(g('M_Nombres'))}</b><br>
            <b>DNI:</b> ${v(g('M_NumDocumento'))} - <b>COLEGIATURA:</b> ${v(g('M_Colegiatura'))}
          </td>
          <td colspan="2" style="text-align:left;font-size:6.5px">DNI O CE DEL APODERADO</td>
          <td colspan="7" style="text-align:center;font-size:6.5px">____________________________________________________________</td>
          <td colspan="3" style="text-align:center;font-size:6.5px">HUELLA DIGITAL DEL ASEGURADO O DEL APODERADO</td>
        </tr>
      </table>`;

    const numeroFormato = `
      <table style="width:100%;text-align:center;padding-top:1.5px" border="1" cellpadding="0" cellspacing="0">
        <tr>
          <td colspan="12" rowspan="2" class="datoscabecerafua">TERAPEUTICA, INSUMOS, PROCEDIMIENTOS Y APOYO AL DIAGNOSTICO</td>
          <td colspan="8" class="datoscabecerafua">FORMATO DE ATENCIÓN N°</td>
        </tr>
        <tr>
          <td colspan="2" class="datosfua">${v(g('FuaDisa'))}</td>
          <td colspan="2" class="datosfua">${v(g('FuaLote'))}</td>
          <td colspan="4" class="datosfua">${v(g('FuaNumero'))}</td>
        </tr>
      </table>`;

    const filaMedicamento = (m: Row) => `
        <td class="datosfua">${v(val(m, 'Codigo'))}</td>
        <td colspan="6" class="datosfua" style="text-align:left;font-size:8px">${v(val(m, 'Nombre'))}</td>
        <td class="datosfua">${v(val(m, 'CantidadPedida'))}</td>
        <td class="datosfua">${v(val(m, 'CantidadDespachada'))}</td>
        <td class="datosfua">${v(val(m, 'CodigoCIE10'))}</td>`;
    let filasMed = '';
    for (let i = 0; i < medicamentos.length; i += 2) {
      filasMed += `<tr>${filaMedicamento(medicamentos[i])}${medicamentos[i + 1] ? filaMedicamento(medicamentos[i + 1]) : '<td></td><td colspan="6"></td><td></td><td></td><td></td>'}</tr>`;
    }
    const filasMedVacias = [1, 2, 3, 4]
      .map(
        () => `<tr>
      <td class="datosfua">&nbsp;</td><td colspan="6" class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td>
      <td class="datosfua">&nbsp;</td><td colspan="6" class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td>
    </tr>`,
      )
      .join('');

    const filaProcedimiento = (p: Row) => `
        <td class="datosfua">${v(val(p, 'codigo', 'Codigo'))}</td>
        <td colspan="5" class="datosfua" style="text-align:left;font-size:8px">${v(val(p, 'Nombre'))}</td>
        <td class="datosfua">${v(val(p, 'CantidadPedida'))}</td>
        <td class="datosfua"></td>
        <td class="datosfua">${v(val(p, 'CodigoCIE10'))}</td>
        <td class="datosfua"></td>`;
    let filasProc = '';
    for (let i = 0; i < procedimientos.length; i += 2) {
      filasProc += `<tr>${filaProcedimiento(procedimientos[i])}${procedimientos[i + 1] ? filaProcedimiento(procedimientos[i + 1]) : '<td></td><td colspan="5"></td><td></td><td></td><td></td><td></td>'}</tr>`;
    }
    const filasProcVacias = [1, 2, 3, 4]
      .map(
        () => `<tr>
      <td class="datosfua">&nbsp;</td><td colspan="5" class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td>
      <td class="datosfua">&nbsp;</td><td colspan="5" class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td><td class="datosfua">&nbsp;</td>
    </tr>`,
      )
      .join('');

    const filasConsumo = consumo
      .map(
        (c) => `<tr>
      <td class="datosfua" style="font-size:8px">${v(val(c, 'Codigo'))}</td>
      <td colspan="5" class="datosfua" style="text-align:left;font-size:8px">${v(val(c, 'Nombre'))}</td>
      <td colspan="2" class="datosfua" style="font-size:8px"></td>
      <td colspan="2" class="datosfua" style="font-size:8px"></td>
      <td colspan="2" class="datosfua" style="font-size:8px">${v(val(c, 'Cantidad'))}</td>
      <td colspan="2" class="datosfua" style="font-size:8px">${v(val(c, 'CodigoCIE10'))}</td>
      <td colspan="2" class="datosfua" style="font-size:8px"></td>
      <td colspan="2" class="datosfua" style="font-size:8px">${v(val(c, 'IdOrden'))}</td>
      <td colspan="2" class="datosfua" style="font-size:8px"></td>
    </tr>`,
      )
      .join('');

    const filasDispositivosVacias = [1, 2, 3, 4, 5]
      .map(
        () => `<tr>
      <td class="datosfua">&nbsp;</td><td colspan="6" class="datosfua"></td><td class="datosfua"></td><td class="datosfua"></td><td class="datosfua"></td>
      <td class="datosfua">&nbsp;</td><td colspan="6" class="datosfua"></td><td class="datosfua"></td><td class="datosfua"></td><td class="datosfua"></td>
    </tr>`,
      )
      .join('');

    const medicamentosTabla = `
      <table style="width:100%;text-align:center;padding-top:1.5px" border="1" cellpadding="0" cellspacing="0">
        <colgroup>${Array.from({ length: 20 })
          .map(() => '<col style="width:5%">')
          .join('')}</colgroup>
        <tr><td colspan="20" class="datoscabecerafua">PRODUCTOS FARMACEUTICOS / MEDICAMENTOS</td></tr>
        <tr>
          <td class="datoscabecerafua">CODIGO SISMED</td>
          <td colspan="6" class="datoscabecerafua">NOMBRE<br><span style="font-size:4.5px">DENOMINACIÓN, CONCENTRACIÓN, PRESENTACIÓN, FORMAFARMACEUTICA</span></td>
          <td class="datoscabecerafua">PRES</td>
          <td class="datoscabecerafua">ENTR</td>
          <td class="datoscabecerafua">DX</td>
          <td class="datoscabecerafua">CÓDIGO SISMED</td>
          <td colspan="6" class="datoscabecerafua">NOMBRE<br><span style="font-size:4.5px">DENOMINACIÓN, CONCENTRACIÓN, PRESENTACIÓN, FORMAFARMACEUTICA</span></td>
          <td class="datoscabecerafua">PRES</td>
          <td class="datoscabecerafua">ENTR</td>
          <td class="datoscabecerafua">DX</td>
        </tr>
        ${filasMed || filasMedVacias}

        <tr><td colspan="20" class="datoscabecerafua">DISPOSOTIVOS MÉDICOS / PRODUCTOS SANITARIOS</td></tr>
        <tr>
          <td class="datoscabecerafua">CODIGO</td>
          <td colspan="6" class="datoscabecerafua">NOMBRE<br><span style="font-size:4.5px">DENOMINACIÓN, CONCENTRACIÓN, PRESENTACION, Caracteristicas</span></td>
          <td class="datoscabecerafua">PRES</td>
          <td class="datoscabecerafua">ENTR</td>
          <td style="text-align:center;font-size:6.5px;background-color:#b3b3b3">DX</td>
          <td class="datoscabecerafua">CÓDIGO</td>
          <td colspan="6" class="datoscabecerafua">NOMBRE<br><span style="font-size:4.5px">DENOMINACIÓN, CONCENTRACIÓN, PRESENTACION, Caracteristicas</span></td>
          <td class="datoscabecerafua">PRES</td>
          <td class="datoscabecerafua">ENTR</td>
          <td class="datoscabecerafua">DX</td>
        </tr>
        ${filasDispositivosVacias}

        <tr><td colspan="20" class="datoscabecerafua">PROCEDIMIENTOS / DIAGNOSTICO POR IMAGENES / LABORATORIO</td></tr>
        <tr>
          <td class="datoscabecerafua">CODIGO</td>
          <td colspan="5" class="datoscabecerafua">NOMBRE</td>
          <td class="datoscabecerafua">IND</td>
          <td class="datoscabecerafua">EJE</td>
          <td class="datoscabecerafua">DX</td>
          <td class="datoscabecerafua">RES</td>
          <td class="datoscabecerafua">CÓDIGO</td>
          <td colspan="5" class="datoscabecerafua">NOMBRE</td>
          <td class="datoscabecerafua">IND</td>
          <td class="datoscabecerafua">EJE</td>
          <td class="datoscabecerafua">DX</td>
          <td class="datoscabecerafua">RES</td>
        </tr>
        ${filasProc || filasProcVacias}

        <tr><td colspan="20" class="datoscabecerafua">SUB COMPONENTE PRESTACIONAL (PROCEDIMIENTOS)</td></tr>
        <tr>
          <td class="datoscabecerafua">CODIGO</td>
          <td colspan="5" class="datoscabecerafua">NOMBRE</td>
          <td colspan="2" class="datoscabecerafua">CARACT</td>
          <td colspan="2" class="datoscabecerafua">IND/ PRES</td>
          <td colspan="2" class="datoscabecerafua">EJE/ENTR</td>
          <td colspan="2" class="datoscabecerafua">DX</td>
          <td colspan="2" class="datoscabecerafua">RES</td>
          <td colspan="2" class="datoscabecerafua">N° TICKET</td>
          <td colspan="2" class="datoscabecerafua">PO</td>
        </tr>
        ${filasConsumo || '<tr><td colspan="20" style="padding:6px;font-size:8px">Sin registros.</td></tr>'}

        <tr><td colspan="20" class="datoscabecerafua">OBSERVACIONES</td></tr>
        <tr><td colspan="20" class="datosfua">${v(g('FuaObservaciones'))}</td></tr>
      </table>`;

    const firmaTabla2 = `
      <table style="width:100%;text-align:center;padding-top:15px">
        <tr>
          <td colspan="8" rowspan="4" style="vertical-align:bottom"></td>
          <td colspan="2" style="text-align:left;font-size:6.5px">FIRMA</td>
          <td colspan="7" rowspan="2" style="vertical-align:bottom"></td>
          <td colspan="3" rowspan="5" style="text-align:center;font-size:6.5px;border:1px solid #4c4c4c"></td>
        </tr>
        <tr>
          <td style="text-align:left;font-size:6.5px">ASEGURADO</td>
          <td style="text-align:left;font-size:6.5px;border:1px solid #4c4c4c;width:4%;height:19px">&nbsp;</td>
        </tr>
        <tr>
          <td style="text-align:left;font-size:6.5px">APODERADO</td>
          <td style="text-align:left;font-size:6.5px;border:1px solid #4c4c4c;width:4%;height:25px">&nbsp;</td>
          <td colspan="7" style="text-align:center;font-size:6.5px">____________________________________________________________</td>
        </tr>
        <tr>
          <td colspan="2" style="text-align:left;font-size:6.5px">APODERADO:</td>
          <td colspan="7" class="datosfua">&nbsp;</td>
        </tr>
        <tr>
          <td colspan="8" style="text-align:center;font-size:6.5px">____________________________________________________________</td>
          <td colspan="2" style="text-align:left;font-size:6.5px">NOMBRES Y APELLIDOS</td>
          <td colspan="7" style="text-align:center;font-size:6.5px">____________________________________________________________</td>
        </tr>
        <tr>
          <td colspan="8" valign="top" style="text-align:center;font-size:6.5px">
            FIRMA Y SELLO DEL RESPONSABLE DE LA ATENCIÓN<br>
            <b>${v(g('M_Nombres'))}</b><br>
            <b>DNI:</b> ${v(g('M_NumDocumento'))} - <b>COLEGIATURA:</b> ${v(g('M_Colegiatura'))}
          </td>
          <td colspan="2" style="text-align:left;font-size:6.5px">DNI O CE DEL APODERADO</td>
          <td colspan="7" style="text-align:center;font-size:6.5px">____________________________________________________________</td>
          <td colspan="3" style="text-align:center;font-size:6.5px">HUELLA DIGITAL DEL ASEGURADO O DEL APODERADO</td>
        </tr>
      </table>`;

    return `<!doctype html><html><head><meta charset="utf-8"><title> </title>
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 0cm 0cm; font-family: Arial; }
        body { font-family: Arial, sans-serif; font-weight: initial; font-size: 0.9rem; margin: 0.3cm 0.7cm; text-transform: uppercase; }
        td { line-height: 10px; }
        table { border-collapse: collapse; }
        .datosfua { font-size: 9px; font-weight: bold; }
        .datosfuadiag { font-size: 8.6px; font-weight: bold; }
        .datoscabecerafua { text-align: center; font-size: 6.5px; background-color: #b3b3b3; }
      </style></head><body>
      ${cabeceraSuperior}
      ${tituloYNumero}
      ${institucionTabla}
      ${aseguradoIdentTabla}
      ${servicioTabla}
      ${destinoTabla}
      ${actividadesTabla}
      ${diagnosticosTabla}
      ${firmaTabla}

      <div style="page-break-before: always"><br><br></div>
      ${numeroFormato}
      ${medicamentosTabla}
      ${firmaTabla2}
      </body></html>`;
  }
}
