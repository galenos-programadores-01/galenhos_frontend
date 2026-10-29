import { CommonModule } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import { BienesInsumosApiService } from '../../../../../../catalogos/bienes-insumos/adaptadores/salida/http/bienes-insumos.api.service';
import type { IBienInsumoItem } from '../../../../../../catalogos/bienes-insumos/tipos/bienes-insumos.tipos';
import type { ItemRecetaPrescripcion } from '../../../../../tipos/atencion-ce.tipos';

@Component({
  selector: 'app-receta-ce-seccion',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectGlobalComponent],
  templateUrl: './receta-ce-seccion.component.html',
})
export class RecetaCeSeccionComponent {
  private readonly bienesService = inject(BienesInsumosApiService);

  readonly itemsReceta = input.required<ItemRecetaPrescripcion[]>();
  readonly itemsRecetaCambio = output<ItemRecetaPrescripcion[]>();
  readonly textoTratamientoGenerado = output<string>();

  readonly textoBusqueda = signal<string>('');
  readonly resultadosMedicamentos = signal<readonly IBienInsumoItem[]>([]);
  readonly buscando = signal<boolean>(false);
  readonly dropdownAbierto = signal<boolean>(false);

  readonly medicamentoSeleccionado = signal<IBienInsumoItem | null>(null);
  readonly dosis = signal<string>('1 tableta');
  readonly via = signal<string>('Oral');
  readonly frecuencia = signal<string>('cada 8 horas');
  readonly duracion = signal<string>('7 días');
  readonly cantidad = signal<number>(21);
  readonly indicaciones = signal<string>('');

  readonly viasComunes = [
    'Oral',
    'Intravenosa (EV)',
    'Intramuscular (IM)',
    'Subcutánea (SC)',
    'Tópica',
    'Inhalatoria',
    'Oftálmica',
    'Ótica',
    'Rectal',
  ];

  readonly frecuenciasComunes = [
    'cada 6 horas',
    'cada 8 horas',
    'cada 12 horas',
    'cada 24 horas (una vez al día)',
    'en las comidas',
    'en ayunas',
    'antes de dormir',
    'condicional a dolor / fiebre',
  ];

  private temporizadorBusquedaMedicamento: ReturnType<
    typeof setTimeout
  > | null = null;
  private identificadorPeticionMedicamento = 0;

  alEscribirMedicamento(): void {
    const termino = this.textoBusqueda().trim();
    if (this.temporizadorBusquedaMedicamento) {
      clearTimeout(this.temporizadorBusquedaMedicamento);
    }

    if (termino.length < 2) {
      this.resultadosMedicamentos.set([]);
      this.dropdownAbierto.set(false);
      this.buscando.set(false);
      return;
    }

    this.buscando.set(true);
    this.temporizadorBusquedaMedicamento = setTimeout(async () => {
      const identificadorActual = ++this.identificadorPeticionMedicamento;
      try {
        const respuesta = await this.bienesService.listar({
          filtro: termino,
          page: 1,
          pageSize: 20,
        });
        if (identificadorActual === this.identificadorPeticionMedicamento) {
          const itemsOrdenados = this.ordenarMedicamentosPorRelevancia(
            respuesta.items,
            termino,
          );
          this.resultadosMedicamentos.set(itemsOrdenados);
          this.dropdownAbierto.set(itemsOrdenados.length > 0);
        }
      } catch {
        if (identificadorActual === this.identificadorPeticionMedicamento) {
          this.resultadosMedicamentos.set([]);
        }
      } finally {
        if (identificadorActual === this.identificadorPeticionMedicamento) {
          this.buscando.set(false);
        }
      }
    }, 250);
  }

  private ordenarMedicamentosPorRelevancia(
    items: readonly IBienInsumoItem[],
    termino: string,
  ): readonly IBienInsumoItem[] {
    const busqueda = termino.toUpperCase().trim();
    return [...items].sort((a, b) => {
      const nombreA = a.nombre.toUpperCase().trim();
      const nombreB = b.nombre.toUpperCase().trim();
      const codigoA = a.codigo.toUpperCase().trim();
      const codigoB = b.codigo.toUpperCase().trim();

      const exactoA = nombreA === busqueda || codigoA === busqueda ? 1 : 0;
      const exactoB = nombreB === busqueda || codigoB === busqueda ? 1 : 0;
      if (exactoA !== exactoB) return exactoB - exactoA;

      const prefijoA =
        nombreA.startsWith(busqueda) || codigoA.startsWith(busqueda) ? 1 : 0;
      const prefijoB =
        nombreB.startsWith(busqueda) || codigoB.startsWith(busqueda) ? 1 : 0;
      if (prefijoA !== prefijoB) return prefijoB - prefijoA;

      return nombreA.localeCompare(nombreB);
    });
  }

  seleccionarMedicamento(item: IBienInsumoItem): void {
    this.medicamentoSeleccionado.set(item);
    this.textoBusqueda.set(
      `${item.codigo} - ${item.nombre} ${item.concentracion}`,
    );
    this.dropdownAbierto.set(false);
  }

  agregarItem(): void {
    const med = this.medicamentoSeleccionado();
    if (!med) return;

    const nuevoItem: ItemRecetaPrescripcion = {
      idProducto: med.idProducto,
      codigo: med.codigo,
      nombre: med.nombre,
      concentracion: med.concentracion,
      formaFarmaceutica: med.formaFarmaceutica,
      dosis: this.dosis().trim(),
      via: this.via(),
      frecuencia: this.frecuencia(),
      duracion: this.duracion().trim(),
      cantidad: this.cantidad() || 1,
      indicaciones: this.indicaciones().trim(),
    };

    const lista = [...this.itemsReceta(), nuevoItem];
    this.itemsRecetaCambio.emit(lista);
    this.emitirTextoTratamiento(lista);

    // Resetear formulario
    this.medicamentoSeleccionado.set(null);
    this.textoBusqueda.set('');
    this.indicaciones.set('');
  }

  actualizarItemReceta(
    indice: number,
    campo: keyof ItemRecetaPrescripcion,
    valor: string | number,
  ): void {
    const lista = [...this.itemsReceta()];
    if (indice >= 0 && indice < lista.length) {
      lista[indice] = {
        ...lista[indice],
        [campo]: valor,
      };
      this.itemsRecetaCambio.emit(lista);
      this.emitirTextoTratamiento(lista);
    }
  }

  eliminarItem(indice: number): void {
    const lista = [...this.itemsReceta()];
    lista.splice(indice, 1);
    this.itemsRecetaCambio.emit(lista);
    this.emitirTextoTratamiento(lista);
  }

  private emitirTextoTratamiento(lista: ItemRecetaPrescripcion[]): void {
    const lineas = lista.map((item, index) => {
      let linea = `${index + 1}. ${item.nombre} ${item.concentracion} (${item.formaFarmaceutica}) - Cant: ${item.cantidad}\n   Indicación: ${item.dosis} vía ${item.via}, ${item.frecuencia} por ${item.duracion}.`;
      if (item.indicaciones) {
        linea += ` ${item.indicaciones}`;
      }
      return linea;
    });
    this.textoTratamientoGenerado.emit(lineas.join('\n\n'));
  }
}
