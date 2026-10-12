import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TemaService } from '../../servicios/tema.service';

/**
 * Botón sol/luna que alterna entre modo día y modo noche. El icono muestra el
 * estado destino: en modo día ofrece pasar a noche, y viceversa.
 */
@Component({
  selector: 'app-boton-tema',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boton-tema.html',
})
export class BotonTemaComponent {
  private readonly tema = inject(TemaService);

  readonly oscuro = this.tema.oscuro;
  readonly etiqueta = () =>
    this.tema.oscuro() ? 'Cambiar a modo día' : 'Cambiar a modo noche';

  alternar(): void {
    this.tema.alternar();
  }
}
