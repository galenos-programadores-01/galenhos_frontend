import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../modulos/auth/aplicacion/auth.service';
import { BarraLateral } from '../barra-lateral/barra-lateral';
import { BarraSuperior } from '../barra-superior/barra-superior';

@Component({
  selector: 'contenedor-principal',
  imports: [RouterOutlet, BarraLateral, BarraSuperior],
  templateUrl: './contenedor-principal.html',
})
export class ContenedorPrincipal {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  tituloActual = signal<string>('Galenos Pro');
  isSidebarOpen = signal<boolean>(true);
  isMobileSidebarOpen = signal<boolean>(false);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.actualizarTitulo();
        this.isMobileSidebarOpen.set(false);
      });
  }

  toggleSidebar() {
    this.isSidebarOpen.update((abierto) => !abierto);
  }

  toggleMobileSidebar() {
    this.isMobileSidebarOpen.update((abierto) => !abierto);
  }

  cerrarMobileSidebar() {
    this.isMobileSidebarOpen.set(false);
  }

  private actualizarTitulo() {
    const route = this.router.routerState.snapshot.root;
    let currentRoute = route;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    const data = currentRoute.data as { title?: string };
    this.tituloActual.set(data.title || 'Galenos Pro');
  }
}
