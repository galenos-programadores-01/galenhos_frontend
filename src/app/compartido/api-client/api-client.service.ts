import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../modulos/auth/aplicacion/auth.service';
import type { IApiErrorPayload } from '../tipos/tipos';

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface ApiEnvelope<TipoRespuesta> {
  success: boolean;
  data?: TipoRespuesta;
  error?: IApiErrorPayload;
}

@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private readonly authService = inject(AuthService);
  private readonly API_BASE_URL_KEY = 'galenos.apiBaseUrl';

  getApiBaseUrl(): string {
    const savedUrl = localStorage.getItem(this.API_BASE_URL_KEY);
    if (savedUrl) {
      return savedUrl;
    }

    const hostname = window.location.hostname;
    return `http://${hostname}:8080`;
  }

  setApiBaseUrl(url: string): void {
    let cleanUrl = url.trim();
    while (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    localStorage.setItem(this.API_BASE_URL_KEY, cleanUrl);
  }

  async request<TipoRespuesta>(
    path: string,
    options: RequestInit = {},
    requiresAuth = true,
    timeoutMs = 60000,
  ): Promise<TipoRespuesta> {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body) headers.set('Content-Type', 'application/json');

    if (requiresAuth) {
      const token = this.authService.getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.getApiBaseUrl()}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      throw new ApiRequestError(
        'NETWORK_ERROR',
        'No se pudo conectar con el servidor. Verifique la URL configurada y su conexión.',
        0,
      );
    }

    const envelope: ApiEnvelope<TipoRespuesta> = await response
      .json()
      .catch(() => ({
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'La respuesta del servidor no es válida.',
        },
      }));
    clearTimeout(timer);

    if (!response.ok || !envelope.success) {
      if (response.status === 401 && requiresAuth) {
        this.authService.logout();
      }
      throw new ApiRequestError(
        envelope.error?.code ?? 'UNKNOWN_ERROR',
        envelope.error?.message ?? 'Ocurrió un error inesperado.',
        response.status,
      );
    }

    return envelope.data as TipoRespuesta;
  }
}
