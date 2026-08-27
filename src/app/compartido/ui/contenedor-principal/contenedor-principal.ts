import { Component, inject } from '@angular/core';
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

  tituloActual: string = '';
  isSidebarOpen: boolean = true;

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.actualizarTitulo();
      });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  private actualizarTitulo() {
    const route = this.router.routerState.snapshot.root;
    let currentRoute = route;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    const data = currentRoute.data as { title?: string };
    this.tituloActual = data.title || 'Galenos Pro';
  }
}
