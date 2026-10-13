import { Injectable, inject } from '@angular/core';
import { ApiRequestError } from '../../../compartido/api-client/api-client.service';
import { PrimeraAtencionApiService } from '../adaptadores/salida/http/primera-atencion.api.service';
import {
  SESSION_KEY_PA,
  type FormPrimeraAtencion,
  type PrimeraAtencionGuardarPayload,
  type SessionBorradorPA,
} from './primera-atencion.mapper';

export type EstadoPersistenciaPA = 'idle' | 'saving' | 'saved' | 'error';

@Injectable({ providedIn: 'root' })
export class PrimeraAtencionPersistenciaService {
  private readonly api = inject(PrimeraAtencionApiService);

  estado: EstadoPersistenciaPA = 'idle';
  errorGuardado = '';
  ultimoGuardado: Date | null = null;
  idPrimeraAtencion: number | null = null;
  idAtencionActivo: number | null = null;

  private dirty = false;
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private intervalId?: ReturnType<typeof setInterval>;
  private saveChain: Promise<void> = Promise.resolve();
  private obtenerPayload: (() => PrimeraAtencionGuardarPayload) | null = null;
  private obtenerSession: (() => Omit<SessionBorradorPA, 'guardadoEn'>) | null =
    null;

  /** Hook opcional para refrescar la UI (indicador Guardado). */
  onEstadoChange: (() => void) | null = null;

  private readonly DEBOUNCE_MS = 2500;
  private readonly INTERVAL_MS = 30_000;

  registrarFuentes(
    obtenerPayload: () => PrimeraAtencionGuardarPayload,
    obtenerSession: () => Omit<SessionBorradorPA, 'guardadoEn'>,
  ): void {
    this.obtenerPayload = obtenerPayload;
    this.obtenerSession = obtenerSession;
  }

  activar(idAtencion: number): void {
    this.idAtencionActivo = idAtencion;
    this.detenerTimers();
    this.intervalId = setInterval(() => {
      if (this.dirty) void this.flush();
    }, this.INTERVAL_MS);
  }

  desactivar(): void {
    this.detenerTimers();
    this.idAtencionActivo = null;
    this.dirty = false;
    this.estado = 'idle';
    this.errorGuardado = '';
  }

  marcarDirty(): void {
    if (!this.idAtencionActivo) return;
    this.dirty = true;
    this.guardarSessionStorage();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.flush();
    }, this.DEBOUNCE_MS);
  }

  /** Solo borrador local (p. ej. diagnósticos P/D). No dispara PATCH de cabecera. */
  marcarBorradorLocal(): void {
    if (!this.idAtencionActivo) return;
    this.guardarSessionStorage();
  }

  async iniciarBorrador(
    idAtencion: number,
    fechaAtencion?: string,
    tipoAnamnesis?: 'D' | 'I',
  ): Promise<number> {
    const resp = await this.api.iniciarBorrador({
      idAtencion,
      fechaAtencion,
      tipoAnamnesis,
    });
    this.idPrimeraAtencion = resp.idPrimeraAtencion;
    this.idAtencionActivo = idAtencion;
    this.ultimoGuardado = new Date();
    this.estado = 'saved';
    this.dirty = false;
    this.guardarSessionStorage();
    return resp.idPrimeraAtencion;
  }

  async flush(): Promise<void> {
    if (!this.idAtencionActivo || !this.obtenerPayload) return;
    this.saveChain = this.saveChain.then(() => this.ejecutarGuardado());
    await this.saveChain;
  }

  private async ejecutarGuardado(): Promise<void> {
    if (!this.idAtencionActivo || !this.obtenerPayload) return;
    const idAtencion = this.idAtencionActivo;
    const payload = this.obtenerPayload();
    this.estado = 'saving';
    this.errorGuardado = '';
    this.onEstadoChange?.();
    try {
      const resp = await this.api.guardarParcial(idAtencion, payload);
      this.idPrimeraAtencion = resp.idPrimeraAtencion;
      this.ultimoGuardado = new Date();
      this.estado = 'saved';
      this.dirty = false;
      this.guardarSessionStorage();
    } catch (err: unknown) {
      this.estado = 'error';
      this.errorGuardado =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo guardar el borrador.';
      this.guardarSessionStorage();
    }
    this.onEstadoChange?.();
  }

  guardarSessionStorage(): void {
    if (!this.idAtencionActivo || !this.obtenerSession) return;
    try {
      const data: SessionBorradorPA = {
        ...this.obtenerSession(),
        guardadoEn: new Date().toISOString(),
      };
      sessionStorage.setItem(
        SESSION_KEY_PA(this.idAtencionActivo),
        JSON.stringify(data),
      );
    } catch {
      /* quota / privado */
    }
  }

  cargarSessionStorage(idAtencion: number): SessionBorradorPA | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY_PA(idAtencion));
      if (!raw) return null;
      return JSON.parse(raw) as SessionBorradorPA;
    } catch {
      return null;
    }
  }

  limpiarSessionStorage(idAtencion: number): void {
    try {
      sessionStorage.removeItem(SESSION_KEY_PA(idAtencion));
    } catch {
      /* ignore */
    }
  }

  textoEstado(): string {
    if (this.estado === 'saving') return 'Guardando…';
    if (this.estado === 'error') return this.errorGuardado || 'Error al guardar';
    if (this.estado === 'saved' && this.ultimoGuardado) {
      const h = this.ultimoGuardado.getHours();
      const m = String(this.ultimoGuardado.getMinutes()).padStart(2, '0');
      return `Guardado ${h}:${m}`;
    }
    if (this.dirty) return 'Cambios pendientes';
    return '';
  }

  private detenerTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
