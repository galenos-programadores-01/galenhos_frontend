import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../../compartido/api-client/api-client.service';
import type { DatosInstitucionPdf } from '../../../compartido/pdf/pdf.tipos';
import {
  type FirmaPeruConexion,
  iniciarFirmaDocumento,
} from '../../../compartido/utilidades/firma-peru.util';
import { AuthService } from '../../auth/aplicacion/auth.service';
import { PrimeraAtencionApiService } from '../adaptadores/salida/http/primera-atencion.api.service';
import { armarDocumentosFirmaPa } from './firma/armar-documentos-firma-pa';
import type {
  DocumentoFirmaPa,
  EntradaArmarDocumentosFirmaPa,
} from './firma/primera-atencion-firma.tipos';
import { construirPdfPrimeraAtencion } from './pdf/primera-atencion-pdf.util';
import type { PrimeraAtencionPdfData } from './pdf/primera-atencion-pdf.tipos';

export interface ContextoFirmaPa {
  idAtencion: number;
  datosPdf: PrimeraAtencionPdfData;
  institucion: DatosInstitucionPdf | null;
  nombreUsuario: string;
  cargoFirma: string;
}

export interface ResultadoFirmaPa {
  exito: boolean;
  uuidFirma?: string;
  ubicacionArchivo?: string;
  mensajeError?: string;
}

/**
 * Orquesta PDF + Firma Perú / DNIe + cierre en BD.
 * Mismo patrón que FormularioSoapFirmaService, sin re-persistir satélites
 * (DX / plan / receta ya se guardaron como borrador).
 *
 * Paso 2: `armarDocumentosParaFirmar` prepara el lote (sin PDF aún).
 * `procesarFirmaDigital` sigue firmando solo el PDF de PA hasta el Paso 4.
 */
@Injectable({ providedIn: 'root' })
export class PrimeraAtencionFirmaService {
  private readonly apiClient = inject(ApiClientService);
  private readonly authService = inject(AuthService);
  private readonly api = inject(PrimeraAtencionApiService);

  /**
   * Lista canónica de documentos del lote: PA + exámenes por IdReceta + medicamentos.
   * No genera PDF ni invoca Firma Perú.
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

    const documentoPdf = await this.construirPdf(contexto);
    if (!documentoPdf) {
      return {
        exito: false,
        mensajeError: 'No se pudo construir el PDF de primera atención.',
      };
    }

    let resultadoFirma;
    try {
      resultadoFirma = await iniciarFirmaDocumento(
        {
          blob: documentoPdf.output('blob'),
          nombre: `PA_${contexto.idAtencion}.pdf`,
        },
        this.conexionFirma(),
        {
          motivo: 'Soy el Autor',
          rol: contexto.cargoFirma || 'Médico Tratante',
          logoPngBase64:
            contexto.institucion?.logoHospi ||
            contexto.institucion?.logoMinsa ||
            undefined,
          stampPage: 1,
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
          'No se recibió el documento firmado. Verifique que completó la firma en Firma Perú.',
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

  private async construirPdf(contexto: ContextoFirmaPa) {
    const fechaImpresion = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return construirPdfPrimeraAtencion(
      contexto.datosPdf,
      contexto.institucion,
      contexto.nombreUsuario,
      fechaImpresion,
    );
  }

  private conexionFirma(): FirmaPeruConexion {
    return {
      baseUrl: this.apiClient.getApiBaseUrl(),
      token: this.authService.getToken(),
    };
  }
}
