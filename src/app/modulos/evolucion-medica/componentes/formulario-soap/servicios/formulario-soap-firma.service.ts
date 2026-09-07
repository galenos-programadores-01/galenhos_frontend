import { Injectable, inject } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { MaestrosApiService } from '../../../../../compartido/api/maestros.api.service';
import { ApiClientService } from '../../../../../compartido/api-client/api-client.service';
import type {
  IPacienteDatosAdicionales,
  IUserProfile,
} from '../../../../../compartido/tipos/tipos';
import {
  type FirmaPeruConexion,
  type FirmaPeruResultado,
  iniciarFirmaDocumento,
} from '../../../../../compartido/utilidades/firma-peru.util';
import { AuthService } from '../../../../auth/aplicacion/auth.service';
import { PacientesApiService } from '../../../../pacientes/adaptadores/salida/http/pacientes.api.service';
import {
  type EvolucionMedicaPayload,
  EvolucionService,
  type PacienteItem,
  type RespuestaGuardadoEvolucion,
} from '../../../servicios/evolucion.service';
import { InterconsultaService } from '../../../servicios/interconsulta.service';
import {
  type SintomaSeleccionado,
  SintomaService,
} from '../../../servicios/sintoma.service';
import {
  construirPdfEvolucion,
  type DatosInstitucion,
  type EvolucionPdfData,
} from '../evolucion-pdf.util';

export interface ContextoFirmaEvolucion {
  soapForm: FormGroup;
  paciente: PacienteItem;
  fechaEvolucion: string;
  horaEvolucion: string;
  tipoAtencion: string;
  listaSintomas: SintomaSeleccionado[];
}

export interface AuditoriaEvolucionFirmada {
  fecha: string;
  hora: string;
  usuario: string;
  ipCliente: string;
  idEvolucion: number;
}

export interface ResultadoProcesoFirma {
  exito: boolean;
  uuidFirma?: string;
  respuestaGuardado?: AuditoriaEvolucionFirmada | null;
  mensajeError?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FormularioSoapFirmaService {
  private readonly apiClient = inject(ApiClientService);
  private readonly authService = inject(AuthService);
  private readonly pacientesApi = inject(PacientesApiService);
  private readonly interconsultaService = inject(InterconsultaService);
  private readonly sintomaService = inject(SintomaService);
  private readonly evolucionService = inject(EvolucionService);
  private readonly maestrosApi = inject(MaestrosApiService);

  async procesarFirmaDigital(
    contexto: ContextoFirmaEvolucion,
  ): Promise<ResultadoProcesoFirma> {
    const { paciente, soapForm, listaSintomas } = contexto;

    if (!this.authService.getToken()) {
      return {
        exito: false,
        mensajeError:
          'Su sesión ha expirado o no es válida. Por favor, vuelva a iniciar sesión antes de firmar.',
      };
    }

    let antecedentes = this.evolucionService.antecedentesActivos();
    if (antecedentes && paciente.idPaciente) {
      await this.pacientesApi
        .actualizarDatosAdicionales(paciente.idPaciente, antecedentes)
        .catch(() => null);
    }

    const [antecedentesApi, interconsultas, institucion, perfil] =
      await Promise.all([
        antecedentes
          ? Promise.resolve(antecedentes)
          : this.pacientesApi
              .obtenerDatosAdicionales(paciente.idPaciente)
              .catch(() => null),
        this.interconsultaService
          .listarPorAtencion(paciente.idRegAtencion)
          .catch(() => []),
        this.maestrosApi.getDatosInstitucion().catch(() => null),
        this.authService.cargarPerfil().catch(() => null),
      ]);
    antecedentes = antecedentesApi;

    const interconsultasMapeadas: EvolucionPdfData['interconsultas'] =
      interconsultas.map((interconsulta) => ({
        IdEspecialidad:
          interconsulta.IdEspecialidad || interconsulta.idEspecialidad,
        especialidad: `Especialidad #${interconsulta.IdEspecialidad || interconsulta.idEspecialidad || 0}`,
        motivo: interconsulta.motivo || '',
        estado: interconsulta.estado || '',
      }));

    const datosPdf = this.construirEvolucionPdfData(
      contexto,
      antecedentes,
      interconsultasMapeadas,
      perfil?.nombreCompleto,
    );

    const resultadoFirma = await this.ejecutarFirmaPeru(
      paciente.idRegAtencion,
      datosPdf,
      institucion,
      perfil,
    );

    if (!resultadoFirma?.firmado) {
      return {
        exito: false,
        mensajeError:
          'No se recibió el documento firmado. Verifique que completó la firma en Firma Perú.',
      };
    }

    try {
      const respuestaGuardado = await this.registrarEvolucionEnBaseDeDatos(
        contexto,
        resultadoFirma.uuid,
      );

      if (!respuestaGuardado?.idEvolucion) {
        return {
          exito: false,
          mensajeError:
            'El servidor no confirmó el identificador de la evolución médica.',
        };
      }

      await this.guardarSintomasDeAtencion(
        paciente.idRegAtencion,
        listaSintomas,
      );
      await this.guardarDiagnosticosDeAtencion(
        paciente.idRegAtencion,
        soapForm,
        respuestaGuardado.idEvolucion,
        paciente.idPaciente,
      );
      await this.guardarRecetaFarmacologica(paciente.idRegAtencion, soapForm);
      await this.guardarOrdenMedicaDestino(
        paciente,
        soapForm,
        perfil?.idEmpleado || 1,
      );

      const now = new Date();
      return {
        exito: true,
        uuidFirma: resultadoFirma.uuid,
        respuestaGuardado: {
          fecha: contexto.fechaEvolucion || now.toISOString().slice(0, 10),
          hora: contexto.horaEvolucion || now.toTimeString().slice(0, 8),
          usuario: perfil?.nombreCompleto || this.authService.username() || '',
          ipCliente: '127.0.0.1',
          idEvolucion: respuestaGuardado.idEvolucion,
        },
      };
    } catch (error) {
      console.error('Error al registrar evolución:', error);
      return {
        exito: false,
        mensajeError:
          error instanceof Error
            ? `Error al persistir evolución: ${error.message}`
            : 'Ocurrió un error al guardar la evolución en la base de datos.',
      };
    }
  }

  private async guardarSintomasDeAtencion(
    idRegAtencion: number,
    listaSintomas: SintomaSeleccionado[],
  ): Promise<void> {
    if (listaSintomas.length > 0) {
      await this.sintomaService
        .guardarSintomas(idRegAtencion, listaSintomas)
        .catch((error) => {
          console.error('Error al guardar síntomas de la atención:', error);
        });
    }
  }

  private async guardarDiagnosticosDeAtencion(
    idRegAtencion: number,
    soapForm: FormGroup,
    idEvolucion: number,
    idPaciente: number,
  ): Promise<void> {
    const diagnosticos = (soapForm.get('diagnosticos')?.value || []) as Array<{
      idDiagnostico?: number;
      cie10: string;
      descripcion?: string;
      tipo?: string;
    }>;

    for (const dx of diagnosticos) {
      if (dx?.cie10) {
        await this.apiClient
          .request('/api/v1/diagnosticos/atencion', {
            method: 'POST',
            body: JSON.stringify({
              idAtencion: idRegAtencion,
              idDiagnostico: dx.idDiagnostico || 0,
              codigoCIE10: dx.cie10,
              tipoDiagnostico: dx.tipo || 'P',
              idEvolucion: idEvolucion,
              idPaciente: idPaciente,
              idEpisodio: idPaciente,
            }),
          })
          .catch((error) => {
            console.error('Error al asociar diagnóstico a la atención:', error);
          });
      }
    }
  }

  private async guardarRecetaFarmacologica(
    idRegAtencion: number,
    soapForm: FormGroup,
  ): Promise<void> {
    const listaFarmacos = (soapForm.get('plan.farmacologico')?.value ||
      []) as Array<{
      idProducto?: number;
      medicamento?: string;
      codigo?: string;
      cantidad?: number;
      dosis?: string | number;
      unidad?: string;
      frecuencia?: string;
      via?: string;
      duracion?: string;
      precio?: number;
    }>;

    if (listaFarmacos.length === 0) return;

    await this.apiClient
      .request('/api/v1/ordenes', {
        method: 'POST',
        body: JSON.stringify({
          idRegAtencion,
          observacion: 'Receta generada en Evolución Médica',
          detalles: listaFarmacos.map((farmaco) => ({
            idProducto: Number(farmaco.idProducto) || 0,
            nombreProducto: farmaco.medicamento || '',
            codigo: farmaco.codigo || '',
            cantidad: Number(farmaco.cantidad) || 1,
            precio: Number(farmaco.precio) || 0,
            total:
              (Number(farmaco.precio) || 0) * (Number(farmaco.cantidad) || 1),
            indicaciones:
              `${farmaco.dosis || ''} ${farmaco.unidad || ''} - ${farmaco.via || ''} - ${farmaco.frecuencia || ''} - ${farmaco.duracion || ''}`.trim(),
          })),
        }),
      })
      .catch((error) => {
        console.error('Error al registrar orden médica de receta:', error);
      });
  }

  private async guardarOrdenMedicaDestino(
    paciente: PacienteItem,
    soapForm: FormGroup,
    idEmpleado: number,
  ): Promise<void> {
    const orden = soapForm.get('ordenesMedicas.orden')?.value as string;
    const detalle = soapForm.get('ordenesMedicas.detalle')?.value as string;
    if (!orden && !detalle) return;

    await this.apiClient
      .request('/api/v1/triaje/consulta', {
        method: 'POST',
        body: JSON.stringify({
          idAtencion: paciente.idRegAtencion,
          idPaciente: paciente.idPaciente,
          idEmpleado: idEmpleado || 1,
          observacion:
            `Orden médica: ${orden || 'Registrada'} - ${detalle || ''}`.trim(),
        }),
      })
      .catch(() => {});
  }

  private construirEvolucionPdfData(
    contexto: ContextoFirmaEvolucion,
    antecedentes: IPacienteDatosAdicionales | null,
    interconsultas: EvolucionPdfData['interconsultas'],
    nombreMedico?: string,
  ): EvolucionPdfData {
    const {
      paciente,
      soapForm,
      fechaEvolucion,
      horaEvolucion,
      tipoAtencion,
      listaSintomas,
    } = contexto;
    const valores = soapForm.value;

    return {
      paciente: {
        nombre: paciente.nombre,
        historia: paciente.historia,
        idRegAtencion: paciente.idRegAtencion,
        edad: paciente.edad,
        sexo: paciente.sexo,
        ubicacion: paciente.ubicacion,
        servicio: paciente.servicio || paciente.ubicacion,
        especialidad: paciente.especialidad || '',
        cama: paciente.cama,
        estado: paciente.estado,
      },
      cabecera: {
        fecha: fechaEvolucion,
        hora: horaEvolucion,
        medicoTratante:
          nombreMedico ||
          this.authService.nombreCompleto() ||
          this.authService.username() ||
          '',
        tipoAtencion,
        servicio: paciente.servicio || paciente.ubicacion,
        especialidad:
          paciente.especialidad ||
          this.authService.userProfile()?.especialidad ||
          '',
        dni: this.authService.userProfile()?.dni || '',
        colegiatura: this.authService.userProfile()?.colegiatura || '',
        rne: this.authService.userProfile()?.rne || '',
      },
      antecedentes,
      motivo: valores.motivo || {},
      subjetivo: valores.subjetivo || {},
      signosVitales: valores.signosVitales || {},
      examenFisico:
        (valores.examenFisico as EvolucionPdfData['examenFisico']) || [],
      evaluacion: valores.evaluacion || {},
      diagnosticos:
        (valores.diagnosticos as EvolucionPdfData['diagnosticos']) || [],
      evolucionLibre: valores.evolucionLibre || '',
      plan: (valores.plan as EvolucionPdfData['plan']) || {},
      interconsultas,
      sintomas: listaSintomas.map((s) => s.sintoma),
      ordenesMedicas: (valores.ordenesMedicas as Record<string, unknown>) || {},
    };
  }

  private async ejecutarFirmaPeru(
    idRegAtencion: number,
    datosPdf: EvolucionPdfData,
    institucion: {
      rucEess?: string;
      direccion?: string;
      telefono?: string;
      logoMinsa?: string;
      logoHospi?: string;
    } | null,
    perfil: IUserProfile | null,
  ): Promise<FirmaPeruResultado | null> {
    const datosInstitucion: DatosInstitucion | null = institucion
      ? {
          rucEess: institucion.rucEess,
          direccion: institucion.direccion,
          telefono: institucion.telefono,
          logoMinsa: institucion.logoMinsa,
        }
      : null;

    const fechaImpresion = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const documentoPdf = await construirPdfEvolucion(
      datosPdf,
      datosInstitucion,
      this.authService.username() ?? '',
      fechaImpresion,
    );

    if (!documentoPdf) return null;

    const conexionFirma: FirmaPeruConexion = {
      baseUrl: this.apiClient.getApiBaseUrl(),
      token: this.authService.getToken(),
    };

    const partesCargo: string[] = [];
    if (perfil?.nombreCompleto) {
      partesCargo.push(`Médico ${perfil.nombreCompleto}`);
    } else if (this.authService.username()) {
      partesCargo.push(`Médico ${this.authService.username()}`);
    }
    if (perfil?.colegiatura) {
      partesCargo.push(`Nro. Colegiatura: ${perfil.colegiatura}`);
    }
    if (perfil?.rne) {
      partesCargo.push(`Nro. RNE: ${perfil.rne}`);
    }

    const cargoFirma =
      partesCargo.length > 0 ? partesCargo.join(' - ') : 'Médico Tratante';

    return iniciarFirmaDocumento(
      {
        blob: documentoPdf.output('blob'),
        nombre: `EVOLUCION_${idRegAtencion}.pdf`,
      },
      conexionFirma,
      {
        motivo: 'Soy el Autor',
        rol: cargoFirma,
        logoPngBase64:
          institucion?.logoHospi || institucion?.logoMinsa || undefined,
        positionX: 430,
        positionY: 10,
      },
    );
  }

  private async registrarEvolucionEnBaseDeDatos(
    contexto: ContextoFirmaEvolucion,
    uuidFirma?: string,
  ): Promise<RespuestaGuardadoEvolucion> {
    const { paciente, soapForm } = contexto;
    const valoresFormulario = soapForm.value;
    const datosSignosVitales = valoresFormulario.signosVitales || {};
    const listaExamenFisico = Array.isArray(valoresFormulario.examenFisico)
      ? valoresFormulario.examenFisico
      : [];
    const indicacionesGenerales =
      valoresFormulario.plan?.indicacionesGenerales || {};

    let sistolica: number | null = null;
    let diastolica: number | null = null;
    if (typeof datosSignosVitales.presionArterial === 'string') {
      const partes = datosSignosVitales.presionArterial.split('/');
      if (partes.length === 2) {
        sistolica = Number(partes[0].trim()) || null;
        diastolica = Number(partes[1].trim()) || null;
      }
    }

    const obtenerHallazgo = (idx: number): string | null => {
      const item = listaExamenFisico[idx];
      return item && typeof item === 'object' && 'hallazgo' in item
        ? (item.hallazgo as string) || null
        : null;
    };

    const estadoClinicoTexto =
      soapForm.get('evaluacion.estadoClinico')?.value || '';
    let idEstadoClinico: number | null = null;
    if (estadoClinicoTexto === 'Mejoría') idEstadoClinico = 1;
    else if (estadoClinicoTexto === 'Estacionario') idEstadoClinico = 2;
    else if (estadoClinicoTexto === 'Desfavorable') idEstadoClinico = 3;

    const pronosticoTexto = soapForm.get('evaluacion.pronostico')?.value || '';
    let idPronostico: number | null = null;
    if (pronosticoTexto === 'Bueno') idPronostico = 1;
    else if (pronosticoTexto === 'Reservado') idPronostico = 2;
    else if (pronosticoTexto === 'Malo') idPronostico = 3;

    const payload: EvolucionMedicaPayload = {
      idAtencion: paciente.idRegAtencion,
      idPaciente: paciente.idPaciente,
      idMedico: 0,
      motivo:
        (soapForm.get('motivo')?.value as { descripcion?: string })
          ?.descripcion || null,
      motivoConsulta:
        (soapForm.get('motivo')?.value as { descripcion?: string })
          ?.descripcion || null,
      subjetivo:
        (
          soapForm.get('subjetivo')?.value as {
            evolucionSintomas?: string;
          }
        )?.evolucionSintomas || null,
      escalaDolor: Number(soapForm.get('subjetivo.escalaDolor')?.value) || 0,
      glasgow: null,
      paSistolica: sistolica,
      paDiastolica: diastolica,
      frecuenciaCardiaca: Number(datosSignosVitales.frecuenciaCardiaca) || null,
      frecuenciaRespiratoria:
        Number(datosSignosVitales.frecuenciaRespiratoria) || null,
      temperatura: Number(datosSignosVitales.temperatura) || null,
      saturacionOxigeno: Number(datosSignosVitales.saturacionOxigeno) || null,
      peso: Number(datosSignosVitales.peso) || null,
      talla: Number(datosSignosVitales.talla) || null,
      imc:
        datosSignosVitales.imc && datosSignosVitales.imc !== '—'
          ? Number(datosSignosVitales.imc)
          : null,
      glicemia: Number(datosSignosVitales.glucemia) || null,
      examenFisicoGeneral: obtenerHallazgo(0),
      examenFisicoPiel: obtenerHallazgo(1),
      examenFisicoCabezaCuello: obtenerHallazgo(2),
      examenFisicoToraxPulmon: obtenerHallazgo(3),
      examenFisicoCorazon: obtenerHallazgo(4),
      examenFisicoAbdomen: obtenerHallazgo(5),
      examenFisicoGenitourinario: obtenerHallazgo(6),
      examenFisicoExtremidadesOsteomuscular: obtenerHallazgo(7),
      examenFisicoNeurologicoMental: obtenerHallazgo(8),
      idEstadoClinico,
      idPronostico,
      indicacionDieta: indicacionesGenerales.dieta || null,
      indicacionReposo: indicacionesGenerales.reposo || null,
      indicacionHidratacion: indicacionesGenerales.hidratacion || null,
      indicacionOxigeno: indicacionesGenerales.oxigeno || null,
      indicacionRestriccion: indicacionesGenerales.restricciones || null,
      sugerencia: valoresFormulario.evolucionLibre || null,
      usuarioCreacion: 0,
      estadoRegistro: 1,
      estadoFirma: 1,
      ubicacionArchivo: uuidFirma
        ? `/ftp/evoluciones/${paciente.idRegAtencion}/${uuidFirma}.pdf`
        : null,
    };

    return await this.evolucionService.guardarEvolucionMedica(payload);
  }
}
