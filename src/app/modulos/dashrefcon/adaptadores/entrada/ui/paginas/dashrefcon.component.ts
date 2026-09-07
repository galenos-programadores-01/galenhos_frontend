import { Component } from '@angular/core';

interface EstadoRefCon {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-dashrefcon',
  standalone: true,
  templateUrl: './dashrefcon.component.html',
})
export class DashrefconComponent {
  estados: EstadoRefCon[] = [
    { id: 5, nombre: 'PACIENTE RECIBIDO' },
    { id: 8, nombre: 'CONTRAREFERIDO' },
    { id: 3, nombre: 'ACEPTADO' },
    { id: 7, nombre: 'PACIENTE CITADO' },
    { id: 4, nombre: 'RECHAZADO' },
  ];

  fechaInicio = fechaHoy();
  fechaFin = fechaHoy();
  idEstado: number | null = null;

  buscando = false;
  error = '';
  resultado = '';

  buscar() {
    this.buscando = true;
    this.error = '';
    this.resultado = '';

    try {
      if (!this.fechaInicio || !this.fechaFin) {
        this.error = 'Fecha inicio y fecha fin son obligatorias.';
        return;
      }
      if (this.fechaInicio > this.fechaFin) {
        this.error = 'La fecha inicio no puede ser mayor que la fecha fin.';
        return;
      }

      const estado = this.estados.find((e) => e.id === this.idEstado);
      const estadoTexto = estado ? estado.nombre : 'TODOS';
      this.resultado = `Buscando referencias y contrarreferencias del ${formatearFecha(this.fechaInicio)} al ${formatearFecha(this.fechaFin)} con estado ${estadoTexto}.`;
    } finally {
      this.buscando = false;
    }
  }

  onEstadoChange(valor: string) {
    this.idEstado = valor !== '' ? Number(valor) : null;
  }
}

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
