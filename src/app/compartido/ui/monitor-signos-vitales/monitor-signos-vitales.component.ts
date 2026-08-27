import { CommonModule } from '@angular/common';
import {
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  type ElementRef,
  Input,
  inject,
  NgZone,
  type OnDestroy,
  ViewChild,
} from '@angular/core';

export interface ParametrosSignosVitales {
  frecuenciaCardiaca: number;
  saturacionOxigeno: number;
  presionSistolica: number;
  presionDiastolica: number;
  frecuenciaRespiratoria: number;
  temperatura: number;
}

@Component({
  selector: 'app-monitor-signos-vitales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monitor-signos-vitales.component.html',
  styles: [
    `
    .neon-text-green {
      color: #00ff66;
      text-shadow: 0 0 10px rgba(0, 255, 102, 0.9), 0 0 25px rgba(0, 255, 102, 0.6);
    }
    .neon-text-cyan {
      color: #00f0ff;
      text-shadow: 0 0 10px rgba(0, 240, 255, 0.9), 0 0 25px rgba(0, 240, 255, 0.6);
    }
    .neon-text-yellow {
      color: #ffea00;
      text-shadow: 0 0 10px rgba(255, 234, 0, 0.9), 0 0 25px rgba(255, 234, 0, 0.6);
    }
    .neon-text-pink {
      color: #ff0077;
      text-shadow: 0 0 10px rgba(255, 0, 119, 0.9), 0 0 25px rgba(255, 0, 119, 0.6);
    }
  `,
  ],
})
export class MonitorSignosVitalesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEcg', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() frecuenciaCardiaca = 75;
  @Input() saturacionOxigeno = 98;
  @Input() presionSistolica = 120;
  @Input() presionDiastolica = 80;
  @Input() frecuenciaRespiratoria = 16;
  @Input() temperatura = 36.6;
  @Input() modoCompacto = false;
  @Input() animarValores = true;
  @Input() mostrarEtiquetas = true;

  esLatidoActivo = false;
  frecuenciaActual = 75;
  saturacionActual = 98;
  presionSistolicaActual = 120;
  presionDiastolicaActual = 80;
  frecuenciaRespiratoriaActual = 16;
  temperaturaActual = 36.6;

  private animationFrameId = 0;
  private timerVariacion: ReturnType<typeof setInterval> | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  private sweepX = 0;
  private bufferEcg: (number | undefined)[] = [];
  private bufferSpo2: (number | undefined)[] = [];
  private bufferResp: (number | undefined)[] = [];

  private ultimoAncho = 0;
  private ultimoAlto = 0;

  ngAfterViewInit(): void {
    this.frecuenciaActual = this.frecuenciaCardiaca;
    this.saturacionActual = this.saturacionOxigeno;
    this.presionSistolicaActual = this.presionSistolica;
    this.presionDiastolicaActual = this.presionDiastolica;
    this.frecuenciaRespiratoriaActual = this.frecuenciaRespiratoria;
    this.temperaturaActual = this.temperatura;

    const contenedor = this.canvasRef?.nativeElement?.parentElement;
    if (contenedor && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.verificarAjusteTamano();
      });
      this.resizeObserver.observe(contenedor);
    }

    this.verificarAjusteTamano();
    this.iniciarAnimacionCanvas();

    if (this.animarValores) {
      this.iniciarVariacionValores();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.timerVariacion) {
      clearInterval(this.timerVariacion);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private iniciarVariacionValores(): void {
    this.timerVariacion = setInterval(() => {
      const deltaFc = Math.floor(Math.random() * 5) - 2;
      this.frecuenciaActual = Math.max(
        60,
        Math.min(100, this.frecuenciaCardiaca + deltaFc),
      );

      if (Math.random() > 0.5) {
        const deltaSpo2 = Math.random() > 0.5 ? 1 : -1;
        this.saturacionActual = Math.max(
          94,
          Math.min(100, this.saturacionOxigeno + deltaSpo2),
        );
      }

      if (Math.random() > 0.6) {
        const deltaSis = Math.floor(Math.random() * 5) - 2;
        const deltaDias = Math.floor(Math.random() * 3) - 1;
        this.presionSistolicaActual = Math.max(
          110,
          Math.min(135, this.presionSistolica + deltaSis),
        );
        this.presionDiastolicaActual = Math.max(
          70,
          Math.min(90, this.presionDiastolica + deltaDias),
        );
      }

      if (Math.random() > 0.65) {
        const deltaResp = Math.floor(Math.random() * 3) - 1;
        this.frecuenciaRespiratoriaActual = Math.max(
          12,
          Math.min(22, this.frecuenciaRespiratoria + deltaResp),
        );
      }

      if (Math.random() > 0.7) {
        const deltaTemp = Math.random() * 0.4 - 0.2;
        this.temperaturaActual = Number(
          (this.temperatura + deltaTemp).toFixed(1),
        );
      }

      this.cdr.markForCheck();
    }, 2000);
  }

  private verificarAjusteTamano(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const anchoContenedor = canvas.parentElement?.clientWidth || 500;
    const altoContenedor = this.modoCompacto ? 180 : 250;

    if (
      anchoContenedor === this.ultimoAncho &&
      altoContenedor === this.ultimoAlto
    ) {
      return;
    }

    this.ultimoAncho = anchoContenedor;
    this.ultimoAlto = altoContenedor;

    const relDpi = window.devicePixelRatio || 1;
    canvas.width = anchoContenedor * relDpi;
    canvas.height = altoContenedor * relDpi;

    const cantidadPuntos = Math.ceil(anchoContenedor);
    this.bufferEcg = new Array(cantidadPuntos).fill(undefined);
    this.bufferSpo2 = new Array(cantidadPuntos).fill(undefined);
    this.bufferResp = new Array(cantidadPuntos).fill(undefined);
    this.sweepX = 0;
  }

  private iniciarAnimacionCanvas(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.ngZone.runOutsideAngular(() => {
      const loopAnimacion = () => {
        const canvas = this.canvasRef?.nativeElement;
        if (canvas) {
          const contexto = canvas.getContext('2d');
          if (contexto && this.ultimoAncho > 0) {
            const relDpi = window.devicePixelRatio || 1;
            const ancho = this.ultimoAncho;
            const alto = this.ultimoAlto;

            const velocidad = 2.4;
            const anteriorX = Math.floor(this.sweepX);
            this.sweepX = (this.sweepX + velocidad) % ancho;
            const nuevoX = Math.floor(this.sweepX);

            const altoEcg = alto * 0.38;
            const altoSpo2 = alto * 0.3;
            const altoResp = alto * 0.22;

            const centroEcgY = altoEcg * 0.65;
            const centroSpo2Y = altoEcg + altoSpo2 * 0.52;
            const centroRespY = altoEcg + altoSpo2 + altoResp * 0.52;

            for (
              let x = anteriorX;
              x <= nuevoX || (nuevoX < anteriorX && x < ancho);
              x++
            ) {
              const idx = x % ancho;
              const valorEcg = this.generarPuntoEcg(idx, ancho, true);
              const valorSpo2 = this.generarPuntoSpo2(idx, ancho);
              const valorResp = this.generarPuntoResp(idx, ancho);

              this.bufferEcg[idx] = centroEcgY - valorEcg * (altoEcg * 0.24);
              this.bufferSpo2[idx] =
                centroSpo2Y - valorSpo2 * (altoSpo2 * 0.26);
              this.bufferResp[idx] =
                centroRespY - valorResp * (altoResp * 0.24);
            }

            const brecha = 26;
            for (let i = 1; i <= brecha; i++) {
              const idxLimpiar = (nuevoX + i) % ancho;
              this.bufferEcg[idxLimpiar] = undefined;
              this.bufferSpo2[idxLimpiar] = undefined;
              this.bufferResp[idxLimpiar] = undefined;
            }

            contexto.save();
            contexto.scale(relDpi, relDpi);

            contexto.clearRect(0, 0, ancho, alto);

            this.dibujarTraza(
              contexto,
              this.bufferEcg,
              ancho,
              '#00ff66',
              '#00ff66',
            );

            this.dibujarTraza(
              contexto,
              this.bufferSpo2,
              ancho,
              '#00f0ff',
              '#00f0ff',
            );

            this.dibujarTraza(
              contexto,
              this.bufferResp,
              ancho,
              '#ffea00',
              '#ffea00',
            );

            this.dibujarPuntosBarrido(
              contexto,
              nuevoX,
              this.bufferEcg[nuevoX],
              this.bufferSpo2[nuevoX],
              this.bufferResp[nuevoX],
            );

            contexto.restore();
          }
        }

        this.animationFrameId = requestAnimationFrame(loopAnimacion);
      };

      this.animationFrameId = requestAnimationFrame(loopAnimacion);
    });
  }

  private generarPuntoEcg(
    x: number,
    anchoTotal: number,
    dispararLatido = true,
  ): number {
    const latidosPorSegundo = this.frecuenciaActual / 60;
    const duracionCiclo = anchoTotal / (latidosPorSegundo * 3.5);
    const fase = (x % duracionCiclo) / duracionCiclo;

    if (dispararLatido && fase > 0.38 && fase < 0.41 && !this.esLatidoActivo) {
      this.ngZone.run(() => {
        this.esLatidoActivo = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.esLatidoActivo = false;
          this.cdr.markForCheck();
        }, 140);
      });
    }

    if (fase >= 0.12 && fase <= 0.22) {
      const subFase = (fase - 0.12) / 0.1;
      return Math.sin(subFase * Math.PI) * 0.18;
    }
    if (fase >= 0.34 && fase <= 0.37) {
      const subFase = (fase - 0.34) / 0.03;
      return -Math.sin(subFase * Math.PI) * 0.15;
    }
    if (fase >= 0.37 && fase <= 0.42) {
      const subFase = (fase - 0.37) / 0.05;
      return Math.sin(subFase * Math.PI) * 0.95;
    }
    if (fase >= 0.42 && fase <= 0.46) {
      const subFase = (fase - 0.42) / 0.04;
      return -Math.sin(subFase * Math.PI) * 0.28;
    }
    if (fase >= 0.58 && fase <= 0.74) {
      const subFase = (fase - 0.58) / 0.16;
      return Math.sin(subFase * Math.PI) * 0.22;
    }

    const ruido = (Math.random() - 0.5) * 0.03;
    return ruido;
  }

  private generarPuntoSpo2(x: number, anchoTotal: number): number {
    const latidosPorSegundo = this.frecuenciaActual / 60;
    const duracionCiclo = anchoTotal / (latidosPorSegundo * 3.5);
    const fase = (x % duracionCiclo) / duracionCiclo;

    if (fase >= 0.38 && fase <= 0.88) {
      const subFase = (fase - 0.38) / 0.5;
      const ondaPrincipal = Math.sin(subFase * Math.PI);
      const muescaDicrota =
        subFase > 0.4 ? Math.sin((subFase - 0.4) * Math.PI * 2) * 0.15 : 0;
      return Math.max(0, ondaPrincipal + muescaDicrota);
    }
    return (Math.random() - 0.5) * 0.02;
  }

  private generarPuntoResp(x: number, anchoTotal: number): number {
    const respiracionesPorSegundo = this.frecuenciaRespiratoriaActual / 60;
    const duracionCiclo = anchoTotal / (respiracionesPorSegundo * 2.2);
    const fase = (x % duracionCiclo) / duracionCiclo;

    return Math.sin(fase * Math.PI * 2);
  }

  private dibujarTraza(
    ctx: CanvasRenderingContext2D,
    buffer: (number | undefined)[],
    ancho: number,
    colorColor: string,
    colorBrillo: string,
  ): void {
    ctx.save();
    ctx.strokeStyle = colorColor;
    ctx.shadowColor = colorBrillo;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3.0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    let iniciado = false;

    for (let x = 0; x < ancho; x++) {
      const y = buffer[x];
      if (y === undefined || Number.isNaN(y)) {
        iniciado = false;
        continue;
      }

      if (!iniciado) {
        ctx.moveTo(x, y);
        iniciado = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  private dibujarPuntosBarrido(
    ctx: CanvasRenderingContext2D,
    x: number,
    yEcg?: number,
    ySpo2?: number,
    yResp?: number,
  ): void {
    ctx.save();

    if (yEcg !== undefined) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(x, yEcg, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ySpo2 !== undefined) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(x, ySpo2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (yResp !== undefined) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(x, yResp, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
