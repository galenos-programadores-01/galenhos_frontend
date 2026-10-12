import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectGlobalComponent } from '../../../../../../../../compartido/ui/select-global/select-global';
import type {
  IServicioCatalogoDetalle,
  IServicioCatalogoGuardarPayload,
  IServicioGrupo,
  ITarifaFinanciamiento,
} from '../../../../../tipos/servicios-catalogo.tipos';

const LIMITE_PRECIO_MAXIMO = 999999.99;
const LONGITUD_MINIMA_NOMBRE = 3;
const LONGITUD_MAXIMA_NOMBRE = 250;

@Component({
  selector: 'app-servicio-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectGlobalComponent],
  templateUrl: './servicio-modal.component.html',
})
export class ServicioModalComponent {
  @Input() visible = false;
  @Input() esEdicion = false;
  @Input() soloLectura = false;
  @Input() grupos: IServicioGrupo[] = [];
  @Input() guardando = false;
  @Input() errorMensaje = '';

  @Input() set detalle(valor: IServicioCatalogoDetalle | null) {
    if (valor) {
      let precioPart = valor.precioParticular ?? 0;
      let precioSis = valor.precioSis ?? 0;
      if (valor.tarifas && valor.tarifas.length > 0) {
        const part = valor.tarifas.find(
          (tarifa: ITarifaFinanciamiento) => tarifa.idTipoFinanciamiento === 1,
        );
        if (part) precioPart = part.precioUnitario;
        const sis = valor.tarifas.find(
          (tarifa: ITarifaFinanciamiento) => tarifa.idTipoFinanciamiento === 2,
        );
        if (sis) precioSis = sis.precioUnitario;
      }

      this.formulario = {
        codigo: valor.codigo ?? '',
        codigoHis: valor.codigoHis ?? '',
        codigoSunat: valor.codigoSunat ?? '',
        nombre: valor.nombre ?? '',
        nombreCorto: valor.nombreCorto ?? '',
        idServicioGrupo: valor.idServicioGrupo ?? 0,
        codMinsa: valor.codMinsa ?? '',
        nombreMinsa: valor.nombreMinsa ?? '',
        esCpt: valor.esCpt ?? true,
        esQuirurgico: valor.esQuirurgico ?? false,
        codigoSis: valor.codigoSis ?? '',
        codigoSoat: valor.codigoSoat ?? '',
        cpms: valor.cpms ?? '',
        precioParticular: precioPart,
        precioSis: precioSis,
        idEstado: valor.idEstado ?? 1,
        cargaEnFua: valor.cargaEnFua ?? true,
        cargaEnHis: valor.cargaEnHis ?? true,
      };
      this.idProductoEdicion = valor.idProducto;
      this.erroresValidacion.set([]);
    } else {
      this.reiniciarFormulario();
    }
  }

  @Output() alCerrar = new EventEmitter<void>();
  @Output() alGuardar = new EventEmitter<{
    idProducto?: number;
    payload: IServicioCatalogoGuardarPayload;
  }>();
  @Output() alEliminar = new EventEmitter<number>();

  readonly pestanaActiva = signal<'procedimiento' | 'normativa' | 'tarifas'>(
    'procedimiento',
  );
  readonly erroresValidacion = signal<string[]>([]);
  idProductoEdicion = 0;

  formulario: IServicioCatalogoGuardarPayload = this.obtenerFormularioVacio();

  reiniciarFormulario(): void {
    this.formulario = this.obtenerFormularioVacio();
    this.idProductoEdicion = 0;
    this.pestanaActiva.set('procedimiento');
    this.erroresValidacion.set([]);
  }

  cambiarPestana(pestana: 'procedimiento' | 'normativa' | 'tarifas'): void {
    this.erroresValidacion.set([]);
    this.pestanaActiva.set(pestana);
  }

  validarPaso1(): string[] {
    const errores: string[] = [];
    const nombreLimpio = this.formulario.nombre.trim();
    if (!nombreLimpio) {
      errores.push(
        'Paso 1: La descripción del servicio o procedimiento es obligatoria.',
      );
    } else if (nombreLimpio.length < LONGITUD_MINIMA_NOMBRE) {
      errores.push(
        `Paso 1: La descripción debe contener al menos ${LONGITUD_MINIMA_NOMBRE} caracteres.`,
      );
    } else if (nombreLimpio.length > LONGITUD_MAXIMA_NOMBRE) {
      errores.push(
        `Paso 1: La descripción no puede exceder los ${LONGITUD_MAXIMA_NOMBRE} caracteres.`,
      );
    }

    if (
      !this.formulario.idServicioGrupo ||
      this.formulario.idServicioGrupo <= 0
    ) {
      errores.push('Paso 1: Debe seleccionar un Grupo de Servicio válido.');
    }
    return errores;
  }

  validarPaso2(): string[] {
    return [];
  }

  validarPaso3(): string[] {
    const errores: string[] = [];
    const precioPart = Number(this.formulario.precioParticular);
    if (
      Number.isNaN(precioPart) ||
      precioPart < 0 ||
      precioPart > LIMITE_PRECIO_MAXIMO
    ) {
      errores.push(
        `Paso 3: La Tarifa Particular debe ser un valor válido entre 0 y ${LIMITE_PRECIO_MAXIMO.toLocaleString()}.`,
      );
    }

    const precioSis = Number(this.formulario.precioSis);
    if (
      Number.isNaN(precioSis) ||
      precioSis < 0 ||
      precioSis > LIMITE_PRECIO_MAXIMO
    ) {
      errores.push(
        `Paso 3: La Tarifa SIS debe ser un valor válido entre 0 y ${LIMITE_PRECIO_MAXIMO.toLocaleString()}.`,
      );
    }
    return errores;
  }

  private validarFormulario(): string[] {
    return [
      ...this.validarPaso1(),
      ...this.validarPaso2(),
      ...this.validarPaso3(),
    ];
  }

  avanzarPaso(): void {
    if (this.pestanaActiva() === 'procedimiento') {
      const errores = this.validarPaso1();
      if (errores.length > 0) {
        this.erroresValidacion.set(errores);
        return;
      }
      this.erroresValidacion.set([]);
      this.pestanaActiva.set('normativa');
      return;
    }

    if (this.pestanaActiva() === 'normativa') {
      const errores = this.validarPaso2();
      if (errores.length > 0) {
        this.erroresValidacion.set(errores);
        return;
      }
      this.erroresValidacion.set([]);
      this.pestanaActiva.set('tarifas');
      return;
    }

    if (this.pestanaActiva() === 'tarifas') {
      this.guardar();
    }
  }

  retrocederPaso(): void {
    this.erroresValidacion.set([]);
    if (this.pestanaActiva() === 'tarifas') {
      this.pestanaActiva.set('normativa');
      return;
    }
    if (this.pestanaActiva() === 'normativa') {
      this.pestanaActiva.set('procedimiento');
      return;
    }
  }

  validarTeclaPrecio(evento: KeyboardEvent): void {
    const teclasPermitidas = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];
    if (teclasPermitidas.includes(evento.key)) {
      return;
    }
    if (
      (evento.ctrlKey || evento.metaKey) &&
      ['a', 'c', 'v', 'x'].includes(evento.key.toLowerCase())
    ) {
      return;
    }
    if (/^[0-9]$/.test(evento.key)) {
      return;
    }
    if (evento.key === '.') {
      const input = evento.target as HTMLInputElement;
      if (input && !input.value.includes('.')) {
        return;
      }
    }
    evento.preventDefault();
  }

  guardar(): void {
    const errores = this.validarFormulario();
    if (errores.length > 0) {
      this.erroresValidacion.set(errores);
      const primerError = errores[0];
      if (primerError.startsWith('Paso 1')) {
        this.pestanaActiva.set('procedimiento');
      } else if (primerError.startsWith('Paso 2')) {
        this.pestanaActiva.set('normativa');
      } else if (primerError.startsWith('Paso 3')) {
        this.pestanaActiva.set('tarifas');
      }
      return;
    }
    this.erroresValidacion.set([]);

    const payloadLimpio: IServicioCatalogoGuardarPayload = {
      ...this.formulario,
      nombre: this.formulario.nombre.trim().toUpperCase(),
      nombreCorto: this.formulario.nombreCorto.trim().toUpperCase(),
      codigo: this.formulario.codigo.trim(),
      codigoHis: this.formulario.codigoHis.trim(),
      codigoSunat: this.formulario.codigoSunat.trim(),
      codMinsa: this.formulario.codMinsa.trim(),
      nombreMinsa: this.formulario.nombreMinsa.trim().toUpperCase(),
      codigoSis: this.formulario.codigoSis.trim(),
      codigoSoat: this.formulario.codigoSoat.trim(),
      cpms: this.formulario.cpms.trim(),
      precioParticular: Number(this.formulario.precioParticular) || 0,
      precioSis: Number(this.formulario.precioSis) || 0,
    };

    this.alGuardar.emit({
      idProducto: this.esEdicion ? this.idProductoEdicion : undefined,
      payload: payloadLimpio,
    });
  }

  eliminar(): void {
    this.alEliminar.emit(this.idProductoEdicion);
  }

  cerrar(): void {
    this.alCerrar.emit();
  }

  private obtenerFormularioVacio(): IServicioCatalogoGuardarPayload {
    return {
      codigo: '',
      codigoHis: '',
      codigoSunat: '',
      nombre: '',
      nombreCorto: '',
      idServicioGrupo: 0,
      codMinsa: '',
      nombreMinsa: '',
      esCpt: true,
      esQuirurgico: false,
      codigoSis: '',
      codigoSoat: '',
      cpms: '',
      precioParticular: 0,
      precioSis: 0,
      idEstado: 1,
      cargaEnFua: true,
      cargaEnHis: true,
    };
  }
}
