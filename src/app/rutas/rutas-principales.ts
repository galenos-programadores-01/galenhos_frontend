import type { Routes } from '@angular/router';
import { ContenedorPrincipal } from '../compartido/ui/contenedor-principal/contenedor-principal';
import { PaginaConstruccionComponent } from '../compartido/ui/pagina-construccion/pagina-construccion';
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
import { PrimeraAtencionComponent } from '../modulos/primera-atencion/adaptadores/entrada/ui/paginas/primera-atencion.component';

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
        loadComponent: () =>
          import(
            '../modulos/dashboard/adaptadores/entrada/ui/paginas/dashboard.component'
          ).then((m) => m.DashboardComponent),
        data: { title: 'Dashboard' },
      },
      {
        path: 'pacientes',
        loadComponent: () =>
          import(
            '../modulos/pacientes/adaptadores/entrada/ui/paginas/pacientes-lista/pacientes-lista.component'
          ).then((m) => m.PacientesListaComponent),
        data: { title: 'Pacientes' },
      },
      {
        path: 'citas',
        loadComponent: () =>
          import(
            '../modulos/citas/adaptadores/entrada/ui/paginas/citas.component'
          ).then((m) => m.CitasComponent),
        data: { title: 'Citas' },
      },
      {
        path: 'triajes',
        loadComponent: () =>
          import(
            '../modulos/triaje/adaptadores/entrada/ui/paginas/triaje-consulta/triaje-consulta.component'
          ).then((m) => m.TriajeConsultaComponent),
        data: { title: 'Triaje Consulta Externa' },
      },
      {
        path: 'emergencia_triaje',
        loadComponent: () =>
          import(
            '../modulos/triaje/adaptadores/entrada/ui/paginas/triaje/triaje.component'
          ).then((m) => m.TriajeComponent),
        data: { title: 'Triaje Emergencia' },
      },
      {
        path: 'TriajeObstetrico',
        loadComponent: () =>
          import(
            '../modulos/triaje-obstetrico/adaptadores/entrada/ui/paginas/triaje-obstetrico/triaje-obstetrico.component'
          ).then((m) => m.TriajeObstetricoComponent),
        data: { title: 'Triaje Obstetrico' },
      },
      {
        path: 'triaje-obstetrico-consulta',
        loadComponent: () =>
          import(
            '../modulos/triaje-obstetrico/adaptadores/entrada/ui/paginas/triaje-obstetrico-consulta/triaje-obstetrico-consulta.component'
          ).then((m) => m.TriajeObstetricoConsultaComponent),
        data: { title: 'Triaje Obstetrico Consulta' },
      },
      {
        path: 'admisionemergencia',
        loadComponent: () =>
          import(
            '../modulos/admisiones/adaptadores/entrada/ui/paginas/admisiones.component'
          ).then((m) => m.AdmisionesComponent),
        data: { title: 'Admisiones' },
      },
      {
        path: 'primeraatencionemergencia',
        component: PrimeraAtencionComponent,
        data: { title: 'Primera Atención' },
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
        loadComponent: () =>
          import(
            '../modulos/configuracion/adaptadores/entrada/ui/paginas/configuracion.component'
          ).then((m) => m.ConfiguracionComponent),
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
        loadComponent: () =>
          import(
            '../modulos/dashrefcon/adaptadores/entrada/ui/paginas/dashrefcon.component'
          ).then((m) => m.DashrefconComponent),
        data: { title: 'Dashboard referencias y contrarreferencias' },
      },
      {
        path: 'refpaciente',
        loadComponent: () =>
          import(
            '../modulos/refpaciente/adaptadores/entrada/ui/paginas/refpaciente.component'
          ).then((m) => m.RefpacienteComponent),
        data: { title: 'Referencias por paciente' },
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
        path: 'BandejaRef',
        loadComponent: () =>
          import(
            '../modulos/bandeja-ref/adaptadores/entrada/ui/paginas/bandeja-ref.component'
          ).then((m) => m.BandejaRefComponent),
        data: { title: 'Bandeja de Referencias' },
      },
      {
        path: 'catalogos/bienes-insumos',
        loadComponent: () =>
          import(
            '../modulos/catalogos/bienes-insumos/adaptadores/entrada/ui/paginas/bienes-insumos-lista/bienes-insumos-lista.component'
          ).then((m) => m.BienesInsumosListaComponent),
        data: { title: 'Catálogo de Bienes e Insumos' },
      },
      {
        path: 'bienes-insumos',
        redirectTo: 'catalogos/bienes-insumos',
        pathMatch: 'full',
      },
      {
        path: 'CatalogoBienes',
        redirectTo: 'catalogos/bienes-insumos',
        pathMatch: 'full',
      },
      {
        path: 'catalogobienes',
        redirectTo: 'catalogos/bienes-insumos',
        pathMatch: 'full',
      },
      {
        path: 'catalogos/servicios',
        loadComponent: () =>
          import(
            '../modulos/catalogos/servicios/adaptadores/entrada/ui/paginas/servicios-lista/servicios-lista.component'
          ).then((m) => m.ServiciosListaComponent),
        data: { title: 'Catálogo de Servicios y Tarifario' },
      },
      {
        path: 'catalogo-servicios',
        redirectTo: 'catalogos/servicios',
        pathMatch: 'full',
      },
      {
        path: 'servicios',
        redirectTo: 'catalogos/servicios',
        pathMatch: 'full',
      },
      {
        path: 'FacturacionCatalogoServicios',
        redirectTo: 'catalogos/servicios',
        pathMatch: 'full',
      },
      {
        path: 'facturacioncatalogoservicios',
        redirectTo: 'catalogos/servicios',
        pathMatch: 'full',
      },
      {
        path: 'farmacia/disponibilidad',
        loadComponent: () =>
          import(
            '../modulos/farmacia-dashboard/adaptadores/entrada/ui/paginas/dashboard-disponibilidad/dashboard-disponibilidad.component'
          ).then((m) => m.DashboardDisponibilidadComponent),
        data: { title: 'Disponibilidad de Medicamentos y Farmacia' },
      },
      {
        path: 'farmacia',
        redirectTo: 'farmacia/disponibilidad',
        pathMatch: 'full',
      },
      {
        path: 'disponibilidad-medicamentos',
        redirectTo: 'farmacia/disponibilidad',
        pathMatch: 'full',
      },
      {
        path: 'DashFarm',
        redirectTo: 'farmacia/disponibilidad',
        pathMatch: 'full',
      },
      {
        path: 'dashfarm',
        redirectTo: 'farmacia/disponibilidad',
        pathMatch: 'full',
      },
      {
        path: 'Inventario',
        redirectTo: 'farmacia/disponibilidad',
        pathMatch: 'full',
      },
      {
        path: 'inventario',
        redirectTo: 'farmacia/disponibilidad',
        pathMatch: 'full',
      },
      {
        path: 'atencion-ce',
        loadComponent: () =>
          import(
            '../modulos/atencion-ce/adaptadores/entrada/ui/paginas/atencion-ce-cola/atencion-ce-cola.component'
          ).then((m) => m.AtencionCeColaComponent),
        data: { title: 'Atención Médica CE' },
      },
      {
        path: 'atencion-ce/:id',
        loadComponent: () =>
          import(
            '../modulos/atencion-ce/adaptadores/entrada/ui/paginas/atencion-ce-ficha/atencion-ce-ficha.component'
          ).then((m) => m.AtencionCeFichaComponent),
        data: { title: 'Ficha Médica CE' },
      },
      {
        path: 'consulta-externa',
        redirectTo: 'atencion-ce',
        pathMatch: 'full',
      },
      {
        path: 'atenciones',
        redirectTo: 'atencion-ce',
        pathMatch: 'full',
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
