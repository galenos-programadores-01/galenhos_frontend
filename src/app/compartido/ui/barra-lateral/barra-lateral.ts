import {
  Component,
  EventEmitter,
  Input,
  inject,
  Output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../modulos/auth/aplicacion/auth.service';
import type { IMenuPermiso } from '../../tipos/tipos';
import { IconoRuta } from '../icono-ruta/icono-ruta';

@Component({
  selector: 'barra-lateral',
  imports: [RouterLink, RouterLinkActive, IconoRuta],
  templateUrl: './barra-lateral.html',
})
export class BarraLateral {
  @Input() username: string | null = null;
  @Input() isCollapsed: boolean = false;
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  @Output() closeMobileSidebarEvent = new EventEmitter<void>();

  authService = inject(AuthService);

  expandedGroups = signal<Record<number, boolean>>({});

  get menus() {
    return this.authService.menus();
  }

  get permisos() {
    return this.authService.permisos();
  }

  getPermisosPorGrupo(idListGrupo: number) {
    return this.permisos.filter(
      (p) => p.idListGrupo === idListGrupo && p.opciones !== '*',
    );
  }

  toggleGroup(idListGrupo: number) {
    if (this.isCollapsed) return;
    this.expandedGroups.update((state) => ({
      ...state,
      [idListGrupo]: !state[idListGrupo],
    }));
  }

  isGroupExpanded(idListGrupo: number): boolean {
    return Boolean(this.expandedGroups()[idListGrupo]);
  }

  resolverRuta(permiso: IMenuPermiso): string {
    const clave = (permiso.claveWeb || '').trim();
    const claveMin = clave.toLowerCase();
    const menuMin = (permiso.menu || '').trim().toLowerCase();

    if (
      clave === 'CatalogoBienes' ||
      claveMin === 'catalogobienes' ||
      menuMin.includes('bienes')
    ) {
      return '/catalogos/bienes-insumos';
    }

    if (
      clave === 'FacturacionCatalogoServicios' ||
      claveMin === 'facturacioncatalogoservicios' ||
      (menuMin.includes('catalogo') && menuMin.includes('servicios'))
    ) {
      return '/catalogos/servicios';
    }

    if (
      clave === 'DashFarm' ||
      claveMin === 'dashfarm' ||
      menuMin.includes('dashboard farmacia')
    ) {
      return '/farmacia/disponibilidad';
    }

    if (
      clave === 'atenciones' ||
      claveMin === 'atenciones' ||
      menuMin.includes('registro de atenciones')
    ) {
      return '/atencion-ce';
    }

    if (!clave) {
      return `/${menuMin.replace(/\s+/g, '-')}`;
    }

    return clave.startsWith('/') ? clave : `/${clave}`;
  }
}
