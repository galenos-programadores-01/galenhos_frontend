import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiRequestError } from '../../../../../../compartido/api-client/api-client.service';
import { MonitorSignosVitalesComponent } from '../../../../../../compartido/ui/monitor-signos-vitales/monitor-signos-vitales.component';
import { TypewriterTextComponent } from '../../../../../../compartido/ui/typewriter-text/typewriter-text.component';
import { AuthService } from '../../../../aplicacion/auth.service';
import { AuthApiService } from '../../../salida/http/auth.api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    TypewriterTextComponent,
    MonitorSignosVitalesComponent,
  ],
  templateUrl: './login.component.html',
  styles: [
    `
    .slideshow-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0;
      animation: slideFade 20s infinite ease-in-out;
    }
    .slideshow-bg:nth-child(1) { animation-delay: 0s; }
    .slideshow-bg:nth-child(2) { animation-delay: 6s; }
    .slideshow-bg:nth-child(3) { animation-delay: 12s; }
    .slideshow-bg:nth-child(4) { animation-delay: 18s; }

    @keyframes slideFade {
      0% { opacity: 0; transform: scale(1.05); }
      10% { opacity: 1; }
      25% { opacity: 1; }
      35% { opacity: 0; transform: scale(1); }
      100% { opacity: 0; transform: scale(1); }
    }
  `,
  ],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  user = '';
  pass = '';
  error = '';
  loading = false;
  showPassword = false;

  readonly heroTexts = [
    'Para médicos y especialistas.',
    'Gestión clínica integral.',
    'Para todo el equipo de salud.',
    'Innovación en cada consulta.',
    'Para nuestro aliado en Seguridad.',
    'El futuro de la atención médica en tus manos.',
  ];

  async handleLogin() {
    if (!this.user || !this.pass) {
      this.error = 'Ingrese usuario y contraseña.';
      return;
    }

    this.error = '';
    this.loading = true;

    try {
      const response = await this.authApi.login(this.user, this.pass);
      this.authService.setSession(response.accessToken, this.user);
      const authMenus = await this.authApi.getMenus();
      this.authService.setMenus(authMenus);
      this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      if (
        err instanceof ApiRequestError &&
        err.code === 'INVALID_CREDENTIALS'
      ) {
        this.error = 'Usuario o contraseña incorrectos.';
      } else if (err instanceof ApiRequestError && err.status === 0) {
        this.error =
          'No se pudo conectar con el servidor. Verifique la URL de la API.';
      } else if (err instanceof ApiRequestError) {
        this.error = err.message;
      } else {
        this.error = 'Ocurrió un error inesperado.';
      }
    } finally {
      this.loading = false;
    }
  }
}
