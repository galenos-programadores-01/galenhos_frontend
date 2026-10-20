import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';
import type { DatosInstitucionPdf } from '../../../compartido/pdf/pdf.tipos';
import {
  type FirmaPeruConexion,
  iniciarFirmaLote,
} from '../../../compartido/utilidades/firma-peru.util';
import { AuthService } from '../../auth/aplicacion/auth.service';
import { PrimeraAtencionApiService } from '../adaptadores/salida/http/primera-atencion.api.service';
import { armarDocumentosFirmaPa } from './firma/armar-documentos-firma-pa';
import type {
  DocumentoFirmaPa,
  EntradaArmarDocumentosFirmaPa,
} from './firma/primera-atencion-firma.tipos';
import { generarPdfsDocumentosFirmaPa } from './pdf/primera-atencion-pdf-satelite.util';
import type { PrimeraAtencionPdfData } from './pdf/primera-atencion-pdf.tipos';

export interface ContextoFirmaPa {
  idAtencion: number;
  datosPdf: PrimeraAtencionPdfData;
  institucion: DatosInstitucionPdf | null;
  nombreUsuario: string;
  cargoFirma: string;
  /** Si se omite, se arma solo PA (sin satélites). */
  documentos?: DocumentoFirmaPa[];
}

export interface ResultadoFirmaPa {
  exito: boolean;
  uuidFirma?: string;
  ubicacionArchivo?: string;
  mensajeError?: string;
  cantidadDocumentos?: number;
}

/**
 * Orquesta PDFs del lote + Firma Perú (7z / un PIN) + cierre en BD.
 * Paso 3–5: PA + exámenes + medicamentos; sin re-persistir satélites.
 */
@Injectable({ providedIn: 'root' })
export class PrimeraAtencionFirmaService {
  private readonly apiClient = inject(ApiClientService);
  private readonly authService = inject(AuthService);
  private readonly api = inject(PrimeraAtencionApiService);

  /**
   * Lista canónica de documentos del lote: PA + exámenes por IdReceta + medicamentos.
   */
  armarDocumentosParaFirmar(
    entrada: EntradaArmarDocumentosFirmaPa,
  ): DocumentoFirmaPa[] {
    return armarDocumentosFirmaPa(entrada);
  }

  async procesarFirmaDigital(
    contexto: ContextoFirmaPa,
  ): Promise<ResultadoFirmaPa> {
    if (!this.authService.getToken()) {
      return {
        exito: false,
        mensajeError:
          'Su sesión ha expirado o no es válida. Vuelva a iniciar sesión antes de firmar.',
      };
    }

    const documentos =
      contexto.documentos && contexto.documentos.length > 0
        ? contexto.documentos
        : this.armarDocumentosParaFirmar({
            idAtencion: contexto.idAtencion,
            idPrimeraAtencion: 0,
            examenes: [],
            medicamentos: [],
          });

    const fechaImpresion = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let pdfs;
    try {
      pdfs = await generarPdfsDocumentosFirmaPa(
        documentos,
        contexto.datosPdf,
        contexto.institucion,
        contexto.nombreUsuario,
        fechaImpresion,
      );
    } catch (error) {
      return {
        exito: false,
        mensajeError:
          error instanceof Error
            ? error.message
            : 'No se pudieron construir los PDF del lote.',
      };
    }

    let resultadoFirma;
    try {
      resultadoFirma = await iniciarFirmaLote(
        pdfs.map((p) => ({
          blob: p.doc.output('blob'),
          nombre: p.documento.nombreArchivoSugerido,
        })),
        this.conexionFirma(),
        {
          motivo: 'Soy el Autor',
          rol: contexto.cargoFirma || 'Médico Tratante',
          logoPngBase64:
            contexto.institucion?.logoHospi ||
            contexto.institucion?.logoMinsa ||
            undefined,
          positionX: 430,
          positionY: 10,
        },
      );
    } catch (error) {
      return {
        exito: false,
        mensajeError:
          error instanceof Error
            ? error.message
            : 'No se completó la firma en Firma Perú.',
      };
    }

    if (!resultadoFirma?.firmado || !resultadoFirma.uuid) {
      return {
        exito: false,
        mensajeError:
          'No se recibió el lote firmado. Verifique que completó la firma en Firma Perú.',
      };
    }

    try {
      const cierre = await this.api.cerrarFirma(contexto.idAtencion, {
        uuidFirma: resultadoFirma.uuid,
      });
      return {
        exito: true,
        uuidFirma: resultadoFirma.uuid,
        ubicacionArchivo: cierre.ubicacionArchivo,
        cantidadDocumentos: pdfs.length,
      };
    } catch (error) {
      return {
        exito: false,
        mensajeError:
          error instanceof Error
            ? `La firma se completó pero no se pudo cerrar el registro: ${error.message}`
            : 'La firma se completó pero no se pudo cerrar el registro en el servidor.',
      };
    }
  }

  private conexionFirma(): FirmaPeruConexion {
    return {
      baseUrl: this.apiClient.getApiBaseUrl(),
      token: this.authService.getToken(),
    };
  }
}
