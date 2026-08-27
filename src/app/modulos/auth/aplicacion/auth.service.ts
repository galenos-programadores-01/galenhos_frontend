import { computed, Injectable, Injector, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';
import type {
  IAuthMenus,
  IMenu,
  IMenuPermiso,
  IUserProfile,
} from '../../../compartido/tipos/tipos';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly TOKEN_KEY = 'galenos.accessToken';
  private readonly USERNAME_KEY = 'galenos.username';
  private readonly MENUS_KEY = 'galenos.menus';
  private readonly PERMISOS_KEY = 'galenos.permisos';
  private readonly PROFILE_KEY = 'galenos.profile';

  readonly isAuthenticated = signal<boolean>(!!this.getToken());
  readonly username = signal<string | null>(this.getStoredUsername());
  readonly menus = signal<IMenu[]>(this.getStoredMenus());
  readonly permisos = signal<IMenuPermiso[]>(this.getStoredPermisos());
  readonly userProfile = signal<IUserProfile | null>(this.getStoredProfile());

  readonly fotoUrl = computed<string | null>(() => {
    const profile = this.userProfile();
    if (!profile?.foto) return null;
    const foto = profile.foto.trim();
    if (!foto) return null;
    if (
      foto.startsWith('data:image/') ||
      foto.startsWith('http://') ||
      foto.startsWith('https://')
    ) {
      return foto;
    }
    return `data:image/jpeg;base64,${foto}`;
  });

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getIdEmpleado(): number {
    const token = this.getToken();
    if (!token) return 0;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.idEmpleado || 0;
    } catch {
      return 0;
    }
  }

  getStoredUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  getStoredMenus(): IMenu[] {
    const data = localStorage.getItem(this.MENUS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getStoredPermisos(): IMenuPermiso[] {
    const data = localStorage.getItem(this.PERMISOS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getStoredProfile(): IUserProfile | null {
    const data = localStorage.getItem(this.PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  }

  setSession(token: string, username: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USERNAME_KEY, username);
    this.isAuthenticated.set(true);
    this.username.set(username);
    this.cargarPerfil();
  }

  setProfile(profile: IUserProfile): void {
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
    this.userProfile.set(profile);
  }

  async cargarPerfil(): Promise<IUserProfile | null> {
    if (!this.getToken()) return null;
    try {
      const api = this.injector.get(ApiClientService);
      const profile = await api.request<IUserProfile>('/api/v1/auth/perfil', {
        method: 'GET',
      });
      if (profile) {
        this.setProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('No se pudo cargar el perfil del operador:', err);
    }
    return null;
  }

  setMenus(authMenus: IAuthMenus): void {
    localStorage.setItem(this.MENUS_KEY, JSON.stringify(authMenus.menus));
    localStorage.setItem(this.PERMISOS_KEY, JSON.stringify(authMenus.permisos));
    this.menus.set(authMenus.menus);
    this.permisos.set(authMenus.permisos);
  }

  clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
    localStorage.removeItem(this.MENUS_KEY);
    localStorage.removeItem(this.PERMISOS_KEY);
    localStorage.removeItem(this.PROFILE_KEY);
    this.isAuthenticated.set(false);
    this.username.set(null);
    this.userProfile.set(null);
    this.menus.set([]);
    this.permisos.set([]);
  }

  loginDemo(): void {
    this.setSession('demo-token', 'demo');
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  hasPermission(
    action: 'agregar' | 'modificar' | 'eliminar' | 'ver' | 'imprimir',
    path?: string,
  ): boolean {
    const targetPath = path || this.router.url;

    const currentPermiso = this.permisos().find(
      (p) => targetPath.includes(p.claveWeb) && p.claveWeb !== '',
    );

    if (!currentPermiso) {
      return false;
    }

    if (action === 'ver' || action === 'imprimir') {
      return (
        (currentPermiso as unknown as Record<string, unknown>)[action] ===
          true ||
        currentPermiso.agregar ||
        currentPermiso.modificar ||
        currentPermiso.eliminar
      );
    }

    return (
      (currentPermiso as unknown as Record<string, unknown>)[action] === true
    );
  }
}
