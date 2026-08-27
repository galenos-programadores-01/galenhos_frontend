import { NgTemplateOutlet, UpperCasePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  inject,
  type OnInit,
  Output,
  signal,
} from '@angular/core';
import { AuthService } from '../../../modulos/auth/aplicacion/auth.service';
import { HeaderActionsService } from '../../servicios/header-actions.service';
import { VentanaModal } from '../ventana-modal/ventana-modal';

@Component({
  selector: 'barra-superior',
  standalone: true,
  templateUrl: './barra-superior.html',
  imports: [NgTemplateOutlet, UpperCasePipe, VentanaModal],
})
export class BarraSuperior implements OnInit {
  headerActions = inject(HeaderActionsService);
  elementRef = inject(ElementRef);
  authService = inject(AuthService);

  @Input() title: string = '';
  @Input() username: string | null = null;
  @Output() logoutEvent = new EventEmitter<void>();

  isMenuOpen = signal(false);
  isProfileModalOpen = signal(false);

  ngOnInit() {
    if (this.authService.isAuthenticated() && !this.authService.userProfile()) {
      this.authService.cargarPerfil();
    }
  }

  toggleMenu() {
    this.isMenuOpen.update((estadoActual) => !estadoActual);
  }

  abrirPerfilModal() {
    this.isProfileModalOpen.set(true);
  }

  cerrarPerfilModal() {
    this.isProfileModalOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isMenuOpen.set(false);
    }
  }
}
