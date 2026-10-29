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
import type { IReporteTicketHospitalizacion } from '../../../compartido/tipos/api-tipos';
import { VentanaModal } from '../../../compartido/ui/ventana-modal/ventana-modal';
import { imprimirHtml } from '../../../compartido/utilidades/print.util';
import { AuthService } from '../../auth/aplicacion/auth.service';
import { HospitalizacionApiService } from './hospitalizacion.api.service';

function esc(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatearFecha(iso: string | null | undefined): string {
  const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return (iso || '').trim();
}

function ahora(): string {
  const d = new Date();
  const fecha = `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}/${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
  return `${fecha} ${hora}`;
}

@Component({
  selector: 'app-ticket-hospitalizacion-report',
  standalone: true,
  imports: [VentanaModal],
  styles: [`@keyframes spin { to { transform: rotate(360deg); } }`],
  templateUrl: './ticket-hospitalizacion-report.component.html',
})
export class TicketHospitalizacionReportComponent implements OnInit {
  @Input() idCuentaAtencion!: number;
  @Input() imprimirAutomatico = false;
  @Output() alCerrar = new EventEmitter<void>();
  @ViewChild('ticketFrame') ticketFrame!: ElementRef<HTMLIFrameElement>;

  private readonly hospitalizacionApi = inject(HospitalizacionApiService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  cargando = true;
  error = '';
  htmlTicket = '';

  async ngOnInit(): Promise<void> {
    if (!this.idCuentaAtencion) {
      this.cargando = false;
      return;
    }
    try {
      const reporte = await this.hospitalizacionApi.getReporteTicket(
        this.idCuentaAtencion,
      );
      this.htmlTicket = this.generarHtmlTicket(reporte);
      this.cargando = false;
      this.cdr.detectChanges();
      setTimeout(() => this.escribirIframe(), 0);
      if (this.imprimirAutomatico) {
        setTimeout(() => {
          if (this.htmlTicket) this.imprimir();
        }, 500);
      }
    } catch {
      this.error = 'No se pudo cargar el ticket de la atención.';
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  private escribirIframe(): void {
    const el = this.ticketFrame?.nativeElement;
    if (!el || !this.htmlTicket) return;
    const doc = el.contentDocument || el.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(this.htmlTicket);
      doc.close();
    }
  }

  imprimir(): void {
    imprimirHtml(this.htmlTicket);
  }

  private generarHtmlTicket(r: IReporteTicketHospitalizacion): string {
    const cuenta = r.idCuentaAtencion || this.idCuentaAtencion;
    const fechaHora = [formatearFecha(r.fecha), r.hora ? `Hr: ${r.hora}` : '']
      .filter(Boolean)
      .join(' ');
    const usuario = (this.authService.username() || '').toUpperCase();
    const terminal = (window.location.hostname || 'LOCAL').toUpperCase();
    const marca = ahora();

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ticket de Atención</title>
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
<style>
  :root { --ink:#000; --paper:#fff; --bg:#fff; }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px 12px; background:var(--bg); font-family: Arial, Helvetica, sans-serif; color:var(--ink); }
  .ticket { width:80mm; max-width:100%; margin:0 auto; background:var(--paper); color:var(--ink); padding:10px 12px 18px; font-size:12px; line-height:1.35; }
  .barcode { text-align:center; font-family:'Libre Barcode 39', monospace; font-size:54px; line-height:1; margin:0; }
  .barcode-num { text-align:center; font-size:16px; margin:0 0 2px; }
  .hospital { text-align:center; font-size:10px; line-height:1.3; margin-bottom:8px; }
  .hospital strong { display:block; font-size:10.5px; margin-bottom:2px; }
  .hospital span { display:block; font-size:8.5px; }
  .titulo { text-align:center; font-weight:bold; font-size:12px; margin:6px 0 8px; }
  .tipo { font-weight:bold;text-align:center; font-size:16px; margin:0; }
  .fecha-cita { font-weight:bold; font-size:16px; margin:0 0 12px; }
  .servicio { font-size:12px; margin:0 0 2px; }
  .medico { font-size:12px; margin:0; padding-bottom:3px; border-bottom:1px solid var(--ink); }
  .dato { font-size:15px; margin:4px 0 0; }
  .dato b { font-weight:bold; }
  .paciente { font-weight:bold; font-size:12px; margin:2px 0 14px; }
  .seguro { font-size:12px; margin:0; }
  .orden { font-size:11px; margin:2px 0 6px; padding-bottom:4px; border-bottom:1px solid var(--ink); }
  .meta { font-size:11px; margin:0; }
  .aviso { text-align:center; font-weight:bold; font-size:11px; margin:6px 0 16px; }
  .impresion { font-size:11px; margin:0; }
  @media print {
    @page { size:80mm auto; margin:0; }
    body { background:#fff; padding:0; }
    .ticket { width:80mm; padding:6px 8px; }
  }
</style>
</head>
<body>
<main class="ticket">
  <div class="hospital">
    <strong>HOSPITAL NACIONAL SERGIO E BERNALES</strong>
    <span>RUC: 20160588234</span>
    <span>AV.TUPAC AMARU 8000 COMAS</span>
    <span>Telef: 5580186</span>
  </div>

  <div class="titulo">TICKET DE ATENCIÓN</div>

  <p class="barcode">*${esc(cuenta)}*</p>


  <p class="tipo">HOSPITALIZACION</p>
  <p class="fecha-cita">${esc(fechaHora)}</p>

  <p class="servicio">Servicio: ${esc(r.servicio)}</p>
  <p class="medico">Médico: ${esc(r.medico)}</p>

  <p class="dato">N°Historia: ${esc(r.nroHistoriaClinica)}</p>
  <p class="dato"><b>N°Cuenta: ${esc(cuenta)}</b></p>
  <p class="paciente">Paciente: ${esc(r.paciente)}</p>

  <p class="seguro">${esc(r.iafa)}</p>
  <p class="orden">Ord. Pago: 0</p>

  <p class="meta">Fecha: ${esc(marca)}&nbsp; Usua: ${esc(usuario)}</p>
  <p class="aviso">Asistir 30 Minutos antes de su cita</p>

  <p class="impresion">Fecha y Hora de Impresión: ${esc(marca)}</p>
</main>
</body>
</html>`;
  }
}
