import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaestrosApiService } from '../../../../compartido/api/maestros.api.service';
import { ApiClientService } from '../../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../compartido/componentes/tabla/tabla.component';
import type { IPacienteDatosAdicionales } from '../../../../compartido/tipos/tipos';
import {
  BuscadorRangoFechas,
  type CriteriosBusqueda,
} from '../../../../compartido/ui/buscador-rango-fechas/buscador-rango-fechas';
import { PaginacionComponent } from '../../../../compartido/ui/paginacion/paginacion';
import { AuthService } from '../../../auth/aplicacion/auth.service';
import { PacientesApiService } from '../../../pacientes/adaptadores/salida/http/pacientes.api.service';
import {
  type EvolucionFirma,
  EvolucionService,
  type PacienteItem,
} from '../../servicios/evolucion.service';
import { SintomaService } from '../../servicios/sintoma.service';
import {
  construirPdfEvolucion,
  type DatosInstitucion,
  type EvolucionPdfData,
} from '../formulario-soap/evolucion-pdf.util';
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
  public readonly evolucionService = inject(EvolucionService);
  private readonly apiClient = inject(ApiClientService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly authService = inject(AuthService);
  private readonly pacientesApi = inject(PacientesApiService);
  private readonly sintomaService = inject(SintomaService);

  public readonly evolucionesPaciente = signal<EvolucionFirma[]>([]);
  public readonly evolucionesCargando = signal<boolean>(false);
  public readonly evolucionDetalle = signal<
    (EvolucionFirma & Record<string, unknown>) | null
  >(null);

  public readonly columnasEvoluciones: ColumnaTabla[] = [
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

  async verEvolucion(evolucion: EvolucionFirma): Promise<void> {
    let estadoTexto = 'Pendiente';
    if (evolucion.estado === 1) {
      estadoTexto = 'Firmado';
    } else if (evolucion.estado === 0) {
      estadoTexto = 'Anulada';
    }

    const medicoTratante =
      evolucion.medicoNombre ||
      (evolucion.idEmpleadoRegistra
        ? `Médico #${evolucion.idEmpleadoRegistra}`
        : 'Médico tratante');

    const fallbackDetalle: Record<string, unknown> = {
      cabecera: {
        numeroEvolucion: evolucion.idFirma,
        medicoTratante,
        fecha: evolucion.fechaRegistro,
        estado: estadoTexto,
      },
      motivo: {
        descripcion: evolucion.nombreDocumento || 'Evolución Médica',
      },
    };

    const decodificada =
      this.evolucionService.decodificarEvolucion(evolucion.dataB64) ??
      fallbackDetalle;

    const paciente = this.evolucionService.activePatient();
    let antecedentes = decodificada.antecedentes as
      | IPacienteDatosAdicionales
      | undefined;

    const tieneDatosAntecedentes =
      antecedentes &&
      Boolean(
        antecedentes.antecedQuirurgico?.trim() ||
          antecedentes.antecedPatologico?.trim() ||
          antecedentes.antecedObstetrico?.trim() ||
          antecedentes.antecedAlergico?.trim() ||
          antecedentes.antecedFamiliar?.trim() ||
          antecedentes.antecedentes?.trim() ||
          antecedentes.otrosComorbilidad?.trim() ||
          antecedentes.hipertensionArterial === 1 ||
          antecedentes.anemia === 1 ||
          antecedentes.obesidad === 1 ||
          antecedentes.tuberculosis === 1 ||
          antecedentes.higadoGraso === 1 ||
          antecedentes.fumaActualmente === 1 ||
          antecedentes.dislipidemia === 1 ||
          antecedentes.enfTiroidea === 1 ||
          antecedentes.cancer === 1,
      );

    if (!tieneDatosAntecedentes && paciente?.idPaciente) {
      antecedentes =
        (await this.pacientesApi
          .obtenerDatosAdicionales(paciente.idPaciente)
          .catch(() => null)) ?? undefined;
    }

    let sintomas = (decodificada.sintomas as string[] | undefined) ?? [];
    if (
      sintomas.length === 0 &&
      (evolucion.idRegAtencion || paciente?.idRegAtencion)
    ) {
      const idAtencion =
        evolucion.idRegAtencion || paciente?.idRegAtencion || 0;
      const sintomasApi = await this.sintomaService
        .obtenerSintomas(idAtencion)
        .catch(() => []);
      if (sintomasApi.length > 0) {
        sintomas = sintomasApi.map((s) => s.sintoma);
      }
    }

    const pacienteActual = this.evolucionService.activePatient();
    const pacienteCombinado = {
      ...(decodificada.paciente && typeof decodificada.paciente === 'object'
        ? (decodificada.paciente as Record<string, unknown>)
        : {}),
      nombre: pacienteActual?.nombre || '',
      historia: pacienteActual?.historia || '',
      servicio:
        pacienteActual?.servicio ||
        (decodificada.cabecera as Record<string, unknown>)?.servicio ||
        pacienteActual?.ubicacion ||
        '',
      especialidad:
        pacienteActual?.especialidad ||
        (decodificada.cabecera as Record<string, unknown>)?.especialidad ||
        '',
      cama: pacienteActual?.cama || '',
      edad: pacienteActual?.edad || '',
      sexo: pacienteActual?.sexo || '',
    };

    const cabeceraCombinada = {
      ...(decodificada.cabecera && typeof decodificada.cabecera === 'object'
        ? (decodificada.cabecera as Record<string, unknown>)
        : {}),
      numeroEvolucion:
        (decodificada.cabecera as Record<string, unknown>)?.numeroEvolucion ||
        evolucion.idFirma,
      medicoTratante:
        (decodificada.cabecera as Record<string, unknown>)?.medicoTratante ||
        medicoTratante,
      fecha:
        (decodificada.cabecera as Record<string, unknown>)?.fecha ||
        evolucion.fechaRegistro,
      estado:
        (decodificada.cabecera as Record<string, unknown>)?.estado ||
        estadoTexto,
      servicio:
        (decodificada.cabecera as Record<string, unknown>)?.servicio ||
        pacienteActual?.servicio ||
        pacienteActual?.ubicacion ||
        '',
      especialidad:
        (decodificada.cabecera as Record<string, unknown>)?.especialidad ||
        pacienteActual?.especialidad ||
        '',
    };

    this.evolucionDetalle.set({
      ...evolucion,
      ...decodificada,
      paciente: pacienteCombinado,
      cabecera: cabeceraCombinada,
      antecedentes: antecedentes ?? null,
      sintomas: sintomas.length > 0 ? sintomas : decodificada.sintomas,
    } as EvolucionFirma & Record<string, unknown>);
  }

  cerrarDetalle(): void {
    this.evolucionDetalle.set(null);
  }

  async descargarPdfEvolucion(): Promise<void> {
    const detalle = this.evolucionDetalle();
    const paciente = this.evolucionService.activePatient();
    if (!detalle || !paciente) return;

    const cabecera = (detalle.cabecera as Record<string, unknown>) || {};
    const uuidFirma =
      (cabecera.firmaDni as string) || (detalle.firmaDigital as string) || '';

    if (uuidFirma && !uuidFirma.startsWith('data:')) {
      const descargado = await this.descargarPdfFirmadoRemoto(
        uuidFirma,
        paciente.historia || paciente.idRegAtencion,
      );
      if (descargado) return;
    }

    await this.generarYDescargarPdfCopia(detalle, paciente, cabecera);
  }

  private async descargarPdfFirmadoRemoto(
    uuidFirma: string,
    identificadorPaciente: string | number,
  ): Promise<boolean> {
    try {
      const baseUrl = this.apiClient.getApiBaseUrl();
      const urlDescarga = `${baseUrl}/api/v1/firmaperu/documentos/${uuidFirma}/firmado`;
      const token = localStorage.getItem('galenos.accessToken');
      const respuesta = await fetch(urlDescarga, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (respuesta.ok) {
        const blobFirmado = await respuesta.blob();
        this.descargarBlob(
          blobFirmado,
          `Evolucion_${identificadorPaciente}_firmada.pdf`,
        );
        return true;
      }
    } catch (error) {
      console.warn(
        'No se pudo obtener el PDF firmado del servidor, generando copia:',
        error,
      );
    }
    return false;
  }

  private async generarYDescargarPdfCopia(
    detalle: EvolucionFirma & Record<string, unknown>,
    paciente: PacienteItem,
    cabecera: Record<string, unknown>,
  ): Promise<void> {
    const perfil = this.authService.userProfile();
    const antecedentesFinal =
      (detalle.antecedentes as IPacienteDatosAdicionales) ??
      (paciente.idPaciente
        ? await this.pacientesApi
            .obtenerDatosAdicionales(paciente.idPaciente)
            .catch(() => null)
        : null);

    const planDetalle = (detalle.plan as EvolucionPdfData['plan']) || {};
    const interconsultasDetalle =
      (detalle.interconsultas as EvolucionPdfData['interconsultas']) ||
      (Array.isArray(planDetalle.interconsultas)
        ? (planDetalle.interconsultas as EvolucionPdfData['interconsultas'])
        : []);

    const datosPdf: EvolucionPdfData = {
      paciente: {
        nombre: paciente.nombre,
        historia: paciente.historia,
        idRegAtencion: paciente.idRegAtencion,
        edad: paciente.edad,
        sexo: paciente.sexo,
        ubicacion: paciente.ubicacion,
        servicio:
          ((detalle.paciente as Record<string, unknown>)?.servicio as string) ||
          paciente.servicio ||
          paciente.ubicacion,
        especialidad:
          ((detalle.paciente as Record<string, unknown>)
            ?.especialidad as string) ||
          paciente.especialidad ||
          '',
        cama: paciente.cama,
        estado: 'FIRMADO',
      },
      cabecera: {
        fecha: (cabecera.fecha as string) || '',
        hora: (cabecera.hora as string) || '',
        medicoTratante:
          (cabecera.medicoTratante as string) ||
          perfil?.nombreCompleto ||
          this.authService.username() ||
          '',
        tipoAtencion:
          (cabecera.tipoAtencion as string) ||
          paciente.servicio ||
          paciente.ubicacion ||
          'Atención Médica',
        servicio:
          (cabecera.servicio as string) ||
          ((detalle.paciente as Record<string, unknown>)?.servicio as string) ||
          paciente.servicio ||
          paciente.ubicacion,
        especialidad:
          (cabecera.especialidad as string) ||
          ((detalle.paciente as Record<string, unknown>)
            ?.especialidad as string) ||
          paciente.especialidad ||
          perfil?.especialidad ||
          '',
        dni: (cabecera.dni as string) || perfil?.dni || '',
        colegiatura:
          (cabecera.colegiatura as string) || perfil?.colegiatura || '',
        rne: (cabecera.rne as string) || perfil?.rne || '',
      },
      antecedentes: antecedentesFinal,
      motivo: (detalle.motivo as Record<string, unknown>) || {},
      subjetivo: (detalle.subjetivo as Record<string, unknown>) || {},
      signosVitales: (detalle.signosVitales as Record<string, unknown>) || {},
      examenFisico: Array.isArray(detalle.examenFisico)
        ? (detalle.examenFisico as EvolucionPdfData['examenFisico'])
        : [],
      evaluacion: (detalle.evaluacion as Record<string, unknown>) || {},
      diagnosticos: Array.isArray(detalle.diagnosticos)
        ? (detalle.diagnosticos as EvolucionPdfData['diagnosticos'])
        : [],
      evolucionLibre: (detalle.evolucionLibre as string) || '',
      plan: planDetalle,
      interconsultas: interconsultasDetalle,
      sintomas: Array.isArray(detalle.sintomas)
        ? (detalle.sintomas as string[])
        : [],
      ordenesMedicas: (detalle.ordenesMedicas as Record<string, unknown>) || {},
    };

    const institucion = (await this.maestrosApi
      .getDatosInstitucion()
      .catch(() => null)) as {
      rucEess?: string;
      nombre?: string;
      direccion?: string;
      telefono?: string;
      logoMinsa?: string;
      logoHospi?: string;
    } | null;

    const datosInstitucion: DatosInstitucion | null = institucion
      ? {
          rucEess: institucion.rucEess,
          direccion: institucion.direccion,
          telefono: institucion.telefono,
          logoMinsa: institucion.logoMinsa,
        }
      : null;

    const doc = await construirPdfEvolucion(
      datosPdf,
      datosInstitucion,
      datosPdf.cabecera.medicoTratante,
      new Date().toLocaleDateString('es-PE'),
    );

    if (doc) {
      doc.save(
        `Evolucion_${paciente.historia || paciente.idRegAtencion}_${detalle.idFirma || 'firmada'}.pdf`,
      );
    }
  }

  private descargarBlob(blob: Blob, nombre: string): void {
    const urlBlob = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = urlBlob;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(urlBlob);
  }

  obtenerMedico(evolucion: EvolucionFirma): string {
    if (evolucion.medicoNombre && evolucion.medicoNombre.trim().length > 0) {
      return evolucion.medicoNombre.trim().toUpperCase();
    }
    const decodificada = this.evolucionService.decodificarEvolucion(
      evolucion.dataB64,
    );
    const medicoCabecera = (
      decodificada as { cabecera?: { medicoTratante?: string } }
    )?.cabecera?.medicoTratante;
    if (medicoCabecera && medicoCabecera.trim().length > 0) {
      return medicoCabecera.trim().toUpperCase();
    }
    if (evolucion.idEmpleadoRegistra) {
      return `Médico #${evolucion.idEmpleadoRegistra}`;
    }
    return 'Médico tratante';
  }

  obtenerNumero(evolucion: EvolucionFirma, indice: number): string {
    const decodificada = this.evolucionService.decodificarEvolucion(
      evolucion.dataB64,
    );
    const cabecera = (
      decodificada as {
        cabecera?: { numeroEvolucion?: number | string };
      }
    )?.cabecera;

    if (cabecera?.numeroEvolucion) {
      return `#${cabecera.numeroEvolucion}`;
    }
    if (evolucion.idFirma > 0) {
      return `#${evolucion.idFirma}`;
    }
    return `#${indice + 1}`;
  }

  obtenerFechaHora(evolucion: EvolucionFirma): { fecha: string; hora: string } {
    const decodificada = this.evolucionService.decodificarEvolucion(
      evolucion.dataB64,
    );
    const cabecera = (
      decodificada as {
        cabecera?: { fecha?: string; hora?: string };
      }
    )?.cabecera;

    if (cabecera?.fecha && cabecera?.hora) {
      let fechaFormateada = cabecera.fecha;
      if (fechaFormateada.includes('-')) {
        const partes = fechaFormateada.split('-');
        if (partes.length === 3) {
          fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
      }
      return {
        fecha: fechaFormateada,
        hora: cabecera.hora,
      };
    }

    if (evolucion.fechaRegistro) {
      const fechaParseada = new Date(evolucion.fechaRegistro);
      if (!Number.isNaN(fechaParseada.getTime())) {
        return {
          fecha: fechaParseada.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          hora: fechaParseada.toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
        };
      }
    }

    return { fecha: '—', hora: '—' };
  }

  iniciarNuevaEvolucion(): void {
    const paciente = this.evolucionService.activePatient();
    if (!paciente?.idRegAtencion) {
      return;
    }
    this.evolucionService.setViewMode('form');
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
