import { Injectable, signal } from '@angular/core';

const CLAVE_STORAGE_FECHA = 'galenos.atencionCe.fecha';
const CLAVE_STORAGE_ESTADO = 'galenos.atencionCe.estado';

@Injectable({
  providedIn: 'root',
})
export class AtencionCeEstadoService {
  private readonly fechaInicial = this.obtenerFechaInicial();
  private readonly estadoInicial = this.obtenerEstadoInicial();

  readonly fechaSeleccionada = signal<string>(this.fechaInicial);
  readonly estadoFiltro = signal<string>(this.estadoInicial);
  readonly filtroTexto = signal<string>('');

  establecerFecha(nuevaFecha: string): void {
    const fechaValida = nuevaFecha || this.obtenerFechaHoy();
    this.fechaSeleccionada.set(fechaValida);
    try {
      sessionStorage.setItem(CLAVE_STORAGE_FECHA, fechaValida);
    } catch {
      // Silenciar restricciones de entorno
    }
  }

  establecerEstadoFiltro(nuevoEstado: string): void {
    this.estadoFiltro.set(nuevoEstado);
    try {
      sessionStorage.setItem(CLAVE_STORAGE_ESTADO, nuevoEstado);
    } catch {
      // Silenciar restricciones de entorno
    }
  }

  establecerFiltroTexto(nuevoTexto: string): void {
    this.filtroTexto.set(nuevoTexto);
  }

  restablecerAHoy(): void {
    this.establecerFecha(this.obtenerFechaHoy());
  }

  obtenerFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  private obtenerFechaInicial(): string {
    try {
      const fechaGuardada = sessionStorage.getItem(CLAVE_STORAGE_FECHA);
      if (fechaGuardada && /^\d{4}-\d{2}-\d{2}$/.test(fechaGuardada)) {
        return fechaGuardada;
      }
    } catch {
      // Fallback
    }
    return this.obtenerFechaHoy();
  }

  private obtenerEstadoInicial(): string {
    try {
      return sessionStorage.getItem(CLAVE_STORAGE_ESTADO) || '';
    } catch {
      return '';
    }
  }
}
