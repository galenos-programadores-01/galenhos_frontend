import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';
import {
  type FirmaPeruConexion,
  type FirmaPeruDocumento,
  type FirmaPeruResultado,
  iniciarFirmaDocumento,
  iniciarFirmaLote,
} from '../../../compartido/utilidades/firma-peru.util';
import { AuthService } from '../../auth/aplicacion/auth.service';
import {
  type DatosPdfDescansoMedico,
  type DatosPdfHojaInterconsulta,
  type DatosPdfOrdenImagenologia,
  type DatosPdfOrdenLaboratorio,
  type DatosPdfRecetaMedica,
  type DatosPdfResumenConsulta,
  generarDocumentoPdfDescansoMedico,
  generarDocumentoPdfHojaInterconsulta,
  generarDocumentoPdfOrdenImagenologia,
  generarDocumentoPdfOrdenLaboratorio,
  generarDocumentoPdfRecetaMedica,
  generarDocumentoPdfResumenConsulta,
  obtenerMetadatosFirmaPdf,
} from '../utilidades/pdf/historial-atencion-pdf.util';
import { obtenerDatosInstitucionCache } from '../utilidades/pdf/institucional-pdf.util';

export interface DocumentoAtencionFirmadoItem {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly nombreArchivo: string;
  readonly blob: Blob;
  readonly url: string;
  readonly tamanoBytes: number;
}

export interface DatosAtencionFirmaLote {
  readonly idAtencion: number;
  readonly nroHistoriaClinica: string | number;
  readonly datosAtencionMedica: DatosPdfResumenConsulta;
  readonly datosRecetaMedica: DatosPdfRecetaMedica;
  readonly datosOrdenLaboratorio: DatosPdfOrdenLaboratorio;
  readonly datosOrdenImagenologia: DatosPdfOrdenImagenologia;
  readonly datosHojaInterconsulta: DatosPdfHojaInterconsulta;
  readonly datosDescansoMedico?: DatosPdfDescansoMedico;
}

export interface ResultadoProcesoFirmaLote {
  readonly exito: boolean;
  readonly identificadorUnicoDocumento?: string;
  readonly documentosFirmados: readonly DocumentoAtencionFirmadoItem[];
  readonly mensajeError?: string;
}

export interface ResultadoProcesoFirmaReceta {
  readonly exito: boolean;
  readonly identificadorUnicoDocumento?: string;
  readonly documentoFirmadoBlob?: Blob;
  readonly mensajeError?: string;
}

interface ArchivoLoteRespuesta {
  readonly nombre: string;
  readonly tamano: number;
}

@Injectable({
  providedIn: 'root',
})
export class AtencionCeFirmaService {
  private readonly clienteApi = inject(ApiClientService);
  private readonly servicioAutenticacion = inject(AuthService);

  async firmarAtencionLoteCompleto(
    datos: DatosAtencionFirmaLote,
  ): Promise<ResultadoProcesoFirmaLote> {
    const tokenSesion = this.servicioAutenticacion.getToken();
    if (!tokenSesion) {
      return {
        exito: false,
        documentosFirmados: [],
        mensajeError:
          'Su sesión de usuario ha expirado. Por favor, vuelva a iniciar sesión antes de realizar la firma digital con DNI electrónico.',
      };
    }

    try {
      const docAtencionMedica = await generarDocumentoPdfResumenConsulta(
        datos.datosAtencionMedica,
      );
      const docRecetaMedica = await generarDocumentoPdfRecetaMedica(
        datos.datosRecetaMedica,
      );
      const docLaboratorio = await generarDocumentoPdfOrdenLaboratorio(
        datos.datosOrdenLaboratorio,
      );
      const docImagenologia = await generarDocumentoPdfOrdenImagenologia(
        datos.datosOrdenImagenologia,
      );
      const docInterconsulta = await generarDocumentoPdfHojaInterconsulta(
        datos.datosHojaInterconsulta,
      );

      const hcLimpia = String(datos.nroHistoriaClinica || '000000').trim();
      const idAtencionLimpio = String(datos.idAtencion || '0').trim();

      const nombreAtencion = `ATENCION_MEDICA_HC_${hcLimpia}_AT_${idAtencionLimpio}.pdf`;
      const nombreReceta = `RECETA_MEDICA_HC_${hcLimpia}_AT_${idAtencionLimpio}.pdf`;
      const nombreLaboratorio = `ORDEN_LABORATORIO_HC_${hcLimpia}_AT_${idAtencionLimpio}.pdf`;
      const nombreImagenologia = `ORDEN_IMAGENOLOGIA_HC_${hcLimpia}_AT_${idAtencionLimpio}.pdf`;
      const nombreInterconsulta = `HOJA_INTERCONSULTA_HC_${hcLimpia}_AT_${idAtencionLimpio}.pdf`;

      const blobAtencionOriginal = docAtencionMedica.output('blob');
      const blobRecetaOriginal = docRecetaMedica.output('blob');
      const blobLaboratorioOriginal = docLaboratorio.output('blob');
      const blobImagenologiaOriginal = docImagenologia.output('blob');
      const blobInterconsultaOriginal = docInterconsulta.output('blob');

      const listaDocumentosAFirmar: FirmaPeruDocumento[] = [
        { blob: blobAtencionOriginal, nombre: nombreAtencion },
        { blob: blobRecetaOriginal, nombre: nombreReceta },
        { blob: blobLaboratorioOriginal, nombre: nombreLaboratorio },
        { blob: blobImagenologiaOriginal, nombre: nombreImagenologia },
        { blob: blobInterconsultaOriginal, nombre: nombreInterconsulta },
      ];

      const diasDescanso =
        datos.datosDescansoMedico && datos.datosDescansoMedico.diasDescanso > 0
          ? datos.datosDescansoMedico.diasDescanso
          : 0;

      let docDescanso: Awaited<
        ReturnType<typeof generarDocumentoPdfDescansoMedico>
      > | null = null;
      if (diasDescanso > 0 && datos.datosDescansoMedico) {
        docDescanso = await generarDocumentoPdfDescansoMedico(
          datos.datosDescansoMedico,
        );
        const nombreDescanso = `DESCANSO_MEDICO_HC_${hcLimpia}_AT_${idAtencionLimpio}.pdf`;
        const blobDescansoOriginal = docDescanso.output('blob');
        listaDocumentosAFirmar.push({
          blob: blobDescansoOriginal,
          nombre: nombreDescanso,
        });
      }

      const documentosGenerados = [
        docAtencionMedica,
        docRecetaMedica,
        docLaboratorio,
        docImagenologia,
        docInterconsulta,
      ];
      if (docDescanso) {
        documentosGenerados.push(docDescanso);
      }
      const conexionFirma: FirmaPeruConexion = {
        baseUrl: this.clienteApi.getApiBaseUrl(),
        token: tokenSesion,
      };

      const rolFirma = this.construirRolFirma(datos.datosRecetaMedica);
      const datosInstitucion = await obtenerDatosInstitucionCache();
      const logoParaEstampado =
        datosInstitucion?.logoHospi || datosInstitucion?.logoMinsa || undefined;
      const resultadoLote: FirmaPeruResultado = await iniciarFirmaLote(
        listaDocumentosAFirmar,
        conexionFirma,
        {
          motivo: 'Soy el Autor del Documento',
          rol: rolFirma,
          logoPngBase64: logoParaEstampado,
          signatureStyle: 1,
          stampPage: 1,
          positionX: 450,
          positionY: 28,
        },
      );

      if (!resultadoLote?.uuid) {
        return {
          exito: false,
          documentosFirmados: [],
          mensajeError:
            'No se completó la firma por lote en Firma Perú. Verifique que completó la operación en el lector con su DNI electrónico.',
        };
      }

      const documentosFirmados = await this.recuperarDocumentosFirmadosLote(
        resultadoLote.uuid,
        conexionFirma,
        listaDocumentosAFirmar,
        diasDescanso,
      );

      return {
        exito: true,
        identificadorUnicoDocumento: resultadoLote.uuid,
        documentosFirmados,
      };
    } catch (errorCapturado) {
      const mensajeTexto =
        errorCapturado instanceof Error
          ? errorCapturado.message
          : 'Ocurrió un error inesperado durante el proceso de firma por lote con Firma Perú.';
      return {
        exito: false,
        documentosFirmados: [],
        mensajeError: mensajeTexto,
      };
    }
  }

  private async recuperarDocumentosFirmadosLote(
    uuidLote: string,
    conexion: FirmaPeruConexion,
    documentosOriginales: readonly FirmaPeruDocumento[],
    diasDescanso: number,
  ): Promise<DocumentoAtencionFirmadoItem[]> {
    const urlListado = `${conexion.baseUrl}/api/v1/firmaperu/documentos/${uuidLote}/lote/archivos`;
    const cabeceras: Record<string, string> = {
      accept: 'application/json',
    };
    if (conexion.token) {
      cabeceras.authorization = `Bearer ${conexion.token}`;
    }

    let archivosMetadata: ArchivoLoteRespuesta[] = [];
    try {
      const respuestaApi = await fetch(urlListado, { headers: cabeceras });
      if (respuestaApi.ok) {
        const cuerpo = (await respuestaApi.json().catch(() => null)) as {
          data?: ArchivoLoteRespuesta[];
        } | null;
        if (Array.isArray(cuerpo?.data)) {
          archivosMetadata = cuerpo.data;
        }
      }
    } catch {}

    if (archivosMetadata.length === 0) {
      throw new Error(
        'El componente Firma Perú no devolvió los documentos firmados del lote. Verifique que completó la operación en la aplicación oficial Firma Perú con su DNI electrónico.',
      );
    }

    const resultadoFinal: DocumentoAtencionFirmadoItem[] = [];

    for (let indice = 0; indice < documentosOriginales.length; indice++) {
      const docOriginal = documentosOriginales[indice];

      const normalizar = (nombreTexto: string) =>
        nombreTexto
          .toLowerCase()
          .replace(/^\[f\]_?/, '')
          .replace(/_firmado(\.pdf)?$/, '')
          .replace(/\[f\](\.pdf)?$/, '')
          .replace(/\.pdf$/, '')
          .trim();

      const metadataCoincidente =
        archivosMetadata.find(
          (m) =>
            m.nombre.toLowerCase().includes(docOriginal.nombre.toLowerCase()) ||
            docOriginal.nombre.toLowerCase().includes(m.nombre.toLowerCase()) ||
            normalizar(m.nombre) === normalizar(docOriginal.nombre),
        ) ||
        (archivosMetadata.length === documentosOriginales.length
          ? archivosMetadata[indice]
          : undefined);

      if (!metadataCoincidente) {
        throw new Error(
          `No se encontró el documento firmado para "${docOriginal.nombre}" en los archivos devueltos por Firma Perú.`,
        );
      }

      const nombreDescarga = metadataCoincidente.nombre;
      const urlArchivo = `${conexion.baseUrl}/api/v1/firmaperu/documentos/${uuidLote}/lote/archivos/${encodeURIComponent(metadataCoincidente.nombre)}`;
      const respuestaArchivo = await fetch(urlArchivo, {
        headers: cabeceras,
      });

      if (!respuestaArchivo.ok) {
        throw new Error(
          `No se pudo recuperar el archivo firmado "${metadataCoincidente.nombre}" desde el servidor.`,
        );
      }

      const blobFirmado = await respuestaArchivo.blob();
      const tamano = blobFirmado.size;

      const urlBlob =
        typeof window !== 'undefined'
          ? window.URL.createObjectURL(blobFirmado)
          : '';

      const infoMetadatos = this.obtenerMetadatosDocumento(
        docOriginal.nombre,
        diasDescanso,
      );

      resultadoFinal.push({
        id: `doc-${indice + 1}`,
        titulo: infoMetadatos.titulo,
        descripcion: infoMetadatos.descripcion,
        nombreArchivo: nombreDescarga,
        blob: blobFirmado,
        url: urlBlob,
        tamanoBytes: tamano,
      });
    }

    return resultadoFinal;
  }

  private obtenerMetadatosDocumento(
    nombreArchivo: string,
    diasDescanso: number,
  ): { titulo: string; descripcion: string } {
    const nombreEnMinusculas = nombreArchivo.toLowerCase();

    if (
      nombreEnMinusculas.includes('atencion_medica') ||
      nombreEnMinusculas.includes('resumen_atencion')
    ) {
      return {
        titulo: 'Atención Médica del Paciente',
        descripcion:
          'Historia clínica ambulatoria completa con filiación, triaje, anamnesis, antecedentes, examen físico, diagnósticos CIE-10 y plan de tratamiento.',
      };
    }

    if (nombreEnMinusculas.includes('receta_medica')) {
      return {
        titulo: 'Receta Médica Oficial (Farmacia y Paciente)',
        descripcion:
          'Formato oficial de prescripción y dispensación de medicamentos con doble talón (Farmacia y Paciente) y firma digital acreditada.',
      };
    }

    if (nombreEnMinusculas.includes('orden_laboratorio')) {
      return {
        titulo: 'Orden Médica - Patología Clínica / Laboratorio',
        descripcion:
          'Orden médica oficial con código de barras para análisis clínicos de laboratorio, justificación y resumen de historia clínica.',
      };
    }

    if (nombreEnMinusculas.includes('orden_imagenologia')) {
      return {
        titulo: 'Orden Médica - Imagenología (Ecografía / Rayos X)',
        descripcion:
          'Orden médica oficial con código de barras para estudios por imágenes, programación de sala, indicaciones y resumen clínico.',
      };
    }

    if (nombreEnMinusculas.includes('hoja_interconsulta')) {
      return {
        titulo: 'Hoja de Interconsulta (Nueva Cita)',
        descripcion:
          'Solicitud médica oficial de interconsulta y referencia entre especialidades con motivo, resumen clínico y fecha propuesta.',
      };
    }

    if (nombreEnMinusculas.includes('orden_examenes')) {
      return {
        titulo: 'Solicitud de Apoyo al Diagnóstico',
        descripcion:
          'Órdenes médicas oficiales para exámenes de laboratorio clínico, radiología e imágenes diagnósticas.',
      };
    }

    if (nombreEnMinusculas.includes('descanso_medico')) {
      return diasDescanso > 0
        ? {
            titulo: 'Certificado de Descanso Médico',
            descripcion: `Certificado oficial de incapacidad temporal para el trabajo por ${diasDescanso} día(s).`,
          }
        : {
            titulo: 'Constancia de Atención Médica',
            descripcion:
              'Certificación médica formal de atención ambulatoria en consultorio sin requerimiento de reposo domiciliario.',
          };
    }

    return {
      titulo: 'Documento Clínico Oficial',
      descripcion:
        'Documento médico oficial registrado y firmado digitalmente.',
    };
  }

  private construirRolFirma(datosReceta: DatosPdfRecetaMedica): string {
    const perfilUsuario = this.servicioAutenticacion.userProfile();
    const nombreCompletoMedico =
      perfilUsuario?.nombreCompleto ||
      this.servicioAutenticacion.nombreCompleto() ||
      this.servicioAutenticacion.username() ||
      datosReceta.medicoNombre ||
      'Médico Tratante';

    const partesCargo: string[] = [`Médico ${nombreCompletoMedico}`];
    const numeroColegiatura =
      perfilUsuario?.colegiatura || datosReceta.medicoColegiatura;
    if (numeroColegiatura) {
      partesCargo.push(`Nro. Colegiatura: ${numeroColegiatura}`);
    }
    const numeroRegistroEspecialidad =
      perfilUsuario?.rne || datosReceta.medicoRegistroEspecialidad;
    if (numeroRegistroEspecialidad) {
      partesCargo.push(`Nro. RNE: ${numeroRegistroEspecialidad}`);
    }

    return partesCargo.join(' - ');
  }

  async firmarRecetaDigitalmente(
    datosReceta: DatosPdfRecetaMedica,
  ): Promise<ResultadoProcesoFirmaReceta> {
    const tokenSesion = this.servicioAutenticacion.getToken();
    if (!tokenSesion) {
      return {
        exito: false,
        mensajeError:
          'Su sesión de usuario ha expirado. Por favor, vuelva a iniciar sesión antes de realizar la firma digital con DNI electrónico.',
      };
    }

    try {
      const documentoPdf = await generarDocumentoPdfRecetaMedica(datosReceta);
      if (!documentoPdf) {
        return {
          exito: false,
          mensajeError:
            'No se pudo construir el formato oficial de la receta médica para firma.',
        };
      }

      const conexionFirma: FirmaPeruConexion = {
        baseUrl: this.clienteApi.getApiBaseUrl(),
        token: tokenSesion,
      };

      const rolFirma = this.construirRolFirma(datosReceta);
      const numeroReceta = datosReceta.numeroReceta || 'OFICIAL';
      const metadatosReceta = obtenerMetadatosFirmaPdf(documentoPdf);
      const datosInstitucionIndividual = await obtenerDatosInstitucionCache();
      const logoParaEstampadoIndividual =
        datosInstitucionIndividual?.logoHospi ||
        datosInstitucionIndividual?.logoMinsa ||
        undefined;
      const resultadoFirma: FirmaPeruResultado = await iniciarFirmaDocumento(
        {
          blob: documentoPdf.output('blob'),
          nombre: `RECETA_${numeroReceta}.pdf`,
        },
        conexionFirma,
        {
          motivo: 'Soy el Autor del Documento',
          rol: rolFirma,
          logoPngBase64: logoParaEstampadoIndividual,
          signatureStyle: 1,
          stampPage: 1,
          positionX: 450,
          positionY: 28,
        },
      );

      if (!resultadoFirma?.firmado) {
        return {
          exito: false,
          mensajeError:
            'No se recibió el documento firmado del componente Firma Perú. Verifique que completó la operación en el lector con su DNI electrónico.',
        };
      }

      this.descargarYAbrirDocumentoFirmado(
        resultadoFirma.firmado,
        `RECETA_MEDICA_FIRMADA_${numeroReceta}.pdf`,
      );

      return {
        exito: true,
        identificadorUnicoDocumento: resultadoFirma.uuid,
        documentoFirmadoBlob: resultadoFirma.firmado,
      };
    } catch (errorCapturado) {
      const mensajeTexto =
        errorCapturado instanceof Error
          ? errorCapturado.message
          : 'Ocurrió un error inesperado durante el proceso de firma con Firma Perú.';
      return {
        exito: false,
        mensajeError: mensajeTexto,
      };
    }
  }

  descargarYAbrirDocumentoFirmado(
    documentoBlob: Blob,
    nombreArchivo: string,
  ): void {
    if (typeof window === 'undefined') {
      return;
    }
    const urlBlob = window.URL.createObjectURL(documentoBlob);
    const enlaceDescarga = document.createElement('a');
    enlaceDescarga.href = urlBlob;
    enlaceDescarga.download = nombreArchivo;
    document.body.appendChild(enlaceDescarga);
    enlaceDescarga.click();
    document.body.removeChild(enlaceDescarga);

    window.open(urlBlob, '_blank');

    setTimeout(() => {
      window.URL.revokeObjectURL(urlBlob);
    }, 60000);
  }

  descargarArchivoBlob(documentoBlob: Blob, nombreArchivo: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    const urlBlob = window.URL.createObjectURL(documentoBlob);
    const enlaceDescarga = document.createElement('a');
    enlaceDescarga.href = urlBlob;
    enlaceDescarga.download = nombreArchivo;
    document.body.appendChild(enlaceDescarga);
    enlaceDescarga.click();
    document.body.removeChild(enlaceDescarga);

    setTimeout(() => {
      window.URL.revokeObjectURL(urlBlob);
    }, 30000);
  }
}
