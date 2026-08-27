export const FIRMA_PERU_PORT = '48596';
export const FIRMA_PERU_LIB_URL =
  'https://apps.firmaperu.gob.pe/web/clienteweb/firmaperu.min.js';
export const JQUERY_URL = 'https://code.jquery.com/jquery-3.6.0.min.js';

export interface FirmaPeruInicio {
  documentNameUUID: string;
  paramBase64: string;
}

export interface FirmaPeruOpciones {
  motivo?: string;
  rol?: string;
  logoPngBase64?: string;
  positionX?: number;
  positionY?: number;
}

export interface FirmaPeruDocumento {
  blob: Blob;
  nombre: string;
}

export interface FirmaPeruResultado {
  uuid: string;
  firmado: Blob;
}

export interface FirmaPeruConexion {
  baseUrl: string;
  token: string | null;
}

export interface FirmaPeruBatido {
  cancelado?: () => boolean;
}

type StartSignatureFuncion = (puerto: string, parametro: string) => unknown;

interface WindowConFirmaPeru extends Window {
  jqFirmaPeru?: unknown;
  startSignature?: StartSignatureFuncion;
  signatureInit?: () => void;
  signatureOk?: () => void;
  signatureCancel?: () => void;
}

function obtenerVentanaFirmaPeru(): WindowConFirmaPeru {
  return window as unknown as WindowConFirmaPeru;
}

function construirCabecerasAutenticacion(
  conexion: FirmaPeruConexion,
  cabecerasAdicionales: Record<string, string> = {},
): Record<string, string> {
  const cabeceras: Record<string, string> = {
    accept: 'application/json',
    ...cabecerasAdicionales,
  };
  if (conexion.token) {
    cabeceras.authorization = `Bearer ${conexion.token}`;
  }
  return cabeceras;
}

function obtenerFuncionFirmaGlobal(): StartSignatureFuncion | null {
  const funcionFirma = obtenerVentanaFirmaPeru().startSignature;
  return typeof funcionFirma === 'function' ? funcionFirma : null;
}

function resolverUrlCompleta(baseUrl: string, ruta: string): string {
  if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
    return ruta;
  }
  const baseLimpia = baseUrl.replace(/\/+$/, '');
  const rutaLimpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${baseLimpia}${rutaLimpia}`;
}

async function ejecutarPeticionApi<RespuestaEnvelope>(
  conexion: FirmaPeruConexion,
  ruta: string,
  configuracionPeticion: RequestInit = {},
): Promise<RespuestaEnvelope> {
  const urlFinal = resolverUrlCompleta(conexion.baseUrl, ruta);
  const respuesta = await fetch(urlFinal, configuracionPeticion);
  const cuerpoRespuesta = (await respuesta
    .json()
    .catch(() => null)) as RespuestaEnvelope | null;

  if (
    !respuesta.ok ||
    !cuerpoRespuesta ||
    !(cuerpoRespuesta as { success?: boolean }).success
  ) {
    const errorDetalle = (
      cuerpoRespuesta as { error?: { message?: string } } | null
    )?.error;
    throw new Error(
      errorDetalle?.message ??
        `La petición a ${ruta} falló con estado ${respuesta.status}.`,
    );
  }
  return cuerpoRespuesta;
}

function cargarScriptExterno(urlScript: string): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if (
      document.querySelector<HTMLScriptElement>(`script[src="${urlScript}"]`)
    ) {
      resolver();
      return;
    }
    const scriptElemento = document.createElement('script');
    scriptElemento.src = urlScript;
    scriptElemento.type = 'text/javascript';
    scriptElemento.onload = () => resolver();
    scriptElemento.onerror = () =>
      rechazar(
        new Error(`No se pudo cargar ${urlScript}. Verifique su conexión.`),
      );
    document.body.appendChild(scriptElemento);
  });
}

async function asegurarJQueryFirmaPeru(): Promise<void> {
  const ventana = obtenerVentanaFirmaPeru();
  if (ventana.jqFirmaPeru) {
    return;
  }

  await cargarScriptExterno(JQUERY_URL);

  const objetoGlobal = window as unknown as {
    jQuery?: { noConflict: (eliminarTodos: boolean) => unknown };
  };
  if (typeof objetoGlobal.jQuery?.noConflict !== 'function') {
    throw new Error('jQuery no está disponible para el servicio Firma Perú.');
  }

  const instanciaSinConflicto = objetoGlobal.jQuery.noConflict(true);
  obtenerVentanaFirmaPeru().jqFirmaPeru = instanciaSinConflicto;
}

export function asegurarContenedorFirmaPeru(): void {
  if (typeof document === 'undefined') {
    return;
  }
  let contenedor = document.getElementById('addComponent');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'addComponent';
    contenedor.style.display = 'none';
    document.body.appendChild(contenedor);
  }
}

export async function cargarLibreriaFirmaPeru(): Promise<void> {
  asegurarContenedorFirmaPeru();

  if (obtenerFuncionFirmaGlobal()) {
    return;
  }

  await asegurarJQueryFirmaPeru();

  if (obtenerFuncionFirmaGlobal()) {
    return;
  }

  const elementoExistente = document.querySelector<HTMLScriptElement>(
    `script[src="${FIRMA_PERU_LIB_URL}"]`,
  );
  if (elementoExistente) {
    await new Promise<void>((resolver) => {
      const temporizador = window.setInterval(() => {
        if (obtenerFuncionFirmaGlobal()) {
          window.clearInterval(temporizador);
          resolver();
        }
      }, 200);
    });
    return;
  }

  const scriptFirmaPeru = document.createElement('script');
  scriptFirmaPeru.src = FIRMA_PERU_LIB_URL;
  scriptFirmaPeru.type = 'text/javascript';

  await new Promise<void>((resolver, rechazar) => {
    scriptFirmaPeru.onload = () => {
      if (obtenerFuncionFirmaGlobal()) {
        resolver();
      } else {
        rechazar(
          new Error('La librería firmaperu.min.js no expone startSignature.'),
        );
      }
    };
    scriptFirmaPeru.onerror = () =>
      rechazar(
        new Error(
          'No se pudo cargar firmaperu.min.js desde el servidor de Firma Perú. Verifique su conexión.',
        ),
      );
    document.body.appendChild(scriptFirmaPeru);
  });
}

function determinarTipoMime(bufferBytes: ArrayBuffer): string {
  const encabezado = new Uint8Array(bufferBytes, 0, 6);
  const esSieteZip =
    encabezado[0] === 0x37 &&
    encabezado[1] === 0x7a &&
    encabezado[2] === 0xbc &&
    encabezado[3] === 0xaf &&
    encabezado[4] === 0x27 &&
    encabezado[5] === 0x1c;

  if (esSieteZip) {
    return 'application/x-7z-compressed';
  }
  return 'application/pdf';
}

interface OpcionesEsperaDocumento {
  maximoIntentos?: number;
  intervaloMilisegundos?: number;
}

async function esperarDocumentoFirmado(
  urlFirmado: string,
  conexion: FirmaPeruConexion,
  controlBatido: FirmaPeruBatido,
  opcionesEspera: OpcionesEsperaDocumento = {},
): Promise<Blob> {
  const maximoIntentos = opcionesEspera.maximoIntentos ?? 200;
  const intervaloMilisegundos = opcionesEspera.intervaloMilisegundos ?? 1500;
  const urlFinal = resolverUrlCompleta(conexion.baseUrl, urlFirmado);

  for (
    let intentoNumero = 0;
    intentoNumero < maximoIntentos;
    intentoNumero += 1
  ) {
    if (controlBatido.cancelado?.()) {
      throw new Error('El proceso de firma fue cancelado por el usuario.');
    }

    try {
      const respuestaDocumento = await fetch(urlFinal, {
        headers: construirCabecerasAutenticacion(conexion),
        cache: 'no-store',
      });

      if (respuestaDocumento.ok) {
        const bufferArchivo = await respuestaDocumento.arrayBuffer();
        return new Blob([bufferArchivo], {
          type: determinarTipoMime(bufferArchivo),
        });
      }
    } catch {}

    await new Promise((resolverPausa) =>
      setTimeout(resolverPausa, intervaloMilisegundos),
    );
  }

  throw new Error(
    'No se recibió el documento firmado del Firmador. Verifique que completó la firma en la aplicación Firma Perú.',
  );
}

function esperarFirmaConFirmador(
  funcionIniciarFirma: StartSignatureFuncion,
  datosInicio: FirmaPeruInicio,
  urlDescargaFirmado: string,
  conexion: FirmaPeruConexion,
  controlBatido: FirmaPeruBatido,
): Promise<FirmaPeruResultado> {
  asegurarContenedorFirmaPeru();

  return new Promise((resolver, rechazar) => {
    let procesoFinalizado = false;

    const finalizarConExito = (resultado: FirmaPeruResultado) => {
      if (procesoFinalizado) {
        return;
      }
      procesoFinalizado = true;
      resolver(resultado);
    };

    const finalizarConError = (error: Error) => {
      if (procesoFinalizado) {
        return;
      }
      procesoFinalizado = true;
      rechazar(error);
    };

    const ventana = obtenerVentanaFirmaPeru();
    ventana.signatureInit = () => {};
    ventana.signatureOk = () => {};
    ventana.signatureCancel = () => {
      finalizarConError(
        new Error('El proceso de firma fue cancelado por el usuario.'),
      );
    };

    try {
      void funcionIniciarFirma(FIRMA_PERU_PORT, datosInicio.paramBase64);
    } catch (errorInvocacion) {
      finalizarConError(
        errorInvocacion instanceof Error
          ? errorInvocacion
          : new Error('Error al invocar startSignature de Firma Perú.'),
      );
      return;
    }

    void (async () => {
      try {
        const documentoBlobFirmado = await esperarDocumentoFirmado(
          urlDescargaFirmado,
          conexion,
          controlBatido,
        );
        finalizarConExito({
          uuid: datosInicio.documentNameUUID,
          firmado: documentoBlobFirmado,
        });
      } catch (errorEspera) {
        finalizarConError(
          errorEspera instanceof Error
            ? errorEspera
            : new Error(String(errorEspera)),
        );
      }
    })();
  });
}

export async function iniciarFirmaDocumento(
  documento: FirmaPeruDocumento,
  conexion: FirmaPeruConexion,
  opciones: FirmaPeruOpciones = {},
  controlBatido: FirmaPeruBatido = {},
): Promise<FirmaPeruResultado> {
  await cargarLibreriaFirmaPeru();

  const formularioDatos = new FormData();
  formularioDatos.append('document', documento.blob, documento.nombre);
  formularioDatos.append('signatureFormat', 'PAdES');
  formularioDatos.append('signatureLevel', 'B');

  if (opciones.motivo) {
    formularioDatos.append('signatureReason', opciones.motivo);
  }
  if (opciones.rol) {
    formularioDatos.append('role', opciones.rol);
  }
  if (opciones.logoPngBase64) {
    formularioDatos.append('imageEstampado', opciones.logoPngBase64);
  }
  if (typeof opciones.positionX === 'number') {
    formularioDatos.append('positionx', String(opciones.positionX));
  }
  if (typeof opciones.positionY === 'number') {
    formularioDatos.append('positiony', String(opciones.positionY));
  }

  const respuestaApi = await ejecutarPeticionApi<{
    success: boolean;
    data: FirmaPeruInicio;
    error?: { message?: string };
  }>(conexion, '/api/v1/firmaperu/firmar', {
    method: 'POST',
    headers: construirCabecerasAutenticacion(conexion),
    body: formularioDatos,
  });

  const datosInicio = respuestaApi.data;
  const funcionFirma = obtenerFuncionFirmaGlobal();
  if (!funcionFirma) {
    throw new Error('La librería firmaperu.min.js no está disponible.');
  }

  return esperarFirmaConFirmador(
    funcionFirma,
    datosInicio,
    `/api/v1/firmaperu/documentos/${datosInicio.documentNameUUID}/firmado`,
    conexion,
    controlBatido,
  );
}

export async function iniciarFirmaLote(
  documentos: FirmaPeruDocumento[],
  conexion: FirmaPeruConexion,
  opciones: FirmaPeruOpciones = {},
  controlBatido: FirmaPeruBatido = {},
): Promise<FirmaPeruResultado> {
  await cargarLibreriaFirmaPeru();

  const formularioDatos = new FormData();
  for (const documentoActual of documentos) {
    formularioDatos.append(
      'document',
      documentoActual.blob,
      documentoActual.nombre,
    );
  }
  formularioDatos.append('signatureFormat', 'PAdES');
  formularioDatos.append('signatureLevel', 'B');

  if (opciones.motivo) {
    formularioDatos.append('signatureReason', opciones.motivo);
  }
  if (opciones.rol) {
    formularioDatos.append('role', opciones.rol);
  }
  if (opciones.logoPngBase64) {
    formularioDatos.append('imageEstampado', opciones.logoPngBase64);
  }
  if (typeof opciones.positionX === 'number') {
    formularioDatos.append('positionx', String(opciones.positionX));
  }
  if (typeof opciones.positionY === 'number') {
    formularioDatos.append('positiony', String(opciones.positionY));
  }

  const respuestaApi = await ejecutarPeticionApi<{
    success: boolean;
    data: FirmaPeruInicio;
    error?: { message?: string };
  }>(conexion, '/api/v1/firmaperu/lote', {
    method: 'POST',
    headers: construirCabecerasAutenticacion(conexion),
    body: formularioDatos,
  });

  const datosInicio = respuestaApi.data;
  const funcionFirma = obtenerFuncionFirmaGlobal();
  if (!funcionFirma) {
    throw new Error('La librería firmaperu.min.js no está disponible.');
  }

  return esperarFirmaConFirmador(
    funcionFirma,
    datosInicio,
    `/api/v1/firmaperu/documentos/${datosInicio.documentNameUUID}/lote/firmado`,
    conexion,
    controlBatido,
  );
}
