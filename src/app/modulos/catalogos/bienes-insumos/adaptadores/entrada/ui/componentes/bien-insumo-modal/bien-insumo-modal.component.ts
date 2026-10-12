import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectGlobalComponent } from '../../../../../../../../compartido/ui/select-global/select-global';
import type {
  IBienInsumoDetalle,
  IBienInsumoGuardarPayload,
  ICatalogoBienesInsumosAuxiliares,
  ISubGrupoFarmacologico,
} from '../../../../../tipos/bienes-insumos.tipos';

const LIMITE_PRECIO_MAXIMO = 999999.99;
const LONGITUD_MAXIMA_NOMBRE = 250;
const LONGITUD_MINIMA_NOMBRE = 3;

@Component({
  selector: 'app-bien-insumo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectGlobalComponent],
  templateUrl: './bien-insumo-modal.component.html',
})
export class BienInsumoModalComponent {
  @Input() visible = false;
  @Input() esEdicion = false;
  @Input() soloLectura = false;
  @Input() auxiliares: ICatalogoBienesInsumosAuxiliares | null = null;
  @Input() subgrupos: ISubGrupoFarmacologico[] = [];
  @Input() guardando = false;
  @Input() errorMensaje = '';

  @Input() set detalle(valor: IBienInsumoDetalle | null) {
    if (valor) {
      this.formulario = {
        codigo: valor.codigo,
        codigoSiga: valor.codigoSiga,
        codigoSunat: valor.codigoSunat,
        nombre: valor.nombre,
        nombreComercial: valor.nombreComercial,
        idGrupoFarmacologico: valor.idGrupoFarmacologico,
        idSubGrupoFarmacologico: valor.idSubGrupoFarmacologico,
        idPartida: valor.idPartida,
        idCentroCosto: valor.idCentroCosto,
        precioCompra: valor.precioCompra,
        precioDistribucion: valor.precioDistribucion,
        precioDonacion: valor.precioDonacion,
        precioUltimaCompra: valor.precioUltimaCompra,
        stockMinimo: valor.stockMinimo,
        tipoProducto: valor.tipoProducto,
        denominacion: valor.denominacion,
        concentracion: valor.concentracion,
        presentacion: valor.presentacion,
        formaFarmaceutica: valor.formaFarmaceutica,
        materialEnvase: valor.materialEnvase,
        presentacionEnvase: valor.presentacionEnvase,
        fabricante: valor.fabricante,
        idPaisOrigen: valor.idPaisOrigen,
        petitorio: valor.petitorio,
        tipoProductoSismed: valor.tipoProductoSismed,
        estado: valor.estado,
        estadoDigemid: valor.estadoDigemid,
        idTipoPrefijo: valor.idTipoPrefijo,
        politicaCanje: valor.politicaCanje,
        petitorioIst: valor.petitorioIst,
        comunes: valor.comunes,
        comiteFarmacologico: valor.comiteFarmacologico,
        especializados: valor.especializados,
        esVital: valor.esVital,
        esEstrategico: valor.esEstrategico,
        esOncologico: valor.esOncologico,
        cargaEnFua: valor.cargaEnFua,
        productoIndicadorGestion: valor.productoIndicadorGestion ?? false,
        preciosPorPlan: valor.preciosPorPlan ? [...valor.preciosPorPlan] : [],
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
    payload: IBienInsumoGuardarPayload;
  }>();
  @Output() alEliminar = new EventEmitter<number>();
  @Output() alCambiarGrupo = new EventEmitter<number>();

  readonly pestanaActiva = signal<
    'identificacion' | 'clasificacion' | 'precios'
  >('identificacion');
  readonly erroresValidacion = signal<string[]>([]);
  readonly mensajeExitoPrecios = signal('');

  idProductoEdicion = 0;
  formulario: IBienInsumoGuardarPayload = this.obtenerFormularioVacio();

  reiniciarFormulario(): void {
    this.formulario = this.obtenerFormularioVacio();
    this.idProductoEdicion = 0;
    this.pestanaActiva.set('identificacion');
    this.erroresValidacion.set([]);
    this.mensajeExitoPrecios.set('');
    this.cargarPlanesPredeterminados();
  }

  cambiarPestana(
    pestana: 'identificacion' | 'clasificacion' | 'precios',
  ): void {
    this.erroresValidacion.set([]);
    this.pestanaActiva.set(pestana);
  }

  cargarPlanesPredeterminados(): void {
    if (
      this.auxiliares?.financiamientos &&
      this.formulario.preciosPorPlan.length === 0
    ) {
      this.formulario.preciosPorPlan = this.auxiliares.financiamientos.map(
        (financiamiento) => ({
          idPlanCatalogo: 0,
          idTipoFinanciamiento: financiamiento.idTipoFinanciamiento,
          plan: financiamiento.descripcion,
          precioUnitario: 0,
          activo: true,
        }),
      );
    }
  }

  componerNombreOficial(): void {
    const partes: string[] = [];
    if (this.formulario.denominacion.trim()) {
      partes.push(this.formulario.denominacion.trim());
    }
    if (this.formulario.concentracion.trim()) {
      partes.push(this.formulario.concentracion.trim());
    }
    if (this.formulario.formaFarmaceutica.trim()) {
      partes.push(this.formulario.formaFarmaceutica.trim());
    }
    if (this.formulario.presentacion.trim()) {
      partes.push(this.formulario.presentacion.trim());
    }

    if (partes.length > 0) {
      this.formulario.nombre = partes.join(' ').toUpperCase();
    }
  }

  onGrupoSeleccionado(idGrupo: number): void {
    this.formulario.idGrupoFarmacologico = idGrupo;
    this.formulario.idSubGrupoFarmacologico = 0;
    this.alCambiarGrupo.emit(idGrupo);
  }

  igualarPrecios(precioBase?: number): void {
    let valorReplicar = precioBase;

    if (valorReplicar === undefined || valorReplicar === null) {
      if (this.formulario.precioDistribucion > 0) {
        valorReplicar = this.formulario.precioDistribucion;
      } else {
        const primerPrecioConValor = this.formulario.preciosPorPlan.find(
          (item) => item.precioUnitario > 0,
        );
        valorReplicar = primerPrecioConValor
          ? primerPrecioConValor.precioUnitario
          : 0;
      }
    }

    this.formulario.preciosPorPlan = this.formulario.preciosPorPlan.map(
      (item) => ({
        ...item,
        precioUnitario: valorReplicar ?? 0,
      }),
    );

    this.mensajeExitoPrecios.set(
      `Precios igualados correctamente a S/ ${(valorReplicar ?? 0).toFixed(4)} en todos los planes.`,
    );
    setTimeout(() => this.mensajeExitoPrecios.set(''), 4000);
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

  formatearMoneda(valor?: number): string {
    const numero = Number(valor);
    if (Number.isNaN(numero) || numero < 0) {
      return '0.0000';
    }
    return numero.toFixed(4);
  }

  validarPaso1(): string[] {
    const errores: string[] = [];
    const nombreLimpio = this.formulario.nombre.trim();
    if (!nombreLimpio) {
      errores.push('Pestaña 1: El Nombre Oficial en Catálogo es obligatorio.');
    } else if (nombreLimpio.length < LONGITUD_MINIMA_NOMBRE) {
      errores.push(
        `Pestaña 1: El Nombre Oficial debe tener al menos ${LONGITUD_MINIMA_NOMBRE} caracteres.`,
      );
    } else if (nombreLimpio.length > LONGITUD_MAXIMA_NOMBRE) {
      errores.push(
        `Pestaña 1: El Nombre Oficial no puede superar los ${LONGITUD_MAXIMA_NOMBRE} caracteres.`,
      );
    }

    if (
      this.formulario.tipoProducto === undefined ||
      this.formulario.tipoProducto === null ||
      this.formulario.tipoProducto < 0
    ) {
      errores.push('Pestaña 1: Debe seleccionar un Tipo de Producto válido.');
    }

    return errores;
  }

  validarPaso2(): string[] {
    const errores: string[] = [];
    if (!this.formulario.idCentroCosto || this.formulario.idCentroCosto <= 0) {
      errores.push(
        'Pestaña 2: Debe seleccionar un Centro de Costo (Presupuesto Hospitalario).',
      );
    }

    if (!this.formulario.idPartida || this.formulario.idPartida <= 0) {
      errores.push(
        'Pestaña 2: Debe seleccionar una Partida Presupuestal (Presupuesto Hospitalario).',
      );
    }

    return errores;
  }

  validarPaso3(): string[] {
    const errores: string[] = [];
    const prCompra = Number(this.formulario.precioCompra);
    if (
      Number.isNaN(prCompra) ||
      prCompra < 0 ||
      prCompra > LIMITE_PRECIO_MAXIMO
    ) {
      errores.push(
        `Pestaña 3: El Precio de Compra debe ser un valor numérico entre 0 y ${LIMITE_PRECIO_MAXIMO.toLocaleString()}.`,
      );
    }

    const prDistrib = Number(this.formulario.precioDistribucion);
    if (
      Number.isNaN(prDistrib) ||
      prDistrib < 0 ||
      prDistrib > LIMITE_PRECIO_MAXIMO
    ) {
      errores.push(
        `Pestaña 3: El Precio de Distribución debe ser un valor numérico entre 0 y ${LIMITE_PRECIO_MAXIMO.toLocaleString()}.`,
      );
    }

    const prDonacion = Number(this.formulario.precioDonacion);
    if (
      Number.isNaN(prDonacion) ||
      prDonacion < 0 ||
      prDonacion > LIMITE_PRECIO_MAXIMO
    ) {
      errores.push(
        `Pestaña 3: El Precio de Donación debe ser un valor numérico entre 0 y ${LIMITE_PRECIO_MAXIMO.toLocaleString()}.`,
      );
    }

    let tienePrecioPlanValido = false;
    for (const plan of this.formulario.preciosPorPlan) {
      const precioUnit = Number(plan.precioUnitario);
      if (
        Number.isNaN(precioUnit) ||
        precioUnit < 0 ||
        precioUnit > LIMITE_PRECIO_MAXIMO
      ) {
        errores.push(
          `Pestaña 3: El precio del plan "${plan.plan}" debe ser un número válido entre 0 y ${LIMITE_PRECIO_MAXIMO.toLocaleString()}.`,
        );
        break;
      }
      if (precioUnit > 0) {
        tienePrecioPlanValido = true;
      }
    }

    if (!tienePrecioPlanValido && prDistrib <= 0 && prCompra <= 0) {
      errores.push(
        'Pestaña 3: Debe ingresar al menos un precio de venta mayor a S/ 0.00 en el Tarifario de Planes.',
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
    if (this.pestanaActiva() === 'identificacion') {
      const errores = this.validarPaso1();
      if (errores.length > 0) {
        this.erroresValidacion.set(errores);
        return;
      }
      this.erroresValidacion.set([]);
      this.pestanaActiva.set('clasificacion');
      return;
    }

    if (this.pestanaActiva() === 'clasificacion') {
      const errores = this.validarPaso2();
      if (errores.length > 0) {
        this.erroresValidacion.set(errores);
        return;
      }
      this.erroresValidacion.set([]);
      this.pestanaActiva.set('precios');
      return;
    }

    if (this.pestanaActiva() === 'precios') {
      this.guardar();
    }
  }

  retrocederPaso(): void {
    this.erroresValidacion.set([]);
    if (this.pestanaActiva() === 'precios') {
      this.pestanaActiva.set('clasificacion');
      return;
    }
    if (this.pestanaActiva() === 'clasificacion') {
      this.pestanaActiva.set('identificacion');
      return;
    }
  }

  guardar(): void {
    const errores = this.validarFormulario();
    if (errores.length > 0) {
      this.erroresValidacion.set(errores);
      const primerError = errores[0];
      if (primerError.startsWith('Pestaña 1')) {
        this.pestanaActiva.set('identificacion');
      } else if (primerError.startsWith('Pestaña 2')) {
        this.pestanaActiva.set('clasificacion');
      } else if (primerError.startsWith('Pestaña 3')) {
        this.pestanaActiva.set('precios');
      }
      return;
    }
    this.erroresValidacion.set([]);

    const payloadLimpio: IBienInsumoGuardarPayload = {
      ...this.formulario,
      nombre: this.formulario.nombre.trim().toUpperCase(),
      nombreComercial: this.formulario.nombreComercial.trim().toUpperCase(),
      codigo: this.formulario.codigo.trim(),
      codigoSiga: this.formulario.codigoSiga.trim(),
      codigoSunat: this.formulario.codigoSunat.trim(),
      denominacion: this.formulario.denominacion.trim().toUpperCase(),
      concentracion: this.formulario.concentracion.trim(),
      presentacion: this.formulario.presentacion.trim().toUpperCase(),
      formaFarmaceutica: this.formulario.formaFarmaceutica.trim().toUpperCase(),
      materialEnvase: this.formulario.materialEnvase.trim().toUpperCase(),
      presentacionEnvase: this.formulario.presentacionEnvase
        .trim()
        .toUpperCase(),
      fabricante: this.formulario.fabricante.trim().toUpperCase(),
      tipoProductoSismed: this.formulario.tipoProductoSismed
        .trim()
        .toUpperCase(),
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

  private obtenerFormularioVacio(): IBienInsumoGuardarPayload {
    return {
      codigo: '',
      codigoSiga: '',
      codigoSunat: '',
      nombre: '',
      nombreComercial: '',
      idGrupoFarmacologico: 0,
      idSubGrupoFarmacologico: 0,
      idPartida: 0,
      idCentroCosto: 0,
      precioCompra: 0,
      precioDistribucion: 0,
      precioDonacion: 0,
      precioUltimaCompra: 0,
      stockMinimo: 0,
      tipoProducto: 1,
      denominacion: '',
      concentracion: '',
      presentacion: '',
      formaFarmaceutica: '',
      materialEnvase: '',
      presentacionEnvase: '',
      fabricante: '',
      idPaisOrigen: 0,
      petitorio: true,
      tipoProductoSismed: 'S',
      estado: 1,
      estadoDigemid: 1,
      idTipoPrefijo: 0,
      politicaCanje: 0,
      petitorioIst: false,
      comunes: false,
      comiteFarmacologico: false,
      especializados: false,
      esVital: false,
      esEstrategico: false,
      esOncologico: false,
      cargaEnFua: true,
      productoIndicadorGestion: false,
      preciosPorPlan: [],
    };
  }
}
