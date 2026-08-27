import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnaTemplateDirective } from '../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../compartido/componentes/tabla/tabla.component';
import {
  BuscadorRangoFechas,
  type CriteriosBusqueda,
} from '../../../../compartido/ui/buscador-rango-fechas/buscador-rango-fechas';
import { PaginacionComponent } from '../../../../compartido/ui/paginacion/paginacion';
import {
  type EvolucionFirma,
  EvolucionService,
} from '../../servicios/evolucion.service';
import { VerEvolucionComponent } from './ver-evolucion/ver-evolucion';

@Component({
  selector: 'app-bandeja-pacientes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BuscadorRangoFechas,
    PaginacionComponent,
    VerEvolucionComponent,
    TablaComponent,
    ColumnaTemplateDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bandeja-pacientes.html',
})
export class BandejaPacientesComponent {
  public evolucionService = inject(EvolucionService);

  public readonly evolucionesPaciente = signal<EvolucionFirma[]>([]);
  public readonly evolucionesCargando = signal<boolean>(false);
  public readonly evolucionDetalle = signal<
    (EvolucionFirma & Record<string, unknown>) | null
  >(null);

  columnasEvoluciones: ColumnaTabla[] = [
    {
      campo: 'numeroCustom',
      cabecera: 'N.º',
      alineacion: 'center',
      ancho: '80px',
    },
    {
      campo: 'fechaCustom',
      cabecera: 'Fecha de firma',
      alineacion: 'center',
      ancho: '140px',
    },
    { campo: 'medicoCustom', cabecera: 'Médico', alineacion: 'left' },
    { campo: 'documentoCustom', cabecera: 'Documento', alineacion: 'left' },
    { campo: 'archivoCustom', cabecera: 'Archivo', alineacion: 'left' },
    {
      campo: 'estadoCustom',
      cabecera: 'Estado',
      alineacion: 'center',
      ancho: '120px',
    },
    {
      campo: 'accionesCustom',
      cabecera: 'Acciones',
      alineacion: 'center',
      ancho: '140px',
    },
  ];

  constructor() {
    effect(() => {
      const paciente = this.evolucionService.activePatient();
      if (paciente) {
        this.cargarEvoluciones();
      }
    });
  }

  async cargarEvoluciones(): Promise<void> {
    const paciente = this.evolucionService.activePatient();
    if (!paciente?.idRegAtencion) return;

    this.evolucionesCargando.set(true);
    try {
      const evoluciones = await this.evolucionService.listarEvoluciones(
        paciente.idRegAtencion,
      );
      this.evolucionesPaciente.set(evoluciones);
    } finally {
      this.evolucionesCargando.set(false);
    }
  }

  verEvolucion(evolucion: EvolucionFirma): void {
    const decodificada = this.evolucionService.decodificarEvolucion(
      evolucion.dataB64,
    );
    if (!decodificada) return;
    this.evolucionDetalle.set({
      ...evolucion,
      ...decodificada,
    } as EvolucionFirma & Record<string, unknown>);
  }

  cerrarDetalle(): void {
    this.evolucionDetalle.set(null);
  }

  obtenerMedico(evolucion: EvolucionFirma): string {
    const decodificada = this.evolucionService.decodificarEvolucion(
      evolucion.dataB64,
    );
    return (
      (decodificada as { cabecera?: { medicoTratante?: string } })?.cabecera
        ?.medicoTratante || `Empleado #${evolucion.idEmpleadoRegistra}`
    );
  }

  onBuscar(criterios: CriteriosBusqueda) {
    this.evolucionService.patientSearch.set(criterios.filtro);
    this.evolucionService.fechaDesde.set(criterios.fechaDesde);
    this.evolucionService.fechaHasta.set(criterios.fechaHasta);
    this.evolucionService.cargarPacientes();
  }

  onLimpiar() {
    this.evolucionService.patientSearch.set('');
    this.evolucionService.fechaDesde.set('');
    this.evolucionService.fechaHasta.set('');
    this.evolucionService.cargarPacientes();
  }
}
