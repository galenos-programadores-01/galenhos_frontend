import type { Routes } from '@angular/router';
import { ContenedorPrincipal } from '../compartido/ui/contenedor-principal/contenedor-principal';
import { PaginaConstruccionComponent } from '../compartido/ui/pagina-construccion/pagina-construccion';
import { AdmisionesComponent } from '../modulos/admisiones/adaptadores/entrada/ui/paginas/admisiones.component';
import { LoginComponent } from '../modulos/auth/adaptadores/entrada/ui/paginas/login.component';
import { authGuard, unauthGuard } from '../modulos/auth/aplicacion/auth.guard';
import { CitasComponent } from '../modulos/citas/adaptadores/entrada/ui/paginas/citas.component';
import { ConfiguracionComponent } from '../modulos/configuracion/adaptadores/entrada/ui/paginas/configuracion.component';
import { DashboardComponent } from '../modulos/dashboard/adaptadores/entrada/ui/paginas/dashboard.component';
import { DashrefconComponent } from '../modulos/dashrefcon/adaptadores/entrada/ui/paginas/dashrefcon.component';
import { PacientesListaComponent } from '../modulos/pacientes/adaptadores/entrada/ui/paginas/pacientes-lista/pacientes-lista.component';
import { TriajeComponent } from '../modulos/triaje/adaptadores/entrada/ui/paginas/triaje/triaje.component';
import { TriajeConsultaComponent } from '../modulos/triaje/adaptadores/entrada/ui/paginas/triaje-consulta/triaje-consulta.component';
import { TriajeObstetricoComponent } from '../modulos/triaje-obstetrico/adaptadores/entrada/ui/paginas/triaje-obstetrico/triaje-obstetrico.component';
import { TriajeObstetricoConsultaComponent } from '../modulos/triaje-obstetrico/adaptadores/entrada/ui/paginas/triaje-obstetrico-consulta/triaje-obstetrico-consulta.component';

export const rutasPrincipales: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [unauthGuard],
  },
  {
    path: '',
    component: ContenedorPrincipal,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { title: 'Dashboard' },
      },
      {
        path: 'pacientes',
        component: PacientesListaComponent,
        data: { title: 'Pacientes' },
      },
      { path: 'citas', component: CitasComponent, data: { title: 'Citas' } },
      {
        path: 'triajes',
        component: TriajeConsultaComponent,
        data: { title: 'Triaje Consulta Externa' },
      },
      {
        path: 'emergencia_triaje',
        component: TriajeComponent,
        data: { title: 'Triaje Emergencia' },
      },
      {
        path: 'TriajeObstetrico',
        component: TriajeObstetricoComponent,
        data: { title: 'Triaje Obstetrico' },
      },
      {
        path: 'triaje-obstetrico-consulta',
        component: TriajeObstetricoConsultaComponent,
        data: { title: 'Triaje Obstetrico Consulta' },
      },
      {
        path: 'admisionemergencia',
        component: AdmisionesComponent,
        data: { title: 'Admisiones' },
      },
      {
        path: 'sis',
        loadComponent: () =>
          import(
            '../modulos/sis/adaptadores/entrada/ui/paginas/sis.component'
          ).then((m) => m.SisComponent),
        data: { title: 'SIS' },
      },
      {
        path: 'configuracion',
        component: ConfiguracionComponent,
        data: { title: 'Configuración' },
      },
      {
        path: 'hospitalizacion',
        loadComponent: () =>
          import(
            '../modulos/evolucion-medica/componentes/evolucion-raiz/evolucion-raiz'
          ).then((m) => m.EvolucionRaizComponent),
        data: { title: 'Evolución Médica' },
      },
      {
        path: 'dashrefcon',
        component: DashrefconComponent,
        data: { title: 'Dashboard referencias y contrarreferencias' },
      },
      {
        path: 'ListaEspera',
        loadComponent: () =>
          import(
            '../modulos/solicitud-qx/adaptadores/entrada/ui/paginas/lista-espera-qx.component'
          ).then((m) => m.ListaEsperaQxComponent),
        data: { title: 'Lista de Espera QX' },
      },
      {
        path: '**',
        component: PaginaConstruccionComponent,
        data: { title: 'Módulo en desarrollo' },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
