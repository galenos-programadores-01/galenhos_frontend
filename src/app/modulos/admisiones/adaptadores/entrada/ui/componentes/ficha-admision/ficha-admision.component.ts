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

interface FichaData {
  IdCuentaAtencion?: number;
  NroHistoriaClinica?: number | string;
  IAFA?: string | null;
  IdTipoGravedad?: number;
  PACIENTE?: string | null;
  Pac?: string | null;
  NroDocumento?: string | null;
  TipoDocumento?: string | null;
  FechaNacimiento?: string | null;
  Sexo?: string | null;
  DireccionDomicilio?: string | null;
  DepartamentoDomicilio?: string | null;
  ProvinciaDomicilio?: string | null;
  DistritoDomicilio?: string | null;
  LugarProcedencia?: string | null;
  Edad?: number;
  Ocupacion?: string | null;
  GradoInstruccion?: string | null;
  EstadoCivil?: string | null;
  Telefono?: string | null;
  NombreAcompaniante?: string | null;
  Servicio?: string | null;
  Consultorio?: string | null;
  EspecialidadMedico?: string | null;
  TipoPrioridad?: string | null;
  TipoEdad?: string | null;
  Telefono_Acompaniante?: string | null;
  NombresMedico?: string | null;
  Medico?: string | null;
  FechaIngreso?: string | null;
  HoraIngreso?: string | null;
  FechaHoraAtencion?: string | null;
  temperatura?: string | null;
  presion_arterial?: string | null;
  frecuencia_respiratoria?: number | null;
  frecuencia_cardiaca?: number | null;
  frecuencia_pulso?: number | null;
  peso?: string | null;
  talla?: number | null;
  saturacion_oxigeno?: string | null;
  escala_glasgow?: number | null;
  otrosVital?: string | null;
}

interface DatosInstitucion {
  rucEess?: string | null;
  nombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  logoMinsa?: string | null;
}

function decodificarBase64(valor: string | null | undefined): string {
  if (!valor) return '';
  try {
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(valor)) return atob(valor);
  } catch {}
  return valor;
}

@Component({
  selector: 'app-ficha-admision',
  standalone: true,
  imports: [VentanaModal],
  styles: [`@keyframes spin { to { transform: rotate(360deg); } }`],
  templateUrl: './ficha-admision.component.html',
})
export class FichaAdmisionComponent implements OnInit {
  @Input() idCuentaAtencion!: number;
  @Output() alCerrar = new EventEmitter<void>();
  @ViewChild('fichaFrame') fichaFrame!: ElementRef<HTMLIFrameElement>;

  private readonly triajeApi = inject(TriajeApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  cargando = true;
  error = '';
  ficha: FichaData | null = null;
  institucion: DatosInstitucion | null = null;
  htmlFicha = '';

  private static institucionCache: DatosInstitucion | null = null;

  async ngOnInit(): Promise<void> {
    if (!this.idCuentaAtencion) {
      this.cargando = false;
      return;
    }
    try {
      const instPromise = FichaAdmisionComponent.institucionCache
        ? Promise.resolve(FichaAdmisionComponent.institucionCache)
        : this.triajeApi.obtenerDatosInstitucion().then((r) => {
            FichaAdmisionComponent.institucionCache =
              r as unknown as DatosInstitucion;
            return FichaAdmisionComponent.institucionCache;
          });
      const [fichaRaw, instRaw] = await Promise.all([
        this.triajeApi.obtenerFichaAdmision(this.idCuentaAtencion),
        instPromise,
      ]);
      this.ficha = fichaRaw as unknown as FichaData;
      this.institucion = instRaw || null;
      this.htmlFicha = this.generarHtmlFicha();
      this.cargando = false;
      this.cdr.detectChanges();
      setTimeout(() => this.escribirIframe(), 0);
    } catch {
      this.error = 'No se pudo cargar la ficha de admisión.';
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  private escribirIframe(): void {
    const el = this.fichaFrame?.nativeElement;
    if (!el || !this.htmlFicha) return;
    const doc = el.contentDocument || el.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(this.htmlFicha);
      doc.close();
    }
  }

  imprimir(): void {
    imprimirHtml(this.htmlFicha);
  }

  private generarHtmlFicha(): string {
    if (!this.ficha) return '';
    const ficha = this.ficha;
    const institucion = this.institucion;
    const usuario = 'Usuario';
    const fechaImp = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const v = (x: string | number | null | undefined): string =>
      x === null || x === undefined || x === '' ? '&nbsp;' : String(x);
    const linea = (ancho = 300) =>
      `<span style="display:inline-block;border-bottom:1px solid #000;width:${ancho}px">&nbsp;</span>`;
    const casilla = (marcado = false) =>
      `<span style="display:inline-block;width:9px;height:9px;border:1px solid #000;vertical-align:middle;margin-right:3px;text-align:center;font-size:8px;line-height:9px">${marcado ? '✓' : ''}</span>`;
    const casillaLetra = (letra: string) =>
      `<span style="display:inline-block;width:15px;height:15px;border:1px solid #000;text-align:center;font-size:9px;line-height:15px;margin-right:2px;vertical-align:middle">${letra}</span>`;

    function generarBarras(valor: string, alto = 32): string {
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

    const label = (t: string) =>
      `<span style="font-size:9.5px;color:#000">${t}</span>`;
    const filaCampos = (
      campos: [string, string | number | null | undefined][],
    ) => {
      const celdas = campos
        .map(
          ([et, val]) => `
        <td style="width:18%;padding:1.5px 4px;white-space:nowrap;vertical-align:top">${label(et)}</td>
        <td style="width:32%;padding:1.5px 10px 1.5px 4px;font-size:8.5px;line-height:1.25;text-transform:uppercase;overflow-wrap:break-word">${v(val)}</td>
      `,
        )
        .join('');
      return `<tr>${celdas}</tr>`;
    };

    const filasDiagnostico = (filas: number) => {
      let out = '';
      for (let i = 1; i <= filas; i++) {
        out += `<tr>
          <td style="padding:3px 4px;font-size:10px;white-space:nowrap;vertical-align:bottom">${i}.- ${linea(340)}</td>
          <td style="text-align:center;padding:3px 2px;vertical-align:bottom;white-space:nowrap">${casillaLetra('P')}${casillaLetra('D')}</td>
          <td style="text-align:center;padding:3px 2px;vertical-align:bottom;white-space:nowrap">
            ${[1, 2, 3, 4, 5].map(() => `<span style="display:inline-block;width:15px;height:15px;border:1px solid #000;margin-right:1px"></span>`).join('')}
          </td>
        </tr>`;
      }
      return out;
    };
    const cabeceraDiagnostico = `<tr>
      <td></td>
      <td style="text-align:center;font-size:8.5px;font-weight:bold;padding:2px">Tipo Dx</td>
      <td style="text-align:center;font-size:8.5px;font-weight:bold;padding:2px">Código CIE-10</td>
    </tr>`;
    const colgroupDiagnostico = `<colgroup><col style="width:60%"><col style="width:16%"><col style="width:24%"></colgroup>`;

    const checklist = (items: string[]) =>
      items
        .map(
          (i) =>
            `<span style="display:inline-flex;align-items:center;margin-right:14px;white-space:nowrap;font-size:9.5px">${casilla()}${i}</span>`,
        )
        .join('');
    const filaChecklistAlineada = (items: string[], colWidth = '25%') =>
      `<tr>${items
        .map(
          (i) =>
            `<td style="width:${colWidth};padding:2px 4px 2px 0;white-space:nowrap;font-size:9.5px">${i ? casilla() + i : '&nbsp;'}</td>`,
        )
        .join('')}</tr>`;

    const fechaHoraAtencion =
      ficha?.FechaHoraAtencion ??
      [ficha?.FechaIngreso, ficha?.HoraIngreso].filter(Boolean).join(' ');

    const tmpl = `<!doctype html><html><head><meta charset="utf-8"><title> </title>
      <style>
        @page { size: letter portrait; margin: 0.5cm; }
        body { margin: 0; color: #000; font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        .seccion { border:1px solid #000; padding:3px 6px; margin-top:5px; }
        .titulo-seccion { font-size:11px; font-weight:bold; margin-top:4px; }
      </style></head><body>

      <table>
        <tr>
          <td style="width:34%;vertical-align:top">
            <div style="font-size:7px;color:#333;line-height:1.3">Fecha: ${fechaImp}<br>U. Impresión: ${usuario}</div>
            <table style="margin-top:3px"><tr>
              <td style="width:34px;vertical-align:top">${institucion?.logoMinsa ? `<img src="data:image/png;base64,${institucion.logoMinsa}" style="height:34px">` : ''}</td>
              <td style="font-size:8px;line-height:1.25;vertical-align:top;padding-left:4px">MINISTERIO<br>DE SALUD</td>
              <td style="font-size:8px;line-height:1.25;vertical-align:top;padding-left:10px">${institucion?.nombre ?? '&nbsp;'}<br>${institucion?.direccion ?? '&nbsp;'}</td>
            </tr></table>
          </td>
          <td style="width:32%;text-align:center;vertical-align:middle">
            <b style="font-size:16px;letter-spacing:.03em">REGISTRO DE EMERGENCIA</b>
          </td>
          <td style="width:34%;text-align:right;vertical-align:top">${generarBarras(String(ficha?.IdCuentaAtencion ?? this.idCuentaAtencion))}</td>
        </tr>
      </table>

      <table style="margin-top:4px;table-layout:fixed">
        <colgroup><col style="width:16%"><col style="width:12%"><col style="width:16%"><col style="width:10%"><col style="width:46%"></colgroup>
        <tr>
          <td style="padding:1.5px 4px;white-space:nowrap">${label('N° Historia clínica:')}</td>
          <td style="padding:1.5px 4px;font-size:12px;font-weight:bold">${v(ficha?.NroHistoriaClinica)}</td>
          <td style="padding:1.5px 4px;white-space:nowrap">${label('N° Cuenta:')}</td>
          <td style="padding:1.5px 4px;font-size:12px;font-weight:bold">${v(ficha?.IdCuentaAtencion)}</td>
          <td style="padding:1.5px 4px;white-space:nowrap"><b style="font-size:23px">${v(ficha?.IAFA)}</b></td>
        </tr>
      </table>
      <table style="margin-top:1px;table-layout:fixed">
        <colgroup><col style="width:18%"><col style="width:32%"><col style="width:18%"><col style="width:32%"></colgroup>
        ${filaCampos([
          ['Paciente:', ficha?.PACIENTE ?? ficha?.Pac],
          ['DNI/CE:', ficha?.NroDocumento],
        ])}
        ${filaCampos([
          ['Fecha de nacimiento:', ficha?.FechaNacimiento],
          ['Sexo:', ficha?.Sexo],
        ])}
        ${filaCampos([
          ['Dirección:', ficha?.DireccionDomicilio],
          ['Edad:', ficha?.Edad],
        ])}
        ${filaCampos([
          [
            'Lugar de procedencia:',
            ficha?.LugarProcedencia ?? ficha?.DireccionDomicilio,
          ],
          ['Ocupación:', ficha?.Ocupacion],
        ])}
        ${filaCampos([
          ['Estado civil:', ficha?.EstadoCivil],
          ['Teléfono:', ficha?.Telefono],
        ])}
        ${filaCampos([
          ['Acompañante:', ficha?.NombreAcompaniante],
          ['Telef. acompañante:', ficha?.Telefono_Acompaniante],
        ])}
        ${filaCampos([
          ['Consultorio:', ficha?.Consultorio ?? ficha?.Servicio],
          ['Médico:', ficha?.NombresMedico ?? ficha?.Medico],
        ])}
      </table>
      <div style="font-size:11px;font-weight:bold;margin-top:3px">PRIORIDAD: <span style="text-transform:uppercase">${v(ficha?.TipoPrioridad)}</span></div>

      <div class="titulo-seccion">ANAMNESIS
        <span style="font-weight:normal;margin-left:10px">${casilla()} DIRECTA &nbsp;&nbsp; ${casilla()} INDIRECTA</span>
        <span style="font-weight:normal;margin-left:14px">Fecha y hora de atención: <b>${v(fechaHoraAtencion)}</b></span>
      </div>
      <div style="font-size:10.5px;margin-top:4px">Tiempo enfermedad: ${linea(220)}</div>

      <table style="margin-top:4px">
        <tr>
          <td style="width:66%;vertical-align:top;padding-right:8px">
            <div style="font-size:10.5px">Signos y síntomas:</div>
            <div style="height:26px;border-bottom:1px solid #000;margin-top:12px"></div>
            <div style="font-size:10.5px;margin-top:6px">Relato cronológico:</div>
            <div style="height:15px;border-bottom:1px solid #000;margin-top:12px"></div>
            <div style="height:15px;border-bottom:1px solid #000;margin-top:6px"></div>
            <div style="font-size:10.5px;margin-top:6px">Antecedentes:</div>
            <div style="height:13px;border-bottom:1px solid #000;margin-top:12px"></div>
          </td>
          <td style="width:34%;vertical-align:top;text-align:center">
            <div style="font-size:9px;font-weight:bold;margin-bottom:2px">FUNCIONES VITALES</div>
            <table style="display:inline-table;width:auto;text-align:left">
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">TEMP.: ${v(decodificarBase64(ficha?.temperatura))}</td><td style="padding:2px 0 2px 5px;font-size:8.5px;white-space:nowrap">C°</td></tr>
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">P.A.: ${v(ficha?.presion_arterial)}</td><td style="padding:2px 0 2px 5px;font-size:8.5px;white-space:nowrap">mmHg</td></tr>
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">F.R.: ${v(ficha?.frecuencia_respiratoria)}</td><td style="padding:2px 0 2px 5px;font-size:8.5px;white-space:nowrap">x min.</td></tr>
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">F.C.: ${v(ficha?.frecuencia_cardiaca)}</td><td style="padding:2px 0 2px 5px;font-size:8.5px;white-space:nowrap">x min.</td></tr>
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">F.P.: ${v(ficha?.frecuencia_pulso)}</td><td style="padding:2px 0 2px 5px;font-size:8.5px;white-space:nowrap">x min.</td></tr>
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">PESO: ${v(decodificarBase64(ficha?.peso))}</td><td style="padding:2px 0 2px 5px;font-size:8.5px;white-space:nowrap">Kg.</td></tr>
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">SPO2: ${v(decodificarBase64(ficha?.saturacion_oxigeno))}</td><td style="padding:2px 0 2px 5px;font-size:8.5px;white-space:nowrap">%</td></tr>
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">GLASGOW: ${v(ficha?.escala_glasgow)}</td><td></td></tr>
              <tr><td style="border:1px solid #000;padding:2px 6px;font-size:9.5px;white-space:nowrap">OTROS: ${v(ficha?.otrosVital)}</td><td></td></tr>
            </table>
          </td>
        </tr>
      </table>

      <div class="titulo-seccion">EXÁMEN CLÍNICO</div>
      <table style="margin-top:4px;font-size:10.5px">
        <tr>
          <td style="width:33%">Estado general</td>
          <td style="width:33%">Estado Hidratación</td>
          <td style="width:34%">Nivel de conciencia</td>
        </tr>
      </table>
      <div style="height:12px;border-bottom:1px solid #000;margin-top:10px"></div>
      <div style="font-size:10.5px;margin-top:6px">Piel y anexos</div>
      <div style="height:12px;border-bottom:1px solid #000;margin-top:10px"></div>
      <div style="font-size:10.5px;margin-top:6px">Exámen clínico regional</div>
      <div style="height:12px;border-bottom:1px solid #000;margin-top:10px"></div>
      <div style="height:12px;border-bottom:1px solid #000;margin-top:6px"></div>

      <div class="titulo-seccion">DIAGNÓSTICOS</div>
      <table style="margin-top:4px;table-layout:fixed">${colgroupDiagnostico}${cabeceraDiagnostico}${filasDiagnostico(4)}</table>

      <div class="titulo-seccion">PLAN DE TRABAJO</div>
      <table style="margin-top:4px;table-layout:fixed">
        <colgroup><col style="width:20%"><col style="width:80%"></colgroup>
        <tr>
          <td style="font-size:10.5px;vertical-align:top" rowspan="2">Exámenes auxiliares</td>
          <td style="padding-bottom:4px">${checklist(['Hemograma', 'Glucosa', 'Urea', 'Creatinina', 'Ex. orina'])}</td>
        </tr>
        <tr>
          <td>${checklist(['AGA', 'EKG', 'Rx', 'Otros'])}</td>
        </tr>
      </table>
      <div style="font-size:10.5px;margin-top:6px">Exámenes imágenes:</div>
        <div style="height:12px;border-bottom:1px solid #000;margin-top:10px"></div>
      <div style="font-size:10.5px;margin-top:6px">Interconsultas:</div>
      <div style="height:12px;border-bottom:1px solid #000;margin-top:10px"></div>

      <div style="page-break-before:always"></div>
      <div style="font-size:10.5px;margin-top:8px">Referencia oportuna:</div>
        <div style="height:14px;border-bottom:1px solid #000;margin-top:12px"></div>
      <div style="font-size:10.5px;margin-top:8px">Procedimientos dx y/o terapéuticos:</div>
      <div style="height:14px;border-bottom:1px solid #000;margin-top:12px"></div>

      <div class="titulo-seccion">DIAGNÓSTICOS DE EGRESO</div>
      <table style="margin-top:4px;table-layout:fixed">${colgroupDiagnostico}${cabeceraDiagnostico}${filasDiagnostico(4)}</table>

      <div style="font-size:10.5px;margin-top:8px">
        <b>Condición de egreso:</b>
        <table style="margin-top:4px;table-layout:fixed">
          ${filaChecklistAlineada(['ALTA', 'TRANSFERENCIA', 'FALLECIDO', 'OBSERVACIÓN'])}
          ${filaChecklistAlineada(['REFERENCIA', 'RETIRO VOLUNTARIO', 'SOP', 'FUGA'])}
          ${filaChecklistAlineada(['UCI', 'HOSPITALIZACIÓN', 'OTROS', ''])}
        </table>
      </div>

      <table style="margin-top:10px">
        <tr><td style="font-size:10.5px">Fecha de egreso: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td></tr>
        <tr><td style="font-size:10.5px;padding-top:6px">Hora de egreso: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td></tr>
      </table>
      <table style="margin-top:24px">
        <tr>
          <td style="text-align:right;font-size:10.5px">
            ${linea(220)}<br>
            Firma y sello del médico tratante
          </td>
        </tr>
      </table>

      <div class="titulo-seccion">TRATAMIENTO</div>
      <div style="font-size:10.5px;margin-top:4px">Medicinas generales</div>
      <div style="font-size:9.5px;margin-top:6px">Medicamento (presentación, dosis, frecuencia, vía de administración)</div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:12px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>

      <div style="font-size:10.5px;margin-top:10px">Evolución (incluir terapia de evolución)</div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:12px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>

      <div style="font-size:10.5px;margin-top:10px">Evaluación de enfermería y/o obstetricia</div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:12px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>
      <div style="height:16px;border-bottom:1px solid #000;margin-top:8px"></div>

      </body></html>`;
    return tmpl;
  }
}
