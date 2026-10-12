import { DOCUMENT, effect, Injectable, inject, signal } from '@angular/core';

const CLAVE_TEMA = 'galenos.tema';

export type PreferenciaTema = 'claro' | 'oscuro';

/**
 * Estado global de apariencia. Alterna la clase `.dark` sobre `<html>`, que es
 * lo que dispara el variant `dark:` de Tailwind (ver styles.css) y el
 * `color-scheme` para los controles nativos.
 *
 * Sin preferencia guardada se sigue la preferencia del sistema operativo. La
 * preferencia solo se persiste cuando el usuario alterna el botón, de modo que
 * mientras no elija nada la app continúa siguiendo al sistema.
 */
@Injectable({
  providedIn: 'root',
})
export class TemaService {
  private readonly document = inject(DOCUMENT);

  /** `true` = modo oscuro. */
  readonly oscuro = signal<boolean>(leerPreferencia(this.document));

  constructor() {
    // Refleja el estado en el <html>. No persiste: solo `alternar` lo hace.
    effect(() => {
      this.document.documentElement.classList.toggle('dark', this.oscuro());
    });
  }

  alternar(): void {
    const nuevoValor = !this.oscuro();
    this.oscuro.set(nuevoValor);
    this.persistir(nuevoValor);
  }

  /** Vuelve a seguir la preferencia del sistema operativo. */
  seguirSistema(): void {
    const consulta = this.document.defaultView?.matchMedia?.(
      '(prefers-color-scheme: dark)',
    );
    this.oscuro.set(consulta?.matches ?? false);
    this.persistir(this.oscuro());
  }

  private persistir(oscuro: boolean): void {
    try {
      localStorage.setItem(CLAVE_TEMA, oscuro ? 'oscuro' : 'claro');
    } catch {
      // Modo privado o storage bloqueado: el tema igual funciona en memoria.
    }
  }
}

/**
 * Determina el tema inicial. `src/index.html` aplica la misma regla en un
 * script inline para evitar el parpadeo antes de que arranque Angular, así que
 * ambas lecturas deben coincidir.
 */
function leerPreferencia(documento: Document): boolean {
  let guardada: string | null = null;
  try {
    guardada = localStorage.getItem(CLAVE_TEMA);
  } catch {
    guardada = null;
  }

  if (guardada === 'oscuro') return true;
  if (guardada === 'claro') return false;

  const consulta = documento.defaultView?.matchMedia?.(
    '(prefers-color-scheme: dark)',
  );
  return consulta?.matches ?? false;
}
